import axios from 'axios';

const API_URL = 'http://localhost:8000/api/auth';
const USER_API_URL = 'http://localhost:8000/api'; // Route through Kong to match User_app.py endpoint

// Add axios interceptor to add JWT token and Content-Type to all requests
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Add Content-Type header
    config.headers['Content-Type'] = 'application/json';
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

class AuthService {
  async register(userData) {
    try {
      const response = await axios.post(`${API_URL}/register`, userData);
      
      if (response.data.user && userData.email) {
        // Update user data with email from registration
        response.data.user.email = userData.email;
        if (response.data.token) {
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('user', JSON.stringify(response.data.user));
        }
      }
      
      return response.data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  async login(username, password) {
    try {
      const response = await axios.post(`${API_URL}/login`, {
        username,
        password
      });
    
      if (response.data.token) {
        // Store initial data
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        // Set Authorization header for future requests
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
        
        // Verify token to get additional user info
        const verifyResponse = await axios.get(`${API_URL}/verify-token`);
        console.log('Verify token response:', verifyResponse.data);
        
        if (verifyResponse.data && verifyResponse.data.user) {
          // Update stored user data with additional info from token verification
          const updatedUser = {
            ...response.data.user,
            email: verifyResponse.data.user.email
          };
          localStorage.setItem('user', JSON.stringify(updatedUser));
        }
      }
    
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
  }

  getCurrentUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  getToken() {
    return localStorage.getItem('token');
  }

  isAuthenticated() {
    const token = this.getToken();
    if (!token) return false;
    
    try {
      // Check if token is expired
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));

      const payload = JSON.parse(jsonPayload);
      const now = Date.now() / 1000;
      
      return payload.exp > now;
    } catch (err) {
      return false;
    }
  }

  isFirstLogin() {
    const user = this.getCurrentUser();
    return user ? user.is_first_login : false;
  }

  getTokenInfo() {
    const token = this.getToken();
    if (!token) return null;
    
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));

      return JSON.parse(jsonPayload);
    } catch (err) {
      return null;
    }
  }

  async verifyToken() {
    try {
      const response = await axios.get(`${API_URL}/verify-token`);
      console.log('Verify token response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Token verification error:', error);
      this.logout();
      return null;
    }
  }

  async updateFirstLoginStatus() {
    try {
      const response = await axios.put(`${API_URL}/update-first-login`);
      
      if (response.data) {
        const user = this.getCurrentUser();
        if (user) {
          user.is_first_login = false;
          localStorage.setItem('user', JSON.stringify(user));
        }
      }
      
      return response.data;
    } catch (error) {
      console.error('Error updating first login status:', error);
      return false;
    }
  }

  async createUserProfile(preferences) {
    try {
      if (!preferences || Object.keys(preferences).length === 0) {
        throw new Error('No preferences provided');
      }

      const verifyResponse = await axios.get(`${API_URL}/verify-token`);
      if (!verifyResponse.data || !verifyResponse.data.user) {
        throw new Error('Could not verify user token');
      }

      const stored = this.getCurrentUser();
      if (!stored) {
        throw new Error('Please log in again');
      }

      const verifiedUser = verifyResponse.data.user;
      const updatedUser = {
        ...stored,
        email: verifiedUser.email,
        id: verifiedUser.user_id || stored.id,
        username: verifiedUser.username || stored.username
      };

      localStorage.setItem('user', JSON.stringify(updatedUser));

      const createData = {
        user_id: updatedUser.id,
        username: updatedUser.username,
        taste_preferences: preferences
      };

      const missing = [];
      if (!createData.user_id) missing.push('user_id');
      if (!createData.username) missing.push('username');
      if (missing.length > 0) {
        throw new Error(`Missing required fields: ${missing.join(', ')}`);
      }

      const response = await axios.post(`${USER_API_URL}/users/create`, createData);
      if (!response.data) {
        throw new Error('Empty response from user service');
      }

      if (response.data.error) {
        throw new Error(`User service error: ${response.data.error}`);
      }

      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        throw new Error('Authentication failed. Please log in again.');
      } else if (error.response?.status === 400) {
        throw new Error('Invalid data provided: ' + (error.response.data.error || error.message));
      } else {
        throw new Error('Failed to create user profile: ' + error.message);
      }
    }
  }

  async getUserPreferences() {
    try {
      const tokenInfo = this.getTokenInfo();
      if (!tokenInfo || !tokenInfo.user_id) {
        throw new Error('Invalid token or user ID not found');
      }

      const response = await axios.get(`${USER_API_URL}/user/${tokenInfo.user_id}/taste-preferences`);
      
      // Log the response for debugging
      console.log('User preferences response:', response.data);
      
      // Check for error responses
      if (response.data.error) {
        console.warn('User preferences error:', response.data.error);
        // Return default preferences instead of throwing
        return {
          travel_style: [],
          tourist_sites: [],
          diet: [],
          start_time: "09:00",
          end_time: "22:00"
        };
      }
      
      // Ensure we always return an object with the expected structure
      const preferences = response.data.taste_preferences || {};
      return {
        travel_style: preferences.travel_style || [],
        tourist_sites: preferences.tourist_sites || [],
        diet: preferences.diet || [],
        start_time: preferences.start_time || "09:00",
        end_time: preferences.end_time || "22:00"
      };
    } catch (error) {
      console.error('Error getting user preferences:', error);
      // Return default preferences instead of throwing
      return {
        travel_style: [],
        tourist_sites: [],
        diet: [],
        start_time: "09:00",
        end_time: "22:00"
      };
    }
  }

  async updateUserProfile(preferences) {
    try {
      const tokenInfo = this.getTokenInfo();
      if (!tokenInfo || !tokenInfo.user_id) {
        throw new Error('Invalid token or user ID not found');
      }

      const response = await axios.put(`${USER_API_URL}/user/${tokenInfo.user_id}/taste-preferences`, preferences);
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        throw new Error('Authentication failed. Please log in again.');
      } else if (error.response?.status === 400) {
        throw new Error('Invalid preferences data provided.');
      } else {
        console.error('Error updating preferences:', error);
        throw new Error('Failed to update preferences. Please try again.');
      }
    }
  }

  async deleteUser() {
    try {
      const tokenInfo = this.getTokenInfo();
      if (!tokenInfo || !tokenInfo.user_id) {
        throw new Error('Invalid token or user ID not found');
      }

      const userId = tokenInfo.user_id;
      console.log('Attempting to delete user:', userId);

      // 1. Delete all itineraries
      console.log('Deleting itineraries...');
      try {
        await axios.delete(`${USER_API_URL}/itineraries/${userId}/all`);
        console.log('Itineraries deleted successfully');
      } catch (error) {
        console.error('Error deleting itineraries:', error);
      }

      // 2. Delete all social interactions (likes and comments)
      console.log('Deleting social interactions...');
      try {
        await axios.delete(`${USER_API_URL}/social/user/${userId}`);
        console.log('Social interactions deleted successfully');
      } catch (error) {
        console.error('Error deleting social interactions:', error);
      }

      // 3. Delete all posts
      console.log('Deleting posts...');
      try {
        await axios.delete(`${USER_API_URL}/posts/user/${userId}`);
        console.log('Posts deleted successfully');
      } catch (error) {
        console.error('Error deleting posts:', error);
      }

      // 4. Delete user profile
      console.log('Deleting user profile...');
      try {
        await axios.delete(`${USER_API_URL}/user/${userId}`);
        console.log('User profile deleted successfully');
      } catch (error) {
        console.error('Error deleting user profile:', error);
      }

      // 5. Finally, delete authentication record
      console.log('Deleting authentication record...');
      const response = await axios.delete(`${API_URL}/user/${userId}`);
      
      console.log('Delete authentication response:', response);
      
      if (response.status === 200) {
        // Clear local storage and log out
        this.logout();
        return true;
      }

      // If we get here, something went wrong
      throw new Error('Failed to delete user account');
    } catch (error) {
      console.error('Error in delete process:', error);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      throw error;
    }
  }
}

export default new AuthService();
