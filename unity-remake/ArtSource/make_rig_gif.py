"""Package the Blender-rendered QA frames into a convenient animated preview."""
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parent
frames=[Image.open(path).convert('RGB') for path in sorted((root/'RigAnimationFrames').glob('RigQA_*.png'))]
assert len(frames)==12,len(frames)
frames[0].save(root/'RigAnimationPreview.gif',save_all=True,append_images=frames[1:],duration=130,loop=0,optimize=True)
print('Created RigAnimationPreview.gif from 12 Blender-rendered frames')
