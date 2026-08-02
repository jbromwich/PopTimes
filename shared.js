/* ================================================================
   PopTimes shared stats: one store, one mastery model, one progress
   page for both games. Loaded before each game's own script.
   ================================================================ */
'use strict';

/* ---------- tiny shared audio (WebAudio, initialized on first tap) ---------- */
let AC = null;
function audio(){ if (!AC) { try { AC = new (window.AudioContext||window.webkitAudioContext)(); } catch(e){} } if (AC && AC.state==='suspended') AC.resume(); }
function beep(freq, dur, type, vol, when){
  if (!AC) return;
  const t = AC.currentTime + (when||0);
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type||'sine'; o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol||0.12, t+0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t+dur);
  o.connect(g); g.connect(AC.destination);
  o.start(t); o.stop(t+dur+0.05);
}
// iOS suspends (or kills) the AudioContext when a PWA is backgrounded;
// revive it on return so sound doesn't need an app relaunch
function wakeAudio(){
  if (!AC) return;                                   // created lazily on first tap
  if (AC.state==='closed'){ AC = null; audio(); return; }
  if (AC.state!=='running') AC.resume();
}
document.addEventListener('visibilitychange', ()=>{ if (!document.hidden) wakeAudio(); });
window.addEventListener('pageshow', wakeAudio);
window.addEventListener('focus', wakeAudio);

const sTap    = () => beep(660, 0.06, 'triangle', 0.08);
const sGood   = () => { beep(523,0.09,'triangle',0.12); beep(659,0.09,'triangle',0.12,0.07); beep(784,0.14,'triangle',0.12,0.14); };
const sWrong  = () => { beep(196,0.25,'sawtooth',0.07); beep(185,0.25,'sawtooth',0.06,0.05); };
const sPour   = () => { for(let i=0;i<6;i++) beep(300+Math.random()*500, 0.05, 'triangle', 0.03, i*0.05); };
const sSplash = () => beep(140,0.4,'sine',0.1);
const sSail   = () => { beep(392,0.2,'triangle',0.1); beep(494,0.2,'triangle',0.1,0.15); beep(587,0.35,'triangle',0.12,0.3); };

const sWin = () => {   // brief level-complete fanfare
  [523,659,784,1047].forEach((f,i)=>beep(f, i===3?0.30:0.10, 'triangle', 0.13, i*0.09));
};

/* small helpers (self-contained) */
function _clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
function pad(x){ return x<10?'0'+x:''+x; }
function dayKey(d){ return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
// shared three-mode fact lists (same rules as the quiz):
// expert = the original curated list; regular = all 144; beginner = the rest
const EASY   = [2,3,4,5,10];
const ALLT   = [1,2,3,4,5,6,7,8,9,10,11,12];
const TRICKY = [3,4,5,6,7,8,9,12];
const EXPAIRS = (()=>{
  const out=[];
  for (let i=0;i<TRICKY.length;i++) for (let j=i+1;j<TRICKY.length;j++) out.push([TRICKY[i],TRICKY[j]]);
  out.push([10,11],[11,11],[11,12],[10,12],[12,12]);
  return out;
})();
const ALLPAIRS = (()=>{
  const out=[];
  for (let i=1;i<=12;i++) for (let j=i;j<=12;j++) out.push([i,j]);
  return out;
})();
const BEGPAIRS = (()=>{
  const ex=new Set(EXPAIRS.map(p=>p[0]+'x'+p[1]));
  return ALLPAIRS.filter(p=>!ex.has(p[0]+'x'+p[1]));
})();
function modePairsFor(pref){ return pref==='expert' ? EXPAIRS : pref==='beginner' ? BEGPAIRS : ALLPAIRS; }

/* ---------- persistent stats ----------
   Per fact we keep only the last WIN attempts, as a string of outcomes:
   'q' = correct & quick (answered before the wobble), 'c' = correct but
   slow, 'w' = wrong or lost. Mastery is judged on this window alone, so
   early failures never haunt a fact. */
const SKEY = 'ml-stats-v2';
const WIN = 10;          // window size
const MASTER_MIN = 6;    // attempts needed before "mastered" is reachable
const MASTER_RATE = 5/6; // quick share required (5/6, 6/7, 7/8, 8/9, 9/10)
const MAXHIST = 200;
let ST = {f:{}, h:[], rec:{streak:0, fast:0, days:0, pt:[]}};
function loadStats(){
  try{
    const r = localStorage.getItem(SKEY);
    if (r){
      const o = JSON.parse(r);
      ST.f = o.f||{}; ST.h = o.h||[];
      ST.rec = Object.assign({streak:0, fast:0, days:0, pt:[]}, o.rec);
      return;
    }
    // migrate v1 lifetime counters: seed each window proportionally
    const v1 = localStorage.getItem('ml-stats-v1');
    if (v1){
      const o = JSON.parse(v1);
      for (const k in (o.f||{})){
        const s = o.f[k];
        if (!s || !s.n) continue;
        const m = Math.min(s.n, WIN);
        let qk = Math.round((s.q||0)/s.n*m);
        let wr = Math.min(m-qk, Math.round((s.w||0)/s.n*m));
        ST.f[k] = {h:'q'.repeat(qk)+'c'.repeat(m-qk-wr)+'w'.repeat(wr)};
      }
      ST.h = o.h||[];
      saveStats();
      localStorage.removeItem('ml-stats-v1');
    }
  }catch(e){ ST = {f:{}, h:[], rec:{streak:0, fast:0, days:0, pt:[]}}; }
}
function saveStats(){ try{ localStorage.setItem(SKEY, JSON.stringify(ST)); }catch(e){} }
function fkey(a,b){ return Math.min(a,b)+'x'+Math.max(a,b); }
function recordOutcome(a,b,res){   // res: 'q' | 'c' | 'w' — store only
  const k=fkey(a,b), s=ST.f[k]||(ST.f[k]={h:''});
  s.h = (s.h + res).slice(-WIN);
  saveStats();
}
// a finished level (either game): push history + update records
function noteLevelResult(entry, opts){
  ST.h.push(entry);
  if (ST.h.length>MAXHIST) ST.h = ST.h.slice(-MAXHIST);
  if (opts && opts.dur>2000 && (!ST.rec.fast || opts.dur < ST.rec.fast)) ST.rec.fast = Math.round(opts.dur);
  ST.rec.days = Math.max(ST.rec.days||0, dayStreak());
  saveStats();
}
function noteStreak(n){
  if (n > (ST.rec.streak||0)){ ST.rec.streak = n; saveStats(); }
}
/* ---- answer pace ----
   Rolling window of the last PACE_WIN correct MULTIPLYING answer times
   (ms, from answers-tappable to tap; both games pool into it; factoring
   is excluded as inherently slower). The stats page shows the LIVE
   window average — it moves up and down with the player, no watermark —
   once at least PACE_MIN_SHOW answers (one clean Student level) exist.
   Targets: Student 5s, Scholar 3s, Master 1.5s. */
const PACE_WIN = 60;
const PACE_MIN_SHOW = 10;
const PACE_SLOW = 10000, PACE_FAST = 1500;          // bar ends (ms)
const PACE_TICKS = [[5000,'5'],[3000,'3'],[1500,'1.5']];
function notePace(ms){
  if (!(ms>0) || ms>60000) return;                  // ignore junk samples
  const r = ST.rec;
  r.pt = (r.pt||[]).concat(Math.round(ms)).slice(-PACE_WIN);
  saveStats();
}
function currentPace(){                             // 0 = not enough data yet
  const pt = ST.rec.pt||[];
  if (pt.length < PACE_MIN_SHOW) return 0;
  return Math.round(pt.reduce((a,b)=>a+b,0)/pt.length);
}
// window summary and the agreed tier grid:
// 0 = never asked, 1 < 1/3 quick, 2 < 2/3, 3 < 5/6 (or too few attempts),
// 4 = mastered (>= 5/6 quick over >= 6 attempts)
function factWin(a,b){
  const s = ST.f[fkey(a,b)];
  const h = s ? s.h : '';
  let qk=0; for (const ch of h) if (ch==='q') qk++;
  return {m:h.length, qk};
}
function tierOf(a,b){
  const {m,qk} = factWin(a,b);
  if (!m) return 0;
  const r = qk/m;
  if (m>=MASTER_MIN && r>=MASTER_RATE) return 4;
  if (r < 1/3) return 1;
  if (r < 2/3) return 2;
  return 3;
}
function masteredCount(){
  let n=0;
  for (const p of ALLPAIRS) if (tierOf(p[0],p[1])===4) n++;
  return n;
}
function seenCount(){
  let n=0;
  for (const p of ALLPAIRS) if (factWin(p[0],p[1]).m) n++;
  return n;
}
/* per-skill ladder progress (levels completed on each mode's ladder) */
function loadBests(){
  const out={};
  for (const m of ['beginner','regular','expert'])
    out[m] = +(localStorage.getItem('ml-best-'+m)||0);
  // migrate the old shared best into regular
  const old = +(localStorage.getItem('ml-best')||0);
  if (old && !out.regular){
    out.regular = old;
    try{ localStorage.setItem('ml-best-regular', old); }catch(e){}
  }
  try{ localStorage.removeItem('ml-best'); }catch(e){}
  return out;
}
let BESTS = {beginner:0, regular:0, expert:0};
function saveBest(mode){
  try{ localStorage.setItem('ml-best-'+mode, BESTS[mode]); }catch(e){}
}
/* ================================================================
   CURRICULUM DEFINITIONS — mirrors curriculum.md exactly.
   Each rung row: focus tables ([] = whole mode pool), question mode,
   and promotion gate [accuracy%, quick%]. Edit the tables, not logic.
   ================================================================ */
const LADDERS = {
  beginner: [   // easy facts only
    {tables:[2],        mode:'multiplying', gate:[60,10]},
    {tables:[5],        mode:'multiplying', gate:[60,10]},
    {tables:[3],        mode:'multiplying', gate:[60,10]},
    {tables:[4],        mode:'multiplying', gate:[60,10]},
    {tables:[1,10,11],  mode:'multiplying', gate:[60,10]},
    {tables:[],         mode:'factoring',   gate:[62,12]},
    {tables:[],         mode:'multiplying', gate:[63,13]},
    {tables:[],         mode:'factoring',   gate:[65,15]},
    {tables:[],         mode:'multiplying', gate:[66,16]},
    {tables:[],         mode:'factoring',   gate:[68,18]},
    {tables:[],         mode:'multiplying', gate:[69,19]},
    {tables:[],         mode:'factoring',   gate:[70,20]},
  ],
  regular: [    // all 144 facts; "full Ns" = easy + tricky halves
    {tables:[2,3],      mode:'multiplying', gate:[70,20]},
    {tables:[4,5],      mode:'multiplying', gate:[70,20]},
    {tables:[2,3,4,5],  mode:'factoring',   gate:[70,20]},
    {tables:[6],        mode:'multiplying', gate:[70,20]},
    {tables:[7],        mode:'multiplying', gate:[70,20]},
    {tables:[6,7],      mode:'factoring',   gate:[70,20]},
    {tables:[8],        mode:'multiplying', gate:[70,20]},
    {tables:[9],        mode:'multiplying', gate:[70,20]},
    {tables:[8,9],      mode:'factoring',   gate:[70,20]},
    {tables:[12],       mode:'multiplying', gate:[70,20]},
    {tables:[],         mode:'factoring',   gate:[75,25]},
    {tables:[],         mode:'multiplying', gate:[80,30]},
  ],
  expert: [     // tricky facts only; pure consolidation, no introductions
    {tables:[], mode:'multiplying', gate:[80,30]},
    {tables:[], mode:'factoring',   gate:[82,35]},
    {tables:[], mode:'multiplying', gate:[84,40]},
    {tables:[], mode:'factoring',   gate:[85,45]},
    {tables:[], mode:'multiplying', gate:[87,50]},
    {tables:[], mode:'factoring',   gate:[89,55]},
    {tables:[], mode:'multiplying', gate:[91,60]},
    {tables:[], mode:'factoring',   gate:[93,65]},
    {tables:[], mode:'multiplying', gate:[95,70]},
    {tables:[], mode:'factoring',   gate:[96,75]},
    {tables:[], mode:'multiplying', gate:[98,80]},
    {tables:[], mode:'factoring',   gate:[100,85]},
  ],
};
const LADDER_LEN = {beginner:12, regular:12, expert:12};
// questions per level, shared by both games (loader fills its ship over
// exactly this many; quiz asks exactly this many)
const TESTLEN = {beginner:10, regular:15, expert:20};


function isGraduated(mode){ return (BESTS[mode]||0) >= LADDER_LEN[mode]; }
function graduatedCount(){ return ['beginner','regular','expert'].filter(isGraduated).length; }

/* Student-facing titles. Everyone is a Student from the start; each
   ladder completed earns the next title: Scholar, Master, Professor.
   A skill level is named after the title you hold while playing it
   (you play the Student level to become a Scholar, and so on).
   Storage keys stay beginner/regular/expert. */
const MODENAME  = {beginner:'Student', regular:'Scholar', expert:'Master'};
const GRAD_TITLE = {beginner:'Scholar', regular:'Master', expert:'Professor'};
function heldTitle(){
  return isGraduated('expert') ? 'Professor'
       : isGraduated('regular') ? 'Master'
       : isGraduated('beginner') ? 'Scholar' : 'Student';
}

function ladderRung(mode, n){
  const list = LADDERS[mode];
  if (n < list.length) return list[n];
  // beyond the ladder: endless mixed play, alternating modes,
  // holding the final rung's gate
  return {tables:[], mode: n%2 ? 'factoring' : 'multiplying',
          gate: list[list.length-1].gate};
}
function levelGate(mode, i){
  const g = ladderRung(mode, i).gate;
  return {acc: g[0]/100, quick: g[1]/100};
}
function gateNeeded(mode, i, n){
  const g = levelGate(mode, i);
  return {needC: Math.round(g.acc*n), needQ: Math.round(g.quick*n)};
}

// tier-weighted selection: unseen facts come first; then practice
// concentrates on unmastered facts, while mastered ones still resurface
// occasionally so rusty facts can honestly lose their mastery
function weightOf(a,b){
  const t = tierOf(a,b);
  if (t===0) return 10;                 // unseen (also prioritized below)
  if (t===4) return 0.5;                // mastered: retention checks only
  let w = t===1 ? 8 : t===2 ? 5 : 4;
  if (factWin(a,b).m < MASTER_MIN) w *= 1.3;   // needs attempts to qualify
  return w;
}
function pickFact(o){   // {pref, tables, recent, maxP}
  // most picks drill the level's focus tables, but a share roams the
  // whole mode list so every fact gets asked eventually
  let pool = modePairsFor(o.pref);
  if (o.maxP!=null){
    pool = pool.filter(p=>p[0]*p[1]<=o.maxP);
    if (!pool.length) return null;
  }
  if (Math.random()>=0.4){
    const focus = pool.filter(p=>(o.tables||[]).includes(p[0])||(o.tables||[]).includes(p[1]));
    if (focus.length) pool = focus;
  }
  const fresh = pool.filter(p=>!(o.recent||[]).includes(fkey(p[0],p[1])));
  let src = fresh.length ? fresh : pool;
  // absolute coverage guarantee: never-asked facts always go first
  const unseen = src.filter(p=>tierOf(p[0],p[1])===0);
  if (unseen.length) src = unseen;
  const w = src.map(p=>weightOf(p[0],p[1]));
  let r = Math.random()*w.reduce((x,y)=>x+y,0), f = src[0];
  for (let i=0;i<src.length;i++){ r-=w[i]; if(r<=0){ f=src[i]; break; } }
  return Math.random()<0.5 ? {a:f[0],b:f[1]} : {a:f[1],b:f[0]};
}





/* ================================================================
   GRADUATION CELEBRATION — a temporary full-screen overlay drawn in
   flat canvas style. tier: 1 beginner, 2 regular, 3 expert.
   Each graduation celebrates its own mode only — one medal (the cup
   for Expert), escalating spectacle by tier. pointer-events pass
   through, so the card beneath stays tappable.
   ================================================================ */
const MEDAL_CAP = new Path2D('M12 4L2 9l10 5 8-4v5h2V9zM6 13v4c0 1.7 2.7 3 6 3s6-1.3 6-3v-4l-6 3z');
const MEDAL_CUP = new Path2D('M6 3h12v2h3v3c0 2.5-2 4.5-4.5 4.9A6 6 0 0113 16.9V19h3v2H8v-2h3v-2.1a6 6 0 01-3.5-3.1C5 13.5 3 11.5 3 9V5h3zm-1 4v2c0 1.2.8 2.3 2 2.8V7zm14 0h-2v4.8c1.2-.5 2-1.6 2-2.8z');
const CONF_COLS = ['#b4503c','#dd8b33','#e2c94f','#6cb043','#7a8fc9','#9a6fbd','#e8b64c'];

function gradMelody(tier){
  audio();
  if (tier===1){
    [523,587,659,784,880,1047].forEach((f,i)=>beep(f, i===5?0.35:0.11, 'triangle', 0.13, i*0.11));
  } else if (tier===2){
    [392,523,659,784].forEach((f,i)=>beep(f,0.12,'triangle',0.13,i*0.10));
    [523,659,784,1047].forEach((f,i)=>beep(f,0.14,'triangle',0.13,0.5+i*0.10));
    beep(1319,0.5,'triangle',0.14,0.95);
    beep(131,0.5,'sawtooth',0.10,1.0); beep(131,0.5,'sawtooth',0.10,1.6);  // ship horn
  } else {
    for (let i=0;i<8;i++) beep(392*Math.pow(2,i/4), 0.12, 'triangle', 0.12, i*0.09);
    [523,659,784].forEach(f=>beep(f,0.9,'triangle',0.09,0.8));
    beep(1047,1.1,'triangle',0.12,0.85);
    beep(98,1.2,'sawtooth',0.08,0.85);
    for (let i=0;i<6;i++) beep(2093+i*220,0.06,'sine',0.05,1.1+i*0.12);   // shimmer
  }
}

function celebrate(tier){
  const cv = document.createElement('canvas');
  cv.style.cssText = 'position:fixed;inset:0;z-index:9;pointer-events:none';
  document.body.appendChild(cv);
  const dpr = Math.min(devicePixelRatio||1, 2);
  const W2 = innerWidth, H2 = innerHeight;
  cv.width = W2*dpr; cv.height = H2*dpr;
  const c2 = cv.getContext('2d');
  c2.setTransform(dpr,0,0,dpr,0,0);
  gradMelody(tier);

  const dur = tier===1?2.6 : tier===2?3.6 : 5.0;
  const confetti = [], rockets = [], sparks = [];
  function burst(n, x, y, spread){
    for (let i=0;i<n;i++) confetti.push({
      x:x+(Math.random()-0.5)*spread, y:y+(Math.random()-0.5)*20,
      vx:(Math.random()-0.5)*260, vy:-120-Math.random()*260,
      w:5+Math.random()*5, h:8+Math.random()*6,
      r:Math.random()*6.28, vr:(Math.random()-0.5)*10,
      col:CONF_COLS[Math.floor(Math.random()*CONF_COLS.length)],
    });
  }
  function rocket(delay){
    rockets.push({t:-delay, x:W2*(0.15+Math.random()*0.7), y:H2, vy:-(H2*0.55+Math.random()*H2*0.25)/0.9,
      col:CONF_COLS[Math.floor(Math.random()*CONF_COLS.length)]});
  }
  burst(tier*50, W2*0.25, H2*0.25, W2*0.3);
  burst(tier*50, W2*0.75, H2*0.25, W2*0.3);
  if (tier>=2) setTimeout(()=>burst(120, W2*0.5, H2*0.2, W2*0.8), 600);
  const nRockets = tier===3?6:0;
  for (let i=0;i<nRockets;i++) rocket(0.3+i*0.55);

  const t0 = performance.now();
  function drawMedal(x, y, sc, glyph){
    c2.save(); c2.translate(x,y);
    c2.fillStyle='rgba(232,182,76,0.18)';
    c2.beginPath(); c2.arc(0,0,34*sc,0,7); c2.fill();
    c2.lineWidth=4*sc; c2.strokeStyle='#e8b64c';
    c2.beginPath(); c2.arc(0,0,34*sc,0,7); c2.stroke();
    c2.translate(-16*sc,-16*sc); c2.scale(sc*32/24, sc*32/24);
    c2.fillStyle='#e8b64c'; c2.fill(glyph);
    c2.restore();
  }
  function frame(){
    const t = (performance.now()-t0)/1000;
    if (t>dur || !cv.parentNode){ cv.remove(); return; }
    c2.clearRect(0,0,W2,H2);
    const dt = 1/60;
    // confetti
    for (const p of confetti){
      p.vy += 620*dt; p.x += p.vx*dt; p.y += p.vy*dt;
      p.vx *= 0.995; p.r += p.vr*dt;
      c2.save(); c2.translate(p.x,p.y); c2.rotate(p.r);
      c2.globalAlpha = _clamp(2.2-(t/dur)*2.2, 0, 1);
      c2.fillStyle = p.col;
      c2.fillRect(-p.w/2,-p.h/2,p.w,Math.abs(Math.sin(p.r))*p.h+2);
      c2.restore();
    }
    // fireworks
    for (const r of rockets){
      r.t += dt;
      if (r.t<0) continue;
      if (!r.burst){
        r.y += r.vy*dt;
        c2.fillStyle=r.col;
        c2.fillRect(r.x-2, r.y, 4, 12);
        if (r.t>0.9){
          r.burst=true;
          for (let i=0;i<36;i++){
            const a=i/36*6.28, sp=90+Math.random()*160;
            sparks.push({x:r.x,y:r.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,col:r.col,life:1});
          }
          beep(80+Math.random()*60,0.25,'sawtooth',0.06);
        }
      }
    }
    for (const sp of sparks){
      sp.vy += 220*(1/60); sp.x += sp.vx/60; sp.y += sp.vy/60; sp.life -= 1.1/60;
      if (sp.life<=0) continue;
      c2.globalAlpha = _clamp(sp.life,0,1);
      c2.fillStyle = sp.col;
      c2.fillRect(sp.x-2.5, sp.y-2.5, 5, 5);
    }
    c2.globalAlpha = 1;
    // medal drop with bounce
    const my = H2*0.16;
    const k = _clamp(t/0.8, 0, 1);
    const bounce = k<1 ? (1 - Math.abs(Math.cos(k*Math.PI*1.5))*(1-k)) : 1;
    const yNow = -60 + (my+60)*bounce;
    drawMedal(W2/2, yNow, tier===3?1.3:1, tier===3?MEDAL_CUP:MEDAL_CAP);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

/* ---------- progress overlay: injected DOM + CSS ---------- */
const PG_CSS = `/* ---- progress overlay (styles ported from the quiz) ---- */
#pg{
  --ink:#e8edf4; --muted:#94a1b2; --line:#2f3843; --ok-ink:#9fdcae;
  --accent:#8ab6e0; --accent2:#b9a2e0; --m0:#b4503c; --m50:#dd8b33; --m100:#6cb043;
  display:none;position:fixed;inset:0;z-index:8;overflow-y:auto;background:#15191f;color:var(--ink);
  -webkit-user-select:text;user-select:text;touch-action:pan-y;
}
#pg .wrap{max-width:520px;margin:0 auto;padding:18px 22px calc(30px + env(safe-area-inset-bottom))}
#pg .top{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px}
#pg .top h1{font-size:15px;font-weight:600;color:var(--muted);margin:0}
#pg .top button{font-family:inherit;font-size:22px;line-height:1;background:none;border:none;color:var(--muted);cursor:pointer;padding:4px 8px}
#pg .top .tbtns{display:flex;align-items:center;gap:6px}
#pg .top #pgshare{line-height:0;padding:6px 8px}
#pg .top #pgshare svg{display:block}
#pg button.link{font-family:inherit;border:none;background:none;color:var(--muted);font-size:15px;text-decoration:underline;padding:8px;cursor:pointer}
.pg-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.pg-stats.two{grid-template-columns:repeat(2,1fr)}
.pg-sec.first{padding-top:4px}
.pg-journey{display:flex;align-items:center;gap:12px;margin-bottom:13px}
.pg-journey .jl{width:72px;font-size:14px;color:var(--ink)}
.pg-journey .mt{flex:1}
.pg-journey .jv{width:52px;text-align:right;font-size:13px;color:var(--muted);font-variant-numeric:tabular-nums}
.pg-journey .jv.done{color:#6cb043;font-size:17px}
.pg-fam{margin-bottom:16px}
.pg-fam h3{font-size:10px;font-weight:400;color:var(--muted);letter-spacing:.09em;text-transform:uppercase;margin:0 0 8px}
.pg-fam .strip{display:flex;gap:12px;overflow-x:auto;padding-bottom:4px;-webkit-overflow-scrolling:touch}
.pg-badge{text-align:center;flex:0 0 86px}
.pg-badge .med{
  width:62px;height:62px;margin:0 auto 7px;border-radius:50%;position:relative;
  background:rgba(232,182,76,0.15);border:3px solid #e8b64c;
  display:flex;align-items:center;justify-content:center;
}
.pg-badge .med svg{width:30px;height:30px;fill:#e8b64c}
.pg-badge .med .tn{
  position:absolute;bottom:-6px;right:-4px;background:#e8b64c;color:#1a1408;
  font-size:11px;font-weight:800;border-radius:999px;padding:1px 6px;
  font-variant-numeric:tabular-nums;
}
.pg-badge.locked .med{background:rgba(238,244,248,0.05);border:2px dashed var(--line)}
.pg-badge.locked .med svg{fill:#4a5765}
.pg-badge.locked .med .tn{background:var(--line);color:var(--muted)}
.pg-badge .bn{font-size:11px;color:var(--ink);line-height:1.25;min-height:27px}
.pg-badge.locked .bn{color:var(--muted)}
.pg-badge .bp{height:5px;border-radius:3px;background:var(--line);overflow:hidden;margin:5px 8px 3px}
.pg-badge .bp i{display:block;height:100%;border-radius:3px;background:#e8b64c}
.pg-badge .bl{font-size:10px;color:var(--muted);font-variant-numeric:tabular-nums}
.pg-badge .bl.done{color:#6cb043}
.pg-pills{display:flex;gap:5px;flex:1;justify-content:center}
.pg-pills i{width:26px;height:9px;border-radius:5px;display:block}
.pg-meters{display:flex;flex-direction:column;gap:15px}
.pg-meter{margin-bottom:22px}
.pg-meter .mh{display:flex;justify-content:space-between;align-items:baseline;font-size:13px;color:var(--muted);margin-bottom:7px}
.pg-meter .mh b{font-weight:400;font-size:18px;color:var(--ink);font-variant-numeric:tabular-nums}
.pg-meter .mt,.pg-journey .mt{height:10px;border-radius:5px;background:var(--line);overflow:hidden}
.pg-meter .mt i,.pg-journey .mt i{display:block;height:100%;border-radius:5px}
.pg-meter .mt.pace{position:relative;overflow:visible}
.pg-meter .mt.pace i.tick{position:absolute;top:-3px;bottom:-3px;height:auto;width:2px;border-radius:1px;background:rgba(238,244,248,0.85)}
.pg-pacelbls{position:relative;height:16px;margin-top:6px;font-size:10px;color:var(--muted);letter-spacing:.05em;text-transform:uppercase}
.pg-pacelbls .t{position:absolute;transform:translateX(-50%)}
.pg-keys{display:flex;gap:18px;margin-top:12px;font-size:12px;color:var(--muted);flex-wrap:wrap}
.pg-keys>span{display:flex;align-items:center;gap:6px}
.pg-keys i{width:14px;height:3px;border-radius:2px;display:block}
.pg-stat{text-align:center}
.pg-stat .n{font-size:30px;line-height:1.1;color:var(--ink);font-variant-numeric:tabular-nums}
.pg-stat .n.up{color:var(--ok-ink)}
.pg-stat .l{font-size:10px;color:var(--muted);margin-top:5px;letter-spacing:.07em;text-transform:uppercase;line-height:1.3}
.pg-sec{padding-top:22px}
.pg-sec + .pg-sec{margin-top:22px;border-top:1px solid var(--line)}
.pg-sec h2{font-size:11px;font-weight:400;color:var(--muted);letter-spacing:.09em;text-transform:uppercase;margin:0 0 14px}
.pg-gridwrap{overflow-x:auto;touch-action:pan-x pan-y;-webkit-overflow-scrolling:touch}
.pg-grid{display:grid;grid-template-columns:16px repeat(12,minmax(0,1fr));gap:3px;min-width:300px}
.pg-grid .ax{display:flex;align-items:center;justify-content:center;font-size:10px;color:var(--muted);font-variant-numeric:tabular-nums}
.pg-grid .cell{aspect-ratio:1;border-radius:3px;min-width:0;overflow:hidden;display:flex;align-items:center;justify-content:center}
.pg-grid .cell span{font-size:8.5px;font-weight:600;font-variant-numeric:tabular-nums;color:rgba(0,0,0,0.48);pointer-events:none}
.pg-grid .cell.t1 span{color:rgba(255,255,255,0.6)}
.pg-grid .cell.off span{color:var(--muted);opacity:0.55}
.pg-grid .cell.off{border:1px dashed var(--line);background:transparent}
.pg-grid .cell.band{box-shadow:0 0 0 1.5px rgba(108,176,67,0.6)}
.pg-grid .ax.axdone{background:#6cb043;color:#15311e;border-radius:4px;font-weight:700}
.pg-note{margin-top:14px;font-size:14px;color:var(--ink);line-height:1.5}
.pg-legend{margin-top:12px;display:flex;align-items:center;gap:10px;font-size:10px;color:var(--muted);letter-spacing:.05em;text-transform:uppercase}
.pg-key{display:flex;align-items:center;gap:5px;font-size:11px;margin-top:10px;color:var(--muted)}
.pg-key i{width:11px;height:11px;border-radius:3px;border:1px dashed var(--line);display:block}
.pg-chart{width:100%;overflow-x:auto}
.pg-chart svg{display:block;width:100%;height:auto}
.pg-foot{margin-top:10px;display:flex;justify-content:space-between;font-size:11px;color:var(--muted)}
.pg-clear{margin-top:26px;text-align:center}
.pg-share{margin-top:30px;text-align:center}
.pg-share button{font-family:inherit;font-size:16px;font-weight:700;color:#fff;background:#2f8f5b;border:none;border-radius:999px;padding:13px 30px;cursor:pointer;-webkit-tap-highlight-color:transparent}
.pg-share button:active{background:#25774a}
/* ---- medal toasts (coin-style awards at level end) ---- */
.mtoasts{
  position:fixed;top:calc(14px + env(safe-area-inset-top));left:0;right:0;z-index:10;
  display:flex;flex-direction:column;align-items:center;gap:9px;pointer-events:none;
}
.mtoast{
  display:flex;align-items:center;gap:11px;padding:9px 18px 9px 10px;border-radius:999px;
  background:rgba(12,20,30,0.92);border:1.5px solid #e8b64c;
  animation:mpop .45s cubic-bezier(.2,1.6,.4,1) both;
}
.mtoast .mmed{
  position:relative;width:40px;height:40px;border-radius:50%;flex:0 0 40px;
  background:rgba(232,182,76,0.18);border:2.5px solid #e8b64c;
  display:flex;align-items:center;justify-content:center;
}
.mtoast .mmed svg{width:21px;height:21px;fill:#e8b64c}
.mtoast .mlbl{font-family:ui-rounded,'SF Pro Rounded',system-ui,sans-serif;font-size:15px;font-weight:700;color:#f4e9c9;white-space:nowrap}
.mtoast .mmed i{
  position:absolute;width:5px;height:5px;border-radius:50%;background:#ffe9a8;opacity:0;
  animation:mspark .7s ease-out .1s both;
}
.mtoast .mmed i:nth-child(2){left:-9px;top:4px}
.mtoast .mmed i:nth-child(3){right:-9px;top:8px;animation-delay:.16s}
.mtoast .mmed i:nth-child(4){left:6px;top:-9px;animation-delay:.22s}
.mtoast .mmed i:nth-child(5){right:2px;bottom:-9px;animation-delay:.28s}
@keyframes mpop{0%{transform:scale(.3) translateY(-18px);opacity:0}100%{transform:scale(1) translateY(0);opacity:1}}
@keyframes mspark{0%{opacity:0;transform:scale(.3)}35%{opacity:1;transform:scale(1.25)}100%{opacity:0;transform:scale(.4)}}
@media (prefers-reduced-motion: reduce){.mtoast,.mtoast .mmed i{animation:none}}
`;
(function(){
  const st = document.createElement('style');
  st.textContent = PG_CSS;
  document.head.appendChild(st);
  const d = document.createElement('div');
  d.id = 'pg';
  d.innerHTML = '<div class="wrap"><div class="top"><h1>Progress</h1><span class="tbtns">'
    +'<button id="pgshare" title="Share" aria-label="Share"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M8 7l4-4 4 4M5 12v8a1 1 0 001 1h12a1 1 0 001-1v-8"/></svg></button>'
    +'<button id="pgclose" aria-label="Close">&times;</button></span></div><div id="pgbody"></div></div>';
  document.body.appendChild(d);
})();
const pgEl = document.getElementById('pg');
document.getElementById('pgclose').addEventListener('click', ()=>{ pgEl.style.display='none'; });
document.getElementById('pgshare').addEventListener('click', ()=>{ audio(); sTap(); shareNow(); });


const TIERCOL = ['', '#b4503c', '#dd8b33', '#e2c94f', '#6cb043'];   // approved palette

function el(tag,cls,txt){
  const e=document.createElement(tag);
  if(cls)e.className=cls;
  if(txt!==undefined)e.textContent=txt;
  return e;
}
function dayStreak(){
  if(!ST.h.length)return 0;
  const days={}; ST.h.forEach(r=>{days[r.d]=1;});
  let d=new Date(), s=0;
  if(!days[dayKey(d)]){ d.setDate(d.getDate()-1); if(!days[dayKey(d)])return 0; }
  while(days[dayKey(d)]){ s++; d.setDate(d.getDate()-1); }
  return s;
}
function tableMastered(t){
  for (let k=1;k<=12;k++) if (tierOf(t,k)!==4) return false;
  return true;
}

/* ---------- badges ---------- */
const GLYPHS = {
  star:   '<path d="M12 3l2.5 5.4 5.9.6-4.4 4 1.2 5.8L12 15.9 6.8 18.8 8 13 3.6 9l5.9-.6z"/>',
  bolt:   '<path d="M13 2L5 13h5l-2 9 9-12h-5z"/>',
  flame:  '<path d="M12 2c1 4-3 5-3 9a4.5 4.5 0 009 0c0-2-1-3.5-2-5-.3 1.2-1 2-2 2.3C14.6 6.8 14 4 12 2z"/>',
  cap:    '<path d="M12 4L2 9l10 5 8-4v5h2V9zM6 13v4c0 1.7 2.7 3 6 3s6-1.3 6-3v-4l-6 3z"/>',
  compass:'<path d="M12 2a10 10 0 100 20 10 10 0 000-20zm4 6l-2.5 5.5L8 16l2.5-5.5z"/>',
  trophy: '<path d="M6 3h12v2h3v3c0 2.5-2 4.5-4.5 4.9A6 6 0 0113 16.9V19h3v2H8v-2h3v-2.1a6 6 0 01-3.5-3.1C5 13.5 3 11.5 3 9V5h3zm-1 4v2c0 1.2.8 2.3 2 2.8V7zm14 0h-2v4.8c1.2-.5 2-1.6 2-2.8z"/>',
  sun:    '<path d="M12 7a5 5 0 100 10 5 5 0 000-10zm0-6h0l1 4h-2zm0 18l1 4h-2zm11-8l-4 1v-2zM5 12l-4 1v-2zm14.8-7.8l-3.5 2.1-1.4-1.4zM8.1 19.1l-3.5 2.1 1.4 1.4zm11.3 2.1l-2.1-3.5 1.4-1.4zM6.7 4.9L4.6 8.4 3.2 7z"/>',
};
/* Badge families, NYT-style: every tier is its own medal. Each family
   renders as one row — the next unearned medal (with progress) sits on
   the left, earned medals shelve to the right, newest first. Rows are
   ordered by when a player typically earns their first medal. */
function medal(label, glyph, target, val, what){
  return {label, glyph, target, val, earned: val>=target, what};
}
function badgeFamilies(){
  const perf  = ST.h.filter(r=>r.n>0 && r.c===r.n).length;
  const light = ST.h.filter(r=>r.n>0 && (r.q||0)===r.n).length;
  const days  = Math.max(ST.rec.days||0, dayStreak());
  const streak= ST.rec.streak||0;
  const mc    = masteredCount();
  // journey: graduates are sequential; Explorer floats alongside them
  const grads = [
    medal('Scholar','cap',LADDER_LEN.beginner,BESTS.beginner||0,'finish every Student level'),
    medal('Master','cap',LADDER_LEN.regular,BESTS.regular||0,'finish every Scholar level'),
    medal('Professor','cap',LADDER_LEN.expert,BESTS.expert||0,'finish every Master level'),
  ];
  const explorer = medal('Explorer','compass',ALLPAIRS.length,seenCount(),'answer every question at least once');
  const firstGrad = grads.findIndex(m=>!m.earned);
  const journey = [];
  if (!explorer.earned) journey.push(explorer);
  if (firstGrad>=0) journey.push(grads[firstGrad]);
  const journeyEarned = [explorer,...grads].filter(m=>m.earned).reverse();
  return [
    {name:'Perfect levels',        seq:[1,5,25].map(t=>medal('Perfect ×'+t,'star',t,perf,'levels with every answer correct'))},
    {name:'Lightning fast levels', seq:[1,5,25].map(t=>medal('Lightning ×'+t,'bolt',t,light,'levels with every answer quick'))},
    {name:'Correct answer streak', seq:[10,25,50].map(t=>medal('Streak '+t,'flame',t,streak,'correct answers in a row'))},
    {name:'Devotion to learning',  seq:[3,7,30].map(t=>medal(t+' Day Devotion','sun',t,days,'days played in a row'))},
    {name:'Learning journey',      pending:journey, shelf:journeyEarned},
    {name:'Multiplication facts mastered', seq:[20,40,60,78].map(t=>medal(t+' mastered','trophy',t,mc,'multiplication facts mastered'))},
  ];
}
function medalEl(m){
  const d = el('div','pg-badge'+(m.earned?'':' locked'));
  const med = el('div','med');
  med.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">'+GLYPHS[m.glyph]+'</svg>'+
    '<span class="tn">'+m.target+'</span>';
  d.appendChild(med);
  d.appendChild(el('div','bn', m.label));
  if (!m.earned){
    const bp = el('div','bp'), f = el('i');
    f.style.width = Math.round(_clamp(m.val/m.target,0,1)*100)+'%';
    bp.appendChild(f);
    d.appendChild(bp);
    d.appendChild(el('div','bl', Math.min(m.val,m.target)+' / '+m.target));
  }
  d.title = m.what;
  return d;
}
function familyRow(fam){
  const row = el('div','pg-fam');
  row.appendChild(el('h3',null,fam.name));
  const strip = el('div','strip');
  let pending, shelf;
  if (fam.seq){
    const idx = fam.seq.findIndex(m=>!m.earned);
    pending = idx>=0 ? [fam.seq[idx]] : [];
    shelf = fam.seq.filter(m=>m.earned).reverse();   // newest earned first
  } else {
    pending = fam.pending; shelf = fam.shelf;
  }
  pending.forEach(m=>strip.appendChild(medalEl(m)));
  shelf.forEach(m=>strip.appendChild(medalEl(m)));
  row.appendChild(strip);
  return row;
}

/* ---------- page sections ---------- */
function journeyRow(label, mode){
  const row = el('div','pg-journey');
  row.appendChild(el('span','jl', label));
  const done = (BESTS[mode]||0) >= LADDER_LEN[mode];
  const t = el('div','mt'), f = el('i');
  const pc = _clamp((BESTS[mode]||0)/LADDER_LEN[mode], 0, 1);
  f.style.width = Math.round(pc*100)+'%';
  f.style.background = done ? TIERCOL[4] : '#e8b64c';
  t.appendChild(f); row.appendChild(t);
  row.appendChild(el('span','jv', done ? '\u2713' : (BESTS[mode]||0)+' / '+LADDER_LEN[mode]));
  if (done) row.querySelector('.jv').classList.add('done');
  return row;
}
function fmtDur(ms){
  const s = Math.round(ms/1000);
  return Math.floor(s/60)+':'+pad(s%60);
}
function buildGrid(){
  // grid lives in a pan-able scroller so it can never be clipped, even
  // on engines that size grid tracks generously (iOS Safari)
  const wrap=el('div','pg-gridwrap');
  const g=el('div','pg-grid');
  const done={}; for(let t=1;t<=12;t++) done[t]=tableMastered(t);
  g.appendChild(el('div','ax'));
  for(let c=1;c<=12;c++) g.appendChild(el('div','ax'+(done[c]?' axdone':''), c));
  for(let r=1;r<=12;r++){
    g.appendChild(el('div','ax'+(done[r]?' axdone':''), r));
    for(let c2=1;c2<=12;c2++){
      const t=tierOf(r,c2);
      const cell2=el('div','cell'+(t?' t'+t:' off')+((t&&(done[r]||done[c2]))?' band':''));
      cell2.appendChild(el('span',null,r*c2));   // the product, subtly
      if(t){
        cell2.style.background=TIERCOL[t];
        const w=factWin(r,c2);
        cell2.title=r+' \u00d7 '+c2+' \u2014 quick on '+w.qk+' of your last '+w.m+' answers';
      } else {
        cell2.title=r+' \u00d7 '+c2+' \u2014 not asked yet';
      }
      g.appendChild(cell2);
    }
  }
  wrap.appendChild(g);
  return wrap;
}

function showProgress(){
  const body=document.getElementById('pgbody');
  body.innerHTML='';

  // your journey
  const s1=el('div','pg-sec first');
  s1.appendChild(el('h2',null,'Your journey'));
  s1.appendChild(journeyRow(MODENAME.beginner,'beginner'));
  s1.appendChild(journeyRow(MODENAME.regular,'regular'));
  s1.appendChild(journeyRow(MODENAME.expert,'expert'));
  body.appendChild(s1);

  // badges: one row per family, next target on the left, trophies right
  const s3=el('div','pg-sec');
  s3.appendChild(el('h2',null,'Badges'));
  badgeFamilies().forEach(f=>s3.appendChild(familyRow(f)));
  body.appendChild(s3);

  // mastery meter + grid
  const s4=el('div','pg-sec');
  s4.appendChild(el('h2',null,'Times table'));
  const mm=el('div','pg-meter');
  const mh2=el('div','mh');
  mh2.appendChild(el('span',null,'Multiplication facts mastered'));
  const mc=masteredCount();
  mh2.appendChild(Object.assign(el('b'),{textContent:mc+' / '+ALLPAIRS.length}));
  mm.appendChild(mh2);
  const mt=el('div','mt'), mf=el('i');
  mf.style.width=Math.round(mc/ALLPAIRS.length*100)+'%';
  mf.style.background=TIERCOL[4];
  mt.appendChild(mf); mm.appendChild(mt);

  // answer speed: live rolling-window average against the title targets
  const pm=el('div','pg-meter');
  const ph2=el('div','mh');
  ph2.appendChild(el('span',null,'Answer speed'));
  const pace=currentPace();
  ph2.appendChild(Object.assign(el('b'),{textContent: pace ? (pace/1000).toFixed(1).replace(/\.0$/,'')+'s per answer' : '—'}));
  pm.appendChild(ph2);
  const pt=el('div','mt pace');
  const pf=el('i');
  const pc2 = pace ? _clamp((PACE_SLOW-pace)/(PACE_SLOW-PACE_FAST),0,1) : 0;
  pf.style.width=Math.round(pc2*100)+'%';
  // fill colour walks the grid's four mastery tiers as pace crosses the
  // ticks: >5s brick red, 5–3s orange, 3–1.5s yellow, ≤1.5s grass green
  pf.style.background = !pace ? TIERCOL[1]
    : pace<=1500 ? TIERCOL[4] : pace<=3000 ? TIERCOL[3]
    : pace<=5000 ? TIERCOL[2] : TIERCOL[1];
  pt.appendChild(pf);
  for (const [ms] of PACE_TICKS){                // ticks are permanent scale marks
    const tk=el('i','tick');
    tk.style.left = Math.round((PACE_SLOW-ms)/(PACE_SLOW-PACE_FAST)*100)+'%';
    pt.appendChild(tk);
  }
  pm.appendChild(pt);
  const pl=el('div','pg-pacelbls');
  pl.appendChild(el('span',null,'slower'));
  for (const [ms,lbl] of PACE_TICKS){
    const s=el('span','t',lbl);
    s.style.left = Math.round((PACE_SLOW-ms)/(PACE_SLOW-PACE_FAST)*100)+'%';
    pl.appendChild(s);
  }
  pm.appendChild(pl);
  s4.appendChild(pm);          // speed first…
  s4.appendChild(mm);          // …then the mastery meter, touching its grid
  s4.appendChild(buildGrid());
  const lg=el('div','pg-legend');
  lg.appendChild(el('span',null,'Still practicing'));
  const pills=el('span','pg-pills');
  TIERCOL.slice(1).forEach(c=>{ const i2=el('i'); i2.style.background=c; pills.appendChild(i2); });
  lg.appendChild(pills);
  lg.appendChild(el('span',null,'Mastered'));
  s4.appendChild(lg);
  const kk=el('div','pg-key');
  kk.appendChild(el('i')); kk.appendChild(el('span',null,'Not asked yet'));
  s4.appendChild(kk);
  body.appendChild(s4);

  // share
  const sw=el('div','pg-share');
  const sb=el('button',null,'Share my progress');
  sb.addEventListener('click',()=>{ audio(); sTap(); shareNow(); });
  sw.appendChild(sb);
  body.appendChild(sw);

  // clear
  const cw2=el('div','pg-clear');
  const cl=el('button','link','Clear my history');
  cl.addEventListener('click',()=>{
    if(confirm('Clear all your progress? This cannot be undone.')){
      ST={f:{},h:[],rec:{streak:0,fast:0,days:0,pt:[]}}; saveStats();
      for (const m of ['beginner','regular','expert']){
        try{ localStorage.removeItem('ml-best-'+m); }catch(e){}
        BESTS[m]=0;
      }
      try{ localStorage.setItem(MKEY,'[]'); }catch(e){}
      pgEl.style.display='none';
    }
  });
  cw2.appendChild(cl);
  body.appendChild(cw2);

  pgEl.style.display='block';
  pgEl.scrollTop=0;
}


/* ================================================================
   MEDAL AWARDS — video-game coin style. Earned medals are diffed
   against a persisted list at the end of every level (never mid-play)
   and new ones pop in rapid succession, each with a rising "bling".
   ================================================================ */
const MKEY = 'ml-medals';
function allMedals(){
  const out = [];
  for (const fam of badgeFamilies()){
    const list = fam.seq || [...(fam.pending||[]), ...(fam.shelf||[])];
    for (const m of list) out.push({key: m.glyph+'|'+m.target+'|'+m.label, m});
  }
  return out;
}
function loadMedalKeys(){
  try{ return new Set(JSON.parse(localStorage.getItem(MKEY)||'[]')); }catch(e){ return new Set(); }
}
function saveMedalKeys(set){
  try{ localStorage.setItem(MKEY, JSON.stringify([...set])); }catch(e){}
}
// diff earned medals against the persisted list; returns the new ones
function checkNewMedals(){
  const seen = loadMedalKeys();
  const fresh = [];
  for (const {key, m} of allMedals()){
    if (m.earned && !seen.has(key)){ seen.add(key); fresh.push(m); }
  }
  if (fresh.length) saveMedalKeys(seen);
  return fresh;
}
function blingSound(i){
  audio();
  const step = Math.pow(1.1225, i);          // each medal a tone higher
  beep(988*step, 0.07, 'square', 0.055);
  beep(1319*step, 0.30, 'square', 0.055, 0.07);
}
function medalBlings(medals, delay){
  if (!medals.length) return;
  const wrap = document.createElement('div');
  wrap.className = 'mtoasts';
  document.body.appendChild(wrap);
  medals.forEach((m, i)=>{
    setTimeout(()=>{
      if (!wrap.parentNode) return;
      blingSound(i);
      const d = document.createElement('div');
      d.className = 'mtoast';
      d.innerHTML = '<span class="mmed"><svg viewBox="0 0 24 24" aria-hidden="true">'
        +GLYPHS[m.glyph]+'</svg><i></i><i></i><i></i><i></i></span>'
        +'<span class="mlbl">'+m.label+'</span>';
      wrap.appendChild(d);
    }, (delay||250) + i*430);
  });
  setTimeout(()=>wrap.remove(), (delay||250) + medals.length*430 + 2600);
}
// call at the end of a level (either game); optional delay for ceremonies
function awardNewMedals(delay){
  const fresh = checkNewMedals();
  medalBlings(fresh, delay);
  return fresh;
}

/* ================================================================
   SHARING — a short first-person message with the game's URL on its
   own line, sent through the Web Share API (clipboard fallback).
   No attached image: messaging apps unfurl the URL into a rich link
   preview using the pages' OG tags, and that card is the visual.
   The message is the player's single best current highlight.
   ================================================================ */
const SHARE_URL = 'https://jbromwich.github.io/PopTimes/';

// message priority: highest true row wins (live numbers)
function shareInfo(){
  const mc = masteredCount();
  if (mc >= ALLPAIRS.length)
    return {msg:'I mastered the WHOLE times table on PopTimes!'};
  if (mc >= 20)
    return {msg:'I’ve mastered '+mc+' multiplication facts on PopTimes!'};
  if ((ST.rec.streak||0) >= 25)
    return {msg:'I got '+ST.rec.streak+' right answers in a row on PopTimes!'};
  const days = Math.max(ST.rec.days||0, dayStreak());
  if (days >= 3)
    return {msg:'I’ve played PopTimes '+days+' days in a row!'};
  if (ST.h.some(r=>r.n>0 && r.c===r.n))
    return {msg:'I scored a perfect level on PopTimes!'};
  return {msg:'I’m a PopTimes '+heldTitle()+' — come play the times-tables game with me!'};
}
// shared from a graduation card: the promotion itself is the message
function gradShareInfo(mode){
  return mode==='expert'
    ? {msg:'I’m now a PopTimes Professor — I’ve mastered my times tables!'}
    : {msg:'I’m now a PopTimes '+GRAD_TITLE[mode]+'!'};
}

async function shareNow(info){
  info = info || shareInfo();
  const text = info.msg + '\n' + SHARE_URL;
  try{
    if (navigator.share){
      await navigator.share({text});
      return;
    }
    throw new Error('no-share');
  }catch(e){
    if (e && e.name === 'AbortError') return;   // user closed the sheet
    try{
      await navigator.clipboard.writeText(text);
      alert('Copied to your clipboard — paste it anywhere!');
    }catch(e2){
      alert(text);
    }
  }
}

loadStats();
BESTS = loadBests();
// first run after the medal-award update: mark already-earned medals as
// seen so history isn't retro-celebrated
if (!localStorage.getItem(MKEY))
  saveMedalKeys(new Set(allMedals().filter(x=>x.m.earned).map(x=>x.key)));
