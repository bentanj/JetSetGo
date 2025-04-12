from flask import Flask, request, jsonify
from flask_cors import CORS
import jwt
import os
from datetime import datetime
import time
from werkzeug.utils import secure_filename
import cloudinary
import cloudinary.uploader
from supabase import create_client, Client

app = Flask(__name__)
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:8080"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# Configure Cloudinary
cloudinary.config(
    cloud_name = os.getenv('CLOUDINARY_CLOUD_NAME'),
    api_key = os.getenv('CLOUDINARY_API_KEY'),
    api_secret = os.getenv('CLOUDINARY_API_SECRET')
)

# Set maximum file size to 10MB
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024  # 10MB in bytes

# Initialize Supabase client
supabase_url = os.environ.get("SUPABASE_URL", "your-supabase-url")
supabase_key = os.environ.get("SUPABASE_KEY", "your-supabase-anon-key")
supabase: Client = create_client(supabase_url, supabase_key)

# Define the table name for posts
POSTS_TABLE = "post"

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

@app.route('/api/posts', methods=['POST'])
def create_post():
    # Verify JWT token
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'No token provided'}), 401
    
    token = auth_header.split(' ')[1]
    payload = verify_token(token)
    
    if not payload:
        return jsonify({'error': 'Invalid or expired token'}), 401

    # Get form data
    title = request.form.get('title')
    content = request.form.get('content')
    location = request.form.get('location')
    preferences = request.form.get('preferences') 

    
    if not all([title, content]):
        return jsonify({'error': 'Missing required fields'}), 400

    try:
        image_url = None
        # Handle image upload if present
        if 'image' in request.files:
            file = request.files['image']
            if file.filename != '':
                # Upload to Cloudinary
                upload_result = cloudinary.uploader.upload(file)
                image_url = upload_result['secure_url']
        
        # Create post data object
        post_data = {
            'user_id': payload['user_id'],
            'username': payload['username'],
            'title': title,
            'content': content,
            'location': location,
            'preferences': preferences,
            'image_url': image_url,
            'created_at': datetime.now().isoformat()
        }
        
        # Insert data into Supabase
        response = supabase.table(POSTS_TABLE).insert(post_data).execute()
        
        # Get the created post from the response
        new_post = response.data[0]
        
        return jsonify({
            'message': 'Post created successfully',
            'post': {
                'id': new_post['id'],
                'title': new_post['title'],
                'content': new_post['content'],
                'image_url': new_post['image_url'],
                'created_at': new_post['created_at'],
                'user_id': new_post['user_id'],
                'username': new_post['username']
            }
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

    
@app.route('/api/posts', methods=['GET'])
def get_posts():
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'No token provided'}), 401
    token = auth_header.split(' ')[1]
    payload = verify_token(token)
    if not payload:
        return jsonify({'error': 'Invalid or expired token'}), 401
    try:
        # Fetch all posts first
        response = supabase.table(POSTS_TABLE).select('*').order('created_at', desc=True).execute()
        posts = response.data
        
        # Filter in Python instead of SQL if tags are provided
        tags_param = request.args.get('tags')
        if tags_param:
            tags = [tag.strip().lower() for tag in tags_param.split(',') if tag.strip()]
            filtered_posts = []
            for post in posts:
                # Handle case where preferences might be None
                preferences = (post.get('preferences') or '').lower()
                if any(tag in preferences for tag in tags):
                    filtered_posts.append(post)
            posts = filtered_posts
        
        return jsonify({
            'posts': [{
                'id': post['id'],
                'title': post['title'],
                'content': post['content'],
                'image_url': post['image_url'],
                'created_at': post['created_at'],
                'user_id': post['user_id'],
                'username': post['username'],
                'preference': [tag.strip() for tag in (post.get('preferences') or '').split(',') if tag],
                'location': post['location']
            } for post in posts]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/posts/user/<int:user_id>', methods=['GET'])
def get_user_posts(user_id):
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'No token provided'}), 401
    
    token = auth_header.split(' ')[1]
    payload = verify_token(token)
    
    if not payload:
        return jsonify({'error': 'Invalid or expired token'}), 401
    
    try:
        # Query user's posts from Supabase
        response = supabase.table(POSTS_TABLE).select('*').eq('user_id', user_id).order('created_at', desc=True).execute()
        
        posts = response.data
        
        # Get the username from the first post or use the token if no posts
        username = posts[0]['username'] if posts else payload['username']
        
        return jsonify({
            'username': username,
            'posts': [{
                'id': post['id'],
                'title': post['title'],
                'content': post['content'],
                'image_url': post['image_url'],
                'created_at': post['created_at'],
                'user_id': post['user_id'],
                'username': post['username']
            } for post in posts]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/posts', methods=['DELETE'])
def delete_post():
    print("\n=== Starting delete_post request ===")
    print("Headers:", dict(request.headers))
    print("Request data:", request.get_data(as_text=True))
    
    # Verify JWT token
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        print("No token provided")
        return jsonify({'error': 'No token provided'}), 401
    
    token = auth_header.split(' ')[1]
    payload = verify_token(token)
    print("JWT Payload:", payload)
    
    if not payload:
        print("Invalid or expired token")
        return jsonify({'error': 'Invalid or expired token'}), 401

    # Get post_id from request body
    try:
        data = request.get_json()
        print("Parsed request body:", data)
        if not data or 'post_id' not in data:
            print("Missing post_id in request body")
            return jsonify({'error': 'Missing post_id in request body'}), 400
        
        post_id = data['post_id']
        print(f"Attempting to delete post {post_id}")

        # First, get the post to check ownership
        print("Fetching post from Supabase...")
        post_response = supabase.table(POSTS_TABLE).select('*').eq('id', post_id).execute()
        print("Post response data:", post_response.data)
        
        if not post_response.data:
            print(f"Post {post_id} not found")
            return jsonify({'error': 'Post not found'}), 404
        
        post = post_response.data[0]
        print(f"Post data: {post}")
        print(f"Post owner ID: {post.get('user_id')} (type: {type(post.get('user_id'))})")
        print(f"Current user ID: {payload.get('user_id')} (type: {type(payload.get('user_id'))})")
        
        # Check if the user is the owner of the post (convert both to integers for comparison)
        try:
            post_owner_id = int(str(post.get('user_id')))
            current_user_id = int(str(payload.get('user_id')))
            print(f"Comparing post owner ID {post_owner_id} with current user ID {current_user_id}")
            
            if str(post.get('user_id')) != str(payload.get('user_id')):
                print("User is not authorized to delete this post")
                return jsonify({'error': 'Unauthorized to delete this post'}), 403
            
            # Delete the post from Supabase
            print("Deleting post from Supabase...")
            supabase.table(POSTS_TABLE).delete().eq('id', post_id).execute()
            print("Post deleted successfully")
            
            return jsonify({
                'message': 'Post deleted successfully'
            }), 200
        except (ValueError, TypeError) as e:
            print(f"Error converting user IDs: {str(e)}")
            return jsonify({'error': 'Error comparing user IDs'}), 500
        
    except Exception as e:
        print(f"Error in delete_post: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

# Delete all posts for a user
@app.route('/api/posts/user/<user_id>', methods=['DELETE'])
def delete_user_posts(user_id):
    print(f"\n=== Starting delete_user_posts request for user {user_id} ===")
    
    # Verify JWT token
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        print("No token provided")
        return jsonify({'error': 'No token provided'}), 401
    
    token = auth_header.split(' ')[1]
    payload = verify_token(token)
    print("JWT Payload:", payload)
    
    if not payload:
        print("Invalid or expired token")
        return jsonify({'error': 'Invalid or expired token'}), 401

    # Check if the authenticated user matches the requested user_id
    if str(payload.get('user_id')) != str(user_id):
        print("User is not authorized to delete these posts")
        return jsonify({'error': 'Unauthorized to delete these posts'}), 403

    try:
        # Delete all posts for the user
        print(f"Deleting all posts for user {user_id}")
        result = supabase.table(POSTS_TABLE).delete().eq('user_id', user_id).execute()
        
        print(f"Deletion result: {result}")
        return jsonify({
            'message': 'All posts deleted successfully'
        }), 200
        
    except Exception as e:
        print(f"Error deleting posts: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)