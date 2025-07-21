import os
import base64
from openai import OpenAI

# Set a mock API key (required by the client but not verified in our server)
os.environ["OPENAI_API_KEY"] = "dummy-api-key"

# Configure the client to use your custom endpoint instead of OpenAI's
client = OpenAI(
    api_key="dummy-api-key",  # Can be any string since we're not using actual OpenAI auth
    base_url="http://localhost:8000/v1"  # Point to your local SmolVLM2 server
)

# Function to encode images for base64 usage
def encode_image(image_path):
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

# Example with image URLs
response = client.chat.completions.create(
    model="smolvlm2-2.2b-instruct",  # This is just for reference, your server uses the loaded model
    messages=[
        {
            "role": "user",
            "content": [
                {
                    "type": "text", 
                    "text": "What is the similarity between these two images?"
                },
                {
                    "type": "image_url",
                    "image_url": {
                        "url": "https://huggingface.co/datasets/huggingface/documentation-images/resolve/main/bee.jpg"
                    }
                },
                {
                    "type": "image_url",
                    "image_url": {
                        "url": "https://huggingface.co/datasets/huggingface/documentation-images/resolve/0052a70beed5bf71b92610a43a52df6d286cd5f3/diffusers/rabbit.jpg"
                    }
                }
            ]
        }
    ],
    max_tokens=64
)

# Print the response
print(response.choices[0].message.content)

# Example with image URLs
response = client.chat.completions.create(
    model="smolvlm2-2.2b-instruct",  # This is just for reference, your server uses the loaded model
    messages=[
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "Can you describe this image?"
                },
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/jpeg;base64,{encode_image("image.png")}"
                    }
                }
            ]
        }
    ],
    max_tokens=2000
)

# Print the response
print(response.choices[0].message.content)

# Example with a local image (using base64)
"""
# Uncomment to use local images
image_path = "path/to/your/local/image.jpg"
base64_image = encode_image(image_path)

response = client.chat.completions.create(
    model="smolvlm2-2.2b-instruct",
    messages=[
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "Describe this image in detail"
                },
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/jpeg;base64,{base64_image}"
                    }
                }
            ]
        }
    ],
    max_tokens=100
)

print(response.choices[0].message.content)
"""