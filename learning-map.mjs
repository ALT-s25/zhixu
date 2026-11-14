import {branchPath,positionsFor,treeLayout,validSeed} from './learning-map-core.mjs';
import {renderMarkdown} from './learning-map-markdown.mjs';
const $=s=>document.querySelector(s),A=window.ZhixuAccount,SEED='zhixu-map-seed-v1';
let owner=null,epoch=0,chat=null,turns=[],list=[],selected=null,view='map',busy=false,loading=false,layoutBusy=false,seed=null,pending=null,poll=null;
let positions=new Map(),zoom=1,pan={x:0,y:0};
function text(tag,value,cls){const e=document.createElement(tag);e.textContent=value;if(cls)e.className=cls;return e;}
function status(message,error=false){$('#status').textContent=message;$('#status').classList.toggle('error',error);}
function setBusy(value){busy=value;$('#send').disabled=value;$('#create-chat').disabled=value;$('#send').textContent=value?'正在思考…':'发送问题 ↑';}
async function api(action,body){
 const run=epoch;if(!A?.user())throw Error('请先登录，再打开自己的学习地图');
 const response=await A.authorizedBackendFetch('/api/v1/ai/conversations'+(action?'/'+action:''),body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{});
 if(run!==epoch)throw Error('账号已切换');let data;try{data=await response.json();}catch{throw Error('服务正在启动或返回异常，请稍后点击刷新');}
 if(!response.ok){const error=Error(data.message||'学习地图暂时不可用，请检查后端是否已更新');error.status=response.status;throw error;}return data;
}
function quota(n){if(Number.isFinite(n))$('#quota').textContent=`今日剩余 ${n} 次`;}
function history(){const query=$('#history-filter').value.trim().toLowerCase(),container=$('#history-list');container.replaceChildren();
 const filtered=list.filter(c=>(c.title+c.preview).toLowerCase().includes(query));
 for(const c of filtered){const b=text('button','','history-item');b.append(text('strong',c.title),text('span',c.preview));b.setAttribute('aria-current',String(c.id===chat?.id));b.onclick=()=>load(c.id);container.append(b);}
 if(!filtered.length)container.append(text('p',query?'没有找到这条路线。':'还没有保存的对话。','muted'));
}
async function refreshList(){const run=epoch;const data=await api('');if(run!==epoch)return;list=data.conversations;quota(data.remaining);history();}
function adopt(data,keep=true){chat=data.conversation;turns=data.turns;quota(data.remaining);if(!keep||!turns.some(t=>t.id===selected))selected=null;positions=positionsFor(turns);$('#empty').hidden=true;$('#seed').hidden=true;$('#workspace').hidden=false;$('#map-title').textContent=chat.title;$('#map-subtitle').textContent=`${turns.length} 轮对话 · 选择一个回答，继续长出新的分支`;$('#source-link').href=chat.sourcePath?new URL(chat.sourcePath,location.href).href:'library.html?id='+encodeURIComponent(chat.documentId);$('#source-link').textContent='回到笔记';history();render();schedulePoll();}
async function load(id){if(busy||loading||layoutBusy){status('请等当前操作完成后再切换。');return;}loading=true;const run=epoch;status('正在读取云端对话…');
 try{const data=await api('read',{id});if(run!==epoch)return;pending=null;$('#question').value='';$('#consent').checked=false;count();adopt(data,false);selected=turns.filter(t=>t.state==='done').at(-1)?.id||null;render();fitAll();status('对话已从云端恢复。');}catch(e){if(run===epoch)status(e.message,true);}finally{if(run===epoch)loading=false;}}
function transform(){$('#world').style.transform=`translate(${pan.x}px,${pan.y}px) scale(${zoom})`;$('#zoom-value').textContent=Math.round(zoom*100)+'%';}
function center(){const p=positions.get(selected||'root');if(!p)return;const rect=$('#viewport').getBoundingClientRect();pan={x:rect.width/2-(p.x+140)*zoom,y:Math.max(120,rect.height/2)-(p.y+82)*zoom};transform();}
function fitAll(){if(!positions.size)return;const points=[...positions.values()],left=Math.min(...points.map(p=>p.x)),top=Math.min(...points.map(p=>p.y)),width=Math.max(...points.map(p=>p.x))+280-left,height=Math.max(...points.map(p=>p.y))+164-top,rect=$('#viewport').getBoundingClientRect();zoom=Math.max(.35,Math.min(1,(rect.width-40)/width,(rect.height-110)/height));pan={x:(rect.width-width*zoom)/2-left*zoom,y:(rect.height-80-height*zoom)/2-top*zoom};transform();}
function renderGraph(){const container=$('#nodes'),svg=$('#edges');container.replaceChildren();svg.replaceChildren();if(!chat)return;
 const chain=new Set(branchPath(turns,selected).map(t=>t.id));
 for(const t of turns){const a=positions.get(t.parentId||'root'),b=positions.get(t.id);if(!a||!b)continue;const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',`M ${a.x+280} ${a.y+82} C ${a.x+310} ${a.y+82}, ${b.x-30} ${b.y+82}, ${b.x} ${b.y+82}`);if(chain.has(t.id))path.classList.add('active');svg.append(path);}
 const nodes=[{id:'root',question:chat.excerpt,state:'root'},...turns];
 for(const t of nodes){const p=positions.get(t.id);if(!p)continue;const card=document.createElement('div');card.className=`map-node ${t.state}`;card.classList.toggle('current',(selected||'root')===t.id);card.style.left=p.x+'px';card.style.top=p.y+'px';card.dataset.id=t.id;card.tabIndex=0;card.setAttribute('role','button');card.setAttribute('aria-label',(t.id==='root'?'原始笔记：':t.question+'，')+(t.state==='done'?'查看回答':''));card.setAttribute('aria-pressed',String((selected||'root')===t.id));
  if(t.id!=='root'){const grip=text('span','⠿','node-grip');grip.title='拖动排列卡片';grip.setAttribute('aria-hidden','true');grip.dataset.drag=t.id;card.append(grip);}
  card.append(text('span',t.state==='root'?'这段笔记是起点':t.state==='done'?'小芽已回答':t.state==='failed'?'这次回答未完成':'正在生成 / 等待同步','node-tag'),text('strong',t.question),text('p',t.state==='root'?'选中它，可以另开一条思路。':t.answer||'问题已经保存，刷新可查看最新状态。'));
  card.onclick=e=>{if(e.target.closest('[data-drag]'))return;choose(t.id==='root'?null:t.id);};card.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose(t.id==='root'?null:t.id);}else if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)&&t.id!=='root'){e.preventDefault();if(layoutBusy)return;const delta={ArrowUp:[0,-20],ArrowDown:[0,20],ArrowLeft:[-20,0],ArrowRight:[20,0]}[e.key];p.x+=delta[0];p.y+=delta[1];saveLayout([{id:t.id,...p}]);renderGraph();$('#nodes').querySelector(`[data-id="${t.id}"]`)?.focus();}};container.append(card);
 }
}
function choose(id){if(busy)return;selected=id;pending=null;render();if(innerWidth<860){$('#reading').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});}}
function addTurn(t){const section=document.createElement('section');section.className='message';section.append(text('p','你 · '+new Date(t.createdAt).toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}),'message-label'),text('p',t.question,'message-question'),text('p','小芽','message-label'));const answer=document.createElement('div');
 if(t.state==='done')renderMarkdown(answer,t.answer||'');else{answer.textContent=t.state==='failed'?'这次没有完成回答，可以重新提问。':'问题已保存，正在等待回答。若等待较久，请刷新对话确认状态。';section.classList.toggle('error',t.state==='failed');}section.append(answer);
 const actions=document.createElement('div');actions.className='message-actions';if(t.state==='done'){const b=text('button','从这里分支追问');b.onclick=()=>{choose(t.id);$('#question').focus();};actions.append(b);const copy=text('button','复制回答');copy.onclick=async()=>{try{await navigator.clipboard.writeText(t.answer);copy.textContent='已复制';}catch{status('复制失败，请选中文字手动复制。',true);}};actions.append(copy);}else if(t.state==='failed'){const retry=text('button','重新提问');retry.onclick=()=>{choose(t.parentId);$('#question').value=t.question;count();$('#question').focus();};actions.append(retry);}section.append(actions);return section;
}
function renderReading(){const container=$('#messages');container.replaceChildren();const t=turns.find(t=>t.id===selected);$('#branch-title').textContent=t?'当前分支':'原始笔记';$('#parent-label').textContent=t?`追问接在：${t.question}`:'这次问题会接在原文之后，开启一条新分支';
 if(!t){container.append(text('p','本次学习的原文','message-label'),text('blockquote',chat.excerpt,'source-quote'));}else if(view==='chat'){for(const item of branchPath(turns,selected))container.append(addTurn(item));}else container.append(addTurn(t));
 container.scrollTop=view==='chat'?container.scrollHeight:0;
 $('#send').disabled=busy||!!(t&&t.state!=='done');if(t&&t.state!=='done')$('#parent-label').textContent='这条回答尚未完成。选择已完成的回答或「从原文另开分支」后提问。';
}
function render(){renderGraph();renderReading();transform();}
function count(){$('#count').textContent=$('#question').value.length+' / 300';}
async function saveLayout(changes){if(!chat||layoutBusy)return;const run=epoch,id=chat.id;layoutBusy=true;$('#save-state').textContent='正在保存布局…';try{const data=await api('layout',{id,revision:chat.revision,positions:changes});if(run!==epoch||id!==chat?.id)return;chat.revision=data.revision;for(const c of changes){const t=turns.find(t=>t.id===c.id);if(t){t.x=c.x;t.y=c.y;}}$('#save-state').textContent='布局已云端保存';}catch(e){if(run===epoch){$('#save-state').textContent='布局未保存';status(e.message+'。点击刷新对话可恢复云端布局。',true);}}finally{if(run===epoch)layoutBusy=false;}}
function schedulePoll(){clearTimeout(poll);if(!turns.some(t=>t.state==='running'&&Date.now()-t.createdAt<180000))return;const run=epoch,id=chat.id;poll=setTimeout(async()=>{if(run!==epoch||id!==chat?.id)return;if(busy||layoutBusy||document.hidden){schedulePoll();return;}try{const data=await api('read',{id});if(run===epoch&&id===chat?.id)adopt(data);}catch(e){if(run===epoch)status(e.message,true);}},5000);}
$('#composer').onsubmit=async e=>{e.preventDefault();if(busy||!chat)return;const run=epoch,id=chat.id,question=$('#question').value.trim();if(!question){status('先写下你想问的问题。',true);$('#question').focus();return;}if(!$('#consent').checked){status('请先确认允许发送这段原文和当前分支的必要上文。',true);return;}
 const payload={id,parentId:selected,question,mode:$('#mode').value},signature=JSON.stringify(payload);if(pending?.signature!==signature)pending={signature,requestId:crypto.randomUUID()};const requestId=pending.requestId;setBusy(true);status('小芽正在沿着这条思路思考。问题提交后会保存到云端，请勿重复点击。');
 try{const data=await api('send',{...payload,requestId});if(run!==epoch||id!==chat?.id)return;selected=requestId;adopt(data);$('#question').value='';count();pending=null;center();status('回答已保存到你的学习地图。');await refreshList();}
 catch(error){if(run!==epoch)return;status(error.message,true);if(error.status&&error.status!==409)pending=null;
  try{const data=await api('read',{id});if(run===epoch&&id===chat?.id){adopt(data);if(data.turns.some(t=>t.id===requestId&&t.state==='done')){selected=requestId;render();pending=null;$('#question').value='';count();status('已找回云端保存的回答。');}}}catch{}
 }finally{if(run===epoch){setBusy(false);renderReading();}}
};
$('#question').oninput=count;$('#question').onkeydown=e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'&&!e.isComposing){e.preventDefault();$('#composer').requestSubmit();}};
document.querySelectorAll('[data-question]').forEach(b=>b.onclick=()=>{$('#question').value=b.dataset.question;count();$('#question').focus();});
$('#root-branch').onclick=()=>choose(null);
$('#history-filter').oninput=history;
$('#refresh').onclick=async()=>{try{await refreshList();status('历史对话已刷新。');}catch(e){status(e.message,true);}};
$('#refresh-chat').onclick=async()=>{if(!chat||busy||layoutBusy)return;const run=epoch,id=chat.id;try{const data=await api('read',{id});if(run===epoch&&id===chat?.id){adopt(data);status('已读取最新云端记录。');}}catch(e){if(run===epoch)status(e.message,true);}};
for(const mode of ['map','chat'])$('#view-'+mode).onclick=()=>{view=mode;document.body.classList.toggle('chat-view',mode==='chat');$('#view-map').setAttribute('aria-pressed',mode==='map');$('#view-chat').setAttribute('aria-pressed',mode==='chat');if(chat){renderReading();if(mode==='map')center();}};
$('#fit-all').onclick=fitAll;
$('#zoom-in').onclick=()=>{zoom=Math.min(2,zoom+.15);center();};$('#zoom-out').onclick=()=>{zoom=Math.max(.35,zoom-.15);center();};$('#fit').onclick=center;
$('#arrange').onclick=()=>{if(!chat||layoutBusy)return;positions=treeLayout(turns);renderGraph();fitAll();saveLayout(turns.map(t=>({id:t.id,...positions.get(t.id)})));};
let drag=null;$('#viewport').onpointerdown=e=>{if(e.button!==0||layoutBusy)return;const grip=e.target.closest('[data-drag]');if(e.target.closest('.map-node')&&!grip)return;const id=grip?.dataset.drag,p=id?positions.get(id):pan;drag={id,startX:e.clientX,startY:e.clientY,x:p.x,y:p.y,pointer:e.pointerId};$('#viewport').setPointerCapture(e.pointerId);e.preventDefault();};
$('#viewport').onpointermove=e=>{if(!drag||drag.pointer!==e.pointerId)return;const factor=drag.id?zoom:1,dx=(e.clientX-drag.startX)/factor,dy=(e.clientY-drag.startY)/factor,p={x:Math.max(-49000,Math.min(49000,drag.x+dx)),y:Math.max(-49000,Math.min(49000,drag.y+dy))};if(drag.id){positions.set(drag.id,p);renderGraph();}else{pan=p;transform();}};
function endDrag(e){if(!drag)return;const d=drag;drag=null;if($('#viewport').hasPointerCapture?.(e.pointerId))$('#viewport').releasePointerCapture(e.pointerId);if(d.id)saveLayout([{id:d.id,...positions.get(d.id)}]);}
$('#viewport').onpointerup=endDrag;$('#viewport').onpointercancel=endDrag;
$('#viewport').onwheel=e=>{if(e.ctrlKey||e.metaKey){e.preventDefault();zoom=Math.max(.35,Math.min(2,zoom-e.deltaY*.002));center();}};
$('#create-chat').onclick=async()=>{if(busy||!validSeed(seed,A.user())){status('这段选择已过期或账号已切换，请回到笔记重新选择。',true);return;}const run=epoch;setBusy(true);status('正在保存学习起点…');
 try{seed.id??=crypto.randomUUID();sessionStorage.setItem(SEED,JSON.stringify(seed));const data=await api('open',{id:seed.id,excerpt:seed.excerpt,...(seed.documentId?{documentId:seed.documentId}:{sourcePath:seed.sourcePath})});if(run!==epoch)return;sessionStorage.removeItem(SEED);seed=null;adopt(data,false);center();$('#question').value='请帮我讲解这段笔记。';count();await refreshList();status('起点已保存。写下第一个问题，开始学习。');}catch(e){if(run===epoch)status(e.message,true);}finally{if(run===epoch)setBusy(false);}};
async function changed(){const next=A?.user()?.id||null;if(next===owner)return;owner=next;epoch++;const run=epoch;clearTimeout(poll);chat=null;turns=[];list=[];seed=null;pending=null;selected=null;busy=false;loading=false;layoutBusy=false;drag=null;$('#messages').replaceChildren();$('#nodes').replaceChildren();$('#edges').replaceChildren();$('#question').value='';$('#consent').checked=false;$('#workspace').hidden=true;$('#seed').hidden=true;$('#empty').hidden=false;$('#map-title').textContent='小芽学习地图';$('#map-subtitle').textContent='选一段笔记，让问题长出自己的枝叶。';$('#save-state').textContent='';$('#quota').textContent='今日额度 —';setBusy(false);history();count();
 if(!owner){try{sessionStorage.removeItem(SEED);}catch{}status('登录后查看自己的学习路线。');return;}
 try{const stored=JSON.parse(sessionStorage.getItem(SEED)||'null');if(validSeed(stored,A.user())){seed=stored;$('#seed').hidden=false;$('#empty').hidden=true;$('#seed-excerpt').textContent=seed.excerpt;}else sessionStorage.removeItem(SEED);}catch{}
 status('正在读取你的学习路线…');try{await refreshList();if(run!==epoch)return;status(seed?'这段笔记已准备好，点击保存开始。':'云端已连接，选择一条路线继续学习。');}catch(e){if(run===epoch)status(e.message,true);}
}
await A?.ready;owner=undefined;document.addEventListener('zhixu:record',changed);await changed();addEventListener('pagehide',()=>clearTimeout(poll));
