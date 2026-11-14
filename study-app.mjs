import {StudyCloud} from './study-cloud.mjs';
import {resources} from './resources-data.mjs';
import {KEY,empty,validate,merge,safeUrl} from './study-core.mjs';
const $=s=>document.querySelector(s), page=document.body.dataset.page;
let data=empty(),broken=false,editing=null,cloud=null;
const message=(text,error=false)=>{$('#message').textContent=text;$('#message').classList.toggle('error',error);};
try{const raw=localStorage.getItem(KEY);if(raw)data=validate(JSON.parse(raw));}catch{broken=true;message('本机记录无法读取。为保护原记录，暂不覆盖；请先导出原始备份。',true);}
function commit(next){if(cloud?.owner){if(cloud.save(next)){data=next;return true;}return false;}if(broken){message('记录无法读取，请先导出原始备份，再恢复有效备份。',true);return false;}try{localStorage.setItem(KEY,JSON.stringify(validate(next)));data=next;message('已保存在当前浏览器。');return true;}catch{message('保存失败，浏览器空间可能不足。请导出备份后重试。',true);return false;}}
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const button=(text,fn)=>{const n=el('button',text);n.type='button';n.onclick=fn;return n;};
function link(text,url){const a=el('a',text);a.href=safeUrl(url);a.target='_blank';a.rel='noopener noreferrer';return a;}
function openTask(resource=null,task=null){editing=task?.id||null;$('#task-title').value=task?.title||resource?.title||'';$('#task-url').value=task?.url||resource?.url||'';$('#task-topic').value=task?.topic||resource?.category||'';$('#task-next').value=task?.next||resource?.start||'';$('#task-state').value=task?.state||'todo';$('#editor-title').textContent=task?'编辑学习任务':'添加学习任务';$('#editor').showModal();}
function renderResources(){const q=$('#search').value.trim().toLowerCase(),cat=$('#category').value,type=$('#type').value,level=$('#level').value;
 const list=resources.filter(r=>(!cat||r.category===cat)&&(!type||r.type===type)&&(!level||r.level===level)&&(!$('#favorites').checked||data.favorites.includes(r.id))&&[r.title,r.category,r.description,r.start].join(' ').toLowerCase().includes(q));
 $('#count').textContent=`${list.length} / ${resources.length} 项资源`;$('#results').replaceChildren();
 for(const r of list){const row=el('article',undefined,'resource'),body=el('div');body.append(el('div',`${r.category} · ${r.type} · ${r.level}`,'meta'));const heading=el('h2');heading.append(link(r.title+' ↗',r.url));body.append(heading,el('p',r.description,'description'));const d=el('details');d.append(el('summary','怎么用 / 注意事项'),el('p','建议：'+r.start),el('p','注意：'+r.caution),el('small',r.checked?'页面内容核对：'+r.checked+'；不代表已运行验收。':'待逐项复核；收录不代表运行或版本保证。'));body.append(d);const actions=el('div',undefined,'actions');const fav=button(data.favorites.includes(r.id)?'已收藏':'收藏',()=>{const next=structuredClone(data);next.favorites=next.favorites.includes(r.id)?next.favorites.filter(x=>x!==r.id):[...next.favorites,r.id];if(commit(next))render();});fav.setAttribute('aria-pressed',String(data.favorites.includes(r.id)));actions.append(fav,button('加入学习',()=>openTask(r)));row.append(body,actions);$('#results').append(row);}
 if(!list.length)$('#results').append(el('p','没有匹配资源。试试清空关键词或取消筛选。','empty'));
}
function renderTasks(){const q=$('#search').value.trim().toLowerCase(),state=$('#state').value;const list=data.tasks.filter(t=>(!state||t.state===state)&&[t.title,t.topic,t.next].join(' ').toLowerCase().includes(q)).sort((a,b)=>b.updated-a.updated);$('#count').textContent=`${list.length} 个任务 · 全部 ${data.tasks.length} 个`;$('#results').replaceChildren();for(const t of list){const row=el('article',undefined,'task'),body=el('div');body.append(el('div',`${t.topic||'未分类'} · ${{todo:'待开始',doing:'进行中',done:'已完成',paused:'已暂停'}[t.state]}`,'meta'),el('h2',t.title),el('p',t.next?'下一步 / 卡点：'+t.next:'还没记录下一步，可以点编辑补充。','next'));if(t.url)body.append(link('继续学习 ↗',t.url));const actions=el('div',undefined,'actions');actions.append(button('编辑',()=>openTask(null,t)),button(t.state==='done'?'重新开始':'完成',()=>{const next=structuredClone(data),item=next.tasks.find(x=>x.id===t.id);item.state=t.state==='done'?'doing':'done';item.updated=Date.now();if(commit(next))render();}),button('删除',()=>{if(confirm('删除这条任务？关联的外部资源和笔记不会删除。')){const next=structuredClone(data);next.tasks=next.tasks.filter(x=>x.id!==t.id);if(commit(next))render();}}));row.append(body,actions);$('#results').append(row);}if(!list.length){const box=el('div',undefined,'empty');box.append(el('h2',data.tasks.length?'没有匹配的任务':'从一件想学会的事开始'),el('p','自己添加任务，或从资源导航选择材料。路线、节奏和完成标准由你决定。'),button('添加任务',()=>openTask()));$('#results').append(box);}}
function render(){page==='resources'?renderResources():renderTasks();}
$('#search').addEventListener('input',render);document.querySelectorAll('[data-filter]').forEach(n=>n.addEventListener('change',render));
$('#new-task').onclick=()=>openTask();$('#close-editor').onclick=()=>$('#editor').close();
$('#task-form').onsubmit=e=>{e.preventDefault();const title=$('#task-title').value.trim(),raw=$('#task-url').value.trim();if(!title)return;if(raw&&!safeUrl(raw)){message('链接需使用 http 或 https，且不能包含账号密码。',true);return;}const task={id:editing||crypto.randomUUID(),title,url:safeUrl(raw),topic:$('#task-topic').value.trim(),next:$('#task-next').value.trim(),state:$('#task-state').value,updated:Date.now()};const next=structuredClone(data);next.tasks=next.tasks.filter(t=>t.id!==task.id);next.tasks.push(task);if(commit(next)){$('#editor').close();render();}};
$('#backup').onclick=()=>{const raw=broken&&!cloud?.owner?localStorage.getItem(KEY):JSON.stringify(data,null,2);const url=URL.createObjectURL(new Blob([raw||''],{type:'application/json'}));const a=el('a');a.href=url;a.download='知序-学习工作台备份.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('#restore').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>5*1024*1024)throw Error('备份不能超过 5 MB');const incoming=validate(JSON.parse(await file.text()));if(!confirm(`导入 ${incoming.tasks.length} 条任务和 ${incoming.favorites.length} 项收藏？同编号任务保留较新版本。`))return;const next=merge(data,incoming);const old=broken;broken=false;if(!commit(next))broken=old;render();}catch(err){message('恢复失败：'+err.message,true);}finally{e.target.value='';}};
window.addEventListener('storage',e=>{if(e.key===KEY&&!cloud?.owner){try{data=e.newValue?validate(JSON.parse(e.newValue)):empty();broken=false;render();message('已更新其他标签页的修改。');}catch{broken=true;message('其他标签页记录异常，暂停写入。',true);}}});
if(page==='resources'){for(const [selector,key] of [['#category','category'],['#type','type'],['#level','level']]){for(const value of new Set(resources.map(r=>r[key]))){const o=el('option',value);o.value=value;$(selector).append(o);}}$('#compact').onchange=e=>$('#results').classList.toggle('compact',e.target.checked);$('#clear').onclick=()=>{$('#search').value='';document.querySelectorAll('[data-filter]').forEach(n=>n.type==='checkbox'?n.checked=false:n.value='');render();};}
render();

if(window.ZhixuAccount){
 const A=window.ZhixuAccount;
 cloud=new StudyCloud(A,localStorage,next=>{data=next;editing=null;$('#editor').close();render();},message);
 async function accountChanged(){await cloud.connect();if(!cloud.owner){try{data=validate(JSON.parse(localStorage.getItem(KEY)||JSON.stringify(empty())));broken=false;}catch{data=empty();broken=true;}render();}$('#migrate').hidden=!cloud.owner;}
 document.addEventListener('zhixu:record',accountChanged);
 await A.ready;await accountChanged();
 $('#sync-retry').onclick=()=>cloud.retry();
 $('#use-cloud').onclick=async()=>{await cloud.retry();if(cloud.conflict&&confirm('使用云端版本会替换此设备的待同步副本，建议先导出备份。继续？'))await cloud.resolve(false);};
 $('#use-local').onclick=async()=>{await cloud.retry();if(cloud.conflict&&confirm('将用本机副本替换云端版本，包括任务删除。继续？'))await cloud.resolve(true);};
 $('#migrate').onclick=()=>{try{const guest=validate(JSON.parse(localStorage.getItem(KEY)||JSON.stringify(empty())));if(confirm(`将本机游客的 ${guest.tasks.length} 条任务及收藏合并到当前账号？游客原记录保留。`)){if(commit(merge(data,guest)))render();}}catch(e){message(e.message,true);}};
 window.addEventListener('online',()=>cloud.retry());
 window.addEventListener('storage',e=>{if(cloud.owner&&e.key===cloud.key()){cloud.ready=false;message('另一个标签页修改了个人缓存。请刷新页面后继续编辑，避免覆盖。',true);}});
}
