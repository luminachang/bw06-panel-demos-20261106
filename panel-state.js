/* BW06: one task/state clock shared by the five fixed-lamp panels. */
(() => {
  const ORDER = ['wash', 'steam', 'dry', 'storage'];
  const WASH = {auto:39, standard:29, rapid:19, strong:39, mute:50, silent:50};
  const EXAMPLES = {
    A:{label:'自定义 A', custom:true, stages:[{key:'wash',minutes:29},{key:'steam',minutes:9},{key:'dry',minutes:60},{key:'storage',hours:72}]},
    B:{label:'自定义 B', custom:true, stages:[{key:'steam',minutes:9},{key:'dry',minutes:40}]}
  };
  const copy = value => JSON.parse(JSON.stringify(value));
  function timeChars(minutes) { return String(Math.floor(minutes/60))+String(minutes%60).padStart(2,'0'); }
  function reservationChars(ms) {
    if(ms>=36000000) return String(Math.ceil(ms/3600000)).padStart(2,'0')+'H';
    return timeChars(Math.min(599,Math.ceil(Math.max(0,ms)/60000)));
  }
  function create(config, options={}) {
    const clock=options.clock||{now:()=>performance.now(),setTimeout:(f,t)=>setTimeout(f,t),clearTimeout:t=>clearTimeout(t),setInterval:(f,t)=>setInterval(f,t),clearInterval:t=>clearInterval(t)};
    let storage=options.storage; if(!storage)try{storage=globalThis.localStorage;}catch{}
    const demoMs=5000;
    let phaseTimer=null,bootTimer=null,finishTimer=null,pulseTimer=null,reservationTimer=null,deadline=0,phaseRemaining=demoMs,waitDeadline=0,revision=0;
    let onChange=options.render||(()=>{}), onFeedback=options.feedback||(()=>{});
    function readMode(){try{const m=storage?.getItem(config.memoryKey);return config.modes.includes(m)&&m!=='selfclean'?m:config.defaultMode;}catch{return config.defaultMode;}}
    function initial(){return {status:'off',mode:readMode(),selected:[...ORDER],phase:0,locked:false,light:false,task:null,lowWater:false,lidOpen:false,manualPause:false,waterResumeRequired:false,revision};}
    let s=initial();
    function preset(mode=s.mode, selected=s.selected) {
      let stages;
      if(mode==='selfclean') stages=[{key:'wash',minutes:20},{key:'dry',minutes:10}];
      else if(mode==='sterilize') stages=[{key:'steam',minutes:9}];
      else if(mode==='dry') stages=[{key:'dry',minutes:50}];
      else stages=ORDER.filter(k=>selected.includes(k)).map(key=>({key,...(key==='storage'?{hours:72}:{minutes:key==='wash'?WASH[mode]:key==='steam'?9:50})}));
      return {custom:false, mode, label:mode, stages};
    }
    function task(){return s.task||preset();}
    function remainingMs(){return s.status==='running'?Math.max(0,deadline-clock.now()):phaseRemaining;}
    function snapshot(){
      const t=task(), active=['running','paused'].includes(s.status), current=active?t.stages[s.phase]:null;
      const rest=t.stages.slice(active?s.phase:0);
      const remaining=remainingMs();
      let chars='';
      if(s.status==='booting') chars='888';
      else if(s.status==='finishing') chars='000';
      else if(s.status==='reserved') chars=reservationChars(waitDeadline-clock.now());
      else if(s.status!=='off') {
        if(current?.key==='storage') chars=String(Math.max(0,Math.ceil(current.hours*remaining/demoMs))).padStart(2,'0')+'H';
        else {
          const minutes=rest.reduce((n,p,i)=>n+(p.minutes||0)*(active&&i===0?remaining/demoMs:1),0);
          chars=timeChars(Math.max(0,Math.ceil(minutes-1e-7)));
        }
      }
      return {...s, task:copy(t), custom:!!t.custom, seq:t.stages.map(p=>p.key), current:current?.key||null, chars, phaseRemainingMs:remaining, reservationRemainingMs:s.status==='reserved'?Math.max(0,waitDeadline-clock.now()):0};
    }
    function emit(){const v=snapshot();onChange(v);return v;}
    function clearTimers(){for(const t of [phaseTimer,bootTimer,finishTimer,reservationTimer])clock.clearTimeout(t);clock.clearInterval(pulseTimer);phaseTimer=bootTimer=finishTimer=reservationTimer=pulseTimer=null;}
    function pulse(){clock.clearInterval(pulseTimer);pulseTimer=clock.setInterval(emit,100);}
    function remember(){if(!s.task?.custom&&s.mode!=='selfclean'&&(config.combination?s.selected.includes('wash'):true)){try{storage?.setItem(config.memoryKey,s.mode);}catch{}}}
    function schedule(){clock.clearTimeout(phaseTimer);deadline=clock.now()+phaseRemaining;phaseTimer=clock.setTimeout(advance,phaseRemaining);pulse();}
    function finish(){clearTimers();s.status='finishing';s.manualPause=false;s.waterResumeRequired=false;emit();finishTimer=clock.setTimeout(()=>{onFeedback('complete');finishTimer=clock.setTimeout(off,850);},1000);}
    function advance(){if(s.status!=='running')return;s.phase++;if(s.phase>=task().stages.length)return finish();phaseRemaining=demoMs;schedule();emit();}
    function pause(){if(s.status==='running'){phaseRemaining=remainingMs();clock.clearTimeout(phaseTimer);clock.clearInterval(pulseTimer);phaseTimer=pulseTimer=null;s.status='paused';}}
    function resume(){if(s.status==='paused'&&!s.lowWater&&!s.lidOpen&&!s.manualPause&&!s.waterResumeRequired){s.status='running';schedule();}emit();}
    function off(){clearTimers();revision++;s=initial();phaseRemaining=demoMs;waitDeadline=0;emit();}
    function power(){onFeedback('button');if(s.status!=='off')return off();clearTimers();s=initial();s.status='booting';emit();bootTimer=clock.setTimeout(()=>{s.status='standby';emit();},1000);}
    function guard(){if(!['standby','running','paused','reserved'].includes(s.status))return false;if(s.locked){onFeedback('locked');return false;}return true;}
    function start(){
      if(s.status==='reserved'||!guard())return;
      if(s.lowWater||s.lidOpen)return;
      onFeedback('button');
      if(s.status==='standby'){s.task=preset();s.phase=0;phaseRemaining=demoMs;s.revision=++revision;remember();s.status='running';schedule();}
      else if(s.status==='running'){s.manualPause=true;pause();}
      else if(s.status==='paused'){s.manualPause=false;s.waterResumeRequired=false;s.status='running';schedule();}
      emit();
    }
    function selectMode(mode){if(!guard()||s.status!=='standby'||!config.modes.includes(mode))return;s.mode=mode;s.task=null;s.phase=0;onFeedback('button');emit();}
    function cycle(){
      if(!guard()||s.status!=='standby')return;
      if(config.free&&s.mode==='selfclean'){s.mode=s.lastWash||config.defaultMode;s.selected=['wash'];}
      else if(config.combination&&s.mode!=='selfclean'&&!s.selected.includes('wash'))s.selected=ORDER.filter(k=>k==='wash'||s.selected.includes(k));
      else {
        const previous=s.mode;s.mode=config.modes[(config.modes.indexOf(s.mode)+1)%config.modes.length];
        if(config.combination&&s.mode==='selfclean'){s.beforeSelf=[...s.selected];s.selected=['wash','dry'];}
        else if(config.combination&&previous==='selfclean'){s.selected=s.beforeSelf||[...ORDER];s.beforeSelf=null;}
      }
      s.task=null;onFeedback('button');emit();
    }
    function toggleProgram(key){
      if(!guard()||s.status!=='standby'||!config.combination)return;
      if(s.mode==='selfclean'){s.mode=config.free?(s.lastWash||config.defaultMode):config.defaultMode;s.selected=[key];}
      else if(s.selected.includes(key)){if(s.selected.length>1)s.selected=s.selected.filter(k=>k!==key);}
      else s.selected=ORDER.filter(k=>s.selected.includes(k)||k===key);
      s.task=null;onFeedback('button');emit();
    }
    function cancelWash(){if(!guard()||s.status!=='standby'||!config.combination||s.mode==='selfclean')return;if(s.selected.length>1)s.selected=s.selected.filter(k=>k!=='wash');s.task=null;onFeedback('button');emit();}
    function selfClean(){if(!guard()||s.status!=='standby'||s.mode==='selfclean')return;s.lastWash=s.mode;s.mode='selfclean';s.selected=['wash','dry'];s.task=null;onFeedback('button');emit();}
    function toggleLight(){if(!guard())return;s.light=!s.light;onFeedback('button');emit();}
    function toggleLock(){if(!['standby','running','paused','reserved'].includes(s.status))return;s.locked=!s.locked;onFeedback('button');emit();}
    function installTask(t,waitMs=0){
      if(!['standby','running','paused','reserved'].includes(s.status))return false;
      clearTimers();s.task=copy(t);s.mode=t.custom?'custom':t.mode;s.selected=t.stages.map(p=>p.key);s.phase=0;s.revision=++revision;s.manualPause=false;s.waterResumeRequired=!!s.lowWater;phaseRemaining=demoMs;
      if(waitMs>0){s.status='reserved';waitDeadline=clock.now()+waitMs;reservationTimer=clock.setTimeout(beginReservation,waitMs);pulse();}
      else{s.status='running';remember();schedule();if(s.lowWater||s.lidOpen)pause();}
      emit();return true;
    }
    function beginReservation(){if(s.status!=='reserved')return;clearTimers();waitDeadline=0;s.status='running';phaseRemaining=demoMs;remember();schedule();if(s.lowWater||s.lidOpen)pause();emit();}
    function deliver(id='A'){return installTask(EXAMPLES[id]);}
    function reserve(kind='custom',hours=2){const t=kind==='preset'?preset(config.reservationMode,ORDER):EXAMPLES[kind==='B'?'B':'A'];return installTask(t,hours*3600000);}
    function fastForward(ms=0){
      if(s.status!=='reserved'||!Number.isFinite(ms)||ms>Math.max(0,waitDeadline-clock.now()))return false;
      clock.clearTimeout(reservationTimer);waitDeadline=clock.now()+Math.max(0,ms);
      if(ms<=0)beginReservation();else{reservationTimer=clock.setTimeout(beginReservation,ms);emit();}
      return true;
    }
    function cancelReservation(){if(s.status!=='reserved')return;clearTimers();s.status='standby';s.task=null;s.mode=readMode();s.selected=[...ORDER];s.phase=0;waitDeadline=0;emit();}
    function fault(kind,value){
      if(!['running','paused'].includes(s.status))return;
      if(kind==='water'){if(s.lowWater===value)return;s.lowWater=value;if(value){s.waterResumeRequired=true;pause();}}
      else if(kind==='lid'){if(s.lidOpen===value)return;s.lidOpen=value;if(value)pause();}
      if(!s.lowWater&&!s.lidOpen)resume();else emit();
    }
    return {snapshot,emit,power,off,start,selectMode,cycle,toggleProgram,cancelWash,selfClean,toggleLight,toggleLock,deliver,reserve,fastForward,cancelReservation,fault,preset,setRender:f=>{onChange=f;},setFeedback:f=>{onFeedback=f;}};
  }
  const api={create,EXAMPLES,ORDER,WASH,timeChars,reservationChars};
  globalThis.BW06State=api;
  if(typeof module!=='undefined')module.exports=api;
})();
