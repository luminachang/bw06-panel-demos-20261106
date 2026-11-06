(() => {
  const style=document.createElement('style');
  style.textContent=`
  @keyframes bw06Pulse{0%,49.99%{opacity:1}50%,100%{opacity:0}}
  @keyframes bw06PausePulse{0%,49.99%{opacity:1}50%,100%{opacity:0}}
  @keyframes bw06RunPulse{0%,49.99%{opacity:1}50%,100%{opacity:0}}
  .bw06-paused{animation:bw06PausePulse 1.2s steps(1,end) infinite}
  .bw06-running-colon{animation:bw06RunPulse 1.2s steps(1,end) infinite}
  .bw06-fault{animation:bw06Pulse .8s steps(1,end) infinite}
  .bw06-lock-feedback{animation:bw06Pulse .36s steps(1,end) 6}
  #bw06-simulation{position:fixed;right:max(16px,env(safe-area-inset-right));bottom:max(16px,env(safe-area-inset-bottom));z-index:70;font:13px/1.5 system-ui;color:#eee;max-width:calc(100vw - 32px)}
  #bw06-simulation[hidden],#bw06-simulation [hidden]{display:none!important}
  #bw06-simulation button,#bw06-simulation select,#bw06-simulation a{box-sizing:border-box;font:inherit;color:inherit;border:1px solid #505050;border-radius:8px;background:#303030;padding:8px 10px;cursor:pointer;text-decoration:none}
  #bw06-simulation button:disabled{opacity:.35;cursor:default}
  #bw06-simulation button:hover:enabled,#bw06-simulation a:hover{background:#3a3a3a;border-color:#777}
  #bw06-simulation button:focus-visible,#bw06-simulation select:focus-visible,#bw06-simulation a:focus-visible{outline:2px solid #54d89b;outline-offset:2px}
  #bw06-simulation-panel{display:flex;flex-direction:column;width:min(420px,calc(100vw - 32px));max-height:calc(100dvh - 32px);box-sizing:border-box;overflow:hidden;border:1px solid #505050;border-radius:14px;background:#242424;box-shadow:0 8px 32px #0006}
  #bw06-simulation-panel .bw06-tool-head{flex:none;padding:14px 16px 12px;border-bottom:1px solid #3e3e3e}
  #bw06-simulation-panel .bw06-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}
  #bw06-simulation-panel h2{font-size:14px;line-height:1.5;margin:0;white-space:nowrap}
  #bw06-simulation-panel .bw06-tool-actions{display:flex;align-items:center;gap:8px}
  #bw06-simulation #bw06-size-open{position:static;z-index:auto;font-size:11px;padding:5px 8px;color:#bbb;border-color:#444}
  #bw06-simulation-panel .bw06-close{font-size:24px;line-height:1;padding:3px;width:28px;height:28px;border:0;background:transparent;color:#aaa}
  #bw06-simulation-panel .bw06-tool-body{min-height:0;overflow:auto;overscroll-behavior:contain;padding:12px 16px 16px}
  #bw06-simulation-panel section+section{margin-top:14px;padding-top:12px;border-top:1px solid #3b3b3b}
  #bw06-simulation-panel h3{font-size:12px;margin:0 0 8px;color:#ccc;font-weight:600}
  #bw06-simulation-panel .bw06-note{font-size:11px;line-height:1.55;color:#a8a8a8;margin:8px 0 0}
  #bw06-simulation-panel .bw06-row{display:flex;gap:7px;flex-wrap:wrap}
  #bw06-simulation-panel .bw06-status-row{display:flex;align-items:baseline;gap:8px;margin-bottom:8px;flex-wrap:wrap}
  #bw06-simulation-panel [data-status]{margin:0;font-size:12px;color:#eee}
  #bw06-simulation-panel .bw06-scheme-panel{display:flex;gap:6px}
  #bw06-simulation-panel .bw06-scheme-panel a{flex:1;min-width:0;text-align:center;white-space:nowrap;font-size:12px;padding:7px 2px}
  #bw06-simulation-panel .bw06-scheme-panel a[aria-current]{color:#54d89b;border-color:#54d89b;background:#263a30;pointer-events:none}
  #bw06-simulation-toggle{display:block;margin-left:auto;font-size:12px!important;color:#ddd!important;padding:10px 14px!important;box-shadow:0 4px 16px #0003}
  #bw06-simulation [aria-pressed=true]{border-color:#e99b77;background:#433128;color:#ffc2a2}
  #bw06-demo-toast{position:absolute;left:50%;transform:translateX(-50%);z-index:80;box-sizing:border-box;max-width:calc(100% - 32px);width:max-content;padding:10px 16px;border:1px solid rgba(255,255,255,.2);border-radius:12px;background:rgba(30,30,30,.38);backdrop-filter:blur(14px) saturate(140%);-webkit-backdrop-filter:blur(14px) saturate(140%);color:#fff;box-shadow:0 4px 20px rgba(0,0,0,.18);font:13px/1.5 system-ui;text-align:center;pointer-events:none}
  #bw06-demo-toast[hidden]{display:none!important}
  `;
  document.head.append(style);
  const KEY_NAMES={wash:'Wash',steam:'Steam',dry:'Drying',storage:'Storage'};
  const STATUS_NAMES={off:'Off',booting:'Starting',standby:'Ready',running:'Running',paused:'Paused',reserved:'Scheduled',finishing:'Complete'};
  function media(config){
    const tracks={wash:new Audio('audio/wash.mp3'),steam:new Audio('audio/steam.mp3'),dry:new Audio('audio/dry.mp3')};
    Object.values(tracks).forEach(a=>{a.loop=true;a.preload='none';});
    const button=new Audio(config.beep);button.preload='none';button.volume=.026;
    let current=null,identity='',lastStatus='',context=null,alarmTimer=null,alarming=false,oscillators=new Set();
    function play(a){const p=a.play();p?.catch(e=>console.warn('BW06 audio playback:',e.message));}
    function tone(at,duration=.14){
      try{
        const Ctx=window.AudioContext||window.webkitAudioContext;if(!Ctx)return;
        context=context||new Ctx();context.resume();
        const osc=context.createOscillator(),gain=context.createGain(),now=context.currentTime+at;
        osc.type='square';osc.frequency.value=880;gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.035,now+.012);gain.gain.setValueAtTime(.035,now+duration-.02);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
        osc.connect(gain);gain.connect(context.destination);oscillators.add(osc);osc.start(now);osc.stop(now+duration);osc.onended=()=>{oscillators.delete(osc);osc.disconnect();gain.disconnect();};
      }catch(e){console.warn('BW06 alarm:',e.message);}
    }
    function stopAlarm(){clearInterval(alarmTimer);alarmTimer=null;alarming=false;for(const o of oscillators)try{o.stop();}catch{}oscillators.clear();}
    function sync(v){
      if(v.status==='off')stopAlarm();
      const alarm=['running','paused'].includes(v.status)&&(v.lowWater||v.lidOpen);
      if(alarm&&!alarming){alarming=true;const burst=()=>{tone(0);tone(.26);tone(.52);};burst();alarmTimer=setInterval(burst,3000);}
      else if(!alarm&&alarming)stopAlarm();
      const next=tracks[v.current==='storage'?'dry':v.current],nextId=v.revision+':'+v.phase;
      if(v.status!=='running'||!next){
        current?.pause();
        if(v.status!=='paused'){Object.values(tracks).forEach(a=>{a.pause();a.currentTime=0;});current=null;identity='';}
        lastStatus=v.status;return;
      }
      if(current===next&&identity===nextId&&lastStatus==='running')return;
      if(current&&current!==next){current.pause();current.currentTime=0;}
      if(identity!==nextId||lastStatus!=='paused')next.currentTime=0;
      next.volume=v.current==='storage'?.39:v.current==='wash'&&['mute','silent'].includes(v.mode)?.468:.78;
      current=next;identity=nextId;lastStatus=v.status;
      next.play()?.then(()=>{if(current!==next||lastStatus!=='running')next.pause();}).catch(e=>console.warn('BW06 program audio:',e.message));
    }
    function feedback(kind){if(kind==='complete'){tone(0,.82);}else{button.currentTime=0;play(button);}}
    function dispose(){stopAlarm();Object.values(tracks).forEach(a=>a.pause());button.pause();context?.close();}
    return {sync,feedback,dispose};
  }
  function bind(button,short,long,threshold=1000){
    let down=null;
    button.addEventListener('pointerdown',e=>{down=performance.now();button.setPointerCapture?.(e.pointerId);});
    const cancel=()=>{down=null;};button.addEventListener('pointercancel',cancel);button.addEventListener('lostpointercapture',cancel);addEventListener('blur',cancel);
    button.addEventListener('pointerup',e=>{if(down===null)return;const held=performance.now()-down;down=null;if(long&&held>=threshold)long();else short?.();e.preventDefault();});
    button.addEventListener('click',e=>{if(e.detail===0&&short)short();});
  }
  function animation(nodes,cls,on){nodes.forEach(n=>n.classList.toggle(cls,on));}
  function lamps(nodes,opacity){nodes.forEach(n=>n.style.opacity=opacity);}
  const pauseTimelines=new WeakMap();
  function decorate(v,groups){
    const paused=v.status==='paused',running=v.status==='running',hour=v.chars.includes('H');
    if(!paused)pauseTimelines.delete(groups);
    else if(!pauseTimelines.has(groups)){
      const time=document.timeline?.currentTime;
      if(typeof time==='number')pauseTimelines.set(groups,time);
    }
    (groups.digits||[]).forEach(n=>n.classList.toggle('bw06-paused',paused&&Number(n.style.opacity)===1));
    animation(groups.colon||[],'bw06-paused',paused&&!hour);animation(groups.colon||[],'bw06-running-colon',running&&!hour);
    animation(groups.start||[],'bw06-paused',paused);
    // One pause epoch for every lit segment and every fragment of the start icon.
    // Keep it across re-renders; a run/pause transition begins a new epoch.
    if(paused&&pauseTimelines.has(groups)){
      const startTime=pauseTimelines.get(groups);
      for(const n of [...(groups.digits||[]),...(groups.colon||[]),...(groups.start||[])]){
        if(!n.classList.contains('bw06-paused'))continue;
        for(const a of n.getAnimations?.()||[]){
          if(a.animationName==='bw06PausePulse'&&a.startTime!==startTime)a.startTime=startTime;
        }
      }
    }
    animation(groups.water||[],'bw06-fault',v.status!=='off'&&v.lowWater);animation(groups.lid||[],'bw06-fault',v.status!=='off'&&v.lidOpen);
  }
  function demoNotice(){
    const viewport=document.querySelector('.device-viewport,.viewport');
    const panel=document.querySelector('.panel-stage,.stage,[data-node-id="48:1942"],#scheme4-art-0,#art-0');
    const toast=document.createElement('div');toast.id='bw06-demo-toast';toast.hidden=true;
    toast.setAttribute('role','status');toast.setAttribute('aria-live','polite');toast.setAttribute('aria-atomic','true');
    viewport.append(toast);
    let shownRevision=null,timer=null;
    function position(){
      if(toast.hidden)return;
      const box=panel.getBoundingClientRect(),view=viewport.getBoundingClientRect();
      toast.style.top=(box.y+box.height-view.y+12)+'px';
      toast.style.left=(box.x+box.width/2-view.x)+'px';
    }
    addEventListener('bw06viewchange',position);
    function hide(){clearTimeout(timer);timer=null;toast.hidden=true;toast.textContent='';}
    return v=>{
      if(v.status==='off'||v.status==='finishing'){hide();return;}
      if(v.status!=='running'||v.revision===shownRevision)return;
      shownRevision=v.revision;hide();toast.hidden=false;toast.textContent='Demo mode: time is sped up.';
      position();
      timer=setTimeout(hide,3000);
    };
  }
  function tools(controller){
    const PARAM='bw06Tools',KEY='bw06-demo-tools-v1';
    function parse(raw){
      if(raw==='open'||raw==='closed')return {open:raw==='open'};
      try{
        const value=JSON.parse(raw);
        // Old links with reservation preferences still retain their open state.
        return typeof value?.open==='boolean'?{open:value.open}:null;
      }catch{return null;}
    }
    let ui=null;
    try{ui=parse(new URL(location.href).searchParams.get(PARAM));}catch{}
    if(!ui)try{ui=parse(localStorage.getItem(KEY));}catch{}
    ui=ui||{open:false};
    const subscribers=new Set();
    const root=document.createElement('aside');root.id='bw06-simulation';root.setAttribute('aria-label','Demo tools');
    root.innerHTML=`<div id="bw06-simulation-panel" hidden aria-labelledby="bw06-tools-title">
    <div class="bw06-tool-head">
      <div class="bw06-heading"><h2 id="bw06-tools-title">Demo tools</h2><div class="bw06-tool-actions"><button type="button" class="bw06-close" data-action="close" aria-label="Close demo tools">×</button></div></div>
      <nav class="bw06-scheme-nav" aria-label="Switch design"><div id="bw06-scheme-panel" class="bw06-scheme-panel"></div></nav>
    </div>
    <div class="bw06-tool-body">
      <div class="bw06-status-row"><span class="bw06-status-label">Device</span><p data-status aria-live="polite"></p></div>
      <section aria-label="Fault simulation"><h3>Fault simulation</h3><div class="bw06-row">
        <button type="button" data-action="water" aria-pressed="false" aria-describedby="bw06-fault-note">Low water</button>
        <button type="button" data-action="lid" aria-pressed="false" aria-describedby="bw06-fault-note">Lid open</button>
      </div><p id="bw06-fault-note" class="bw06-note">Start a cycle to enable.</p></section>
    </div></div><button type="button" id="bw06-simulation-toggle" aria-controls="bw06-simulation-panel" aria-expanded="false">Demo tools</button>`;
    document.body.append(root);
    const panel=root.querySelector('#bw06-simulation-panel'),toggle=root.querySelector('#bw06-simulation-toggle');
    const buttons=Object.fromEntries([...root.querySelectorAll('[data-action]')].map(b=>[b.dataset.action,b]));
    const faultNote=root.querySelector('#bw06-fault-note');
    const sizeButton=document.getElementById('bw06-size-open');
    if(sizeButton)root.querySelector('.bw06-tool-actions').append(sizeButton,buttons.close);
    function linkUrl(url){const next=new URL(url,location.href);next.searchParams.set(PARAM,JSON.stringify(ui));return next.href;}
    function remember(){
      try{localStorage.setItem(KEY,JSON.stringify(ui));}catch{}
      try{history.replaceState(history.state,'',linkUrl(location.href));}catch{}
      subscribers.forEach(fn=>fn());
    }
    function open(value,focus=true){
      ui.open=value;panel.hidden=!value;toggle.hidden=value;toggle.setAttribute('aria-expanded',String(value));
      remember();if(focus)(value?buttons.close:toggle).focus();
    }
    toggle.textContent='Demo tools · Design '+document.body.dataset.bw06Scheme;
    window.BW06Tools={open,linkUrl,snapshot:()=>({...ui}),subscribe:fn=>{subscribers.add(fn);return()=>subscribers.delete(fn);}};
    open(ui.open,false);
    toggle.onclick=()=>open(true);
    root.addEventListener('keydown',e=>{if(e.key==='Escape')open(false);});
    buttons.water.onclick=()=>controller.fault('water',!controller.snapshot().lowWater);
    buttons.lid.onclick=()=>controller.fault('lid',!controller.snapshot().lidOpen);
    buttons.close.onclick=()=>open(false);
    return v=>{
      const canFault=['running','paused'].includes(v.status);
      buttons.water.disabled=buttons.lid.disabled=!canFault;
      buttons.water.textContent=v.lowWater?'Refill water':'Low water';buttons.water.setAttribute('aria-pressed',String(v.lowWater));
      buttons.lid.textContent=v.lidOpen?'Close lid':'Lid open';buttons.lid.setAttribute('aria-pressed',String(v.lidOpen));
      faultNote.textContent=v.lowWater&&v.lidOpen?'Refill and close lid, then press Start/Pause.':v.lowWater?'Refill, then press Start/Pause.':v.lidOpen?(v.manualPause?'Close lid, then press Start/Pause.':v.waterResumeRequired?'Close lid, then press Start/Pause.':'Close lid to resume.'):v.waterResumeRequired?'Press Start/Pause to resume.':canFault?'Available while running or paused.':'Start a cycle to enable.';
      const faults=[v.lowWater?'Low water':'',v.lidOpen?'Lid open':''].filter(Boolean);
      const status=root.querySelector('[data-status]');
      const statusText=STATUS_NAMES[v.status]+(v.current?' · '+KEY_NAMES[v.current]:'')+(faults.length?' · '+faults.join(' / '):'');
      if(status.textContent!==statusText)status.textContent=statusText;
    };
  }
  function mount(config,render,groups){
    for(const [role,nodes] of Object.entries(groups))nodes.forEach(n=>n.dataset.bw06Role=role);
    const controller=BW06State.create(config),sounds=media(config),updateTools=tools(controller),updateNotice=demoNotice();
    let lastLock=0;
    controller.setFeedback(kind=>{sounds.feedback(kind);if(kind==='locked'){const nodes=groups.lock||[];nodes.forEach(n=>{n.classList.remove('bw06-lock-feedback');void n.getBoundingClientRect();n.classList.add('bw06-lock-feedback');});clearTimeout(lastLock);lastLock=setTimeout(()=>animation(nodes,'bw06-lock-feedback',false),2160);}});
    controller.setRender(v=>{render(v);decorate(v,groups);sounds.sync(v);updateTools(v);updateNotice(v);if(v.status==='off'){clearTimeout(lastLock);animation(groups.lock||[],'bw06-lock-feedback',false);}});
    window.BW06Demo=controller;
    addEventListener('pagehide',()=>{controller.off();sounds.dispose();});
    return controller;
  }
  globalThis.BW06Panel={mount,bind,lamps,animation,decorate};
})();
