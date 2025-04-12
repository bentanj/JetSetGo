<template>
  <v-container class="fill-height" fluid>
    <v-row justify="center" align="center">
      <v-col cols="12" md="8" lg="6">
        <v-card class="travel-form-card">
          <div class="form-header">
            <v-icon size="40" color="primary" class="mb-4">mdi-airplane</v-icon>
            <h1 class="text-h3 font-weight-light mb-2">Travel Itinerary Generator</h1>
            <p class="text-subtitle-1 text-medium-emphasis">Plan your perfect trip with AI</p>
          </div>
          
          <v-form @submit.prevent="handleSubmit" class="form-content">
            <div class="location-field mb-6">
              <label class="v-label text-subtitle-2 mb-1">Destination</label>
              <GeoAutoComplete
                v-model="formData.destination"
                @place-selected="handlePlaceSelected"
              />
            </div>

            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="formattedStartDate"
                  label="Start Date"
                  readonly
                  required
                  variant="outlined"
                  :rules="[
                    v => !!v || 'Start date is required',
                    v => formData.startDate && formData.startDate >= today || 'Start date cannot be in the past'
                  ]"
                  :min="today"
                  id="startDate"
                  class="rounded-lg date-field"
                  bg-color="surface"
                  style="cursor: pointer"
                  @click="showStartDatePicker = true"
                >
                </v-text-field>
                <v-date-picker
                  v-model="formData.startDate"
                  v-if="showStartDatePicker"
                  :min="today"
                  @update:model-value="showStartDatePicker = false"
                ></v-date-picker>
              </v-col>
              
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="formattedEndDate"
                  label="End Date"
                  readonly
                  required
                  variant="outlined"
                  :rules="[
                    v => !!v || 'End date is required',
                    v => !formData.startDate || formData.endDate >= formData.startDate || 'End date must be after start date',
                    v => !formData.startDate || (formData.endDate <= maxEndDate) || 'Maximum trip duration is 7 days (inclusive)'
                  ]"
                  :min="formattedStartDate"
                  :max="maxEndDate"
                  id="endDate"
                  :disabled="!formattedStartDate"
                  class="rounded-lg date-field"
                  bg-color="surface"
                  style="cursor: pointer"
                  @click="() => { if (formattedStartDate) showEndDatePicker = true }"
                >
                </v-text-field>
                
                <v-date-picker
                  v-model="formData.endDate"
                  v-if="showEndDatePicker"
                  :min="formData.startDate"
                  :max="maxEndDate"
                  @update:model-value="showEndDatePicker = false"
                ></v-date-picker>
              </v-col>
            </v-row>

            <v-row>
              <v-col cols="12" md="6">
                <v-select
                  v-model="formData.numTravelers"
                  label="Number of Travelers"
                  :items="[1,2,3,4,5,6,7,8]"
                  required
                  variant="outlined"
                  :rules="[v => !!v || 'Number of travelers is required']"
                  id="numTravelers"
                  class="rounded-lg"
                  bg-color="surface"
                ></v-select>
              </v-col>

              <v-col cols="12" md="6">
                <v-select
                  v-model="formData.budget"
                  label="Budget"
                  :items="['Low', 'Medium', 'High', 'Very High']"
                  required
                  variant="outlined"
                  :rules="[v => !!v || 'Budget is required']"
                  id="budget"
                  class="rounded-lg"
                  bg-color="surface"
                ></v-select>
              </v-col>
            </v-row>

            <div class="text-caption text-medium-emphasis mb-6">
              <v-icon size="small" color="info" class="mr-1">mdi-information</v-icon>
              Trip duration is limited to a maximum of 7 days
            </div>

            <v-btn
              type="submit"
              color="primary"
              block
              class="submit-btn"
              :loading="loading"
              :disabled="loading || !formData.destination"
              id="submitBtn"
              size="large"
              elevation="2"
            >
              <v-icon left class="mr-2">mdi-map-marker-path</v-icon>
              Generate Itinerary
            </v-btn>
          </v-form>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import GeoAutoComplete from './GeoAutoComplete.vue'
import authService from '@/services/auth'

export default {
  name: 'TravelForm',
  components: {
    GeoAutoComplete
  },
  setup() {
    const router = useRouter()
    const loading = ref(false)
    const showStartDatePicker = ref(false)
    const showEndDatePicker = ref(false)

    // 'today' is now a Date object set to midnight
    const today = computed(() => {
      const now = new Date()
      now.setHours(0, 0, 0, 0)
      return now
    })

    // Initialize dates as null instead of empty strings
    const formData = ref({
      destination: '',
      startDate: null,
      endDate: null,
      numTravelers: 1,
      budget: 'Medium'
    })

    // maxEndDate now returns a Date object (7 days after start date)
    const maxEndDate = computed(() => {
      if (!formData.value.startDate) return null
      const startDate = new Date(formData.value.startDate)
      const maxDate = new Date(startDate)
      maxDate.setDate(startDate.getDate() + 6)
      return maxDate
    })

    // Helper: Format dates for display. Accepts either a Date object or a string.
    const formatDisplayDate = (dateVal) => {
      if (!dateVal) return ''
      let date = typeof dateVal === 'string' ? new Date(dateVal) : dateVal
      if (isNaN(date.getTime())) return dateVal
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      })
    }

    // Computed properties for formatted dates in text fields
    const formattedStartDate = computed({
      get: () => formatDisplayDate(formData.value.startDate),
      set: () => { /* read-only */ }
    })

    const formattedEndDate = computed({
      get: () => formatDisplayDate(formData.value.endDate),
      set: () => { /* read-only */ }
    })

    const handlePlaceSelected = (place) => {
      if (place) {
        console.log('Full Place Response:', place)
        console.log('Place Properties:', {
          formatted: place.properties.formatted,
          name: place.properties.name,
          city: place.properties.city,
          state: place.properties.state,
          country: place.properties.country,
          lat: place.properties.lat,
          lon: place.properties.lon,
          type: place.properties.result_type,
          category: place.properties.category
        })
        
        // Use the full formatted address directly instead of constructing it
        formData.value.destination = place.properties.formatted || place.properties.name
      }
    }

    const handleSubmit = async () => {
      if (!formData.value.destination) {
        alert('Please select a destination')
        return
      }
      if (!formData.value.startDate || !formData.value.endDate) {
        alert('Please select both start and end dates')
        return
      }
      
      // Format dates as YYYY-MM-DD strings to avoid timezone issues
      const formatDateForAPI = (date) => {
        if (!date) return '';
        const d = new Date(date);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      };
      
      try {
        loading.value = true
        // First ensure we have a valid token
        if (!authService.isAuthenticated()) {
          throw new Error('Please log in to generate an itinerary');
        }

        const token = authService.getToken();
        console.log('Using token for itinerary request:', token ? 'Token present' : 'No token');

        const response = await axios.post('http://localhost:8000/api/itinerary', {
          destination: formData.value.destination,
          startDate: formatDateForAPI(formData.value.startDate),
          endDate: formatDateForAPI(formData.value.endDate),
          numTravelers: formData.value.numTravelers,
          budget: formData.value.budget
        }, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        console.log('API Response:', response.data)
        sessionStorage.setItem('itineraryData', JSON.stringify(response.data))
        router.push('/itinerary')
      } catch (error) {
        console.error('Error generating itinerary:', error)
        if (error.message === 'Please log in to generate an itinerary') {
          alert('Please log in to generate an itinerary')
        } else if (error.response?.status === 401) {
          alert('Your session has expired. Please log in again.')
        } else if (error.response?.status === 404) {
          alert('The itinerary generation service is not available. Please make sure the backend server is running.')
        } else if (error.response?.status === 503) {
          alert('Failed to retrieve user preferences. Please make sure you have set up your preferences in your profile.')
        } else {
          alert('Failed to generate itinerary: ' + (error.response?.data?.error || error.message))
        }
      } finally {
        loading.value = false
      }
    }

    return {
      formData,
      loading,
      handleSubmit,
      handlePlaceSelected,
      today,
      maxEndDate,
      showStartDatePicker,
      showEndDatePicker,
      formattedStartDate,
      formattedEndDate
    }
  }
}
</script>

<style scoped>
/* (Your existing styles remain unchanged) */
.fill-height {
  background-color: #f8f9fd;
  padding: 24px;
  width: 100%;
  min-height: 100vh;
  max-width: none;
  margin: 0;
  box-shadow: none;
}

.travel-form-card {
  border: 1px solid rgba(0, 0, 0, 0.07) !important;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.03) !important;
  margin-bottom: 20px;
  border-radius: 12px;
  overflow: hidden;
  transition: box-shadow 0.3s ease;
  background: #ffffff;
  padding: 2rem;
}

.travel-form-card:hover {
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.05) !important;
}

.form-header {
  text-align: center;
  margin-bottom: 3rem;
  padding: 16px;
  background-color: #ffffff;
  border-radius: 12px;
}

.form-header h1 {
  color: #374151;
  font-weight: 500;
}

.form-header p {
  color: #6a7280;
}

.form-header .v-icon {
  padding: 8px;
  border-radius: 8px;
  background: rgba(106, 128, 224, 0.08);
  color: #6a80e0 !important;
}

.form-content {
  max-width: 600px;
  margin: 0 auto;
  padding: 16px;
  background-color: #ffffff;
  border-radius: 12px;
}

.location-field {
  text-align: left;
  position: relative;
  width: 100%;
  margin-bottom: 1.5rem;
}

.location-field .v-label {
  color: #6a7280;
  font-weight: 500;
  margin-bottom: 4px;
  font-size: 0.875rem;
  margin-left: 16px;
}

.submit-btn {
  margin-top: 2rem;
  height: 48px;
  font-size: 1.1rem;
  text-transform: none;
  letter-spacing: 0.5px;
  border-radius: 12px;
  transition: all 0.3s ease;
  background: linear-gradient(90deg, #6a80e0, #8c9eff) !important;
}

.submit-btn:not(:disabled):hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(106, 128, 224, 0.15);
}

:deep(.v-field) {
  border-radius: 12px !important;
  transition: all 0.3s ease;
  border: 1px solid rgba(106, 128, 224, 0.15);
}

:deep(.v-field:hover) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(106, 128, 224, 0.1);
  border-color: rgba(106, 128, 224, 0.3);
}

:deep(.v-field--focused) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(106, 128, 224, 0.1);
  border-color: rgba(106, 128, 224, 0.5);
  background: linear-gradient(to bottom, #f0f4ff, #ffffff);
}

/* Date field styles */
.date-field :deep(input) {
  color: #374151 !important;
  cursor: pointer;
  opacity: 1 !important;
}

.date-field :deep(.v-field__input) {
  cursor: pointer;
  color: #374151 !important;
}
</style>
