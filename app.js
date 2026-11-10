const $=s=>document.querySelector(s),KEY='zhixu-progress-v1',all=[...new Map(GROUPS.flatMap(g=>g.items).map(i=>[i.id,i])).values()];let state={},chapter=-1,noteId,scope='all';const opened=new Set(),sectionOpened=new Set();
const aliases={"LCR 049.": "LCR 49", "LCR 170.": "LCR 170", "LCR 155.": "LCR 155", "LCP 10.": "LCP 10", "LCP 26.": "LCP 26", "LCP 34.": "LCP 34", "LCP 44.": "LCP 44", "LCP 60.": "LCP 60", "LCP 64.": "LCP 64", "LCP 67.": "LCP 67", "LCP 52.": "LCP 52", "LCP 07": "LCP 7"};
function mergeAliases(progress){
 for(const [oldId,id] of Object.entries(aliases)){
  const old=progress[oldId];if(!old||typeof old!=='object')continue;
  const current=progress[id]||{},notes=[current.note,old.note].filter(n=>typeof n==='string'&&n);
  progress[id]={done:current.done===true||old.done===true,star:current.star===true||old.star===true,note:[...new Set(notes)].join('\n\n—— 合并旧编号笔记 ——\n\n')};
  delete progress[oldId];
 }return progress;
}
try{state=JSON.parse(localStorage.getItem(KEY)||'{}')}catch{}if(!state||typeof state!=='object'||Array.isArray(state))state={};mergeAliases(state);
const tips=['链表重点关注指针更新顺序；用虚拟头结点统一边界，快慢指针处理环与中点。','栈保存尚未解决的状态；队列维护处理顺序。单调栈适合寻找左右最近的更大或更小元素。','先确定窗口、下标与边界。双指针、滑动窗口和前缀和往往能减少重复计算。','递归先明确函数含义与终止条件。前中后序关注处理时机，层序遍历使用队列。','先选择邻接表或矩阵，再考虑 DFS、BFS、拓扑排序和并查集；注意访问标记。','二分查找先定义区间不变量；哈希查找用空间换时间，注意重复值与边界。','比较排序的稳定性、时间和空间复杂度；Top K 问题可考虑堆或快速选择。','按力扣官方专题顺序练习；与前面章节重复的题目共享进度、收藏和笔记。'];
const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function toast(t){$('#toast').textContent=t;$('#toast').classList.add('show');setTimeout(()=>$('#toast').classList.remove('show'),2400)}
function persist(options={}){if(window.ZhixuAccount){window.ZhixuAccount.save(options);return}try{localStorage.setItem(KEY,JSON.stringify(state))}catch{toast('保存失败，请导出备份以免丢失')}}
const meta=i=>QUESTION_META[i.id];
function matches(i){
 const s=state[i.id]||{},m=meta(i),q=$('#search').value.trim().toLowerCase(),d=+$('#difficulty').value,f=$('#status').value,focus=$('#focus').value;
 return (!q||(i.id+' '+i.title+' '+m.tags.join(' ')+' '+(i.category||'')).toLowerCase().includes(q))&&(!d||i.level===d)&&(f==='all'||f==='done'&&s.done||f==='todo'&&!s.done||f==='star'&&s.star)&&(focus==='all'||focus==='hot'&&m.hot100||focus==='exam'&&m.exam==='高'||focus==='interview'&&m.interview==='高');
}
function inScope(g,k){return (scope==='all'||g.source===scope)&&(chapter<0||k===chapter)}
function visibleItems(){return [...new Map(GROUPS.filter(inScope).flatMap(g=>g.items).filter(matches).map(i=>[i.id,i])).values()]}
function row(i){
 const s=state[i.id]||{},m=meta(i);
 return `<div class="row ${s.done?'completed':''}" data-question="${esc(i.id)}"><label class="quest-check"><input type="checkbox" data-done="${esc(i.id)}" aria-label="完成 ${esc(i.title)}" ${s.done?'checked':''}><span class="quest-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg></span><span class="quest-state">${s.done?'已攻克':'待挑战'}</span></label><div class="question-body"><div class="question-heading"><a href="${esc(i.url)}" target="_blank" rel="noopener"><span class="id">${esc(i.id)}</span>${esc(i.title)} ↗</a>${m.hot100?'<span class="hot-badge">HOT 100</span>':''}<span class="badge l${i.level}">${['外部题','简单','中等','困难'][i.level]}</span>${i.paid?'<span class="paid-badge">会员题</span>':''}${i.rating?'<span class="rating-badge">难度分 '+i.rating+'</span>':''}</div><div class="question-topics"><span class="meta-label">${m.tagsInferred?'专题归纳':'考点'}</span>${m.tags.map(t=>`<span class="topic">${esc(t)}</span>`).join('')}</div><div class="question-frequency"><span class="frequency ${m.exam==='高'?'priority-high':''}" title="${esc(m.examReason)}">考试参考 <b>${m.exam}</b></span><span class="frequency ${m.interview==='高'?'priority-high':''}" title="${esc(m.interviewReason)}">面试参考 <b>${m.interview}</b></span><details class="basis"><summary aria-label="${esc(i.title)}的考频依据">考频依据 ⓘ</summary><div><p>考试：${esc(m.examReason)}</p><p>面试：${esc(m.interviewReason)}</p><p>以上为备考优先级估计，不是实际出题频次。</p><a href="${esc(i.url)}" target="_blank" rel="noopener">查看题目及官方标签 ↗</a></div></details></div></div><div class="row-actions"><button data-star="${esc(i.id)}" class="${s.star?'selected':''}" aria-label="收藏 ${esc(i.title)}" aria-pressed="${!!s.star}">${s.star?'★':'☆'}</button><button data-note="${esc(i.id)}" aria-label="笔记 ${esc(i.title)}">${s.note?'▣':'✎'}</button></div></div>`;
}
function sectionItems(k,c){return GROUPS[k].items.filter(i=>(i.category||'基础练习')===c&&matches(i))}
function filterActive(){return $('#search').value.trim()||$('#difficulty').value!=='0'||$('#status').value!=='all'||$('#focus').value!=='all'}
function groupContent(g,items){
 if(!g.hot100&&g.source!=='reference')return items.map(row).join('');
 const k=GROUPS.indexOf(g),categories=[...new Set(items.map(i=>i.category||'基础练习'))];
 return categories.map((c,j)=>{const entries=items.filter(i=>(i.category||'基础练习')===c),key=k+':'+c,isOpen=!!filterActive()||sectionOpened.has(key);return `<details class="exercise-section" data-section="${k}" data-category="${esc(c)}" ${isOpen?'open':''}><summary><span>${esc(c)}</span><small>${entries.length} 条练习</small><i>+</i></summary><div class="section-rows">${isOpen?entries.map(row).join(''):''}</div></details>`}).join('');
}
function chapterBody(g,items,k){return `<div class="chapter-tools"><p>${esc(g.description||tips[k]||'按小节循序练习，先理解方法，再提高熟练度。')}</p>${g.guide!==undefined?`<button data-study="${g.guide}">例题与模板手册 ↗</button><a href="${esc(g.sourceUrl)}" target="_blank" rel="noopener">灵茶山艾府原文 ↗</a>`:''}</div>${groupContent(g,items)}`}
function render(){
 const done=all.filter(i=>state[i.id]?.done).length,p=Math.round(done/all.length*100);
 $('#total').textContent=all.length;$('#done').textContent=done;$('#left').textContent=all.length-done;$('#percent').textContent=p+'%';$('#ring').style.setProperty('--progress',p+'%');
 $('#group-total').textContent=GROUPS.length;
 $('#heading').textContent=chapter<0?({all:'全部题单',course:'课程章节',hot:'LeetCode Hot 100',reference:'灵茶山艾府 · 完整题单'}[scope]):GROUPS[chapter].name;
 document.querySelectorAll('[data-source]').forEach(b=>{const selected=b.dataset.source===scope;b.classList.toggle('active',selected);b.setAttribute('aria-pressed',selected)});
 for(const source of ['course','hot','reference']){const entries=[...new Map(GROUPS.filter(g=>g.source===source).flatMap(g=>g.items).map(i=>[i.id,i])).values()],n=entries.filter(i=>state[i.id]?.done).length;document.querySelector('[data-source-count="'+source+'"]').textContent=n+' / '+entries.length+' 已完成';document.querySelector('[data-source-progress="'+source+'"]').style.width=(n/entries.length*100)+'%'}
 $('#nav').innerHTML='<button class="'+(chapter<0?'active':'')+'" data-chapter="-1">◈ &nbsp; 当前范围全部 <small>'+visibleItems().length+'</small></button>'+GROUPS.map((g,k)=>{if(scope!=='all'&&g.source!==scope)return '';const label=(k===0?'课程基础':k===7?'经典热题':k===8?'灵茶山艾府 · 完整题单':g.source==='archive'?'旧版补充':'');return (label?'<div class="nav-label">'+label+'</div>':'')+`<button class="${chapter===k?'active':''} ${g.hot100?'hot-nav':''}" data-chapter="${k}"><span class="nav-number">${String(k+2).padStart(2,'0')}</span> ${esc(g.name.replace(/第\d章 /,''))} <small>${g.items.length}</small></button>`}).join('');
 let count=0;
 $('#list').innerHTML=GROUPS.map((g,k)=>{
  if(!inScope(g,k))return '';
  const items=g.items.filter(matches);count+=items.length;if(!items.length)return '';
  const completed=g.items.filter(i=>state[i.id]?.done).length,isOpen=opened.has(k);
  return `<details class="chapter-group ${g.hot100?'hot-group':''}" data-group="${k}" ${isOpen?'open':''}><summary><span class="chapter-number">${String(k+2).padStart(2,'0')}</span><div class="chapter-title"><b>${esc(g.name)}</b><small>${esc(g.description||tips[k]||'循序练习，积累解题方法')}</small></div><span class="chapter-progress"><b>${completed}<em> / ${g.items.length}</em></b><i style="--chapter-progress:${completed/g.items.length*100}%"></i></span><span class="chapter-arrow">⌄</span></summary><div class="chapter-content">${isOpen?chapterBody(g,items,k):''}</div></details>`;

 }).join('')||'<div class="empty">没有找到匹配的题目，试试其他筛选条件。</div>';
 $('#expand-all').textContent=GROUPS.every((g,k)=>!inScope(g,k)||opened.has(k))?'收起专题':'展开专题';
 $('#count').textContent=visibleItems().length+' 道独立题 · '+count+' 条章节练习';
}
document.querySelectorAll('[data-source]').forEach(b=>b.onclick=()=>{scope=b.dataset.source;chapter=-1;opened.clear();render();$('#practice').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'})});
$('#list').addEventListener('toggle',e=>{const d=e.target;if(d.matches('[data-section]')){const k=+d.dataset.section,c=d.dataset.category,key=k+':'+c;if(d.open){sectionOpened.add(key);if(!d.querySelector('.section-rows').innerHTML)d.querySelector('.section-rows').innerHTML=sectionItems(k,c).map(row).join('')}else sectionOpened.delete(key);return;}if(!d.matches('[data-group]'))return;const k=+d.dataset.group;if(d.open){opened.add(k);if(!d.querySelector('.chapter-content').innerHTML)d.querySelector('.chapter-content').innerHTML=chapterBody(GROUPS[k],GROUPS[k].items.filter(matches),k)}else opened.delete(k)},true);
$('#expand-all').onclick=()=>{const groups=GROUPS.map((g,k)=>({g,k})).filter(({g,k})=>inScope(g,k));const expand=groups.some(({k})=>!opened.has(k));groups.forEach(({k})=>expand?opened.add(k):opened.delete(k));render();$('#expand-all').textContent=expand?'收起专题':'展开专题'};
$('#nav').onclick=e=>{let b=e.target.closest('[data-chapter]');if(b){chapter=+b.dataset.chapter;if(chapter>=0)opened.add(chapter);render();$('#practice').scrollIntoView({block:'start'})}};
$('#list').onclick=e=>{let b=e.target.closest('button');if(!b||!b.matches('[data-star],[data-note]'))return;let id=b.dataset.star||b.dataset.note;state[id]??={};if(b.dataset.star){state[id].star=!state[id].star;persist();render()}else{noteId=id;$('#note-title').textContent=all.find(i=>i.id===id).title;$('#note').value=state[id].note||'';$('#modal').showModal()}};
$('#list').onchange=e=>{let id=e.target.dataset.done;if(id){state[id]??={};state[id].done=e.target.checked;persist();render();if(state[id].done){window.ZhixuCelebrate?.(id,all.filter(i=>state[i.id]?.done).length);toast('已攻克 · '+(all.find(i=>i.id===id)?.title||id))}else toast('已恢复为待挑战，随时再来复习');const next=[...document.querySelectorAll('[data-done]')].find(el=>el.dataset.done===id);next?.focus({preventScroll:true})}};
$('#save-note').onclick=()=>{state[noteId].note=$('#note').value;persist();render()};['search','difficulty','status','focus'].forEach(id=>$('#'+id).addEventListener(id==='search'?'input':'change',render));
try{document.body.classList.toggle('dark',localStorage.getItem('zhixu-theme')==='dark')}catch{}$('#theme').onclick=()=>{let dark=document.body.classList.toggle('dark');try{localStorage.setItem('zhixu-theme',dark?'dark':'light')}catch{}};
$('#random').onclick=()=>{let a=[...new Map(GROUPS.filter(inScope).flatMap(g=>g.items).filter(i=>matches(i)&&!state[i.id]?.done).map(i=>[i.id,i])).values()];if(!a.length)return toast('当前筛选下没有未完成题目');let i=a[Math.floor(Math.random()*a.length)];window.open(i.url,'_blank','noopener')};
$('#export').onclick=()=>{if(window.ZhixuAccount)return window.ZhixuAccount.download();let url=URL.createObjectURL(new Blob([JSON.stringify({version:1,progress:state},null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='知序-进度备份.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
$('#import').onclick=()=>$('#file').click();$('#file').onchange=async e=>{try{let file=e.target.files[0];if(!file)return;if(file.size>5000000)throw Error();let d=JSON.parse(await file.text());if(![1,2].includes(d.version)||!d.progress||typeof d.progress!=='object'||Array.isArray(d.progress))throw Error();mergeAliases(d.progress);let clean={};for(let i of all){let s=d.progress[i.id];if(s){if(typeof s!=='object'||Array.isArray(s))throw Error();clean[i.id]={done:s.done===true,star:s.star===true,note:typeof s.note==='string'?s.note:''}}}if(!confirm('导入会覆盖对应题目的现有进度和笔记，是否继续？'))return;state={...state,...clean};if(d.version===2&&window.ZhixuAccount){const prior=window.ZhixuAccount.get();window.ZhixuAccount.importRecord({progress:state,camp:d.camp||prior.camp,activity:d.activity||prior.activity})}else persist({track:false});render();toast('备份已导入')}catch{toast('无法导入：请选择有效的知序 JSON 备份')}finally{e.target.value=''}};render();


