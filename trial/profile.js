(()=>{
  'use strict';
  const A=window.ZhixuAccount;if(!A)return;
  const presets=['sprout','cat','bear','bunny'];
  const labels=['小芽','小猫','小熊','小兔'];
  const $=s=>document.querySelector(s);
  function avatar(value){return presets.includes(value)?'avatars/'+value+'.svg':typeof value==='string'&&value.length<18000&&/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(value)?value:'avatars/sprout.svg'}
  const signed=$('#account-signed');
  signed.insertAdjacentHTML('afterbegin',`<section class="profile-summary"><img data-profile-avatar width="64" height="64" alt="我的头像"><div><strong data-account-name></strong><p data-profile-bio></p><button type="button" id="profile-edit">编辑个人资料</button></div></section>`);
  signed.insertAdjacentHTML('beforeend','<div class="profile-tools"><button type="button" id="profile-password">修改密码</button><button type="button" id="profile-backup">导出我的记录</button><a href="growth.html">查看我的成长 →</a></div>');
  document.body.insertAdjacentHTML('beforeend',`<dialog id="profile-dialog" class="account-dialog" aria-labelledby="profile-title"><form id="profile-form"><div class="account-top"><h2 id="profile-title">我的冒险名片</h2><button type="button" id="profile-close" aria-label="关闭个人资料">×</button></div><p class="account-intro">换个喜欢的模样，继续自己的旅程。</p><div class="profile-avatar-editor"><img id="profile-preview" width="88" height="88" alt="头像预览"><div><label class="profile-upload">上传头像<input id="profile-file" type="file" accept="image/png,image/jpeg,image/webp"></label><small>JPG / PNG / WebP，最大 5 MB<br>自动居中裁成方形并压缩</small></div></div><div class="avatar-options" aria-label="选择预设头像">${presets.map((p,i)=>`<button type="button" data-avatar="${p}" aria-label="${labels[i]}头像" aria-pressed="false"><img src="avatars/${p}.svg" width="44" height="44" alt=""></button>`).join('')}</div><label>昵称<input id="profile-name" autocomplete="nickname" required maxlength="24" placeholder="小芽同学"></label><label>个性签名<textarea id="profile-bio" maxlength="80" rows="2" placeholder="今天也想多懂一点。"></textarea></label><p class="profile-caption">昵称最多 24 字，签名最多 80 字。保存后会同步到你的账号。</p><button id="profile-save" class="account-primary">保存我的名片</button><p id="profile-message" role="status" aria-live="polite"></p></form></dialog><div id="quest-reward" class="quest-reward" role="status" aria-live="polite"><svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="21"/><path d="m13 24 7 7 15-16"/></svg><div><strong>这一题，拿下了。</strong><p id="quest-reward-detail"></p></div><button id="quest-reward-close" aria-label="关闭完成提示">×</button></div>`);
  let draft='sprout',editingUser=null,processing=false,saving=false,fileEpoch=0,rewardTimer;
  function paint(){
    const user=A.user(),m=user?.user_metadata||{};
    document.querySelectorAll('[data-profile-avatar]').forEach(el=>el.src=avatar(m.avatar));
    document.querySelectorAll('[data-profile-bio]').forEach(el=>el.textContent=m.bio||'今天也想多懂一点。');
    document.querySelectorAll('[data-account-name]').forEach(el=>el.textContent=user?(m.display_name||user.email?.split('@')[0]||'小芽同学'):'游客小芽');
    document.querySelectorAll('[data-auth-open]').forEach(el=>{el.querySelectorAll('.account-mini-avatar').forEach(img=>img.remove());if(user){const img=document.createElement('img');img.src=avatar(m.avatar);img.alt='';img.className='account-mini-avatar';el.prepend(img)}});
    if($('#profile-dialog').open&&user?.id!==editingUser){fileEpoch++;$('#profile-dialog').close()}
  }
  function preview(){ $('#profile-preview').src=avatar(draft);document.querySelectorAll('[data-avatar]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.avatar===draft))) }
  $('#profile-edit').onclick=()=>{const u=A.user();if(!u)return;editingUser=u.id;fileEpoch++;processing=false;$('#profile-save').disabled=false;const m=u.user_metadata||{};draft=m.avatar||'sprout';$('#profile-name').value=m.display_name||'';$('#profile-bio').value=m.bio||'';$('#profile-message').textContent='';$('#profile-file').value='';preview();$('#profile-dialog').showModal()};
  $('#profile-dialog').addEventListener('cancel',e=>{if(saving)e.preventDefault();else fileEpoch++});
  $('#profile-close').onclick=()=>{if(!saving){fileEpoch++;$('#profile-dialog').close()}};
  document.querySelectorAll('[data-avatar]').forEach(b=>b.onclick=()=>{if(saving)return;fileEpoch++;processing=false;$('#profile-save').disabled=false;draft=b.dataset.avatar;preview()});
  $('#profile-file').onchange=async e=>{
    const file=e.target.files[0];if(!file)return;const epoch=++fileEpoch;processing=true;$('#profile-save').disabled=true;
    try{
      if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024)throw Error('请选择 5 MB 以内的 JPG、PNG 或 WebP 图片');
      const bitmap=await createImageBitmap(file);if(epoch!==fileEpoch){bitmap.close();return}
      const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle='#f8f6e9';ctx.fillRect(0,0,128,128);const side=Math.min(bitmap.width,bitmap.height);ctx.drawImage(bitmap,(bitmap.width-side)/2,(bitmap.height-side)/2,side,side,0,0,128,128);bitmap.close();
      let data=canvas.toDataURL('image/jpeg',.72);if(data.length>=18000)data=canvas.toDataURL('image/jpeg',.45);if(data.length>=18000)throw Error('图片细节过多，请换一张更简洁的头像');draft=data;preview();$('#profile-message').textContent='头像预览已更新，点击保存后生效。';
    }catch(error){if(epoch===fileEpoch)$('#profile-message').textContent=error.message||'图片读取失败，请换一张图片'}finally{if(epoch===fileEpoch){processing=false;$('#profile-save').disabled=false}}
  };
  $('#profile-form').onsubmit=async e=>{e.preventDefault();if(processing||saving)return;if(typeof A.updateProfile!=='function'){$('#profile-message').textContent='账号组件版本未更新，请等待网站部署完成后按 Ctrl+F5 刷新；无需重新配置数据库。';return}const name=$('#profile-name').value.trim(),bio=$('#profile-bio').value.trim();if(!name||name.length>24||bio.length>80){$('#profile-message').textContent='请填写 1–24 字昵称，签名不超过 80 字。';return}if(A.user()?.id!==editingUser)return;
    saving=true;$('#profile-save').disabled=true;$('#profile-close').disabled=true;$('#profile-file').disabled=true;$('#profile-message').textContent='正在保存…';
    try{await A.updateProfile({display_name:name,bio,avatar:draft});$('#profile-message').textContent='名片已保存，下次登录也会带着它。';paint()}catch(error){$('#profile-message').textContent='保存失败：'+error.message}finally{saving=false;$('#profile-save').disabled=false;$('#profile-close').disabled=false;$('#profile-file').disabled=false}
  };
  $('#profile-password').onclick=()=>{$('#password-message').textContent='';$('#new-password').value='';$('#password-dialog').showModal()};
  $('#profile-backup').onclick=()=>A.download();
  document.addEventListener('zhixu:record',paint);paint();
  const hide=()=>$('#quest-reward').classList.remove('visible');$('#quest-reward-close').onclick=hide;
  window.ZhixuCelebrate=(id,total)=>{clearTimeout(rewardTimer);$('#quest-reward-detail').textContent=`累计攻克 ${total} 道独立题，每一步都算数。`;$('#quest-reward').classList.add('visible');if(!document.body.classList.contains('quiet')&&!matchMedia('(prefers-reduced-motion: reduce)').matches){document.querySelectorAll('[data-question]').forEach(row=>{if(row.dataset.question===id)row.animate([{backgroundColor:'#a8d9b3'},{backgroundColor:'transparent'}],{duration:850,easing:'ease-out'})})}rewardTimer=setTimeout(hide,3800)};
})();
