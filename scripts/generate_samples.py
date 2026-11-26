"""Generate visibly fictional licence discs and a deterministic benchmark suite."""
from argparse import ArgumentParser
from datetime import date, timedelta
import json
from pathlib import Path
import random

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
FONT_DIR = Path('/usr/share/fonts/truetype/dejavu')

def disc(expiry, treatment='clean', seed=0):
    rng = random.Random(seed)
    canvas = Image.new('RGB', (960, 640), '#1c2b40')
    draw = ImageDraw.Draw(canvas)
    draw.ellipse((206, 45, 754, 593), fill='#f3f3ea', outline='#75a8a1', width=9)
    draw.rounded_rectangle((280, 175, 680, 460), radius=24, fill='#fcfaf1')
    for text, y, size, bold in [
        ('SYNTHETIC SPECIMEN', 128, 25, True),
        ('SOUTH AFRICA', 185, 34, True),
        ('VEHICLE LICENCE DISC', 235, 30, True),
        ('DEMO RECORD  •  MOCK-001', 291, 21, False),
        ('EXPIRY DATE', 343, 27, True),
        (expiry, 401, 49, True),
        ('TRAINING ONLY', 497, 25, True),
    ]:
        font = ImageFont.truetype(str(FONT_DIR / ('DejaVuSans-Bold.ttf' if bold else 'DejaVuSans.ttf')), size)
        draw.text((480, y), text, font=font, fill='#132432', anchor='mm')
    if treatment == 'tilted':
        return canvas.rotate(rng.choice([-14, -9, 9, 14]), resample=Image.Resampling.BICUBIC, fillcolor='#1c2b40')
    if treatment == 'blur':
        return canvas.filter(ImageFilter.GaussianBlur(rng.uniform(2.2, 4.8)))
    if treatment == 'occluded':
        draw.rectangle((291, 369, 669, 436), fill='#f2eee4')
    if treatment == 'glare':
        glow = Image.new('RGBA', canvas.size)
        ImageDraw.Draw(glow).ellipse((285, 330, 710, 470), fill=(255, 255, 255, rng.randrange(160, 240)))
        return Image.alpha_composite(canvas.convert('RGBA'), glow.filter(ImageFilter.GaussianBlur(24))).convert('RGB')
    return canvas

def main():
    parser = ArgumentParser()
    parser.add_argument('--reference', type=date.fromisoformat, default=date(2026, 11, 26))
    args = parser.parse_args()
    samples = ROOT / 'dist' / 'samples'
    samples.mkdir(exist_ok=True)
    reference = args.reference
    for name, offset in [('valid', 5000), ('expiring', 15), ('expired', -45), ('review', 36)]:
        disc((reference + timedelta(days=offset)).isoformat(),
             'occluded' if name == 'review' else 'clean').save(samples / f'{name}.png')
    fixtures = ROOT / 'benchmark-inputs'
    fixtures.mkdir(exist_ok=True)
    manifest = []
    for treatment in ['clean', 'tilted', 'blur', 'glare', 'occluded']:
        for index, offset in enumerate([-150, -25, 0, 13, 29, 31, 112, 390]):
            expiry = (reference + timedelta(days=offset)).isoformat()
            name = f'{treatment}-{index + 1:02}'
            disc(expiry, treatment, index).save(fixtures / f'{name}.png')
            status = 'expired' if offset < 0 else 'expiring' if offset <= 30 else 'valid'
            manifest.append({'name': name, 'condition': treatment, 'expiry': expiry,
                             'status': 'review' if treatment == 'occluded' else status})
    (fixtures / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')

if __name__ == '__main__':
    main()
