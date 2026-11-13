import {LIMIT,normalizePath,resolveAsset,imageType,digest,textDecode} from './library-core.mjs';
export async function collectFiles(files){
 let total=0;const map=new Map(),warnings=[];
 function add(name,bytes){name=normalizePath(name);if(!name)return;if(bytes.length>LIMIT.file)throw Error(name+' 超过单文件 10 MB');total+=bytes.length;if(total>LIMIT.total||map.size>=LIMIT.entries)throw Error('每批最多 160 个文件、解压后总计 40 MB');if(map.has(name))throw Error('同一批存在重名路径：'+name);map.set(name,bytes)}
 for(const file of files){if(file.size>LIMIT.total)throw Error('上传文件超过 40 MB');const bytes=new Uint8Array(await file.arrayBuffer());
  if(/\.zip$/i.test(file.name)){
   const {unzipSync}=await import('./vendor/library/fflate.mjs');let expanded=0,entries=0;
   const unpacked=unzipSync(bytes,{filter:f=>{
    if(f.name.endsWith('/'))return false;
    if(f.name.split(/[\\/]/).includes('..'))throw Error('ZIP 含越界路径，已拒绝');
    normalizePath(f.name);expanded+=f.originalSize;entries++;
    if(f.originalSize>LIMIT.file||expanded>LIMIT.total||entries>LIMIT.entries)throw Error('ZIP 解压大小或文件数量超出限制');
    return true;
   }});for(const [name,b] of Object.entries(unpacked))add(name,b);
  }else add(file.webkitRelativePath||file.name,bytes);
 }
 const docs=[...map.keys()].filter(n=>/\.(md|markdown|txt|pdf)$/i.test(n));
 if(!docs.length)throw Error('没有找到 Markdown、TXT 或 PDF。ZIP 内请放正文和配图');
 if(docs.length>LIMIT.documents)throw Error('每批最多 30 篇正文，请分批导入');
 for(const name of map.keys())if(!/\.(md|markdown|txt|pdf|png|jpe?g|gif|webp)$/i.test(name))warnings.push('已忽略不支持的附件：'+name);
 return {map,docs,warnings};
}
export async function parseDocument(name,files,onProgress=()=>{}){
 const bytes=files.get(name),kind=/\.pdf$/i.test(name)?'pdf':/\.txt$/i.test(name)?'text':'markdown';
 const title=name.split('/').pop().replace(/\.[^.]+$/,'').slice(0,160);let body='',plain='',assets=[],warnings=[],missing=[];
 if(kind==='pdf'){
  if(new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-')throw Error('文件不是有效 PDF：'+name);
  const pdfjs=await import('./vendor/library/pdf.mjs');pdfjs.GlobalWorkerOptions.workerSrc=new URL('./vendor/library/pdf.worker.mjs',import.meta.url).href;
  const task=pdfjs.getDocument({data:bytes.slice(),isEvalSupported:false,useSystemFonts:true});
  task.onPassword=()=>{task.destroy()};
  try{const pdf=await task.promise;if(pdf.numPages>LIMIT.pages)throw Error('PDF 超过 150 页，请拆分后上传');
   const pages=[];for(let n=1;n<=pdf.numPages;n++){onProgress('提取 PDF 第 '+n+' / '+pdf.numPages+' 页');const page=await pdf.getPage(n);const t=await page.getTextContent();pages.push('第 '+n+' 页\n'+t.items.map(x=>x.str+(x.hasEOL?'\n':' ')).join(''));page.cleanup()}
   plain=pages.join('\n\n');assets.push({name,blob:new Blob([bytes],{type:'application/pdf'}),type:'application/pdf'});
   if(plain.replace(/第 \d+ 页|\s/g,'').length<40)warnings.push('PDF 可能是扫描件，仅保存原文件；当前不提供 OCR，正文搜索可能无法命中');
  }catch(e){throw Error('PDF 提取失败（加密文件请先解密）：'+e.message)}finally{await task.destroy()}
 }else{
  body=textDecode(bytes);if(new TextEncoder().encode(body).length>LIMIT.text)throw Error('正文超过 2 MB，请拆分');
  const html=kind==='markdown'?window.marked.parse(body):'';
  const template=document.createElement('template');template.innerHTML=window.DOMPurify.sanitize(html,{FORBID_TAGS:['iframe','style','form']});const container=template.content;plain=kind==='text'?body:container.textContent;
  const used=new Set();for(const img of container.querySelectorAll('img')){
   const src=img.getAttribute('src')||'',path=resolveAsset(name,src);
   if(!path){warnings.push('外链或内嵌图片默认不加载，请将配图放进 ZIP：'+src.slice(0,100));continue}
   const b=files.get(path);if(!b){missing.push(path);continue}
   const type=imageType(b);if(!type){missing.push(path+'（不支持的图片格式）');continue}
   if(!used.has(path)){assets.push({name:path,blob:new Blob([b],{type}),type});used.add(path)}
  }
 }
 if(new TextEncoder().encode(plain).length>LIMIT.text)throw Error('提取后的文字超过 2 MB，请拆分');
 if(assets.length>100)throw Error('单篇配图超过 100 张，请拆分');
 const hashes=await Promise.all(assets.map(async a=>a.type+':'+await digest(await a.blob.arrayBuffer())));
 const hash=await digest(new TextEncoder().encode(kind+'\n'+(kind==='pdf'?await digest(bytes):body)+'\n'+hashes.sort().join('\n')));
 return {title,category:name.includes('/')?name.split('/').slice(-2,-1)[0]:'个人笔记',kind,body,plain_text:plain,source_hash:hash,source:name,assets,warnings:[...new Set(warnings)],missing:[...new Set(missing)]};
}
