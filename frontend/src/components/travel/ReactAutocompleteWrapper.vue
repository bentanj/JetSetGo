<template>
  <div ref="container"></div>
</template>

<script>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import { ReactAutocomplete } from './ReactAutocomplete';

export default {
  name: 'ReactAutocompleteWrapper',
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
  setup(props, { emit }) {
    const container = ref(null);
    let root = null;

    onMounted(() => {
      if (container.value) {
        // Create root with a delay to ensure DOM is ready
        setTimeout(() => {
          try {
            root = ReactDOM.createRoot(container.value);
            
            const handleSelect = (data) => {
              emit('update:modelValue', data ? data.properties.formatted : '');
              emit('place-selected', data);
            };
            
            root.render(
              React.createElement(ReactAutocomplete, {
                onSelect: handleSelect,
                placeholder: props.placeholder
              })
            );
          } catch (error) {
            console.error('Error rendering React component:', error);
          }
        }, 0);
      }
    });

    onBeforeUnmount(() => {
      if (root) {
        try {
          root.unmount();
        } catch (error) {
          console.error('Error unmounting React component:', error);
        }
      }
    });

    return {
      container
    };
  }
};
</script>

<style>
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
  color: rgba(var(--v-theme-on-surface), 0.6);
  cursor: pointer;
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  height: 24px;
  width: 24px;
  display: none;
  align-items: center;
  justify-content: center;
  transition: color 0.2s ease;
  z-index: 1001;
}

.clear-button.visible {
  display: flex;
}

.clear-button:hover {
  color: rgba(var(--v-theme-on-surface), 0.87);
}
</style> 