from pathlib import Path
import hashlib, sys
ROOT=Path(__file__).resolve().parent
EXPECTED={'questions.js': 'b067d164a05d90947574ca3630547ecc597a2c391bb32b51409ad5131f02a09a', 'pedagogy.js': 'e50381fde031ec09c6a0f4ccb3d928e7080e18ccd231ac819b9ff27b107e3f38', 'enhanced-fill.js': 'a59db931d024e3c99e7d2e845e84746690c343b0a23fb50ddfba6091f015b98c'}
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
print('受保护文件校验通过：原图未改动，原题文字修正及填空题库与本版封版哈希一致。')
