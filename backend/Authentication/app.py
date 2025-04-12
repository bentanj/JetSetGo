from flask import Flask, request, jsonify
from flask_cors import CORS
import jwt
import os
import requests
from datetime import datetime, timedelta
from supabase import create_client, Client
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
app.config['PROPAGATE_EXCEPTIONS'] = True  # add this
app.config['DEBUG'] = True  # optional: shows errors during dev
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:8080"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }
})
# Define the table name for authentication
AUTHENTICATION_TABLE = "authentication"

# Initialize Supabase client
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")

print(f"[DEBUG] Initializing Supabase client with URL: {supabase_url}")
try:
    # Initialize global Supabase client
    global supabase
    supabase = create_client(supabase_url, supabase_key)
    print("[DEBUG] Successfully initialized Supabase client")
    
    # Try to validate connection by performing a simple query
    print("[DEBUG] Validating Supabase connection...")
    test_response = supabase.table(AUTHENTICATION_TABLE).select("count").limit(1).execute()
    print(f"[DEBUG] Supabase connection test response: {test_response}")
except Exception as e:
    print(f"[ERROR] Failed to initialize Supabase client: {str(e)}")
    raise


# Define the table name for authentication
AUTHENTICATION_TABLE = "authentication"

# Kong API Gateway URL (adjust as needed)
KONG_URL = os.environ.get("KONG_URL", "http://localhost:8000")

# JWT verification and token_required decorator
def verify_token(token):
    try:
        payload = jwt.decode(
            token,
            os.getenv('JWT_SECRET', 'esd_jwt_secret_key'),
            algorithms=[os.getenv('JWT_ALGORITHM', 'HS256')]
        )
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'No token provided'}), 401
        
        token = auth_header.split(' ')[1]
        payload = verify_token(token)
        
        if not payload:
            return jsonify({'error': 'Invalid or expired token'}), 401
            
        request.user = payload
        return f(*args, **kwargs)
    return decorated

# User Registration (POST)
@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json()

    print("[DEBUG] Received data:", data)
    
    if not all(k in data for k in ['username', 'email', 'password']):
        return jsonify({'error': 'Missing required fields'}), 400
    
    try:
        password_hash = generate_password_hash(data['password'])  

        # Insert new user in auth database with is_first_login flag set to true
        print("[DEBUG] Attempting to insert user into Supabase")
        try:
            response = supabase.table(AUTHENTICATION_TABLE).insert({
                "username": data['username'],
                "email": data['email'],
                "password_hash": password_hash,
                "is_first_login": True  # Add is_first_login flag
            }).execute()
            print("[DEBUG] Supabase response:", response)
        except Exception as e:
            print(f"[ERROR] Supabase insert error: {str(e)}")
            raise

        # Check response before accessing it
        if not response.data or len(response.data) == 0:
            return jsonify({'error': 'Failed to register user'}), 500

        user = response.data[0]

        # Now create a user record in the user service through Kong
        try:
            # Prepare the data to send to user service
            user_data = {
                "user_id": user['id'],
                "email": user['email'],
                "username": user['username']
            }
            
            # Send request to user service through Kong
            user_service_response = requests.post(
                f"{KONG_URL}/api/internal/user/create",
                json=user_data,
                headers={"Content-Type": "application/json"}
            )
            
            # Check if user creation in user service was successful
            if user_service_response.status_code not in (200, 201):
                # If user service fails, we should log this but still return success
                # as the auth part worked
                print(f"Warning: User service creation failed: {user_service_response.text}")
        
        except Exception as e:
            # Log error but don't fail the registration if user service is unavailable
            print(f"Error creating user in user service: {str(e)}")
        
        return jsonify({
            'message': 'User registered successfully',
            'user': {
                'id': user['id'],
                'username': user['username'],
                'email': user['email'],
                'created_at': user['created_at'],
                'is_first_login': user['is_first_login']
            }
        }), 201
        
    except Exception as e:
        print(f"[ERROR] Registration error: {str(e)}")
        return jsonify({'error': str(e)}), 500

# User Login & JWT Token Generation (POST)
@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    
    if not all(k in data for k in ['username', 'password']):
        return jsonify({'error': 'Missing required fields'}), 400
    
    try:
        # Get user by username - now also selecting is_first_login
        response = supabase.table(AUTHENTICATION_TABLE).select('id, username, password_hash, is_first_login').eq(
            'username', data['username']
        ).execute()
        
        if not response.data:
            return jsonify({'error': 'Invalid credentials'}), 401
        
        user = response.data[0]
        
        # Verify password
        if not check_password_hash(user['password_hash'], data['password']):
            return jsonify({'error': 'Invalid credentials'}), 401
        
        # Get is_first_login value, default to True if not present for backward compatibility
        is_first_login = user.get('is_first_login', True)
        
        # Generate JWT token - now including is_first_login
        token = jwt.encode(
            {
                'user_id': user['id'],
                'username': user['username'],
                'is_first_login': is_first_login,  # Include is_first_login in token
                'exp': datetime.utcnow() + timedelta(days=1)
            },
            os.getenv('JWT_SECRET', 'esd_jwt_secret_key'),
            algorithm=os.getenv('JWT_ALGORITHM', 'HS256')
        )
        
        return jsonify({
            'token': token,
            'user': {
                'id': user['id'],
                'username': user['username'],
                'is_first_login': is_first_login  # Include in response
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Verify JWT Token (GET)
@app.route('/api/auth/verify-token', methods=['GET'])
def verify_token_endpoint():
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'No token provided'}), 401
    
    token = auth_header.split(' ')[1]
    
    try:
        payload = jwt.decode(
            token,
            os.getenv('JWT_SECRET', 'esd_jwt_secret_key'),
            algorithms=[os.getenv('JWT_ALGORITHM', 'HS256')]
        )
        return jsonify({'valid': True, 'user': payload}), 200
    except jwt.ExpiredSignatureError:
        return jsonify({'error': 'Token has expired'}), 401
    except jwt.InvalidTokenError:
        return jsonify({'error': 'Invalid token'}), 401

# Delete user from auth database (DELETE)
# This endpoint will be called by the user service after it deletes the user
@app.route('/api/auth/user/<user_id>', methods=['DELETE'])
@token_required
def delete_user(user_id):
    # Check if the user is deleting their own account
    if user_id != str(request.user["user_id"]):
        return jsonify({"error": "Unauthorized access"}), 403
    
    try:
        print(f"Attempting to delete user ID: {user_id} (type: {type(user_id)})")
        
        # Convert user_id to int if it's a string to match database type
        user_id_int = int(user_id) if isinstance(user_id, str) and user_id.isdigit() else user_id
        print(f"Converted user ID: {user_id_int} (type: {type(user_id_int)})")

        # First check if user exists in auth database
        check_result = supabase.table(AUTHENTICATION_TABLE).select("*").eq("id", user_id_int).execute()
        print(f"Check result: {check_result.data}")
        
        if len(check_result.data) == 0:
            return jsonify({"error": "User not found in auth database"}), 404

        # Get auth header for subsequent service calls
        auth_header = request.headers.get('Authorization')

        # Initialize response variables
        user_service_response = None
        itinerary_service_response = None
        social_service_response = None
        posts_service_response = None

        # Delete user from User service
        try:
            user_service_response = requests.delete(
                f"{KONG_URL}/api/user/{user_id}",
                headers={"Authorization": auth_header}
            )
            print(f"User service deletion response: {user_service_response.status_code} - {user_service_response.text}")
        except Exception as e:
            print(f"Error deleting user profile: {str(e)}")

        # Delete user's itineraries
        try:
            itinerary_service_response = requests.delete(
                f"{KONG_URL}/api/itineraries/{user_id}/all",
                headers={"Authorization": auth_header}
            )
            print(f"Itinerary service deletion response: {itinerary_service_response.status_code} - {itinerary_service_response.text}")
        except Exception as e:
            print(f"Error deleting user itineraries: {str(e)}")
        
        # Delete user's social data (likes and comments)
        try:
            social_service_response = requests.delete(
                f"{KONG_URL}/api/social/user/{user_id}",
                headers={"Authorization": auth_header}
            )
            print(f"Social service deletion response: {social_service_response.status_code} - {social_service_response.text}")
        except Exception as e:
            print(f"Error deleting user social data: {str(e)}")

        # Delete user posts
        try:
            posts_service_response = requests.delete(
                f"{KONG_URL}/api/posts/user/{user_id}",
                headers={"Authorization": auth_header}
            )
            print(f"Posts service deletion response: {posts_service_response.status_code} - {posts_service_response.text}")
        except Exception as e:
            print(f"Error deleting user posts: {str(e)}")
        # Store all service responses with detailed status
        service_responses = {}
        service_failures = []

        # Check User service
        if user_service_response is not None:
            service_responses["user_service"] = user_service_response.status_code
            if user_service_response.status_code not in [200, 204]:
                service_failures.append(f"user_service ({user_service_response.status_code})")
        else:
            service_responses["user_service"] = "unreachable"

        # Check Itinerary service
        if itinerary_service_response is not None:
            service_responses["itinerary_service"] = itinerary_service_response.status_code
            if itinerary_service_response.status_code not in [200, 204]:
                service_failures.append(f"itinerary_service ({itinerary_service_response.status_code})")
        else:
            service_responses["itinerary_service"] = "unreachable"

        # Check Social service
        if social_service_response is not None:
            service_responses["social_service"] = social_service_response.status_code
            if social_service_response.status_code not in [200, 204]:
                service_failures.append(f"social_service ({social_service_response.status_code})")
        else:
            service_responses["social_service"] = "unreachable"

        # Check Posts service
        if posts_service_response is not None:
            service_responses["posts_service"] = posts_service_response.status_code
            if posts_service_response.status_code not in [200, 204]:
                service_failures.append(f"posts_service ({posts_service_response.status_code})")
        else:
            service_responses["posts_service"] = "unreachable"

        if service_failures:
            error_msg = f"Failed to delete from services: {', '.join(service_failures)}"
            print(error_msg)
            return jsonify({"error": error_msg, "service_status": service_responses}), 500

        # All services processed, now delete from auth database
        result = supabase.table(AUTHENTICATION_TABLE).delete().eq("id", user_id_int).execute()
        print(f"Auth database delete result: {result.data}")
        
        if not result.data or len(result.data) == 0:
            return jsonify({"error": "Failed to delete user from auth database"}), 500
        
        # Return success with detailed status
        return jsonify({
            "message": "User and related data deleted successfully",
            "details": {
                "auth": "deleted",
                "services": service_responses
            }
        }), 200
        
    except Exception as e:
        print(f"Error deleting user from auth database: {str(e)}")
        return jsonify({"error": f"Error deleting user from auth database: {str(e)}"}), 500

# Add this new endpoint to update is_first_login status
@app.route('/api/auth/update-first-login', methods=['PUT'])
@token_required
def update_first_login():
    try:
        # Debug: Print the request.user object to see what we're working with
        print("[DEBUG] request.user:", request.user)
        
        # Get user_id from the token payload
        user_id = request.user.get('user_id')
        print("[DEBUG] Extracted user_id:", user_id)
        
        if not user_id:
            return jsonify({'error': 'User ID not found in token'}), 400
        
        # Convert user_id to int if it's a string
        if isinstance(user_id, str) and user_id.isdigit():
            user_id = int(user_id)
            print("[DEBUG] Converted user_id to int:", user_id)
        
        # Update the is_first_login flag to False
        print("[DEBUG] Executing Supabase query with user_id:", user_id)
        result = supabase.table(AUTHENTICATION_TABLE).update({
            "is_first_login": False
        }).eq("id", user_id).execute()
        
        print("[DEBUG] Supabase result:", result)
        
        if not result.data or len(result.data) == 0:
            print("[DEBUG] No data returned from update query")
            return jsonify({'error': 'Failed to update user status'}), 500
            
        return jsonify({
            'message': 'First login status updated successfully',
            'user_id': user_id
        }), 200
        
    except Exception as e:
        print("[DEBUG] Exception in update_first_login:", str(e))
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)
