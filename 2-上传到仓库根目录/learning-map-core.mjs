// Tree relationships come from immutable parent IDs, never from card coordinates.
export function branchPath(turns,id){
 const index=new Map(turns.map(t=>[t.id,t])),path=[],seen=new Set();
 while(id){if(seen.has(id)||!index.has(id))throw Error('对话分支不完整，请刷新');seen.add(id);const t=index.get(id);path.unshift(t);id=t.parentId;if(path.length>100)throw Error('对话过长');}return path;
}
export function treeLayout(turns){
 const children=new Map(),positions=new Map();for(const t of turns){const p=t.parentId||'root';if(!children.has(p))children.set(p,[]);children.get(p).push(t);}
 let row=0;const seen=new Set();function visit(id,depth){if(seen.has(id))return 40;seen.add(id);const next=children.get(id)||[];let y;
 if(!next.length)y=60+row++*210;else{const ys=next.map(t=>visit(t.id,depth+1));y=(ys[0]+ys.at(-1))/2;}
 positions.set(id,{x:40+depth*330,y});return y;}visit('root',0);return positions;
}
export function positionsFor(turns){const auto=treeLayout(turns);for(const t of turns)if(Number.isFinite(t.x)&&Number.isFinite(t.y))auto.set(t.id,{x:t.x,y:t.y});return auto;}
export function validSeed(seed,user){return !!(seed&&user&&seed.userId===user.id&&Date.now()-seed.createdAt<30*60*1000&&Date.now()>=seed.createdAt&&typeof seed.excerpt==='string'&&seed.excerpt.length>=5&&seed.excerpt.length<=5000&&((typeof seed.sourcePath==='string')!== (typeof seed.documentId==='string')));}
