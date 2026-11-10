// A small daily goal; progress remains in the existing question store.
const CAMP_KEY='zhixu-camp-v1';
let camp={goal:3,days:{}};
try{const saved=JSON.parse(localStorage.getItem(CAMP_KEY)||'null');if(saved&&typeof saved==='object'){camp.goal=[1,3,5,10].includes(saved.goal)?saved.goal:3;camp.days=saved.days&&typeof saved.days==='object'&&!Array.isArray(saved.days)?saved.days:{}}}catch{}
function campDate(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function campCount(){const ids=camp.days[campDate()];return Array.isArray(ids)?new Set(ids.filter(id=>state[id]?.done&&all.some(i=>i.id===id))).size:0}
function saveCamp(){if(window.ZhixuAccount){window.ZhixuAccount.save();return}try{const dates=Object.keys(camp.days).sort();for(const date of dates.slice(0,-90))delete camp.days[date];localStorage.setItem(CAMP_KEY,JSON.stringify(camp))}catch{}}
function renderCamp(){
 const today=campCount(),total=all.filter(i=>state[i.id]?.done).length,goal=camp.goal;
 $('#camp-goal').value=String(goal);$('#camp-today').textContent=today;
 $('#camp-fill').style.width=Math.min(100,today/goal*100)+'%';
 $('#camp-meter').setAttribute('aria-valuenow',Math.min(today,goal));$('#camp-meter').setAttribute('aria-valuemax',goal);
 $('#camp-message').textContent=today>=goal?'今天的小目标达成！复盘一下，也可以安心休息。':today===0?'先完成一道，给今天一个小小的开始。':'已经前进 '+today+' 步，再完成 '+(goal-today)+' 题就到今天的小终点。';
 const badges=[[1,'小芽出发','✿'],[10,'渐入佳境','✦'],[50,'解题能手','⚑'],[100,'百题探险家','★']];
 $('#camp-medals').innerHTML=badges.map(([n,name,icon])=>`<span class="camp-medal ${total>=n?'earned':''}" title="累计完成 ${n} 道题${total>=n?' · 已解锁':' · 尚未解锁'}" aria-label="${name}，累计完成 ${n} 题${total>=n?'，已解锁':'，未解锁'}"><i aria-hidden="true">${icon}</i>${name}<small>${n}</small></span>`).join('');
}
const campOriginalRender=render;
render=function(){campOriginalRender();renderCamp()};
$('#camp-goal').onchange=()=>{camp.goal=+$('#camp-goal').value;saveCamp();renderCamp()};
let celebrationTimer;
$('#list').addEventListener('change',e=>{
 const id=e.target.dataset.done;if(!id||!e.target.checked||state[id]?.done)return;
 const date=campDate(),ids=Array.isArray(camp.days[date])?camp.days[date]:[];
 camp.days[date]=[...new Set([...ids,id])];saveCamp();
 queueMicrotask(()=>{renderCamp();if(typeof motionEnabled==='function'&&!motionEnabled())return;
  clearTimeout(celebrationTimer);document.body.classList.add('camp-celebrate');
  celebrationTimer=setTimeout(()=>document.body.classList.remove('camp-celebrate'),1400);
 });
},true);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)renderCamp()});
renderCamp();
