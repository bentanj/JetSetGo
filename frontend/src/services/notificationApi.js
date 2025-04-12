import config from './config';

/**
 * Fetch helper with improved error handling and timeout
 * @param {string} url - The URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} timeout - Request timeout in milliseconds
 * @returns {Promise<Object>} - Parsed JSON response
 */
const fetchWithTimeout = async (url, options = {}, timeout = config.api.timeout) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorBody}`);
    }
    
    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('Fetch Error:', error);
    throw error;
  }
};


const notificationApi = {
  /**
   * Fetch notifications for a specific user
   * @param {string} userId - User identifier
   * @param {Object} [options={}] - Additional fetch options
   * @returns {Promise<Array>} - List of notifications
   */
  getNotifications: async (userId, options = {}) => {
    try {
      const response = await fetchWithTimeout(
        `${config.api.notificationBaseUrl}/notifications/${userId}/`,
        { method: 'GET', ...options }
      );
      return response.List || [];
    } catch (error) {
      console.error('Fetch Notifications Error:', error);
      throw error;
    }
  },
  
  /**
   * Create a new notification
   * @param {Object} notification - Notification details
   * @returns {Promise<Object>} - Created notification response
   */
  createNotification: async (notification) => {
    const payload = {
      RecipientUserId: notification.recipientUserId || '',
      SenderUserId: notification.senderUserId || '',
      NotificationType: notification.type || '',
      Message: notification.message || '',
      PostId: notification.postId || '',
      IsRead: notification.isRead || false,
      CreatedOn: notification.createdOn || new Date().toISOString()
    };
    
    try {
      const response = await fetchWithTimeout(
        `${config.api.notificationBaseUrl}/notifications/`,
        {
          method: 'POST',
          body: JSON.stringify(payload)
        }
      );
      
      return response;
    } catch (error) {
      console.error('Create Notification Error:', error);
      throw error;
    }
  },
  
  /**
   * Mark a specific notification as read
   * @param {string} userId - User identifier
   * @param {string|number} notificationId - Notification identifier
   * @returns {Promise<Object>} - Marking result
   */
  markAsRead: async (userId, notificationId) => {
    try {
      const payload = {
        UserId: userId,
        NotificationId: notificationId
      };
      
      return await fetchWithTimeout(
        `${config.api.notificationBaseUrl}/UpdateReadNotification`,
        {
          method: 'PUT',
          body: JSON.stringify(payload)
        }
      );
    } catch (error) {
      console.error('Mark Notification Read Error:', error);
      throw error;
    }
  },
  
  /**
   * Mark multiple notifications as read
   * @param {string} userId - User identifier
   * @param {Array<string|number>} notificationIds - List of notification IDs
   * @returns {Promise<Array>} - Marking results
   */
  markAllAsRead: async (userId, notificationIds) => {
    try {
      const updatePromises = notificationIds.map(id => 
        notificationApi.markAsRead(userId, id)
      );
      
      return await Promise.all(updatePromises);
    } catch (error) {
      console.error('Mark All Notifications Read Error:', error);
      throw error;
    }
  }
};

export default notificationApi;