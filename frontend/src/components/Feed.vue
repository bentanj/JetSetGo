<template>
  <div class="feed">
    <v-progress-circular
      v-if="loading"
      indeterminate
      color="#6C64F2"
      class="mx-auto d-block my-4"
    ></v-progress-circular>

    <v-alert v-if="error" type="error" class="mx-4">
      {{ error }}
    </v-alert>
    
    <div v-if="!loading && !error" class="feed-content">
      <v-card class="mb-6 filter-card" elevation="2" rounded="lg">
        <v-container>
          <v-row align="center">
            <v-col cols="12">
              <v-select
                v-model="selectedTags"
                :items="availableTags"
                label="Filter posts by tags"
                multiple
                chips
                clearable
                variant="outlined"
                density="comfortable"
                hide-details
                prepend-inner-icon="mdi-filter-variant"
              ></v-select>
            </v-col>
          </v-row>
          <v-row justify="end">
            <v-col cols="12" md="4" class="d-flex justify-end">
              <v-btn
                color="primary"
                @click="applyFilters"
                prepend-icon="mdi-magnify"
                variant="elevated"
                rounded
              >
                Apply Filters
              </v-btn>
              <v-btn
                color="secondary"
                @click="removeAllFilters"
                class="ml-4"
                prepend-icon="mdi-refresh"
                variant="outlined"
                rounded
              >
                Reset
              </v-btn>
            </v-col>
          </v-row>
        </v-container>
      </v-card>

      <div v-for="post in posts" :key="post.id" :id="`post-${post.id}`" class="post-wrapper">
        <PostItem :key="post.id + post.created_at" :post="post" @tag-clicked="handleTagClick" />
      </div>

      <v-alert v-if="posts.length === 0" type="info" class="mx-4">
        No posts yet. Be the first to create one!
      </v-alert>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, watch, nextTick } from "vue";
import PostItem from "@/components/Post.vue";
import authService from "@/services/auth";
import { useRoute } from "vue-router";

export default {
  name: "MyFeed",
  components: {
    PostItem,
  },
  setup() {
    const posts = ref([]);
    const loading = ref(true);
    const error = ref(null);
    const selectedTags = ref([]);
    const route = useRoute();
    const availableTags = [
      "Active",
      "Family",
      "Shopping",
      "Solo",
      "Relaxation",
      "Nature Sites",
      "Cultural Sites",
      "Leisure Attractions",
      "Sports Activities",
      "Halal",
      "Vegetarian",
      "Kosher",
    ];

    const fetchPosts = async () => {
      loading.value = true;
      error.value = null;

      try {
        const token = authService.getToken();
        if (!token) {
          throw new Error("Not authenticated");
        }

        const currentUser = authService.getCurrentUser();
        if (!currentUser) {
          throw new Error("User data not found");
        }

        const query =
          selectedTags.value.length > 0
            ? `?tags=${selectedTags.value.join(",")}`
            : "";

        const response = await fetch(
          `http://localhost:8000/api/posts${query}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch posts");
        }

        const data = await response.json();
        console.log("Posts data:", data.posts);
        posts.value = data.posts.map((post) => ({
          ...post,
          username: post.username || currentUser.username,
          tags: post.preference || [],
        }));

        console.log("Loaded post objects:", posts.value);
        console.log("Post IDs in data:", posts.value.map(post => post.id));

        await nextTick();
        const scrollToPostId = route.query.scrollToPost;
        if (scrollToPostId) {
          console.log('Found scrollToPost in URL:', scrollToPostId);
          scrollToPost(scrollToPostId);
        }
      } catch (err) {
        error.value = err.message;
        console.error("Error fetching posts:", err);
        if (
          err.message.includes("Not authenticated") ||
          err.message.includes("User data not found")
        ) {
          authService.logout();
        }
      } finally {
        loading.value = false;
      }
    };

    const scrollToPost = (postId) => {
      if (!postId) return;

      console.log('Attempting to scroll to post:', postId);

      // Add a delay to ensure DOM is fully updated
      setTimeout(() => {
        const postElement = document.getElementById(`post-${postId}`);
        if (postElement) {
          console.log('Found post element, scrolling into view');
          postElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          console.warn(`Post element with ID post-${postId} not found`);
        }
      }, 500); // 500ms delay
    };

    // Watch for route changes to handle direct links 
    watch(() => route.query.scrollToPost, (newPostId) => {
      if (newPostId && !loading.value) {
        scrollToPost(newPostId);
      }
    });

    const applyFilters = () => {
      fetchPosts(selectedTags.value);
    };

    const removeAllFilters = () => {
      selectedTags.value = [];
      fetchPosts();
    };

    const handleTagClick = (tag) => {
      if (!selectedTags.value.includes(tag)) {
        selectedTags.value.push(tag);
        fetchPosts();
      }
    };

    onMounted(fetchPosts);

    // Refetch if route changes (e.g. redirected after creating a post)
    watch(() => route.fullPath, () => {
      console.log("Route changed, refetching posts...");
      fetchPosts();
    });

    return {
      posts,
      loading,
      error,
      selectedTags,
      availableTags,
      applyFilters,
      removeAllFilters,
      handleTagClick
    };
  },
};
</script>

<style scoped>
.feed {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
}

.post-wrapper {
  margin-bottom: 1rem;
}
</style>
