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
  // Keep the source artwork covered until the adapter has rendered and media is ready.
  // Window load also covers the embedded SVG backgrounds in schemes four and five.
  let pageLoaded=document.readyState==='complete',adapterReady=false,imagesDecoded=false;
  function reveal(){
    if(pageLoaded&&adapterReady&&imagesDecoded)world.dataset.bw06Ready='true';
  }
  addEventListener('load',()=>{pageLoaded=true;reveal();},{once:true});
  function ready(){
    if(adapterReady)return;
    adapterReady=true;
    const images=[...world.querySelectorAll('img')];
    Promise.all(images.map(img=>typeof img.decode==='function'?img.decode().catch(()=>{}):Promise.resolve()))
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
  const button=document.createElement('button');button.id='bw06-size-open';button.textContent='尺寸校准';button.type='button';
  const dialog=document.createElement('dialog');dialog.id='bw06-size-dialog';dialog.setAttribute('aria-labelledby','bw06-size-title');
  dialog.innerHTML=`<div class="bw06-size-heading"><h2 id="bw06-size-title">视图与尺寸校准</h2><button type="button" data-close aria-label="关闭尺寸校准">×</button></div>
  <label>显示方式<select name="view"><option value="fit">自适应展示</option><option value="calibrated" data-calibrated-option>校准尺寸</option></select></label>
  <p class="note" data-summary></p>
  <p>用尺子测量屏幕中整机左右外壳最外侧之间的宽度，输入实测厘米数。请测量整机，不是黑色面板。</p>
  <form><label>目标整机宽度（cm）<input name="target" type="number" min="1" max="100" step="0.01" required></label>
  <p class="note">28 cm 沿用历史参考值；如有准确整机尺寸，请修改后再校准。</p>
  <label>当前屏幕实测宽度（cm）<input name="measured" type="number" min="0.1" max="200" step="0.01" placeholder="例如 25.50" required></label>
  <button type="submit">按实测校准</button><button type="button" data-reset>恢复默认比例</button></form>
  <p data-message role="status"></p>
  <p class="note">各方案共用本屏幕的校准结果，切换方案沿用当前显示方式。校准后尺寸固定，放不下时滚动查看。换屏幕、系统显示缩放或浏览器缩放后，请重新校准。</p>`;
  document.body.append(button,dialog);
  const target=dialog.querySelector('[name=target]'),measured=dialog.querySelector('[name=measured]'),view=dialog.querySelector('[name=view]'),message=dialog.querySelector('[data-message]');
  target.value=state.calibration?.targetCm||28;
  function updateUI(){
    const usable=state.calibration?.screen===screenSignature();
    view.value=state.mode;dialog.querySelector('[data-calibrated-option]').disabled=!usable;
    button.textContent=state.mode==='calibrated'?'尺寸校准 · 已校准':'尺寸校准';
    dialog.querySelector('[data-summary]').textContent=state.mode==='calibrated'?`当前按 ${state.calibration.targetCm} cm 的整机宽度显示，请用尺子复核。`:state.calibration&&!usable?'显示设置已变化，请重新校准。':state.calibration?'当前为自适应展示，可切回已保存的校准尺寸。':'当前为自适应展示，尚未进行实测校准。';
  }
  function notify(){dispatchEvent(new CustomEvent('bw06viewchange'));}
  function refresh(){apply();updateUI();notify();}
  button.onclick=()=>dialog.showModal();dialog.querySelector('[data-close]').onclick=()=>dialog.close();
  dialog.querySelector('form').onsubmit=e=>{
    e.preventDefault();
    const targetCm=Number(target.value),cm=Number(measured.value),shownShellWidth=world.getBoundingClientRect().width*SHELL_WIDTH/WIDTH,pxPerCm=shownShellWidth/cm;
    if(!validNumber(targetCm,1,100)||!validNumber(cm,.1,200)||!validNumber(pxPerCm,1,400)){message.textContent='请核对目标尺寸与实测宽度，填写有效的正数。';return;}
    state={version:2,bounds:BOUNDS,mode:'calibrated',calibration:{targetCm,pxPerCm,screen:screenSignature()}};
    const saved=remember();refresh();measured.value='';
    message.textContent=saved?`已保存并应用到各方案。关闭窗口后，请用尺子复核整机宽度为 ${targetCm} cm。`:'本页校准已生效，但浏览器不允许保存；刷新后需重新校准。';
  };
  view.onchange=()=>{
    state.mode=view.value==='calibrated'&&state.calibration?.screen===screenSignature()?'calibrated':'fit';
    const saved=remember();refresh();message.textContent=saved?'显示方式已保存，切换方案将保持一致。':'本页显示方式已生效，但浏览器不允许保存。';
  };
  dialog.querySelector('[data-reset]').onclick=()=>{
    state=initial();const saved=remember();target.value=28;measured.value='';refresh();
    message.textContent=saved?'已恢复各方案的默认自适应比例。':'本页已恢复默认比例，但浏览器不允许保存。';
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
