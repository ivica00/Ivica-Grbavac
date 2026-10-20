"""Rank local JPEGs with CLIP ViT-B/32 + LAION linear aesthetic predictor.

Only exported 600px thumbnails and the two gallery records are published.
Run from the project root: python scripts/select_photos.py --as-of 2026-10-20
"""
import argparse
import calendar
import hashlib
import json
import os
from pathlib import Path
import sys
from datetime import datetime, timedelta
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.local-packages'))
os.environ['HF_HOME'] = str(ROOT / '.model-cache' / 'huggingface')
os.environ['HF_HUB_DISABLE_XET'] = '1'
import numpy as np
import torch
from PIL import Image, ImageOps, ImageDraw
from transformers import CLIPImageProcessor, CLIPVisionModelWithProjection
from photo_selection import select_collections

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', default=r'C:\Users\Administrator\Pictures\Sony a6400')
    parser.add_argument('--as-of', required=True)
    args = parser.parse_args()
    day = datetime.strptime(args.as_of, '%Y-%m-%d')
    previous_month = day.month - 1 or 12
    previous_year = day.year if day.month > 1 else day.year - 1
    start = day.replace(year=previous_year, month=previous_month, day=min(day.day, calendar.monthrange(previous_year, previous_month)[1]))
    end = day + timedelta(days=1)
    cache = ROOT / '.model-cache'
    report_dir = ROOT / '.photo-selection'
    cache.mkdir(exist_ok=True)
    report_dir.mkdir(exist_ok=True)
    weights = cache / 'sa_0_4_vit_b_32_linear.pth'
    if not weights.exists():
        urllib.request.urlretrieve('https://raw.githubusercontent.com/LAION-AI/aesthetic-predictor/main/sa_0_4_vit_b_32_linear.pth', weights)
    torch.set_num_threads(1)
    model = processor = predictor = None
    score_path = report_dir / 'scores.json'
    cached = json.loads(score_path.read_text(encoding='utf-8')) if score_path.exists() else {}
    paths = sorted(p for p in Path(args.source).rglob('*') if p.suffix.lower() in {'.jpg', '.jpeg'})
    records = []
    errors = []
    for index, path in enumerate(paths):
        try:
            signature = f'{path.stat().st_size}:{path.stat().st_mtime_ns}'
            previous = cached.get(str(path))
            if previous and previous.get('signature') == signature and len(previous.get('embedding', [])) == 512:
                records.append(previous)
                continue
            if model is None:
                # CPU is portable across installed GPU driver configurations.
                model = CLIPVisionModelWithProjection.from_pretrained('openai/clip-vit-base-patch32', use_safetensors=True).eval()
                processor = CLIPImageProcessor.from_pretrained('openai/clip-vit-base-patch32')
                predictor = torch.nn.Linear(512, 1)
                predictor.load_state_dict(torch.load(weights, map_location='cpu', weights_only=True))
                predictor.eval()
            with Image.open(path) as source:
                exif = source.getexif()
                raw_date = exif.get_ifd(34665).get(36867) or exif.get(306)
                captured = datetime.strptime(raw_date[:19], '%Y:%m:%d %H:%M:%S') if raw_date else None
                source.draft('RGB', (1200, 1200))
                image = ImageOps.exif_transpose(source).convert('RGB')
                image.thumbnail((1200, 1200), Image.Resampling.LANCZOS)
                pixels = processor(images=image, return_tensors='pt')['pixel_values']
                with torch.inference_mode():
                    features = model(pixel_values=pixels).image_embeds
                    features = features / features.norm(dim=-1, keepdim=True)
                    score = float(predictor(features).item())
                small = np.asarray(image.resize((9, 8)).convert('L'))
                bits = (small[:, 1:] > small[:, :-1]).flatten()
                dhash = sum(int(bit) << i for i, bit in enumerate(bits))
                record = {'source': str(path), 'date': captured.isoformat() if captured else None, 'score': score, 'dhash': dhash, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'embedding': features[0].tolist(), 'signature': signature}
                records.append(record)
                cached[str(path)] = record
                score_path.write_text(json.dumps(cached), encoding='utf-8')
            print(f'{index + 1}/{len(paths)} {path.name}: {score:.3f}', flush=True)
        except Exception as error:
            errors.append({'source': str(path), 'error': str(error)})
            print(f'SKIP {path.name}: {error}', flush=True)
    ranked = sorted(records, key=lambda record: (-record['score'], record['source']))
    selections = select_collections(records, start, end)
    if any(len(selection) < 4 for selection in selections.values()):
        raise RuntimeError('Not enough eligible distinct photographs; no gallery changes written.')
    output = ROOT / 'assets' / 'photos' / 'selected'
    output.mkdir(parents=True, exist_ok=True)
    exported = {}
    for record in {r['sha256']: r for group in selections.values() for r in group}.values():
        target = output / (record['sha256'][:16] + '.webp')
        with Image.open(record['source']) as source:
            image = ImageOps.exif_transpose(source).convert('RGB')
            image.thumbnail((600, 600), Image.Resampling.LANCZOS)
            # Fresh image drops EXIF/GPS and other source metadata.
            clean = Image.frombytes('RGB', image.size, image.tobytes())
            clean.save(target, 'WEBP', quality=80, method=6)
            exported[record['sha256']] = {'src': target.relative_to(ROOT).as_posix(), 'width': clean.width, 'height': clean.height}
    catalog_path = ROOT / 'content' / 'works.json'
    catalog = json.loads(catalog_path.read_text(encoding='utf-8'))
    catalog['works'] = [work for work in catalog['works'] if work.get('id') not in selections]
    titles = {'najbolje-ikad': '4 najbolje ikad', 'zadnjih-mjesec-dana': '4 najbolje u zadnjih mjesec dana'}
    for key, group in selections.items():
        photos = [{**exported[record['sha256']], 'alt': f'{titles[key]} — fotografija {i + 1}'} for i, record in enumerate(group)]
        description = 'Četiri izdvojene fotografije iz moje zbirke, odabrane prema kvaliteti i raznolikosti kadrova.'
        if key == 'zadnjih-mjesec-dana':
            description = f'Četiri dodatne fotografije snimljene od {start:%d.%m.%Y.} do {day:%d.%m.%Y.}, bez ponavljanja iz glavnog izbora.'
        catalog['works'].append({'id': key, 'title': titles[key], 'category': 'fotografija', 'description': description, 'thumbnailOnly': True, 'photos': photos})
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    report = {'model': 'openai/clip-vit-base-patch32 + LAION sa_0_4_vit_b_32_linear', 'selection_policy': 'Aesthetic ranking; global CLIP cosine < 0.86; dHash distance > 10; burst exclusion at 180s and cosine >= 0.78; all-time first, recent excludes all previously selected scenes; fail instead of relaxing constraints', 'as_of': args.as_of, 'recent_from': start.isoformat(), 'date_policy': 'EXIF DateTimeOriginal, fallback EXIF DateTime; undated excluded from recent', 'ranked': ranked, 'selected': selections, 'errors': errors}
    (report_dir / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    sheet = Image.new('RGB', (1200, 430 * 2), '#20251f')
    draw = ImageDraw.Draw(sheet)
    for row, (key, group) in enumerate(selections.items()):
        draw.text((15, row * 430 + 10), key, fill='white')
        for col, record in enumerate(group):
            with Image.open(ROOT / exported[record['sha256']]['src']) as image:
                image.thumbnail((280, 340))
                sheet.paste(image, (col * 300 + 10, row * 430 + 40))
            draw.text((col * 300 + 10, row * 430 + 390), f"{Path(record['source']).name} / {record['score']:.3f}", fill='white')
    sheet.save(report_dir / 'contact-sheet.jpg')
    print(json.dumps({'total': len(records), 'errors': len(errors), 'recent': sum(bool(record['date']) and start <= datetime.fromisoformat(record['date']) < end for record in records), 'unique_exports': len(exported), 'selected': {key: [Path(record['source']).name for record in group] for key, group in selections.items()}}, indent=2), flush=True)

if __name__ == '__main__':
    main()
