(function(){
  const G=ZhixuGrowth,items=[...new Map(GROUPS.flatMap(g=>g.items).map(i=>[i.id,i])).values()];
  const $=s=>document.querySelector(s),escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const badges=[[1,'迈出第一步','第一道题，第一片叶子'],[10,'十题发芽','十次认真，开始生根'],[50,'枝叶渐丰','五十道题，积累成形'],[100,'百题探险家','一百道题，走过一段山路'],[300,'森林守望者','三百道题，方法连成森林'],[1000,'算法大树','千题积累，继续向上生长']];
  let selected=G.dateKey();
  function render(){
    const record=ZhixuAccount.get(),s=G.stats(record,items),today=G.dateKey(),next=badges.find(b=>s.done<b[0]);
    $('#growth-date').textContent=new Date().toLocaleDateString('zh-CN',{year:'numeric',month:'long',day:'numeric',weekday:'long'});
    $('#growth-finding').textContent=s.counts[today]?`今天已经认真练习 ${s.counts[today]} 道题。这些小小的进步，会慢慢长成底气。`:'先完成一道题，留下今天的第一片叶子。';
    $('#growth-level').textContent=s.level[1];$('#growth-next').textContent=s.next?`再完成 ${s.next[0]-s.done} 道题，长成「${s.next[1]}」。`:'已经长成算法大树，每一道新题仍是新的风景。';
    $('#growth-level-fill').style.width=(s.next?(s.done-s.level[0])/(s.next[0]-s.level[0])*100:100)+'%';
    $('#growth-level-caption').textContent=s.next?`${s.done-s.level[0]} / ${s.next[0]-s.level[0]} 道 · 本阶段进度`:'最高阶段已达成';
    $('#growth-tree').dataset.stage=s.done>=100?'tree':s.done>=10?'branch':'sprout';
    for(const [id,val] of [['total',s.done],['streak',s.streak],['best',s.best],['days',s.activeDays]])$('#growth-'+id).textContent=val;
    const end=new Date(today+'T12:00:00');end.setDate(end.getDate()+(7-end.getDay())%7);const start=new Date(end);start.setDate(start.getDate()-83);
    let cells='',months='',lastMonth=-1;
    for(let i=0;i<84;i++){
      const d=new Date(start);d.setDate(d.getDate()+i);const date=G.dateKey(d),n=s.counts[date]||0,future=date>today;
      if(i%7===0){months+=`<span>${d.getMonth()!==lastMonth?d.getMonth()+1+'月':''}</span>`;lastMonth=d.getMonth()}
      cells+=`<button class="calendar-day ${date===today?'is-today':''}" data-date="${date}" data-tone="${n===0?0:n<2?1:n<5?2:3}" aria-label="${date}，${future?'尚未到来':n+' 道练习'}" aria-pressed="${date===selected}" title="${date} · ${n} 道" ${future?'disabled':''}></button>`;
    }
    $('#growth-calendar').innerHTML=cells;$('#calendar-months').innerHTML=months;
    const names=(record.activity[selected]||[]).map(id=>items.find(i=>i.id===id)?.title).filter(Boolean);
    $('#calendar-detail').textContent=selected+' · '+(names.length?names.length+' 道：'+names.slice(0,3).join('、')+(names.length>3?'…':''):'这一天还没有练习足迹');
    $('#next-badge-title').textContent=next?next[1]:'整本徽章册，点亮了';$('#next-badge-detail').textContent=next?next[2]:'你的每一份积累，都值得好好收藏。';$('#next-badge-count').textContent=next?`${s.done} / ${next[0]} 题`:'6 / 6 枚徽章';
    $('#badge-count').textContent=badges.filter(b=>s.done>=b[0]).length+' / 6 已解锁';
    $('#badge-list').innerHTML=badges.map(([n,name,description],i)=>`<div class="growth-badge ${s.done>=n?'unlocked':''}"><div class="badge-mark" aria-hidden="true"><svg viewBox="0 0 48 48"><path d="m24 3 6 6 9 1 1 9 5 7-6 6-2 9-9-1-8 4-5-8-8-4 2-9-1-8 9-2Z"/></svg><span>${s.done>=n?'✓':String(i+1).padStart(2,'0')}</span></div><strong>${name}</strong><small>${s.done>=n?'已解锁':n+' 题解锁'}</small><span class="badge-tip">${description}</span></div>`).join('');
    $('#growth-recent').innerHTML=s.recent.length?s.recent.slice(0,5).map(i=>`<div class="recent-row"><a href="${escape(i.url)}" target="_blank" rel="noopener"><span>${escape(i.id)}</span>${escape(i.title)}</a><time>${i.date||'历史记录'}</time></div>`).join(''):'<div class="growth-empty"><p>这一页，等你写下第一道题。</p><a href="index.html#practice">从一道简单题开始 →</a></div>';
  }
  $('#growth-calendar').onclick=e=>{const b=e.target.closest('[data-date]');if(b){selected=b.dataset.date;render()}};
  $('#growth-export').onclick=()=>ZhixuAccount.download();document.addEventListener('zhixu:record',render);render();
})();
