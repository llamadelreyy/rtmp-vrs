from openai import OpenAI
import os
import base64
from io import BytesIO
from PIL import Image
import requests

client = OpenAI(
    api_key="dummy-api-key",  # Can be any string since we're not using actual OpenAI auth
    base_url="http://localhost:8000/v1"  # Point to your local SmolVLM2 server
)

def encode_image_to_base64(image_path):
    """Encode an image to base64 string."""
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

def encode_image_from_url(image_url):
    """Download an image from URL and encode it to base64 string."""
    response = requests.get(image_url)
    img = Image.open(BytesIO(response.content))
    buffered = BytesIO()
    img.save(buffered, format=img.format)
    return base64.b64encode(buffered.getvalue()).decode('utf-8')

# Example: Using a local image file
image_path = "fire.webp"  # Replace with your image path
base64_image = encode_image_to_base64(image_path)

# Alternative: Using an image from URL
# image_url = "https://example.com/image.jpg"
# base64_image = encode_image_from_url(image_url)

prompt = '''
With given this json
{
"description": ,
"fire": ,
"gun": ,
"danger": ,
"theft": ,
"medical": ,
}
1) Fill in json key description with detailed description of what's in the picture.
2) For any fire, gun, danger, theft, medical items if appeared in the picture, fill json key with true if found in the image, else false.
Output as clean json only.
'''

# Create a message with both text and image
messages = [
    {
        "role": "user",
        "content": [            
            {
                "type": "image_url",
                "image_url": {
                    "url": f"data:image/jpeg;base64,{base64_image}"
                }
            },
            {"type": "text", "text": prompt}
        ]
    }
]

# Make the API call
try:
    response = client.chat.completions.create(
        model="Qwen2.5-VL-3B-Instruct",  # Make sure to use a vision-capable model
        messages=messages,
        max_tokens=2000,
        temperature=0.7,        # Balance between randomness and determinism
        top_p=0.9,              # Higher diversity in output
        frequency_penalty=0.2,  # Reduce repetition
        presence_penalty=0.3,   # Encourage new topics
        n=1                     # Generate one completion
    )
    
    # Print the response
    #print("Response from API:")
    print(response.choices[0].message.content)
    
except Exception as e:
    print(f"An error occurred: {e}")