/* The scheme row lives inside the shared demonstration toolbox. */
(() => {
  const base=new URL('.',document.currentScript.src);
  const panel=document.getElementById('bw06-scheme-panel');
  if(!panel)return;
  const current=document.body.dataset.bw06Scheme;
  const links=[1,2,3,4].map(id=>{
    const link=document.createElement('a');link.target='_self';link.textContent='Design '+id;
    link.setAttribute('title','Design '+id);
    if(String(id)===current){link.setAttribute('aria-current','page');link.setAttribute('aria-disabled','true');link.setAttribute('tabindex','-1');}
    panel.append(link);return {link,url:new URL('scheme-'+id+'/index.html',base).href};
  });
  function updateLinks(){
    for(const {link,url} of links){
      const viewed=window.BW06View?window.BW06View.linkUrl(url):url;
      link.href=window.BW06Tools?window.BW06Tools.linkUrl(viewed):viewed;
    }
  }
  updateLinks();addEventListener('bw06viewchange',updateLinks);
  window.BW06Tools?.subscribe(updateLinks);
})();
