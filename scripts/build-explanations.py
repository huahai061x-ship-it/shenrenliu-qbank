"""Compile reviewed per-question notes; never edit source questions or fill teaching."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
questions = {q['id']: q for q in json.loads((ROOT / 'questions.json').read_text('utf-8'))}
pending = {150, 238, 343, 394, 422, 436, 438, 505}
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
        notes[number] = entry
assert notes.keys() == questions.keys(), f'missing {questions.keys() - notes.keys()}'
data = json.dumps(notes, ensure_ascii=False, indent=2) + '\n'
(ROOT / 'explanations' / 'hos-analysis.json').write_bytes(data.encode('utf-8'))
(ROOT / 'hos-analysis.js').write_bytes(('/* 逐题核对说明见 explanations/README.md */\nwindow.HOS_ANALYSIS = ' + data.rstrip() + ';\n').encode('utf-8'))
print(f'Compiled {len(notes)} explanations; {len(pending)} source issues paused for new objective grading.')
