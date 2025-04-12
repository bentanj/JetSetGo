<template>
  <div class="home-container">
    <v-card class="mx-auto" max-width="800">
      <v-card-title class="d-flex justify-space-between align-center pa-4">
        <span class="text-h5 ml-6">Travel Posts</span>
        <v-btn
          color="primary"
          to="/create-post"
          v-if="isAuthenticated"
          class="mr-6"
        >
          Create Post
        </v-btn>
      </v-card-title>

      <v-card-text>
        <Feed />

        <div v-if="!isAuthenticated" class="text-center mt-4">
          <p class="text-body-2 mb-2">Want to create posts?</p>
          <v-btn
            color="primary"
            to="/login"
            class="mr-2"
          >
            Login
          </v-btn>
          <v-btn
            color="secondary"
            to="/register"
          >
            Register
          </v-btn>
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<script>
import authService from '../services/auth';
import Feed from '@/components/Feed.vue';

export default {
  name: 'HomePage',
  components: {
    Feed
  },
  data() {
    return {
      isAuthenticated: false
    };
  },
  created() {
    this.isAuthenticated = authService.isAuthenticated();
  }
};
</script>

<style scoped>
.home-container {
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
}
</style>
  