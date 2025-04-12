<template>
  <div class="form-container">
    <h1 class="title">Edit Your Preferences</h1>
    <p class="description">
      Update your travel preferences to help us customize your travel experiences better!
    </p>

    <!-- Travel Style -->
    <div class="form-section">
      <label>What is your preferred travelling style?</label>
      <Multiselect
        v-model="form.travel_style"
        :options="travelStyles"
        placeholder="Select your travel style"
        multiple
        :class="{ 'required-warning': triedSubmit && !form.travel_style.length }"
      />
    </div> 

    <!-- Tourist Sites -->
    <div class="form-section">
      <label>What attractions do you prefer to visit?</label>
      <Multiselect
        v-model="form.tourist_sites"
        :options="touristSites"
        placeholder="Select preferred sites"
        multiple
        :class="{ 'required-warning': triedSubmit && !form.tourist_sites.length }"
      />
    </div>

    <!-- Dietary Restrictions -->
    <div class="form-section">
      <label>What dietary restrictions do you have?</label>
      <Multiselect
        v-model="form.diet"
        :options="dietOptions"
        placeholder="Select dietary restriction"
        :multiple="true"
        :max="1"
        :hideSelected="true"
        @select="val => form.diet = [val]"
        @remove="() => form.diet = []"
        :class="{ 'required-warning': triedSubmit && !form.diet.length }"
      />
    </div>

    <!-- Start Time - 24hr format -->
    <div class="form-section">
      <label>What time do you prefer starting your day? (24-hour format)</label>
      <div class="time-input-wrapper">
        <select 
          v-model="startHour"
          class="time-select hour-select"
          :class="{ 'required-warning': triedSubmit && !form.start_time }">
          <option value="" disabled>HH</option>
          <option v-for="hour in hours" :key="hour" :value="hour">{{ hour.toString().padStart(2, '0') }}</option>
        </select>
        <span class="time-separator">:</span>
        <select 
          v-model="startMinute"
          class="time-select minute-select"
          :class="{ 'required-warning': triedSubmit && !form.start_time }">
          <option value="" disabled>MM</option>
          <option v-for="minute in minutes" :key="minute" :value="minute">{{ minute.toString().padStart(2, '0') }}</option>
        </select>
      </div>
    </div>

    <!-- End Time - 24hr format -->
    <div class="form-section">
      <label>What time do you prefer your day to end? (24-hour format)</label>
      <div class="time-input-wrapper">
        <select 
          v-model="endHour"
          class="time-select hour-select"
          :class="{ 'required-warning': triedSubmit && !form.end_time }">
          <option value="" disabled>HH</option>
          <option v-for="hour in availableEndHours" :key="hour" :value="hour">{{ hour.toString().padStart(2, '0') }}</option>
        </select>
        <span class="time-separator">:</span>
        <select
          v-model="endMinute"
          class="time-select minute-select"
          :class="{ 'required-warning': triedSubmit && !form.end_time }">
          <option value="" disabled>MM</option>
          <option v-for="minute in minutes" :key="minute" :value="minute">{{ minute.toString().padStart(2, '0') }}</option>
        </select>
      </div>
    </div>

    <!-- Submit -->
    <div class="form-section">
      <button @click="updatePreferences">Update Preferences</button>
    </div>
  </div>
</template>

<script>
import authService from '@/services/auth';
import "vue-select/dist/vue-select.css";
import Multiselect from 'vue-multiselect'
import 'vue-multiselect/dist/vue-multiselect.min.css'
import { ref, reactive, watch, onMounted, computed } from 'vue'

export default {
  name: 'PreferencesEditor',
  components: {
    Multiselect
  },
  setup() {
    const triedSubmit = ref(false);
    const startHour = ref('');
    const startMinute = ref('');
    const endHour = ref('');
    const endMinute = ref('');

    const form = reactive({
      travel_style: [],
      tourist_sites: [],
      diet: [],  
      start_time: '',
      end_time: ''
    });

    // Hours starting from 7am (7) to 23 (11pm)
    const hours = Array.from({ length: 17 }, (_, i) => i + 7);
    const minutes = [0, 30];  // Only allow 00 and 30 minutes

    const availableEndHours = computed(() => {
      if (startHour.value === '' || isNaN(Number(startHour.value))) {
        return hours;
      }
      return hours.filter(hour => Number(hour) > Number(startHour.value));
    });

    // Reset end time if start hour changes and end hour is no longer valid
    watch(startHour, () => {
      if (endHour.value !== '' && Number(endHour.value) <= Number(startHour.value)) {
        endHour.value = '';
        endMinute.value = '';
      }
    });

    const travelStyles = ['Adventure', 'Solo', 'Family', 'Shopping', 'Relaxation'];
    const touristSites = ['Nature Sites', 'Cultural Sites', 'Leisure Attractions', 'Sports Activities'];
    const dietOptions = ['None', 'Halal', 'Vegetarian', 'Kosher'];

    watch([startHour, startMinute], () => {
      if (startHour.value !== '' && startMinute.value !== '') {
        const hour = startHour.value.toString().padStart(2, '0');
        const minute = startMinute.value.toString().padStart(2, '0');
        form.start_time = `${hour}:${minute}`;
      } else {
        form.start_time = '';
      }
    });

    watch([endHour, endMinute], () => {
      if (endHour.value !== '' && endMinute.value !== '') {
        const hour = endHour.value.toString().padStart(2, '0');
        const minute = endMinute.value.toString().padStart(2, '0');
        form.end_time = `${hour}:${minute}`;
      } else {
        form.end_time = '';
      }
    });

    // Ensure diet is always an array with max 1 item
    watch(() => form.diet, (newVal) => {
      if (!Array.isArray(newVal)) {
        form.diet = newVal ? [newVal] : [];
      } else if (newVal.length > 1) {
        // Keep only the most recently added item
        form.diet = [newVal[newVal.length - 1]];
      }
    }, { immediate: true });

    const loadPreferences = async () => {
      try {
        const preferences = await authService.getUserPreferences();
        if (preferences) {
          form.travel_style = preferences.travel_style || [];
          form.tourist_sites = preferences.tourist_sites || [];
          form.diet = preferences.diet || [];
          
          if (preferences.start_time) {
            const [hour, minute] = preferences.start_time.split(':');
            startHour.value = parseInt(hour);
            startMinute.value = parseInt(minute);
          }
          
          if (preferences.end_time) {
            const [hour, minute] = preferences.end_time.split(':');
            endHour.value = parseInt(hour);
            endMinute.value = parseInt(minute);
          }
        }
      } catch (err) {
        console.error('Error fetching preferences:', err);
        alert('Error loading your preferences');
      }
    };

    const updatePreferences = async () => {
      triedSubmit.value = true;

      if (
        !form.travel_style.length ||
        !form.tourist_sites.length ||
        !form.diet.length ||
        !form.start_time ||
        !form.end_time
      ) {
        alert('Please fill in all required fields');
        return;
      }

      try {
        await authService.updateUserProfile({
          travel_style: form.travel_style,
          tourist_sites: form.tourist_sites,
          diet: form.diet,
          start_time: form.start_time,
          end_time: form.end_time
        });
        alert('Preferences updated successfully!');
      } catch (err) {
        console.error('Error updating preferences:', err);
        alert('Error updating preferences');
      }
    };

    onMounted(() => {
      loadPreferences();
    });

    return {
      availableEndHours,
      form,
      triedSubmit,
      startHour,
      startMinute,
      endHour,
      endMinute,
      hours,
      minutes,
      travelStyles,
      touristSites,
      dietOptions,
      updatePreferences
    };
  }
}
</script>

<style>
.form-container {
  max-width: 650px;
  margin: 40px auto;
  background: #fff;
  padding: 2rem;
  border-radius: 1rem;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  font-family: "Segoe UI", sans-serif;
  color: black;
}

h1.title {
  text-align: center;
  margin-bottom: 1rem;
  color: #ff4b2b;
}

p.description {
  text-align: center;
  margin-bottom: 2rem;
  color: #333;
}

.form-section {
  margin-bottom: 1.5rem;
}

label {
  display: block;
  font-weight: bold;
  margin-bottom: 0.5rem;
}

.time-input-wrapper {
  display: flex;
  align-items: center;
}

.time-select {
  padding: 0.4rem;
  border-radius: 0.3rem;
  border: 1px solid #ccc;
  background-color: rgba(255, 255, 255, 0.801);
  color: black;
}

.hour-select,
.minute-select {
  width: 80px;
  text-align: center;
}

.time-separator {
  margin: 0 10px;
  font-weight: bold;
  font-size: 18px;
}

button {
  background-color: #ff4b2b;
  color: white;
  padding: 0.7rem 1.2rem;
  border: none;
  border-radius: 0.4rem;
  cursor: pointer;
  font-weight: bold;
}

button:hover {
  background-color: #e43e1b;
}

.required-warning {
  border: 1px solid #ff4b2b !important;
}
</style>