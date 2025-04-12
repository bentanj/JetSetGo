from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import os
import jwt
import logging

app = Flask(__name__)
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:8080"],  # Ensure this matches your frontend URL
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

logging.basicConfig(level=logging.INFO)  # Configure logging

# Environment Variables
JWT_SECRET = os.getenv('JWT_SECRET', 'esd_jwt_secret_key')
JWT_ALGORITHM = os.getenv('JWT_ALGORITHM', 'HS256')
PREFERENCES_SERVICE_URL = os.getenv('PREFERENCES_SERVICE_URL')
POST_SERVICE_URL = os.getenv('POST_SERVICE_URL') 

def verify_token(token):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        logging.info(f"JWT Payload: {payload}")
        return payload
    except jwt.ExpiredSignatureError:
        logging.warning("Token expired")
        return None
    except jwt.InvalidTokenError:
        logging.error("Invalid token")
        return None

def get_user_preferences(token):
    payload = verify_token(token)
    if not payload:
        return jsonify({'error': 'Invalid or expired token'}), 401
    uid = payload['user_id']
    url = f"{PREFERENCES_SERVICE_URL}/api/user/{uid}/taste-preferences"
    headers = {"Authorization": f"Bearer {token}"}
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()  # Raise an exception for bad status codes

        data = response.json()
        taste_preferences = data.get("taste_preferences", {})
        selected_keys = ["diet", "travel_style", "tourist_sites"]
        filtered_preferences = {
            key: [
                val for val in taste_preferences.get(key, []) 
                if val and val != "None"
            ]
            for key in selected_keys
        }
        return filtered_preferences

    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 401:
            logging.error("Authentication failed: Invalid token.")
        elif e.response.status_code == 403:
            logging.error("Unauthorized access to taste preferences.")
        elif e.response.status_code == 404:
            logging.error("User not found in taste preferences service.")
        elif e.response.status_code == 500:
            logging.error("Taste preferences service error.")
        else:
            logging.error(f"Error calling taste preferences service: {e}")

        return None

    except requests.exceptions.RequestException as e:
        logging.error(f"Error calling taste preferences service: {e}")
        return None

@app.route('/api/user/taste-preferences', methods=['GET'])
def get_preferences():
    logging.info("got user preference")
    token = request.headers.get('Authorization', '').split(' ')[-1]
    preferences = get_user_preferences(token)
    if preferences is None:
        return jsonify({'error': 'Could not retrieve preferences'}), 500
    return jsonify({'taste_preferences': preferences})

@app.route('/api/cposts', methods=['POST'])
def create_post():
    logging.info("Received create post request")
    # Auth check - this part works fine based on your logs
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'No token provided'}), 401
    token = auth_header.split(' ')[1]
    payload = verify_token(token)
    if not payload:
        return jsonify({'error': 'Invalid or expired token'}), 401

    user_id = payload['user_id']
    logging.info(f"Processing post for user: {user_id}")

    # Get form data
    title = request.form.get('title')
    content = request.form.get('content')
    location = request.form.get('location')
    
    logging.info(f"Post data: title={title}, location={location}")
    
    selected_preferences_str = request.form.get('selected_preferences', '')
    selected_preferences = selected_preferences_str.split(',') if selected_preferences_str else []
    logging.info(f"Selected preferences: {selected_preferences}")

    if not all([title, content]):
        return jsonify({'error': 'Missing required fields'}), 400

    final_preferences = selected_preferences 
    
    post_data = {
        'user_id': user_id,
        'title': title,
        'content': content,
        'location': location or '',
        'preferences': ','.join(final_preferences) if isinstance(final_preferences, list) else final_preferences
    }
    logging.info(f"Prepared post data: {post_data}")

    try:
        if not POST_SERVICE_URL:
            logging.error("POST_SERVICE_URL is not set")
            return jsonify({'error': 'POST_SERVICE_URL not configured'}), 501
            
        headers = {'Authorization': f'Bearer {token}'}
        post_url = f"{POST_SERVICE_URL}/api/posts"
        logging.info(f"Sending request to: {post_url}")
        
        files = {'image': request.files['image']} if 'image' in request.files else {}
        
        response = requests.post(post_url, data=post_data, headers=headers, files=files)
        logging.info(f"Post service response code: {response.status_code}")
        
        if response.status_code != 201:
            logging.error(f"Post service error: {response.text}")
            return jsonify({'error': 'Post MS failed', 'details': response.text}), 502
            
        return jsonify(response.json()), 201

    except Exception as e:
        logging.error(f"Post creation failed: {str(e)}")
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5005)  # Use a different port than preferences service