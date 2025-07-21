# qwen_vl_api.py
import os
import base64
import uvicorn
import logging
from typing import List, Literal, Optional, Union, Dict, Any
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import torch
from transformers import Qwen2_5_VLForConditionalGeneration, AutoProcessor
from PIL import Image
import io
import time
import json
import requests
from contextlib import asynccontextmanager

# Import utility for processing vision information
from qwen_vl_utils import process_vision_info

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("qwen-vl-api")

# Define the lifespan context manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load model on startup
    load_model()
    yield
    # Clean up resources if needed
    # This section runs on shutdown

app = FastAPI(title="Qwen2.5-VL API", lifespan=lifespan)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model = None
processor = None

def load_model():
    global model, processor
    if model is None:  # Only load if not already loaded
        logger.info("Loading Qwen2.5-VL-3B model...")
        model = Qwen2_5_VLForConditionalGeneration.from_pretrained(
            "Qwen2.5-VL-3B-Instruct", torch_dtype="auto", device_map="auto"
        )
        processor = AutoProcessor.from_pretrained("Qwen2.5-VL-3B-Instruct")
        logger.info("Model loaded successfully!")


# Define model metadata
MODEL_ID = "Qwen2.5-VL-3B-Instruct"
MODEL_METADATA = {
    "id": MODEL_ID,
    "object": "model",
    "created": int(time.time()),
    "owned_by": "alibaba",
    "permission": [],
    "root": MODEL_ID,
    "parent": None,
}

# Function to resize image to a smaller size
def resize_image(image_path):
    try:
        img = Image.open(image_path)
        # Convert to RGB if needed
        if img.mode in ('P', 'RGBA', 'LA'):
            img = img.convert('RGB')
        
        # Calculate new height to maintain aspect ratio
        width, height = img.size
        new_width = 800
        
        # Only resize if the image is larger than the target width
        if width > new_width:
            new_height = int((height / width) * new_width)
            # Resize image maintaining aspect ratio
            resized_img = img.resize((new_width, new_height), Image.LANCZOS)
            # Save the resized image
            resized_img.save(image_path, format="JPEG")
            logger.info(f"Resized image from {width}x{height} to {new_width}x{new_height}: {image_path}")
        else:
            logger.info(f"No resize needed, image already {width}x{height}: {image_path}")
            
        return image_path
    except Exception as e:
        logger.error(f"Error resizing image {image_path}: {e}")
        return None

# Custom exception handler
@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error(f"Exception occurred: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": {"message": str(exc), "type": type(exc).__name__}},
    )

@app.get("/v1/models")
async def list_models():
    """OpenAI-compatible endpoint to list available models"""
    logger.info("Models list requested")
    return {
        "object": "list",
        "data": [MODEL_METADATA],
    }

@app.get("/v1/models/{model_id}")
async def get_model(model_id: str):
    """OpenAI-compatible endpoint to get model information"""
    logger.info(f"Model information requested for: {model_id}")
    if model_id.lower() == MODEL_ID or model_id.lower() == "Qwen2.5-VL-3B-Instruct":
        return MODEL_METADATA
    else:
        raise HTTPException(status_code=404, detail=f"Model '{model_id}' not found")

@app.post("/v1/chat/completions")
async def create_chat_completion(request: Request):
    try:
        # Get the raw request body
        body = await request.json()
        logger.info(f"Received request with model: {body.get('model', 'Qwen2.5-VL-3B-Instruct')}")
        
        model_name = body.get("model", "Qwen2.5-VL-3B-Instruct")
        messages = body.get("messages", [])
        max_tokens = body.get("max_tokens", 256)
        temperature = body.get("temperature", 0.7)
        n = body.get("n", 1)
        stream = body.get("stream", False)
        
        logger.info(f"Request parameters: max_tokens={max_tokens}, temperature={temperature}, n={n}, stream={stream}")
        
        if stream:
            logger.warning("Streaming requested but not supported")
            raise HTTPException(status_code=400, detail="Streaming is not supported yet")
        
        # Convert OpenAI-style messages to Qwen format
        logger.info(f"Converting {len(messages)} messages to Qwen format")
        qwen_messages = []
        temp_files = []  # Track temporary files for cleanup
        
        for i, message in enumerate(messages):
            role = message.get("role")
            content = message.get("content")
            
            logger.info(f"Processing message {i+1} with role: {role}")
            
            if isinstance(content, str):
                logger.debug(f"Simple text message: {content[:50]}...")
                qwen_messages.append({
                    "role": role,
                    "content": [{"type": "text", "text": content}]
                })
            else:  # List of content parts
                logger.info(f"Processing multipart message with {len(content)} parts")
                qwen_content = []
                for j, part in enumerate(content):
                    part_type = part.get("type")
                    logger.info(f"Processing part {j+1} of type: {part_type}")
                    
                    if part_type == "text":
                        text_content = part.get("text", "")
                        logger.debug(f"Text content: {text_content[:50]}...")
                        qwen_content.append({"type": "text", "text": text_content})
                    
                    elif part_type == "image":
                        logger.info("Processing direct image object")
                        image_data = part.get("image", None)
                        if image_data:
                            temp_img_path = f"temp_img_{time.time()}.jpg"
                            logger.info(f"Saving image to temporary file: {temp_img_path}")
                            with open(temp_img_path, "wb") as img_file:
                                img_file.write(base64.b64decode(image_data))
                            
                            # Resize image to smaller size
                            temp_img_path = resize_image(temp_img_path)
                            temp_files.append(temp_img_path)
                            
                            qwen_content.append({
                                "type": "image",
                                "image": temp_img_path
                            })
                    
                    elif part_type == "image_url":
                        logger.info("Processing image_url object")
                        image_url = part.get("image_url", {})
                        
                        if isinstance(image_url, dict):
                            url = image_url.get("url", "")
                            logger.info(f"Image URL: {url[:100]}...")
                            
                            if url.startswith("data:"):
                                logger.info("Processing base64 data URL")
                                try:
                                    # Extract the base64 part
                                    img_data = url.split(",", 1)[1]
                                    temp_img_path = f"temp_img_{time.time()}.jpg"
                                    logger.info(f"Saving base64 image to: {temp_img_path}")
                                    with open(temp_img_path, "wb") as img_file:
                                        img_file.write(base64.b64decode(img_data))
                                    
                                    # Resize image to smaller size
                                    temp_img_path = resize_image(temp_img_path)
                                    temp_files.append(temp_img_path)
                                    
                                    qwen_content.append({
                                        "type": "image",
                                        "image": temp_img_path
                                    })
                                except Exception as e:
                                    logger.error(f"Error processing base64 image: {e}", exc_info=True)
                                    raise HTTPException(status_code=400, detail=f"Invalid base64 image: {str(e)}")
                            else:
                                # Regular URL - download or use directly
                                try:
                                    # For URLs, you might want to download the image first
                                    if url.startswith(("http://", "https://")):
                                        logger.info(f"Downloading image from URL: {url}")
                                        response = requests.get(url, stream=True)
                                        if response.status_code == 200:
                                            temp_img_path = f"temp_img_{time.time()}.jpg"
                                            logger.info(f"Saving downloaded image to: {temp_img_path}")
                                            with open(temp_img_path, "wb") as img_file:
                                                for chunk in response.iter_content(1024):
                                                    img_file.write(chunk)
                                            
                                            # Resize image to smaller size
                                            temp_img_path = resize_image(temp_img_path)
                                            temp_files.append(temp_img_path)
                                            
                                            qwen_content.append({
                                                "type": "image",
                                                "image": temp_img_path
                                            })
                                        else:
                                            logger.error(f"Failed to download image, status code: {response.status_code}")
                                            raise HTTPException(status_code=400, detail=f"Failed to download image from URL: {url}")
                                    else:
                                        # Local file path
                                        logger.info(f"Using local image file: {url}")
                                        # Resize local image file
                                        url = resize_image(url)
                                        qwen_content.append({
                                            "type": "image",
                                            "image": url
                                        })
                                except Exception as e:
                                    logger.error(f"Error processing image URL: {e}", exc_info=True)
                                    raise HTTPException(status_code=400, detail=f"Error processing image URL: {str(e)}")
                
                qwen_messages.append({
                    "role": role,
                    "content": qwen_content
                })
        
        # Prepare input for the model
        logger.info("Applying chat template")
        text = processor.apply_chat_template(
            qwen_messages, tokenize=False, add_generation_prompt=True
        )
        
        # Process vision inputs
        logger.info("Processing vision information")
        image_inputs, video_inputs = process_vision_info(qwen_messages)

        logger.info("Preparing inputs for the model")
        inputs = processor(
            text=[text],
            images=image_inputs,
            videos=video_inputs,
            padding=True,
            return_tensors="pt",
        )

        # Handle None values
        image_inputs = image_inputs if image_inputs is not None else []
        video_inputs = video_inputs if video_inputs is not None else None
        logger.info(f"Processed {len(image_inputs)} images and {len(video_inputs or [])} videos")
        
        # Move inputs to the appropriate device
        device = next(model.parameters()).device
        logger.info(f"Moving inputs to device: {device}")
        inputs = {k: v.to(device) for k, v in inputs.items()}
        #inputs = inputs.to("cuda")
        
        # Generate response
        logger.info(f"Generating response with max_new_tokens={max_tokens}, temperature={temperature}")
        start_time = time.time()
        generated_ids = model.generate(
            **inputs, 
            max_new_tokens=max_tokens
        )
        generation_time = time.time() - start_time
        logger.info(f"Response generated in {generation_time:.2f} seconds")
        
        # Decode the generated tokens
        logger.info("Decoding generated tokens")
        generated_ids_trimmed = [
            out_ids[len(in_ids):] for in_ids, out_ids in zip(inputs["input_ids"], generated_ids)
        ]
        
        output_texts = processor.batch_decode(
            generated_ids_trimmed, skip_special_tokens=True, clean_up_tokenization_spaces=False
        )

        # Clean up temporary image files
        logger.info(f"Cleaning up {len(temp_files)} temporary files")
        for temp_file in temp_files:
            try:
                os.remove(temp_file)
                logger.debug(f"Removed temporary file: {temp_file}")
            except Exception as e:
                logger.warning(f"Error removing temp file {temp_file}: {e}")
        
        # Create response
        logger.info("Creating API response")
        choices = []
        for i, output_text in enumerate(output_texts):
            logger.debug(f"Output text {i+1}: {output_text[:100]}...")
            choices.append({
                "index": i,
                "message": {
                    "role": "assistant",
                    "content": output_text
                },
                "finish_reason": "stop"
            })
        
        # Estimate token counts (this is a simplification)
        prompt_tokens = len(inputs["input_ids"][0])
        completion_tokens = sum(len(ids) for ids in generated_ids_trimmed)
        total_tokens = prompt_tokens + completion_tokens
        logger.info(f"Token usage - prompt: {prompt_tokens}, completion: {completion_tokens}, total: {total_tokens}")
        
        response = {
            "id": f"chatcmpl-{int(time.time())}",
            "object": "chat.completion",
            "created": int(time.time()),
            "model": model_name,
            "choices": choices,
            "usage": {
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
                "total_tokens": total_tokens
            }
        }
        
        # Clear GPU memory after generation
        del inputs
        del generated_ids
        del generated_ids_trimmed
        torch.cuda.empty_cache()
        logger.info("Cleared GPU memory after generation")

        logger.info("Request completed successfully")
        return response
    
    except Exception as e:
        logger.error(f"Error generating completion: {str(e)}", exc_info=True)
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Error generating completion: {str(e)}")

@app.get("/health")
async def health_check():
    logger.info("Health check requested")
    return {"status": "ok"}

if __name__ == "__main__":
    logger.info("Starting Qwen2.5-VL API server on port 8881")
    uvicorn.run("Qwen2_5-VL-3B:app", host="0.0.0.0", port=8881, log_level="info")