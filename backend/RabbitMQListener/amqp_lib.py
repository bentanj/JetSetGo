"""
Reusable AMQP-related functions

References:
https://pika.readthedocs.io/en/stable/_modules/pika/exceptions.html#ConnectionClosed
"""

import time
import pika


def connect_from_url(amqp_url, max_retries=12, retry_interval=5):
    retries = 0

    while retries < max_retries:
        retries += 1
        try:
            print(f"Connecting to RabbitMQ via URL...")
            params = pika.URLParameters(amqp_url)
            connection = pika.BlockingConnection(params)
            
            if connection.is_open:
                print("✅ Connected to RabbitMQ successfully.")
            else:
                print("❌ Connection object exists but not open.")
            channel = connection.channel()

            print("Connected via AMQP_URL.")
            return connection, channel

        except pika.exceptions.AMQPConnectionError as exception:
            print(f"Failed to connect: {exception=}")
            print(f"Retrying in {retry_interval} seconds... ({retries}/{max_retries})")
            time.sleep(retry_interval)

    raise Exception(f"Max {max_retries} retries exceeded.")


def start_consuming_from_url(amqp_url, queue_name, callback):
    while True:
        try:
            connection, channel = connect_from_url(amqp_url)

            print(f"Consuming from queue: {queue_name}")
            channel.basic_consume(
                queue=queue_name, on_message_callback=callback, auto_ack=True
            )
            channel.start_consuming()

        except pika.exceptions.ChannelClosedByBroker as exception:
            message = f"Queue {queue_name} not found."
            connection.close()
            raise Exception(message) from exception

        except pika.exceptions.ConnectionClosedByBroker:
            print("Connection closed. Reconnecting...")
            continue

        except KeyboardInterrupt:
            channel.close()
            connection.close()
            break