<template>
  <v-navigation-drawer v-model="isOpen" location="right" temporary width="320" @click:outside="emitClose">
    <v-toolbar color="primary" dark>
      <v-toolbar-title>Notifications</v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn icon @click="emitClose">
        <v-icon>mdi-close</v-icon>
      </v-btn>
    </v-toolbar>

    <div v-if="isLoading" class="pa-4 text-center">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <v-alert type="error" v-else-if="error" class="ma-4">
      {{ error }}
    </v-alert>

    <v-list v-else-if="notifications.length === 0">
      <v-list-item>
        <v-list-item-title class="text-center">No notifications</v-list-item-title>
      </v-list-item>
    </v-list>

    <v-list v-else density="compact" class="notification-list">
      <v-list-item v-for="notification in notifications" :key="notification.Id" @click="markAsRead(notification.Id)"
        :class="{ 'unread-notification': !notification.IsRead }" class="notification-item">
        <template v-slot:prepend>
          <v-avatar size="36" class="notification-icon" color="primary" variant="tonal">
            <v-icon>{{ getNotificationIcon(notification) }}</v-icon>
          </v-avatar>
        </template>

        <div class="notification-content">
          <!-- <v-list-item-title class="notification-title">{{ getTitle(notification) }}</v-list-item-title> -->
          <v-list-item-subtitle class="notification-message"
            v-html="truncateMessage(notification.Message)"></v-list-item-subtitle>
          <div class="notification-time">
            {{ formatTime(notification.CreatedOn) }}
          </div>
        </div>
      </v-list-item>
    </v-list>

    <v-divider v-if="unreadCount > 0" class="mt-2"></v-divider>
    <v-btn v-if="unreadCount > 0" block variant="text" color="primary" class="mt-2" @click="markAllAsRead">
      Mark all as read
    </v-btn>
  </v-navigation-drawer>
</template>

<script setup>
import { ref, watch, defineProps, defineEmits } from 'vue';
import notificationService from '@/services/notificationService';


const props = defineProps({ show: Boolean });
const emit = defineEmits(['close']);
const isOpen = ref(props.show);

watch(() => props.show, (val) => isOpen.value = val);

const emitClose = () => {
  isOpen.value = false;
  emit('close');
};

const isLoading = notificationService.isLoading;
const error = notificationService.error;
const notifications = notificationService.notifications;
const unreadCount = notificationService.unreadCount;

const markAsRead = async (id) => {
  try {
    const notification = notifications.value.find(n => n.Id === id);
    if (!notification) return;
    
    const postId = notification.PostId;
    
    emitClose();

    await notificationService.markAsRead(id);
    
    if (postId) {
      window.location.href = `/home?scrollToPost=${postId}`;
    }
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
};

const truncateMessage = (message) => {
  if (!message) return '';
  if (message.includes(':') && message.length > 30) {
    const parts = message.split(':', 2);
    const secondPart = parts[1].trim();
    const truncatedSecondPart = secondPart.length > 35
      ? secondPart.substring(0, 35) + '...'
      : secondPart;
    return parts[0] + ':<br>' + truncatedSecondPart;
  }
  return message;
};

const markAllAsRead = async () => {
  await notificationService.markAllAsRead();
};

const getTitle = (notification) => notificationService.getNotificationTitle(notification);
const formatTime = (t) => notificationService.formatTime(t);

const getNotificationIcon = (notification) => {
  // Determine icon based on notification type
  const type = getTitle(notification)?.toLowerCase() || '';

  if (type.includes('like')) return 'mdi-thumb-up';
  if (type.includes('reply')) return 'mdi-reply';
  if (type.includes('comment')) return 'mdi-comment-text';

  // Default icon
  return 'mdi-bell';
};
</script>

<style scoped>
.notification-list {
  padding: 8px;
}

.notification-item {
  margin-bottom: 8px;
  border-radius: 8px;
  transition: background-color 0.2s ease;
  text-align: left;
}

.notification-item:hover {
  background-color: rgba(0, 0, 0, 0.03);
}

.unread-notification {
  background-color: #f0f7ff;
  border-left: 3px solid #2196f3;
}

.notification-content {
  display: flex;
  flex-direction: column;
  width: 100%;
  padding-left: 8px;
}

.notification-title {
  font-weight: 600;
  line-height: 1.2;
  margin-bottom: 4px;
  text-align: left;
}

.notification-message {
  font-size: 0.875rem;
  color: rgba(0, 0, 0, 0.6);
  margin-bottom: 6px;
  text-align: left;
  line-height: 1.3;
  white-space: normal;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  display: block;

}

.notification-time {
  font-size: 0.75rem;
  color: rgba(0, 0, 0, 0.5);
  text-align: left;
}

.notification-icon {
  margin-right: 8px;
}
</style>