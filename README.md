# G3T1 Travel Planner

## Getting Started

### Frontend Setup
1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start development server:
```bash
npm run dev
```

### Backend Setup
1. Make sure Docker Desktop is running
2. From the root directory, start the backend services:
```bash
docker-compose up -d --build
```

### Environment Variables
`/frontend`:
VUE_APP_GEOAPIFY_API_KEY=<secret_key>

`/backend/ai-microservice`
GEMINI_API_KEY = <secret_key>
GOOGLE_CLOUD_PROJECT_ID = <secret_key>
PORT = 3000
PLACES_MICROSERVICE_URL = http://localhost:4500
USER_SERVICE_URL = http://localhost:8000
JWT_SECRET = <secret_key>
JWT_ALGORITHM = HS256

`/backend/Authentication`
JWT_SECRET = <secret_key>
JWT_ALGORITHM = HS256
SUPABASE_URL = https://rnzufiqdpsgyatqpjuvm.supabase.co
SUPABASE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuenVmaXFkcHNneWF0cXBqdXZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE5MTY0NTQsImV4cCI6MjA1NzQ5MjQ1NH0.zUJBI37FlfJWnRu_rFzjd_3tljI_1ZhAyHajIv7yQX4

`/backend/create`
JWT_SECRET = <secret_key>
JWT_ALGORITHM = HS256

`/backend/itinerary-service`
JWT_SECRET = <secret_key>
JWT_ALGORITHM = HS256
SUPABASE_URL = https://rnzufiqdpsgyatqpjuvm.supabase.co
SUPABASE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuenVmaXFkcHNneWF0cXBqdXZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE5MTY0NTQsImV4cCI6MjA1NzQ5MjQ1NH0.zUJBI37FlfJWnRu_rFzjd_3tljI_1ZhAyHajIv7yQX4
ITINERARIES_TABLE = itineraries
PORT = 5400

`/backend/location`
PORT = 4500
GOOGLE_PLACES_API_KEY = <secret_key>

`/backend/post`
JWT_SECRET = <secret_key>
JWT_ALGORITHM = HS256
CLOUDINARY_CLOUD_NAME = <secret_key>
CLOUDINARY_API_KEY = <secret_key>
CLOUDINARY_API_SECRET = <secret_key>
SUPABASE_URL = https://rnzufiqdpsgyatqpjuvm.supabase.co
SUPABASE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuenVmaXFkcHNneWF0cXBqdXZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE5MTY0NTQsImV4cCI6MjA1NzQ5MjQ1NH0.zUJBI37FlfJWnRu_rFzjd_3tljI_1ZhAyHajIv7yQX4

`/backend/RabbitMQListener`
# AMQP URL
AMQP_URL = <secret_key>
# Queue name 
RABBITMQ_QUEUE = notifications
# OutSystems Notification API
OUTSYSTEMS_NOTIFY_UR = https://personal-nrm7dwxa.outsystemscloud.com/NotificationService/rest/NotificationAPI/notifications

`/backend/Social`
AMQP_URL = <secret_key>
JWT_SECRET = <secret_key>
JWT_ALGORITHM = HS256
SUPABASE_URL = https://rnzufiqdpsgyatqpjuvm.supabase.co
SUPABASE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuenVmaXFkcHNneWF0cXBqdXZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE5MTY0NTQsImV4cCI6MjA1NzQ5MjQ1NH0.zUJBI37FlfJWnRu_rFzjd_3tljI_1ZhAyHajIv7yQX4


`backend/User`
JWT_SECRET = <secret_key>
JWT_ALGORITHM = HS256
SUPABASE_URL = https://rnzufiqdpsgyatqpjuvm.supabase.co
SUPABASE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuenVmaXFkcHNneWF0cXBqdXZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE5MTY0NTQsImV4cCI6MjA1NzQ5MjQ1NH0.zUJBI37FlfJWnRu_rFzjd_3tljI_1ZhAyHajIv7yQX4

#### Stop Services
```bash
# Stop all services but keep data
docker-compose down

# Stop all services and delete all data
docker-compose down -v
```

#### View Logs
```bash
# View logs of all services
docker-compose logs

# View logs of specific service
docker-compose logs post-service

# Follow logs in real-time
docker-compose logs -f
``