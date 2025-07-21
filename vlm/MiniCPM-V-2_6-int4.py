# vlm/MiniCPM-V-2_6-int4.py
import torch
from PIL import Image
import base64
import io
import uvicorn
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import time
import json
from transformers import AutoModel, AutoTokenizer

# Global variables for model and tokenizer
model = None
tokenizer = None

# Lifespan context manager to replace on_event
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Load model and tokenizer
    global model, tokenizer
    print("Loading model and tokenizer...")
    model = AutoModel.from_pretrained('MiniCPM-V-2_6-int4', trust_remote_code=True)
    tokenizer = AutoTokenizer.from_pretrained('MiniCPM-V-2_6-int4', trust_remote_code=True)
    model.eval()
    print("Model and tokenizer loaded!")
    
    yield
    
    # Cleanup
    print("Shutting down and cleaning resources...")

# Initialize FastAPI app with lifespan
app = FastAPI(
    title="MiniCPM-V API Server",
    description="API server for MiniCPM-V model compatible with OpenAI API format",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Helper function to decode base64 images
def decode_base64_image(base64_image):
    try:
        # Remove the data URL prefix if present
        if "base64," in base64_image:
            base64_image = base64_image.split("base64,")[1]
        
        # Decode and open the image
        image_bytes = base64.b64decode(base64_image)
        image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        return image
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image data: {str(e)}")

# Models endpoint
@app.get("/v1/models")
async def list_models():
    return {
        "object": "list",
        "data": [
            {
                "id": "openbmb/MiniCPM-V-2_6-int4",
                "object": "model",
                "created": int(time.time()),
                "owned_by": "openbmb",
                "permission": [],
                "root": "openbmb/MiniCPM-V-2_6-int4",
                "parent": None,
            }
        ]
    }

# Model retrieval endpoint
@app.get("/v1/models/{model_id}")
async def retrieve_model(model_id: str):
    if model_id != "openbmb/MiniCPM-V-2_6-int4":
        raise HTTPException(status_code=404, detail="Model not found")
    
    return {
        "id": model_id,
        "object": "model",
        "created": int(time.time()),
        "owned_by": "openbmb",
        "permission": [],
        "root": "openbmb/MiniCPM-V-2_6-int4",
        "parent": None,
    }

# Chat completion endpoint
@app.post("/v1/chat/completions")
async def chat_completion(request: Request):
    try:
        # Check if model is loaded
        if model is None or tokenizer is None:
            raise HTTPException(status_code=503, detail="Model not loaded yet")
            
        # Parse request data
        data = await request.json()
        
        model_name = data.get("model", "openbmb/MiniCPM-V-2_6-int4")
        messages = data.get("messages", [])
        temperature = data.get("temperature", 0.7)
        stream = data.get("stream", False)
        max_tokens = data.get("max_tokens", None)
        
        # Process messages to extract text and images
        processed_msgs = []
        main_image = None  # Will hold the primary image for the model
        
        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            
            if isinstance(content, str):
                # Simple text message
                processed_msgs.append({
                    'role': role,
                    'content': [content]  # Wrap in list as per sample
                })
            elif isinstance(content, list):
                # Handle multi-modal content (text + images)
                msg_content = []
                images_in_message = []
                
                for item in content:
                    if item.get("type") == "text":
                        msg_content.append(item["text"])
                    elif item.get("type") == "image_url":
                        image_url = item["image_url"]
                        if isinstance(image_url, dict) and "url" in image_url:
                            if image_url["url"].startswith("data:image"):
                                image = decode_base64_image(image_url["url"])
                                images_in_message.append(image)
                                # If this is the first image we've seen, use it as the main image
                                if main_image is None:
                                    main_image = image
                
                # Add all text to the message content
                processed_msgs.append({
                    'role': role, 
                    'content': msg_content
                })
        
        # Get response from model
        if stream:
            # For streaming responses, we need to implement a streaming response
            async def generate_stream():
                gen = model.chat(
                    image=main_image,  # Pass the main image
                    msgs=processed_msgs,
                    tokenizer=tokenizer,
                    sampling=True,  # Required for streaming
                    temperature=temperature,
                    max_tokens=max_tokens,
                    stream=True
                )
                
                chunk_id = f"chatcmpl-{int(time.time())}"
                completion_tokens = 0
                
                for new_text in gen:
                    completion_tokens += 1
                    chunk = {
                        "id": chunk_id,
                        "object": "chat.completion.chunk",
                        "created": int(time.time()),
                        "model": model_name,
                        "choices": [
                            {
                                "index": 0,
                                "delta": {
                                    "content": new_text
                                },
                                "finish_reason": None
                            }
                        ]
                    }
                    yield f"data: {json.dumps(chunk)}\n\n"
                
                # Send the final chunk with finish_reason
                final_chunk = {
                    "id": chunk_id,
                    "object": "chat.completion.chunk",
                    "created": int(time.time()),
                    "model": model_name,
                    "choices": [
                        {
                            "index": 0,
                            "delta": {},
                            "finish_reason": "stop"
                        }
                    ]
                }
                yield f"data: {json.dumps(final_chunk)}\n\n"
                yield "data: [DONE]\n\n"
            
            from fastapi.responses import StreamingResponse
            return StreamingResponse(generate_stream(), media_type="text/event-stream")
        else:
            # Non-streaming response
            response = model.chat(
                image=main_image,  # Pass the main image
                msgs=processed_msgs,
                tokenizer=tokenizer,
                sampling=temperature > 0,
                temperature=temperature,
                max_tokens=max_tokens,
                stream=False
            )
        
            # Approximate token count
            completion_tokens = len(tokenizer.encode(response))
            prompt_tokens = sum(len(tokenizer.encode(str(msg.get("content", "")))) for msg in messages)
            
            # Create response object
            chat_completion = {
                "id": f"chatcmpl-{int(time.time())}",
                "object": "chat.completion",
                "created": int(time.time()),
                "model": model_name,
                "choices": [
                    {
                        "index": 0,
                        "message": {
                            "role": "assistant", 
                            "content": response
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
            
            return chat_completion
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating response: {str(e)}")

# Basic health check endpoint
@app.get("/health")
async def health_check():
    if model is None or tokenizer is None:
        return {"status": "loading", "message": "Model is still loading"}
    return {"status": "ok", "message": "Model is loaded and ready"}

if __name__ == "__main__":
    uvicorn.run("MiniCPM-V-2_6-int4:app", host="0.0.0.0", port=8000, reload=False)