import { ref, computed } from 'vue';
import config from './config';
import notificationApi from './notificationApi';

class NotificationService {
  // Reactive state
  notifications = ref([]);
  isLoading = ref(false);
  error = ref(null);
  currentUserId = ref(null);

  unreadCount = computed(() => 
    this.notifications.value.filter(n => !n.IsRead).length
  );

  /**
   * Initialize notification service for a user
   * @param {string} userId - Current user's identifier
   */
  initialize(userId) {
    this.currentUserId.value = userId;
    this.fetchNotifications();
  }

  /**
   * Fetch notifications for the current user
   * @returns {Promise<Array>} - List of notifications
   */
  async fetchNotifications() {
    if (!this.currentUserId.value) {
      this.error.value = 'No user ID provided';
      return [];
    }

    try {
      this.isLoading.value = true;
      this.error.value = null;

      const data = await notificationApi.getNotifications(
        this.currentUserId.value
      );

      // Sort notifications by most recent first
      this.notifications.value = data.sort((a, b) => 
        new Date(b.CreatedOn) - new Date(a.CreatedOn)
      ).slice(0, config.notifications.maxNotifications);

      return this.notifications.value;
    } catch (err) {
      this.error.value = 'Failed to fetch notifications';
      console.error('Notification Fetch Error:', err);
      return [];
    } finally {
      this.isLoading.value = false;
    }
  }

  /**
   * Mark a specific notification as read
   * @param {string|number} id - Notification identifier
   * @returns {Promise<boolean>} - Success status
   */
  async markAsRead(id) {
    if (!this.currentUserId.value) {
      this.error.value = 'No user ID provided';
      return false;
    }

    try {
      this.isLoading.value = true;
      
      const notification = this.notifications.value.find(n => n.Id === id);
      if (notification && !notification.IsRead) {
        await notificationApi.markAsRead(this.currentUserId.value, id);
        notification.IsRead = true;
        return true;
      }
      return false;
    } catch (err) {
      this.error.value = `Failed to mark notification ${id} as read`;
      console.error(`Notification Mark Read Error:`, err);
      return false;
    } finally {
      this.isLoading.value = false;
    }
  }

  /**
   * Mark all notifications as read
   * @returns {Promise<boolean>} - Success status
   */
  async markAllAsRead() {
    if (!this.currentUserId.value) {
      this.error.value = 'No user ID provided';
      return false;
    }

    try {
      this.isLoading.value = true;
      
      const unreadIds = this.notifications.value
        .filter(n => !n.IsRead)
        .map(n => n.Id);

      if (unreadIds.length === 0) return true;

      await notificationApi.markAllAsRead(this.currentUserId.value, unreadIds);
      
      this.notifications.value.forEach(n => { n.IsRead = true; });
      
      return true;
    } catch (err) {
      this.error.value = 'Failed to mark all notifications as read';
      console.error('Mark All Notifications Read Error:', err);
      return false;
    } finally {
      this.isLoading.value = false;
    }
  }

  /**
   * Create a new notification
   * @param {Object} notificationData - Notification details
   * @returns {Promise<Object>} - Created notification
   */
  async createNotification(notificationData) {
    try {
      this.isLoading.value = true;
      
      const result = await notificationApi.createNotification(notificationData);
      await this.fetchNotifications();
      
      return result;
    } catch (err) {
      this.error.value = 'Failed to create notification';
      console.error('Notification Creation Error:', err);
      throw err;
    } finally {
      this.isLoading.value = false;
    }
  }

  /**
   * Format timestamp to human-readable relative time
   * @param {string|Date} timestamp - Timestamp to format
   * @returns {string} - Formatted time
   */
  formatTime(timestamp) {
    if (!timestamp) return '';
    
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    const periods = [
      { time: 60 * 1000, label: 'Just now' },
      { time: 60 * 60 * 1000, label: 'minute', divisor: 60 * 1000 },
      { time: 24 * 60 * 60 * 1000, label: 'hour', divisor: 60 * 60 * 1000 },
      { time: 7 * 24 * 60 * 60 * 1000, label: 'day', divisor: 24 * 60 * 60 * 1000 }
    ];
    
    for (const period of periods) {
      if (diff < period.time) {
        if (period.label === 'Just now') return period.label;
        const value = Math.floor(diff / period.divisor);
        return `${value} ${period.label}${value > 1 ? 's' : ''} ago`;
      }
    }
    
    return date.toLocaleDateString();
  }

  /**
   * Get notification title based on type
   * @param {Object} notification - Notification object
   * @returns {string} - Notification title
   */
  getNotificationTitle(notification) {
    return config.notifications.typeTitles[notification.NotificationType] 
      || 'Notification';
  }
}

export default new NotificationService();