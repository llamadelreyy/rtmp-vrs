from transformers import AutoProcessor, AutoModelForImageTextToText
import torch
import base64
from PIL import Image
import io

# Function to encode and prepare local images
def prepare_local_image(image_path):
    # Load the image using PIL
    image = Image.open(image_path)
    return image

#model_path = "SmolVLM2-2.2B-Instruct"
model_path = "SmolVLM2-256M-Video-Instruct"
processor = AutoProcessor.from_pretrained(model_path)
model = AutoModelForImageTextToText.from_pretrained(
    model_path,
    torch_dtype=torch.bfloat16
).to("cuda")

# Path to your local image
local_image_path = "image.png"
image = prepare_local_image(local_image_path)

messages = [
    {
        "role": "user",
        "content": [
            {"type": "image", "image": image},  # Pass the PIL Image directly
            {"type": "text", "text": "Can you describe this image?"},
        ]
    },
]

inputs = processor.apply_chat_template(
    messages,
    add_generation_prompt=True,
    tokenize=True,
    return_dict=True,
    return_tensors="pt",
).to(model.device, dtype=torch.bfloat16)

generated_ids = model.generate(**inputs, do_sample=False, max_new_tokens=1000)
generated_texts = processor.batch_decode(
    generated_ids,
    skip_special_tokens=True,
)
print(generated_texts[0])