<template>
  <v-container>
    <v-card class="saved-itineraries-card">
      <v-card-title class="text-h4 mb-4">
        <v-icon size="32" color="primary" class="mr-2">mdi-book-open-page-variant</v-icon>
        Your Saved Itineraries
      </v-card-title>
      
      <v-divider></v-divider>
      
      <!-- Loading state -->
      <div v-if="loading" class="text-center pa-6">
        <v-progress-circular indeterminate color="primary" :size="70" :width="7"></v-progress-circular>
        <div class="mt-4 text-subtitle-1">Loading your saved itineraries...</div>
      </div>
      
      <!-- Error state -->
      <v-alert v-else-if="error" type="error" class="ma-6">
        {{ error }}
      </v-alert>
      
      <!-- Empty state -->
      <div v-else-if="!itineraries.length" class="text-center pa-6">
        <v-icon size="64" color="grey-lighten-1">mdi-map-marker-off</v-icon>
        <h3 class="text-h5 mt-4 mb-2">No Saved Itineraries</h3>
        <p class="text-body-1 text-medium-emphasis mb-6">
          You haven't saved any travel itineraries yet.
        </p>
        <v-btn
          color="primary"
          :to="{ name: 'TravelPlanner' }"
          prepend-icon="mdi-map-marker-plus"
        >
          Create an Itinerary
        </v-btn>
      </div>
      
      <!-- List of itineraries -->
      <v-list v-else>
        <v-list-item
          v-for="itinerary in itineraries"
          :key="itinerary.itineraryID"
          :value="itinerary"
          lines="three"
          class="itinerary-item my-2"
          v-ripple
          @click="viewItinerary(itinerary.itineraryID)"
          style="cursor: pointer"
        >
          <template v-slot:prepend>
            <v-avatar color="primary" variant="tonal" size="large">
              <v-icon>mdi-map-marker</v-icon>
            </v-avatar>
          </template>
          
          <v-list-item-title class="text-h6 mb-1">
            {{ itinerary.travelDestination }}
          </v-list-item-title>
          
          <v-list-item-subtitle class="mb-2">
            <v-icon small class="mr-1">mdi-calendar</v-icon>
            {{ formatDate(itinerary.startDate) }} - {{ formatDate(itinerary.endDate) }}
            <span class="mx-2">•</span>
            <v-icon small class="mr-1">mdi-account-group</v-icon>
            {{ itinerary.travellers }} {{ parseInt(itinerary.travellers) === 1 ? 'traveler' : 'travelers' }}
          </v-list-item-subtitle>
          
          <v-list-item-subtitle>
            <v-chip size="small" color="primary" class="mr-2" variant="flat">
              {{ itinerary.budget }}
            </v-chip>
            <span class="text-caption text-grey">
              Created on {{ formatDateTime(itinerary.createdAt) }}
            </span>
          </v-list-item-subtitle>
          
          <template v-slot:append>
            <v-btn
              icon="mdi-delete"
              variant="text"
              color="error"
              @click.stop="confirmDelete(itinerary)"
              title="Delete itinerary"
            ></v-btn>
          </template>
        </v-list-item>
      </v-list>
    </v-card>
    
    <!-- Delete confirmation dialog -->
    <v-dialog v-model="showDeleteDialog" max-width="500">
      <v-card>
        <v-card-title class="text-h5">Confirm Deletion</v-card-title>
        <v-card-text>
          Are you sure you want to delete this itinerary to {{ selectedItinerary?.travelDestination }}? This action cannot be undone.
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey-darken-1" variant="text" @click="showDeleteDialog = false">
            Cancel
          </v-btn>
          <v-btn 
            color="error" 
            variant="elevated" 
            @click="deleteItinerary"
            :loading="deleting"
          >
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import { ref, onMounted } from 'vue'
import itineraryService from '@/services/itinerary'
import { useRouter } from 'vue-router'

export default {
  name: 'SavedItineraries',
  
  setup() {
    const itineraries = ref([])
    const loading = ref(true)
    const error = ref(null)
    const showDeleteDialog = ref(false)
    const selectedItinerary = ref(null)
    const deleting = ref(false)
    const router = useRouter()
    
    const fetchItineraries = async () => {
      try {
        loading.value = true
        error.value = null
        const data = await itineraryService.getSavedItineraries()
        itineraries.value = data
      } catch (err) {
        console.error('Error fetching itineraries:', err)
        error.value = 'Failed to load your itineraries. Please try again later.'
      } finally {
        loading.value = false
      }
    }
    
    const formatDate = (dateString) => {
      if (!dateString) return 'N/A'
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      })
    }
    
    const formatDateTime = (dateTimeString) => {
      if (!dateTimeString) return 'N/A'
      const date = new Date(dateTimeString)
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
    
    const confirmDelete = (itinerary) => {
      selectedItinerary.value = itinerary
      showDeleteDialog.value = true
    }
    
    const deleteItinerary = async () => {
      if (!selectedItinerary.value) return
      
      try {
        deleting.value = true
        await itineraryService.deleteItinerary(selectedItinerary.value.itineraryID)
        // Remove from local array
        itineraries.value = itineraries.value.filter(i => i.itineraryID !== selectedItinerary.value.itineraryID)
        showDeleteDialog.value = false
      } catch (err) {
        console.error('Error deleting itinerary:', err)
        error.value = 'Failed to delete itinerary. Please try again.'
      } finally {
        deleting.value = false
      }
    }
    
    const viewItinerary = (itineraryID) => {
      router.push({ name: 'SavedItineraryDetail', params: { id: itineraryID }});
    }
    
    onMounted(() => {
      fetchItineraries()
    })
    
    return {
      itineraries,
      loading,
      error,
      formatDate,
      formatDateTime,
      confirmDelete,
      deleteItinerary,
      showDeleteDialog,
      selectedItinerary,
      deleting,
      viewItinerary
    }
  }
}
</script>

<style scoped>
.saved-itineraries-card {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
}

.itinerary-item {
  border-radius: 8px;
  margin: 8px 16px;
  transition: all 0.2s ease;
}

.itinerary-item:hover {
  background-color: rgba(0, 0, 0, 0.04);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}
</style> 