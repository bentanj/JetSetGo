<template>
    <nav class="navbar navbar-expand-lg navbar-light bg-white fixed-top shadow-sm">
      <div class="container">
        <router-link class="navbar-brand d-flex align-items-center" to="/">
          <img src="../assets/appLogo.png" alt="JetSetGo Logo" width="120" height="100" class="d-inline-block align-top">
          <span class="fw-bold text-primary">JetSetGo</span>
        </router-link>
        
        <button class="navbar-toggler" type="button" 
                @click="isNavOpen = !isNavOpen" 
                aria-controls="navbarSupportedContent" 
                aria-expanded="false" 
                aria-label="Toggle navigation">
          <span class="navbar-toggler-icon"></span>
        </button>
        
        <div class="collapse navbar-collapse" :class="{ 'show': isNavOpen }" id="navbarSupportedContent">
          <!-- <ul class="navbar-nav me-auto mb-2 mb-lg-0">
            <li class="nav-item">
              <router-link class="nav-link" to="/">Home</router-link>
            </li>
            <li class="nav-item">
              <router-link class="nav-link" to="/discover">Discover</router-link>
            </li>
          </ul> -->
          <div class="ms-auto">
            <router-link to="/login" class="btn btn-outline-primary me-2">Login</router-link>
            <router-link to="/register" class="btn btn-primary">Sign Up</router-link>
          </div>
        </div>
      </div>
    </nav>
  </template>
  
  <script>
  export default {
    name: "AppNavbar",
    data() {
      return {
        isNavOpen: false
      };
    }
  };
  </script>
  
  <style scoped>
  .navbar {
    z-index: 1030;
  }
  
  @media (max-width: 991.98px) {
    .navbar-collapse {
      transition: all 0.3s ease;
    }
  }
  </style>