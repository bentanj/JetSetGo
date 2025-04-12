import json
import os
import requests
from amqp_lib import start_consuming_from_url

def notify_outsystems(event_type, data):
    print(f"Forwarding to OutSystems | Type: {event_type}")

    payload = {
        "event_type": event_type,
        "data": json.dumps(data) 
    }
    print("Sending payload:")
    print(json.dumps(payload, indent=2))

    headers = {
        "Content-Type": "application/json"
    }

    try:
        res = requests.post(
            os.environ['OUTSYSTEMS_NOTIFY_URL'],
            json=payload,
            headers=headers
        )
        print(f"Notification sent: {res.status_code}")
        print("OutSystems response:")
        print(res.text)
    except Exception as e:
        print("Failed to notify OutSystems:", str(e))

def callback(ch, method, properties, body):
    try:
        message = json.loads(body)
        event_type = message.get("event_type")
        data = message.get("data", {})
        print(f"New RabbitMQ Message: {event_type}")
        notify_outsystems(event_type, data)
    except Exception as e:
        print("Error processing message:", str(e))

if __name__ == "__main__":
    print("Listener is running... waiting for messages.")
    start_consuming_from_url(
        os.environ["AMQP_URL"],
        os.environ["RABBITMQ_QUEUE"],
        callback
    )
