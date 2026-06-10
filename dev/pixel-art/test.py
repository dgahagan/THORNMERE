import torch
from diffusers import Flux2KleinPipeline

pipe = Flux2KleinPipeline.from_pretrained(
    "black-forest-labs/FLUX.2-klein-4B", torch_dtype=torch.bfloat16)
pipe.enable_model_cpu_offload()

prompt = ("pixel art sprite, hulking swamp troll brute, mossy green skin, "
          "tusked underbite, hunched shoulders, fantasy dungeon crawler "
          "monster portrait, dark background, 16-bit Amiga style, game asset")

# --- A: base model, no LoRA ---
img = pipe(prompt=prompt, num_inference_steps=4, guidance_scale=1.0,
           height=512, width=512,
           generator=torch.Generator("cpu").manual_seed(7)).images[0]
img.save("base_test.png")
print("A (base) saved")

# --- B: with LoRA, same seed ---
pipe.load_lora_weights("Limbicnation/pixel-art-lora")
img = pipe(prompt=prompt, num_inference_steps=4, guidance_scale=1.0,
           height=512, width=512,
           generator=torch.Generator("cpu").manual_seed(7)).images[0]
img.save("lora_test.png")
print("B (LoRA) saved")	
