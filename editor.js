/* ── STATE ── */
let uploadedImg = null, origImgData = null;
let selectedTpl = 0, currentStep = 0;
let textColor = '#ffffff', textPos = 'bot-left';
let showOriginal = false;
let history = [], historyIdx = -1;

/* Filters */
const F = { brightness:100, contrast:100, saturation:100, blur:0, grayscale:0, sepia:0, vignette:0, corners:0 };

/* Text layers */
let textLayers = [{ id:1, text:'Your Story Here', sub:'Captured in a moment', color:'#ffffff', size:28, font:'Georgia, serif', opacity:100, pos:'bot-left', x:0, y:0, useXY:false }];
let activeTL = 0;

/* Crop state */
let cropMode = false, cropRect = { x:0.05, y:0.05, w:0.9, h:0.9 };
let cropDrag = null;

/* Canvas preset sizes */
const PRESETS = [
  { name:'Free',          w:800, h:600  },
  { name:'Instagram 1:1', w:800, h:800  },
  { name:'Story 9:16',    w:450, h:800  },
  { name:'Twitter',       w:800, h:418  },
  { name:'Facebook',      w:800, h:418  },
  { name:'A4 Portrait',   w:595, h:842  },
];
let activePreset = 0;

/* ── TEMPLATES ── */
const TEMPLATES = [
  { name:'Sunset Gold',  draw: drawSunset  },
  { name:'Ocean Mist',   draw: drawOcean   },
  { name:'Neon Nights',  draw: drawNeon    },
  { name:'Minimalist',   draw: drawMinimal },
  { name:'Forest Bloom', draw: drawForest  },
  { name:'Vintage Film', draw: drawVintage },
];
function getBorderPct(i){ return [0.045,0.04,0.04,0.04,0.04,0.05][i]; }

function drawSunset(ctx,w,h){ const b=Math.round(w*0.045),g=ctx.createLinearGradient(0,0,w,h); g.addColorStop(0,'#ff6b35');g.addColorStop(1,'#ffd700'); ctx.save();ctx.fillStyle=g;ctx.fillRect(0,0,w,h);ctx.clearRect(b,b,w-b*2,h-b*2);ctx.restore(); }
function drawOcean(ctx,w,h){ const b=Math.round(w*0.04),g=ctx.createLinearGradient(0,0,w,h); g.addColorStop(0,'#0077b6');g.addColorStop(1,'#00b4d8'); ctx.save();ctx.fillStyle=g;ctx.fillRect(0,0,w,h);ctx.clearRect(b,b,w-b*2,h-b*2);ctx.restore(); }
function drawNeon(ctx,w,h){ const b=Math.round(w*0.04); ctx.save();ctx.fillStyle='#0b0d14';ctx.fillRect(0,0,w,h);ctx.clearRect(b,b,w-b*2,h-b*2);ctx.shadowColor='#7c5cfc';ctx.shadowBlur=18;ctx.strokeStyle='#7c5cfc';ctx.lineWidth=3;ctx.strokeRect(b,b,w-b*2,h-b*2);ctx.shadowColor='#c56cfc';ctx.shadowBlur=24;ctx.strokeStyle='#c56cfc';ctx.lineWidth=1.5;ctx.strokeRect(b+4,b+4,w-b*2-8,h-b*2-8);ctx.shadowBlur=0;ctx.restore(); }
function drawMinimal(ctx,w,h){ const b=Math.round(w*0.04); ctx.save();ctx.fillStyle='rgba(24,25,31,0.92)';ctx.fillRect(0,0,w,h);ctx.clearRect(b,b,w-b*2,h-b*2);ctx.strokeStyle='rgba(255,255,255,0.3)';ctx.lineWidth=1;ctx.strokeRect(b,b,w-b*2,h-b*2);ctx.restore(); }
function drawForest(ctx,w,h){ const b=Math.round(w*0.04),g=ctx.createLinearGradient(0,0,w,h); g.addColorStop(0,'#134e25');g.addColorStop(1,'#45e0a0'); ctx.save();ctx.fillStyle=g;ctx.fillRect(0,0,w,h);ctx.clearRect(b,b,w-b*2,h-b*2);ctx.restore(); }
function drawVintage(ctx,w,h){ const b=Math.round(w*0.05),g=ctx.createRadialGradient(w/2,h/2,0,w/2,h/2,w*0.7); g.addColorStop(0,'#c9a95c');g.addColorStop(1,'#5c3b18'); ctx.save();ctx.fillStyle=g;ctx.fillRect(0,0,w,h);ctx.clearRect(b,b,w-b*2,h-b*2);ctx.restore(); }

/* ── MAIN RENDER ── */
function render(targetCanvas, addWatermark, useOriginal){
  const w = targetCanvas.width, h = targetCanvas.height;
  const ctx = targetCanvas.getContext('2d');
  const bpt = getBorderPct(selectedTpl);
  const b = Math.round(w * bpt);
  ctx.clearRect(0,0,w,h);

  // 1. Apply crop + filters to photo area
  if(uploadedImg){
    const cr = cropRect;
    const iw = uploadedImg.naturalWidth || uploadedImg.width;
    const ih = uploadedImg.naturalHeight || uploadedImg.height;
    const rw = w-b*2, rh = h-b*2;

    ctx.save();
    if(F.corners > 0){
      roundedClip(ctx, b, b, rw, rh, Math.round(Math.min(rw,rh)*F.corners/100*0.4));
    } else {
      ctx.beginPath(); ctx.rect(b,b,rw,rh); ctx.clip();
    }

    // Apply CSS filter to context
    if(!useOriginal){
      const blur = F.blur > 0 ? `blur(${F.blur}px)` : '';
      ctx.filter = `brightness(${F.brightness}%) contrast(${F.contrast}%) saturate(${F.saturation}%) grayscale(${F.grayscale}%) sepia(${F.sepia}%) ${blur}`.trim();
    }

    // Draw cropped image
    const sx = iw * cr.x, sy = ih * cr.y;
    const sw = iw * cr.w, sh = ih * cr.h;
    ctx.drawImage(uploadedImg, sx, sy, sw, sh, b, b, rw, rh);
    ctx.filter = 'none';
    ctx.restore();

    // Vignette
    if(!useOriginal && F.vignette > 0){
      ctx.save();
      ctx.beginPath(); ctx.rect(b,b,rw,rh); ctx.clip();
      const vg = ctx.createRadialGradient(w/2,h/2,Math.min(rw,rh)*0.3,w/2,h/2,Math.max(rw,rh)*0.75);
      vg.addColorStop(0,'transparent');
      vg.addColorStop(1,`rgba(0,0,0,${F.vignette/100*0.8})`);
      ctx.fillStyle=vg; ctx.fillRect(b,b,rw,rh);
      ctx.restore();
    }
  } else {
    ctx.fillStyle='#1a1d2b'; ctx.fillRect(b,b,w-b*2,h-b*2);
    ctx.fillStyle='rgba(255,255,255,0.08)'; ctx.font=`${Math.round(w*0.045)}px Inter,sans-serif`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('Upload an image to begin', w/2, h/2);
  }

  // 2. Template frame overlay
  const off = document.createElement('canvas'); off.width=w; off.height=h;
  TEMPLATES[selectedTpl].draw(off.getContext('2d'),w,h);
  ctx.drawImage(off,0,0);

  // 3. Text layers
  if(!useOriginal){
    textLayers.forEach(tl => drawTextLayer(ctx,w,h,tl,b));
  }

  // 4. Watermark
  if(addWatermark) drawWatermark(ctx,w,h);
}

function roundedClip(ctx,x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y);
  ctx.closePath(); ctx.clip();
}

function drawTextLayer(ctx,w,h,tl,b){
  if(!tl.text && !tl.sub) return;
  const pad = Math.round(w*0.05);
  let tx, ty, ha;
  if(tl.useXY){ tx=tl.x; ty=tl.y; ha='left'; }
  else { [ty,ha] = getAlign(tl.pos,pad,w,h,tl.size); tx = ha==='left'?pad:ha==='right'?w-pad:w/2; }
  ctx.save();
  ctx.globalAlpha = tl.opacity/100;
  ctx.shadowColor='rgba(0,0,0,0.7)'; ctx.shadowBlur=7;
  ctx.font=`bold ${tl.size}px ${tl.font}`; ctx.fillStyle=tl.color; ctx.textAlign=ha; ctx.textBaseline='alphabetic';
  ctx.fillText(tl.text, tx, ty);
  if(tl.sub){
    ctx.font=`${Math.round(tl.size*0.6)}px ${tl.font}`; ctx.globalAlpha=(tl.opacity/100)*0.75;
    ctx.fillText(tl.sub, tx, ty+tl.size*1.1);
  }
  ctx.restore();
}

function drawWatermark(ctx,w,h){
  ctx.save(); ctx.globalAlpha=0.2; ctx.fillStyle='#fff';
  for(let y=-h;y<h*2;y+=Math.round(h*0.22))
    for(let x=-w;x<w*2;x+=Math.round(w*0.35)){
      ctx.save(); ctx.translate(x,y); ctx.rotate(-Math.PI/6);
      ctx.font=`bold ${Math.round(w*0.038)}px Inter,sans-serif`; ctx.fillText('© CanvasFlow',0,0); ctx.restore();
    }
  ctx.restore();
  ctx.save(); ctx.fillStyle='rgba(0,0,0,0.55)'; ctx.fillRect(0,h-34,w,34);
  ctx.fillStyle='rgba(255,255,255,0.7)'; ctx.font=`600 ${Math.round(w*0.02)}px Inter,sans-serif`;
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('💧 WATERMARKED PREVIEW — canvasflow.demo',w/2,h-17); ctx.restore();
}

function getAlign(pos,pad,w,h,fs){
  const t={top:pad+fs,mid:h/2,bot:h-pad-fs*1.3};
  const map={'top-left':[t.top,'left'],'top-center':[t.top,'center'],'top-right':[t.top,'right'],
    'mid-left':[t.mid,'left'],'mid-center':[t.mid,'center'],'mid-right':[t.mid,'right'],
    'bot-left':[t.bot,'left'],'bot-center':[t.bot,'center'],'bot-right':[t.bot,'right']};
  return map[pos]||[t.bot,'left'];
}

/* ── EDITOR CANVAS ── */
function getEditorCanvas(){
  // Step 2 uses filterCanvas, step 3 uses editorCanvas
  if(currentStep === 2){
    const fc = document.getElementById('filterCanvas');
    if(fc) return fc;
  }
  return document.getElementById('editorCanvas');
}

function renderEditor(){
  const c = getEditorCanvas(); if(!c) return;
  const p = PRESETS[activePreset];
  if(c.dataset.preset !== activePreset+''){
    c.width = p.w; c.height = p.h; c.dataset.preset = activePreset;
  }
  render(c, false, showOriginal);
  if(cropMode) drawCropOverlay(c);
}

function renderPreview(){
  const c = document.getElementById('previewCanvas'); if(!c) return;
  const w = PRESETS[activePreset].w, h = PRESETS[activePreset].h;
  c.width=w; c.height=h;
  render(c, !showOriginal, showOriginal);
  // Summary
  const tl = textLayers[activeTL]||{};
  el('sumTemplate').textContent = TEMPLATES[selectedTpl].name;
  el('sumCaption').textContent   = (tl.text||'').slice(0,18)||'—';
  el('sumLayers').textContent    = textLayers.length;
  el('sumPreset').textContent    = PRESETS[activePreset].name;
  el('sumSize').textContent      = `${w}×${h}`;
}

/* ── CROP ── */
function drawCropOverlay(c){
  const ctx=c.getContext('2d'),w=c.width,h=c.height;
  const bpt=getBorderPct(selectedTpl),b=Math.round(w*bpt);
  const rw=w-b*2,rh=h-b*2;
  const cx=b+cropRect.x*rw,cy=b+cropRect.y*rh;
  const cw=cropRect.w*rw,ch=cropRect.h*rh;
  ctx.save();
  ctx.fillStyle='rgba(0,0,0,0.5)';
  ctx.fillRect(b,b,rw,rh);
  ctx.clearRect(cx,cy,cw,ch);
  ctx.strokeStyle='#7c5cfc'; ctx.lineWidth=2; ctx.setLineDash([6,3]);
  ctx.strokeRect(cx,cy,cw,ch); ctx.setLineDash([]);
  // Grid lines
  ctx.strokeStyle='rgba(255,255,255,0.3)'; ctx.lineWidth=1;
  ctx.beginPath();
  ctx.moveTo(cx+cw/3,cy);ctx.lineTo(cx+cw/3,cy+ch);
  ctx.moveTo(cx+cw*2/3,cy);ctx.lineTo(cx+cw*2/3,cy+ch);
  ctx.moveTo(cx,cy+ch/3);ctx.lineTo(cx+cw,cy+ch/3);
  ctx.moveTo(cx,cy+ch*2/3);ctx.lineTo(cx+cw,cy+ch*2/3);
  ctx.stroke();
  // Handles
  const hs=8;
  [[cx,cy],[cx+cw,cy],[cx,cy+ch],[cx+cw,cy+ch],
   [cx+cw/2,cy],[cx+cw/2,cy+ch],[cx,cy+ch/2],[cx+cw,cy+ch/2]].forEach(([hx,hy])=>{
    ctx.fillStyle='#fff'; ctx.fillRect(hx-hs/2,hy-hs/2,hs,hs);
    ctx.strokeStyle='#7c5cfc'; ctx.lineWidth=1.5; ctx.strokeRect(hx-hs/2,hy-hs/2,hs,hs);
  });
  ctx.restore();
}

function initCropEvents(){
  const c = document.getElementById('filterCanvas'); if(!c) return;
  c.removeEventListener('mousedown', onDown);
  c.removeEventListener('mousemove', onMove);
  c.removeEventListener('mouseup',   onUp);
  c.addEventListener('mousedown', onDown);
  c.addEventListener('mousemove', onMove);
  c.addEventListener('mouseup',   onUp);
  c.addEventListener('mouseleave',onUp);
}

/* Canvas mouse events for crop + text drag */
function initCanvasEvents(){
  const c=getEditorCanvas(); if(!c) return;
  c.addEventListener('mousedown',onDown);
  c.addEventListener('mousemove',onMove);
  c.addEventListener('mouseup',onUp);
  c.addEventListener('mouseleave',onUp);
  c.addEventListener('touchstart',e=>{const t=e.touches[0];onDown({offsetX:t.clientX-c.getBoundingClientRect().left,offsetY:t.clientY-c.getBoundingClientRect().top,buttons:1});},{passive:true});
  c.addEventListener('touchmove',e=>{e.preventDefault();const t=e.touches[0];onMove({offsetX:t.clientX-c.getBoundingClientRect().left,offsetY:t.clientY-c.getBoundingClientRect().top,buttons:1});},{passive:false});
  c.addEventListener('touchend',onUp,{passive:true});
}

function toNorm(c,ox,oy){
  const bpt=getBorderPct(selectedTpl),b=Math.round(c.width*bpt);
  const rw=c.width-b*2,rh=c.height-b*2;
  return {nx:(ox-b)/rw,ny:(oy-b)/rh};
}

function onDown(e){
  const c=getEditorCanvas(); if(!c||e.buttons!==1) return;
  const sx=c.clientWidth, sy=c.clientHeight;
  const ox=e.offsetX*(c.width/sx), oy=e.offsetY*(c.height/sy);
  if(cropMode){ startCropDrag(c,ox,oy); return; }
  // Drag active text layer
  const tl=textLayers[activeTL]; if(!tl) return;
  tl.useXY=true; tl.x=ox; tl.y=oy;
  renderEditor();
}
function onMove(e){
  if(!cropMode && !cropDrag) { /* text drag handled in onDown */ return; }
  const c=getEditorCanvas(); if(!c) return;
  const sx=c.clientWidth,sy=c.clientHeight;
  const ox=e.offsetX*(c.width/sx),oy=e.offsetY*(c.height/sy);
  if(cropMode&&cropDrag){ doCropDrag(c,ox,oy); }
  else if(!cropMode){
    const tl=textLayers[activeTL]; if(!tl||!tl.useXY) return;
    tl.x=ox; tl.y=oy; renderEditor();
  }
}
function onUp(){ cropDrag=null; }

function startCropDrag(c,ox,oy){
  const bpt=getBorderPct(selectedTpl),b=Math.round(c.width*bpt);
  const rw=c.width-b*2,rh=c.height-b*2;
  const cx=b+cropRect.x*rw,cy=b+cropRect.y*rh,cw=cropRect.w*rw,ch=cropRect.h*rh;
  // Check handles
  const hs=14;
  const handles=[
    {name:'tl',hx:cx,hy:cy},{name:'tr',hx:cx+cw,hy:cy},
    {name:'bl',hx:cx,hy:cy+ch},{name:'br',hx:cx+cw,hy:cy+ch},
    {name:'t',hx:cx+cw/2,hy:cy},{name:'b',hx:cx+cw/2,hy:cy+ch},
    {name:'l',hx:cx,hy:cy+ch/2},{name:'r',hx:cx+cw,hy:cy+ch/2},
  ];
  for(const hd of handles){
    if(Math.abs(ox-hd.hx)<hs&&Math.abs(oy-hd.hy)<hs){ cropDrag={type:hd.name,startX:ox,startY:oy,initRect:{...cropRect}}; return; }
  }
  if(ox>cx&&ox<cx+cw&&oy>cy&&oy<cy+ch) cropDrag={type:'move',startX:ox,startY:oy,initRect:{...cropRect}};
}

function doCropDrag(c,ox,oy){
  if(!cropDrag) return;
  const bpt=getBorderPct(selectedTpl),b=Math.round(c.width*bpt);
  const rw=c.width-b*2,rh=c.height-b*2;
  const dx=(ox-cropDrag.startX)/rw, dy=(oy-cropDrag.startY)/rh;
  const ir=cropDrag.initRect;
  const t=cropDrag.type;
  let {x,y,w,h}={...ir};
  if(t==='move'){ x=Math.max(0,Math.min(1-ir.w,ir.x+dx)); y=Math.max(0,Math.min(1-ir.h,ir.y+dy)); }
  else if(t==='tl'){ x=Math.min(ir.x+ir.w-0.05,ir.x+dx); w=ir.w-dx; y=Math.min(ir.y+ir.h-0.05,ir.y+dy); h=ir.h-dy; }
  else if(t==='tr'){ w=Math.max(0.05,ir.w+dx); y=Math.min(ir.y+ir.h-0.05,ir.y+dy); h=ir.h-dy; }
  else if(t==='bl'){ x=Math.min(ir.x+ir.w-0.05,ir.x+dx); w=ir.w-dx; h=Math.max(0.05,ir.h+dy); }
  else if(t==='br'){ w=Math.max(0.05,ir.w+dx); h=Math.max(0.05,ir.h+dy); }
  else if(t==='t'){ y=Math.min(ir.y+ir.h-0.05,ir.y+dy); h=ir.h-dy; }
  else if(t==='b'){ h=Math.max(0.05,ir.h+dy); }
  else if(t==='l'){ x=Math.min(ir.x+ir.w-0.05,ir.x+dx); w=ir.w-dx; }
  else if(t==='r'){ w=Math.max(0.05,ir.w+dx); }
  // Clamp
  x=Math.max(0,x); y=Math.max(0,y);
  w=Math.min(1-x,Math.max(0.05,w)); h=Math.min(1-y,Math.max(0.05,h));
  cropRect={x,y,w,h};
  renderEditor();
}

/* ── UNDO / REDO ── */
function saveHistory(){
  const state=JSON.stringify({textLayers,F:{...F},selectedTpl,cropRect:{...cropRect},activePreset});
  history=history.slice(0,historyIdx+1);
  history.push(state); if(history.length>30) history.shift();
  historyIdx=history.length-1;
  updateUndoButtons();
}
function undo(){ if(historyIdx<=0) return; historyIdx--; loadHistory(); }
function redo(){ if(historyIdx>=history.length-1) return; historyIdx++; loadHistory(); }
function loadHistory(){
  const s=JSON.parse(history[historyIdx]);
  Object.assign(F,s.F); selectedTpl=s.selectedTpl; activePreset=s.activePreset;
  cropRect=s.cropRect; textLayers=s.textLayers; activeTL=Math.min(activeTL,textLayers.length-1);
  syncFiltersUI(); syncTLUI(); renderEditor(); updateUndoButtons();
}
function updateUndoButtons(){
  const u=document.getElementById('btn-undo'),r=document.getElementById('btn-redo');
  if(u) u.disabled=historyIdx<=0; if(r) r.disabled=historyIdx>=history.length-1;
}

/* ── TEXT LAYERS ── */
let tlIdCtr=2;
function addTextLayer(){
  const tl={id:tlIdCtr++,text:'New Text',sub:'',color:'#ffffff',size:24,font:'Georgia, serif',opacity:100,pos:'mid-center',x:0,y:0,useXY:false};
  textLayers.push(tl); activeTL=textLayers.length-1;
  syncTLUI(); loadActiveTL(); saveHistory(); renderEditor();
}
function removeTextLayer(idx){
  if(textLayers.length<=1){showToast('Need at least one layer');return;}
  textLayers.splice(idx,1); activeTL=Math.max(0,Math.min(activeTL,textLayers.length-1));
  syncTLUI(); loadActiveTL(); saveHistory(); renderEditor();
}
function selectTL(idx){ activeTL=idx; syncTLUI(); loadActiveTL(); }

function syncTLUI(){
  const list=document.getElementById('tlList'); if(!list) return;
  list.innerHTML='';
  textLayers.forEach((tl,i)=>{
    const d=document.createElement('div');
    d.className='tl-item'+(i===activeTL?' active':'');
    d.innerHTML=`<span class="tl-label">${tl.text||'(empty)'}</span><button class="tl-del btn" onclick="event.stopPropagation();removeTextLayer(${i})">✕</button>`;
    d.onclick=()=>selectTL(i); list.appendChild(d);
  });
}

function loadActiveTL(){
  const tl=textLayers[activeTL]; if(!tl) return;
  setVal('txtMain',tl.text); setVal('txtSub',tl.sub);
  setVal('fontFamily',tl.font); setVal('fontSize',tl.size);
  setVal('sizeVal',tl.size); setVal('textOpacity',tl.opacity);
  setVal('opacityVal',tl.opacity); textColor=tl.color;
  setVal('customColor',tl.color);
  document.querySelectorAll('.cs').forEach(s=>{ s.classList.toggle('active',s.dataset.color===tl.color); });
  if(!tl.useXY) setPosFromStr(tl.pos);
}

function saveTLField(){
  const tl=textLayers[activeTL]; if(!tl) return;
  tl.text=getVal('txtMain'); tl.sub=getVal('txtSub');
  tl.font=getVal('fontFamily'); tl.size=parseInt(getVal('fontSize'));
  tl.opacity=parseInt(getVal('textOpacity'));
  tl.color=textColor;
}

/* ── FILTER SYNC ── */
function syncFiltersUI(){
  ['brightness','contrast','saturation','blur','grayscale','sepia','vignette','corners'].forEach(k=>{
    const el=document.getElementById('f_'+k); if(el){el.value=F[k];}
    const lbl=document.getElementById('fl_'+k); if(lbl){lbl.textContent=F[k];}
  });
}
function setFilter(k,v){ F[k]=parseFloat(v); renderEditor(); }

/* ── UPLOAD ── */
function loadFile(file){
  const url=URL.createObjectURL(file);
  uploadedImg=new Image();
  uploadedImg.onload=()=>{
    el('previewThumb').src=url;
    el('previewName').textContent=file.name;
    el('previewSize').textContent=(file.size/1024).toFixed(1)+' KB';
    el('upw').classList.add('show');
    cropRect={x:0,y:0,w:1,h:1}; // reset crop
    saveHistory(); showToast('✓ Image loaded!');
  };
  uploadedImg.src=url;
}
function removeImage(){
  uploadedImg=null; el('fileInput').value='';
  el('upw').classList.remove('show'); renderEditor();
}

/* ── STEP NAV ── */
function gotoStep(n){
  if(n>0&&!uploadedImg){showToast('Please upload an image first!');return;}
  currentStep=n;
  document.querySelectorAll('.panel').forEach((p,i)=>p.classList.toggle('active',i===n));
  updateStepper();
  if(n===1) buildTemplateGrid();
  if(n===2) buildPresetsUI(); // preset row is also on step 3; build here for filter canvas
  if(n===2) setTimeout(()=>{ const fc=document.getElementById('filterCanvas'); if(fc){fc.width=PRESETS[activePreset].w;fc.height=PRESETS[activePreset].h;} renderEditor(); initCropEvents(); }, 60);
  if(n===3){ setTimeout(()=>{buildPresetsUI();syncTLUI();loadActiveTL();initCanvasEvents();renderEditor();},60); }
  if(n===4){ setTimeout(renderPreview,80); }
  window.scrollTo({top:120,behavior:'smooth'});
}
function jumpTo(n){ if(n>currentStep&&!uploadedImg&&n>0){showToast('Upload image first');return;} gotoStep(n); }

function updateStepper(){
  for(let i=0;i<5;i++){
    const si=document.getElementById('si-'+i),sn=document.getElementById('sn-'+i);
    if(!si) continue;
    si.className='si'+(i===currentStep?' active':i<currentStep?' done':'');
    sn.textContent=i<currentStep?'✓':i+1;
    const sl=document.getElementById('sl-'+i); if(sl) sl.className='sline'+(i<currentStep?' done':'');
  }
}

/* ── TEMPLATES ── */
function buildTemplateGrid(){
  const grid=document.getElementById('tgrid'); grid.innerHTML='';
  TEMPLATES.forEach((tpl,i)=>{
    const c=document.createElement('canvas'); c.width=240;c.height=180;
    tpl.draw(c.getContext('2d'),240,180);
    // Draw a placeholder image in thumbnail
    if(uploadedImg){ const cx=c.getContext('2d'); cx.drawImage(uploadedImg,12,9,216,162); tpl.draw(cx,240,180); }
    const card=document.createElement('div'); card.className='tc'+(i===selectedTpl?' sel':'');
    card.innerHTML=`<div class="tck">✓</div><div class="tn">${tpl.name}</div>`;
    card.insertBefore(c,card.firstChild);
    card.onclick=()=>{selectedTpl=i;document.querySelectorAll('.tc').forEach((el,j)=>el.classList.toggle('sel',j===i));};
    grid.appendChild(card);
  });
}

/* ── PRESETS ── */
function buildPresetsUI(){
  const row=document.getElementById('presetRow'); if(!row) return;
  row.innerHTML='';
  PRESETS.forEach((p,i)=>{
    const b=document.createElement('button'); b.className='pb'+(i===activePreset?' active':'');
    b.textContent=p.name+(p.w!==p.h?` (${p.w}×${p.h})`:'');
    b.onclick=()=>{activePreset=i;document.querySelectorAll('.pb').forEach((el,j)=>el.classList.toggle('active',j===i));applyPreset();};
    row.appendChild(b);
  });
  applyPreset();
}

function applyPreset(){
  const p=PRESETS[activePreset];
  const c=getEditorCanvas(); if(!c) return;
  c.width=p.w; c.height=p.h; renderEditor();
}

/* ── DOWNLOAD & COPY ── */
function downloadImage(fmt='png'){
  const p=PRESETS[activePreset];
  const off=document.createElement('canvas'); off.width=p.w; off.height=p.h;
  render(off,true,false);
  const mime=fmt==='jpg'?'image/jpeg':'image/png';
  const q=fmt==='jpg'?parseFloat(getVal('exportQuality'))/100:1;
  const link=document.createElement('a');
  link.download=`canvasflow-preview.${fmt}`;
  link.href=off.toDataURL(mime,q); link.click();
  showToast('⬇️ Downloading...');
}

function copyToClipboard(){
  const p=PRESETS[activePreset];
  const off=document.createElement('canvas'); off.width=p.w; off.height=p.h;
  render(off,true,false);
  off.toBlob(blob=>{
    navigator.clipboard.write([new ClipboardItem({'image/png':blob})]).then(()=>showToast('📋 Copied!')).catch(()=>showToast('Copy failed — try download'));
  });
}

/* ── BEFORE/AFTER ── */
function toggleBA(){
  showOriginal=!showOriginal;
  const btn=document.getElementById('baBtn');
  if(btn) btn.textContent=showOriginal?'▶ Show Edited':'👁 Before/After';
  renderPreview();
}

/* ── CROP CONTROLS ── */
function toggleCrop(){
  cropMode=!cropMode;
  const btn=document.getElementById('cropBtn');
  if(btn){ btn.textContent=cropMode?'✓ Apply Crop':'✂️ Crop Photo'; btn.className=cropMode?'btn btn-ok btn-sm':'btn btn-s btn-sm'; }
  if(!cropMode) saveHistory();
  renderEditor();
}
function resetCrop(){ cropRect={x:0,y:0,w:1,h:1}; renderEditor(); }

/* ── TEXT COLOR ── */
function setColor(elmt){
  document.querySelectorAll('.cs').forEach(s=>s.classList.remove('active'));
  elmt.classList.add('active'); textColor=elmt.dataset.color;
  setVal('customColor',textColor); saveTLField(); renderEditor();
}
function customColorChange(elmt){ textColor=elmt.value; document.querySelectorAll('.cs').forEach(s=>s.classList.remove('active')); saveTLField(); renderEditor(); }

/* ── POS BUTTONS ── */
function setPosBtn(el,pos){
  document.querySelectorAll('.pbtn').forEach(b=>b.classList.remove('active'));
  el.classList.add('active'); textPos=pos;
  const tl=textLayers[activeTL]; if(tl){tl.pos=pos;tl.useXY=false;} saveTLField(); renderEditor();
}
function setPosFromStr(pos){ textPos=pos; const idx={'top-left':0,'top-center':1,'top-right':2,'mid-left':3,'mid-center':4,'mid-right':5,'bot-left':6,'bot-center':7,'bot-right':8}[pos]||6; document.querySelectorAll('.pbtn').forEach((b,i)=>b.classList.toggle('active',i===idx)); }

/* ── HELPERS ── */
const el=id=>document.getElementById(id);
const getVal=id=>{const e=el(id);return e?e.value:'';};
const setVal=(id,v)=>{const e=el(id);if(e)e.value=v;};
let toastTimer;
function showToast(msg){ const t=el('toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.classList.remove('show'),2600); }

/* ── KEYBOARD ── */
document.addEventListener('keydown',e=>{
  if((e.ctrlKey||e.metaKey)&&e.key==='z'){e.preventDefault();undo();}
  if((e.ctrlKey||e.metaKey)&&(e.key==='y'||(e.shiftKey&&e.key==='z'))){e.preventDefault();redo();}
});

/* ── INIT ── */
document.addEventListener('DOMContentLoaded',()=>{
  const fi=el('fileInput'); if(fi) fi.addEventListener('change',e=>{if(e.target.files[0])loadFile(e.target.files[0]);});
  const uz=el('uploadZone');
  if(uz){
    uz.addEventListener('dragover',e=>{e.preventDefault();uz.classList.add('dv');});
    uz.addEventListener('dragleave',()=>uz.classList.remove('dv'));
    uz.addEventListener('drop',e=>{e.preventDefault();uz.classList.remove('dv');const f=e.dataTransfer.files[0];if(f&&f.type.startsWith('image/'))loadFile(f);});
  }
  // Filter inputs
  ['brightness','contrast','saturation','blur','grayscale','sepia','vignette','corners'].forEach(k=>{
    const inp=el('f_'+k); if(!inp) return;
    inp.addEventListener('input',()=>{F[k]=parseFloat(inp.value);const lbl=el('fl_'+k);if(lbl)lbl.textContent=inp.value;renderEditor();});
  });
  // Text inputs
  ['txtMain','txtSub','fontFamily','fontSize','textOpacity'].forEach(id=>{
    const inp=el(id); if(!inp) return;
    inp.addEventListener('input',()=>{
      if(id==='fontSize'){setVal('sizeVal',inp.value);}
      if(id==='textOpacity'){setVal('opacityVal',inp.value);}
      saveTLField(); renderEditor();
    });
  });
  // Export format toggle
  const efmt=el('exportFmt');
  if(efmt) efmt.addEventListener('change',()=>{const qw=el('qualityWrap');if(qw)qw.style.display=efmt.value==='jpg'?'block':'none';});
  saveHistory();
});
