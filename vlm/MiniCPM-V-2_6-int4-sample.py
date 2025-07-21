# test.py
import torch
from PIL import Image
from transformers import AutoModel, AutoTokenizer

model = AutoModel.from_pretrained('MiniCPM-V-2_6-int4', trust_remote_code=True)
tokenizer = AutoTokenizer.from_pretrained('MiniCPM-V-2_6-int4', trust_remote_code=True)
model.eval()

image = Image.open('image.png').convert('RGB')
question = 'What is in the image?'
msgs = [{'role': 'user', 'content': [question]}]

res = model.chat(
    image=image,
    msgs=msgs,
    tokenizer=tokenizer
)
print(res)

## if you want to use streaming, please make sure sampling=True and stream=True
## the model.chat will return a generator
res = model.chat(
    image=image,
    msgs=msgs,
    tokenizer=tokenizer,
    sampling=True,
    temperature=0.7,
    stream=True
)

generated_text = ""
for new_text in res:
    generated_text += new_text
    print(new_text, flush=True, end='')
