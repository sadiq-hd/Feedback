/* ═══════════════════════════════════════════════════
   STATION.JS
   ═══════════════════════════════════════════════════ */
const SAT_OPTS = [
  { v:5, emoji:'😍', lbl:'Love it'          },
  { v:4, emoji:'😊', lbl:'Satisfied'        },
  { v:3, emoji:'😐', lbl:'Neutral'          },
  { v:2, emoji:'😕', lbl:'Unsatisfied'      },
  { v:1, emoji:'😤', lbl:'Very Unsatisfied' },
];
const EMOJI_MAP = Object.fromEntries(SAT_OPTS.map(o => [o.v, o.emoji]));

class Station {
  constructor(el, id) {
    this.el = el; this.id = id;
    this.qIndex = 0; this.answers = {}; this.selected = null; this.resetTmr = null;
    this._build(); this._bindAttract(); this._initStaBg();
  }

  _build() {
    this.el.innerHTML = `
      <canvas class="sta-canvas" id="stabg-${this.id}"></canvas>

      <div class="attract" id="att-${this.id}">
        <div class="a-rings">
          <div class="a-ring-o"></div><div class="a-ring-i"></div>
          <div class="a-icon-wrap"><span class="a-tap">👆</span></div>
        </div>
        <div class="a-title">Share Your Feedback</div>
        <div class="a-sub">✦ Tap anywhere to begin ✦</div>
      </div>

      <div class="feedback-screen" id="fb-${this.id}">

        <!-- TOP: progress dots (left) + Cancel (right) -->
        <div class="fb-toprow">
          <div class="prog-dots" id="dots-${this.id}"></div>
          <button class="btn-cancel" id="cancel-${this.id}">✕ Cancel</button>
        </div>

        <div class="q-card" id="qcard-${this.id}">
          <div class="q-label" id="qlbl-${this.id}"></div>
          <div class="q-text"  id="qtxt-${this.id}"></div>
        </div>

        <div class="emoji-bar" id="ebar-${this.id}"></div>

        <div class="comment-wrap" id="cwrap-${this.id}">
          <label class="cmt-lbl">Additional comments <span style="opacity:.5;font-weight:400">(optional)</span></label>
          <textarea class="cmt-ta" id="cta-${this.id}" placeholder="Feel free to share more…"></textarea>
        </div>

        <!-- BOTTOM: Back (left) + Next/Submit (right) -->
        <div class="btn-row">
          <button class="btn-back" id="back-${this.id}" disabled>← Back</button>
          <button class="btn-action next-btn" id="btn-${this.id}" disabled>
            Next <span class="btn-icon">→</span>
          </button>
        </div>

      </div>

      <div class="thankyou-screen" id="ty-${this.id}">
        <div class="ty-ring"><span class="ty-icon">✓</span></div>
        <div class="ty-title">Thank You!</div>
        <div class="ty-sub">Your feedback has been recorded. We truly appreciate your time.</div>
        <div class="ty-bar-bg"><div class="ty-bar-fill" id="tyfill-${this.id}"></div></div>
        <div class="ty-hint">Returning shortly…</div>
      </div>
    `;
    this._buildBar(); this._renderQ(); this._bindCancel();
  }

  _buildBar() {
    const bar = document.getElementById(`ebar-${this.id}`);
    bar.innerHTML = SAT_OPTS.map(o => `
      <div class="e-opt" data-v="${o.v}">
        <span class="e-emoji">${o.emoji}</span>
        <span class="e-lbl">${o.lbl}</span>
      </div>`).join('');
    bar.querySelectorAll('.e-opt').forEach(o => {
      const pick = () => this._pick(parseInt(o.dataset.v), o);
      o.addEventListener('click', pick);
      o.addEventListener('touchstart', pick, { passive: true });
    });
  }

  _renderQ() {
    const q = QUESTIONS[this.qIndex];
    const isLast = this.qIndex === QUESTIONS.length - 1;

    // dots
    document.getElementById(`dots-${this.id}`).innerHTML =
      QUESTIONS.map((_,i) => `<div class="p-dot${i<this.qIndex?' done':i===this.qIndex?' curr':''}"></div>`).join('');

    document.getElementById(`qlbl-${this.id}`).textContent = `Question ${this.qIndex+1} of ${QUESTIONS.length}`;
    document.getElementById(`qtxt-${this.id}`).textContent = q.text;

    // restore prev selection
    const prev = this.answers[q.id];
    document.getElementById(`ebar-${this.id}`)
      .querySelectorAll('.e-opt').forEach(o => {
        o.classList.remove('sel');
        if (prev && parseInt(o.dataset.v) === prev.rating) o.classList.add('sel');
      });
    this.selected = prev ? prev.rating : null;

    // comment box
    const cw = document.getElementById(`cwrap-${this.id}`);
    cw.classList.toggle('visible', isLast);
    const ta = document.getElementById(`cta-${this.id}`);
    if (ta) ta.value = isLast && prev?.comment ? prev.comment : '';

    // back btn — clone to clear listeners
    const ob = document.getElementById(`back-${this.id}`);
    const nb = ob.cloneNode(true); ob.parentNode.replaceChild(nb, ob);
    nb.disabled = this.qIndex === 0;
    nb.addEventListener('click',      () => this._goBack());
    nb.addEventListener('touchstart', () => this._goBack(), { passive: true });

    // action btn — clone to clear listeners
    const oa = document.getElementById(`btn-${this.id}`);
    const na = oa.cloneNode(true); oa.parentNode.replaceChild(na, oa);
    na.disabled  = this.selected === null;
    na.className = `btn-action ${isLast ? 'sub-btn' : 'next-btn'}`;
    na.innerHTML = isLast ? `Submit <span class="btn-icon">✓</span>` : `Next <span class="btn-icon">→</span>`;
    na.addEventListener('click', () => this._advance());
  }

  _pick(val, el) {
    document.getElementById(`ebar-${this.id}`).querySelectorAll('.e-opt').forEach(o => o.classList.remove('sel'));
    el.classList.add('sel');
    this.selected = val;
    document.getElementById(`btn-${this.id}`).disabled = false;
    if (navigator.vibrate) navigator.vibrate(22);
  }

  _goBack() {
    if (this.qIndex === 0) return;
    const q = QUESTIONS[this.qIndex];
    if (this.selected !== null) {
      this.answers[q.id] = { questionId:q.id, questionText:q.text, rating:this.selected,
        ratingLabel:SAT_OPTS.find(o=>o.v===this.selected)?.lbl||'', comment:'' };
    }
    this.qIndex--; this.selected = null;
    this._animTrans('back');
  }

  _bindCancel() {
    const c = document.getElementById(`cancel-${this.id}`);
    const go = () => this._reset();
    c.addEventListener('click',      go);
    c.addEventListener('touchstart', go, { passive: true });
  }

  _advance() {
    if (this.selected === null) return;
    const q = QUESTIONS[this.qIndex];
    const isLast = this.qIndex === QUESTIONS.length - 1;
    const comment = isLast ? (document.getElementById(`cta-${this.id}`)?.value||'').trim() : '';
    this.answers[q.id] = { questionId:q.id, questionText:q.text, rating:this.selected,
      ratingLabel:SAT_OPTS.find(o=>o.v===this.selected)?.lbl||'', comment };
    if (isLast) { this._submit(); }
    else { this.qIndex++; this.selected = null; this._animTrans('forward'); }
  }

  _animTrans(dir) {
    const fb = document.getElementById(`fb-${this.id}`);
    fb.classList.add(dir==='forward' ? 'slide-out' : 'slide-out-r');
    setTimeout(() => {
      fb.classList.remove('slide-out','slide-out-r');
      this._renderQ();
      fb.classList.add('slide-in');
      setTimeout(() => fb.classList.remove('slide-in'), 360);
    }, 240);
  }

  _submit() {
    const response = {
      id: `FB-${this.id}-${Date.now()}`, station: this.id,
      timestamp: new Date().toISOString(),
      answers: QUESTIONS.map(q => this.answers[q.id] || { questionId:q.id, questionText:q.text, rating:null, ratingLabel:'', comment:'' }),
    };
    _save([..._load(), response]);
    updateTotalCount(); this._showTY();
  }

  _showTY() {
    document.getElementById(`fb-${this.id}`).classList.remove('active');
    const ty = document.getElementById(`ty-${this.id}`);
    const fill = document.getElementById(`tyfill-${this.id}`);
    ty.classList.add('active');
    fill.style.transition='none'; fill.style.width='100%';
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      fill.style.transition=`width ${CONFIG.RESET_DELAY}s linear`; fill.style.width='0%';
    }));
    clearTimeout(this.resetTmr);
    this.resetTmr = setTimeout(() => this._reset(), CONFIG.RESET_DELAY*1000);
  }

  _reset() {
    clearTimeout(this.resetTmr);
    this.qIndex=0; this.answers={}; this.selected=null;
    document.getElementById(`ty-${this.id}`).classList.remove('active');
    document.getElementById(`fb-${this.id}`).classList.remove('active');
    document.getElementById(`att-${this.id}`).classList.remove('hidden');
    this._renderQ();
  }

  _bindAttract() {
    const att = document.getElementById(`att-${this.id}`);
    const go = () => {
      att.classList.add('hidden');
      const fb = document.getElementById(`fb-${this.id}`);
      fb.classList.add('active'); this._renderQ();
    };
    att.addEventListener('click', go);
    att.addEventListener('touchstart', go, { passive: true });
  }

  /* ── STATION BG: particles + shapes + waves ── */
  _initStaBg() {
    const canvas = document.getElementById(`stabg-${this.id}`);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const COLS = ['#84BD00','#A9D17D','#50BFE7','#80D1EE','#B2DAC5','#DAEBC7'];
    const rnd = (a,b) => a+Math.random()*(b-a);
    let W,H,pts=[],shapes=[],waveOff=0;

    const resize = () => {
      W=canvas.offsetWidth; H=canvas.offsetHeight;
      canvas.width=W; canvas.height=H;
      pts = Array.from({length:Math.floor(W*H/7000)},()=>({
        x:rnd(0,W),y:rnd(0,H),r:rnd(2,6),vx:rnd(-0.16,0.16),vy:rnd(-0.13,0.13),
        col:COLS[Math.floor(Math.random()*COLS.length)],al:rnd(0.07,0.20),ph:rnd(0,Math.PI*2),sp:rnd(0.005,0.013),
      }));
      shapes = Array.from({length:7},()=>({
        x:rnd(0,W),y:rnd(0,H),type:['circle','diamond','tri'][Math.floor(Math.random()*3)],
        size:rnd(12,38),vx:rnd(-0.09,0.09),vy:rnd(-0.07,0.07),
        rot:rnd(0,Math.PI*2),rotV:rnd(-0.004,0.004),
        col:COLS[Math.floor(Math.random()*COLS.length)],al:rnd(0.04,0.10),
      }));
    };

    const drawShape = s => {
      ctx.save(); ctx.translate(s.x,s.y); ctx.rotate(s.rot);
      ctx.globalAlpha=s.al; ctx.strokeStyle=s.col; ctx.lineWidth=1.2;
      ctx.beginPath();
      if(s.type==='circle'){ctx.arc(0,0,s.size,0,Math.PI*2);}
      else if(s.type==='diamond'){ctx.moveTo(0,-s.size);ctx.lineTo(s.size*.6,0);ctx.lineTo(0,s.size);ctx.lineTo(-s.size*.6,0);ctx.closePath();}
      else{ctx.moveTo(0,-s.size);ctx.lineTo(s.size*.85,s.size*.5);ctx.lineTo(-s.size*.85,s.size*.5);ctx.closePath();}
      ctx.stroke(); ctx.restore();
    };

    const draw = () => {
      ctx.clearRect(0,0,W,H);
      const now=performance.now()*0.001; waveOff+=0.007;
      const g=ctx.createLinearGradient(0,0,W,H);
      g.addColorStop(0,'rgba(169,209,125,0.055)'); g.addColorStop(1,'rgba(224,244,251,0.045)');
      ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
      for(let w=0;w<3;w++){
        ctx.beginPath();
        const amp=9+w*4,freq=0.008+w*.003,spd=waveOff*(1+w*.4);
        ctx.moveTo(0,H*(.25+w*.18));
        for(let x=0;x<=W;x+=4) ctx.lineTo(x,H*(.25+w*.18)+Math.sin(x*freq+spd)*amp);
        ctx.strokeStyle=`rgba(132,189,0,${0.035-w*.009})`; ctx.lineWidth=1; ctx.stroke();
      }
      for(let i=0;i<pts.length;i++) for(let j=i+1;j<pts.length;j++){
        const dx=pts[i].x-pts[j].x,dy=pts[i].y-pts[j].y,d=Math.sqrt(dx*dx+dy*dy);
        if(d<95){ctx.beginPath();ctx.moveTo(pts[i].x,pts[i].y);ctx.lineTo(pts[j].x,pts[j].y);ctx.strokeStyle=`rgba(132,189,0,${0.036*(1-d/95)})`;ctx.lineWidth=0.6;ctx.stroke();}
      }
      pts.forEach(p=>{
        const b=Math.sin(now*p.sp*60+p.ph);
        ctx.beginPath();ctx.arc(p.x,p.y,p.r*(0.88+0.12*b),0,Math.PI*2);
        ctx.fillStyle=p.col+Math.round(p.al*(0.7+0.3*b)*255).toString(16).padStart(2,'0'); ctx.fill();
        p.x+=p.vx;p.y+=p.vy;
        if(p.x<-10)p.x=W+10;if(p.x>W+10)p.x=-10;if(p.y<-10)p.y=H+10;if(p.y>H+10)p.y=-10;
      });
      shapes.forEach(s=>{
        drawShape(s); s.x+=s.vx;s.y+=s.vy;s.rot+=s.rotV;
        if(s.x<-s.size)s.x=W+s.size;if(s.x>W+s.size)s.x=-s.size;
        if(s.y<-s.size)s.y=H+s.size;if(s.y>H+s.size)s.y=-s.size;
      });
      requestAnimationFrame(draw);
    };
    const ro=new ResizeObserver(resize); ro.observe(this.el); resize(); draw();
  }
}

/* ── STORAGE ── */
function _load(){try{return JSON.parse(localStorage.getItem('ric_fbk')||'[]');}catch{return[];}}
function _save(d){try{localStorage.setItem('ric_fbk',JSON.stringify(d));}catch{}}
function updateTotalCount(){const el=document.getElementById('totalCount');if(el)el.textContent=_load().length;}

/* ── GLOBAL BG ── */
function initBgCanvas(){
  const c=document.getElementById('bgCanvas');if(!c)return;
  const ctx=c.getContext('2d');let W,H,dpr;
  const resize=()=>{dpr=window.devicePixelRatio||1;W=innerWidth;H=innerHeight;c.width=W*dpr;c.height=H*dpr;c.style.width=W+'px';c.style.height=H+'px';ctx.setTransform(dpr,0,0,dpr,0,0);};
  const draw=()=>{ctx.clearRect(0,0,W,H);const g=ctx.createRadialGradient(W*.1,H*.05,0,W*.5,H*.5,Math.max(W,H)*.95);g.addColorStop(0,'rgba(169,209,125,0.07)');g.addColorStop(.5,'rgba(178,218,197,0.03)');g.addColorStop(1,'rgba(224,244,251,0.05)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);requestAnimationFrame(draw);};
  window.addEventListener('resize',resize);resize();draw();
}

/* ── CENTER BG ── */
function initCenterBg(){
  const c=document.getElementById('cBgCanvas');if(!c)return;
  const ctx=c.getContext('2d');const COLS=['#84BD00','#50BFE7','#A9D17D','#80D1EE','#B2DAC5'];const rnd=(a,b)=>a+Math.random()*(b-a);let W,H,pts=[];
  const resize=()=>{W=c.offsetWidth;H=c.offsetHeight;c.width=W;c.height=H;pts=Array.from({length:20},()=>({x:rnd(0,W),y:rnd(0,H),r:rnd(2,6),vx:rnd(-0.18,0.18),vy:rnd(-0.18,0.18),col:COLS[Math.floor(Math.random()*COLS.length)],al:rnd(0.08,0.22),}));};
  const draw=()=>{ctx.clearRect(0,0,W,H);pts.forEach(p=>{ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle=p.col+Math.round(p.al*255).toString(16).padStart(2,'0');ctx.fill();p.x+=p.vx;p.y+=p.vy;if(p.x<0||p.x>W)p.vx*=-1;if(p.y<0||p.y>H)p.vy*=-1;});requestAnimationFrame(draw);};
  const ro=new ResizeObserver(resize);ro.observe(c.parentElement);resize();draw();
}

/* ── CENTER PARTICLES ── */
function initCenterParticles(){
  const c=document.getElementById('pfParticles');if(!c)return;
  const ctx=c.getContext('2d');const COLS=['#84BD00','#50BFE7','#A9D17D','#DAEBC7'];const rnd=(a,b)=>a+Math.random()*(b-a);let W,H,pts=[];
  const resize=()=>{W=c.offsetWidth;H=c.offsetHeight;c.width=W;c.height=H;pts=Array.from({length:14},()=>({x:rnd(0,W),y:rnd(0,H),r:rnd(1.5,3.5),vx:rnd(-0.22,0.22),vy:rnd(-0.22,0.22),col:COLS[Math.floor(Math.random()*COLS.length)],al:rnd(0.1,0.3),ph:rnd(0,Math.PI*2),sp:rnd(0.003,0.009),}));};
  const draw=()=>{ctx.clearRect(0,0,W,H);const now=performance.now()*0.001;pts.forEach(p=>{const b=Math.sin(now*p.sp*60+p.ph);ctx.beginPath();ctx.arc(p.x,p.y,p.r*(0.85+0.15*b),0,Math.PI*2);ctx.fillStyle=p.col+Math.round(p.al*(0.6+0.4*b)*255).toString(16).padStart(2,'0');ctx.fill();p.x+=p.vx;p.y+=p.vy;if(p.x<0||p.x>W)p.vx*=-1;if(p.y<0||p.y>H)p.vy*=-1;});requestAnimationFrame(draw);};
  const ro=new ResizeObserver(resize);ro.observe(c.parentElement);resize();draw();
}

/* ── ADMIN TRIGGER + PIN ── */
function initAdminTrigger(){
  let cnt=0,tmr=null;const t=document.getElementById('secretTrigger');if(!t)return;
  t.addEventListener('click',()=>{cnt++;clearTimeout(tmr);tmr=setTimeout(()=>{cnt=0;},2200);if(cnt>=CONFIG.ADMIN_TAPS){cnt=0;openPinModal();}});
}
let pinEntry='';
function openPinModal(){pinEntry='';renderPinDots();buildPinGrid();document.getElementById('pinModal').classList.add('active');}
function closePinModal(){document.getElementById('pinModal').classList.remove('active');pinEntry='';renderPinDots();}
function buildPinGrid(){const keys=['1','2','3','4','5','6','7','8','9','ghost','0','⌫'];document.getElementById('pinGrid').innerHTML=keys.map(k=>{if(k==='ghost')return`<button class="p-key ghost" disabled></button>`;if(k==='⌫')return`<button class="p-key back" onclick="pinBack()">⌫</button>`;return`<button class="p-key" onclick="pinPress('${k}')">${k}</button>`;}).join('');}
function pinPress(d){if(pinEntry.length>=4)return;pinEntry+=d;renderPinDots();if(navigator.vibrate)navigator.vibrate(16);if(pinEntry.length===4){setTimeout(()=>{if(pinEntry===CONFIG.ADMIN_PIN){closePinModal();window.open('admin.html','_blank');}else{document.querySelectorAll('.pd').forEach(e=>{e.classList.add('err');setTimeout(()=>e.classList.remove('err'),400);});if(navigator.vibrate)navigator.vibrate([40,25,40]);setTimeout(()=>{pinEntry='';renderPinDots();},500);}},140);}}
function pinBack(){pinEntry=pinEntry.slice(0,-1);renderPinDots();}
function renderPinDots(){for(let i=0;i<4;i++){const d=document.getElementById(`pd${i}`);if(d)d.className='pd'+(i<pinEntry.length?' filled':'');}}