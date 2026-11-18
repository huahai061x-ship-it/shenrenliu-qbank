// Retain the newest thirty papers in each exam/category and bank scope, including quieter categories.
(function(root){
 const scope=ids=>[...new Set((Array.isArray(ids)?ids:[]).filter(x=>typeof x==='string'&&/^[a-z0-9_-]{1,48}$/.test(x)))].sort().join('|')||'hos_2026';
 function category(row={}){
  const mode=row.examMode||'',title=row.mode||'';
  if(mode==='collection_exam')return /收藏/.test(title)?'favorites':'wrong';
  if(mode==='special_exam')return 'special-'+(row.questionType||'all');
  if(mode==='redo'||mode==='sprint')return mode;
  return mode==='real'||/模拟|真实/.test(title)?'real':'other';
 }
 function retain(sorted){
  const counts=new Map();
  return sorted.filter((row,index)=>{
   const key=scope(row?.examScope||row?.bankIds)+'/'+category(row||{}),n=counts.get(key)||0;
   counts.set(key,n+1);return index<50||n<30;
  });
 }
 const api={scope,category,retain};
 if(typeof module==='object'&&module.exports)module.exports=api;else root.EXAM_HISTORY_CORE=api;
})(typeof window==='undefined'?globalThis:window);
