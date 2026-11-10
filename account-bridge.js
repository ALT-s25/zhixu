// Existing checklist remains the UI; the account layer owns persistence and isolation.
window.ZhixuHost={
  get:()=>({progress:state,camp}),
  set:record=>{state=record.progress;camp=record.camp},
  render:()=>render()
};
