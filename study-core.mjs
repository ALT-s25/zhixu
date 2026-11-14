export const KEY='zhixu-study-workbench-v1';
export const empty=()=>({version:1,favorites:[],tasks:[]});
export function safeUrl(value){try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password?u.href:'';}catch{return '';}}
export function validate(data){
 if(data?.version!==1||!Array.isArray(data.favorites)||!Array.isArray(data.tasks)||data.tasks.length>1000)throw Error('不是有效的知序学习备份，或任务超过 1000 条');
 const tasks=data.tasks.map(t=>{if(!t||typeof t.id!=='string'||typeof t.title!=='string'||!t.title.trim()||t.title.length>200||!['todo','doing','done','paused'].includes(t.state))throw Error('备份中的任务格式不正确');return {id:t.id.slice(0,100),title:t.title,url:safeUrl(t.url),next:String(t.next||'').slice(0,3000),topic:String(t.topic||'').slice(0,80),state:t.state,updated:Number(t.updated)||0};});
 if(new Set(tasks.map(t=>t.id)).size!==tasks.length)throw Error('备份包含重复任务编号');
 return {version:1,favorites:[...new Set(data.favorites.filter(x=>typeof x==='string').map(x=>x.slice(0,100)))].slice(0,2000),tasks};
}
export function merge(a,b){const tasks=new Map(a.tasks.map(t=>[t.id,t]));for(const t of b.tasks){if(!tasks.has(t.id)||t.updated>tasks.get(t.id).updated)tasks.set(t.id,t);}return validate({version:1,favorites:[...new Set([...a.favorites,...b.favorites])],tasks:[...tasks.values()]});}
