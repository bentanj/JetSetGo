const config = {
    // API configuration
    api: {
        // Base URL for the notification API
        notificationBaseUrl: 'http://localhost:8000/api/notification',
        timeout: 10000
    },

    // Notification types
    notificationTypes: {
        REPLY: 'reply',
        COMMENT: 'comment',
        LIKE: 'like',
        SYSTEM: 'system'
    },

    // Notification Service Configuration
    notifications: {
        // Polling interval for real-time updates 
        pollingInterval: 30000,
        maxNotifications: 50,
        typeTitles: {
            'reply': 'New Reply',
            'comment': 'New Comment',
            'like': 'New Like',
            'system': 'System Update'
        }
    }
};

export default config;