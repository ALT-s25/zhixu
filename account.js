/* Supabase REST integration. Tokens stay in sessionStorage (this browser tab).
   Public project key + server-side RLS; passwords are sent only to Supabase Auth. */
(function(){
  'use strict';
  const G=ZhixuGrowth,ids=new Set(GROUPS.flatMap(g=>g.items).map(i=>i.id)),config=window.ZHIXU_CLOUD||{},readOnly=window.ZHIXU_ACCOUNT_READONLY===true;
  let privilegedKey=(config.publishableKey||'').startsWith('sb_secret_');
  try{privilegedKey ||= JSON.parse(atob(config.publishableKey.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).role==='service_role'}catch{}
  const enabled=/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(config.url||'')&&!!config.publishableKey&&!privilegedKey;
  const url=(config.url||'').replace(/\/$/,''),SESSION='zhixu-auth-tab-v1',GUEST_ACTIVITY='zhixu-activity-v1';
  const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}};
  const copy=o=>JSON.parse(JSON.stringify(o));
  const guest=()=>G.clean({progress:read('zhixu-progress-v1',{}),camp:read('zhixu-camp-v1',{goal:3,days:{}}),activity:read(GUEST_ACTIVITY,read('zhixu-camp-v1',{}).days||{})},ids);
  let record=guest(),session=null,revision=0,dirty=false,ready=true,busy=false,conflict=false,generation=0,timer,refreshing=null;
  let status=enabled?'游客模式 · 仅保存在这台设备':'游客模式 · 云端账号尚未启用';
  const host=window.ZhixuHost||{get:()=>record,set:()=>{},render:()=>{}};
  const emit=()=>{drawAccount();document.dispatchEvent(new CustomEvent('zhixu:record',{detail:{record:copy(record)}}))};
  function apply(next){record=G.clean(next,ids);host.set(copy(record));host.render();emit()}
  function cache(){
    if(readOnly)return true;
    try{
      if(session)localStorage.setItem('zhixu-user-'+session.user.id,JSON.stringify({record,revision,dirty}));
      else{localStorage.setItem('zhixu-progress-v1',JSON.stringify(record.progress));localStorage.setItem('zhixu-camp-v1',JSON.stringify(record.camp));localStorage.setItem(GUEST_ACTIVITY,JSON.stringify(record.activity))}
      return true;
    }catch{status='设备保存失败，请立即导出备份';emit();return false}
  }
  function storeSession(){try{if(session)sessionStorage.setItem(SESSION,JSON.stringify(session));else sessionStorage.removeItem(SESSION)}catch{}}
  async function request(path,body,token,method=body?'POST':'GET'){
    let response;
    try{response=await fetch(url+path,{method,headers:{apikey:config.publishableKey,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)})}
    catch{throw Error('连接失败，请检查网络后重试。记录仍保存在此设备。')}
    const data=await response.json().catch(()=>null);
    if(!response.ok){const error=Error(data?.msg||data?.message||data?.error_description||'请求失败');error.code=data?.code||data?.error_code;error.status=response.status;throw error}
    return data;
  }
  async function token(){
    if(!session)throw Error('请先登录');
    if(session.expires_at>Date.now()/1000+60)return session.access_token;
    if(!refreshing){const old=session,epoch=generation;refreshing=request('/auth/v1/token?grant_type=refresh_token',{refresh_token:old.refresh_token}).then(s=>{
      if(epoch!==generation||session!==old)throw Error('账号已切换，请重试');
      session={...s,expires_at:s.expires_at??Date.now()/1000+s.expires_in};storeSession();return session.access_token;
    }).finally(()=>{refreshing=null})}
    return refreshing;
  }
  async function cloudRead(){const access=await token();const rows=await request('/rest/v1/zhixu_records?select=payload,revision&user_id=eq.'+encodeURIComponent(session.user.id),null,access);return rows[0]||{payload:{},revision:0}}
  async function connect(s){
    generation++;session={...s,expires_at:s.expires_at??Date.now()/1000+(s.expires_in||3600)};storeSession();
    revision=0;ready=false;dirty=false;conflict=false;status='正在读取个人云端记录…';apply({});
    if(readOnly){ready=true;status='已登录 · 资料工作台';emit();return}
    const epoch=generation;
    try{
      const remote=await cloudRead();if(epoch!==generation)return;
      const saved=read('zhixu-user-'+session.user.id,null);revision=remote.revision;
      if(saved?.dirty){dirty=true;conflict=saved.revision!==revision;apply(saved.record)}else apply(remote.payload);
      ready=true;status=conflict?'其他设备更新过记录，请处理版本冲突':dirty?'正在同步此设备的待保存记录…':'云端记录已同步';emit();if(dirty&&!conflict)await sync();
    }catch(error){if(epoch!==generation)return;const saved=read('zhixu-user-'+session.user.id,null);if(saved){revision=saved.revision;dirty=!!saved.dirty;apply(saved.record)}status='读取失败 · '+friendly(error)+'；重连前只读';emit()}
  }
  function save(options={}){
    if(readOnly)return;
    if(!ready){host.set(copy(record));host.render();return}
    const next=G.clean({...host.get(),activity:record.activity},ids);
    if(options.track!==false){
      const completed=[...ids].filter(id=>next.progress[id]?.done&&!record.progress[id]?.done);
      if(completed.length)next.activity[G.dateKey()]=[...new Set([...(next.activity[G.dateKey()]||[]),...completed])];
    }
    record=next;dirty=!!session;cache();status=session?'有更改等待同步':'游客记录已保存在此设备';emit();
    if(session){clearTimeout(timer);timer=setTimeout(sync,700)}
  }
  async function sync(){
    if(readOnly||!session||!ready||busy||conflict)return;
    busy=true;const epoch=generation;
    try{
      while(dirty&&epoch===generation){
        const payload=copy(record),serialized=JSON.stringify(payload),base=revision;
        status='正在同步…';emit();
        const access=await token(),next=await request('/rest/v1/rpc/zhixu_save',{p_payload:payload,p_revision:base},access);
        if(epoch!==generation)return;
        revision=next;dirty=JSON.stringify(record)!==serialized;cache();
      }
      if(epoch===generation){status='云端已保存 · '+new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'});emit()}
    }catch(error){if(epoch===generation){conflict=error.code==='40001'||error.message.includes('ZHIXU_CONFLICT');status=conflict?'其他设备更新过记录，请处理版本冲突':'尚未同步 · '+friendly(error);cache();emit()}}
    finally{busy=false}
  }
  function friendly(error){
    if(error.status===429)return '操作频繁，请稍后再试';
    if(/Invalid login|invalid_credentials/i.test(error.message))return '邮箱或密码不正确';
    if(/Email not confirmed|email_not_confirmed/i.test(error.message))return '请先点击邮箱里的确认链接';
    if(/expired|refresh_token|JWT/i.test(error.message))return '登录已过期，请退出后重新登录；待同步记录会保留';
    if(/signup_disabled/i.test(error.message))return '注册暂未开放';
    return error.message;
  }
  function drawAccount(){
    document.querySelectorAll('[data-account-name]').forEach(el=>el.textContent=session?(session.user.user_metadata?.display_name||session.user.email?.split('@')[0]||'我的账号'):'游客小芽');
    document.querySelectorAll('[data-sync-status]').forEach(el=>el.textContent=status);
    document.querySelectorAll('[data-auth-open]').forEach(el=>{el.textContent=session?'个人资料 / 账号':'登录 / 注册'});
    const signed=document.querySelector('#account-signed'),form=document.querySelector('#account-form');if(!signed)return;
    signed.hidden=!session;form.hidden=!!session;
    document.querySelector('#account-email').textContent=session?.user.email||'';
    document.querySelector('#cloud-conflict').hidden=!conflict;
    document.querySelector('#cloud-import').disabled=readOnly||!ready||busy;
    document.querySelector('#cloud-download').hidden=readOnly;
    document.querySelector('#cloud-logout').disabled=busy;
    document.querySelector('#cloud-retry').disabled=busy;
    document.querySelector('#auth-submit').disabled=!enabled;
    document.querySelector('#auth-unavailable').hidden=enabled;
    document.body.classList.toggle('cloud-loading',!!session&&!ready);
  }
  document.body.insertAdjacentHTML('beforeend',`<dialog id="account-dialog" class="account-dialog" aria-labelledby="account-title">
    <div class="account-top"><h2 id="account-title">带着小芽，一起成长</h2><button id="account-close" aria-label="关闭账号窗口">×</button></div>
    <p class="account-intro">完成的每一道题，都有自己的归处。</p>
    <p id="auth-unavailable" class="account-notice">云端账号还没有启用。你可以先以游客身份刷题，记录保存在当前浏览器。</p>
    <form id="account-form"><div class="account-tabs"><button type="button" data-auth-mode="login" aria-pressed="true">密码登录</button><button type="button" data-auth-mode="emailotp" aria-pressed="false">验证码登录</button><button type="button" data-auth-mode="signup" aria-pressed="false">注册</button></div>
    <label id="display-name-label" hidden>昵称<input id="auth-name" autocomplete="nickname" maxlength="24" placeholder="给你的冒险起个名字"></label>
    <label>邮箱<input id="auth-email" type="email" autocomplete="email" required placeholder="you@example.com"></label>
    <label id="password-label">密码<input id="auth-password" type="password" autocomplete="current-password" minlength="8" maxlength="128" required placeholder="至少 8 位密码"></label>
    <div id="email-otp-panel" hidden><label>邮箱验证码<input id="auth-otp" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6,10}" minlength="6" maxlength="10" placeholder="输入邮件中的数字验证码"></label><button type="button" id="auth-send-otp">发送验证码</button><p class="otp-help">已有邮箱进入原账号；新邮箱验证成功后自动注册。验证码只需在这里填写。</p></div>
    <button id="auth-submit" class="account-primary">登录，继续我的旅程</button><button type="button" id="auth-forgot" class="account-text">忘记密码</button>
    </form>
    <div id="account-signed" hidden><p id="account-email"></p><p data-sync-status role="status"></p>
    <div id="cloud-conflict" hidden class="account-notice">云端有更新，为避免覆盖，自动同步已暂停。<button id="cloud-download">导出此设备副本</button><button id="cloud-use-remote">使用云端版本</button><button id="cloud-use-local">用此设备版本覆盖云端</button></div>
    <div class="account-actions"><button id="cloud-retry">重新连接 / 同步</button><button id="cloud-import">导入此设备的游客记录</button><button id="cloud-logout">退出登录</button></div><small>游客记录不会自动进入账号。退出后回到游客空间。</small></div>
    <p id="auth-message" role="status" aria-live="polite"></p>
  </dialog>
  <dialog id="password-dialog" class="account-dialog" aria-labelledby="password-title"><form id="password-form"><h2 id="password-title">设置新密码</h2><label>新密码<input id="new-password" type="password" autocomplete="new-password" minlength="8" maxlength="128" required></label><button class="account-primary">保存新密码</button><button type="button" id="password-close">取消</button><p id="password-message" role="status"></p></form></dialog>`);
  const $=s=>document.querySelector(s),message=t=>$('#auth-message').textContent=t;
  document.addEventListener('click',e=>{if(e.target.closest('[data-auth-open]')){$('#account-dialog').showModal();drawAccount()}});
  $('#account-close').onclick=()=>$('#account-dialog').close();$('#password-close').onclick=()=>$('#password-dialog').close();
  let mode='login',otpSending=false,otpNextSend=0,otpAddress='';
  function refreshOtpButton(){const b=$('#auth-send-otp'),seconds=Math.max(0,Math.ceil((otpNextSend-Date.now())/1000));b.disabled=!enabled||otpSending||seconds>0;b.textContent=otpSending?'正在发送…':seconds?seconds+' 秒后可重发':'发送验证码';if(seconds)setTimeout(refreshOtpButton,1000)}
  refreshOtpButton();
  document.querySelectorAll('[data-auth-mode]').forEach(button=>button.onclick=()=>{
    mode=button.dataset.authMode;$('#display-name-label').hidden=mode!=='signup';$('#password-label').hidden=mode==='emailotp';$('#auth-password').required=mode!=='emailotp';$('#email-otp-panel').hidden=mode!=='emailotp';$('#auth-otp').required=mode==='emailotp';$('#auth-forgot').hidden=mode==='emailotp';$('#auth-otp').value='';
    $('#auth-password').autocomplete=mode==='signup'?'new-password':'current-password';
    $('#auth-submit').textContent=mode==='emailotp'?'验证并进入我的空间':mode==='login'?'登录，继续我的旅程':'注册，种下我的小芽';
    document.querySelectorAll('[data-auth-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));message('');
  });
  $('#auth-forgot').onclick=()=>{mode='recover';$('#email-otp-panel').hidden=true;$('#auth-otp').required=false;$('#display-name-label').hidden=true;$('#password-label').hidden=true;$('#auth-password').required=false;$('#auth-submit').textContent='发送密码重置邮件';message('填写注册时的邮箱，我们会发送重置链接。')};
  const redirect=()=>location.origin+location.pathname;
  $('#auth-send-otp').onclick=async()=>{
    if(!enabled||otpSending||Date.now()<otpNextSend)return;
    const field=$('#auth-email');if(!field.reportValidity())return;
    const email=field.value.trim();otpSending=true;refreshOtpButton();message('正在发送验证码…');
    try{await request('/auth/v1/otp?redirect_to='+encodeURIComponent(redirect()),{email,create_user:true});otpAddress=email;otpNextSend=Date.now()+60000;message('验证码已发送，请检查收件箱和垃圾邮件。若邮件只有登录链接，也可以点击链接登录。');$('#auth-otp').focus()}
    catch(error){if(error.status===429)otpNextSend=Date.now()+60000;message(friendly(error))}
    finally{otpSending=false;refreshOtpButton()}
  };
  $('#account-form').onsubmit=async e=>{
    e.preventDefault();if(!enabled)return;const button=$('#auth-submit');button.disabled=true;message('正在处理…');
    const email=$('#auth-email').value.trim(),password=$('#auth-password').value;
    try{
      if(mode==='emailotp'){
        const code=$('#auth-otp').value.trim();if(!/^[0-9]{6,10}$/.test(code))throw Error('请输入邮件中的 6–10 位数字验证码');
        if(otpAddress&&otpAddress!==email)throw Error('邮箱已修改，请为当前邮箱重新获取验证码');
        const s=await request('/auth/v1/verify',{email,token:code,type:'email'});if(!s?.access_token)throw Error('验证未完成，请重新获取验证码');
        await connect(s);$('#auth-otp').value='';message(ready?'登录成功，已进入你的个人空间。':'验证成功，记录读取失败，请重新连接。');if(ready)$('#account-dialog').close();
      }
      else if(mode==='recover'){await request('/auth/v1/recover?redirect_to='+encodeURIComponent(redirect()),{email});message('如果邮箱已注册，你会收到重置邮件。请检查收件箱和垃圾邮件。')}
      else{
        const s=await request(mode==='login'?'/auth/v1/token?grant_type=password':'/auth/v1/signup?redirect_to='+encodeURIComponent(redirect()),{email,password,...(mode==='signup'?{data:{display_name:$('#auth-name').value.trim()||'小芽同学'}}:{})});
        if(s.access_token){await connect(s);message(ready?'已进入你的个人空间。':'账号已登录，记录读取失败，请重新连接。');if(ready)$('#account-dialog').close()}
        else message('请查看邮箱并点击确认链接，完成后即可登录。如果已经注册，可以直接登录。');
      }
    }catch(error){message(friendly(error))}finally{$('#auth-password').value='';button.disabled=!enabled}
  };
  $('#cloud-retry').onclick=async()=>{if(!ready)await connect(session);else if(conflict)message('请先选择保留哪个版本。');else if(dirty)await sync();else await connect(session)};
  $('#cloud-logout').onclick=async()=>{
    if(busy)return;
    if(dirty&&!confirm('还有记录未同步，已保存在本设备的个人缓存中。确定退出？下次登录会继续同步。'))return;
    const old=session;if(ready)cache();generation++;session=null;ready=true;dirty=false;conflict=false;revision=0;clearTimeout(timer);storeSession();status='已退出 · 回到游客空间';apply(guest());
    request('/auth/v1/logout?scope=local',{},old.access_token).catch(()=>{});$('#account-dialog').close();
  };
  $('#cloud-import').onclick=()=>{
    if(readOnly)return;
    if(!ready||busy||!confirm('将此设备的游客完成状态、收藏、笔记合并到当前账号？原游客记录会保留。'))return;
    const local=guest();for(const [id,p] of Object.entries(local.progress)){const current=record.progress[id]||{};record.progress[id]={done:!!(current.done||p.done),star:!!(current.star||p.star),note:[...new Set([current.note,p.note].filter(Boolean))].join('\n\n—— 游客记录 ——\n\n')}}
    for(const [date,list] of Object.entries(local.activity))record.activity[date]=[...new Set([...(record.activity[date]||[]),...list])];
    apply(record);dirty=true;cache();sync();message('游客记录已合并；没有日期的旧记录仅计入累计完成题数。');
  };
  function download(){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify({version:2,...record},null,2)],{type:'application/json'}));a.download='知序-个人成长备份.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
  $('#cloud-download').onclick=download;
  async function resolve(useLocal){
    if(busy||!confirm(useLocal?'将以此设备记录覆盖最新云端记录，其他设备上的差异会被替换。确定继续？':'将丢弃此设备尚未同步的更改并读取云端版本。建议先导出副本。确定继续？'))return;
    busy=true;try{const remote=await cloudRead();revision=remote.revision;conflict=false;if(!useLocal){dirty=false;apply(remote.payload);status='已采用云端版本'}else dirty=true;cache();emit()}
    catch(error){message(friendly(error))}finally{busy=false}if(useLocal&&!conflict)sync();
  }
  $('#cloud-use-remote').onclick=()=>resolve(false);$('#cloud-use-local').onclick=()=>resolve(true);
  $('#password-form').onsubmit=async e=>{e.preventDefault();const b=e.target.querySelector('button');b.disabled=true;try{await request('/auth/v1/user',{password:$('#new-password').value},await token(),'PUT');$('#password-message').textContent='密码已更新，可以关闭此窗口。';$('#new-password').value=''}catch(error){$('#password-message').textContent=friendly(error)}finally{b.disabled=false}};
  window.ZhixuAccount={async updateProfile(data){
    const epoch=generation,uid=session?.user.id;if(!uid)throw Error('请先登录');
    const user=await request('/auth/v1/user',{data},await token(),'PUT');
    if(epoch!==generation||session?.user.id!==uid)throw Error('账号已切换，请重新打开个人资料');
    if(user?.id!==uid)throw Error('资料保存未完成，请重试');
    session.user=user;storeSession();emit();return copy(user);
  },async authorizedBackendFetch(path,options={}){
    const base=window.ZHIXU_AI?.apiBaseUrl;if(!base)throw Error('AI 尚未配置，请管理员连接后端服务');
    const endpoint=new URL(base);
    if(endpoint.protocol!=='https:'&&!(endpoint.protocol==='http:'&&['localhost','127.0.0.1'].includes(endpoint.hostname)))throw Error('AI 后端需要 HTTPS 地址');
    if(!/^\/api\/v1\/[a-z/]+$/.test(path))throw Error('不支持的接口');
    const epoch=generation,access=await token();
    let response;
    try{response=await fetch(endpoint.origin+path,{...options,credentials:'omit',redirect:'error',headers:{...options.headers,Authorization:'Bearer '+access},signal:options.signal||AbortSignal.timeout(65000)})}
    catch(error){throw Error(error.name==='TimeoutError'?'讲解请求超时，请稍后重试':'浏览器未能连接讲解接口：'+endpoint.origin+'。请强制刷新页面，并确认 Java 后端仍在运行。')}
    if(epoch!==generation)throw Error('账号已切换，请重试');return response;
  },async authorizedFetch(path,options={}){
    if(!/^\/(rest|storage)\/v1\//.test(path))throw Error('不支持的云端地址');
    const epoch=generation,access=await token();
    const response=await fetch(url+path,{...options,headers:{...options.headers,apikey:config.publishableKey,Authorization:'Bearer '+access},signal:options.signal||AbortSignal.timeout(45000)});
    if(epoch!==generation)throw Error('账号已切换，请重试');
    return response;
  },save,get:()=>copy(record),user:()=>session?.user||null,download,importRecord(next){if(readOnly||!ready)return;apply(next);dirty=!!session;cache();emit();if(session)sync()}};
  window.addEventListener('online',()=>{if(dirty)sync()});
  window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue=''}});
  // Callback fragment is removed before any application navigation or network call.
  async function boot(){
    const hash=new URLSearchParams(location.hash.slice(1));let restored=null,recovery=hash.get('type')==='recovery';
    if(hash.has('access_token')){
      const access=hash.get('access_token'),refresh=hash.get('refresh_token');history.replaceState(null,'',location.pathname+location.search);
      if(enabled){try{const user=await request('/auth/v1/user',null,access);restored={user,access_token:access,refresh_token:refresh,expires_at:Date.now()/1000+Number(hash.get('expires_in')||3600)}}catch(error){message(friendly(error));$('#account-dialog').showModal()}}
    }else{try{restored=JSON.parse(sessionStorage.getItem(SESSION)||'null')}catch{}}
    if(enabled&&restored?.user&&restored?.access_token){await connect(restored);if(recovery)$('#password-dialog').showModal()}else apply(record);
    if(hash.has('error_description')){history.replaceState(null,'',location.pathname+location.search);message('邮件链接无效或已过期，请重新发送。');$('#account-dialog').showModal()}
  }
  window.ZhixuAccount.ready=boot();
})();

