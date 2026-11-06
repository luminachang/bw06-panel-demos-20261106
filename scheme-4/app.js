/* Scheme 4: the supplied 2140 × 402 artwork, on the existing device canvas. */
(() => {
  const world=document.querySelector('.device');
  const art=i=>document.getElementById('scheme4-art-'+i);
  const range=(a,b)=>Array.from({length:b-a+1},(_,i)=>i+a);
  const ids={
    digits:[range(14,20),range(23,29),range(30,36)],colon:[21,22],
    power:[2,3,13],start:[5,6],lock:[11,12],light:[7,8,9,10],
    appointment:[37],lid:[38],water:[39],faults:[38,39,40,...range(44,50)],wifi:[41,42,43],
    mode:[51,52,53,54,55],modeFrame:[73],
    dynamic:[1,2,3,...range(5,71),73]
  };
  const programs=[
    ['wash',[56,57]],['steam',[59,60,61,62,63]],
    ['dry',[65,66,67,68]],['storage',[70,71]]
  ];
  const arrows=[['wash','steam',[58]],['steam','dry',[64]],['dry','storage',[69]]];
  const config={modes:['auto','standard','rapid','strong','mute'],defaultMode:'auto',reservationMode:'standard',memoryKey:'bw06-four-mode',combination:true,free:false,beep:'audio/beep.mp3'};
  const masks={0:'abcdef',1:'bc',2:'abdeg',3:'abcdg',4:'bcfg',5:'acdfg',6:'acdefg',7:'abc',8:'abcdefg',9:'abcdfg',H:'bcefg'};
  const segments=['a','g','d','b','f','c','e'];
  const nodes=a=>a.map(art),set=(a,op)=>BW06Panel.lamps(nodes(a),op),keys={};
  nodes(ids.mode).forEach(n=>n.dataset.bw06Preset='true');
  ids.digits.forEach((a,i)=>a.forEach((id,j)=>{
    art(id).dataset.bw06Digit=i;art(id).dataset.bw06Segment=segments[j];
  }));
  programs.forEach(([k,a])=>nodes(a).forEach(n=>n.dataset.bw06Program=k));
  arrows.forEach(([from,to,a])=>nodes(a).forEach(n=>n.dataset.bw06Arrow=from+'-'+to));
  function render(v){
    Object.assign(world.dataset,{state:v.status,selection:v.mode,mode:v.mode,phase:v.current||'',locked:String(v.locked),light:String(v.light),custom:String(v.custom),taskRevision:String(v.revision)});
    set(ids.dynamic,0);
    const on=v.status!=='off',boot=v.status==='booting',active=['running','paused'].includes(v.status),done=v.status==='finishing',reserved=v.status==='reserved';
    for(const name of ['mode','steam','dry','storage','start']){
      if(keys[name]){keys[name].hidden=reserved;keys[name].disabled=reserved;}
    }
    set(ids.power,on?1:.3);
    if(!on)return;
    set(ids.start,reserved?0:1);set(ids.lock,boot||v.locked?1:.3);set(ids.light,boot||v.light?1:.3);
    if(boot){set(ids.mode,1);set(ids.modeFrame,1);}
    else if(!v.custom&&v.seq.includes('wash')){
      if(!active&&!done&&!reserved)set(ids.mode,.3);
      const index=config.modes.indexOf(v.mode);
      if(index>=0)set([ids.mode[index]],done?.3:1);
      set(ids.modeFrame,reserved?0:.3);
    }
    const programLevels={};
    for(const [k,a] of programs){
      const included=v.seq.includes(k);
      programLevels[k]=reserved?0:boot?1:!included?(active||done||v.custom?0:.3):done?.3:active?(v.current===k?1:.3):1;
      set(a,programLevels[k]);
    }
    for(const [from,,a] of arrows){
      set(a,boot?1:(active||done)&&v.seq.length>1?programLevels[from]:0);
    }
    set(ids.faults,boot?1:0);set(ids.water,boot||v.lowWater?1:0);set(ids.lid,boot||v.lidOpen?1:0);
    set(ids.appointment,boot||reserved?1:0);set(ids.wifi,1);set([1],v.light&&!boot?1:0);
    ids.digits.forEach((a,i)=>a.forEach((id,j)=>set([id],(masks[v.chars[i]]||'').includes(segments[j])?(done?.3:1):0)));
    set(ids.colon,v.chars.includes('H')?0:done?.3:1);
  }
  const groups={digits:nodes(ids.digits.flat()),colon:nodes(ids.colon),start:nodes(ids.start),steps:nodes([...programs.flatMap(([,a])=>a),...arrows.flatMap(([, ,a])=>a)]),water:nodes(ids.water),lid:nodes(ids.lid),lock:nodes(ids.lock)};
  const C=BW06Panel.mount(config,render,groups);
  function key(id,label,x,y,w,h,short,long,threshold=1000){
    const b=document.createElement('button');b.id=id;b.className='hit';b.setAttribute('aria-label',label);
    Object.assign(b.style,{left:x+'px',top:y+'px',width:w+'px',height:h+'px'});
    keys[id]=b;world.append(b);BW06Panel.bind(b,short,long,threshold);
  }
  key('power','Power',1995,378,171,132,null,C.power,800);
  key('mode','Wash mode',335,390,120,135,C.cycle,C.cancelWash);
  key('steam','Steam',525,390,130,135,()=>C.toggleProgram('steam'));
  key('dry','Drying',720,390,130,135,()=>C.toggleProgram('dry'));
  key('storage','Storage',910,390,140,135,()=>C.toggleProgram('storage'));
  key('lock','Child lock',1640,400,92,92,null,C.toggleLock);
  key('light','Light',1755,400,92,92,C.toggleLight);
  key('start','Start/Pause',1870,405,92,80,C.start);
  C.emit();
  BW06View.ready();
})();
