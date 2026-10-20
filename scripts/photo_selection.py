"""Select ranked photographs while enforcing diversity across both collections."""
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


def select_collections(records, start, end):
    ranked = sorted(records, key=lambda record: (-record['score'], record['source']))
    used = []
    selections = {}
    for key in ('najbolje-ikad', 'zadnjih-mjesec-dana'):
        selected = []
        for record in ranked:
            if key == 'zadnjih-mjesec-dana' and not (record['date'] and start <= datetime.fromisoformat(record['date']) < end):
                continue
            if not all(not same_scene(record, other) for other in used):
                continue
            selected.append(record)
            used.append(record)
            if len(selected) == 4:
                break
        if len(selected) != 4:
            raise ValueError('Nema dovoljno raznolikih fotografija za dvije kolekcije. Objavljeni izbor nije promijenjen.')
        selections[key] = selected
    return selections
