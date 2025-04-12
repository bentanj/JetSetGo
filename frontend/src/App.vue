<template>
  <v-app style="height: 100vh; width: 100vw">
    <v-app-bar color="#6C64F2" v-if="showNavigation">
      <v-app-bar-nav-icon
        variant="text"
        @click.stop="drawer = !drawer"
      ></v-app-bar-nav-icon>

      <router-link to="/home" class="d-flex align-center text-decoration-none">
        <img
          src="./assets/appLogo.png"
          alt="JetSetGo Logo"
          height="50"
          class="mr-2"
        />
        <span class="font-weight-bold text-white">JetSetGo</span>
      </router-link>

      <v-spacer></v-spacer>

      <template v-if="!isAuthenticated">
        <v-btn to="/login" variant="text">Login</v-btn>
        <v-btn to="/register" variant="text">Register</v-btn>
      </template>
      <template v-else>
        <router-link :to="`/user/${currentUser?.id}`" class="welcome-link">
          <span class="mr-4 font-weight-bold"
            >Welcome, {{ currentUser?.username }}</span
          >
          <img
            src="./assets/user.png"
            alt="JetSetGo Logo"
            height="30"
            class="mr-2"
          />
        </router-link>
        <v-btn @click="handleLogout" variant="text" class="font-weight-bold"
          >Logout</v-btn
        >
        <!-- Notification Bell Only -->
        <v-btn
          icon
          variant="text"
          @click="toggleNotificationPanel"
          class="notification-bell"
        >
          <v-badge
            :content="unreadCount"
            :model-value="unreadCount > 0"
            color="error"
          >
            <v-icon>mdi-bell</v-icon>
          </v-badge>
        </v-btn>
      </template>
    </v-app-bar>

    <!-- Navigation Drawer -->
    <v-navigation-drawer
      v-if="showNavigation"
      v-model="drawer"
      temporary
      style="height: 100vh; display: flex; flex-direction: column"
    >
      <v-list>
        <v-list-item to="/home" title="Home" prepend-icon="mdi-home"></v-list-item>
        <v-list-item to="/travel-planner" title="Travel Planner" prepend-icon="mdi-map-marker-path"></v-list-item>
        <v-list-item to="/saved-itineraries" prepend-icon="mdi-book-open-variant">
          Saved Itineraries
        </v-list-item>
        <v-list-item to="/preferences-editor" title="User Preferences" prepend-icon="mdi-cog"></v-list-item>
      </v-list>
      <v-divider></v-divider>
      <v-spacer></v-spacer>
      <div class="pa-4">
        <v-btn rounded block color="#6C64F2" to="/create-post"
          >Create Post</v-btn
        >
      </div>
    </v-navigation-drawer>

    <!-- Notification Drawer Component -->
    <NotificationDrawer
      v-if="isAuthenticated"
      :show="notificationDrawer"
      @close="notificationDrawer = false"
    />

    <v-main>
      <router-view></router-view>
    </v-main>
  </v-app>
</template>

<script>
import authService from "./services/auth";
import notificationService from "@/services/notificationService";
import config from "@/services/config";
import NotificationDrawer from "./components/NotificationDrawer.vue";

export default {
  name: "App",
  components: {
    NotificationDrawer,
  },
  data() {
    return {
      drawer: false,
      isAuthenticated: false,
      currentUser: null,
      notificationDrawer: false,
      id: null,
      username: "",
    };
  },
  created() {
    this.checkAuth();
    // Add event listener for storage changes
    window.addEventListener("storage", this.checkAuth);
  },
  watch: {
    // Watch for route changes to update auth state
    $route: {
      immediate: true,
      handler() {
        this.checkAuth();
      },
    },
  },
  mounted() {
    this.startNotificationPolling();
  },
  beforeUnmount() {
    // Remove event listener
    window.removeEventListener("storage", this.checkAuth);

    this.stopNotificationPolling();
  },
  computed: {
    unreadCount() {
      return notificationService.unreadCount.value;
    },
    showNavigation() {
      return this.$route.name !== 'UserPref';
    }
  },

  methods: {
    async checkAuth() {
      this.isAuthenticated = authService.isAuthenticated();
      if (this.isAuthenticated) {
        this.currentUser = authService.getCurrentUser();
        if (!this.currentUser) {
          this.handleLogout();
          return;
        }
        // Verify token validity
        const isValid = await authService.verifyToken();
        if (!isValid) {
          this.handleLogout();
        } else {
          // Initialize notification service with current user ID
          notificationService.initialize(this.currentUser.id);
        }
      } else {
        this.currentUser = null;
      }
    },
    toggleNotificationPanel() {
      this.notificationDrawer = !this.notificationDrawer;
    },
    startNotificationPolling() {
      this.notificationPollingInterval = setInterval(() => {
        if (this.isAuthenticated && this.currentUser) {
          notificationService.fetchNotifications();
        }
      }, config.notifications.pollingInterval);
    },
    stopNotificationPolling() {
      if (this.notificationPollingInterval)
        clearInterval(this.notificationPollingInterval);
    },

    handleLogout() {
      authService.logout();
      this.isAuthenticated = false;
      this.currentUser = null;
      this.notifications = [];
      this.unreadCount = 0;
      this.notificationDrawer = false;
      this.$router.push("/");
    },
  },
};
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}

.unread-notification {
  background-color: #f5f5f5;
  border-left: 4px solid var(--v-primary-base);
}

.notification-bell {
  position: relative;
}

.navbar {
  background-color: #ffffff;
  padding: 1rem 2rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.navbar-brand a {
  font-size: 1.5rem;
  font-weight: bold;
  color: #4caf50;
  text-decoration: none;
}

.navbar-menu {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.nav-link {
  color: #666;
  text-decoration: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.nav-link:hover {
  background-color: #f5f5f5;
  color: #4caf50;
}

.welcome-text {
  color: #666;
  margin-right: 1rem;
}

.router-link-active {
  color: #4caf50;
  font-weight: bold;
}

.welcome-link {
  text-decoration: none;
  color: inherit;
}

.welcome-link:hover {
  opacity: 0.8;
  cursor: pointer;
}
</style>
