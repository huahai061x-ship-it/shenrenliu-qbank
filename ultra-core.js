(() => {
'use strict';
const normalize = value => String(value ?? '').replace(/[！-～]/g, c => String.fromCharCode(c.charCodeAt(0)-0xFEE0)).replace(/　/g, ' ').trim().replace(/\s+/gu, '').toLowerCase();
function validSpec(spec) {
  return !!spec && ['fixed','unordered_set'].includes(spec.ordering) && Array.isArray(spec.blanks) && spec.blanks.length >= 1 && spec.blanks.length <= (spec.kind === 'native_fill' ? 7 : 5) && spec.blanks.every(blank => typeof blank.canonical === 'string' && blank.canonical.trim() && Array.isArray(blank.accepted) && blank.accepted.length && blank.accepted.every(a => typeof a === 'string' && a.trim()) && blank.accepted.some(a => normalize(a) === normalize(blank.canonical)));
}
function grade(spec, values) {
  if (!validSpec(spec)) throw Error('题目评分配置无效');
  if (!Array.isArray(values) || values.length !== spec.blanks.length || values.some(v => typeof v !== 'string')) throw Error('逐空作答格式无效');
  const norm = spec.kind === 'native_fill' ? value => normalize(String(value ?? '').normalize('NFKC')).replace(/[“”"'‘’。.!！?？,，、;；:：()（）\[\]【】·•∙・]/gu, '') : normalize;
  const matches = values.map(value => spec.blanks.map(blank => !!norm(value) && blank.accepted.some(a => norm(a) === norm(value))));
  const assigned = Array(spec.blanks.length).fill(-1);
  if (spec.ordering === 'fixed') {
    for (let i = 0; i < values.length; i++) if (matches[i][i]) assigned[i] = i;
  } else {
    const used = Array(spec.blanks.length).fill(-1);
    function augment(inputIndex, visited) {
      for (let answerIndex = 0; answerIndex < spec.blanks.length; answerIndex++) {
        if (!matches[inputIndex][answerIndex] || visited[answerIndex]) continue;
        visited[answerIndex] = true;
        if (used[answerIndex] < 0 || augment(used[answerIndex], visited)) {
          used[answerIndex] = inputIndex;
          return true;
        }
      }
      return false;
    }
    for (let i = 0; i < values.length; i++) if (normalize(values[i])) augment(i, Array(spec.blanks.length).fill(false));
    for (let j = 0; j < used.length; j++) if (used[j] >= 0) assigned[used[j]] = j;
  }
  const blankResults = values.map((value, i) => ({index:i+1,answer:value,correct:assigned[i]>=0,matchedCanonical:assigned[i]>=0?spec.blanks[assigned[i]].canonical:null}));
  const correctBlanks = blankResults.filter(x => x.correct).length;
  return {correctBlanks,totalBlanks:spec.blanks.length,blankResults,wholeCorrect:correctBlanks===spec.blanks.length};
}
function candidateSpec(candidate) {
  if (!candidate || !['multi_blank','concept_blank'].includes(candidate.kind) || !candidate.sourceReview?.startsWith('已对照原图人工抽查') || candidate.reviewStatus!=='verified' || !Array.isArray(candidate.sourceQuestionIds) || !candidate.sourceQuestionIds.length || !candidate.sourceQuestionIds.every(Number.isInteger) || !Array.isArray(candidate.sourceImages) || !candidate.sourceImages.length || !candidate.sourceImages.every(p=>Number.isInteger(p)&&p>=1&&p<=111) || !validSpec(candidate) || typeof candidate.stem!=='string') return null;
  const spec = {candidateId:candidate.candidateId,kind:candidate.kind,knowledgeKey:candidate.knowledgeKey||`Q${candidate.sourceQuestionIds[0]}`,reviewStatus:'verified',sourceQuestionIds:[...candidate.sourceQuestionIds],sourceImages:[...candidate.sourceImages],sourceChecked:true,stem:candidate.stem,ordering:candidate.ordering,blanks:candidate.blanks.map(b=>({canonical:b.canonical,accepted:[...b.accepted]})),why:candidate.why||''};
  return validSpec(spec) && (spec.stem.match(/______/g)||[]).length===spec.blanks.length ? spec : null;
}
window.ULTRA_CORE=Object.freeze({normalize,validSpec,grade,candidateSpec});
})();
