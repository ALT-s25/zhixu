export const KEY='zhixu-study-workbench-v1';
export const empty=()=>({version:1,favorites:[],tasks:[],custom:[]});
export function safeUrl(value){try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password?u.href:'';}catch{return '';}}
export function validate(data){
 if(data?.version!==1||!Array.isArray(data.favorites)||!Array.isArray(data.tasks)||data.tasks.length>1000)throw Error('不是有效的知序学习备份，或任务超过 1000 条');
 const tasks=data.tasks.map(t=>{if(!t||typeof t.id!=='string'||typeof t.title!=='string'||!t.title.trim()||t.title.length>200||!['todo','doing','done','paused'].includes(t.state))throw Error('备份中的任务格式不正确');return {id:t.id.slice(0,100),title:t.title,url:safeUrl(t.url),noteUrl:safeUrl(t.noteUrl),next:String(t.next||'').slice(0,3000),topic:String(t.topic||'').slice(0,80),state:t.state,updated:Number(t.updated)||0};});
 if(new Set(tasks.map(t=>t.id)).size!==tasks.length)throw Error('备份包含重复任务编号');
 const custom=(data.custom||[]);if(!Array.isArray(custom)||custom.length>500)throw Error('自定义资源最多 500 条');
 const cleaned=custom.map(r=>{if(!r||typeof r.id!=='string'||typeof r.title!=='string'||!r.title.trim()||!safeUrl(r.url))throw Error('自定义资源格式不正确');return {id:r.id.slice(0,100),title:r.title.slice(0,200),url:safeUrl(r.url),category:'我的资源',type:'收藏链接',level:'自选',topic:String(r.topic||'').slice(0,80),description:String(r.description||'').slice(0,2000),start:'按自己的目标安排学习任务。',caution:'个人添加的外部链接，未经过站方审核。',updated:Number(r.updated)||0};});
 return {version:1,custom:cleaned,favorites:[...new Set(data.favorites.filter(x=>typeof x==='string').map(x=>x.slice(0,100)))].slice(0,2000),tasks};
}
export function merge(a,b){const tasks=new Map(a.tasks.map(t=>[t.id,t]));for(const t of b.tasks){if(!tasks.has(t.id)||t.updated>tasks.get(t.id).updated)tasks.set(t.id,t);}return validate({version:1,favorites:[...new Set([...a.favorites,...b.favorites])],tasks:[...tasks.values()],custom:[...new Map([...(a.custom||[]),...(b.custom||[])].map(r=>[r.id,r])).values()]});}
