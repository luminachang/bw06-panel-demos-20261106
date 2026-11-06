(() => {
  const style=document.createElement('style');
  style.textContent=`
  @keyframes bw06Pulse{0%,49.99%{opacity:1}50%,100%{opacity:0}}
  .bw06-paused,.bw06-running-colon{animation:bw06Pulse 1.2s steps(1,end) infinite}
  .bw06-fault{animation:bw06Pulse .8s steps(1,end) infinite}
  .bw06-lock-feedback{animation:bw06Pulse .36s steps(1,end) 6}
  #bw06-simulation{position:fixed;right:max(16px,env(safe-area-inset-right));bottom:64px;z-index:60;font:13px/1.5 system-ui;color:#eee;max-width:calc(100vw - 32px)}
  #bw06-simulation[hidden],#bw06-simulation [hidden]{display:none}
  #bw06-simulation button,#bw06-simulation select{font:inherit;color:inherit;border:1px solid #555;border-radius:7px;background:#292929;padding:8px 10px;cursor:pointer}
  #bw06-simulation button:disabled{opacity:.35;cursor:default}
  #bw06-simulation button:focus-visible,#bw06-simulation select:focus-visible{outline:2px solid #54d89b;outline-offset:2px}
  #bw06-simulation-panel{width:min(360px,calc(100vw - 32px));max-height:calc(100dvh - 160px);overflow:auto;box-sizing:border-box;padding:16px;margin-bottom:8px;border:1px solid #555;border-radius:12px;background:#222f;box-shadow:0 6px 28px #0005}
  #bw06-simulation-panel h3{font-size:13px;margin:14px 0 7px;color:#bbb}
  #bw06-simulation-panel .bw06-heading{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;gap:12px}
  #bw06-simulation-panel h2{font-size:14px;margin:0}
  #bw06-simulation-panel .bw06-close{font-size:24px;line-height:1;padding:3px;width:32px;height:32px;border:0;background:transparent;color:#bbb}
  #bw06-simulation-panel .bw06-note{font-size:11px}
  #bw06-simulation-panel .bw06-row{display:flex;gap:7px;flex-wrap:wrap;margin-top:7px}
  #bw06-simulation-panel p{margin:0 0 12px;color:#bbb}
  #bw06-simulation-panel label{display:block;margin:6px 0}
  #bw06-simulation-panel select{width:100%;box-sizing:border-box}
  #bw06-simulation-toggle{display:block;margin-left:auto;font-size:12px!important;color:#bbb!important}
  #bw06-simulation [aria-pressed=true]{border-color:#54d89b;color:#54d89b}
  `;
  document.head.append(style);
  const KEY_NAMES={wash:'清洗',steam:'消毒',dry:'烘干',storage:'储存'};
  const STATUS_NAMES={off:'关机',booting:'开机检查',standby:'待机',running:'运行中',paused:'已暂停',reserved:'预约等待',finishing:'已完成'};
  function media(config){
    const tracks={wash:new Audio('audio/wash.mp3'),steam:new Audio('audio/steam.mp3'),dry:new Audio('audio/dry.mp3')};
    Object.values(tracks).forEach(a=>{a.loop=true;a.preload='auto';});
    const button=new Audio(config.beep);button.volume=.026;
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
  function decorate(v,groups){
    const paused=v.status==='paused',running=v.status==='running',hour=v.chars.includes('H');
    (groups.digits||[]).forEach(n=>n.classList.toggle('bw06-paused',paused&&Number(n.style.opacity)===1));
    animation(groups.colon||[],'bw06-paused',paused&&!hour);animation(groups.colon||[],'bw06-running-colon',running&&!hour);
    animation(groups.start||[],'bw06-paused',paused);
    animation(groups.water||[],'bw06-fault',v.status!=='off'&&v.lowWater);animation(groups.lid||[],'bw06-fault',v.status!=='off'&&v.lidOpen);
  }
  function tools(controller){
    const root=document.createElement('aside');root.id='bw06-simulation';root.setAttribute('aria-label','状态模拟');
    root.innerHTML=`<div id="bw06-simulation-panel" hidden>
    <div class="bw06-heading"><h2>状态模拟</h2><button class="bw06-close" data-action="close" aria-label="关闭状态模拟">×</button></div>
    <p data-status aria-live="polite"></p>
    <p class="bw06-note" data-delivery-note hidden></p>
    <h3>App 直接下发</h3><div class="bw06-row"><button data-action="task-a">任务 A</button><button data-action="task-b">任务 B</button></div>
    <p style="font-size:11px;margin-top:8px">A：清洗29＋消毒9＋烘干60分钟＋储存72小时<br>B：消毒9＋烘干40分钟</p>
    <h3>App 预约</h3><label>预约任务<select data-kind><option value="preset">标准／常规预设</option><option value="custom">自定义 A</option><option value="B">自定义 B</option></select></label>
    <label>距离启动<select data-hours><option value="2">2 小时</option><option value="12">12 小时</option></select></label>
    <div class="bw06-row"><button data-action="reserve">下发预约</button><button data-action="cancel">App 取消预约</button><button data-action="due" hidden>模拟预约到时</button><button data-action="boundary" hidden>模拟剩余 9 小时 59 分</button></div>
    <h3>异常条件</h3><p id="bw06-fault-note" class="bw06-note">请先启动程序，再模拟缺水／开盖。程序运行或暂停时可用，待机和预约等待时不可用。</p>
    <div class="bw06-row"><button data-action="water" aria-pressed="false" aria-describedby="bw06-fault-note">模拟缺水</button><button data-action="lid" aria-pressed="false" aria-describedby="bw06-fault-note">模拟开盖</button></div>
    </div><button id="bw06-simulation-toggle" aria-controls="bw06-simulation-panel" aria-expanded="false">状态模拟 ▴</button>`;
    document.body.append(root);
    const panel=root.querySelector('#bw06-simulation-panel'),toggle=root.querySelector('#bw06-simulation-toggle'),buttons=Object.fromEntries([...root.querySelectorAll('[data-action]')].map(b=>[b.dataset.action,b]));
    const deliveryNote=root.querySelector('[data-delivery-note]');
    let pendingDelivery=null;
    function open(value){panel.hidden=!value;toggle.hidden=value;toggle.setAttribute('aria-expanded',String(value));(value?buttons.close:toggle).focus();}
    toggle.onclick=()=>open(true);root.addEventListener('keydown',e=>{if(e.key==='Escape'){open(false);}});
    // The facilitator prepares a powered-on scene; real App dispatch still requires an active device.
    function dispatch(action){
      const status=controller.snapshot().status;
      if(status==='off'){pendingDelivery=action;controller.power();}
      else if(['standby','running','paused','reserved'].includes(status))action();
    }
    buttons['task-a'].onclick=()=>dispatch(()=>controller.deliver('A'));buttons['task-b'].onclick=()=>dispatch(()=>controller.deliver('B'));
    buttons.reserve.onclick=()=>{const kind=root.querySelector('[data-kind]').value,hours=Number(root.querySelector('[data-hours]').value);dispatch(()=>controller.reserve(kind,hours));};
    buttons.cancel.onclick=controller.cancelReservation;buttons.boundary.onclick=()=>controller.fastForward(35940000);buttons.due.onclick=()=>controller.fastForward();
    buttons.water.onclick=()=>controller.fault('water',!controller.snapshot().lowWater);buttons.lid.onclick=()=>controller.fault('lid',!controller.snapshot().lidOpen);
    buttons.close.onclick=()=>open(false);
    return v=>{
      if(v.status==='off')pendingDelivery=null;
      else if(pendingDelivery&&v.status!=='booting'){
        const action=pendingDelivery;pendingDelivery=null;
        if(v.status==='standby'){action();return;}
      }
      const canDeliver=['off','standby','running','paused','reserved'].includes(v.status),canFault=['running','paused'].includes(v.status);
      for(const k of ['task-a','task-b','reserve'])buttons[k].disabled=!canDeliver;
      for(const selector of ['[data-kind]','[data-hours]'])root.querySelector(selector).disabled=!canDeliver;
      for(const k of ['cancel','boundary','due'])buttons[k].disabled=v.status!=='reserved';
      buttons.due.hidden=v.status!=='reserved';buttons.boundary.hidden=v.status!=='reserved'||v.reservationRemainingMs<36000000;
      deliveryNote.textContent=v.status==='off'?'设备关机中，点击下发会先准备开机场景。':v.status==='booting'?(pendingDelivery?'正在准备开机，完成后下发所选任务。':'正在开机，请稍候。'):v.status==='finishing'?'任务完成提示结束后即可下发。':'';
      deliveryNote.hidden=!deliveryNote.textContent;
      buttons.water.disabled=buttons.lid.disabled=!canFault;
      buttons.water.textContent=v.lowWater?'模拟补水':'模拟缺水';buttons.water.setAttribute('aria-pressed',String(v.lowWater));
      buttons.lid.textContent=v.lidOpen?'模拟合盖':'模拟开盖';buttons.lid.setAttribute('aria-pressed',String(v.lidOpen));
      root.querySelector('[data-status]').textContent=STATUS_NAMES[v.status]+(v.current?' · '+KEY_NAMES[v.current]:'');
    };
  }
  function mount(config,render,groups){
    for(const [role,nodes] of Object.entries(groups))nodes.forEach(n=>n.dataset.bw06Role=role);
    const controller=BW06State.create(config),sounds=media(config),updateTools=tools(controller);
    let lastLock=0;
    controller.setFeedback(kind=>{sounds.feedback(kind);if(kind==='locked'){const nodes=groups.lock||[];nodes.forEach(n=>{n.classList.remove('bw06-lock-feedback');void n.getBoundingClientRect();n.classList.add('bw06-lock-feedback');});clearTimeout(lastLock);lastLock=setTimeout(()=>animation(nodes,'bw06-lock-feedback',false),2160);}});
    controller.setRender(v=>{render(v);decorate(v,groups);sounds.sync(v);updateTools(v);if(v.status==='off'){clearTimeout(lastLock);animation(groups.lock||[],'bw06-lock-feedback',false);}});
    window.BW06Demo=controller;
    addEventListener('pagehide',()=>{controller.off();sounds.dispose();});
    return controller;
  }
  globalThis.BW06Panel={mount,bind,lamps,animation,decorate};
})();
