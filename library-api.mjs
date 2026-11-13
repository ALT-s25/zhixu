const config=window.ZHIXU_CLOUD||{};
const base=(config.url||'').replace(/\/$/,'');
export const account=()=>window.ZhixuAccount;
export async function api(path,{method='GET',body,raw=false}={}){
  await account()?.ready;
  const options={method,headers:body&&!raw?{'Content-Type':'application/json'}:{},...(body?{body:raw?body:JSON.stringify(body)}:{})};
  if(raw)options.headers['Content-Type']=body.type||'application/octet-stream';
  const r=account()?.user()?await account().authorizedFetch(path,options):await fetch(base+path,{...options,headers:{...options.headers,apikey:config.publishableKey},signal:AbortSignal.timeout(45000)});
  const data=await r.json().catch(()=>null);
  if(!r.ok){
    let msg=data?.message||data?.error||'云端请求失败';
    if(['42P01','PGRST202','PGRST205'].includes(data?.code))msg='资料库尚未开通，请站长执行 backend/library.sql 后重试';
    if(data?.code==='23505')msg='你的云端已存在相同内容，请在“我的资料”中查看';
    if(r.status===401)msg='登录已过期，请重新登录后重试';
    const e=Error(msg);e.code=data?.code;e.status=r.status;throw e;
  }
  return data;
}
export const rpc=(name,body)=>api('/rest/v1/rpc/'+name,{method:'POST',body});
export const saveDoc=d=>rpc('zhixu_library_save',{p_id:d.id,p_revision:d.revision||0,p_title:d.title,p_category:d.category,p_kind:d.kind,p_body:d.body||'',p_plain:d.plain_text||'',p_hash:d.source_hash,p_assets:d.assets||[],p_status:d.status||'draft'});
export const fetchDoc=async id=>(await api('/rest/v1/zhixu_documents?id=eq.'+encodeURIComponent(id)+'&select=*'))[0];
export const encodePath=p=>p.split('/').map(encodeURIComponent).join('/');
export const upload=(path,blob)=>api('/storage/v1/object/zhixu-library/'+encodePath(path),{method:'POST',body:blob,raw:true});
export async function signedFile(path){
 const d=await api('/storage/v1/object/sign/zhixu-library/'+encodePath(path),{method:'POST',body:{expiresIn:60}});
 const url=d.signedURL||d.signedUrl;
 if(!url)throw Error('未取得附件阅读链接');
 return url.startsWith('http')?url:base+'/storage/v1'+url;
}
