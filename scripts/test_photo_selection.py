import hashlib
import unittest
from datetime import datetime
from photo_selection import select_collections, same_scene
from portfolio_quality import is_eligible, reviewed_eligible


def photo(index, score=None, date='2026-10-18T12:00:00', scene=None):
    vector = [0.0] * 16
    vector[index if scene is None else scene] = 1.0
    return {'source': str(index), 'score': 20 - index if score is None else score,
            'sha256': str(index), 'dhash': int(hashlib.sha256(str(index).encode()).hexdigest()[:16], 16),
            'date': date, 'embedding': vector, 'portfolio_eligible': True, 'portfolio_score': 20 - index if score is None else score}


class SelectionTests(unittest.TestCase):
    start = datetime(2026, 9, 20)
    end = datetime(2026, 10, 21)
    week_start = datetime(2026, 10, 14)

    def select(self, records):
        return select_collections(records, self.start, self.end, self.week_start)

    def test_same_population_produces_twelve_disjoint_images(self):
        result = self.select([photo(i) for i in range(12)])
        groups = list(result.values())
        self.assertEqual([len(group) for group in groups], [4, 4, 4])
        self.assertEqual(len({record['sha256'] for group in groups for record in group}), 12)

    def test_different_files_same_scene_are_excluded_globally(self):
        records = [photo(i) for i in range(10)]
        records[1]['embedding'] = records[0]['embedding'][:]
        result = self.select(records)
        selected = [record for group in result.values() for record in group]
        self.assertNotIn('1', [record['source'] for record in selected])
        self.assertTrue(all(not same_scene(left, right) for i, left in enumerate(selected) for right in selected[i+1:]))

    def test_recent_excludes_old_and_undated(self):
        records = [photo(i) for i in range(14)]
        records[4]['date'] = '2025-01-01T00:00:00'
        records[5]['date'] = None
        result = self.select(records)
        for key in ('zadnjih-mjesec-dana', 'zadnjih-tjedan-dana'):
            self.assertTrue(all(record['date'] and self.start <= datetime.fromisoformat(record['date']) < self.end for record in result[key]))
        self.assertEqual([record['source'] for record in result['zadnjih-tjedan-dana']], ['0', '1', '2', '3'])

    def test_not_enough_diversity_underfills_instead_of_repeating(self):
        result = self.select([photo(i, scene=0) for i in range(10)])
        self.assertEqual([len(group) for group in result.values()], [0, 0, 1])

    def test_burst_with_different_pose_counts_as_same_scene(self):
        left, right = photo(0), photo(1)
        right['embedding'] = [0.8, 0.6] + [0.0] * 14
        right['date'] = '2026-10-01T12:01:00'
        left['date'] = '2026-10-01T12:00:00'
        self.assertTrue(same_scene(left, right))

    def test_weekly_boundary_and_reservation(self):
        records = [photo(i, date='2026-10-01T12:00:00') for i in range(8)]
        records[6]['date'] = '2026-10-13T23:59:59'
        records[7]['date'] = '2026-10-14T00:00:00'
        result = self.select(records)
        self.assertEqual([r['source'] for r in result['zadnjih-tjedan-dana']], ['7'])
        self.assertEqual([r['source'] for r in result['zadnjih-mjesec-dana']], ['4', '5', '6'])

    def test_high_aesthetic_personal_photo_is_rejected(self):
        records = [photo(i) for i in range(8)]
        records[0]['portfolio_eligible'] = False
        selected = [r for group in self.select(records).values() for r in group]
        self.assertNotIn('0', [r['source'] for r in selected])

    def test_quality_gate_checks_suitability_and_technical_quality(self):
        import json
        from pathlib import Path
        policy = json.loads((Path(__file__).parent / 'portfolio_policy.json').read_text())
        record = {'score': 7, 'professional_similarity': 0.3, 'professional_margin': 0.04,
                  'technical': {'short_side': 2000, 'sharpness': 100, 'dark_fraction': 0.1, 'bright_fraction': 0.05}}
        self.assertTrue(is_eligible(record, policy))
        record['professional_margin'] = -0.01
        self.assertFalse(is_eligible(record, policy))
        record['professional_margin'] = 0.04
        record['technical']['sharpness'] = 0
        self.assertFalse(is_eligible(record, policy))

    def test_visual_review_is_required_and_cannot_override_technical_failure(self):
        import json
        from pathlib import Path
        policy = json.loads((Path(__file__).parent / 'portfolio_policy.json').read_text())
        record = {'technical': {'short_side': 2000, 'sharpness': 100, 'dark_fraction': 0.1, 'bright_fraction': 0.05}}
        self.assertFalse(reviewed_eligible(record, None, policy))
        self.assertFalse(reviewed_eligible(record, {'decision': 'exclude'}, policy))
        self.assertTrue(reviewed_eligible(record, {'decision': 'approve'}, policy))
        record['technical']['sharpness'] = 0
        self.assertFalse(reviewed_eligible(record, {'decision': 'approve'}, policy))


if __name__ == '__main__':
    unittest.main()
