# gradio_qwen_vl_interface.py
import gradio as gr
import base64
import io
import os
import tempfile
import json
from openai import OpenAI
from PIL import Image

# Initialize OpenAI client with the local Qwen API
client = OpenAI(
    api_key="not-needed",  # Not used but required by the client
    base_url="http://localhost:8000/v1"  # Point to your local Qwen2.5-VL API
)

def encode_image_to_base64(image_path):
    """Convert an image file to base64 encoding"""
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

def process_uploaded_files(files):
    """Process uploaded files and return paths for display"""
    image_paths = []
    for file in files:
        image_paths.append(file.name)
    return image_paths

def chat_with_qwen(message, files, chat_history=None):
    """Send a message and optional images to the Qwen2.5-VL API and return the response"""
    if chat_history is None:
        chat_history = []
    
    # Prepare messages from chat history
    messages = []
    for human_msg, ai_msg in chat_history:
        messages.append({"role": "user", "content": human_msg})
        messages.append({"role": "assistant", "content": ai_msg})
    
    # Prepare the current message
    current_message = {"role": "user"}
    
    # Create content with images and text (putting text at the end)
    if files and len(files) > 0:
        content = []
        
        # Add image file names and the images themselves first
        file_names = []
        for file in files:
            try:
                file_name = os.path.basename(file.name)
                file_names.append(file_name)
                base64_image = encode_image_to_base64(file.name)
                content.append({
                    "type": "image_url", 
                    "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}
                })
            except Exception as e:
                print(f"Error processing image {file.name}: {e}")
        
        # Add file names info and user message at the end
        files_info = "Files: " + ", ".join(file_names)
        user_message = f"{files_info}\n\n{message}" if file_names else message
        content.append({"type": "text", "text": user_message})
        
        current_message["content"] = content
    else:
        # Text-only message
        current_message["content"] = message
    
    # Add current message to the list
    messages.append(current_message)
    
    # Create request JSON for display
    request_json = {
        "model": "qwen2.5-vl",
        "messages": messages,
        "max_tokens": 512,
        "temperature": 0.7
    }
    
    # Display formatted JSON
    formatted_json = json.dumps(request_json, indent=2)
    
    try:
        # Call the API
        response = client.chat.completions.create(
            model="qwen2.5-vl",
            messages=messages,
            max_tokens=512
        )
        
        # Extract the response text
        ai_message = response.choices[0].message.content
        
        # Update chat history
        chat_history.append((message, ai_message))
        return "", files, chat_history, formatted_json
        
    except Exception as e:
        return "", files, chat_history + [(message, f"Error: {str(e)}")], formatted_json

def clear_conversation():
    """Clear the conversation history but keep uploaded files"""
    # Return empty chat history but keep files and images
    return [], None, [], None

# Create the Gradio interface
with gr.Blocks(title="Qwen2.5-VL Chat Interface") as demo:
    gr.Markdown("# Qwen2.5-VL Chat Interface")
    gr.Markdown("Upload multiple images and chat with Qwen2.5-VL about them.")
    
    with gr.Row():
        with gr.Column(scale=1):
            file_output = gr.File(file_count="multiple", label="Upload Images")
            image_output = gr.Gallery(label="Uploaded Images", show_label=True)
            file_output.upload(fn=process_uploaded_files, inputs=[file_output], outputs=[image_output])
            
            clear_button = gr.Button("Clear Conversation")

        with gr.Column(scale=2):
            chatbot = gr.Chatbot(label="Conversation", height=400)
            text_input = gr.Textbox(label="Your message", placeholder="Ask me about the images or anything else...")
            submit_button = gr.Button("Send")
            
            json_output = gr.JSON(label="Request JSON", visible=True)
    
    # Set up the interaction
    submit_button.click(
        chat_with_qwen,
        inputs=[text_input, file_output, chatbot],
        outputs=[text_input, file_output, chatbot, json_output]
    )
    
    # Also allow Enter key to submit
    text_input.submit(
        chat_with_qwen,
        inputs=[text_input, file_output, chatbot],
        outputs=[text_input, file_output, chatbot, json_output]
    )
    
    # Clear conversation button - only clears chat history
    clear_button.click(
        clear_conversation,
        inputs=[],
        outputs=[chatbot, file_output, image_output, json_output]
    )

if __name__ == "__main__":
    demo.launch(share=True)  # Set share=False if you don't want to create a public link