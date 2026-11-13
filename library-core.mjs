export const LIMIT={file:10*1024*1024,total:40*1024*1024,entries:160,documents:30,text:2*1024*1024,pages:150};
export function normalizePath(value){
 const s=value.replace(/\\/g,'/');
 if(s.startsWith('/')||/^[a-z]:/i.test(s)||s.includes('\0'))throw Error('文件路径不安全');
 const out=[];for(const part of s.split('/')){if(!part||part==='.')continue;if(part==='..'){if(!out.length)throw Error('文件路径越界');out.pop()}else out.push(part)}
 return out.join('/');
}
export function resolveAsset(source,reference){
 if(/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(reference))return null;
 try{return normalizePath(source.split('/').slice(0,-1).concat(decodeURIComponent(reference.split(/[?#]/)[0])).join('/'))}catch{return null}
}
export function imageType(bytes){
 if(bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71)return 'image/png';
 if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'image/jpeg';
 const s=String.fromCharCode(...bytes.slice(0,12));
 if(s.startsWith('GIF8'))return 'image/gif';
 if(s.startsWith('RIFF')&&s.slice(8)==='WEBP')return 'image/webp';
 return null;
}
export async function digest(bytes){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('')}
export function textDecode(bytes){try{return new TextDecoder('utf-8',{fatal:true}).decode(bytes)}catch{return new TextDecoder('gb18030',{fatal:true}).decode(bytes)}}
export function snippet(text,query,size=240){const pos=text.toLowerCase().indexOf(query.toLowerCase()),start=Math.max(0,pos-70);return (start?'…':'')+text.slice(start,start+size)+(text.length>start+size?'…':'')}
export function searchSections(rows,query,limit=30){
 const q=query.trim().toLowerCase();if(!q||q.length>100)return [];
 return rows.map(r=>({...r,score:r.title.toLowerCase().includes(q)?3:(r.section||'').toLowerCase().includes(q)?2:r.text.toLowerCase().includes(q)?1:0})).filter(r=>r.score).sort((a,b)=>b.score-a.score).slice(0,limit).map(r=>({...r,text:snippet(r.text,query)}));
}
