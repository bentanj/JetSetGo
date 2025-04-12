<template>
  <ItineraryDisplay :itineraryData="itineraryData" />
</template>

<script>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import ItineraryDisplay from './ItineraryDisplay.vue'

export default {
  name: 'ItineraryPage',
  components: {
    ItineraryDisplay
  },
  setup() {
    const router = useRouter()
    const itineraryData = ref(null)

    onMounted(() => {
      try {
        console.log('ItineraryPage mounted, checking for data...')
        
        // Get data from sessionStorage
        const storedData = sessionStorage.getItem('itineraryData')
        console.log('Raw stored data:', storedData ? storedData.substring(0, 100) + '...' : 'null')
        
        if (storedData) {
          try {
            const parsedData = JSON.parse(storedData)
            console.log('Parsed itinerary data structure:', {
              hasItinerary: !!parsedData.itinerary,
              hasTravelDetails: !!parsedData.travelDetails || !!parsedData.travel_details,
              keys: Object.keys(parsedData)
            })
            
            // Transform data format if needed
            let processedData = parsedData
            
            // If we have raw dates at the top level, restructure to expected format
            const dateLikeKeys = Object.keys(parsedData).filter(key => 
              key.match(/^\d{4}-\d{2}-\d{2}$/) || 
              key.match(/^\d{4}\/\d{2}\/\d{2}$/)
            )
            
            if (dateLikeKeys.length > 0) {
              console.log('Found date-like keys at top level, restructuring data...')
              
              // Extract travel details
              const travelDetails = parsedData.travel_details || parsedData.travelDetails || {}
              
              // Create restructured object
              processedData = {
                travelDetails: travelDetails,
                itinerary: {}
              }
              
              // Copy date entries to itinerary
              dateLikeKeys.forEach(dateKey => {
                processedData.itinerary[dateKey] = parsedData[dateKey]
              })
            }
            
            itineraryData.value = processedData
            console.log('Processed itinerary data:', itineraryData.value)
          } catch (error) {
            console.error('Error parsing stored itinerary data:', error)
            // If there's an error, redirect back to the form
            router.push('/travel-planner')
          }
        } else {
          console.log('No stored itinerary data found, redirecting to form')
          router.push('/travel-planner')
        }
      } catch (error) {
        console.error('Error in ItineraryPage setup:', error)
        router.push('/travel-planner')
      }
    })

    return {
      itineraryData
    }
  }
}
</script> 