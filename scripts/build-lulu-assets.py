"""Encode the existing mascot for delivery; preserve the original PNG and appearance."""
from pathlib import Path
from PIL import Image
import base64, hashlib, io, json

root = Path(__file__).resolve().parent.parent
original = Image.open(root / 'lulu-mascot.png').convert('RGBA')
def encode(size, quality):
    image = original.copy()
    image.thumbnail((size, size), Image.Resampling.LANCZOS)
    out = io.BytesIO()
    image.save(out, format='WEBP', quality=quality, method=6)
    return out.getvalue()
full, preview = encode(512, 84), encode(96, 65)
name = 'media/lulu-' + hashlib.sha256(full).hexdigest()[:16] + '.webp'
(root / 'media').mkdir(exist_ok=True)
(root / name).write_bytes(full)
art = {'src': name, 'preview': 'data:image/webp;base64,' + base64.b64encode(preview).decode('ascii')}
(root / 'lulu-art.js').write_bytes(('window.LULU_ART=' + json.dumps(art, separators=(',', ':')) + ';\n').encode('utf-8'))
print(f'Lulu: original {len((root / "lulu-mascot.png").read_bytes())} bytes; full {len(full)}; preview {len(preview)}')
