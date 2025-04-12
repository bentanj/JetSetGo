<template>
  <div class="autocomplete-container">
    <input
      type="text"
      :placeholder="placeholder"
      v-model="inputValue"
      @input="handleInput"
      @keydown="handleKeyDown"
    />
    <button 
      v-if="showClear" 
      class="clear-button visible" 
      @click="handleClear"
    >
      ✕
    </button>
    <div v-if="items.length > 0" class="autocomplete-items">
      <div
        v-for="(item, index) in items"
        :key="index"
        :class="{ 'autocomplete-active': index === focusedIndex }"
        @click="handleSelect(item)"
      >
        {{ item.properties.formatted }}
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'GeoAutoComplete',
  props: {
    modelValue: {
      type: String,
      default: ''
    },
    placeholder: {
      type: String,
      default: 'Enter an address here'
    }
  },
  emits: ['update:modelValue', 'place-selected'],
  data() {
    return {
      inputValue: this.modelValue,
      items: [],
      focusedIndex: -1,
      showClear: false,
      timeoutId: null
    };
  },
  methods: {
    async handleInput() {
      const value = this.inputValue;

      if (!value) {
        this.showClear = false;
        this.items = [];
        return;
      }

      this.showClear = true;

      // Clear existing timeout
      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
      }

      // Debounce API call
      this.timeoutId = setTimeout(async () => {
        try {
          // Using the environment variable for the API key
          const apiKey = process.env.VUE_APP_GEOAPIFY_API_KEY;
          const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(value)}&limit=5&apiKey=${apiKey}`;
          
          const response = await fetch(url);
          if (response.ok) {
            const data = await response.json();
            this.items = data.features || [];
          }
        } catch (err) {
          console.error('Error fetching locations:', err);
        }
      }, 300);
    },
    
    handleKeyDown(e) {
      if (!this.items.length) return;

      if (e.keyCode === 40) { // Down arrow
        e.preventDefault();
        this.focusedIndex = this.focusedIndex < this.items.length - 1 ? this.focusedIndex + 1 : 0;
      } else if (e.keyCode === 38) { // Up arrow
        e.preventDefault();
        this.focusedIndex = this.focusedIndex > 0 ? this.focusedIndex - 1 : this.items.length - 1;
      } else if (e.keyCode === 13 && this.focusedIndex > -1) { // Enter
        e.preventDefault();
        this.handleSelect(this.items[this.focusedIndex]);
      }
    },
    
    handleSelect(item) {
      if (item) {
        this.inputValue = item.properties.formatted;
        this.$emit('update:modelValue', item.properties.formatted);
        this.$emit('place-selected', item);
      }
      this.items = [];
      this.focusedIndex = -1;
    },
    
    handleClear(e) {
      e.stopPropagation();
      this.inputValue = '';
      this.$emit('update:modelValue', '');
      this.$emit('place-selected', null);
      this.showClear = false;
      this.items = [];
      this.focusedIndex = -1;
    }
  },
  created() {
    // Add click outside listener
    document.addEventListener('click', (e) => {
      if (!this.$el.contains(e.target)) {
        this.items = [];
        this.focusedIndex = -1;
      }
    });
  },
  beforeUnmount() {
    document.removeEventListener('click', this.handleClickOutside);
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
  }
};
</script>

<style scoped>
.autocomplete-container {
  position: relative;
  width: 100%;
  z-index: 1000;
}

.autocomplete-container input {
  width: 100%;
  height: 56px;
  outline: none;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  padding: 0 16px;
  padding-right: 40px;
  font-size: 1rem;
  border-radius: 12px;
  transition: all 0.2s ease;
  background: rgb(var(--v-theme-surface));
  color: rgba(var(--v-theme-on-surface), 0.87);
}

.autocomplete-container input:hover {
  border-color: rgba(var(--v-theme-on-surface), 0.24);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.autocomplete-container input:focus {
  border-color: rgb(var(--v-theme-primary));
  border-width: 2px;
  padding: 0 15px;
  padding-right: 39px;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.autocomplete-items {
  position: absolute;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-radius: 12px;
  z-index: 1000;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: rgb(var(--v-theme-surface));
  overflow: hidden;
  max-height: 300px;
  overflow-y: auto;
}

.autocomplete-items div {
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  font-size: 1rem;
  line-height: 1.5;
  color: rgba(var(--v-theme-on-surface), 0.87);
}

.autocomplete-items div:not(:last-child) {
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.06);
}

.autocomplete-items div:hover {
  background-color: rgba(var(--v-theme-primary), 0.08);
}

.autocomplete-items .autocomplete-active {
  background-color: rgba(var(--v-theme-primary), 0.12);
  color: rgb(var(--v-theme-primary));
}

.clear-button {
  background: transparent;
  border: none;
  color: rgba(var(--v-theme-on-surface), 0.6);
  cursor: pointer;
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  height: 24px;
  width: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s ease;
  z-index: 1001;
}

.clear-button:hover {
  color: rgba(var(--v-theme-on-surface), 0.87);
}
</style> 