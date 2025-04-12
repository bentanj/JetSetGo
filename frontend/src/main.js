import { createApp } from 'vue';
import App from './App.vue';
import router from './router'; // Import your router
import vuetify from './plugins/vuetify';
import '@mdi/font/css/materialdesignicons.css'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import 'animate.css';
import '@fortawesome/fontawesome-free/css/all.min.css';



import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faHeart } from '@fortawesome/free-solid-svg-icons'
import { faHeart as faHeartRegular } from '@fortawesome/free-regular-svg-icons'
import { faComment } from '@fortawesome/free-regular-svg-icons'

library.add(faHeart, faComment, faHeartRegular)

const app = createApp(App);
app.use(router); // Use the router
app.use(vuetify)
app.component('font-awesome-icon', FontAwesomeIcon);
app.mount('#app');
