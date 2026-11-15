(()=>{
const page=location.pathname.split('/').pop()||'index.html';
const nav=document.createElement('header');nav.className='trial-top';
const links=[['study.html','学习工作台'],['resources.html','资源与工具'],['notes.html','笔记'],['index.html','算法'],['experiments.html','项目实验'],['import.html','导入']];
const brand=document.createElement('a');brand.href='study.html';brand.className='trial-brand';brand.textContent='知序 / Workspace';nav.append(brand);
const menu=document.createElement('nav');menu.setAttribute('aria-label','统一主导航');for(const [href,label] of links){const a=document.createElement('a');a.href=href;a.textContent=label;if(page===href)a.setAttribute('aria-current','page');menu.append(a);}nav.append(menu);
const back=document.createElement('a');back.href='../'+page;back.textContent='返回正式版 ↗';nav.append(back);document.body.prepend(nav);
const banner=document.createElement('div');banner.className='trial-banner';banner.textContent='界面试验版 · 使用独立本机记录，云端与 AI 暂不连接。笔记正文链接进入现有阅读页。';nav.after(banner);
const title=document.querySelector('.library-intro h1');if(title)title.textContent='笔记书房';
for(const id of ['use-cloud','use-local','sync-retry','migrate']){const n=document.getElementById(id);if(n)n.hidden=true;}
document.querySelectorAll('[data-auth-open]').forEach(n=>{n.disabled=true;n.title='试验版暂不连接正式账号';});
})();
