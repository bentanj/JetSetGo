from flask import Flask, request, jsonify
import os
import json
import logging
import requests
from supabase import create_client, Client
from datetime import datetime
import jwt
from functools import wraps

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Initialize Supabase client
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(supabase_url, supabase_key)

# Define the table name for users
USER_TABLE = "user"

# Kong API Gateway URL
KONG_URL = os.environ.get("KONG_URL", "http://localhost:8000")

def verify_token(token):
    try:
        payload = jwt.decode(
            token,
            os.getenv('JWT_SECRET', 'esd_jwt_secret_key'),
            algorithms=[os.getenv('JWT_ALGORITHM', 'HS256')]
        )
        print("JWT Payload:", payload)  # Debug log
        return payload
    except jwt.ExpiredSignatureError:
        print("Token expired")  # Debug log
        return None
    except jwt.InvalidTokenError:
        print("Invalid token")  # Debug log
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

# This endpoint is called by the auth service through Kong
@app.route('/api/users/create', methods=['POST'])
@token_required
def create_user():
    data = request.get_json()
    required_fields = ['user_id', 'username']
    
    if not all(field in data for field in required_fields):
        return jsonify({"error": "Missing required fields"}), 400

    try:
        check_result = supabase.table(USER_TABLE).select("*").eq("userId", data["user_id"]).execute()
        
        if len(check_result.data) > 0:
            return jsonify({"message": "User already exists", "user": check_result.data[0]}), 409
        
        user_data = {
            "userId": data["user_id"],
            "username": data["username"],
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "taste_preferences": data.get("taste_preferences", {})
        }
        
        result = supabase.table(USER_TABLE).insert(user_data).execute()

        if len(result.data) == 0:
            return jsonify({"error": "Failed to create user"}), 501

        return jsonify({"message": "User created successfully", "user": result.data[0]}), 201

    except Exception as e:
        logger.error(f"Error creating user: {str(e)}")
        return jsonify({"error": f"Error creating user: {str(e)}"}), 500

@app.route("/api/user/<user_id>", methods=["GET"])
@token_required
def get_user(user_id):
    # Check if the user is requesting their own profile
    if user_id != str(request.user["user_id"]):
        return jsonify({"error": "Unauthorized access"}), 403
    
    try:
        result = supabase.table(USER_TABLE).select("*").eq("userId", user_id).execute()

        if len(result.data) == 0:
            return jsonify({"error": "User not found"}), 404

        return jsonify({"user": result.data[0]}), 200
    except Exception as e:
        logger.error(f"Error fetching user: {str(e)}")
        return jsonify({"error": f"Error fetching user: {str(e)}"}), 500

@app.route("/api/user/<user_id>/taste-preferences", methods=["GET"])
@token_required
def get_taste_preferences(user_id):
    # Check if the user is requesting their own taste preferences
    if user_id != str(request.user["user_id"]):
        return jsonify({"error": "Unauthorized access"}), 403
    
    try:
        result = supabase.table(USER_TABLE).select("taste_preferences").eq("userId", user_id).execute()

        if len(result.data) == 0:
            return jsonify({"error": "User not found"}), 404

        # Return the taste_preferences as a JSON object
        taste_preferences = result.data[0].get("taste_preferences", {})
        return jsonify({"taste_preferences": taste_preferences}), 200
    except Exception as e:
        logger.error(f"Error fetching taste preferences: {str(e)}")
        return jsonify({"error": f"Error fetching taste preferences: {str(e)}"}), 500

@app.route("/api/user/<user_id>/taste-preferences", methods=["PUT"])
@token_required
def update_taste_preferences(user_id):
    # Check if the user is updating their own taste preferences
    if user_id != str(request.user["user_id"]):
        return jsonify({"error": "Unauthorized access"}), 403
    
    data = request.json
    if not data:
        return jsonify({"error": "No preferences data provided"}), 400
    
    try:
        check_result = supabase.table(USER_TABLE).select("*").eq("userId", user_id).execute()
        
        if len(check_result.data) == 0:
            return jsonify({"error": "User not found"}), 404
        
        update_data = {
            "updated_at": datetime.now().isoformat(),
            "taste_preferences": data
        }
            
        result = supabase.table(USER_TABLE).update(update_data).eq("userId", user_id).execute()
        
        if len(result.data) == 0:
            return jsonify({"error": "Failed to update preferences"}), 501
            
        return jsonify({
            "message": "Preferences updated successfully",
            "taste_preferences": result.data[0]["taste_preferences"]
        }), 200
        
    except Exception as e:
        logger.error(f"Error updating taste preferences: {str(e)}")
        return jsonify({"error": f"Error updating taste preferences: {str(e)}"}), 500


@app.route("/api/user/<user_id>", methods=["DELETE"])
@token_required
def delete_user(user_id):
    # Check if the user is deleting their own profile
    if user_id != str(request.user["user_id"]):
        return jsonify({"error": "Unauthorized access"}), 403
    
    try:
        # First check if user exists
        check_result = supabase.table(USER_TABLE).select("*").eq("userId", user_id).execute()
        
        if len(check_result.data) == 0:
            return jsonify({"error": "User not found"}), 404
        
        # Delete the user from the user service database
        result = supabase.table(USER_TABLE).delete().eq("userId", user_id).execute()
        
        if len(result.data) == 0:
            return jsonify({"error": "Failed to delete user from user service"}), 500
        
        # After successful deletion from user service, request deletion from auth service through Kong
        # Only handle user profile deletion
        
        return jsonify({"message": "User deleted successfully"}), 200
        
    except Exception as e:
        logger.error(f"Error deleting user: {str(e)}")
        return jsonify({"error": f"Error deleting user: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5002, debug=True)