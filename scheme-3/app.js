(() => {
  const device=document.querySelector('.device'),node=id=>document.querySelector(`[data-node-id="${id}"]`),panel=node('48:1942');
  const powerTarget=document.getElementById('power'),powerArt=node('48:2130');powerTarget.append(powerArt);Object.assign(powerArt.style,{left:'0px',top:'0px',pointerEvents:'none',zIndex:'1',visibility:'visible'});
  const names=['auto','standard','rapid','strong','mute','selfclean'],icons=['48:1979','48:1991','48:2000','48:2009','48:2017','48:1971'],labels=['48:1978','48:1990','48:1999','48:2008','48:2016','48:1977'];
  const digits=['48:2025','48:2038','48:2048'].map(id=>[...node(id).querySelectorAll('path')].map(p=>{const b=p.getBBox();return {p,k:b.width>b.height?(b.y<30?'a':b.y>110?'d':'g'):(b.x<40?(b.y<70?'f':'e'):(b.y<70?'b':'c'))};}));
  const masks={0:'abcdef',1:'bc',2:'abdeg',3:'abcdg',4:'bcfg',5:'acdfg',6:'acdefg',7:'abc',8:'abcdefg',9:'abcdfg',H:'bcefg'};
  const artwork=id=>[...node(id).querySelectorAll('img,svg,p')],show=(id,op)=>BW06Panel.lamps(artwork(id),op);
  [...icons,...labels].flatMap(artwork).forEach(n=>n.dataset.bw06Preset='true');
  digits.forEach((d,i)=>d.forEach(({p,k})=>{p.dataset.bw06Digit=i;p.dataset.bw06Segment=k;}));
  function render(v){
    Object.assign(device.dataset,{state:v.status,mode:v.mode,locked:String(v.locked),phase:String(v.phase),custom:String(v.custom),taskRevision:String(v.revision)});
    const on=v.status!=='off',boot=v.status==='booting',active=['running','paused'].includes(v.status);
    names.forEach((m,i)=>{const op=!on?0:boot?1:v.custom?0:m===v.mode?1:active||v.status==='finishing'||v.status==='reserved'?0:.3;show(icons[i],op);show(labels[i],op);});
    ['48:2073','48:2078','48:2085','48:2107'].forEach(id=>show(id,boot?1:0));
    show('48:2073',boot||on&&v.lidOpen?1:0);show('48:2078',boot||on&&v.lowWater?1:0);show('48:2058',boot||v.status==='reserved'?1:0);show('48:2060',boot||on&&v.locked?1:0);show('48:2094',on?1:0);
    show('55:2175',boot?1:on?(v.light?1:.3):0);show('48:2144',on&&v.status!=='reserved'?1:0);show('48:2130',on?1:.3);show('48:1945',on&&v.light?1:0);
    digits.forEach((parts,i)=>parts.forEach(({p,k})=>p.style.opacity=on&&masks[v.chars[i]]?.includes(k)?(v.status==='finishing'?.3:1):0));show('48:2035',on&&!v.chars.includes('H')?(v.status==='finishing'?.3:1):0);
  }
  const C=BW06Panel.mount({modes:names,defaultMode:'auto',reservationMode:'standard',memoryKey:'solution-three-last-started-mode',beep:'assets/beep.mp3'},render,{digits:digits.flat().map(x=>x.p),colon:artwork('48:2035'),start:artwork('48:2144'),water:artwork('48:2078'),lid:artwork('48:2073'),lock:artwork('48:2060')});
  function key(name,label,x,y,w,h,action,long,threshold=1000){const b=document.getElementById(name)||document.createElement('button');b.className='hit';b.id=name;b.setAttribute('aria-label',label);Object.assign(b.style,{left:x+'px',top:y+'px',width:w+'px',height:h+'px'});panel.append(b);BW06Panel.bind(b,action,long,threshold);}
  names.forEach((m,i)=>key(m,m,i<5?[120,263,405,542,679][i]:1375,155,i<5?132:145,155,()=>C.selectMode(m)));
  key('light','灯光',1530,155,140,155,C.toggleLight);key('power','电源',1903.54,162,150,120,null,C.power,800);key('start','启停／童锁',1701,164,165,135,C.start,C.toggleLock);
  C.emit();device.style.visibility='visible';BW06View.ready();
})();
