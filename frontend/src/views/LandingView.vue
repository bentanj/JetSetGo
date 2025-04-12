<template>
    <div>
      <AppNavbar />
      
      <!-- Hero Section with Animations -->
      <section class="hero-section">
        <div class="container py-5">
          <div class="row align-items-center py-5">
            <div class="col-lg-6 mb-5 mb-lg-0" data-aos="fade-right" data-aos-delay="200">
              <h1 class="display-4 fw-bold text-start">
                Travel Smart with <span class="text-warning animate__animated animate__flash animate__delay-1s">AI-Powered</span> Itineraries
              </h1>
              <p class="lead text-light mt-4 text-start">
                JetSetGo helps you plan the perfect trip by analyzing your preferences and combining them with real-time data and community insights.
              </p>
              <div class="d-flex flex-column flex-sm-row mt-4 gap-3 text-start">
                <button @click="$router.push('/login')" class="btn btn-light btn-lg fw-semibold animate__animated animate__pulse animate__infinite animate__slower">
                  Create Now 
                </button>
              </div>
              <div class="mt-4 d-flex align-items-center text-start">
                <div class="user-avatars">
                  <img class="avatar animate__animated animate__bounceIn animate__delay-1s" src="../assets/avatar1.jpg" alt="User">
                  <img class="avatar animate__animated animate__bounceIn animate__delay-2s" src="../assets/avatar2.jpg" alt="User">
                  <img class="avatar animate__animated animate__bounceIn animate__delay-3s" src="../assets/avatar3.jpg" alt="User">
                </div>
                <p class="ms-3 pt-3 text-light">Joined by travelers around the world</p>
              </div>
            </div>
            <div class="col-lg-6 position-relative" data-aos="fade-left" data-aos-delay="400">
              <div class="app-preview animate__animated animate__fadeIn animate__delay-1s">
                <img src="../assets/banner1.png" alt="JetSetGo App" class="img-fluid rounded shadow">
              </div>
              <div class="app-glow"></div>
            </div>
          </div>
        </div>
        
        <!-- Wave Divider with Animation -->
        <div class="wave-divider">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 100" class="animate__animated animate__fadeIn">
            <path fill="#ffffff" fill-opacity="1" d="M0,64L80,69.3C160,75,320,85,480,80C640,75,800,53,960,48C1120,43,1280,53,1360,58.7L1440,64L1440,100L1360,100C1280,100,1120,100,960,100C800,100,640,100,480,100C320,100,160,100,80,100L0,100Z"></path>
          </svg>
        </div>
      </section>
      
      <!-- Features Section with Animations and Images Added -->
      <section class="py-5">
        <div class="container">
          <div class="text-center mb-5" data-aos="fade-up">
            <h2 class="display-5 fw-bold">Plan, Share, and Experience</h2>
            <p class="lead text-muted mx-auto" style="max-width: 700px;">
              Discover how JetSetGo transforms your travel planning experience with AI-powered recommendations and social features.
            </p>
          </div>
          
          <div class="row g-4">
            <!-- Feature 1 -->
            <div class="col-md-4" data-aos="zoom-in" data-aos-delay="200">
              <div class="card h-100 border-0 bg-light feature-card">
                <img src="../assets/AIbanner.png" class="card-img-top feature-image" alt="AI Itinerary">
                <div class="card-body p-4">
                  <div class="feature-icon bg-primary text-white mb-3">
                    <i class="fas fa-calendar-alt"></i>
                  </div>
                  <h3 class="card-title h5 fw-bold">AI-Powered Itineraries</h3>
                  <p class="card-text text-muted">
                    Our Gemini AI analyzes thousands of travel experiences to craft personalized itineraries that match your preferences and travel style.
                  </p>
                </div>
              </div>
            </div>
            
            <!-- Feature 2 -->
            <div class="col-md-4" data-aos="zoom-in" data-aos-delay="400">
              <div class="card h-100 border-0 bg-light feature-card">
                <img src="../assets/socialBanner.png" class="card-img-top feature-image" alt="Community">
                <div class="card-body p-4">
                  <div class="feature-icon bg-primary text-white mb-3">
                    <i class="fas fa-users"></i>
                  </div>
                  <h3 class="card-title h5 fw-bold">Community Insights</h3>
                  <p class="card-text text-muted">
                    Connect with fellow travelers, share experiences, and gain authentic insights to enhance your travel journey.
                  </p>
                </div>
              </div>
            </div>
            
            <!-- Feature 3 -->
            <div class="col-md-4" data-aos="zoom-in" data-aos-delay="600">
              <div class="card h-100 border-0 bg-light feature-card">
                <img src="../assets/realTimeBanner.png" class="card-img-top feature-image" alt="Real-time updates">
                <div class="card-body p-4">
                  <div class="feature-icon bg-primary text-white mb-3">
                    <i class="fas fa-chart-line"></i>
                  </div>
                  <h3 class="card-title h5 fw-bold">Real-Time Adaptations</h3>
                  <p class="card-text text-muted">
                    Stay flexible with real-time updates on weather, events, and local trends to optimize your trip as you go.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <!-- How It Works Section with Animations and Images Added -->
      <section class="py-5 bg-light">
        <div class="container">
          <div class="text-center mb-5" data-aos="fade-up">
            <h2 class="display-5 fw-bold">How JetSetGo Works</h2>
            <p class="lead text-muted mx-auto" style="max-width: 700px;">
              Our platform combines AI, community insights, and your preferences to create the perfect travel experience.
            </p>
          </div>
          
          <!-- Added connecting line visual -->
          <div class="process-path d-none d-md-block">
            <div class="process-line"></div>
          </div>
          
          <div class="row g-4">
            <div class="col-md-4 text-center" data-aos="fade-right" data-aos-delay="200">
              <div class="step-number animate__animated animate__bounce animate__delay-1s">1</div>
              <h3 class="mt-3 h5 fw-bold">Share Your Preferences</h3>
              <p class="text-muted">Tell us about your travel style, interests, budget, and must-see attractions.</p>
              <div class="step-image-container mt-4">
                <img src="../assets/share.png" alt="Share Preferences" class="step-image">
              </div>
            </div>
            <div class="col-md-4 text-center" data-aos="fade-up" data-aos-delay="400">
              <div class="step-number animate__animated animate__bounce animate__delay-2s">2</div>
              <h3 class="mt-3 h5 fw-bold">AI Creates Your Itinerary</h3>
              <p class="text-muted">Our Gemini AI analyzes data to craft a personalized journey just for you.</p>
              <div class="step-image-container mt-4">
                <img src="../assets/AI2.png" alt="AI Processing" class="step-image">
              </div>
            </div>
            <div class="col-md-4 text-center" data-aos="fade-left" data-aos-delay="600">
              <div class="step-number animate__animated animate__bounce animate__delay-3s">3</div>
              <h3 class="mt-3 h5 fw-bold">Explore and Customize</h3>
              <p class="text-muted">Fine-tune your itinerary, share with friends, and explore community insights.</p>
              <div class="step-image-container mt-4">
                <img src="../assets/custom.png" alt="Explore" class="step-image">
              </div>
            </div>
          </div>
          
          
        </div>
      </section>
      
      <!-- CTA Section with Animations -->
      <section class="cta-section py-5">
        <div class="container py-5">
          <div class="row justify-content-center">
            <div class="col-lg-8 text-center" data-aos="fade-up">
              <h2 class="display-5 fw-bold text-white">Ready to Transform Your Travel Experience?</h2>
              <p class="lead text-white-50 mt-3">
                Join thousands of travelers who are discovering the world through JetSetGo's AI-powered platform.
              </p>
              <div class="mt-5">
                <button @click="$router.push('/login')" class="btn btn-light btn-lg me-3 animate__animated animate__heartBeat animate__infinite animate__slower">Get Started Free</button>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <AppFooter />
    </div>
  </template>
  
  <script>
  import AppNavbar from '../components/NavBar.vue';
  import AppFooter from '../components/Footer.vue';
  import AOS from 'aos';
  import 'aos/dist/aos.css';
  import 'animate.css';
  
  export default {
    name: "LandingView",
    components: {
      AppFooter,
      AppNavbar
    },
    mounted() {
      AOS.init({
        duration: 1000,
        once: true,
        mirror: false
      });
    }
  };
  </script>
  
  <style scoped>
  /* Hero Section - Kept Untouched */
  .hero-section {
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    padding-top: 6rem;
    position: relative;
    overflow: hidden;
  }
  
  .wave-divider {
    position: relative;
    width: 100%;
    margin-bottom: -5px;
  }
  
  .app-preview {
    position: relative;
    z-index: 2;
    transition: transform 0.5s ease;
  }
  
  .app-preview:hover {
    transform: translateY(-10px);
  }
  
  .app-glow {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    background: linear-gradient(135deg, rgba(236, 72, 153, 0.3), rgba(99, 102, 241, 0.3));
    transform: rotate(6deg) translateY(-6%) scale(1.1);
    border-radius: 1rem;
    filter: blur(20px);
    z-index: 1;
    animation: glow 3s ease-in-out infinite alternate;
  }
  
  @keyframes glow {
    from {
      opacity: 0.5;
      transform: rotate(6deg) translateY(-6%) scale(1.1);
    }
    to {
      opacity: 0.8;
      transform: rotate(6deg) translateY(-8%) scale(1.15);
    }
  }
  
  /* User avatars */
  .user-avatars {
    display: flex;
  }
  
  .avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 2px solid white;
    margin-left: -10px;
    transition: transform 0.3s ease;
  }
  
  .avatar:hover {
    transform: scale(1.2);
    z-index: 3;
  }
  
  .avatar:first-child {
    margin-left: 0;
  }
  
  /* Feature icons */
  .feature-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    font-size: 1.5rem;
    transition: transform 0.3s ease, background-color 0.3s ease;
  }
  
  .feature-card:hover .feature-icon {
    transform: scale(1.1);
    background-color: #4f46e5;
  }
  
  /* Feature cards with added image styling */
  .feature-card {
    transition: transform 0.3s ease, box-shadow 0.3s ease;
    overflow: hidden;
  }
  
  .feature-card:hover {
    transform: translateY(-10px);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
  }
  
  .feature-image {
    height: 200px;
    object-fit: cover;
    transition: transform 0.5s ease;
  }
  
  .feature-card:hover .feature-image {
    transform: scale(1.05);
  }
  
  /* Steps with added image styling */
  .step-number {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background-color: #6366f1;
    color: white;
    font-weight: bold;
    font-size: 1.25rem;
    margin: 0 auto;
    transition: transform 0.3s ease, background-color 0.3s ease;
    position: relative;
    z-index: 2;
  }
  
  .step-number:hover {
    transform: scale(1.1);
    background-color: #4f46e5;
  }
  
  .step-image-container {
    width: 100%;
    height: 180px;
    overflow: hidden;
    border-radius: 8px;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  }
  
  .step-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.5s ease;
  }
  
  .step-image-container:hover .step-image {
    transform: scale(1.1);
  }
  
  /* Process path connecting the steps */
  .process-path {
    position: relative;
    z-index: 1;
  }
  
  .process-line {
    position: absolute;
    top: 25px;
    left: 16.66%;
    right: 16.66%;
    height: 3px;
    background: #e5e7eb;
  }
  
  .process-line:before {
    content: '';
    position: absolute;
    top: -3.5px;
    left: 0;
    height: 10px;
    width: 10px;
    background-color: #e5e7eb;
    border-radius: 50%;
  }
  
  .process-line:after {
    content: '';
    position: absolute;
    top: -3.5px;
    right: 0;
    height: 10px;
    width: 10px;
    background-color: #e5e7eb;
    border-radius: 50%;
  }
  
  /* Testimonials */
  .testimonial-avatar {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    object-fit: cover;
    transition: transform 0.3s ease;
  }
  
  .testimonial-avatar:hover {
    transform: scale(1.1);
  }
  
  /* CTA Section */
  .cta-section {
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    position: relative;
    overflow: hidden;
  }
  
  .cta-section::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(circle, transparent 20%, #6366f1 70%);
    background-size: 20px 20px;
    opacity: 0.1;
    animation: backgroundMove 30s linear infinite;
  }
  
  @keyframes backgroundMove {
    0% {
      background-position: 0 0;
    }
    100% {
      background-position: 500px 500px;
    }
  }
  
  /* Buttons */
  .btn {
    transition: transform 0.3s ease, box-shadow 0.3s ease;
  }
  
  .btn:hover {
    transform: translateY(-3px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
  }
  
  /* Responsive adjustments */
  @media (max-width: 767.98px) {
    .hero-section {
      text-align: center;
    }
    
    .user-avatars {
      justify-content: center;
    }
    
    .app-glow {
      display: none;
    }
    
    .step-image-container {
      height: 150px;
      max-width: 250px;
      margin: 0 auto;
    }
  }
  </style>