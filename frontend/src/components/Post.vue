<template>
  <div class="post">
    <!-- Post Header -->
    <div class="post-header">
      <router-link :to="getUserProfileRoute(post.user_id, post.username)" class="username">
        {{ displayUsername }}
      </router-link>
      <div class="title-location-container">
        <div
          v-if="post.title"
          class="post-title text-lg font-semibold text-gray-800"
        >
          {{ post.title }}
        </div>
        <div v-if="post.location" class="post-location text-gray-500 text-sm">
          📍 {{ simplifiedLocation }}
        </div>
      </div>
    </div>

    <!-- Post Image -->
    <img
      v-if="post.image_url"
      :src="post.image_url"
      alt="Post Image"
      class="post-image"
    />

    <!-- Post Actions -->
    <div class="post-actions">
      <button
        @click="handleLike"
        class="action-button"
        :class="{ liked: hasLiked }"
      >
        <font-awesome-icon
          :icon="hasLiked ? ['fas', 'heart'] : ['far', 'heart']"
          :class="{ 'text-red-500': hasLiked }"
        />
      </button>
      <button @click="openComments" class="action-button">
        <font-awesome-icon :icon="['far', 'comment']" />
      </button>
    </div>

    <!-- Likes Count -->
    <div class="likes-count text-left" v-if="likesCount > 0">
      {{ likesCount }} {{ likesCount === 1 ? "like" : "likes" }}
    </div>

    <!-- Post Content -->
    <div class="post-content text-left">
      <span class="username">{{ displayUsername }}</span>
      <span class="post-text">{{ post.content }}</span>
    </div>

    <!-- Tags moved and aligned left -->
    <div
      v-if="post.tags && post.tags.length"
      class="post-tags text-left pl-4 mb-2"
    >
      <span
        v-for="tag in post.tags"
        :key="tag"
        class="tag-link mr-2 cursor-pointer"
        @click="$emit('tag-clicked', tag)"
      >
        #{{ tag }}
      </span>
    </div>

    <!-- View Comments Link -->
    <button
      v-if="commentsCount > 0"
      @click="openComments"
      class="view-comments-link"
    >
      View all {{ commentsCount }}
      {{ commentsCount === 1 ? "comment" : "comments" }}
    </button>

    <!-- Comment Input -->
    <div class="comment-input-container">
      <input
        v-model="newComment"
        placeholder="Add a comment..."
        @keyup.enter="handleSubmit"
        class="comment-input"
      />
      <button
        @click="handleSubmit"
        class="post-comment-button"
        :disabled="!newComment.trim() || isSubmitting"
      >
        Post
      </button>
    </div>

    <!-- Comments Modal -->
    <v-dialog v-model="showCommentsDialog" max-width="1000">
      <div class="comments-dialog">
        <div class="dialog-content">
          <!-- Left side - Image -->
          <div class="dialog-image-container">
            <img
              v-if="post.image_url"
              :src="post.image_url"
              alt="Post Image"
              class="dialog-image"
            />
          </div>

          <!-- Right side - Comments -->
          <div class="dialog-comments-container">
            <!-- Post Header -->
            <div class="dialog-header">
              <router-link :to="getUserProfileRoute(post.user_id, post.username)" class="username">
                {{ displayUsername }}
              </router-link>
            </div>

            <!-- Comments List -->
            <div class="comments-list">
              <!-- Original Post -->
              <div class="original-post-content">
                <router-link :to="getUserProfileRoute(post.user_id, post.username)" class="username">
                  {{ displayUsername }}
                </router-link>
                <span class="post-text">{{ post.title }}</span>
              </div>

              <!-- Comments -->
              <div
                v-for="comment in comments"
                :key="comment.id"
                class="comment-thread"
              >
                <!-- Parent Comment -->
                <div class="parent-comment">
                  <router-link :to="getUserProfileRoute(comment.user_id, comment.username)" class="username">
                    {{ comment.username }}
                  </router-link>
                  <span class="comment-text">{{ comment.comment_text }}</span>
                  <div class="comment-actions">
                    <span class="comment-time">{{
                      formatTime(comment.created_at)
                    }}</span>
                    <button
                      @click="replyToComment(comment)"
                      class="reply-button"
                    >
                      Reply
                    </button>
                  </div>
                </div>

                <!-- Replies -->
                <div
                  v-if="comment.replies && comment.replies.length > 0"
                  class="replies"
                >
                  <div
                    v-for="reply in comment.replies"
                    :key="reply.id"
                    class="reply"
                  >
                    <div class="reply-content">
                      <div>
                        <router-link :to="getUserProfileRoute(reply.user_id, reply.username)" class="username">
                          {{ reply.username }}
                        </router-link>
                        <span class="reply-text">
                          <template v-if="reply.reply_to_user_id">
                            <router-link :to="getUserProfileRoute(reply.reply_to_user_id, getUsernameForReply(reply))" class="mention">
                              @{{ getUsernameForReply(reply) }}
                            </router-link>
                            {{ reply.comment_text }}
                          </template>
                          <template v-else>
                            {{ reply.comment_text }}
                          </template>
                        </span>
                      </div>
                      <div class="reply-actions">
                        <span class="reply-time">{{
                          formatTime(reply.created_at)
                        }}</span>
                        <button
                          @click="replyToComment(reply, comment)"
                          class="reply-button"
                        >
                          Reply
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Single Comment Input at Bottom -->
            <div class="dialog-comment-input">
              <input
                v-model="newComment"
                :placeholder="
                  replyingTo
                    ? `Reply to ${replyingTo.username}...`
                    : 'Add a comment...'
                "
                @keyup.enter="handleSubmit"
                class="comment-input"
              />
              <button
                @click="handleSubmit"
                class="post-comment-button"
                :disabled="!newComment.trim() || isSubmitting"
              >
                Post
              </button>
            </div>
          </div>
        </div>
      </div>
    </v-dialog>
  </div>
</template>

<script>
import { ref, onMounted, computed } from "vue";
import authService from "@/services/auth"; // Added import for authService
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { faHeart, faComment } from "@fortawesome/free-solid-svg-icons";
import { library } from "@fortawesome/fontawesome-svg-core";

library.add(faHeart, faComment);

const API_BASE_URL = "http://localhost:8000"; // Kong API Gateway URL

export default {
  name: "PostItem",
  components: {
    FontAwesomeIcon,
  },

  data() {
    return {
      heart: faHeart,
      comment: faComment,
    };
  },
  props: {
    post: {
      type: Object,
      required: true,
    },
  },

  setup(props) {
    const hasLiked = ref(false);
    const likesCount = ref(0);
    const commentsCount = ref(0);
    const comments = ref([]);
    const newComment = ref("");
    const showCommentsDialog = ref(false);
    const replyingTo = ref(null);
    const parentComment = ref(null);
    const isSubmitting = ref(false);

    const simplifiedLocation = computed(() => {
      if (!props.post.location) return "";
      const parts = props.post.location.split(",");
      if (parts.length >= 2) {
        const place = parts[0].trim();
        const country = parts[parts.length - 1].trim();
        return `${place}, ${country}`;
      }
      return props.post.location;
    });

    const fetchLikes = async () => {
      try {
        const token = authService.getToken();
        const response = await fetch(
          `${API_BASE_URL}/api/social/likes/${props.post.id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (!response.ok) throw new Error("Failed to fetch likes");
        const data = await response.json();
        hasLiked.value = data.has_liked;
        likesCount.value = data.total_likes;
      } catch (error) {
        console.error("Error fetching likes:", error);
      }
    };

    const fetchComments = async () => {
      try {
        const token = authService.getToken();
        const response = await fetch(
          `${API_BASE_URL}/api/social/comments/${props.post.id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch comments");
        }

        const data = await response.json();
        comments.value = data.comments || [];

        // Calculate total comments including replies
        let totalCount = 0;
        comments.value.forEach((comment) => {
          // Count the parent comment
          totalCount++;
          // Add the count of replies if any exist
          if (comment.replies && Array.isArray(comment.replies)) {
            totalCount += comment.replies.length;
          }
        });

        commentsCount.value = totalCount;
      } catch (error) {
        console.error("Error fetching comments:", error);
        comments.value = [];
        commentsCount.value = 0;
      }
    };

    onMounted(() => {
      fetchComments();
      fetchLikes();

      // Start polling every 5 seconds
      setInterval(() => {
        fetchComments();
        fetchLikes();
      }, 5000);
    });

    const handleLike = async () => {
      try {
        const token = authService.getToken();
        const response = await fetch(`${API_BASE_URL}/api/social/like`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ post_id: props.post.id }),
        });
        if (!response.ok) throw new Error("Failed to like post");
        await fetchLikes(); // Refresh likes count
      } catch (error) {
        console.error("Error liking post:", error);
      }
    };

    const replyToComment = (comment, parent = null) => {
      replyingTo.value = {
        ...comment,
        user_id: comment.user_id,
        username: comment.username,
      };

      parentComment.value = parent || comment;
      newComment.value = `@${comment.username} `;

      setTimeout(() => {
        document.querySelector(".dialog-comment-input .comment-input").focus();
      }, 50);
    };

    const handleSubmit = async () => {
      if (isSubmitting.value || !newComment.value.trim()) return;

      isSubmitting.value = true;
      try {
        const token = authService.getToken();
        const commentData = {
          post_id: props.post.id,
          comment: newComment.value.replace(/^@\w+\s+/, ""), // Remove the @mention from the comment text
          parent_comment_id: replyingTo.value ? parentComment.value.id : null,
          reply_to_user_id: replyingTo.value ? replyingTo.value.user_id : null,
        };

        const response = await fetch(`${API_BASE_URL}/api/social/comment`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(commentData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to post comment");
        }

        // Clear input and reset reply state
        newComment.value = "";
        replyingTo.value = null;
        parentComment.value = null;

        // Refresh comments
        await fetchComments();
      } catch (error) {
        console.error("Error posting comment:", error);
      } finally {
        isSubmitting.value = false;
      }
    };

    const formatTime = (dateString) => {
      const date = new Date(dateString);
      const now = new Date();
      const diff = now - date;
      const seconds = Math.floor(diff / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (days > 7) {
        return date.toLocaleDateString();
      } else if (days > 0) {
        return `${days}d`;
      } else if (hours > 0) {
        return `${hours}h`;
      } else if (minutes > 0) {
        return `${minutes}m`;
      } else {
        return "now";
      }
    };

    const openComments = () => {
      showCommentsDialog.value = true;
    };

    const getCommentTextWithoutMention = (text, username) => {
      if (!text || !username) return text;
      // Remove the @username from the beginning of the comment
      return text.replace(new RegExp(`^@${username}\\s*`), "");
    };

    const submitReply = async () => {
      if (!newComment.value.trim()) return;

      try {
        const token = authService.getToken();
        const response = await fetch(`${API_BASE_URL}/api/social/comment`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            post_id: props.post.id,
            comment: getCommentTextWithoutMention(
              newComment.value,
              replyingTo.value.username
            ),
            parent_comment_id: parentComment.value.id,
            reply_to_username: replyingTo.value.username,
            reply_to_user_id: replyingTo.value.user_id,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to post reply");
        }

        // Clear input and reset reply state
        newComment.value = "";
        replyingTo.value = null;
        parentComment.value = null;

        // Refresh comments to get updated count
        await fetchComments();
      } catch (error) {
        console.error("Error posting reply:", error);
      }
    };

    const getUsernameForReply = (reply) => {
      if (!reply.reply_to_user_id) return null;
      // Find the username from either the parent comment or other replies
      const allComments = comments.value.reduce((acc, comment) => {
        acc.push(comment);
        if (comment.replies) {
          acc.push(...comment.replies);
        }
        return acc;
      }, []);
      const replyToUser = allComments.find(
        (c) => c.user_id === reply.reply_to_user_id
      );
      return replyToUser ? replyToUser.username : null;
    };

    const getUserProfileRoute = (userId, username) => {
      const currentUser = authService.getCurrentUser();
      return currentUser && currentUser.id === parseInt(userId) 
        ? `/user/${userId}` 
        : `/profile/${userId}?username=${encodeURIComponent(username)}`;
    };

    onMounted(() => {
      fetchLikes();
      fetchComments();
    });

    return {
      hasLiked,
      likesCount,
      commentsCount,
      comments,
      newComment,
      showCommentsDialog,
      replyingTo,
      parentComment,
      handleLike,
      submitReply,
      displayUsername: props.post.username,
      getCommentTextWithoutMention,
      handleSubmit,
      isSubmitting,
      simplifiedLocation,
      replyToComment,
      formatTime,
      openComments,
      getUsernameForReply,
      getUserProfileRoute
    };
  },
};
</script>

<style scoped>
.post {
  background-color: white;
  border: 1px solid #dbdbdb;
  border-radius: 3px;
  margin-bottom: 24px;
}

.post-header {
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  border-bottom: 1px solid #efefef;
}

.post-image {
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  object-position: center;
  display: block;
  background-color: #f0f0f0;
}

.post-actions {
  padding: 8px 16px;
  display: flex;
  gap: 16px;
}

.action-button {
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  font-size: 24px;
}

.action-button.liked {
  color: #ed4956;
}

.text-red-500 {
  color: #ed4956;
}

.likes-count {
  padding: 0 16px;
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 8px;
}

.post-content {
  padding: 0 16px;
  margin: 8px 0;
}

.username {
  font-weight: 600;
  text-decoration: none;
  color: #262626;
  margin-right: 6px;
  margin-bottom: 10px;
}

.view-comments-link {
  padding: 0 16px;
  margin: 8px 0;
  color: #8e8e8e;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  text-align: left;
  width: 100%;
  display: block;
}

.comment-input-container {
  border-top: 1px solid #efefef;
  padding: 16px;
  display: flex;
  align-items: center;
}

.comment-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 14px;
}

.post-comment-button {
  background: none;
  border: none;
  color: #0095f6;
  font-weight: 600;
  cursor: pointer;
  padding: 0 8px;
}

.post-comment-button:disabled {
  opacity: 0.3;
  cursor: default;
}

/* Dialog Styles */
.comments-dialog {
  background: white;
  height: 80vh;
  display: flex;
}

.dialog-content {
  display: flex;
  width: 100%;
  height: 100%;
}

.dialog-image-container {
  flex: 1;
  background: black;
}

.dialog-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.dialog-comments-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  border-left: 1px solid #dbdbdb;
}

.dialog-header {
  padding: 14px 16px;
  border-bottom: 1px solid #dbdbdb;
}

.comments-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.comment-thread {
  margin-bottom: 24px;
}

.parent-comment {
  margin-bottom: 16px;
}

.comment-actions,
.reply-actions {
  margin-top: 4px;
  font-size: 12px;
  color: #8e8e8e;
}

.reply-button {
  background: none;
  border: none;
  color: #8e8e8e;
  font-weight: 600;
  cursor: pointer;
  margin-left: 8px;
}

.username,
.mention {
  color: #262626;
  font-weight: 600;
  text-decoration: none;
  margin-right: 4px;
}

.username:hover,
.mention:hover {
  text-decoration: underline;
}

.reply-text {
  color: #262626;
  margin-left: 4px;
}

.mention {
  color: #00376b;
  font-weight: 600;
  text-decoration: none;
  margin-right: 4px;
}

.mention:hover {
  text-decoration: underline;
}

.replies {
  margin-left: 32px;
  margin-top: 16px;
  padding-left: 12px;
  border-left: 2px solid #efefef;
}

.reply {
  margin-bottom: 16px;
  padding: 8px 0;
}

.reply-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.reply-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 4px;
  font-size: 12px;
  color: #8e8e8e;
}

.reply-button {
  background: none;
  border: none;
  color: #8e8e8e;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  font-size: 12px;
}

.dialog-comment-input {
  padding: 16px;
  border-top: 1px solid #dbdbdb;
  display: flex;
  align-items: center;
}

.original-post-content {
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #efefef;
}

.post-tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
}

.tag-link {
  color: #1da1f2;
  font-weight: 500;
}

.tag-link:hover {
  color: #1a91da;
  text-decoration: underline;
}
.post-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.title-location-container {
  display: flex;
  align-items: baseline;
  justify-content: space-between; 
  width: 100%; 
}

.post-title {
  margin-right: 10px;
  font-size: 1.25em;
  font-weight: bold;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.1);
  /* color: #2c3e50; */
  font-family: 'Montserrat', sans-serif;
}
</style>
