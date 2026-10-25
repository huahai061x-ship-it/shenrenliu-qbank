"""Compile reviewed per-question notes; never edit source questions or fill teaching."""
import json,hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
questions = {q['id']: q for q in json.loads((ROOT / 'questions.json').read_text('utf-8'))}
pending = {150, 238, 274, 343, 394, 421, 422, 429, 436, 438, 505}
research=json.loads((ROOT/'explanations/hos-library-review.json').read_text('utf-8'))
assert set(research['questions'])=={str(n) for n in questions}
notes = {}
for name in ['choice-notes.tsv', 'multiple-notes.tsv', 'judge-notes.tsv']:
    for line in (ROOT / 'explanations' / name).read_text('utf-8').splitlines():
        if not line.strip():
            continue
        number, topic, why, detail = line.split('|')
        number = int(number)
        assert number not in notes, f'duplicate #{number}'
        q = questions[number]
        entry = dict(topic=topic, why=why, status='needs_source' if number in pending else 'ready',
                     reviewedAt='2026-10-20', sourceKind='original_bank', sourcePages=q.get('sourceImages') or [q['sourceImage']])
        if q['type'] == 'judge':
            entry['correction'] = detail
            assert q['answers'] != ['错'] or detail, f'no correction #{number}'
        else:
            reasons = detail.split('~')
            assert len(reasons) == len(q['options']), f'option count #{number}'
            entry['optionReasons'] = dict(zip(q['options'], reasons))
        reviewed=research['questions'][str(number)]
        digest=hashlib.sha256(json.dumps([q['type'],q['stem'],q['options'],q['answers']],ensure_ascii=False,separators=(',',':')).encode('utf-8')).hexdigest()
        assert reviewed['questionSHA256']==digest, f'题目#{number}已变更，须重新核对库内关系与来源'
        assert all(c['questionId'] in questions and c['questionId']!=number and c['questionId'] not in pending for c in reviewed['connections'])
        entry.update(reviewedAt=reviewed['reviewedAt'],connections=reviewed['connections'],references=[research['sources'][key] for key in reviewed['sources']],reviewBoundary=reviewed['boundary'])
        notes[number] = entry
assert notes.keys() == questions.keys(), f'missing {questions.keys() - notes.keys()}'
data = json.dumps(notes, ensure_ascii=False, indent=2) + '\n'
(ROOT / 'explanations' / 'hos-analysis.json').write_bytes(data.encode('utf-8'))
(ROOT / 'hos-analysis.js').write_bytes(('/* 逐题核对说明见 explanations/README.md */\nwindow.HOS_ANALYSIS = ' + data.rstrip() + ';\n').encode('utf-8'))
print(f'Compiled {len(notes)} explanations; {len(pending)} source issues paused for new objective grading.')
