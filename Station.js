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

/* ════════════════════════════════════════
   STATION CLASS
════════════════════════════════════════ */
class Station {
  constructor(el, id) {
    this.el       = el;
    this.id       = id;
    this.qIndex   = 0;
    this.answers  = {};
    this.selected = null;
    this.resetTmr = null;
    this._build();
    this._bindAttract();
  }

  /* ── BUILD ── */
  _build() {
    this.el.innerHTML = `
      <div class="attract" id="att-${this.id}">
        <div class="a-rings">
          <div class="a-ring-o"></div>
          <div class="a-ring-i"></div>
          <div class="a-icon-wrap"><span class="a-tap">👆</span></div>
        </div>
        <div class="a-title">Share Your Feedback</div>
        <div class="a-sub">✦ Tap anywhere to begin ✦</div>
      </div>

      <div class="feedback-screen" id="fb-${this.id}">
        <div class="prog-dots"   id="dots-${this.id}"></div>
        <div class="q-card"      id="qcard-${this.id}">
          <div class="q-label"  id="qlbl-${this.id}"></div>
          <div class="q-text"   id="qtxt-${this.id}"></div>
        </div>
        <div class="emoji-bar"   id="ebar-${this.id}"></div>
        <div class="comment-wrap" id="cwrap-${this.id}">
          <label class="cmt-lbl">Additional comments <span style="opacity:.5;font-weight:400">(optional)</span></label>
          <textarea class="cmt-ta" id="cta-${this.id}" placeholder="Feel free to share more…"></textarea>
        </div>
        <div class="btn-row">
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
    this._buildBar();
    this._renderQ();
  }

  /* ── EMOJI BAR ── */
  _buildBar() {
    const bar = document.getElementById(`ebar-${this.id}`);
    bar.innerHTML = SAT_OPTS.map(o => `
      <div class="e-opt" data-v="${o.v}">
        <span class="e-emoji">${o.emoji}</span>
        <span class="e-lbl">${o.lbl}</span>
      </div>
    `).join('');
    bar.querySelectorAll('.e-opt').forEach(o => {
      const pick = () => this._pick(parseInt(o.dataset.v), o);
      o.addEventListener('click', pick);
      o.addEventListener('touchstart', pick, { passive: true });
    });
  }

  /* ── RENDER QUESTION ── */
  _renderQ() {
    const q      = QUESTIONS[this.qIndex];
    const isLast = this.qIndex === QUESTIONS.length - 1;
    const total  = QUESTIONS.length;

    // dots
    document.getElementById(`dots-${this.id}`).innerHTML =
      QUESTIONS.map((_,i) =>
        `<div class="p-dot${i < this.qIndex ? ' done' : i === this.qIndex ? ' curr' : ''}"></div>`
      ).join('');

    document.getElementById(`qlbl-${this.id}`).textContent = `Question ${this.qIndex + 1} of ${total}`;
    document.getElementById(`qtxt-${this.id}`).textContent = q.text;

    // reset emojis
    document.getElementById(`ebar-${this.id}`)
      .querySelectorAll('.e-opt').forEach(o => o.classList.remove('sel'));
    this.selected = null;

    // comment box
    const cw = document.getElementById(`cwrap-${this.id}`);
    cw.classList.toggle('visible', isLast);
    if (!isLast) { const ta = document.getElementById(`cta-${this.id}`); if (ta) ta.value = ''; }

    // button
    const oldBtn = document.getElementById(`btn-${this.id}`);
    const btn = oldBtn.cloneNode(true);
    oldBtn.parentNode.replaceChild(btn, oldBtn);
    btn.disabled = true;
    btn.className = `btn-action ${isLast ? 'sub-btn' : 'next-btn'}`;
    btn.innerHTML = isLast
      ? `Submit <span class="btn-icon">✓</span>`
      : `Next <span class="btn-icon">→</span>`;
    btn.addEventListener('click', () => this._advance());
  }

  /* ── PICK ── */
  _pick(val, el) {
    document.getElementById(`ebar-${this.id}`)
      .querySelectorAll('.e-opt').forEach(o => o.classList.remove('sel'));
    el.classList.add('sel');
    this.selected = val;
    document.getElementById(`btn-${this.id}`).disabled = false;
    if (navigator.vibrate) navigator.vibrate(22);
  }

  /* ── ADVANCE ── */
  _advance() {
    if (this.selected === null) return;
    const q      = QUESTIONS[this.qIndex];
    const isLast = this.qIndex === QUESTIONS.length - 1;
    const comment = isLast
      ? (document.getElementById(`cta-${this.id}`)?.value || '').trim()
      : '';

    this.answers[q.id] = {
      questionId:   q.id,
      questionText: q.text,
      rating:       this.selected,
      ratingLabel:  SAT_OPTS.find(o => o.v === this.selected)?.lbl || '',
      comment,
    };

    if (isLast) {
      this._submit();
    } else {
      this.qIndex++;
      this.selected = null;
      const fb = document.getElementById(`fb-${this.id}`);
      fb.classList.add('slide-out');
      setTimeout(() => {
        fb.classList.remove('slide-out');
        this._renderQ();
        fb.classList.add('slide-in');
        setTimeout(() => fb.classList.remove('slide-in'), 380);
      }, 260);
    }
  }

  /* ── SUBMIT — localStorage only, no download ── */
  _submit() {
    const response = {
      id:        `FB-${this.id}-${Date.now()}`,
      station:   this.id,
      timestamp: new Date().toISOString(),
      answers:   QUESTIONS.map(q => this.answers[q.id] || {
        questionId: q.id, questionText: q.text,
        rating: null, ratingLabel: '', comment: ''
      }),
    };

    const all = _load();
    all.push(response);
    _save(all);
    updateTotalCount();
    this._showTY();
  }

  /* ── THANK YOU ── */
  _showTY() {
    document.getElementById(`fb-${this.id}`).classList.remove('active');
    const ty   = document.getElementById(`ty-${this.id}`);
    const fill = document.getElementById(`tyfill-${this.id}`);
    ty.classList.add('active');

    fill.style.transition = 'none';
    fill.style.width = '100%';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      fill.style.transition = `width ${CONFIG.RESET_DELAY}s linear`;
      fill.style.width = '0%';
    }));

    clearTimeout(this.resetTmr);
    this.resetTmr = setTimeout(() => this._reset(), CONFIG.RESET_DELAY * 1000);
  }

  /* ── RESET ── */
  _reset() {
    this.qIndex = 0; this.answers = {}; this.selected = null;
    document.getElementById(`ty-${this.id}`).classList.remove('active');
    document.getElementById(`fb-${this.id}`).classList.remove('active');
    const att = document.getElementById(`att-${this.id}`);
    att.classList.remove('hidden');
    this._renderQ();
  }

  /* ── ATTRACT ── */
  _bindAttract() {
    const att = document.getElementById(`att-${this.id}`);
    const go  = () => {
      att.classList.add('hidden');
      const fb = document.getElementById(`fb-${this.id}`);
      fb.classList.add('active');
      this._renderQ();
    };
    att.addEventListener('click',      go);
    att.addEventListener('touchstart', go, { passive: true });
  }
}

/* ════════════════════════════════════════
   STORAGE HELPERS
════════════════════════════════════════ */
function _load() {
  try { return JSON.parse(localStorage.getItem('ric_fbk') || '[]'); } catch { return []; }
}
function _save(data) {
  try { localStorage.setItem('ric_fbk', JSON.stringify(data)); } catch {}
}

function updateTotalCount() {
  const el = document.getElementById('totalCount');
  if (el) el.textContent = _load().length;
}

/* ════════════════════════════════════════
   ANIMATED BACKGROUND
════════════════════════════════════════ */
function initBgCanvas() {
  const canvas = document.getElementById('bgCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, dpr, pts = [];
  const COLS = ['#84BD00','#A9D17D','#50BFE7','#80D1EE','#B2DAC5','#DAEBC7'];
  const rnd  = (a,b) => a + Math.random()*(b-a);

  function resize() {
    dpr = window.devicePixelRatio || 1;
    W = innerWidth; H = innerHeight;
    canvas.width  = W*dpr; canvas.height = H*dpr;
    canvas.style.width = W+'px'; canvas.style.height = H+'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
    pts = Array.from({ length: Math.floor(W*H/16000) }, () => ({
      x: rnd(0,W), y: rnd(0,H),
      r: rnd(2,7), vx: rnd(-0.14,0.14), vy: rnd(-0.11,0.11),
      col: COLS[Math.floor(Math.random()*COLS.length)],
      al: rnd(0.06,0.17), ph: rnd(0,Math.PI*2), sp: rnd(0.004,0.011),
    }));
  }

  function draw() {
    ctx.clearRect(0,0,W,H);
    const now = performance.now()*0.001;

    const g = ctx.createRadialGradient(W*.12,H*.08,0,W*.5,H*.5,Math.max(W,H)*.9);
    g.addColorStop(0,'rgba(169,209,125,0.09)');
    g.addColorStop(.5,'rgba(178,218,197,0.04)');
    g.addColorStop(1,'rgba(224,244,251,0.06)');
    ctx.fillStyle = g; ctx.fillRect(0,0,W,H);

    for (let i=0;i<pts.length;i++) {
      for (let j=i+1;j<pts.length;j++) {
        const dx=pts[i].x-pts[j].x, dy=pts[i].y-pts[j].y;
        const d=Math.sqrt(dx*dx+dy*dy);
        if (d<110) {
          ctx.beginPath(); ctx.moveTo(pts[i].x,pts[i].y); ctx.lineTo(pts[j].x,pts[j].y);
          ctx.strokeStyle=`rgba(132,189,0,${0.038*(1-d/110)})`;
          ctx.lineWidth=0.6; ctx.stroke();
        }
      }
    }

    pts.forEach(p => {
      const b = Math.sin(now*p.sp*60+p.ph);
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r*(0.88+0.12*b),0,Math.PI*2);
      ctx.fillStyle=p.col+Math.round(p.al*(0.7+0.3*b)*255).toString(16).padStart(2,'0');
      ctx.fill();
      p.x+=p.vx; p.y+=p.vy;
      if(p.x<-15)p.x=W+15; if(p.x>W+15)p.x=-15;
      if(p.y<-15)p.y=H+15; if(p.y>H+15)p.y=-15;
    });
    requestAnimationFrame(draw);
  }

  window.addEventListener('resize',resize); resize(); draw();
}

/* ════════════════════════════════════════
   CENTER PANEL MINI PARTICLES
════════════════════════════════════════ */
function initCenterParticles() {
  const canvas = document.getElementById('cParticles');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, pts = [];
  const COLS = ['#84BD00','#50BFE7','#A9D17D','#80D1EE'];
  const rnd  = (a,b) => a+Math.random()*(b-a);

  function resize() {
    W = canvas.offsetWidth; H = canvas.offsetHeight;
    canvas.width = W; canvas.height = H;
    pts = Array.from({length:18},()=>({
      x:rnd(0,W),y:rnd(0,H),r:rnd(1.5,4),
      vx:rnd(-0.3,0.3),vy:rnd(-0.3,0.3),
      col:COLS[Math.floor(Math.random()*COLS.length)],
      al:rnd(0.15,0.4),
    }));
  }

  function draw() {
    ctx.clearRect(0,0,W,H);
    pts.forEach(p=>{
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle=p.col+Math.round(p.al*255).toString(16).padStart(2,'0');
      ctx.fill();
      p.x+=p.vx; p.y+=p.vy;
      if(p.x<0||p.x>W)p.vx*=-1;
      if(p.y<0||p.y>H)p.vy*=-1;
    });
    requestAnimationFrame(draw);
  }

  const ro = new ResizeObserver(resize);
  ro.observe(canvas.parentElement);
  resize(); draw();
}

/* ════════════════════════════════════════
   ADMIN SECRET TRIGGER
════════════════════════════════════════ */
function initAdminTrigger() {
  let cnt=0, tmr=null;
  const t = document.getElementById('secretTrigger');
  if (!t) return;
  t.addEventListener('click',()=>{
    cnt++; clearTimeout(tmr);
    tmr = setTimeout(()=>{cnt=0;},2200);
    if(cnt>=CONFIG.ADMIN_TAPS){cnt=0;openPinModal();}
  });
}

let pinEntry='';
function openPinModal(){
  pinEntry=''; renderPinDots(); buildPinGrid();
  document.getElementById('pinModal').classList.add('active');
}
function closePinModal(){
  document.getElementById('pinModal').classList.remove('active');
  pinEntry=''; renderPinDots();
}
function buildPinGrid(){
  const keys=['1','2','3','4','5','6','7','8','9','ghost','0','⌫'];
  document.getElementById('pinGrid').innerHTML=keys.map(k=>{
    if(k==='ghost') return `<button class="p-key ghost" disabled></button>`;
    if(k==='⌫')    return `<button class="p-key back" onclick="pinBack()">⌫</button>`;
    return `<button class="p-key" onclick="pinPress('${k}')">${k}</button>`;
  }).join('');
}
function pinPress(d){
  if(pinEntry.length>=4)return;
  pinEntry+=d; renderPinDots();
  if(navigator.vibrate)navigator.vibrate(16);
  if(pinEntry.length===4){
    setTimeout(()=>{
      if(pinEntry===CONFIG.ADMIN_PIN){
        closePinModal(); window.open('admin.html','_blank');
      } else {
        document.querySelectorAll('.pd').forEach(e=>{
          e.classList.add('err'); setTimeout(()=>e.classList.remove('err'),400);
        });
        if(navigator.vibrate)navigator.vibrate([40,25,40]);
        setTimeout(()=>{pinEntry='';renderPinDots();},500);
      }
    },140);
  }
}
function pinBack(){ pinEntry=pinEntry.slice(0,-1); renderPinDots(); }
function renderPinDots(){
  for(let i=0;i<4;i++){
    const d=document.getElementById(`pd${i}`);
    if(d) d.className='pd'+(i<pinEntry.length?' filled':'');
  }
}