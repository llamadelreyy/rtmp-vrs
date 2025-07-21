setup VLM OpenAI API compatible inference server


please use dummy_vlm.py for development



huggingface-cli download Qwen/Qwen2.5-VL-3B-Instruct --local-dir ./Qwen2.5-VL-3B-Instruct

wsl

pip install git+https://github.com/huggingface/transformers@f3f6c86582611976e72be054675e2bf0abb5f775
pip install accelerate
pip install qwen-vl-utils
pip install 'vllm>0.7.2'

for 2x card with 10GB vram (total 20GB)

vllm serve Qwen2.5-VL-3B-Instruct --tensor-parallel-size 2 --port 8000 --host 0.0.0.0 --dtype bfloat16 --limit-mm-per-prompt image=1,video=0 --max-model-len=32768



# Create virtual environment in mac os
python -m venv venv

# Activate virtual environment
source venv/bin/activate









you may try using smolvlm2_usage.py to understand the openai API usage

git clone https://github.com/huggingface/transformers.git
cd transformers
pip install -e .

pip install flash-attn --no-build-isolation

pip install -r requirements.txt

pip install --upgrade onnxruntime
pip install onnxruntime-extensions

huggingface-cli download HuggingFaceTB/SmolVLM2-2.2B-Instruct --local-dir ./SmolVLM2-2.2B-Instruct

huggingface-cli download HuggingFaceTB/SmolVLM2-256M-Video-Instruct --local-dir ./SmolVLM2-256M-Video-Instruct

