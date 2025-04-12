<template>
  <v-container>
    <!-- Loading state -->
    <div v-if="loading" class="text-center pa-6">
      <v-progress-circular indeterminate color="primary" :size="70" :width="7"></v-progress-circular>
      <div class="mt-4 text-subtitle-1">Loading your itinerary...</div>
    </div>
    
    <!-- Error state -->
    <v-alert v-else-if="error" type="error" class="ma-6">
      {{ error }}
    </v-alert>
    
    <!-- Empty state -->
    <div v-else-if="!itinerary" class="text-center pa-6">
      <v-icon size="64" color="grey-lighten-1">mdi-map-marker-off</v-icon>
      <h3 class="text-h5 mt-4 mb-2">Itinerary Not Found</h3>
      <p class="text-body-1 text-medium-emphasis mb-6">
        The itinerary you're looking for doesn't exist or has been deleted.
      </p>
      <v-btn
        color="primary"
        :to="{ name: 'SavedItineraries' }"
        prepend-icon="mdi-format-list-bulleted"
      >
        Back to Saved Itineraries
      </v-btn>
    </div>
    
    <!-- Debug Panel (when ?debug=true in URL) -->
    <v-card v-else-if="isDebugMode" class="mb-4">
      <v-card-title class="text-h6">Debug Information</v-card-title>
      <v-card-text>
        <div class="mb-2"><strong>Itinerary ID:</strong> {{ itinerary.itineraryID }}</div>
        <div class="mb-2"><strong>Destination:</strong> {{ itinerary.travelDestination }}</div>
        <div class="mb-2"><strong>Start Date:</strong> {{ itinerary.startDate }}</div>
        <div class="mb-2"><strong>End Date:</strong> {{ itinerary.endDate }}</div>
        <div class="mb-2"><strong>Parsed Dates:</strong> {{ fixedDates.join(', ') }}</div>
        <div class="mb-2"><strong>Selected Date:</strong> {{ selectedDate }}</div>
        <div class="mb-2"><strong>Has geminiResponse:</strong> {{ !!itinerary.geminiResponse }}</div>
        <div class="mb-2"><strong>Raw JSON:</strong></div>
        <v-textarea 
          v-model="rawGeminiResponse" 
          readonly 
          rows="10"
          outlined
          auto-grow
          bg-color="grey-lighten-4"
        ></v-textarea>
        <v-btn color="primary" @click="useGeneratedItinerary">
          Use Generated Sample Itinerary
        </v-btn>
      </v-card-text>
    </v-card>
    
    <!-- Itinerary Content -->
    <v-row v-else>
      <v-col cols="12">
        <!-- Travel Details Card -->
        <v-card class="mb-6 travel-details-card">
          <v-card-title class="text-h5 text-center destination-title">
            <v-icon color="white" size="32" class="destination-icon mr-2">mdi-map-marker</v-icon>
            {{ itinerary?.travelDetails?.destination || itinerary?.travelDestination || 'Travel Details' }}
            
            <v-btn
              icon="mdi-arrow-left"
              variant="text"
              size="small"
              class="float-left"
              :to="{ name: 'SavedItineraries' }"
              title="Back to itineraries"
            ></v-btn>
          </v-card-title>
          
          <v-card-text>
            <div class="travel-details-container">
              <div class="travel-detail-item">
                <v-icon color="primary" size="large" class="detail-icon">mdi-calendar</v-icon>
                <div class="detail-content">
                  <div class="text-subtitle-1 font-weight-medium">Travel Dates</div>
                  <div>{{ formatDate(itinerary.startDate) }} - {{ formatDate(itinerary.endDate) }}</div>
                </div>
              </div>
              <div class="travel-detail-item">
                <v-icon color="primary" size="large" class="detail-icon">mdi-account-group</v-icon>
                <div class="detail-content">
                  <div class="text-subtitle-1 font-weight-medium">Travelers</div>
                  <div>{{ itinerary.travellers }} {{ parseInt(itinerary.travellers) === 1 ? 'person' : 'people' }}</div>
                </div>
              </div>
              <div class="travel-detail-item">
                <v-icon color="primary" size="large" class="detail-icon">mdi-clock-outline</v-icon>
                <div class="detail-content">
                  <div class="text-subtitle-1 font-weight-medium">Daily Schedule</div>
                  <div>{{ itinerary.dailyStartTime.slice(0,5) }} - {{ itinerary.dailyEndTime.slice(0,5) }}</div>
                </div>
              </div>
              <div class="travel-detail-item">
                <v-icon color="primary" size="large" class="detail-icon">mdi-currency-usd</v-icon>
                <div class="detail-content">
                  <div class="text-subtitle-1 font-weight-medium">Budget</div>
                  <div>{{ itinerary.budget }}</div>
                </div>
              </div>
            </div>
          </v-card-text>
        </v-card>
        
        <!-- Day Selection and Itinerary Card -->
        <v-card class="itinerary-container mb-6" v-if="parsedItinerary">
          <div class="date-selector">
            <v-btn
              v-for="date in fixedDates"
              :key="date"
              :class="{ 'active-day': selectedDate === date }"
              @click="selectedDate = date"
              class="date-btn"
              rounded="lg"
              :elevation="selectedDate === date ? 3 : 1"
              variant="flat"
            >
              <div class="tab-content">
                <div class="day-name">{{ getWeekdayName(date) }}</div>
                <div class="day-date">{{ formatDateForTab(date) }}</div>
              </div>
            </v-btn>
          </div>
          
          <div class="itinerary-content">
            <template v-if="fixedDates.length > 0">
              <div v-if="selectedDate && dailyActivities && dailyActivities.length > 0">
                <v-timeline density="comfortable">
                  <template v-for="activity in dailyActivities" :key="activity.time">
                    <v-timeline-item
                      :dot-color="getTimeOfDayColor(activity.time)"
                      size="small"
                    >
                      <template v-slot:opposite>
                        <div class="timeline-time">{{ activity.time }}</div>
                      </template>
                      <div class="timeline-activity">
                        <div class="location-header">
                          <v-icon color="primary" size="small" class="mr-2">mdi-map-marker</v-icon>
                          {{ activity.location_name || activity.locationName || activity.location || activity.name || "Unknown Location" }}
                        </div>
                        <div class="activity-content">
                          <p class="description">{{ activity.description }}</p>
                          
                          <div class="activity-meta">
                            <div class="meta-item duration">
                              <v-icon small color="primary" class="meta-icon">mdi-clock-outline</v-icon>
                              <span class="font-weight-medium">Duration:&nbsp;</span> {{ activity.duration }}
                            </div>
                            <div v-if="activity.travel_time_between_locations" class="meta-item travel">
                              <v-icon small color="primary" class="meta-icon">mdi-car</v-icon>
                              <span class="font-weight-medium">Travel time:&nbsp;</span> {{ activity.travel_time_between_locations }}
                            </div>
                          </div>
                          
                          <div v-if="activity.notes" class="notes">
                            <v-icon small color="info" class="mr-1">mdi-information</v-icon>
                            {{ activity.notes }}
                          </div>
                        </div>
                      </div>
                    </v-timeline-item>
                  </template>
                </v-timeline>
              </div>
              <div v-else class="text-center py-6">
                <v-icon size="48" color="info" class="mb-2">mdi-information</v-icon>
                <div class="text-h6">No Activities Found for This Day</div>
                <div class="text-body-1">Try selecting a different day from the tabs above.</div>
              </div>
            </template>
            <div v-else class="text-center py-6">
              <v-icon size="48" color="info" class="mb-2">mdi-information</v-icon>
              <div class="text-h6">No Itinerary Data Available</div>
              <div class="text-body-1">This itinerary doesn't contain any plan details.</div>
              <v-btn
                color="primary"
                class="mt-4"
                @click="useGeneratedItinerary"
                prepend-icon="mdi-file-replace"
              >
                Generate Sample Itinerary
              </v-btn>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import itineraryService from '@/services/itinerary'

export default {
  name: 'SavedItineraryDetail',
  
  setup() {
    const route = useRoute()
    const itinerary = ref(null)
    const loading = ref(true)
    const error = ref(null)
    const selectedDate = ref(null)
    const useGeneratedItineraryFlag = ref(false)
    const rawGeminiResponse = ref('')
    
    // Check if in debug mode (URL has ?debug=true)
    const isDebugMode = computed(() => {
      return route.query.debug === 'true';
    });
    
    // Function to update raw Gemini response
    const updateRawGeminiResponse = (parsed) => {
      rawGeminiResponse.value = JSON.stringify(parsed, null, 2);
    };
    
    // Parsed itinerary from JSON
    const parsedItinerary = computed(() => {
      if (useGeneratedItineraryFlag.value || !itinerary.value || !itinerary.value.geminiResponse) {
        console.log('No geminiResponse found in itinerary data or using generated sample');
        return generateSampleItinerary();
      }
      try {
        const parsed = JSON.parse(itinerary.value.geminiResponse);
        console.log('Parsed itinerary:', parsed);
        
        // Handle date-keyed itinerary format (convert to itinerary array)
        if (parsed.dateKeysItinerary && typeof parsed.dateKeysItinerary === 'object') {
          console.log('Found dateKeysItinerary format, converting to itinerary array');
          
          
          const dateKeys = Object.keys(parsed.dateKeysItinerary).filter(key => 
            (key.match(/^\d{4}-\d{2}-\d{2}$/) || key.match(/^\d{4}\/\d{2}\/\d{2}$/)) && 
            Array.isArray(parsed.dateKeysItinerary[key])
          );
          
          if (dateKeys.length > 0) {
            const itineraryArray = dateKeys.map((dateKey, i) => {
              return {
                day: `Day ${i + 1} - ${dateKey}`,
                activities: parsed.dateKeysItinerary[dateKey]
              };
            });
            
            // Keep both formats
            if (!parsed.itinerary) {
              parsed.itinerary = itineraryArray;
            }
          }
        }
        
        // Check if the parsed data has the expected structure
        if (parsed.itinerary && (Array.isArray(parsed.itinerary) || typeof parsed.itinerary === 'object')) {
          return parsed;
        } else if (parsed.travelDetails && parsed.travelDetails.destination) {
          // This is the format used when saving itineraries in server.js
          return parsed;
        } else if (Array.isArray(parsed)) {
          return { itinerary: parsed };
        } else {
          console.log('Parsed data does not have expected structure, generating sample');
          return generateSampleItinerary();
        }
      } catch (err) {
        console.error('Error parsing itinerary JSON:', err);
        return generateSampleItinerary();
      }
    });
    // Watch for changes in the itinerary and update raw response
    watch(() => itinerary.value?.geminiResponse, (newGeminiResponse) => {
      if (newGeminiResponse) {
        try {
          const parsed = JSON.parse(newGeminiResponse);
          updateRawGeminiResponse(parsed);
        } catch (err) {
          console.error('Error updating raw Gemini response:', err);
          rawGeminiResponse.value = newGeminiResponse;
        }
      }
    }, { immediate: true });
    
    
    // Function to use the generated itinerary instead of the one from the database
    const useGeneratedItinerary = () => {
      useGeneratedItineraryFlag.value = true;
    };
    
    // Generate a sample itinerary for display when real data isn't available
    const generateSampleItinerary = () => {
      if (!itinerary.value) return null;
      
      const startDate = new Date(itinerary.value.startDate);
      const endDate = new Date(itinerary.value.endDate);
      
      // Calculate number of days
      const days = [];
      let currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        days.push(currentDate.toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // Get the destination
      const destination = itinerary.value.travelDestination || "Your Destination";
      
      // Create sample itinerary structure with both formats
      // Format 1: Array of day objects with activities arrays
      const sampleItineraryDays = days.map((day, index) => {
        const isFirstDay = index === 0;
        const isLastDay = index === days.length - 1;
        
        // Create activities based on the day
        let activities;
        
        if (isFirstDay) {
          activities = [
            {
              time: '09:00',
              name: 'Arrival and Check-in',
              locationName: 'Accommodation',
              location: 'Your Hotel in ' + destination,
              description: `Arrive in ${destination} and check in to your accommodation.`,
              duration: '1 hour'
            },
            {
              time: '11:00',
              name: 'Local Exploration',
              locationName: 'Neighborhood Tour',
              location: 'Area around your accommodation',
              description: `Take a leisurely walk around your accommodation to get familiar with the neighborhood.`,
              duration: '2 hours',
              travelTime: '0 minutes'
            },
            {
              time: '13:30',
              name: 'Lunch at Local Restaurant',
              locationName: 'Popular Local Restaurant',
              location: 'Local Eatery',
              description: `Enjoy your first meal in ${destination} at a popular local restaurant.`,
              duration: '1.5 hours',
              travelTime: '15 minutes'
            },
            {
              time: '16:00',
              name: 'Visit Main Attraction',
              locationName: 'Main Tourist Attraction',
              location: `Main Landmark in ${destination}`,
              description: `Visit the most famous landmark in ${destination}.`,
              duration: '2 hours',
              travelTime: '20 minutes'
            },
            {
              time: '19:00',
              name: 'Dinner',
              locationName: 'Evening Restaurant',
              location: 'Recommended Restaurant',
              description: 'Enjoy dinner at a recommended restaurant.',
              duration: '1.5 hours',
              travelTime: '15 minutes'
            }
          ];
        } else if (isLastDay) {
          activities = [
            {
              time: '08:30',
              name: 'Breakfast and Packing',
              locationName: 'Your Accommodation',
              location: 'Hotel',
              description: 'Enjoy your last breakfast and pack your belongings.',
              duration: '1.5 hours'
            },
            {
              time: '10:30',
              name: 'Last-Minute Shopping',
              locationName: 'Local Shopping District',
              location: 'Shopping Area',
              description: `Buy souvenirs or local specialties from ${destination}.`,
              duration: '2 hours',
              travelTime: '20 minutes'
            },
            {
              time: '13:00',
              name: 'Farewell Lunch',
              locationName: 'Local Restaurant',
              location: 'Restaurant',
              description: 'Have a final meal before departure.',
              duration: '1.5 hours',
              travelTime: '15 minutes'
            },
            {
              time: '15:00',
              name: 'Departure',
              locationName: 'Airport/Station',
              location: 'Departure Point',
              description: `Check out and depart from ${destination}.`,
              duration: '1 hour',
              travelTime: '30 minutes',
              notes: 'Make sure to allow enough time to reach the airport/station.'
            }
          ];
        } else {
          // Middle days
          activities = [
            {
              time: '09:00',
              name: 'Breakfast',
              locationName: 'Breakfast Spot',
              location: 'Accommodation or Café',
              description: 'Start your day with breakfast at your accommodation or a local café.',
              duration: '1 hour'
            },
            {
              time: '10:30',
              name: 'Morning Activity',
              locationName: `Cultural Site in ${destination}`,
              location: 'Museum or Historical Site',
              description: `Visit a cultural site or museum in ${destination}.`,
              duration: '2.5 hours',
              travelTime: '20 minutes'
            },
            {
              time: '13:30',
              name: 'Lunch',
              locationName: 'Local Restaurant',
              location: 'Restaurant',
              description: 'Enjoy lunch at a recommended restaurant.',
              duration: '1.5 hours',
              travelTime: '15 minutes'
            },
            {
              time: '15:30',
              name: 'Afternoon Activity',
              locationName: `Attraction in ${destination}`,
              location: 'Tourist Attraction',
              description: `Explore another interesting attraction in ${destination}.`,
              duration: '2.5 hours',
              travelTime: '25 minutes'
            },
            {
              time: '19:00',
              name: 'Dinner',
              locationName: 'Evening Restaurant',
              location: 'Local Restaurant',
              description: 'Have dinner at a local restaurant.',
              duration: '1.5 hours',
              travelTime: '15 minutes'
            },
            {
              time: '21:00',
              name: 'Evening Entertainment',
              locationName: 'Entertainment Venue',
              location: 'Nightlife Area',
              description: 'Enjoy some local entertainment or nightlife.',
              duration: '2 hours',
              travelTime: '10 minutes',
              notes: 'Optional based on your preferences and energy level.'
            }
          ];
        }
        
        return {
          day: `Day ${index + 1} - ${day}`,
          activities: activities
        };
      });
      
      // Format 2: Object with date keys (matching what we see in the itinerary service)
      const dateKeysItinerary = {};
      days.forEach((day, index) => {
        const isFirstDay = index === 0;
        const isLastDay = index === days.length - 1;
        
        if (isFirstDay) {
          dateKeysItinerary[day] = [
            {
              time: '09:00',
              locationName: 'Accommodation',
              location: 'Your Hotel',
              description: `Arrive in ${destination} and check in to your accommodation.`,
              duration: '1 hour'
            },
            {
              time: '11:00',
              locationName: 'Neighborhood Tour',
              location: 'Around your accommodation',
              description: `Take a leisurely walk around your accommodation to get familiar with the neighborhood.`,
              duration: '2 hours',
              travelTime: '0 minutes'
            },
            {
              time: '13:30',
              locationName: 'Popular Local Restaurant',
              location: 'Local Eatery',
              description: `Enjoy your first meal in ${destination}.`,
              duration: '1.5 hours',
              travelTime: '15 minutes'
            }
          ];
        } else if (isLastDay) {
          dateKeysItinerary[day] = [
            {
              time: '09:00',
              locationName: 'Hotel Breakfast',
              location: 'Your Accommodation',
              description: 'Enjoy your last breakfast and pack your belongings.',
              duration: '1.5 hours'
            },
            {
              time: '11:00',
              locationName: 'Local Market',
              location: 'Shopping District',
              description: `Buy souvenirs from ${destination}.`,
              duration: '2 hours',
              travelTime: '20 minutes'
            },
            {
              time: '14:00',
              name: 'Departure',
              locationName: 'Airport/Station',
              location: 'Departure Point',
              description: `Check out and depart from ${destination}.`,
              duration: '1 hour',
              travelTime: '30 minutes'
            }
          ];
        } else {
          dateKeysItinerary[day] = [
            {
              time: '09:00',
              locationName: 'Breakfast Spot',
              location: 'Café',
              description: 'Start your day with breakfast.',
              duration: '1 hour'
            },
            {
              time: '10:30',
              locationName: `Tourist Attraction`,
              location: 'Popular Site',
              description: `Visit a popular site in ${destination}.`,
              duration: '2.5 hours',
              travelTime: '20 minutes'
            },
            {
              time: '14:00',
              locationName: 'Local Restaurant',
              location: 'Dining Area',
              description: 'Enjoy lunch.',
              duration: '1.5 hours',
              travelTime: '15 minutes'
            },
            {
              time: '16:00',
              locationName: 'Afternoon Activity',
              location: 'Tourist Spot',
              description: `Explore another attraction in ${destination}.`,
              duration: '2 hours',
              travelTime: '25 minutes'
            }
          ];
        }
      });
      
      // Create a sample itinerary with both formats to maximize compatibility
      const sampleItinerary = {
        itinerary: sampleItineraryDays,
        travelDetails: {
          destination: destination,
          startDate: itinerary.value.startDate,
          endDate: itinerary.value.endDate,
          numberOfTravelers: itinerary.value.travellers,
          budget: itinerary.value.budget,
          dailyStartTime: itinerary.value.dailyStartTime,
          dailyEndTime: itinerary.value.dailyEndTime
        }
      };
      
      // Also include date-keyed format for maximum compatibility
      sampleItinerary.dateKeysItinerary = dateKeysItinerary;
      
      console.log('Generated sample itinerary:', sampleItinerary);
      return sampleItinerary;
    };
    
    // Compute dates from parsed itinerary
    const fixedDates = computed(() => {
      if (!itinerary.value) {
        return [];
      }
      
      if (!parsedItinerary.value || (!parsedItinerary.value.itinerary && !Array.isArray(parsedItinerary.value))) {
        // Generate dates from the itinerary's date range if no parsed data available
        const startDate = new Date(itinerary.value.startDate);
        const endDate = new Date(itinerary.value.endDate);
        const dates = [];
        
        let currentDate = new Date(startDate);
        while (currentDate <= endDate) {
          dates.push(currentDate.toISOString().split('T')[0]);
          currentDate.setDate(currentDate.getDate() + 1);
        }
        
        return dates;
      }
      
      console.log('Parsed itinerary structure for dates:', parsedItinerary.value);
      
      // Handle different possible structures
      const itineraryArray = Array.isArray(parsedItinerary.value.itinerary) 
        ? parsedItinerary.value.itinerary 
        : (Array.isArray(parsedItinerary.value) ? parsedItinerary.value : null);
      
      // If no valid itinerary array is found, try to extract date-based keys
      if (!itineraryArray && parsedItinerary.value.itinerary && typeof parsedItinerary.value.itinerary === 'object') {
        const dateKeys = Object.keys(parsedItinerary.value.itinerary).filter(key => {
          return (key.match(/^\d{4}-\d{2}-\d{2}$/) || key.match(/^\d{4}\/\d{2}\/\d{2}$/)) && 
                 Array.isArray(parsedItinerary.value.itinerary[key]);
        });
        
        if (dateKeys.length > 0) {
          console.log('Found date-based keys in itinerary object:', dateKeys);
          return dateKeys;
        }
      }
      
      // If no valid itinerary array is found, return empty array
      if (!itineraryArray) {
        console.log('No valid itinerary array found for dates, using start/end dates');
        // Generate dates from the itinerary's date range
        const startDate = new Date(itinerary.value.startDate);
        const endDate = new Date(itinerary.value.endDate);
        const dates = [];
        
        let currentDate = new Date(startDate);
        while (currentDate <= endDate) {
          dates.push(currentDate.toISOString().split('T')[0]);
          currentDate.setDate(currentDate.getDate() + 1);
        }
        
        return dates;
      }
      
      // Find all date/day entries from the itinerary
      const dates = [];
      
      for (const day of itineraryArray) {
        // Extract date from day if available (e.g., "Day 1 - 2025-04-07")
        const dateMatch = day.day && typeof day.day === 'string' 
          ? day.day.match(/\d{4}-\d{2}-\d{2}/) 
          : null;
          
        if (dateMatch) {
          dates.push(dateMatch[0]);
        } else if (itinerary.value.startDate) {
          // If no date in day title, we'll use the itinerary's start date
          // We need to generate dates based on the day number and start date
          const dayNumberMatch = day.day && typeof day.day === 'string'
            ? day.day.match(/Day\s+(\d+)/)
            : null;
            
          if (dayNumberMatch) {
            const dayIndex = parseInt(dayNumberMatch[1]) - 1;
            const startDate = new Date(itinerary.value.startDate);
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + dayIndex);
            
            // Format as YYYY-MM-DD
            const dateStr = currentDate.toISOString().split('T')[0];
            dates.push(dateStr);
          }
        }
      }
      
      if (dates.length === 0) {
        // If no dates found in itinerary, generate them from start/end dates
        const startDate = new Date(itinerary.value.startDate);
        const endDate = new Date(itinerary.value.endDate);
        
        let currentDate = new Date(startDate);
        while (currentDate <= endDate) {
          dates.push(currentDate.toISOString().split('T')[0]);
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }
      
      return dates;
    });
    
    // Get activities for the selected date
    const dailyActivities = computed(() => {
      if (!parsedItinerary.value || !selectedDate.value) {
        return [];
      }
      
      console.log('Getting activities for date:', selectedDate.value);
      
      let activities = [];
      
      // Check for dateKeysItinerary format first (direct date keys)
      if (parsedItinerary.value.dateKeysItinerary && 
          typeof parsedItinerary.value.dateKeysItinerary === 'object' &&
          parsedItinerary.value.dateKeysItinerary[selectedDate.value] && 
          Array.isArray(parsedItinerary.value.dateKeysItinerary[selectedDate.value])) {
        console.log('Found activities in dateKeysItinerary by direct date key');
        activities = parsedItinerary.value.dateKeysItinerary[selectedDate.value];
      }
      // Check if itinerary has a date-keyed object structure
      else if (parsedItinerary.value.itinerary && typeof parsedItinerary.value.itinerary === 'object' && !Array.isArray(parsedItinerary.value.itinerary)) {
        // Try to get activities directly by date key
        if (parsedItinerary.value.itinerary[selectedDate.value] && Array.isArray(parsedItinerary.value.itinerary[selectedDate.value])) {
          console.log('Found activities by direct date key');
          activities = parsedItinerary.value.itinerary[selectedDate.value];
        }
      }
      // Handle different possible structures
      else {
        const itineraryArray = Array.isArray(parsedItinerary.value.itinerary) 
          ? parsedItinerary.value.itinerary 
          : (Array.isArray(parsedItinerary.value) ? parsedItinerary.value : null);
        
        if (itineraryArray) {
          for (const day of itineraryArray) {
            // Check if this day matches the selected date
            const dateInTitle = day.day && typeof day.day === 'string' 
              ? day.day.match(/\d{4}-\d{2}-\d{2}/)
              : null;
              
            if (dateInTitle && dateInTitle[0] === selectedDate.value) {
              console.log('Found activities by date in day title');
              activities = day.activities || [];
              break;
            }
            
            // If no direct date match, try checking day number
            const dayNumberMatch = day.day && typeof day.day === 'string'
              ? day.day.match(/Day\s+(\d+)/)
              : null;
              
            if (dayNumberMatch) {
              const dayIndex = parseInt(dayNumberMatch[1]) - 1;
              const startDate = new Date(itinerary.value.startDate);
              const currentDate = new Date(startDate);
              currentDate.setDate(startDate.getDate() + dayIndex);
              
              // Format as YYYY-MM-DD
              const dateStr = currentDate.toISOString().split('T')[0];
              
              if (dateStr === selectedDate.value) {
                console.log('Found activities by day number match');
                activities = day.activities || [];
                break;
              }
            }
          }
          
          // If we still couldn't find activities, check if itineraryArray has a specific format
          if (activities.length === 0 && itineraryArray.length > 0) {
            const dayIndices = fixedDates.value.map(date => date).sort();
            const dateIndex = dayIndices.indexOf(selectedDate.value);
            
            if (dateIndex >= 0 && dateIndex < itineraryArray.length) {
              const dayData = itineraryArray[dateIndex];
              console.log('Found activities by day index match');
              activities = dayData.activities || (Array.isArray(dayData) ? dayData : []);
            }
          }
        }
      }
      
      // Process each activity to ensure it has all the required fields
      if (activities.length > 0) {
        console.log('Raw activities found:', activities);
        
        // Map activities to ensure consistent format
        activities = activities.map(activity => {
          // Extract location name from description if not available
          if (!activity.location_name && !activity.locationName && !activity.location && activity.description) {
            // Try to extract location from beginning of description
            const descParts = activity.description.split(',');
            if (descParts.length > 1) {
              activity.location_name = descParts[0].trim();
            } else if (activity.description.includes('to the') || activity.description.includes('at')) {
              // Extract phrases like "to the [location]" or "at [location]"
              const locationMatch = activity.description.match(/(?:to the|at)\s+([^,.]+)/i);
              if (locationMatch && locationMatch[1]) {
                activity.location_name = locationMatch[1].trim();
              }
            }
            
            // If still no location name, try to extract key nouns from the first sentence
            if (!activity.location_name) {
              const firstSentence = activity.description.split('.')[0];
              // Match words starting with capital letters that might be location names
              const possibleLocationMatch = firstSentence.match(/\s([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)/);
              if (possibleLocationMatch && possibleLocationMatch[1]) {
                activity.location_name = possibleLocationMatch[1].trim();
              }
            }
          }

          // Normalize location name fields
          if (!activity.location_name && activity.locationName) {
            activity.location_name = activity.locationName;
          }
          if (!activity.location_name && activity.location) {
            activity.location_name = activity.location;
          }
          if (!activity.locationName && activity.location_name) {
            activity.locationName = activity.location_name;
          }
          
          // Normalize travel time
          if (!activity.travelTime && activity.travel_time) {
            activity.travelTime = activity.travel_time;
          }
          if (!activity.travel_time && activity.travelTime) {
            activity.travel_time = activity.travelTime;
          }
          if (!activity.travel_time_between_locations && (activity.travelTime || activity.travel_time)) {
            activity.travel_time_between_locations = activity.travelTime || activity.travel_time;
          }
          if (!activity.travelTime && activity.travel_time_between_locations) {
            activity.travelTime = activity.travel_time_between_locations;
            activity.travel_time = activity.travel_time_between_locations;
          }
          
          // Add default duration if not present
          // Format the duration
          activity.duration = getDuration(activity);
          
          // Ensure description is a string
          if (!activity.description) {
            activity.description = "No description available";
          }
          
          return activity;
        });
        
        console.log('Processed activities:', activities);
      }
      
      return activities;
    });
    
    const fetchItinerary = async () => {
      const id = route.params.id;
      if (!id) {
        error.value = 'Invalid itinerary ID';
        loading.value = false;
        return;
      }
      
      try {
        loading.value = true;
        error.value = null;
        const data = await itineraryService.getItineraryById(id);
        itinerary.value = data;
        
        // Set raw Gemini response
        if (data && data.geminiResponse) {
          try {
            const parsed = JSON.parse(data.geminiResponse);
            rawGeminiResponse.value = JSON.stringify(parsed, null, 2);
          } catch (err) {
            rawGeminiResponse.value = data.geminiResponse;
          }
        }
      } catch (err) {
        console.error('Error fetching itinerary:', err);
        error.value = 'Failed to load the itinerary. It may have been deleted or you don\'t have permission to view it.';
      } finally {
        loading.value = false;
      }
    };
    
    // Watch selected date for changes and log what we find
    watch(selectedDate, (newDate) => {
      if (newDate) {
        console.log(`Selected date changed to: ${newDate}`);
        console.log(`Activities for ${newDate}:`, dailyActivities.value);
      }
    });
    
    // Set initial selected date when itinerary loads
    watch(fixedDates, (newDates) => {
      if (newDates && newDates.length > 0 && !selectedDate.value) {
        console.log(`Setting initial selected date to: ${newDates[0]}`);
        selectedDate.value = newDates[0];
      }
    });
    
    const formatDate = (dateString) => {
      if (!dateString) return 'N/A';
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
    };
    
    const formatDateForTab = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString + 'T12:00:00Z');
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        timeZone: 'UTC'
      }).split(', ')[0]; // Remove year part
    };
    
    const getWeekdayName = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString + 'T12:00:00Z');
      return date.toLocaleDateString('en-US', { 
        weekday: 'short',
        timeZone: 'UTC'
      });
    };
    
    // Helper function to determine color based on time of day
    const getDuration = (activity) => {
      const duration = activity.duration || activity.Duration || activity.estimated_duration || '';
      // Return as is if it already has proper formatting with units
      if (typeof duration === 'string' &&
          (duration.includes('minute') || duration.includes('hour') ||
           duration.includes('min') || duration.includes('hr'))) {
        return duration;
      }
      
      // For "0:30" format, convert to "30 minutes"
      if (typeof duration === 'string' && duration.includes(':')) {
        const parts = duration.split(':');
        if (parts.length === 2) {
          const hours = parseInt(parts[0]);
          const minutes = parseInt(parts[1]);
          
          if (hours > 0 && minutes > 0) {
            return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minute${minutes > 1 ? 's' : ''}`;
          } else if (hours > 0) {
            return `${hours} hour${hours > 1 ? 's' : ''}`;
          } else if (minutes > 0) {
            return `${minutes} minute${minutes > 1 ? 's' : ''}`;
          }
        }
      }
      
      // If it's just a number, add "hours"
      if (duration && !isNaN(duration) && duration.toString().trim() !== '') {
        const numDuration = parseFloat(duration);
        if (numDuration >= 1) {
          return `${Math.floor(numDuration)} hour${numDuration >= 2 ? 's' : ''}`;
        } else {
          return `${Math.round(numDuration * 60)} minutes`;
        }
      }
      
      return '1 hour'; // Default duration
    };
    
    const getTimeOfDayColor = (timeStr) => {
      if (!timeStr) return 'primary';
      
      // Extract hours from time string (assuming format like "08:30" or "8:30")
      const hour = parseInt(timeStr.split(':')[0]);
      
      // Early morning (5:00 - 8:59)
      if (hour >= 5 && hour < 9) {
        return 'blue-lighten-2'; // Light blue for morning
      }
      // Morning to noon (9:00 - 11:59)
      else if (hour >= 9 && hour < 12) {
        return 'amber-lighten-1'; // Amber for late morning
      }
      // Afternoon (12:00 - 16:59)
      else if (hour >= 12 && hour < 17) {
        return 'green-darken-1'; // Green for afternoon
      }
      // Evening (17:00 - 20:59)
      else if (hour >= 17 && hour < 21) {
        return 'deep-purple-lighten-1'; // Purple for evening
      }
      // Night (21:00 - 4:59)
      else {
        return 'indigo-darken-3'; // Dark blue for night
      }
    };
    
    onMounted(() => {
      fetchItinerary();
    });
    
    return {
      itinerary,
      loading,
      error,
      parsedItinerary,
      fixedDates,
      selectedDate,
      dailyActivities,
      formatDate,
      formatDateForTab,
      getWeekdayName,
      getTimeOfDayColor,
      getDuration,
      isDebugMode,
      rawGeminiResponse,
      useGeneratedItinerary
    };
  }
}
</script>

<style scoped>
.travel-details-card {
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
}

.destination-title {
  background: linear-gradient(135deg, #6a80e0, #9575CD);
  color: white;
  padding: 24px !important;
  position: relative;
}

.destination-icon {
  animation: bounce 2s ease infinite;
  transform-origin: center bottom;
}

.travel-details-container {
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: 20px;
  padding: 8px;
}

@media (min-width: 600px) {
  .travel-details-container {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 960px) {
  .travel-details-container {
    grid-template-columns: repeat(4, 1fr);
  }
}

.travel-detail-item {
  display: flex;
  align-items: flex-start;
  padding: 12px;
  background-color: #f8f9fd;
  border-radius: 12px;
  transition: all 0.3s ease;
}

.travel-detail-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);
}

.detail-icon {
  margin-right: 12px;
  margin-top: 4px;
}

.detail-content {
  flex: 1;
}

.save-button {
  min-width: 180px;
}

.itinerary-container {
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
}

.date-selector {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
  padding: 16px;
  background-color: #f8f9fd;
  border-radius: 16px 16px 0 0;
  position: relative;
}

.date-selector::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 10%;
  right: 10%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(106, 128, 224, 0.2), transparent);
  opacity: 0.8;
}

.date-btn {
  min-width: 85px !important;
  padding: 10px !important;
  height: auto !important;
  border-radius: 12px !important;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background-color: #f8f9fd !important;
  color: #333;
  border: 1px solid rgba(0, 0, 0, 0.05) !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.03) !important;
  text-transform: none !important;
}

.active-day {
  background: linear-gradient(135deg, #6a80e0, #9575CD) !important;
  border-color: transparent !important;
  color: white !important;
  box-shadow: 0 4px 8px rgba(106, 128, 224, 0.25) !important;
  transform: translateY(-2px);
}

.date-btn:hover:not(.active-day) {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08) !important;
  background: linear-gradient(135deg, #f8f9fd, #eef1fa) !important;
  border-color: rgba(106, 128, 224, 0.2) !important;
}

.tab-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

.day-name {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 4px;
  text-transform: capitalize;
}

.day-date {
  font-size: 0.85rem;
  opacity: 0.9;
}

.itinerary-content {
  padding: 24px;
  background-color: #ffffff;
  border-radius: 0 0 16px 16px;
}

.timeline-time {
  font-weight: 600;
  color: #6a80e0;
  opacity: 0.9;
}

.timeline-activity {
  background-color: #ffffff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.timeline-activity:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.location-header {
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  background-color: #f8f9fd;
  padding: 8px 12px;
  border-radius: 8px 8px 0 0;
}

.activity-content {
  padding: 4px 12px;
}

.description {
  margin: 8px 0 16px;
  white-space: pre-line;
  line-height: 1.5;
}

.activity-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 8px;
  margin-bottom: 12px;
}

.meta-item {
  display: flex;
  align-items: center;
  background-color: #f0f4ff;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 0.85rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.meta-item.duration {
  background-color: #e3f2fd;
  border-left: 3px solid #2196F3;
}

.meta-item.travel {
  background-color: #e8f5e9;
  border-left: 3px solid #4CAF50;
}

.meta-icon {
  margin-right: 6px;
  color: #6a80e0 !important;
}

.notes {
  margin-top: 12px;
  padding: 8px 12px;
  background-color: rgba(236, 240, 253, 0.5);
  border-radius: 8px;
  font-size: 0.9rem;
  color: #444;
  border-left: 3px solid #6a80e0;
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-5px);
  }
}
</style> 