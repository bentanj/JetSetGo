from flask import Flask, request, jsonify
from flask_cors import CORS
from supabase import create_client, Client
import os
import jwt
import pika
import json
from urllib.parse import urlparse
from werkzeug.utils import secure_filename
from datetime import datetime


app = Flask(__name__)
CORS(app)

# Initialise Supabase
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(supabase_url, supabase_key)

# JWT verification
def verify_token(token):
    try:
        payload = jwt.decode(
            token,
            os.getenv('JWT_SECRET', 'esd_jwt_secret_key'),
            algorithms=[os.getenv('JWT_ALGORITHM', 'HS256')]
        )
        return payload
    except jwt.InvalidTokenError:
        return None

# RabbitMQ connection
def publish_notification(event_type, data):
    amqp_url = os.environ.get("AMQP_URL")
    params = pika.URLParameters(amqp_url)
    connection = pika.BlockingConnection(params)
    channel = connection.channel()
    channel.queue_declare(queue='notifications', durable=True)

    message = {
        "event_type": event_type,
        "data": data
    }
    channel.basic_publish(
        exchange='',
        routing_key='notifications',
        body=json.dumps(message),
        properties=pika.BasicProperties(delivery_mode=2)
    )
    connection.close()

@app.route('/api/social/like', methods=['POST'])
def like_post():
    token = request.headers.get('Authorization', '').split(' ')[-1]
    payload = verify_token(token)
    if not payload:
        return jsonify({'error': 'Invalid or missing token'}), 401

    post_id = request.json.get('post_id')
    if not post_id:
        return jsonify({'error': 'Missing post_id'}), 400

    # Get post owner from Supabase
    post_resp = supabase.table("post").select("user_id").eq("id", post_id).single().execute()
    if not post_resp.data:
        return jsonify({"error": "Post not found"}), 404

    post_owner_id = post_resp.data["user_id"]

    # Check if this user already liked the post
    existing_like = supabase.table("likes") \
        .select("*") \
        .eq("post_id", post_id) \
        .eq("liked_by_user_id", payload["user_id"]) \
        .execute()
    
    created_at = existing_like.data[0]['created_at'] if existing_like.data else datetime.now().isoformat()


    if existing_like.data:
        # Unlike: delete the like
        supabase.table("likes") \
            .delete() \
            .eq("post_id", post_id) \
            .eq("liked_by_user_id", payload["user_id"]) \
            .execute()

        return jsonify({'message': 'Post unliked'}), 200
    
    else: 
        # Insert like into Supabase
        supabase.table("likes").insert({
            "post_id": post_id,
            "liked_by_user_id": payload['user_id'],
            "liked_by_username": payload['username'],
            "post_owner_id": post_owner_id,
            
        }).execute()

        # Send event to RabbitMQ
        publish_notification("new_like", {
            "post_id": post_id,
            "liked_by_user_id": payload["user_id"],
            "liked_by_username": payload["username"],
            "post_owner_id": post_owner_id,
            "created_at": created_at
        })

        return jsonify({'message': 'Post liked'}), 201

@app.route('/api/social/comment', methods=['POST'])
def comment_post():
    # Auth check
    token = request.headers.get('Authorization', '').split(' ')[-1]
    payload = verify_token(token) #extracts the user_id and username from the token
    if not payload:
        return jsonify({'error': 'Invalid or missing token'}), 401

    # get the data from the frontend
    data=request.get_json()
    post_id = data.get('post_id')
    comment_text = data.get('comment')
    parent_comment_id = data.get('parent_comment_id')
    reply_to_user_id = data.get('reply_to_user_id')  # Only get user_id

    if not post_id or not comment_text:
        return jsonify({'error': 'Missing post_id or comment'}), 400 
    
    # Get post owner info
    post_resp = supabase.table("post").select("user_id").eq("id", post_id).single().execute()
    if not post_resp.data:
        return jsonify({"error": "Post not found"}), 404 
    post_owner_id = post_resp.data["user_id"]

    # gets the user_id of the parent comment if frontnend does not send it
    if not reply_to_user_id and parent_comment_id:
        parent_resp = supabase.table("comments").select("user_id").eq("id", parent_comment_id).single().execute()
        if parent_resp.data:
            reply_to_user_id = parent_resp.data["user_id"]

    # Insert comment (with reply info)
    result = supabase.table("comments").insert({
        "post_id": post_id,
        "user_id": payload['user_id'],
        "username": payload['username'],
        "comment_text": comment_text,
        "parent_comment_id": parent_comment_id,
        "reply_to_user_id": reply_to_user_id
    }).execute()

    created_at = result.data[0]['created_at'] if result.data else datetime.now().isoformat()

    if not result.data or len(result.data) == 0:
        return jsonify({'error': 'Failed to insert comment'}), 500

    comment_id = result.data[0]['id']

    if parent_comment_id:
        # 1.  a reply to a comment
        if reply_to_user_id and reply_to_user_id != payload['user_id']:
            # Notify the person being replied to
            publish_notification("comment_reply", {
                "recipient_id": reply_to_user_id,
                "post_id": post_id,
                "comment_id": comment_id,
                "comment_text": comment_text,
                "parent_comment_id": parent_comment_id,
                "replier_username": payload['username'],
                "replier_id": payload["user_id"],
                "created_at": created_at
            })
    else:
        # 2. new comment on the post
        if post_owner_id != payload['user_id']:
            # Notify the post owner
            publish_notification("new_comment", {
                "recipient_id": post_owner_id,
                "post_id": post_id,
                "comment_id": comment_id,
                "comment_text": comment_text,
                "commenter_username": payload['username'],
                "commenter_id": payload['user_id'],
                "created_at": created_at
            })

    return jsonify({
        'message': 'Comment added successfully',
        'comment': result.data[0]
    }), 201

# get likes for the post
@app.route('/api/social/likes/<post_id>', methods=['GET'])
def get_likes(post_id):
    token = request.headers.get('Authorization', '').split(' ')[-1]
    payload = verify_token(token)
    if not payload:
        return jsonify({'error': 'Invalid or missing token'}), 401

    try:
        # Get all likes for the post
        likes = supabase.table("likes") \
            .select("*") \
            .eq("post_id", post_id) \
            .execute()

        # Get if current user has liked the post - remove .single()
        user_like = supabase.table("likes") \
            .select("*") \
            .eq("post_id", post_id) \
            .eq("liked_by_user_id", payload['user_id']) \
            .execute()

        return jsonify({
            'likes': likes.data,
            'total_likes': len(likes.data),
            'has_liked': len(user_like.data) > 0  # Changed to check if any likes exist
        }), 200

    except Exception as e:
        print(f"Error in get_likes: {str(e)}")
        return jsonify({'error': str(e)}), 500

# get all the comments under the post
@app.route('/api/social/comments/<post_id>', methods=['GET'])
def get_comments(post_id):
    token = request.headers.get('Authorization', '').split(' ')[-1]
    payload = verify_token(token)
    if not payload:
        return jsonify({'error': 'Invalid or missing token'}), 401

    try:
        # Get all comments for the post
        comments = supabase.table("comments") \
            .select("*") \
            .eq("post_id", post_id) \
            .order("created_at", desc=False) \
            .execute()

        # If no comments exist, return empty array
        if not comments.data:
            return jsonify({
                'comments': []
            }), 200

        # Organize comments into a simplified structure
        structured_comments = []
        replies_map = {}

        for comment in comments.data:
            if comment.get('parent_comment_id') is None:
                # This is an original comment
                comment['replies'] = []
                structured_comments.append(comment)
                replies_map[comment['id']] = comment['replies']
            else:
                # This is a reply - add it to the parent's replies
                try:
                    # Find the original parent comment
                    original_parent_id = find_original_parent(comments.data, comment['parent_comment_id'])
                    if original_parent_id in replies_map:
                        # Don't modify the comment text here - the frontend will handle the mention
                        replies_map[original_parent_id].append(comment)
                except Exception as e:
                    print(f"Error processing reply {comment['id']}: {str(e)}")
                    continue

        # Sort replies by timestamp for each parent comment
        for comment in structured_comments:
            if 'replies' in comment:
                comment['replies'].sort(key=lambda x: x.get('created_at', ''))

        return jsonify({
            'comments': structured_comments
        }), 200

    except Exception as e:
        print(f"Error in get_comments: {str(e)}")
        import traceback
        print(traceback.format_exc())  # Print full stack trace
        return jsonify({'error': str(e)}), 500

def find_original_parent(comments, reply_id):
    """
    Recursively find the original parent comment ID
    """
    try:
        comment = next((c for c in comments if c['id'] == reply_id), None)
        if not comment or comment.get('parent_comment_id') is None:
            return reply_id
        return find_original_parent(comments, comment['parent_comment_id'])
    except Exception as e:
        print(f"Error in find_original_parent: {str(e)}")
        return reply_id

@app.route('/api/social/posts', methods=['DELETE'])
def delete_post_social_data():
    token = request.headers.get('Authorization', '').split(' ')[-1]
    payload = verify_token(token)
    if not payload:
        return jsonify({'error': 'Invalid or missing token'}), 401

    # Get post_id from request body
    data = request.get_json()
    if not data or 'post_id' not in data:
        return jsonify({'error': 'Missing post_id in request body'}), 400
    
    post_id = data['post_id']

    try:
        # Delete all likes for the post
        supabase.table("likes").delete().eq("post_id", post_id).execute()
        
        # Delete all comments for the post
        supabase.table("comments").delete().eq("post_id", post_id).execute()
        
        return jsonify({
            'message': 'Post social data deleted successfully'
        }), 200
        
    except Exception as e:
        print(f"Error deleting post social data: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/social/user/<user_id>', methods=['DELETE'])
def delete_user_social_data(user_id):
    print(f"\n=== Starting deletion of social data for user {user_id} ===")
    
    # Verify JWT token
    token = request.headers.get('Authorization', '').split(' ')[-1]
    payload = verify_token(token)
    if not payload:
        print("Invalid or missing token")
        return jsonify({'error': 'Invalid or missing token'}), 401

    # Check if the authenticated user matches the requested user_id
    if str(payload.get('user_id')) != str(user_id):
        print("User is not authorized to delete this data")
        return jsonify({'error': 'Unauthorized to delete this data'}), 403

    try:
        # Delete all likes by the user
        print(f"Deleting likes for user {user_id}")
        likes_result = supabase.table("likes").delete().eq("liked_by_user_id", user_id).execute()
        print(f"Likes deletion result: {likes_result}")

        # Delete all comments by the user
        print(f"Deleting comments for user {user_id}")
        comments_result = supabase.table("comments").delete().eq("user_id", user_id).execute()
        print(f"Comments deletion result: {comments_result}")

        return jsonify({
            'message': 'User social data deleted successfully',
            'details': {
                'likes_deleted': len(likes_result.data) if likes_result.data else 0,
                'comments_deleted': len(comments_result.data) if comments_result.data else 0
            }
        }), 200

    except Exception as e:
        print(f"Error deleting user social data: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5003)
