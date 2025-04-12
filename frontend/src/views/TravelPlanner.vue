<template>
  <div class="travel-planner">
    <TravelForm />
  </div>
</template>

<script>
import TravelForm from '@/components/travel/TravelForm.vue'

export default {
  name: 'TravelPlannerView',
  components: {
    TravelForm
  }
}
</script>

<style scoped>
.travel-planner {
  width: 100%;
  min-height: 100vh;
}
</style> 