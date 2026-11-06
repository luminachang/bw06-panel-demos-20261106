(() => {
  const two=document.body.dataset.bw06Scheme==='2',stage=document.querySelector(two?'.stage':'.panel-stage'),svg=stage.querySelector('svg');
  const modeButton=two?document.querySelector('.mode'):null;
  const allShapes=[...svg.querySelectorAll('path,rect,line,ellipse,circle,polygon,polyline')];
  const bounds=n=>n.getBBox(),center=n=>{const b=bounds(n);return{x:b.x+b.width/2,y:b.y+b.height/2};};
  const inBox=(n,b)=>{const p=center(n);return p.x>=b[0]&&p.x<=b[2]&&p.y>=b[1]&&p.y<=b[3];};
  const ink=n=>{const cs=getComputedStyle(n);return /(white|#fff|#edeff2|#e5533d|rgb\(255, 255, 255\)|rgb\(237, 239, 242\)|rgb\(229, 83, 61\))/.test((cs.fill+' '+cs.stroke).toLowerCase());};
  const shapes=allShapes.filter(ink),pick=b=>shapes.filter(n=>inBox(n,b));
  const model=two?{
    modes:['auto','standard','strong','mute','rapid','selfclean'],defaultMode:'auto',memoryKey:'option2-last-mode',
    modeBoxes:{auto:[675,135,825,180],standard:[650,198,825,240],strong:[675,260,825,310],mute:[1370,135,1530,180],rapid:[1370,198,1530,240],selfclean:[1370,260,1535,310]},
    steps:{wash:[895,70,935,135],a1:[935,70,993,135],steam:[993,70,1033,135],a2:[1033,70,1091,135],dry:[1091,70,1131,135],a3:[1131,70,1188,135],storage:[1188,70,1230,135]},
    digitRanges:[[902,991],[1075,1166],[1199,1288]],colon:[1020,170,1050,275],power:[150,150,310,300],start:[1850,130,2050,310],lockKey:[490,150,630,300],lightKey:[360,150,490,300],modeKey:[1620,130,1820,310],appointment:[830,140,875,190],lock:[830,190,875,250],detergent:[825,255,885,315],water:[1310,190,1365,250],lid:[1310,135,1365,190],soft:[1310,255,1365,315]
  }:{
    modes:['standard','strong','rapid','sterilize','dry','selfclean'],defaultMode:'standard',memoryKey:'solution-one-last-started-mode',
    modeBoxes:{standard:[155,150,330,215],strong:[345,150,525,215],rapid:[515,150,690,215],sterilize:[145,245,320,315],dry:[330,245,500,315],selfclean:[515,245,695,315]},
    steps:{wash:[835,88,880,140],a1:[880,88,935,140],steam:[935,88,990,140],a2:[990,88,1045,140],dry:[1045,88,1100,140],a3:[1100,88,1155,140],storage:[1155,88,1215,140]},
    digitRanges:[[835,930],[1100,1198],[1210,1310]],colon:[1055,155,1088,280],power:[1835,155,2000,275],start:[1690,155,1810,285],lockKey:[1450,155,1555,285],lightKey:[1560,155,1665,285],modeKey:null,appointment:[765,145,825,198],lock:[765,200,825,255],detergent:[760,255,850,312],water:[1320,195,1380,255],lid:[1320,255,1380,315],soft:[1320,140,1380,195]
  };
  const parts={};for(const key of ['power','start','lockKey','lightKey','appointment','lock','water','lid','soft','detergent'])parts[key]=pick(model[key]);
  if(!two){
    const transformedBounds=n=>{const b=bounds(n),m=n.getCTM?.();if(!m)return b;const pts=[[b.x,b.y],[b.x+b.width,b.y],[b.x,b.y+b.height],[b.x+b.width,b.y+b.height]].map(([x,y])=>({x:m.a*x+m.c*y+m.e,y:m.b*x+m.d*y+m.f}));const xs=pts.map(p=>p.x),ys=pts.map(p=>p.y);return{x:Math.min(...xs),y:Math.min(...ys),width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys)};};
    parts.detergent=allShapes.filter(n=>{const b=transformedBounds(n),cs=getComputedStyle(n);return b.width<50&&b.height<50&&b.x<=848&&b.x+b.width>=814&&b.y<=298&&b.y+b.height>=264&&[cs.fill,cs.stroke].some(c=>c!=='none'&&!/(black|#000|rgb\(0, 0, 0\))/.test(c.toLowerCase()));});
  }
  const modeParts=Object.fromEntries(Object.entries(model.modeBoxes).map(([k,b])=>[k,pick(b)]));
  Object.values(modeParts).flat().forEach(n=>n.dataset.bw06Preset='true');
  const stepParts=Object.fromEntries(Object.entries(model.steps).map(([k,b])=>[k,pick(b)]));
  const colon=pick(model.colon),digits=model.digitRanges.map(()=>({a:[],b:[],c:[],d:[],e:[],f:[],g:[]}));
  shapes.forEach(n=>{const p=center(n),b=bounds(n),i=model.digitRanges.findIndex(([l,r])=>p.x>=l&&p.x<=r);if(i<0||p.y<140||p.y>315)return;const mid=(model.digitRanges[i][0]+model.digitRanges[i][1])/2;const k=b.width>=b.height?(p.y<190?'a':p.y<260?'g':'d'):(p.y<228?(p.x<mid?'f':'b'):(p.x<mid?'e':'c'));digits[i][k].push(n);});
  digits.forEach((d,i)=>Object.entries(d).forEach(([key,nodes])=>nodes.forEach(n=>{n.dataset.bw06Digit=i;n.dataset.bw06Segment=key;})));
  const masks={0:'abcdef',1:'bc',2:'abdeg',3:'abcdg',4:'bcfg',5:'acdfg',6:'acdefg',7:'abc',8:'abcdefg',9:'abcdfg',H:'bcefg'};
  const set=BW06Panel.lamps;
  const lightBar=two?svg.querySelector('#Line'):allShapes.find(n=>{if(n.tagName.toLowerCase()!=='line')return false;const b=bounds(n);return b.x>200&&b.x<250&&b.width>1500&&b.y>390;});
  function render(v){
    Object.assign(stage.dataset,{state:v.status,mode:v.mode,locked:v.locked?'1':'0',light:v.light?'1':'0',runStage:String(v.phase),custom:String(v.custom),taskRevision:String(v.revision),chars:v.chars});
    if(two)stage.className='stage '+v.status+(v.light&&v.status!=='off'?' light-on':'');
    else{stage.classList.toggle('is-off',v.status==='off');stage.classList.toggle('is-booting',v.status==='booting');stage.classList.toggle('is-on',!['off','booting'].includes(v.status));stage.classList.toggle('light-on',v.light&&v.status!=='off');stage.classList.toggle('lock-on',v.locked);}
    const on=v.status!=='off',boot=v.status==='booting',active=['running','paused'].includes(v.status),done=v.status==='finishing',reserved=v.status==='reserved';
    if(modeButton){modeButton.hidden=reserved;modeButton.disabled=reserved;}
    set(shapes,on?1:0);set(parts.detergent,boot?1:0);set(parts.power,on?1:.3);
    Object.values(stepParts).flat().forEach(n=>{n.style.fill='';n.style.stroke='';});
    if(lightBar)lightBar.style.opacity=on&&v.light&&!boot?1:0;
    if(!on)return;
    if(boot)return;
    set(parts.soft,0);set(parts.water,v.lowWater?1:0);set(parts.lid,v.lidOpen?1:0);set(parts.appointment,v.status==='reserved'?1:0);set(parts.lock,v.locked?1:0);set(parts.lockKey,v.locked?1:.3);set(parts.lightKey,v.light?1:.3);set(parts.start,reserved?0:1);
    if(model.modeKey)set(pick(model.modeKey),active||done||reserved?0:1);
    set(Object.values(modeParts).flat(),v.custom||active||done||reserved?0:.3);
    if(!v.custom&&modeParts[v.mode])set(modeParts[v.mode],1);
    const roles=[...v.seq];
    for(let i=0;i<v.seq.length-1;i++){const idx=BW06State.ORDER.indexOf(v.seq[i]);if(idx>=0&&idx<3)roles.push('a'+(idx+1));}
    const activeArrow=v.current&&v.seq.indexOf(v.current)<v.seq.length-1?'a'+(BW06State.ORDER.indexOf(v.current)+1):null;
    for(const [role,nodes] of Object.entries(stepParts)){
      const included=roles.includes(role),current=active&&(role===v.current||role===activeArrow);
      set(nodes,reserved||!included?0:done?.3:active?(current?1:.3):1);
      if(current)nodes.forEach(n=>{const cs=getComputedStyle(n);if(cs.fill!=='none')n.style.fill='#34c777';if(cs.stroke!=='none')n.style.stroke='#34c777';});
    }
    digits.forEach((segments,i)=>Object.entries(segments).forEach(([key,nodes])=>set(nodes,(masks[v.chars[i]]||'').includes(key)?(done?.3:1):0)));
    set(colon,v.chars.includes('H')?0:done?.3:1);
  }
  const C=BW06Panel.mount({modes:model.modes,defaultMode:model.defaultMode,reservationMode:'standard',memoryKey:model.memoryKey,beep:'./u_s026io00zm-beep-401570.mp3'},render,{digits:digits.flatMap(d=>Object.values(d).flat()),colon,start:parts.start,steps:Object.values(stepParts).flat(),water:parts.water,lid:parts.lid,lock:parts.lock});
  BW06Panel.bind(document.querySelector(two?'.power':'.power-hit'),null,C.power,800);
  BW06Panel.bind(document.querySelector(two?'.lock':'.lock-hit'),null,C.toggleLock);
  BW06Panel.bind(document.querySelector(two?'.light':'.light-hit'),C.toggleLight);
  BW06Panel.bind(document.querySelector(two?'.start':'.start-hit'),C.start);
  if(two)BW06Panel.bind(modeButton,C.cycle);
  else document.querySelectorAll('button[data-mode]').forEach(b=>BW06Panel.bind(b,()=>C.selectMode(b.dataset.mode)));
  C.emit();
  BW06View.ready();
})();
