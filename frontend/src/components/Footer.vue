<template>
    <footer class="bg-dark text-white py-5">
      <div class="container">
        <div class="row gy-4">
          <!-- Logo and description -->
          <div class="col-lg-3 col-md-6">
            <div class="d-flex align-items-center">
              <img src="../assets/appLogo.png" alt="JetSetGo Logo" width="40" height="40">
              <span class="ms-2 fs-4 fw-bold">JetSetGo</span>
            </div>
            <p class="mt-3 text-white-50">
              Curate your ideal travel itinerary with AI and share experiences with fellow travelers.
            </p>
            <div class="mt-3">
              <a href="#" class="text-white-50 me-3"><i class="fab fa-facebook-f"></i></a>
              <a href="#" class="text-white-50 me-3"><i class="fab fa-instagram"></i></a>
              <a href="#" class="text-white-50 me-3"><i class="fab fa-twitter"></i></a>
            </div>
          </div>
          
          <!-- Links 1 -->
          <div class="col-lg-3 col-md-6">
            <h5 class="text-uppercase fw-bold mb-3">Product</h5>
            <ul class="list-unstyled">
              <li class="mb-2"><a href="#" class="text-white-50 text-decoration-none">Features</a></li>
              <li class="mb-2"><a href="#" class="text-white-50 text-decoration-none">How It Works</a></li>
              <li class="mb-2"><a href="#" class="text-white-50 text-decoration-none">Pricing</a></li>
              <li class="mb-2"><a href="#" class="text-white-50 text-decoration-none">AI Technology</a></li>
            </ul>
          </div>
          
          <!-- Links 2 -->
          <div class="col-lg-3 col-md-6">
            <h5 class="text-uppercase fw-bold mb-3">Resources</h5>
            <ul class="list-unstyled">
              <li class="mb-2"><a href="#" class="text-white-50 text-decoration-none">Blog</a></li>
              <li class="mb-2"><a href="#" class="text-white-50 text-decoration-none">Travel Guides</a></li>
              <li class="mb-2"><a href="#" class="text-white-50 text-decoration-none">Community</a></li>
              <li class="mb-2"><a href="#" class="text-white-50 text-decoration-none">Support</a></li>
            </ul>
          </div>
          
          <!-- Links 3 -->
          <div class="col-lg-3 col-md-6">
            <h5 class="text-uppercase fw-bold mb-3">Company</h5>
            <ul class="list-unstyled">
              <li class="mb-2"><a href="#" class="text-white-50 text-decoration-none">About Us</a></li>
              <li class="mb-2"><a href="#" class="text-white-50 text-decoration-none">Contact</a></li>
              <li class="mb-2"><a href="#" class="text-white-50 text-decoration-none">Terms of Service</a></li>
              <li class="mb-2"><a href="#" class="text-white-50 text-decoration-none">Privacy Policy</a></li>
            </ul>
          </div>
        </div>
        
        <div class="mt-4 pt-4 border-top border-secondary">
          <p class="text-white-50">&copy; {{ new Date().getFullYear() }} JetSetGo. All rights reserved.</p>
        </div>
      </div>
    </footer>
  </template>
  
  <script>
  export default {
    name: "AppFooter"
  };
  </script>
  
  <style scoped>
  footer {
    background-color: #212529;
  }
  
  footer a:hover {
    color: #ffffff !important;
    transition: color 0.3s ease;
  }
  </style>