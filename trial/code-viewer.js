// A small, escaped C++ tokenizer: no CDN, eval, or HTML from source code.
const cppKeywords=new Set('alignas alignof auto bool break case catch char class const constexpr continue decltype default delete do double else enum explicit extern false float for friend if inline int long mutable namespace new noexcept nullptr operator private protected public return short signed sizeof static struct switch template this throw true try typedef typename union unsigned using virtual void volatile while'.split(' '));
const cppTypes=new Set('string vector array deque queue priority_queue unordered_map unordered_set map set pair function TreeNode ListNode DSU Fenwick WordTrie size_t'.split(' '));
function cppHighlight(line){
 const tokens=/\/\/.*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|#[A-Za-z_]+|\b(?:0[xX][\da-fA-F]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?[uUlLfF]*)\b|\b[A-Za-z_]\w*\b|[{}()[\];,.?:]|(?:->|::|<<|>>|&&|\|\||[+\-*\/%=<>!&|^~]+)/g;
 let out='',last=0;
 for(const match of line.matchAll(tokens)){
  const token=match[0],start=match.index;out+=esc(line.slice(last,start));let type='';
  if(token.startsWith('//'))type='comment';else if(/^['"]/.test(token))type='string';else if(token[0]==='#')type='directive';else if(/^\d/.test(token))type='number';else if(cppKeywords.has(token))type='keyword';else if(cppTypes.has(token))type='type';else if(/^[A-Za-z_]/.test(token)&&/^\s*\(/.test(line.slice(start+token.length)))type='function';else if(/^[+\-*\/%=<>!&|^~]/.test(token))type='operator';
  out+=type?`<span class="cpp-${type}">${esc(token)}</span>`:esc(token);last=start+token.length;
 }
 return out+esc(line.slice(last));
}
function cppLines(code){return code.split('\n').map((line,i)=>`<span class="cpp-line${line.trimStart().startsWith('//')?' cpp-note-line':''}"><span class="cpp-line-number" aria-hidden="true">${i+1}</span><span class="cpp-line-content">${cppHighlight(line)||' '}</span></span>`).join('')}
function renderCodeViewer(code,copyAttribute){
 return `<div class="code-viewer cpp-wrap"><div class="cpp-toolbar"><span class="cpp-file"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 6-6 6 6 6m8-12 6 6-6 6m-3-16-2 20"/></svg><b>C++17</b><span>中文注释版</span></span><div class="cpp-actions"><button type="button" data-code-wrap aria-pressed="true">取消换行</button><button type="button" data-code-notes aria-pressed="true">隐藏注释</button><button type="button" ${copyAttribute}>复制代码</button></div></div><pre class="cpp-pre" tabindex="0" aria-label="带中文注释的 C++17 代码，可横向滚动"><code>${cppLines(code)}</code></pre><div class="cpp-footer"><span>${code.split('\n').length} 行 · UTF-8</span><span>复制包含注释与头文件</span></div></div>`;
}
document.addEventListener('click',e=>{
 const button=e.target.closest('[data-code-wrap],[data-code-notes]');if(!button)return;
 const viewer=button.closest('.code-viewer');if(!viewer)return;
 if(button.hasAttribute('data-code-wrap')){const on=viewer.classList.toggle('cpp-wrap');button.setAttribute('aria-pressed',String(on));button.textContent=on?'取消换行':'自动换行'}
 else{const hidden=viewer.classList.toggle('cpp-hide-notes');button.setAttribute('aria-pressed',String(!hidden));button.textContent=hidden?'显示注释':'隐藏注释'}
});
