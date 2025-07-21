# CameraGenAI/vlm/dummy_vlm.py
import base64
import time
import uuid
import random
from io import BytesIO

import requests
from flask import Flask, jsonify, request
from PIL import Image

app = Flask(__name__)


def process_base64_image(base64_string):
    """
    Convert a base64 string to a PIL Image.
    Args:
        base64_string (str): The base64 string of the image.
    Returns:
        PIL.Image: The image object.
    """

    if "base64," in base64_string:
        base64_string = base64_string.split("base64,")[1]
    image_bytes = base64.b64decode(base64_string)
    image = Image.open(BytesIO(image_bytes))
    return image


def process_image_url(url):
    response = requests.get(url)
    image = Image.open(BytesIO(response.content))
    return image


def generate_random_analysis():
    """Generate a random analysis result as a properly formatted string."""
    analysis = {
        "description": "This is a randomly generated description of the image content.",
        "fire": random.choice([True, False]),
        "gun": random.choice([True, False]),
        "theft": random.choice([True, False]),
        "medical": random.choice([True, False])
    }
    
    # Return as a string to match how a real LLM might respond
    return str(analysis).replace("'", "\"")


@app.route('/v1/chat/completions', methods=['POST'])
def chat_completions():
    data = request.json

    image_count = 0
    for msg in data['messages']:
        if isinstance(msg['content'], list):
            for item in msg['content']:
                if item['type'] == 'image_url':
                    image_count += 1
                    if image_count > 10:
                        return jsonify({"error": "Maximum 10 images allowed per request"}), 400

    # Generate a string response that complies with OpenAI format
    analysis_result = generate_random_analysis()

    # Calculate token counts based on the string length
    prompt_tokens = len(str(data['messages']))
    completion_tokens = len(analysis_result)

    response = {
        "id": f"chatcmpl-{uuid.uuid4()}",
        "object": "chat.completion",
        "created": int(time.time()),
        "model": "dummy-qwen-visual-model",
        "choices": [
            {
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": analysis_result  # Return as string, not object
                },
                "finish_reason": "stop"
            }
        ],
        "usage": {
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": prompt_tokens + completion_tokens
        }
    }

    return jsonify(response)


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000)