"""Local prompt comparison and conservative technical checks, not a probability."""
import json
from pathlib import Path


def enrich_records(records, root):
    import numpy as np
    import torch
    from PIL import Image, ImageOps
    from transformers import AutoTokenizer, CLIPTextModelWithProjection

    policy = json.loads((root / 'scripts/portfolio_policy.json').read_text(encoding='utf-8'))
    review_path = root / 'scripts/portfolio_review.json'
    reviewed = json.loads(review_path.read_text(encoding='utf-8'))['photos'] if review_path.exists() else {}
    texts = policy['professional'] + policy['personal']
    model = CLIPTextModelWithProjection.from_pretrained('openai/clip-vit-base-patch32', use_safetensors=True).eval()
    tokenizer = AutoTokenizer.from_pretrained('openai/clip-vit-base-patch32')
    with torch.inference_mode():
        embeddings = model(**tokenizer(texts, padding=True, truncation=True, return_tensors='pt')).text_embeds
        embeddings = embeddings / embeddings.norm(dim=-1, keepdim=True)
        scores = torch.tensor([record['embedding'] for record in records]) @ embeddings.T
    positive_count = len(policy['professional'])
    for i, record in enumerate(records):
        positive = float(scores[i, :positive_count].max())
        negative = float(scores[i, positive_count:].max())
        record['professional_similarity'] = positive
        record['personal_similarity'] = negative
        record['professional_margin'] = positive - negative
        record['matched_professional_prompt'] = texts[int(scores[i, :positive_count].argmax())]
        record['matched_personal_prompt'] = policy['personal'][int(scores[i, positive_count:].argmax())]
        if 'technical' not in record:
            with Image.open(record['source']) as source:
                dimensions = source.size
                source.draft('RGB', (800, 800))
                image = ImageOps.exif_transpose(source).convert('L')
                image.thumbnail((512, 512), Image.Resampling.LANCZOS)
                gray = np.asarray(image, dtype=np.float32)
                laplacian = -4 * gray[1:-1, 1:-1] + gray[:-2, 1:-1] + gray[2:, 1:-1] + gray[1:-1, :-2] + gray[1:-1, 2:]
                record['technical'] = {'short_side': min(dimensions), 'sharpness': float(laplacian.var()), 'dark_fraction': float((gray < 8).mean()), 'bright_fraction': float((gray > 247).mean())}
        record['model_eligible'] = is_eligible(record, policy)
        review = reviewed.get(record['sha256'])
        record['visual_review'] = review
        # Publication uses the reviewed shortlist; CLIP remains a suggestion.
        # Review may rescue a deliberately composed image that text prompts miss,
        # but it cannot override technical minimums or diversity/date constraints.
        record['portfolio_eligible'] = reviewed_eligible(record, review, policy)
        # Suitability is a gate. Among eligible work, keep aesthetic quality relevant.
        record['portfolio_score'] = record['score'] + 10 * record['professional_margin']
    return policy


def is_eligible(record, policy):
    return (record['score'] >= policy['minimum_aesthetic']
            and record['professional_similarity'] >= policy['minimum_professional_similarity']
            and record['professional_margin'] >= policy['minimum_professional_margin']
            and technical_eligible(record, policy))


def technical_eligible(record, policy):
    technical = record['technical']
    return (technical['short_side'] >= policy['minimum_short_side']
            and technical['sharpness'] >= policy['minimum_sharpness']
            and technical['dark_fraction'] <= policy['maximum_dark_fraction']
            and technical['bright_fraction'] <= policy['maximum_bright_fraction'])


def reviewed_eligible(record, review, policy):
    return bool(review and review.get('decision') == 'approve' and technical_eligible(record, policy))
