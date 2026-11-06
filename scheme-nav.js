(() => {
  const base=new URL('.',document.currentScript.src);
  const labels={1:'方案一',2:'方案二',3:'方案三',5:'方案五（自由程序组合）'};
  const schemes=[1,2,3,5].map(id=>({id:String(id),label:labels[id],url:new URL('scheme-'+id+'/index.html',base).href}));
  const id=document.body.dataset.bw06Scheme,current=schemes.find(s=>s.id===id);
  const style=document.createElement('style');style.textContent=`.bw06-scheme-nav{position:fixed;right:max(16px,env(safe-area-inset-right));bottom:max(16px,env(safe-area-inset-bottom));z-index:70;max-width:calc(100vw - 32px);font:14px system-ui;color:#ccc}.bw06-scheme-nav a,.bw06-scheme-nav button{box-sizing:border-box;border:1px solid #555;border-radius:8px;background:#292929;color:#eee;padding:8px 12px;font:inherit;text-decoration:none;cursor:pointer}.bw06-scheme-nav a[aria-current]{color:#54d89b;border-color:#54d89b}.bw06-scheme-panel{display:flex;align-items:center;justify-content:flex-end;flex-wrap:wrap;gap:8px;max-width:520px;padding:12px;margin-bottom:56px;border:1px solid #454545;border-radius:12px;background:rgba(32,32,32,.97);box-shadow:0 6px 28px #0005}.bw06-scheme-panel[hidden]{display:none}.bw06-scheme-nav .bw06-scheme-toggle{display:block;margin-left:auto;font-size:12px;color:#bbb}.bw06-scheme-nav a:focus-visible,.bw06-scheme-nav button:focus-visible{outline:2px solid #54d89b;outline-offset:3px}`;document.head.append(style);
  const nav=document.createElement('nav');nav.className='bw06-scheme-nav';nav.setAttribute('aria-label','方案切换');
  const panel=document.createElement('div');panel.id='bw06-scheme-panel';panel.className='bw06-scheme-panel';panel.hidden=true;
  const links=schemes.map(entry=>{const link=document.createElement('a');link.target='_self';link.textContent=entry.label;if(entry===current)link.setAttribute('aria-current','page');panel.append(link);return{entry,link};});
  function updateLinks(){for(const {entry,link} of links)link.href=window.BW06View?window.BW06View.linkUrl(entry.url):entry.url;}
  updateLinks();addEventListener('bw06viewchange',updateLinks);
  const toggle=document.createElement('button');toggle.type='button';toggle.className='bw06-scheme-toggle';toggle.setAttribute('aria-controls',panel.id);toggle.setAttribute('aria-expanded','false');toggle.textContent='方案切换 ▴';
  function open(value){panel.hidden=!value;toggle.setAttribute('aria-expanded',String(value));toggle.textContent=value?'收起方案 ▾':'方案切换 ▴';}
  toggle.onclick=()=>open(panel.hidden);nav.addEventListener('keydown',e=>{if(e.key==='Escape'){open(false);toggle.focus();}});nav.append(panel,toggle);document.body.append(nav);
})();
