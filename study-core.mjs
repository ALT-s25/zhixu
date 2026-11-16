export const KEY='zhixu-study-workbench-v1';
export const empty=()=>({version:1,favorites:[],tasks:[],custom:[]});
export function safeUrl(value){try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password?u.href:'';}catch{return '';}}
export function scheduleFields(t){
 const text=(key,pattern)=>{const v=t[key]??'';if(typeof v!=='string'||(v&&!pattern.test(v)))throw Error('任务时间格式不正确');return v;};
 const day=text('day',/^\d{4}-\d{2}-\d{2}$/),start=text('start',/^([01]\d|2[0-3]):[0-5]\d$/),end=text('end',/^(([01]\d|2[0-3]):[0-5]\d|24:00)$/),deadline=text('deadline',/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/);
 if((start||end)&&(!day||!start||!end||end<=start))throw Error('计划需填写日期，结束时间须晚于开始时间');
 if(day&&new Date(day+'T12:00:00Z').toISOString().slice(0,10)!==day)throw Error('计划日期无效');
 const progress=t.progress===undefined?(t.state==='done'?100:0):Number(t.progress);if(!Number.isFinite(progress)||progress<0||progress>100)throw Error('进度须在 0 到 100 之间');
 const completedAt=t.completedAt??null;if(completedAt!==null&&(!Number.isFinite(completedAt)||completedAt<=0))throw Error('完成时间无效');
 return {kind:String(t.kind||'学习').slice(0,40),progress:t.state==='done'?100:progress,day,start,end,deadline,completedAt:t.state==='done'?completedAt:null};
}
export function validate(data){
 if(data?.version!==1||!Array.isArray(data.favorites)||!Array.isArray(data.tasks)||data.tasks.length>1000)throw Error('不是有效的知序学习备份，或任务超过 1000 条');
 const tasks=data.tasks.map(t=>{if(!t||typeof t.id!=='string'||typeof t.title!=='string'||!t.title.trim()||t.title.length>200||!['todo','doing','done','paused'].includes(t.state))throw Error('备份中的任务格式不正确');return {...scheduleFields(t),id:t.id.slice(0,100),title:t.title,url:safeUrl(t.url),noteUrl:safeUrl(t.noteUrl),next:String(t.next||'').slice(0,3000),topic:String(t.topic||'').slice(0,80),state:t.state,updated:Number(t.updated)||0};});
 if(new Set(tasks.map(t=>t.id)).size!==tasks.length)throw Error('备份包含重复任务编号');
 const custom=(data.custom||[]);if(!Array.isArray(custom)||custom.length>500)throw Error('自定义资源最多 500 条');
 const cleaned=custom.map(r=>{if(!r||typeof r.id!=='string'||typeof r.title!=='string'||!r.title.trim()||!safeUrl(r.url))throw Error('自定义资源格式不正确');return {id:r.id.slice(0,100),title:r.title.slice(0,200),url:safeUrl(r.url),category:'我的资源',type:'收藏链接',level:'自选',topic:String(r.topic||'').slice(0,80),description:String(r.description||'').slice(0,2000),start:'按自己的目标安排学习任务。',caution:'个人添加的外部链接，未经过站方审核。',updated:Number(r.updated)||0};});
 return {version:1,custom:cleaned,favorites:[...new Set(data.favorites.filter(x=>typeof x==='string').map(x=>x.slice(0,100)))].slice(0,2000),tasks};
}
export function merge(a,b){const tasks=new Map(a.tasks.map(t=>[t.id,t]));for(const t of b.tasks){if(!tasks.has(t.id)||t.updated>tasks.get(t.id).updated)tasks.set(t.id,t);}const custom=new Map((a.custom||[]).map(r=>[r.id,r]));for(const r of b.custom||[]){if(!custom.has(r.id)||r.updated>custom.get(r.id).updated)custom.set(r.id,r);}return validate({version:1,favorites:[...new Set([...a.favorites,...b.favorites])],tasks:[...tasks.values()],custom:[...custom.values()]});}
