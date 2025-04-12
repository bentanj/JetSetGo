<template>
  <div class="user-profile">
    <v-container>
      <v-row>
        <v-col cols="12" class="text-center">
          <h2 class="text-h4 mb-2">
            {{ isOwnProfile ? 'Your Profile' : username }}
          </h2>
          <p class="text-subtitle-1">{{ posts.length }} {{ posts.length === 1 ? 'post' : 'posts' }}</p>
        </v-col>
      </v-row>

      <v-row v-if="loading">
        <v-col cols="12" class="text-center">
          <v-progress-circular indeterminate color="primary"></v-progress-circular>
        </v-col>
      </v-row>

      <v-row v-else-if="error === 'User not found'">
        <v-col cols="12" class="text-center">
          <v-alert type="error">{{ error }}</v-alert>
        </v-col>
      </v-row>

      <v-row v-else-if="posts.length === 0">
        <v-col cols="12" class="text-center">
          <v-alert type="info" class="no-posts-alert">
            This user hasn't posted anything yet
          </v-alert>
        </v-col>
      </v-row>

      <v-row v-else>
        <v-col cols="12" v-for="post in posts" :key="post.id">
          <div class="post-container">
            <post :post="post" @like-post="handleLike" @comment-post="handleComment" />
            <v-btn
              v-if="isOwnProfile"
              icon
              color="error"
              size="small"
              class="delete-post-btn"
              @click="handleDeletePost(post.id)"
            >
              <v-icon>mdi-delete</v-icon>
            </v-btn>
          </div>
        </v-col>
      </v-row>
      <!-- Delete Account Section -->
      <v-row v-if="isOwnProfile" class="mt-8">
        <v-col cols="12" class="text-center">
          <v-dialog v-model="showDeleteDialog" max-width="400">
            <template v-slot:activator="{ props }">
              <v-btn
                color="error"
                variant="outlined"
                v-bind="props"
                class="delete-account-btn"
              >
                Delete Account
              </v-btn>
            </template>

            <v-card>
              <v-card-title class="text-h5 pa-4">
                Delete Account
              </v-card-title>
              <v-card-text class="pa-4">
                Are you sure you want to delete your account? This action cannot be undone and you will lose all your data including posts, saved itineraries, and preferences.
              </v-card-text>
              <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn
                  color="grey-darken-1"
                  variant="text"
                  @click="showDeleteDialog = false"
                >
                  Cancel
                </v-btn>
                <v-btn
                  color="error"
                  variant="tonal"
                  @click="handleDeleteAccount"
                >
                  Delete Account
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-dialog>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script>
import Post from '@/components/Post.vue';
import authService from '@/services/auth';
import defaultAvatar from '@/assets/opm.jpg';

export default {
  name: 'ViewProfile',
  components: {
    Post,
  },
  data() {
    return {
      userId: null,
      username: '',
      posts: [],
      error: null,
      loading: true,
      showDeleteDialog: false,
      userAvatar: defaultAvatar,
      isOwnProfile: false, 
    };
  },
  created() {
    this.userId = this.$route.params.id;
    // Set username from query parameter immediately
    this.username = decodeURIComponent(this.$route.query.username || '');
    this.isOwnProfile = this.userId === authService.getCurrentUser()?.id;
    this.fetchUserPosts();
  },
  watch: {
    '$route.params.id': function (newId) {
      this.userId = newId;
      this.fetchUserPosts();
    },
  },
  methods: {
    async fetchUserPosts() {
      try {
        this.loading = true;
        const response = await fetch(`http://localhost:8000/api/posts/user/${this.userId}`, {
          headers: {
            Authorization: `Bearer ${authService.getToken()}`,
          },
        });

        if (!response.ok) {
          if (response.status === 404) {
            this.error = 'User not found';
          } else {
            this.error = 'Failed to fetch user posts';
          }
          return;
        }

        const data = await response.json();
        this.posts = data.posts;
      } catch (err) {
        this.error = err.message;
        if (err.message.includes('token')) {
          this.$router.push('/login');
        }
      } finally {
        this.loading = false;
      }
    },
    async handleDeletePost(postId) {
      if (!confirm('Are you sure you want to delete this post?')) {
        return;
      }

      try {
        const token = authService.getToken();
        console.log('Attempting to delete post:', postId);
        
        // First, delete all social interactions (likes and comments) through Kong
        const socialResponse = await fetch(`http://localhost:8000/api/social/posts`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ post_id: postId })
        });

        if (!socialResponse.ok) {
          throw new Error('Failed to delete post social data');
        }

        console.log('Social data deleted successfully, now deleting post...');
        // Then, delete the post itself through Kong
        const postResponse = await fetch(`http://localhost:8000/api/posts`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ post_id: postId })
        });

        if (!postResponse.ok) {
          const errorData = await postResponse.json();
          console.error('Server error:', errorData);
          throw new Error('Failed to delete post');
        }

        console.log('Post deleted successfully');
        // Remove the deleted post from the list
        this.posts = this.posts.filter(post => post.id !== postId);
      } catch (err) {
        console.error('Error deleting post:', err);
        alert('Failed to delete post. Please try again.');
      }
    },
    async handleDeleteAccount() {
      try {
        // Close the dialog first for better UX
        this.showDeleteDialog = false;
        this.loading = true;
        this.error = null;

        // Log current user info for debugging
        const currentUser = authService.getCurrentUser();
        console.log('Current user:', currentUser);

        // Call the delete user endpoint
        await authService.deleteUser();
        
        // Show success message before redirect
        alert('Your account has been successfully deleted.');
        
        // On successful deletion, user is already logged out by authService
        // Redirect to home page
        this.$router.push('/');
      } catch (error) {
        console.error('Error deleting account:', error);
        // Show error message to user
        alert('Failed to delete account. Please try again.');
      } finally {
        this.loading = false;
      }
    },
    handleLike(postId) {
      console.log('Liking post:', postId);
    },
    handleComment(postId) {
      console.log('Commenting on post:', postId);
    },
  },
};
</script>

<style scoped>
.user-profile {
  padding: 2rem 0;
  max-width: 800px;
  margin: 0 auto;
}

.v-avatar {
  border: 3px solid #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.post-grid {
  display: grid;
  gap: 2rem;
  padding: 2rem 0;
}

.post-container {
  position: relative;
}

.delete-post-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 1;
  background-color: rgba(255, 255, 255, 0.8);
  border-radius: 50%;
}

.delete-account-btn {
  margin-top: 2rem;
  text-transform: none;
  font-weight: 500;
}

.no-posts-alert {
  background-color: #f5f5f5 !important;
  color: #666 !important;
  border: none !important;
}

.delete-post-btn:hover {
  background-color: rgba(255, 255, 255, 0.9);
}
</style>