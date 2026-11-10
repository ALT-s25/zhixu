const CODE_HEADERS='#include <algorithm>\n#include <array>\n#include <climits>\n#include <deque>\n#include <functional>\n#include <numeric>\n#include <queue>\n#include <string>\n#include <unordered_map>\n#include <vector>\nusing namespace std;\n\n';
let guideIndex=0,guideTab='workshop',guidePhase='all';
const exampleSteps=new Map();
function guideNav(){
 $('#guide-nav').innerHTML=GUIDES.map((g,k)=>guidePhase==='all'||g.stage.startsWith(guidePhase)?`<button data-guide="${k}" class="${guideIndex===k?'active':''}" aria-current="${guideIndex===k?'true':'false'}"><span>${String(k+1).padStart(2,'0')}</span><b>${esc(g.title)}</b><i>↗</i></button>`:'').join('');
 document.querySelectorAll('[data-phase]').forEach(b=>{const active=b.dataset.phase===guidePhase;b.classList.toggle('active',active);b.setAttribute('aria-pressed',active)});
}
function renderGuide(){
 const g=GUIDES[guideIndex],group=GROUPS[g.group],unique=new Set(group.items.map(i=>i.id));
 guideNav();
 const tabs=[['workshop','跟例题学'],['map','方法地图'],['examples','例题推演'],['templates','模板手册']];
 const header=`<div class="guide-head"><div><p class="eyebrow">FIELD NOTES / ${String(guideIndex+1).padStart(2,'0')} · ${esc(g.stage)}</p><h3>${esc(g.title)}</h3><p>${esc(g.lead)}</p></div><span class="guide-emblem" aria-hidden="true">${['↔','⌕','≋','▦','01','⌘','ƒ','▤','∑','↗','⋈','Aa'][guideIndex]}</span></div><div class="guide-meta"><a href="${esc(g.source)}" target="_blank" rel="noopener">灵茶山艾府 · 原始题单 ↗</a><span>${unique.size} 道题 · ${new Set(group.items.map(i=>i.category)).size} 个小节</span><button data-practice="${guideIndex}">练习本专题 →</button></div><div class="guide-tabs" role="tablist" aria-label="专题内容">${tabs.map(([id,name])=>`<button id="guide-tab-${id}" role="tab" aria-controls="guide-content" aria-selected="${guideTab===id}" tabindex="${guideTab===id?0:-1}" data-guide-tab="${id}" class="${guideTab===id?'active':''}">${name}<small>${id==='examples'?g.examples.length:id==='templates'?g.templates.length:id==='workshop'?LAB_LESSONS.filter(l=>l.group===guideIndex).length:'01'}</small></button>`).join('')}</div>`;
 let content='';
 if(guideTab==='workshop') content=renderLab();
 if(guideTab==='map') content=`<div class="recognize"><span class="content-label">看到这些信号，想到这个专题</span><div>${g.cues.map((c,k)=>`<span><i>${String(k+1).padStart(2,'0')}</i>${esc(c)}</span>`).join('')}</div></div><div class="pattern-grid">${g.patterns.map((p,k)=>`<div class="pattern-card"><span class="pattern-no">0${k+1}</span><h4>${esc(p.name)}</h4><p>${esc(p.rule)}</p></div>`).join('')}</div><div class="pitfall-panel"><h4>写代码之前，先检查这三件事</h4><ul>${g.pitfalls.map(p=>`<li>${esc(p)}</li>`).join('')}</ul></div><div class="next-path"><span>继续深入 ↗</span><p>${esc(g.extend)}</p><button data-guide-tab="examples">带着方法看例题 →</button></div>`;
 if(guideTab==='examples') content=`<p class="panel-description">先读思路，再逐步推演；最后关掉讲解，独立完成一次。以下为本站编写的代表例题解析。</p>${g.examples.map((e,k)=>{const step=exampleSteps.get(guideIndex+':'+k)||0;return `<section class="example-card"><div class="example-top"><span>CASE STUDY / 0${k+1}</span><a href="${esc(e.url)}" target="_blank" rel="noopener">${esc(e.id)} · ${esc(e.title)} ↗</a></div><h4>${esc(e.idea)}</h4><ol>${e.steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol><div class="trace" data-trace="${k}"><div class="trace-label"><span>手动推演</span><b>${step+1} / ${e.trace.length}</b></div><p aria-live="polite">${esc(e.trace[step])}</p><div class="trace-controls"><div class="trace-dots">${e.trace.map((_,j)=>`<span class="${j<=step?'active':''}"></span>`).join('')}</div><button data-trace-step="${k}" data-direction="-1" ${step===0?'disabled':''} aria-label="上一步推演">←</button><button data-trace-step="${k}" data-direction="1" ${step===e.trace.length-1?'disabled':''} aria-label="下一步推演">→</button></div></div><div class="example-cost"><span>复杂度</span>${esc(e.cost)}</div><div class="follow-up"><span>举一反三</span>${e.follow.map(id=>{const q=all.find(i=>i.id===id);return `<a href="${esc(q.url)}" target="_blank" rel="noopener">${esc(id)} · ${esc(q.title)} ↗</a>`}).join('')}</div></section>`}).join('')}`;
 if(guideTab==='templates') content=`<p class="panel-description">C++17 · 每份模板注明适用前提与复杂度。复制时包含标准头文件；提交力扣时按函数签名放入 Solution，节点类型按平台定义调整。</p>${g.templates.map((t,k)=>`<details class="template-card" ${k===0?'open':''}><summary><span>0${k+1}</span><b>${esc(t.name)}</b><i>⌄</i></summary><div class="template-contract"><strong>使用前提</strong><p>${esc(t.contract)}</p></div><p class="cpp-template-cost">${esc(t.cost)}</p>${renderCodeViewer(t.code,'data-copy-template="'+k+'"')}</details>`).join('')}`;
 $('#guide-panel').innerHTML=header+`<div id="guide-content" role="tabpanel" aria-labelledby="guide-tab-${guideTab}" tabindex="0" class="guide-content">${content}</div><div class="guide-credit">题单体系：灵茶山艾府 · 核心学习路线：本站独立编写 · 学习手册更新 2026.11.11 · 题库快照 2026.11.02</div>`;
}
function showGuide(index){
 if(!Number.isInteger(index)||!GUIDES[index])return;
 guideIndex=index;guidePhase='all';guideTab='workshop';renderGuide();
 $('#academy').scrollIntoView({behavior:motionEnabled()?'smooth':'auto',block:'start'});
}
function practiceGuide(index){
 if(!GUIDES[index])return;
 scope='reference';chapter=GUIDES[index].group;opened.add(chapter);
 $('#search').value='';$('#difficulty').value='0';$('#status').value='all';$('#focus').value='all';render();
 $('#practice').scrollIntoView({behavior:motionEnabled()?'smooth':'auto',block:'start'});
}
$('#guide-nav').onclick=e=>{const b=e.target.closest('[data-guide]');if(b){guideIndex=+b.dataset.guide;guideTab='workshop';renderGuide()}};
document.querySelectorAll('[data-phase]').forEach(b=>b.onclick=()=>{guidePhase=b.dataset.phase;if(guidePhase!=='all'&&!GUIDES[guideIndex].stage.startsWith(guidePhase))guideIndex=GUIDES.findIndex(g=>g.stage.startsWith(guidePhase));guideTab='workshop';renderGuide()});
$('#guide-panel').onclick=async e=>{
 const b=e.target.closest('button');if(!b)return;
 if(handleLabButton(b))return;
 if(b.dataset.guideTab){guideTab=b.dataset.guideTab;renderGuide();$('#guide-tab-'+guideTab).focus();return}
 if(b.dataset.practice!==undefined){practiceGuide(+b.dataset.practice);return}
 if(b.dataset.traceStep!==undefined){
  const k=+b.dataset.traceStep,key=guideIndex+':'+k,example=GUIDES[guideIndex].examples[k],step=Math.max(0,Math.min(example.trace.length-1,(exampleSteps.get(key)||0)+(+b.dataset.direction)));
  exampleSteps.set(key,step);const card=b.closest('.trace');card.querySelector('p').textContent=example.trace[step];card.querySelector('.trace-label b').textContent=(step+1)+' / '+example.trace.length;
  card.querySelectorAll('.trace-dots span').forEach((d,j)=>d.classList.toggle('active',j<=step));card.querySelector('[data-direction="-1"]').disabled=step===0;card.querySelector('[data-direction="1"]').disabled=step===example.trace.length-1;return;
 }
 if(b.dataset.copyTemplate!==undefined){
  const template=GUIDES[guideIndex].templates[+b.dataset.copyTemplate];
  try{await navigator.clipboard.writeText(CODE_HEADERS+(template.code.includes('TreeNode')&&!template.code.includes('struct TreeNode')?'struct TreeNode {int val;TreeNode *left,*right;};\n':'')+template.code+'\n');toast('代码已复制 · 包含标准头文件');b.textContent='已复制 ✓';setTimeout(()=>b.textContent='复制代码 ↗',1800)}catch{toast('当前环境不允许自动复制，请选择代码后手动复制')}
 }
};
$('#guide-panel').onkeydown=e=>{if(!e.target.matches('[role="tab"]')||!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const tabs=['workshop','map','examples','templates'];let k=tabs.indexOf(guideTab);k=e.key==='Home'?0:e.key==='End'?3:(k+(e.key==='ArrowRight'?1:3))%4;guideTab=tabs[k];renderGuide();$('#guide-tab-'+guideTab).focus()};
document.addEventListener('click',e=>{const b=e.target.closest('[data-study]');if(b)showGuide(+b.dataset.study)});
const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
let motionPreference=true;
try{motionPreference=localStorage.getItem('zhixu-motion')!=='off'}catch{}
function motionEnabled(){return motionPreference&&!reducedMotion.matches}
function applyMotion(){const enabled=motionEnabled();document.body.classList.toggle('quiet',!enabled);$('#motion').textContent=enabled?'动效 · 开':'动效 · 关';$('#motion').setAttribute('aria-pressed',enabled);$('#motion').title=reducedMotion.matches?'系统已开启减少动态效果':'开关装饰动效'}
$('#motion').onclick=()=>{motionPreference=!motionPreference;try{localStorage.setItem('zhixu-motion',motionPreference?'on':'off')}catch{}applyMotion()};
if(reducedMotion.addEventListener)reducedMotion.addEventListener('change',applyMotion);
let pointerFrame=0;
$('.hero').addEventListener('pointermove',e=>{if(!motionEnabled()||e.pointerType==='touch'||pointerFrame)return;const x=e.clientX,y=e.clientY;pointerFrame=requestAnimationFrame(()=>{const r=$('.hero').getBoundingClientRect();$('.hero').style.setProperty('--mx',((x-r.left)/r.width*100)+'%');$('.hero').style.setProperty('--my',((y-r.top)/r.height*100)+'%');pointerFrame=0})});
applyMotion();renderGuide();

