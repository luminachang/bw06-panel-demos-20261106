(() => {
  const free=document.body.dataset.bw06Scheme==='5';
  const world=document.querySelector('.device');
  const art=i=>document.getElementById('art-'+i),range=(a,b)=>Array.from({length:b-a+1},(_,i)=>i+a);
  const ids=free?{digits:[range(2,8),range(11,17),range(18,24)],colon:[9,10],start:[29,30,32],power:[33,34,36],lock:[58,59,60],lockKey:[41,42],light:[37,38,39,40],appointment:[57],water:[51],lid:[50],faults:range(50,56),wifi:[61,62,63],mode:[45,47,48,49],dots:[46,70,71,72],self:[43,44],dynamic:[1,...range(2,30),32,33,34,36,...range(37,63),70,71,72]}:
  {digits:[range(43,49),range(52,58),range(59,65)],colon:[50,51],start:[6,7,9],power:[10,11,13],lock:[36,37,38],lockKey:[24,25],light:[20,21,22,23],appointment:[35],water:[67],lid:[66],faults:[...range(39,42),...range(66,68)],wifi:[29,30,31],mode:[26,27,28,32,33,34],dots:[],self:[],dynamic:[1,2,3,5,6,7,9,10,11,13,...range(14,68)]};
  const config={modes:free?['auto','rapid','standard','strong']:['auto','standard','rapid','strong','mute','selfclean'],defaultMode:'auto',reservationMode:'standard',memoryKey:free?'bw06-free-program-mode':'bw06-four-mode',combination:true,free,beep:'audio/beep.mp3'};
  const masks={0:'abcdef',1:'bc',2:'abdeg',3:'abcdg',4:'bcfg',5:'acdfg',6:'acdefg',7:'abc',8:'abcdefg',9:'abcdfg',H:'bcefg'},segments=['a','g','d','b','f','c','e'];
  const nodes=a=>a.map(art),set=(a,op)=>BW06Panel.lamps(nodes(a),op);
  nodes([...ids.mode,...ids.dots,...ids.self]).forEach(n=>n.dataset.bw06Preset='true');
  ids.digits.forEach((a,i)=>a.forEach((id,j)=>{art(id).dataset.bw06Digit=i;art(id).dataset.bw06Segment=segments[j];}));
  function render(v){
    Object.assign(world.dataset,{state:v.status,selection:v.mode,mode:v.mode,phase:v.current||'',locked:String(v.locked),light:String(v.light),custom:String(v.custom),taskRevision:String(v.revision)});
    set(ids.dynamic,0);
    const on=v.status!=='off',boot=v.status==='booting',active=['running','paused'].includes(v.status),done=v.status==='finishing',self=v.mode==='selfclean',reserved=v.status==='reserved';
    set(ids.power,on?1:.3);if(!on)return;
    set(ids.start,reserved?0:1);set(ids.lockKey,v.locked?1:.3);set(ids.light,v.light?1:.3);
    if(!free)set([2,3,5],1);
    if(boot){set(ids.mode,1);set(ids.dots,1);set(ids.self,1);}
    else if(!v.custom){
      if(free){set(ids.self,self?(done?.3:1):active||done||reserved?0:.3);if(!self&&v.seq.includes('wash')){if(!active&&!done&&!reserved)set(ids.mode,.3);const i=config.modes.indexOf(v.mode);if(i>=0){set([ids.mode[i]],done?.3:1);set([ids.dots[i]],done?.3:1);}}}
      else if(v.seq.includes('wash')||self){const i=config.modes.indexOf(v.mode);if(i>=0)set([ids.mode[i]],done?.3:1);}
    }
    const programs=free?[['wash',[25]],['steam',[26]],['dry',[27]],['storage',[28]]]:[['steam',[14,15]],['dry',[16,17]],['storage',[18,19]]];
    for(const [k,a] of programs){const included=!self&&v.seq.includes(k);set(a,reserved?0:boot?1:!included?(active||done||v.custom?0:.3):done?.3:active?(v.current===k?1:.3):1);}
    set(ids.faults,boot?1:0);set(ids.water,boot||v.lowWater?1:0);set(ids.lid,boot||v.lidOpen?1:0);
    set(ids.appointment,boot||v.status==='reserved'?1:0);set(ids.lock,boot||v.locked?1:0);set(ids.wifi,1);set([1],active?1:0);
    ids.digits.forEach((a,i)=>a.forEach((id,j)=>set([id],(masks[v.chars[i]]||'').includes(segments[j])?(done?.3:1):0)));
    set(ids.colon,v.chars.includes('H')?0:done?.3:1);
  }
  const groups={digits:nodes(ids.digits.flat()),colon:nodes(ids.colon),start:nodes(ids.start),steps:nodes(free?[25,26,27,28]:[14,15,16,17,18,19]),water:nodes(ids.water),lid:nodes(ids.lid),lock:nodes(ids.lock)};
  const C=BW06Panel.mount(config,render,groups);
  function key(id,label,x,y,w,h,short,long,threshold=1000){const b=document.createElement('button');b.id=id;b.className='hit';b.setAttribute('aria-label',label);Object.assign(b.style,{left:x+'px',top:y+'px',width:w+'px',height:h+'px'});world.append(b);BW06Panel.bind(b,short,long,threshold);}
  if(free){
    key('power','电源',345,355,150,150,null,C.power,800);key('mode','清洗模式',835,505,235,75,C.cycle,C.cancelWash);
    [['steam','消毒',1150],['dry','烘干',1360],['storage','储存',1560]].forEach(([id,label,x])=>key(id,label,x,505,170,75,()=>C.toggleProgram(id)));
    key('lock','童锁',1710,385,100,100,null,C.toggleLock);key('light','灯光',1835,385,100,100,C.toggleLight);key('selfclean','自清洁',550,355,170,150,C.selfClean);key('start','启停',2020,355,180,150,C.start);
  }else{
    key('power','电源',300,385,155,155,null,C.power,800);key('mode','清洗模式',1840,375,180,155,C.cycle,C.cancelWash);
    [['steam','消毒',480],['dry','烘干',650],['storage','储存',810]].forEach(([id,label,x])=>key(id,label,x,390,140,130,()=>C.toggleProgram(id)));
    key('lock','童锁',1625,415,85,95,null,C.toggleLock);key('light','灯光',1730,415,85,95,C.toggleLight);key('start','启停',2060,380,180,150,C.start);
  }
  C.emit();
  BW06View.ready();
})();
