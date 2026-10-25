from pathlib import Path
import json,re,hashlib
r=Path(__file__).resolve().parent.parent
source=json.loads((r/'explanations/culture-official-source.json').read_text(encoding='utf-8'))
notes=json.loads((r/'explanations/culture-official-notes.json').read_text(encoding='utf-8'))
assert len(notes)==len(source['questions'])==157
topics=json.loads((r/'explanations/culture-official-topics.json').read_text(encoding='utf-8'))
research=json.loads((r/'explanations/culture-library-review.json').read_text(encoding='utf-8'))
source_ids={q['key']:n for n,q in enumerate(source['questions'],1)}
assert set(research['questions'])==set(source_ids)
assert set(topics['assignments'])=={q['key'] for q in source['questions']}
questions=[];bykey={};fills={}
for n,raw in enumerate(source['questions'],1):
 note=notes[raw['key']];a={'status':'ready','topic':note['topic'],'why':note['why'],'reviewedAt':'2026-10-23','sourceKind':'official_document','sourceDocument':source['sourceDocument'],'sourceParagraphs':raw['sourceParagraphs'],'basis':'按用户提供的2025正式题库及题内交叉信息核对；不代表所有历史数据均为当前数据。'}
 if raw['type']=='judge':
  if raw['answerTexts']==['错']:assert len(note['correction'])>=12;a['correction']=note['correction']
 else:
  reasons=note['reasons'].split('~');assert len(reasons)==len(raw['options']),(raw['key'],len(reasons))
  a['optionReasons']={o['text']:why for o,why in zip(raw['options'],reasons)}
 group='文化理念与行为准则'
 if raw['type']=='single' and raw['sourceNumber'] in [4,5,7,9,11,13,19,20,21,22,23,24,25,26,27,30,31,34,36,37,38,39,48,49,50,51,52,55,56,65,66]:group='历史节点与2025资料'
 if raw['type']=='multiple' and raw['sourceNumber'] in [1,4,6,7,8,9,15,16,17,20,23,24,32,36,37]:group='品牌战略与发展实践'
 if raw['type']=='judge':group='判断辨析与原文核对'
 q={'id':n,'type':raw['type'],'stem':raw['stem'],'options':[o['text'] for o in raw['options']],'answers':raw['answerTexts'],'tags':[group],'originalLabel':f'{raw["typeName"]}第{raw["sourceNumber"]}题','originalNumber':raw['sourceNumber'],'sourceKey':raw['key'],'sourceParagraphs':raw['sourceParagraphs'],'sourceStemWithAnswer':raw['sourceStemWithAnswer'],'sourceNote':'来源：重汽企业文化试题2025_.docx；按正式资料原题口径。','analysis':a}
 if raw['key']=='judge-034':q['sourceReferences']=[{'title':'济南年鉴1989 汽车工业（档案归档镜像）','url':'https://shandong-chorography.org/database/d1/section/1/article/57/','date':'1989'}]
 classification=topics['assignments'][raw['key']]
 reviewed=research['questions'][raw['key']]
 digest=hashlib.sha256(json.dumps([raw['type'],raw['stem'],[o['text'] for o in raw['options']],raw['answerTexts']],ensure_ascii=False,separators=(',',':')).encode('utf-8')).hexdigest()
 assert reviewed['questionSHA256']==digest, '原题已变更，须重新核对解析与库内关系：'+raw['key']
 a.update(reviewedAt=reviewed['reviewedAt'],connections=[{'questionId':source_ids[c['sourceKey']],'reason':c['reason'],'group':c['group']} for c in reviewed['connections']],references=[research['sources'][key] for key in reviewed['sources']],reviewBoundary=reviewed['boundary'])
 fingerprint=hashlib.sha256(json.dumps([raw['type'],raw['stem'],raw['options'],raw['answerTexts']],ensure_ascii=False,separators=(',',':')).encode('utf-8')).hexdigest()
 assert classification['contentSHA256']==fingerprint, '题目有变更，必须重新逐题核对分类：'+raw['key']
 assert classification['group'] in {g['id'] for g in topics['groups']}
 q['contentGroup']=classification['group']
 questions.append(q);bykey[raw['key']]=q
single_fills=[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,19,20,22,23,24,25,27,28,29,31,34,40,41,42,47,48,50,52,57,60,62,63,64]
def fill(q,stem,answers):
 assert len(re.findall('______',stem))==len(answers)
 fills[q['id']]={'stem':stem,'answers':answers,'ordered':True,'accepted':[],'why':q['analysis']['why'],'sourceKey':q['sourceKey'],'gradeSpec':{'kind':'official_fill','ordering':'fixed','stem':stem,'sourceQuestionIds':[q['id']],'blanks':[{'canonical':a,'accepted':[a]} for a in answers]}}
for n in single_fills:
 q=bykey[f'single-{n:03d}'];stem=re.sub(r'[（(]\s*[）)]','______',q['stem']);fill(q,stem,q['answers'])
for n in [5,11,13,18,19,21,25,29,31,34]:
 q=bykey[f'multiple-{n:03d}'];stem=re.sub(r'[（(]\s*[）)]','______',q['stem']);
 if n==18:stem='企业质量行为准则的前半句为“______”，其中产品指一切工作成果；后半句为“______”，体现主动承担质量责任。'
 fill(q,stem,q['answers'])
q=bykey['multiple-026'];fill(q,'中国重汽“1137”文化理念体系由一个______、一个______、三条______、七条______组成。',['企业使命','企业愿景','核心理念','行为准则'])
bank={'format':'qbank-data/v1','meta':{'id':'sinotruk_culture_2025_official','name':'中国重汽企业文化正式题库','version':'2026.10.25','contentGroups':topics['groups'],'contentGroupsReviewedAt':topics['reviewedAt'],'expectedQuestionCount':157,'sourcePageCount':0,'sourceDocument':source['sourceDocument'],'sourceSHA256':source['sourceSHA256'],'asOf':'2025题库资料口径','derivedFillCount':len(fills),'replacesBankId':'sinotruk_culture_2026'},'questions':questions,'pedagogy':{'fillBank':fills}}
assert len(fills)==51
for suffix in ['json','js']:
 text=json.dumps(bank,ensure_ascii=False,separators=(',',':'))
 if suffix=='js':text='window.QBANK_BUNDLE='+text+';\n'
 (r/f'banks/sinotruk-culture-official.{suffix}').write_bytes(text.encode('utf-8'))
print('Built 157 original questions, 529 exact options, 157 authored analyses,',len(fills),'derived fill exercises')
