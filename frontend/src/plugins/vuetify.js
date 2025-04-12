import 'vuetify/styles';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';

const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        dark: false,
        colors: {
          primary: '#6a80e0',
          secondary: '#8c9eff',
          accent: '#4CAF50',
          error: '#f44336',
          warning: '#ff9800',
          info: '#2196F3',
          success: '#4CAF50',
          // background: '#f8f9fd'
        }
      }
    }
  }
});

export default vuetify;