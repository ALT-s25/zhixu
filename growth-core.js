/* Pure record/statistics helpers shared by the account UI and automated checks. */
(function(root){
  const dateKey=(d=new Date())=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  const dayBefore=d=>{const x=new Date(d+'T12:00:00');x.setDate(x.getDate()-1);return dateKey(x)};
  function clean(input,ids){
    const out={progress:{},camp:{goal:3,days:{}},activity:{}};
    if(!input||typeof input!=='object')return out;
    const canonical=id=>/^LC[RP] \d+\.?$/.test(id)?id.slice(0,4)+Number(id.slice(4).replace('.','')):id;
    for(const [oldId,p] of Object.entries(input.progress||{})){
      const id=canonical(oldId);if(!ids.has(id)||!p||typeof p!=='object')continue;
      const prior=out.progress[id]||{};out.progress[id]={done:prior.done||p.done===true,star:prior.star||p.star===true,note:[...new Set([prior.note,typeof p.note==='string'?p.note.slice(0,50000):''].filter(Boolean))].join('\n\n—— 合并旧编号笔记 ——\n\n')};
    }
    if([1,3,5,10].includes(input.camp?.goal))out.camp.goal=input.camp.goal;
    for(const [target,source] of [[out.camp.days,input.camp?.days],[out.activity,input.activity]]){
      if(!source||typeof source!=='object')continue;
      for(const [date,items] of Object.entries(source)){
        if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date+'T12:00:00'))||dateKey(new Date(date+'T12:00:00'))!==date||date>dateKey()||!Array.isArray(items))continue;
        target[date]=[...new Set(items.filter(id=>typeof id==='string').map(canonical).filter(id=>ids.has(id)))];
      }
    }
    return out;
  }
  function stats(record,items,today=dateKey()){
    const done=items.filter(i=>record.progress[i.id]?.done),counts={};
    for(const [day,ids] of Object.entries(record.activity))counts[day]=new Set(ids).size;
    let streak=0,day=counts[today]?today:dayBefore(today);
    while(counts[day]){streak++;day=dayBefore(day)}
    let best=0,run=0,last='';
    for(const d of Object.keys(counts).filter(d=>counts[d]>0).sort()){run=last===dayBefore(d)?run+1:1;best=Math.max(best,run);last=d}
    const tiers=[[0,'初见小芽'],[10,'扎根学徒'],[50,'枝叶新生'],[100,'百题探险家'],[300,'森林守望者'],[1000,'算法大树']];
    const level=tiers.filter(t=>done.length>=t[0]).at(-1),next=tiers.find(t=>done.length<t[0]);
    return {done:done.length,streak,best,counts,activeDays:Object.values(counts).filter(n=>n>0).length,level,next,
      recent:done.map(i=>({...i,date:Object.keys(record.activity).filter(d=>record.activity[d].includes(i.id)).sort().at(-1)||''})).sort((a,b)=>b.date.localeCompare(a.date))};
  }
  const api={dateKey,dayBefore,clean,stats};root.ZhixuGrowth=api;
  if(typeof module!=='undefined')module.exports=api;
})(globalThis);
