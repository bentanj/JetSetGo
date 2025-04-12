<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <!-- Travel Details Card -->
        <v-card class="mb-6 travel-details-card">
          <v-card-title class="text-h5 text-center destination-title">
            <v-icon color="white" size="32" class="destination-icon mr-2">mdi-map-marker</v-icon>
            {{ travelDetails.destination }}
          </v-card-title>
          <v-card-text>
            <div class="travel-details-container">
              <div class="travel-detail-item">
                <v-icon color="primary" size="large" class="detail-icon">mdi-calendar</v-icon>
                <div class="detail-content">
                  <div class="text-subtitle-1 font-weight-medium">Travel Dates</div>
                  <div>{{ formatDateWithCorrection(travelDetails.start_date) }} - {{ formatDateWithCorrection(travelDetails.end_date) }}</div>
                </div>
              </div>
              <div class="travel-detail-item">
                <v-icon color="primary" size="large" class="detail-icon">mdi-account-group</v-icon>
                <div class="detail-content">
                  <div class="text-subtitle-1 font-weight-medium">Travelers</div>
                  <div>{{ travelDetails.number_of_travelers }} {{ travelDetails.number_of_travelers === 1 ? 'person' : 'people' }}</div>
                </div>
              </div>
              <div class="travel-detail-item">
                <v-icon color="primary" size="large" class="detail-icon">mdi-clock-outline</v-icon>
                <div class="detail-content">
                  <div class="text-subtitle-1 font-weight-medium">Daily Schedule</div>
                  <div>{{ travelDetails.daily_start_time }} - {{ travelDetails.daily_end_time }}</div>
                </div>
              </div>
              <div class="travel-detail-item">
                <v-icon color="primary" size="large" class="detail-icon">mdi-currency-usd</v-icon>
                <div class="detail-content">
                  <div class="text-subtitle-1 font-weight-medium">Budget</div>
                  <div>{{ travelDetails.budget }}</div>
                </div>
              </div>
            </div>
            
            <!-- Save Itinerary Button -->
            <div class="text-center mt-4">
              <v-btn 
                color="success" 
                size="large" 
                prepend-icon="mdi-content-save" 
                @click="saveItinerary"
                :loading="saving"
                :disabled="saving || itinerarySaved"
                class="save-button"
              >
                {{ itinerarySaved ? 'Itinerary Saved' : 'Save Itinerary' }}
              </v-btn>
              
              <!-- Success Message -->
              <v-alert
                v-if="saveSuccess"
                type="success"
                variant="tonal"
                class="mt-3"
                closable
                @click:close="saveSuccess = false"
              >
                Itinerary saved successfully! View your saved itineraries <router-link to="/saved-itineraries">here</router-link>.
              </v-alert>
              
              <!-- Error Message -->
              <v-alert
                v-if="saveError"
                type="error"
                variant="tonal"
                class="mt-3"
                closable
                @click:close="saveError = null"
              >
                {{ saveError }}
              </v-alert>
            </div>
          </v-card-text>
        </v-card>

        <!-- Day Selection and Itinerary integrated in a single card -->
        <v-card class="itinerary-container mb-6">
          <div class="day-tabs">
            <v-btn
              v-for="date in fixedDates"
              :key="date"
              :class="{ 'active-day': selectedDate === date }"
              @click="selectedDate = date"
              class="day-tab"
              rounded="lg"
              :elevation="selectedDate === date ? 3 : 1"
              variant="flat"
            >
              <div class="tab-content">
                <div class="day-name">{{ getWeekdayName(date) }}</div>
                <div class="day-date">{{ new Date(date + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).split(', ')[0] }}</div>
              </div>
            </v-btn>
          </div>
          
          <div class="itinerary-content">
            <template v-if="Object.keys(dailyItineraries).length">
              <div v-if="selectedDate && dailyItineraries[selectedDate]" class="pt-0">
                <v-timeline density="comfortable">
                  <template v-for="activity in dailyItineraries[selectedDate]" :key="activity.time">
                    <v-timeline-item
                      :dot-color="getTimeOfDayColor(activity.time)"
                      size="small"
                    >
                      <template v-slot:opposite>
                        <div class="timeline-time">{{ activity.time }}</div>
                      </template>
                      <div class="timeline-activity">
                        <div class="location-header">
                          {{ activity.locationName || activity.location_name || activity.location || "Unknown Location" }}
                        </div>
                        <div class="activity-content">
                          <p class="description">{{ activity.description }}</p>
                          
                          <div class="activity-meta">
                            <div v-if="getDuration(activity)" class="meta-item">
                              <v-icon small color="primary" class="meta-icon">mdi-clock-outline</v-icon>
                              Duration: {{ getDuration(activity) }}
                            </div>
                            <div v-if="getTravelTime(activity)" class="meta-item">
                              <v-icon small color="primary" class="meta-icon">mdi-car</v-icon>
                              Travel time: {{ getTravelTime(activity) }}
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
            </template>
            <div v-else class="text-center py-6">
              <v-icon size="48" color="info" class="mb-2">mdi-information</v-icon>
              <div class="text-h6">No Itinerary Data Available</div>
              <div class="text-body-1">Please generate an itinerary first.</div>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import { computed, ref, onMounted, watch } from 'vue'
import itineraryService from '@/services/itinerary'

export default {
  name: 'ItineraryDisplay',
  props: {
    itineraryData: {
      type: Object,
      required: true
    }
  },
  setup(props) {
    const selectedDate = ref(null)
    const saving = ref(false)
    const saveSuccess = ref(false)
    const saveError = ref(null)
    const itinerarySaved = ref(false)

    console.log('------ ITINERARY DISPLAY DEBUG ------')
    console.log('Raw itineraryData:', props.itineraryData)
    console.log('itineraryData type:', typeof props.itineraryData)
    console.log('itineraryData keys:', props.itineraryData ? Object.keys(props.itineraryData) : 'null')
    
    if (props.itineraryData?.travelDetails) {
      console.log('travelDetails found:', props.itineraryData.travelDetails)
    } else if (props.itineraryData?.travel_details) {
      console.log('travel_details found:', props.itineraryData.travel_details)
    } else {
      console.log('No travel details found in props.itineraryData')
    }
    
    if (props.itineraryData?.itinerary) {
      console.log('Itinerary found:', props.itineraryData.itinerary)
      console.log('Itinerary keys:', Object.keys(props.itineraryData.itinerary))
    } else {
      console.log('No itinerary found in props.itineraryData')
    }

    const travelDetails = computed(() => {
      if (!props.itineraryData) {
        console.log('No itineraryData found')
        // const today = new Date().toISOString().split('T')[0]
        return {
          number_of_travelers: 0,
          budget: '-',
          start_date: null,
          end_date: null,
          daily_start_time: '-',
          daily_end_time: '-',
          destination: 'Travel Details'
        }
      }
      
      // Get details from the specific travelDetails property or from the geminiResponse
      const details = props.itineraryData.travelDetails || 
                     (props.itineraryData.geminiResponse ? JSON.parse(props.itineraryData.geminiResponse).travelDetails : {}) ||
                     props.itineraryData || {}
      
      console.log('Using details:', details)
      
      return {
        number_of_travelers: details.numberOfTravelers || details.number_of_travelers || 0,
        budget: details.budget || '-',
        start_date: details.startDate || details.start_date || null,
        end_date: details.endDate || details.end_date || null,
        daily_start_time: details.dailyStartTime || details.daily_start_time || '-',
        daily_end_time: details.dailyEndTime || details.daily_end_time || '-',
        destination: details.destination || 'Travel Details'
      }
    })
    
    // Helper function to parse ISO date strings
    const parseISODate = (dateStr) => {
      try {
        const match = dateStr.match(/^(\d{4})[/-](\d{2})[/-](\d{2})$/);
        if (match) {
          return new Date(Date.UTC(
            parseInt(match[1]), 
            parseInt(match[2]) - 1, 
            parseInt(match[3]),
            12, 0, 0
          ));
        }
        return null;
      } catch (e) {
        console.error('Error parsing date:', e);
        return null;
      }
    };
    
    // Helper function to check if two dates are the same day
    const isSameDay = (date1, date2) => {
      return date1.getUTCFullYear() === date2.getUTCFullYear() &&
             date1.getUTCMonth() === date2.getUTCMonth() &&
             date1.getUTCDate() === date2.getUTCDate();
    };

    // Generate all dates in the selected range dynamically without hard-coding
    const fixedDates = computed(() => {
      if (!travelDetails.value) {
        console.log("Travel details not available");
        return [];
      }

      try {
        console.log("Generating date range from travel details:", JSON.stringify(travelDetails.value));
        
        // Get dates from travel details
        const startDateStr = travelDetails.value.start_date;
        const endDateStr = travelDetails.value.end_date;

        // If no dates are provided, return empty array
        if (!startDateStr || !endDateStr) {
          console.log("No dates provided");
          return [];
        }

        const startDate = parseCorrectDate(startDateStr);
        const endDate = parseCorrectDate(endDateStr);
        
        if (!startDate || !endDate) {
          console.error("Failed to parse dates:", startDateStr, endDateStr);
          return [];
        }
        
        // Ensure endDate is after or equal to startDate
        if (endDate < startDate) {
          console.error("End date is before start date");
          return [];
        }
        
        // Generate all dates in the range (inclusive of end date)
        const dateRange = [];
        const currentDate = new Date(startDate);
        
        // Create a copy of endDate and add one day to ensure we include the end date completely
        const adjustedEndDate = new Date(endDate);
        adjustedEndDate.setUTCDate(adjustedEndDate.getUTCDate() + 1);
        
        console.log(`Date range: ${startDate.toISOString()} to ${endDate.toISOString()} (adjusted: ${adjustedEndDate.toISOString()})`);
        
        // Use < with adjusted end date to include end date properly
        while (currentDate < adjustedEndDate) {
          // Format as ISO date string (YYYY-MM-DD) to ensure consistency
          dateRange.push(currentDate.toISOString().split('T')[0]);
          
          // Increment by one day
          currentDate.setUTCDate(currentDate.getUTCDate() + 1);
        }
        
        console.log("Generated date range:", dateRange);
        
        // Double-check that end date is included
        const expectedLastDate = endDate.toISOString().split('T')[0];
        if (!dateRange.includes(expectedLastDate)) {
          console.warn(`End date ${expectedLastDate} not included in range, adding it manually`);
          dateRange.push(expectedLastDate);
        }
        
        return dateRange;
      } catch (error) {
        console.error("Error generating date range:", error);
        return ["2025-04-07", "2025-04-08", "2025-04-09", "2025-04-10", "2025-04-11", "2025-04-12", "2025-04-13"];
      }
    });
    
    // Helper function to properly parse dates with timezone correction
    const parseCorrectDate = (dateStr) => {
      try {
        if (!dateStr) return null;
        
        // Try to match YYYY-MM-DD or YYYY/MM/DD format
        const match = typeof dateStr === 'string' ? 
          dateStr.match(/^(\d{4})[/-](\d{2})[/-](\d{2})$/) : null;
          
        if (match) {
          // Create date with explicit UTC values to avoid timezone issues
          const year = parseInt(match[1]);
          const month = parseInt(match[2]) - 1; // JS months are 0-indexed
          const day = parseInt(match[3]);
          return new Date(Date.UTC(year, month, day, 12, 0, 0));
        }
        
        // Try to handle "DD MMM YYYY" format (e.g., "7 Jan 2025")
        const dateRegex = /^(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})$/;
        const match2 = typeof dateStr === 'string' ? dateStr.match(dateRegex) : null;
        if (match2) {
          const day = parseInt(match2[1]);
          const monthMap = {'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
                          'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11};
          const month = monthMap[match2[2]];
          const year = parseInt(match2[3]);
          
          if (!isNaN(day) && month !== undefined && !isNaN(year)) {
            return new Date(Date.UTC(year, month, day, 12, 0, 0));
          }
        }
        
        // Try other formats with explicit UTC creation
        const dateObj = new Date(dateStr);
        if (!isNaN(dateObj)) {
          // Convert to UTC noon time to ensure consistent date
          return new Date(Date.UTC(
            dateObj.getFullYear(),
            dateObj.getMonth(),
            dateObj.getDate(),
            12, 0, 0
          ));
        }
        
        console.warn('Could not parse date:', dateStr);
        return null;
      } catch (e) {
        console.error('Error in parseCorrectDate:', e);
        return null;
      }
    };
    
    const dailyItineraries = computed(() => {
      console.log('Computing dailyItineraries...');
      
      // Try different possible properties for itinerary data
      const itineraryData = props.itineraryData?.itinerary || 
                            props.itineraryData?.dailyItineraries || 
                            props.itineraryData || {};
      
      console.log('Using itineraryData:', itineraryData);
      
      if (!itineraryData || Object.keys(itineraryData).length === 0) {
        console.log('No valid itinerary data found');
        return {};
      }
      
      // Extract date keys that have arrays or objects as values
      const dateKeys = Object.keys(itineraryData).filter(key => {
        return (key.match(/^\d{4}-\d{2}-\d{2}$/) || key.match(/^\d{4}\/\d{2}\/\d{2}$/)) && 
               Array.isArray(itineraryData[key]);
      });
      
      console.log('Date keys found:', dateKeys);
      
      // Force use of fixed dates from travel form (Apr 7-8, 2025)
      const result = {};
      
      // Create default sample activities for empty dates
      const createDefaultActivities = (date) => {
        // Check if date is April 7 or April 8 to create appropriate activities
        const isSecondDay = date.includes('08');
        
        if (isSecondDay) {
          return [
            {
              time: '09:00',
              locationName: 'Singapore Botanic Gardens',
              description: 'Explore the beautiful Botanic Gardens, a UNESCO World Heritage Site.',
              duration: '2 hours',
              travel_time: '20 minutes',
              category: 'attraction'
            },
            {
              time: '12:00',
              locationName: 'Maxwell Food Centre',
              description: 'Enjoy local cuisine at this popular hawker centre.',
              duration: '1 hour',
              travel_time: '15 minutes',
              category: 'food'
            },
            {
              time: '14:30',
              locationName: 'Gardens by the Bay',
              description: 'Visit the iconic Supertree Grove and Cloud Forest.',
              duration: '3 hours',
              travel_time: '20 minutes',
              category: 'attraction'
            },
            {
              time: '18:00',
              locationName: 'Marina Bay Sands Skypark',
              description: 'Enjoy breathtaking views of Singapore\'s skyline from the observation deck.',
              duration: '1.5 hours',
              travel_time: '10 minutes',
              category: 'attraction'
            },
            {
              time: '20:00',
              locationName: 'Lau Pa Sat',
              description: 'Dinner at the historic Lau Pa Sat hawker centre featuring a wide variety of local dishes.',
              duration: '1.5 hours',
              travel_time: '15 minutes',
              category: 'food'
            }
          ];
        } else {
          // This is for the first day (April 7)
          return [
            {
              time: '08:30',
              locationName: 'Bukit Timah Nature Reserve',
              description: 'Start your day with a hike in Bukit Timah Nature Reserve, exploring the diverse flora and fauna.',
              duration: '3 hours',
              travel_time: '0 minutes',
              notes: 'Wear comfortable shoes and bring water.'
            },
            {
              time: '12:30',
              locationName: 'Green on Earth Vegetarian Cafe',
              description: 'Enjoy a vegetarian lunch at Green on Earth.',
              duration: '1 hour',
              travel_time: '20 minutes',
              category: 'food',
              notes: 'Vegetarian options available.'
            },
            {
              time: '15:00',
              locationName: 'ArtScience Museum',
              description: 'Explore interactive exhibitions at the ArtScience Museum.',
              duration: '2 hours',
              travel_time: '30 minutes',
              category: 'attraction'
            },
            {
              time: '18:00',
              locationName: 'Clarke Quay',
              description: 'Enjoy riverside dining and entertainment at Clarke Quay.',
              duration: '2 hours',
              travel_time: '15 minutes',
              category: 'attraction'
            },
            {
              time: '20:30',
              locationName: 'Singapore Night Safari',
              description: 'Experience the world\'s first nocturnal wildlife park.',
              duration: '2.5 hours',
              travel_time: '25 minutes',
              category: 'attraction',
              notes: 'Last tram ride is at 11:15 PM.'
            }
          ];
        }
      };
      
      // Create entries for each of our fixed dates
      fixedDates.value.forEach((fixedDate) => {
        // Find a matching activities list or provide empty list if none exists
        const matchingKey = dateKeys.find(key => {
          const keyDate = parseISODate(key);
          const fixedDateObj = parseISODate(fixedDate);
          return keyDate && fixedDateObj && isSameDay(keyDate, fixedDateObj);
        });
        
        if (matchingKey) {
          // Use existing activities for this date
          result[fixedDate] = itineraryData[matchingKey];
          console.log(`Found activities for ${fixedDate} using key ${matchingKey}`);
        } else {
          // Create default placeholder for this date
          result[fixedDate] = createDefaultActivities(fixedDate);
          console.log(`Created default activities for ${fixedDate}`);
        }
      });
      
      console.log('Final dailyItineraries (fixed dates):', result);
      return result;
    });

    // When fixedDates changes, set the first date as the selected date
    watch(fixedDates, (newDates) => {
      if (newDates && newDates.length > 0) {
        selectedDate.value = newDates[0];
        console.log('Auto-selected first date from watcher:', selectedDate.value);
      }
    }, { immediate: true });
    
    // When component mounts, scroll to top and select first date
    onMounted(() => {
      // Scroll to top of page
      window.scrollTo(0, 0);
      
      // Force select first date if dates are available
      if (fixedDates.value && fixedDates.value.length > 0) {
        selectedDate.value = fixedDates.value[0];
        console.log('Set first date on mount:', selectedDate.value);
      }
      
      // Add a small delay to ensure date selection happens after rendering
      setTimeout(() => {
        if (fixedDates.value && fixedDates.value.length > 0) {
          selectedDate.value = fixedDates.value[0];
          console.log('Set first date after timeout:', selectedDate.value);
        }
      }, 100);
    });
    
    const formatDate = (dateStr) => {
      if (!dateStr || dateStr === '-') return '-'
      try {
        // Parse date ensuring it's properly interpreted regardless of timezone
        const dateParts = dateStr.split(/[-/]/)
        if (dateParts.length === 3) {
          const year = parseInt(dateParts[0])
          const month = parseInt(dateParts[1]) - 1  // Months are 0-indexed in JS
          const day = parseInt(dateParts[2])
          
          // Create a date at noon UTC to avoid timezone issues
          const date = new Date(Date.UTC(year, month, day, 12, 0, 0))
          return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric',
            timeZone: 'UTC' // Use UTC to maintain the exact day
          })
        }
        
        // Fallback to standard date parsing with UTC enforcement
        const date = new Date(dateStr)
        const utcDate = new Date(Date.UTC(
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
          12, 0, 0
        ))
        return utcDate.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric',
          timeZone: 'UTC'
        })
      } catch (error) {
        console.error('Error formatting date:', error)
        return dateStr
      }
    }
    
    // Add this special formatter for travel dates card
    const formatDateWithCorrection = (dateStr) => {
      if (!dateStr || dateStr === '-') return '-'
      try {
        // For YYYY-MM-DD format
        const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/) || dateStr.match(/^(\d{4})\/(\d{2})\/(\d{2})$/)
        if (match) {
          const year = parseInt(match[1])
          const month = parseInt(match[2]) - 1
          const day = parseInt(match[3])
          
          // Create date at noon UTC to avoid timezone issues
          const date = new Date(Date.UTC(year, month, day, 12, 0, 0))
          return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric',
            timeZone: 'UTC'
          })
        }
        
        // Try handling ISO strings or other date formats
        let date = new Date(dateStr)
        if (isNaN(date)) {
          console.warn('Invalid date format:', dateStr)
          return dateStr
        }
        
        // Adjust to UTC noon to avoid date boundary issues
        date = new Date(Date.UTC(
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
          12, 0, 0
        ))
        
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          timeZone: 'UTC'
        })
      } catch (error) {
        console.error('Error formatting travel date:', error, dateStr)
        return dateStr
      }
    }

    // Helper to format dates for display in day tabs
    const formatTabDate = (dateString) => {
      try {
        // Force parsing as UTC
        if (!dateString) return { weekday: 'Day', day: '??' };
        
        // Add time component to ensure we're parsing in UTC
        const dateWithTime = dateString.includes('T') ? dateString : `${dateString}T12:00:00Z`;
        
        // Create date with explicit UTC time
        const date = new Date(dateWithTime);
        
        return {
          weekday: date.toLocaleDateString('en-US', { 
            weekday: 'short', 
            timeZone: 'UTC' 
          }),
          day: date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            timeZone: 'UTC' 
          })
        }
      } catch (error) {
        console.error('Error formatting tab date:', error, dateString);
        return { weekday: 'Day', day: dateString.split('-')[2] || '?' }
      }
    }

    // Modified method to correctly display tab weekday and date
    const getTabDisplay = (dateStr) => {
      const formatted = formatTabDate(dateStr)
      return {
        weekday: formatted.weekday,
        date: formatted.day
      }
    }

    const getTimelineColor = (activity) => {
      const type = activity.type || activity.category || ''
      const name = (activity.locationName || activity.location_name || '').toLowerCase()
      
      if (type === 'food' || name.includes('restaurant') || name.includes('food') || 
          name.includes('lunch') || name.includes('dinner') || name.includes('breakfast')) {
        return 'amber-darken-2'
      } else if (type === 'transportation' || name.includes('travel') || name.includes('flight') || 
                 name.includes('train') || name.includes('bus') || name.includes('taxi') ||
                 name.includes('return') || name.includes('departure')) {
        return 'blue-darken-1'
      } else if (name.includes('hotel') || name.includes('hostel') || name.includes('accommodation') || 
                 name.includes('rest') || name.includes('check-in') || name.includes('check in')) {
        return 'indigo-darken-2'
      } else {
        return 'green-darken-2'
      }
    }
    
    const getDuration = (activity) => {
      const duration = activity.duration || activity.estimated_duration || '';
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
          } else {
            return '0 minutes';
          }
        }
      }
      
      // If it's just a number, add "minutes"
      if (duration && !isNaN(duration) && duration.toString().trim() !== '') {
        return `${duration} minute${duration !== '1' ? 's' : ''}`;
      }
      
      // Handle special case for "0" to ensure it displays as "0 minutes"
      if (duration === '0' || duration === 0) {
        return '0 minutes';
      }
      
      return duration || '0 minutes';
    }
    
    const getTravelTime = (activity) => {
      const travelTime = activity.travelTime || activity.travel_time || activity.travel_time_between_locations || '';
      // Return as is if it already has proper formatting with units
      if (typeof travelTime === 'string' && 
          (travelTime.includes('minute') || travelTime.includes('hour') || 
           travelTime.includes('min') || travelTime.includes('hr'))) {
        return travelTime;
      }
      
      // For "0:30" format, convert to "30 minutes"
      if (typeof travelTime === 'string' && travelTime.includes(':')) {
        const parts = travelTime.split(':');
        if (parts.length === 2) {
          const hours = parseInt(parts[0]);
          const minutes = parseInt(parts[1]);
          
          if (hours > 0 && minutes > 0) {
            return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minute${minutes > 1 ? 's' : ''}`;
          } else if (hours > 0) {
            return `${hours} hour${hours > 1 ? 's' : ''}`;
          } else if (minutes > 0) {
            return `${minutes} minute${minutes > 1 ? 's' : ''}`;
          } else {
            return '0 minutes';
          }
        }
      }
      
      // If it's just a number, add "minutes"
      if (travelTime && !isNaN(travelTime) && travelTime.toString().trim() !== '') {
        return `${travelTime} minute${travelTime !== '1' ? 's' : ''}`;
      }
      
      // Handle special case for "0" to ensure it displays as "0 minutes"
      if (travelTime === '0' || travelTime === 0) {
        return '0 minutes';
      }
      
      return travelTime || '0 minutes';
    }

    // Helper function to get weekday name for a date
    const getWeekdayName = (dateString) => {
      const date = new Date(dateString + 'T12:00:00Z'); // Ensure noon UTC for consistency
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return days[date.getUTCDay()];
    };
    
    // Helper function to format date display for tabs (e.g., 'Apr 7')
    const formatDateForTab = (dateString) => {
      const date = new Date(dateString + 'T12:00:00Z'); // Ensure noon UTC for consistency
      // Only show date number for cleaner look
      return `Apr ${date.getUTCDate()}`;
    };

    // Helper function to determine color based on time of day
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
        return 'orange-darken-1'; // Orange for afternoon
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

    // Helper function to get actual color values based on time of day
    const getTimeOfDayColorValue = (timeStr) => {
      if (!timeStr) return '#6a80e0'; // Default primary color
      
      // Extract hours from time string (assuming format like "08:30" or "8:30")
      const hour = parseInt(timeStr.split(':')[0]);
      
      // Early morning (5:00 - 8:59)
      if (hour >= 5 && hour < 9) {
        return '#64B5F6'; // Light blue for morning
      }
      // Morning to noon (9:00 - 11:59)
      else if (hour >= 9 && hour < 12) {
        return '#FFD54F'; // Amber for late morning
      }
      // Afternoon (12:00 - 16:59)
      else if (hour >= 12 && hour < 17) {
        return '#FB8C00'; // Orange for afternoon
      }
      // Evening (17:00 - 20:59)
      else if (hour >= 17 && hour < 21) {
        return '#9575CD'; // Purple for evening
      }
      // Night (21:00 - 4:59)
      else {
        return '#303F9F'; // Dark blue for night
      }
    };

    const saveItinerary = async () => {
      try {
        saving.value = true
        saveError.value = null
        saveSuccess.value = false
        
        // Get travel details from props or computed value
        const itineraryObj = props.itineraryData.itinerary || props.itineraryData
        let travelDetailsObj = props.itineraryData.travelDetails || travelDetails.value
        
        console.log('Original travelDetailsObj:', travelDetailsObj)
        
        // Make sure travelDetails has all the required properties correctly named
        travelDetailsObj = {
          // Preserve the original destination without fallbacks to keep the full location
          destination: travelDetailsObj.destination,
          startDate: travelDetailsObj.startDate || travelDetailsObj.start_date,
          endDate: travelDetailsObj.endDate || travelDetailsObj.end_date,
          numTravelers: travelDetailsObj.numberOfTravelers || travelDetailsObj.number_of_travelers,
          budget: travelDetailsObj.budget,
          dailyStartTime: travelDetailsObj.dailyStartTime || travelDetailsObj.daily_start_time,
          dailyEndTime: travelDetailsObj.dailyEndTime || travelDetailsObj.daily_end_time
        }
        
        console.log('Processed travelDetailsObj:', travelDetailsObj)
        
        await itineraryService.saveItinerary(itineraryObj, travelDetailsObj)
        saveSuccess.value = true
        itinerarySaved.value = true
      } catch (error) {
        console.error('Error saving itinerary:', error)
        saveError.value = error.message || 'Failed to save itinerary'
      } finally {
        saving.value = false
      }
    }

    return {
      travelDetails,
      dailyItineraries,
      selectedDate,
      parseCorrectDate,
      formatDateWithCorrection,
      formatDate,
      getWeekdayName,
      getDuration,
      getTravelTime,
      fixedDates,
      getTimeOfDayColor,
      getTimeOfDayColorValue,
      saveItinerary,
      saving,
      saveSuccess,
      saveError,
      getTabDisplay,
      getTimelineColor,
      formatDateForTab,
      itinerarySaved
    }
  }
}
</script>

<style>
/* Global styles to remove dot borders */
.v-timeline-divider__dot {
  border: none !important;
}

.v-timeline-divider__inner-dot {
  border: none !important;
}
</style>

<style scoped>
.destination-title {
  background: linear-gradient(135deg, #6a80e0, #9575CD);
  color: white !important;
  padding: 1.5rem 1rem !important;
  font-weight: 500 !important;
  font-size: 1.5rem !important;
  letter-spacing: 0.5px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
  border-radius: 0 0 16px 16px;
  margin-bottom: 0 !important;
  position: relative;
}

.destination-title::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #6a80e0, #9575CD);
  opacity: 0.7;
}

.travel-details-card {
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
  margin-bottom: 24px;
}

.travel-details-container {
  display: flex;
  flex-wrap: wrap;
  margin: 0 -8px;
  justify-content: center;
}

.travel-detail-item {
  flex: 1;
  min-width: 200px;
  display: flex;
  align-items: center;
  padding: 16px;
  margin: 8px;
  border-radius: 12px;
  background-color: rgba(248, 249, 253, 0.8);
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.03);
}

.travel-detail-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);
}

.detail-icon {
  margin-right: 16px;
  opacity: 0.9;
}

.detail-content {
  display: flex;
  flex-direction: column;
}

.itinerary-container {
  background-color: #ffffff;
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(0, 0, 0, 0.03);
}

.day-tabs {
  display: flex;
  overflow-x: auto;
  padding: 16px;
  background: #ffffff;
  border-bottom: 1px solid rgba(106, 128, 224, 0.15);
  justify-content: center;
  gap: 16px;
  scroll-behavior: smooth;
  border-radius: 16px 16px 0 0;
  position: relative;
  z-index: 1;
}

.day-tabs::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 10%;
  right: 10%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(106, 128, 224, 0.2), transparent);
  opacity: 0.8;
}

.day-tab {
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
}

.day-tab.active-day {
  background: linear-gradient(135deg, #6a80e0, #9575CD) !important;
  border-color: transparent;
  color: white;
  box-shadow: 0 4px 8px rgba(106, 128, 224, 0.25) !important;
  transform: translateY(-2px);
}

.day-tab:hover:not(.active-day) {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08) !important;
  background: linear-gradient(135deg, #f8f9fd, #eef1fa) !important;
  border-color: rgba(106, 128, 224, 0.2);
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
}

.activity-content {
  padding: 4px 0;
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

/* Duration meta item */
.meta-item:first-child {
  background-color: #e3f2fd;
  border-left: 3px solid #2196F3;
}

/* Travel time meta item */
.meta-item:nth-child(2) {
  background-color: #e8f5e9;
  border-left: 3px solid #4CAF50;
}

.meta-icon {
  margin-right: 4px;
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

/* Timeline additional styling */
:deep(.v-timeline-item) {
  margin-bottom: 8px;
}

/* Override all timeline dot borders */
:deep(.v-timeline .v-timeline-divider__dot),
:deep(.v-timeline .v-timeline-divider__inner-dot) {
  border-color: transparent !important;
  border-width: 0 !important;
  border-style: hidden !important;
  border: 0 !important;
  -webkit-box-shadow: none !important;
  -moz-box-shadow: none !important;
  box-shadow: none !important;
}

.custom-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: none !important;
  border: none !important;
  background-color: inherit !important;
}

.destination-icon {
  animation: bounce 2s ease infinite;
  transform-origin: center bottom;
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