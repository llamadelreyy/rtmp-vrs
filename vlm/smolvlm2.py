from flask import Flask, request, jsonify
from transformers import AutoProcessor, AutoModelForImageTextToText
import torch
import base64
import requests
from io import BytesIO
from PIL import Image
import time
import uuid

app = Flask(__name__)

# Load model and processor
#model_path = "SmolVLM2-2.2B-Instruct"
model_path = "SmolVLM2-256M-Video-Instruct"
processor = AutoProcessor.from_pretrained(model_path)
model = AutoModelForImageTextToText.from_pretrained(
    model_path, 
    torch_dtype=torch.bfloat16
).to("cuda")

def process_base64_image(base64_string):
    # Remove data URL prefix if present
    if "base64," in base64_string:
        base64_string = base64_string.split("base64,")[1]
    
    # Decode base64 to image
    image_bytes = base64.b64decode(base64_string)
    image = Image.open(BytesIO(image_bytes))
    return image

def process_image_url(url):
    response = requests.get(url)
    image = Image.open(BytesIO(response.content))
    return image

@app.route('/v1/chat/completions', methods=['POST'])
def chat_completions():
    start_time = time.time()
    data = request.json
    
    messages = []
    for msg in data['messages']:
        content = []
        
        # Handle different message formats
        if isinstance(msg['content'], str):
            content.append({"type": "text", "text": msg['content']})
        elif isinstance(msg['content'], list):
            for item in msg['content']:
                if item['type'] == 'text':
                    content.append({"type": "text", "text": item['text']})
                elif item['type'] == 'image_url':
                    if 'url' in item['image_url']:
                        # Handle URL images
                        image_url = item['image_url']['url']
                        content.append({"type": "image", "url": image_url})
                    elif 'base64' in item['image_url']:
                        # Handle base64 images - download and save temporarily or process directly
                        image_data = item['image_url']['base64']
                        image = process_base64_image(image_data)
                        # Save image temporarily and use local path
                        temp_path = f"temp_{uuid.uuid4()}.jpg"
                        image.save(temp_path)
                        content.append({"type": "image", "url": temp_path})
        
        messages.append({
            "role": msg['role'],
            "content": content
        })
    
    # Process through model
    inputs = processor.apply_chat_template(
        messages,
        add_generation_prompt=True,
        tokenize=True,
        return_dict=True,
        return_tensors="pt"
    ).to(model.device, dtype=torch.bfloat16)
    
    max_tokens = data.get('max_tokens', 64)
    temperature = data.get('temperature', 0)
    
    do_sample = temperature > 0
    
    generated_ids = model.generate(
        **inputs, 
        do_sample=do_sample,
        temperature=temperature,
        max_new_tokens=max_tokens
    )
    
    generated_text = processor.batch_decode(
        generated_ids, 
        skip_special_tokens=True
    )[0]
    
    # Format response to match OpenAI API
    response = {
        "id": f"chatcmpl-{uuid.uuid4()}",
        "object": "chat.completion",
        "created": int(time.time()),
        "model": "smolvlm2-2.2b-instruct",
        "choices": [
            {
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": generated_text
                },
                "finish_reason": "stop"
            }
        ],
        "usage": {
            "prompt_tokens": inputs['input_ids'].size(1),
            "completion_tokens": len(generated_ids[0]) - inputs['input_ids'].size(1),
            "total_tokens": len(generated_ids[0])
        }
    }
    
    return jsonify(response)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000)