import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '../views/Home.vue'
import MyLogin from '../views/Login.vue'
import MyRegister from '../views/Register.vue'
import authService from '../services/auth'
import LandingView from '@/views/LandingView.vue'

const routes = [
  {
    path: '/',
    name: 'Landing',
    component: LandingView,
  },
  {
    path: '/home',
    name: 'Home',
    component: HomePage
  },
  {
    path: '/login',
    name: 'Login',
    component: MyLogin,
    meta: { requiresGuest: true }
  },
  {
    path: '/register',
    name: 'Register',
    component: MyRegister,
    meta: { requiresGuest: true }
  },
  {
    path: '/create-post',
    name: 'CreatePost',
    component: () => import('../views/CreatePost.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/user/:id',
    name: 'UserProfile',
    component: () => import('../views/UserProfile.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/profile/:id',
    name: 'ViewProfile',
    component: () => import('../views/ViewProfile.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/preferences-editor',
    name: 'PreferencesEditor',
    component: () => import('../views/PreferencesEditor.vue'),
    meta: { requiresAuth: true, allowFirstLogin: true }
  },
  {
    path: '/travel-planner',
    name: 'TravelPlanner',
    component: () => import('../views/TravelPlanner.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/itinerary',
    name: 'Itinerary',
    component: () => import('../views/Itinerary.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/saved-itineraries',
    name: 'SavedItineraries',
    component: () => import('../views/SavedItineraries.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/saved-itineraries/:id',
    name: 'SavedItineraryDetail',
    component: () => import('../views/SavedItineraryDetail.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/user-pref',
    name: 'UserPref',
    component: () => import('../views/UserPref.vue'),
    meta: { requiresAuth: true, allowFirstLogin: true }
  }
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

// Enhanced navigation guard for first login flow
router.beforeEach(async (to, from, next) => {
  const isAuthenticated = authService.isAuthenticated();
  
  if (to.meta.requiresAuth && !isAuthenticated) {
    // Not authenticated, redirect to login
    next('/login');
  } else if (to.meta.requiresGuest && isAuthenticated) {
    // Already authenticated, redirect from guest pages
    next('/home');
  } else if (isAuthenticated) {
    // Check for first login flow
    const isFirstLogin = authService.isFirstLogin();
    
    if (isFirstLogin && to.path !== '/user-pref' && !to.meta.allowFirstLogin) {
      // First login users should complete preferences before accessing other pages
      next('/user-pref');
    } else {
      // Normal navigation
      next();
    }
  } else {
    // Default case
    next();
  }
})

export default router