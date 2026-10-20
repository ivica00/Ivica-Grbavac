import hashlib
import unittest
from datetime import datetime
from photo_selection import select_collections, same_scene


def photo(index, score=None, date='2026-10-01T12:00:00', scene=None):
    vector = [0.0] * 16
    vector[index if scene is None else scene] = 1.0
    return {'source': str(index), 'score': 20 - index if score is None else score,
            'sha256': str(index), 'dhash': int(hashlib.sha256(str(index).encode()).hexdigest()[:16], 16),
            'date': date, 'embedding': vector}


class SelectionTests(unittest.TestCase):
    start = datetime(2026, 9, 20)
    end = datetime(2026, 10, 21)

    def test_same_population_produces_eight_disjoint_images(self):
        result = select_collections([photo(i) for i in range(8)], self.start, self.end)
        groups = list(result.values())
        self.assertEqual([len(group) for group in groups], [4, 4])
        self.assertEqual(len({record['sha256'] for group in groups for record in group}), 8)

    def test_different_files_same_scene_are_excluded_globally(self):
        records = [photo(i) for i in range(10)]
        records[1]['embedding'] = records[0]['embedding'][:]
        result = select_collections(records, self.start, self.end)
        selected = [record for group in result.values() for record in group]
        self.assertNotIn('1', [record['source'] for record in selected])
        self.assertTrue(all(not same_scene(left, right) for i, left in enumerate(selected) for right in selected[i+1:]))

    def test_recent_excludes_old_and_undated(self):
        records = [photo(i) for i in range(10)]
        records[4]['date'] = '2025-01-01T00:00:00'
        records[5]['date'] = None
        result = select_collections(records, self.start, self.end)
        self.assertEqual([record['source'] for record in result['zadnjih-mjesec-dana']], ['6', '7', '8', '9'])

    def test_not_enough_diversity_stops_instead_of_repeating(self):
        with self.assertRaises(ValueError):
            select_collections([photo(i, scene=0) for i in range(10)], self.start, self.end)

    def test_burst_with_different_pose_counts_as_same_scene(self):
        left, right = photo(0), photo(1)
        right['embedding'] = [0.8, 0.6] + [0.0] * 14
        right['date'] = '2026-10-01T12:01:00'
        self.assertTrue(same_scene(left, right))


if __name__ == '__main__':
    unittest.main()
