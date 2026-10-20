"""Select portfolio-suitable photographs with global diversity and date windows."""
from datetime import datetime


def similarity(left, right):
    return sum(a * b for a, b in zip(left['embedding'], right['embedding']))


def same_scene(left, right, max_similarity=0.86):
    if left['sha256'] == right['sha256']:
        return True
    if (left['dhash'] ^ right['dhash']).bit_count() <= 10:
        return True
    score = similarity(left, right)
    if score >= max_similarity:
        return True
    # Different poses in a short burst still count as the same scene.
    if left['date'] and right['date']:
        seconds = abs((datetime.fromisoformat(left['date']) - datetime.fromisoformat(right['date'])).total_seconds())
        if seconds <= 180 and score >= 0.78:
            return True
    return False


def select_collections(records, start, end, week_start):
    ranked = sorted((record for record in records if record.get('portfolio_eligible', False)), key=lambda record: (-record['portfolio_score'], record['source']))
    used = []
    selections = {}
    # Reserve recent work for the narrowest window before filling the month.
    for key in ('zadnjih-tjedan-dana', 'najbolje-ikad', 'zadnjih-mjesec-dana'):
        selected = []
        for record in ranked:
            if key == 'zadnjih-mjesec-dana' and not (record['date'] and start <= datetime.fromisoformat(record['date']) < end):
                continue
            if key == 'zadnjih-tjedan-dana' and not (record['date'] and week_start <= datetime.fromisoformat(record['date']) < end):
                continue
            if not all(not same_scene(record, other) for other in used):
                continue
            selected.append(record)
            used.append(record)
            if len(selected) == 4:
                break
        selections[key] = selected
    return {key: selections[key] for key in ('najbolje-ikad', 'zadnjih-mjesec-dana', 'zadnjih-tjedan-dana')}
