<template>
    <form @submit.prevent="submitPreferences">
      <div class="form-container">
        <h1 class="title">Welcome!</h1>
        <p class="description">
          Before you begin your travel planning journey, we would greatly appreciate receiving your preferences to optimize your future itineraries to your liking! You may select more than one option in the first three questions.
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
              <option v-for="hour in hours" :key="hour" :value="hour">
                {{ hour.toString().padStart(2, '0') }}
              </option>
            </select>
            <span class="time-separator">:</span>
            <select 
              v-model="startMinute"
              class="time-select minute-select"
              :class="{ 'required-warning': triedSubmit && !form.start_time }">
              <option value="" disabled>MM</option>
              <!-- Only 00 and 30 available -->
              <option v-for="minute in minutes" :key="minute" :value="minute">
                {{ minute.toString().padStart(2, '0') }}
              </option>
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
              <!-- Only show end hours that are greater than startHour -->
              <option v-for="hour in availableEndHours" :key="hour" :value="hour">
                {{ hour.toString().padStart(2, '0') }}
              </option>
            </select>
            <span class="time-separator">:</span>
            <select 
              v-model="endMinute"
              class="time-select minute-select"
              :class="{ 'required-warning': triedSubmit && !form.end_time }">
              <option value="" disabled>MM</option>
              <!-- Only 00 and 30 available -->
              <option v-for="minute in minutes" :key="minute" :value="minute">
                {{ minute.toString().padStart(2, '0') }}
              </option>
            </select>
          </div>
        </div>
  
        <!-- Submit -->
        <div class="form-section">
          <button type="submit">Submit Preferences</button>
        </div>
      </div>
    </form>
  </template>
  
  <script>
  import Multiselect from 'vue-multiselect'
  import 'vue-multiselect/dist/vue-multiselect.min.css'
  import authService from '@/services/auth'
  
  export default {
    components: {
      Multiselect
    },
    data() {
      return {
        form: {
          travel_style: [],
          tourist_sites: [],
          diet: [],  
          start_time: '',
          end_time: ''
        },
        triedSubmit: false,
        travelStyles: [
          'Adventure',
          'Solo',
          'Family',
          'Shopping',
          'Relaxation'
        ],
        touristSites: [
          'Nature Sites',
          'Cultural Sites',
          'Leisure Attractions',
          'Sports Activities'
        ],
        dietOptions: ['None', 'Halal', 'Vegetarian', 'Kosher'],
        // Hours starting from 7am (7) to 23 (11pm)
        hours: Array.from({ length: 17 }, (_, i) => i + 7),
        // Minutes restricted to 0 and 30
        minutes: [0, 30],
        startHour: '',
        startMinute: '',
        endHour: '',
        endMinute: ''
      }
    },
    computed: {
      // Filter available end hours: only hours greater than the selected startHour.
      availableEndHours() {
        if (this.startHour === '' || isNaN(Number(this.startHour))) {
          return this.hours;
        }
        return this.hours.filter(hour => Number(hour) > Number(this.startHour));
      }
    },
    watch: {
      startHour() {
        this.updateStartTime()
      },
      startMinute() {
        this.updateStartTime()
      },
      endHour() {
        this.updateEndTime()
      },
      endMinute() {
        this.updateEndTime()
      },
      'form.diet': {
        handler(newVal) {
          // Ensure diet is always an array with max 1 item
          if (!Array.isArray(newVal)) {
            this.form.diet = newVal ? [newVal] : [];
          } else if (newVal.length > 1) {
            // Keep only the most recently added item
            this.form.diet = [newVal[newVal.length - 1]];
          }
        },
        immediate: true
      }
    },
    methods: {
      updateStartTime() {
        if (this.startHour !== '' && this.startMinute !== '') {
          const hour = this.startHour.toString().padStart(2, '0')
          const minute = this.startMinute.toString().padStart(2, '0')
          this.form.start_time = `${hour}:${minute}`
        } else {
          this.form.start_time = ''
        }
      },
      updateEndTime() {
        if (this.endHour !== '' && this.endMinute !== '') {
          const hour = this.endHour.toString().padStart(2, '0')
          const minute = this.endMinute.toString().padStart(2, '0')
          this.form.end_time = `${hour}:${minute}`
        } else {
          this.form.end_time = ''
        }
      },
      async submitPreferences() {
        try {
          this.triedSubmit = true;
          // Ensure no fields are empty
          if (!this.form.travel_style.length) {
            alert('Please select at least one travel style');
            return;
          }
          if (!this.form.tourist_sites.length) {
            alert('Please select at least one attraction');
            return;
          }
          if (!this.form.diet.length) {
            alert('Please select a dietary restriction');
            return;
          }
          if (!this.form.start_time) {
            alert('Please select a start time');
            return;
          }
          if (!this.form.end_time) {
            alert('Please select an end time');
            return;
          }
  
          // Show loading state on the submit button.
          const button = document.querySelector('button[type="submit"]');
          const originalText = button.textContent;
          button.textContent = 'Creating profile...';
          button.disabled = true;
  
          try {
            // Create user profile with preferences.
            await authService.createUserProfile(this.form);
            // Update first login status.
            await authService.updateFirstLoginStatus();
            this.$router.push('/home');
          } catch (error) {
            console.error('Error submitting preferences:', error);
            alert(error.message || 'Failed to create user profile. Please try again.');
          } finally {
            // Reset button state.
            button.textContent = originalText;
            button.disabled = false;
          }
        } catch (error) {
          console.error('Unexpected error:', error);
          alert('An unexpected error occurred. Please try again.');
        }
      }
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