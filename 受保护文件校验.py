from pathlib import Path
import hashlib, sys
ROOT=Path(__file__).resolve().parent
EXPECTED={'questions.js': '1564742ccce3579c4a6606f8dacdbc2520fa57e93a9639f9f3512980ad95f328', 'pedagogy.js': '83c9eac18cf85ae7ba90dacce4cc0c999cabcdd95eb7f010be3d02a299eee4c6', 'enhanced-fill.js': 'b872af3ee3a8b5c07816898e77d3e191d225cceb48797be07f98c8fdcb952866'}
EXPECTED_SOURCE_COUNT=111
EXPECTED_SOURCE_DIGEST='08414f47b7af452c048da12079a14b565db2b331c3d3f095e0a258167c9abc56'

def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
failed=[]
for rel,want in EXPECTED.items():
    p=ROOT/rel
    got=sha(p) if p.exists() else 'MISSING'
    if got!=want: failed.append(f"{rel}: {got} != {want}")
imgs=sorted((ROOT/'source').glob('*.webp'), key=lambda x:x.name)
if len(imgs)!=EXPECTED_SOURCE_COUNT:
    failed.append(f"source count {len(imgs)} != {EXPECTED_SOURCE_COUNT}")
manifest='\n'.join(f"{p.name}:{sha(p)}" for p in imgs)
got_dir=hashlib.sha256(manifest.encode()).hexdigest()
if got_dir!=EXPECTED_SOURCE_DIGEST:
    failed.append(f"source digest {got_dir} != {EXPECTED_SOURCE_DIGEST}")
if failed:
    print('受保护文件校验失败：')
    print('\n'.join(failed))
    sys.exit(1)
print('受保护文件校验通过：题库/填空/原题图片均未改动。')
