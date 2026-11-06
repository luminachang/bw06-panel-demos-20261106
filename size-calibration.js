/* One viewport and screen calibration for the five BW06 designs. */
(() => {
  const world=document.querySelector('.device-world,.device'),viewport=document.querySelector('.device-viewport,.viewport');
  if(!world||!viewport||globalThis.BW06View)return;
  const WIDTH=2560,HEIGHT=1800,SHELL_WIDTH=2560;
  // The five identical front images span the full canvas width in the visible scene.
  const BOUNDS='bw06-front-4066e3dc781c3ff1',KEY='bw06-screen-view-v2',PARAM='bw06View';
  const screenSignature=()=>JSON.stringify([globalThis.screen?.width||0,globalThis.screen?.height||0,globalThis.devicePixelRatio||1]);
  const initial=()=>({version:2,bounds:BOUNDS,mode:'fit',calibration:null});
  const validNumber=(v,min,max)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
  function normalise(value){
    if(!value||value.version!==2||value.bounds!==BOUNDS||!['fit','calibrated'].includes(value.mode))return null;
    let calibration=null;
    if(value.calibration!==null){
      const c=value.calibration;
      if(!c||!validNumber(c.targetCm,1,100)||!validNumber(c.pxPerCm,1,400)||typeof c.screen!=='string')return null;
      calibration={targetCm:c.targetCm,pxPerCm:c.pxPerCm,screen:c.screen};
    }
    return {version:2,bounds:BOUNDS,mode:value.mode==='calibrated'&&calibration?.screen===screenSignature()?'calibrated':'fit',calibration};
  }
  function parse(raw){if(raw==='fit')return initial();try{return normalise(JSON.parse(raw));}catch{return null;}}
  let fromURL=null;
  try{fromURL=parse(new URL(location.href).searchParams.get(PARAM));}catch{}
  let state=fromURL;
  if(!state)try{state=parse(localStorage.getItem(KEY));}catch{}
  state=state||initial();
  const serialise=()=>state.mode==='fit'&&!state.calibration?'fit':JSON.stringify(state);
  function withView(url){const next=new URL(url,location.href);next.searchParams.set(PARAM,serialise());return next.href;}
  function saveURL(){try{history.replaceState(history.state,'',withView(location.href));return true;}catch{return false;}}
  function saveStorage(){
    try{if(state.mode==='fit'&&!state.calibration)localStorage.removeItem(KEY);else localStorage.setItem(KEY,JSON.stringify(state));return true;}catch{return false;}
  }
  function remember(){const stored=saveStorage(),inURL=saveURL();return stored||inURL;}
  let scale=1;
  function apply(){
    const width=state.mode==='calibrated'?state.calibration.targetCm*state.calibration.pxPerCm*WIDTH/SHELL_WIDTH:Math.max(1,Math.min(innerWidth,1280));
    scale=width/WIDTH;
    Object.assign(world.style,{width:WIDTH+'px',height:HEIGHT+'px',maxWidth:'none',transformOrigin:'0 0',transform:`scale(${scale})`});
    Object.assign(viewport.style,{width:width+'px',height:HEIGHT*scale+'px',maxWidth:'none',margin:'0 auto',overflow:'hidden'});
    world.dataset.bw06View=state.mode;
  }
  // Apply before the scheme adapter exposes its artwork; it must not install another resize handler.
  apply();
  // Reveal after the actual scene images decode; audio and unrelated resources
  // must not hold the first frame until the full window load event.
  let adapterReady=false,imagesDecoded=false;
  function reveal(){
    if(adapterReady&&imagesDecoded)world.dataset.bw06Ready='true';
  }
  function imageReady(img){
    if(typeof img.decode==='function')return img.decode().catch(()=>{});
    if(img.complete)return Promise.resolve();
    return new Promise(resolve=>{
      img.addEventListener('load',resolve,{once:true});
      img.addEventListener('error',resolve,{once:true});
    });
  }
  function ready(){
    if(adapterReady)return;
    adapterReady=true;
    const images=[...world.querySelectorAll('img')].map(imageReady);
    for(const svgImage of world.querySelectorAll('image')){
      const href=svgImage.getAttribute('href')||svgImage.getAttribute('xlink:href');
      if(!href||typeof Image!=='function')continue;
      const img=new Image();img.decoding='async';img.src=href;
      images.push(imageReady(img));
    }
    Promise.all(images)
      .then(()=>{imagesDecoded=true;reveal();});
  }
  if(fromURL)saveStorage();
  const style=document.createElement('style');
  style.textContent=`html,body{overflow-x:auto}
  #bw06-size-open{position:fixed;left:max(16px,env(safe-area-inset-left));bottom:max(16px,env(safe-area-inset-bottom));z-index:75;border:1px solid #555;background:#292929;color:#bbb;border-radius:8px;padding:8px 12px;font:12px system-ui;cursor:pointer}
  #bw06-size-dialog{box-sizing:border-box;width:min(460px,calc(100vw - 32px));max-height:calc(100dvh - 32px);overflow:auto;border:1px solid #555;border-radius:14px;padding:24px;background:#242424;color:#eee;font:14px/1.6 system-ui}
  #bw06-size-dialog::backdrop{background:#0009}#bw06-size-dialog h2{margin:0;font-size:18px}
  #bw06-size-dialog .bw06-size-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}
  #bw06-size-dialog button[data-close]{font-size:24px;line-height:1;padding:3px;width:32px;height:32px;margin:0;border:0;background:transparent;color:#bbb}
  #bw06-size-dialog label{display:block;margin:14px 0}#bw06-size-dialog input,#bw06-size-dialog select{box-sizing:border-box;display:block;width:100%;padding:9px;margin-top:5px;border:1px solid #777;border-radius:6px;background:#171717;color:white;font:inherit}
  #bw06-size-dialog button{padding:9px 12px;margin:5px 6px 0 0;border:1px solid #666;border-radius:6px;background:#333;color:white;font:inherit;cursor:pointer}
  #bw06-size-dialog button[type=submit]{background:#54d89b;color:#142b20}#bw06-size-dialog .note{color:#aaa;font-size:12px}
  #bw06-size-dialog p{margin:10px 0}#bw06-size-dialog button:focus-visible,#bw06-size-dialog input:focus-visible,#bw06-size-dialog select:focus-visible,#bw06-size-open:focus-visible{outline:2px solid #54d89b;outline-offset:2px}`;
  document.head.append(style);
  const button=document.createElement('button');button.id='bw06-size-open';button.textContent='Size calibration';button.type='button';
  const dialog=document.createElement('dialog');dialog.id='bw06-size-dialog';dialog.setAttribute('aria-labelledby','bw06-size-title');
  dialog.innerHTML=`<div class="bw06-size-heading"><h2 id="bw06-size-title">View & size calibration</h2><button type="button" data-close aria-label="Close size calibration">×</button></div>
  <label>Display mode<select name="view"><option value="fit">Fit to screen</option><option value="calibrated" data-calibrated-option>Calibrated size</option></select></label>
  <p class="note" data-summary></p>
  <p>Measure the full device width on screen, from outer edge to outer edge, with a ruler. Enter the measurement in centimeters.</p>
  <form><label>Target device width (cm)<input name="target" type="number" min="1" max="100" step="0.01" required></label>
  <p class="note">28 cm is the reference width. Update it if you have the exact device measurement.</p>
  <label>Measured width on screen (cm)<input name="measured" type="number" min="0.1" max="200" step="0.01" placeholder="e.g. 25.50" required></label>
  <button type="submit">Apply calibration</button><button type="button" data-reset>Reset size</button></form>
  <p data-message role="status"></p>
  <p class="note">All designs share this calibration. Calibrated size stays fixed; scroll if needed. Recalibrate after changing screens or display/browser zoom.</p>`;
  document.body.append(button,dialog);
  const target=dialog.querySelector('[name=target]'),measured=dialog.querySelector('[name=measured]'),view=dialog.querySelector('[name=view]'),message=dialog.querySelector('[data-message]');
  target.value=state.calibration?.targetCm||28;
  function updateUI(){
    const usable=state.calibration?.screen===screenSignature();
    view.value=state.mode;dialog.querySelector('[data-calibrated-option]').disabled=!usable;
    button.textContent=state.mode==='calibrated'?'Size · Calibrated':'Size calibration';
    dialog.querySelector('[data-summary]').textContent=state.mode==='calibrated'?`Device width set to ${state.calibration.targetCm} cm. Check it with a ruler.`:state.calibration&&!usable?'Display settings changed. Please recalibrate.':state.calibration?'Fit to screen. A saved calibration is available.':'Fit to screen. No calibration saved.';
  }
  function notify(){dispatchEvent(new CustomEvent('bw06viewchange'));}
  function refresh(){apply();updateUI();notify();}
  button.onclick=()=>dialog.showModal();dialog.querySelector('[data-close]').onclick=()=>dialog.close();
  dialog.querySelector('form').onsubmit=e=>{
    e.preventDefault();
    const targetCm=Number(target.value),cm=Number(measured.value),shownShellWidth=world.getBoundingClientRect().width*SHELL_WIDTH/WIDTH,pxPerCm=shownShellWidth/cm;
    if(!validNumber(targetCm,1,100)||!validNumber(cm,.1,200)||!validNumber(pxPerCm,1,400)){message.textContent='Enter valid positive values for both widths.';return;}
    state={version:2,bounds:BOUNDS,mode:'calibrated',calibration:{targetCm,pxPerCm,screen:screenSignature()}};
    const saved=remember();refresh();measured.value='';
    message.textContent=saved?`Saved for all designs. Close this window and check that the device is ${targetCm} cm wide.`:'Calibration applied. This browser could not save it; recalibrate after refreshing.';
  };
  view.onchange=()=>{
    state.mode=view.value==='calibrated'&&state.calibration?.screen===screenSignature()?'calibrated':'fit';
    const saved=remember();refresh();message.textContent=saved?'Display mode saved for all designs.':'Display mode applied. This browser could not save it.';
  };
  dialog.querySelector('[data-reset]').onclick=()=>{
    state=initial();const saved=remember();target.value=28;measured.value='';refresh();
    message.textContent=saved?'Reset all designs to fit the screen.':'Size reset. This browser could not save it.';
  };
  addEventListener('resize',()=>{
    if(state.mode==='calibrated'&&state.calibration.screen!==screenSignature()){state.mode='fit';remember();refresh();}
    else{apply();updateUI();}
  });
  addEventListener('storage',e=>{
    if(e.key!==KEY&&e.key!==null)return;
    state=parse(e.newValue)||initial();target.value=state.calibration?.targetCm||28;saveURL();refresh();
  });
  globalThis.BW06View={ready,linkUrl:withView,snapshot:()=>({...JSON.parse(JSON.stringify(state)),scale,canvasWidth:WIDTH,shellWidth:SHELL_WIDTH,displayWidth:WIDTH*scale})};
  updateUI();
})();
