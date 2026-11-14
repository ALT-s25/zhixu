export function renderMarkdown(target,text){
 target.classList.add('map-markdown');
 if(!window.marked||!window.DOMPurify){target.textContent=text;return;}
 target.innerHTML=window.DOMPurify.sanitize(window.marked.parse(text.replace(/^【([^】\n]+)】\s*$/gm,'### $1')),{ALLOWED_TAGS:['p','br','strong','em','del','h1','h2','h3','h4','ul','ol','li','blockquote','pre','code','table','thead','tbody','tr','th','td','hr'],ALLOWED_ATTR:['class']});
 for(const pre of target.querySelectorAll('pre')){
  const code=pre.textContent,bar=document.createElement('div'),label=document.createElement('span'),button=document.createElement('button');bar.className='map-code-bar';label.textContent=pre.querySelector('code')?.className.match(/language-([a-z0-9+#-]+)/i)?.[1]||'代码';button.textContent='复制';button.type='button';button.onclick=async()=>{try{await navigator.clipboard.writeText(code);button.textContent='已复制';}catch{button.textContent='请选中代码复制';}};bar.append(label,button);pre.before(bar);
  const node=pre.querySelector('code')||pre;node.replaceChildren();let end=0;
  const pattern=/(\/\*[\s\S]*?\*\/|\/\/[^\n]*|#[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(?:public|private|protected|class|interface|static|final|void|int|long|boolean|String|new|return|if|else|for|while|try|catch|throw|import|package|const|let|var|function|async|await|def|from|as|in|SELECT|FROM|WHERE|AND|OR|JOIN|ORDER|BY|true|false|null|None|True|False)\b|\b\d+(?:\.\d+)?\b)/g;
  for(const m of code.matchAll(pattern)){node.append(document.createTextNode(code.slice(end,m.index)));const span=document.createElement('span');span.className='map-token-'+(/^(\/\/|\/\*|#)/.test(m[0])?'comment':/^["']/.test(m[0])?'string':/^\d/.test(m[0])?'number':'keyword');span.textContent=m[0];node.append(span);end=m.index+m[0].length;}node.append(document.createTextNode(code.slice(end)));
 }
}
