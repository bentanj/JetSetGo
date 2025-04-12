<template>
  <div class="itinerary-wrapper">
    <ItineraryPage />
  </div>
</template>

<script>
import ItineraryPage from '@/components/travel/ItineraryPage.vue'

export default {
  name: 'ItineraryView',
  components: {
    ItineraryPage
  }
}
</script>

<style scoped>
.itinerary-wrapper {
  width: 100%;
  min-height: 100vh;
}
</style> 