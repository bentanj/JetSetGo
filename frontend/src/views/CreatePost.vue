<template>
  <div class="create-post-container">
    <v-card class="mx-auto" max-width="800">
      <v-card-title class="text-h5 mb-4">Create New Post</v-card-title>
      <v-card-text>
        <v-form
          ref="postForm"
          @submit.prevent="handleSubmit"
          enctype="multipart/form-data"
        >
          <v-text-field
            v-model="title"
            label="Title"
            :rules="[(v) => !!v || 'Title is required']"
            required
            class="mb-4"
          ></v-text-field>

          <v-textarea
            v-model="content"
            label="Content"
            :rules="[(v) => !!v || 'Content is required']"
            required
            rows="6"
            class="mb-4"
          ></v-textarea>

          <v-file-input
            v-model="image"
            label="Upload Image"
            accept="image/*"
            prepend-icon="mdi-camera"
            class="mb-4"
          ></v-file-input>

          <v-img
            v-if="imagePreview"
            :src="imagePreview"
            max-height="200"
            contain
            class="mb-4"
          ></v-img>
          <v-select
            v-model="selectedPreferences"
            :items="preferences"
            label="Select Tags"
            multiple
            chips
            clearable
            class="mb-4"
          />
          <div class="mb-4">
            <input
              v-model="searchQuery"
              @keydown.enter.prevent="searchLocation"
              placeholder="Search for a place..."
              class="search-input"
            />
          </div>
          <div class="map-container" ref="myMap"></div>
          <p v-if="selectedLocation">
            Selected: {{ selectedLocation.address }}
          </p>
          <v-btn
            color="primary"
            type="submit"
            :loading="loading"
            :disabled="loading"
            block
            class="mb-2"
          >
            {{ loading ? "Creating Post..." : "Create Post" }}
          </v-btn>

          <v-alert v-if="error" type="error" class="mt-4">
            {{ error }}
          </v-alert>

          <v-alert v-if="success" type="success" class="mt-4">
            Post created successfully!
          </v-alert>
        </v-form>
      </v-card-text>
    </v-card>
  </div>
</template>

<script>
import authService from "../services/auth";
import maplibre from "maplibre-gl";

export default {
  name: "CreatePost",
  data() {
    return {
      title: "",
      content: "",
      image: null,
      imagePreview: null,
      loading: false,
      error: null,
      success: false,
      preferences: [],
      selectedPreferences: [],
      location: "",
      map: null,
      marker: null,
      selectedLocation: null,
      searchQuery: "",
      myAPIKey: process.env.VUE_APP_GEOAPIFY_API_KEY,
    };
  },
  created() {
    this.fetchPreferences();
  },
  watch: {
    image(file) {
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          this.imagePreview = e.target.result;
        };
        reader.readAsDataURL(file);
      } else {
        this.imagePreview = null;
      }
    },
  },
  mounted() {
    const mapStyle = "https://maps.geoapify.com/v1/styles/osm-carto/style.json";

    this.map = new maplibre.Map({
      container: this.$refs.myMap,
      style: `${mapStyle}?apiKey=${this.myAPIKey}`,
      center: [0, 20],
      zoom: 2,
    });

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          this.map.setCenter([longitude, latitude]);
          this.map.setZoom(12);
        },
        (err) => {
          console.warn("Geolocation failed:", err.message);
        }
      );
    }

    this.map.on("click", (e) => {
      const { lng, lat } = e.lngLat;

      (async () => {
        const res = await fetch(
          `https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lng}&apiKey=${this.myAPIKey}`
        );
        const data = await res.json();

        const address =
          data.features[0]?.properties.formatted || "Unknown location";

        if (this.marker) {
          this.marker.setLngLat([lng, lat]);
          this.marker.getPopup().setText(address);
        } else {
          const popup = new maplibre.Popup().setText(address);
          this.marker = new maplibre.Marker()
            .setLngLat([lng, lat])
            .setPopup(popup)
            .addTo(this.map);
        }

        this.selectedLocation = { lat, lon: lng, address };
      })();
    });
  },
  methods: {
    async fetchPreferences() {
      try {
        const token = authService.getToken();
        if (!token) {
          this.$router.push("/login");
          return;
        }

        const response = await fetch(
          `http://localhost:8000/api/user/taste-preferences`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch preferences");
        }

        const data = await response.json();
        const tastePreferences = data.taste_preferences || {};
        this.preferences = [];

        // Add travel styles
        if (Array.isArray(tastePreferences.travel_style)) {
          this.preferences = this.preferences.concat(tastePreferences.travel_style);
        }

        // Add tourist sites
        if (Array.isArray(tastePreferences.tourist_sites)) {
          this.preferences = this.preferences.concat(tastePreferences.tourist_sites);
        }

        // Add diet preference if it exists and is an array
        if (Array.isArray(tastePreferences.diet) && tastePreferences.diet.length > 0) {
          // Only add diet if it's not "None"
          const dietPreferences = tastePreferences.diet.filter(diet => diet !== 'None');
          if (dietPreferences.length > 0) {
            this.preferences = this.preferences.concat(dietPreferences);
          }
        }

      } catch (err) {
        console.error("Failed to load preferences:", err.message);
        this.preferences = []; 
      }
    },

    async searchLocation() {
      if (!this.searchQuery) return;

      const response = await fetch(
        `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(
          this.searchQuery
        )}&apiKey=${this.myAPIKey}`
      );
      const data = await response.json();

      if (data.features.length > 0) {
        const feature = data.features[0];
        const { lat, lon } = feature.properties;

        this.map.setCenter([lon, lat]);
        this.map.setZoom(12);

        // Update marker
        if (this.marker) {
          this.marker.setLngLat([lon, lat]);
          this.marker
            .setPopup(
              new maplibre.Popup().setText(feature.properties.formatted)
            )
            .addTo(this.map);
        } else {
          this.marker = new maplibre.Marker()
            .setLngLat([lon, lat])
            .setPopup(
              new maplibre.Popup().setText(feature.properties.formatted)
            )
            .addTo(this.map);
        }

        this.selectedLocation = {
          lat,
          lon,
          address: feature.properties.formatted,
        };
      }
    },

    async handleSubmit() {
      this.loading = true;
      this.error = null;
      this.success = false;

      try {
        const token = authService.getToken();
        if (!token) {
          this.$router.push("/login");
          return;
        }

        // Create FormData object
        const formData = new FormData();
        formData.append("title", this.title);
        formData.append("content", this.content);
        formData.append(
          "selected_preferences",
          this.selectedPreferences.join(",")
        );
        if (this.selectedLocation?.address) {
          formData.append("location", this.selectedLocation.address);
        }
        if (this.image) {
          formData.append("image", this.image);
        }

        const response = await fetch("http://localhost:8000/api/cposts", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to create post");
        }

        this.success = true;

        // Clear form
        this.title = "";
        this.content = "";
        this.image = null;
        this.imagePreview = null;

        this.$nextTick(() => {
          this.$refs.postForm.resetValidation();
        });

        // Redirect to home page after a short delay
        setTimeout(() => {
          this.$router.push("/home");
        }, 1000);
      } catch (err) {
        this.error = err.message;
        if (err.message.includes("token")) {
          // If token is invalid, redirect to login
          this.$router.push("/login");
        }
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>

<style scoped>
@import "~maplibre-gl/dist/maplibre-gl.css";

.map-container {
  height: 400px;
  width: 100%;
}

.create-post-container {
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
}

.search-input {
  width: 100%;
  padding: 8px 12px;
  font-size: 16px;
  border-radius: 8px;
  border: 1px solid #ccc;
}
</style>
