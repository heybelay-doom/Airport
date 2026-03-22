/* ═══════════════════════════════════════════
   THE LINE — TSA Queue Simulator
   game.js — All game logic
   ═══════════════════════════════════════════ */

const STATE = {
  stepsTaken: 0,
  queuePosition: 847,
  scannerDistance: 847,
  elapsedMs: 0,
  taxDollarsWasted: 0,
  isFrozen: false,
  extraClicksRequired: 0,
  extraClicksDone: 0,
  eventsExperienced: 0,
  totalFreezes: 0,
  survivedResets: 0,
  fakeReopensSurvived: 0,
  halfStepsUntil: 0,
  unlockedAchievements: new Set(),
  fakeReopenActive: false,
};

const ETA_MESSAGES = [
  'ETA: After next election',
  'ETA: Next fiscal year',
  'ETA: Once bipartisanship returns',
  'ETA: When pigs fly (pending approval)',
  'ETA: Heat death of universe ± 5 min',
  'ETA: After the audit of the audit',
  'ETA: TBD by committee',
];

const EVENTS = [
  { id: 'tsa_home',       title: 'TSA Agent Goes Home',              body: 'Their shift ended three hours ago.\nVolunteer replacement pending.', severity: 'major',        weight: 3, effect: { type: 'pushback_freeze', pushback: 15, freeze: 3 } },
  { id: 'new_form',       title: 'New Security Form Required',       body: 'Form 27-B stroke 6.\nPlease fill out in triplicate.',              severity: 'minor',        weight: 5, effect: { type: 'extraClicks', clicks: 8 } },
  { id: 'budget_freeze',  title: 'Budget Freeze',                    body: 'All operations suspended\npending appropriations review.',           severity: 'major',        weight: 3, effect: { type: 'freeze', duration: 8 } },
  { id: 'mystery_liquid', title: 'Mystery Liquid Detected',          body: 'Your water bottle has been\nflagged for further analysis.',           severity: 'minor',        weight: 5, effect: { type: 'pushback', pushback: 5 } },
  { id: 'crocs_alarm',    title: 'Crocs Set Off Alarm',              body: 'Footwear threat level\nelevated to orange.',                         severity: 'major',        weight: 3, effect: { type: 'freeze', duration: 10 } },
  { id: 'senate_recess',  title: 'Senate Recess Announced',          body: 'Congress will reconvene\nat their earliest convenience.',             severity: 'minor',        weight: 4, effect: { type: 'pushback', pushback: 10 } },
  { id: 'flight_delayed', title: 'Your Flight Has Been Delayed',     body: 'Good news — you have\nmore time in line.',                           severity: 'info',         weight: 5, effect: { type: 'none' } },
  { id: 'esa_escape',     title: 'Emotional Support Animal Escapes', body: 'A peacock is loose\nin Terminal B.',                                 severity: 'major',        weight: 2, effect: { type: 'freeze', duration: 12 } },
  { id: 'senate_vote',    title: 'Random Senate Vote',               body: 'A vote has been called.\nOutcome uncertain.',                         severity: 'minor',        weight: 4, effect: { type: 'coinflip', pushback: 20, advance: 5 } },
  { id: 'cafe_strike',    title: 'Cafeteria Union Strike',           body: 'No coffee available\nuntil further notice.',                          severity: 'minor',        weight: 4, effect: { type: 'freeze', duration: 6 } },
  { id: 'govt_reopen',    title: 'Government Reopened!',             body: 'Operations resuming\nimmediately!',                                   severity: 'good',         weight: 2, effect: { type: 'fakeReopen' } },
  { id: 'printer_ink',    title: 'Printer Out of Ink',               body: 'Boarding pass reprinting\nrequires manual override.',                  severity: 'minor',        weight: 4, effect: { type: 'extraClicks', clicks: 12 } },
  { id: 'new_admin',      title: 'New Administration',               body: 'All prior progress has been\ndeclassified and archived.',              severity: 'catastrophic', weight: 1, effect: { type: 'reset' } },
  { id: 'wifi_luxury',    title: 'Wi-Fi Reclassified as Luxury',     body: 'Airport Wi-Fi now requires\nSenate confirmation.',                    severity: 'info',         weight: 5, effect: { type: 'ticker', text: 'WI-FI RECLASSIFIED AS NON-ESSENTIAL LUXURY — STREAMING PRIVILEGES REVOKED' } },
  { id: 'tsa_yoga',       title: 'TSA Pivots to Yoga',               body: 'Mandatory mindfulness break.\nPlease center yourself.',               severity: 'catastrophic', weight: 1, effect: { type: 'freeze_breath', duration: 30 } },
  { id: 'db_corrupt',     title: 'Queue Database Corrupted',         body: 'SYSTEM ERROR 0x4F4F50\nRecovering from backup...',                    severity: 'catastrophic', weight: 1, effect: { type: 'reset' } },
  { id: 'congress_recess',title: 'Congressional Recess Extended',    body: 'Members unavailable.\nPlease hold.',                                  severity: 'catastrophic', weight: 1, effect: { type: 'pushback_freeze', pushback: 30, freeze: 25 } },
  { id: 'biometric',      title: 'Biometric Verification Required',  body: 'Please blink 20 times\nfor identity confirmation.',                  severity: 'major',        weight: 2, effect: { type: 'extraClicks', clicks: 20 } },
  { id: 'debt_ceiling',   title: 'Debt Ceiling Reached',             body: 'Scanner distance increased\nper fiscal regulation.',                  severity: 'catastrophic', weight: 1, effect: { type: 'freeze_multiply', freeze: 20, multiply: 1.5 } },
  { id: 'sequestration',  title: 'Sequestration',                    body: 'All forward progress\nreduced by 50% for 60 seconds.',               severity: 'major',        weight: 2, effect: { type: 'halfSteps', duration: 60 } },
];

const ACHIEVEMENTS = [
  { id: 'first_step',     label: 'First Step',               desc: 'Took your first step',           check: () => STATE.stepsTaken >= 1 },
  { id: 'centennial',     label: 'Centennial Shuffle',       desc: '100 steps taken',                check: () => STATE.stepsTaken >= 100 },
  { id: 'decade',         label: 'Decade of Minutes',        desc: '10 minutes wasted',              check: () => STATE.elapsedMs >= 600000 },
  { id: 'sisyphus',       label: 'Sisyphus Mode',            desc: 'Survived a full reset',          check: () => STATE.survivedResets > 0 },
  { id: 'fool_me',        label: 'Fool Me Once',             desc: 'Survived a fake reopen',         check: () => STATE.fakeReopensSurvived > 0 },
  { id: 'veteran',        label: 'Veteran of Bureaucracy',   desc: '10 events experienced',          check: () => STATE.eventsExperienced >= 10 },
  { id: 'tax_dollars',    label: 'Your Tax Dollars at Work', desc: '$1,000 wasted',                  check: () => STATE.taxDollarsWasted >= 1000 },
  { id: 'cryogenic',      label: 'Cryogenic Civil Servant',  desc: 'Frozen 5 times',                 check: () => STATE.totalFreezes >= 5 },
  { id: 'wrong_way',      label: 'Wrong Direction',          desc: 'Position went above 847',        check: () => STATE.queuePosition > 847 },
  { id: 'long_session',   label: 'Longer Than a Senate Session', desc: '25 minutes wasted',          check: () => STATE.elapsedMs >= 1500000 },
  { id: 'budget_passed',  label: 'Budget Passed',            desc: '???',                            check: () => false, impossible: true },
];

/* ── DOM Refs ──────────────────────────────── */
const DOM = {};

/* ── Game Object ───────────────────────────── */
const Game = {
  startTime: null,
  lastFrame: null,
  eventTimer: null,
  queueNPCs: 30,

  init() {
    DOM.stepBtn         = document.getElementById('step-btn');
    DOM.stepBtnText     = document.getElementById('step-btn-text');
    DOM.statPosition    = document.getElementById('stat-position');
    DOM.statSteps       = document.getElementById('stat-steps');
    DOM.statTime        = document.getElementById('stat-time');
    DOM.statDollars     = document.getElementById('stat-dollars');
    DOM.progressFill    = document.getElementById('progress-bar-fill');
    DOM.progressPct     = document.getElementById('progress-pct');
    DOM.progressFootnote= document.getElementById('progress-footnote');
    DOM.scannerEta      = document.getElementById('scanner-eta');
    DOM.queueTrack      = document.getElementById('queue-track');
    DOM.queueViewport   = document.getElementById('queue-viewport');
    DOM.playerChar      = document.getElementById('player-char');
    DOM.eventLogList    = document.getElementById('event-log-list');
    DOM.achievementsList= document.getElementById('achievements-list');
    DOM.freezeOverlay   = document.getElementById('freeze-overlay');
    DOM.freezeTitle     = document.getElementById('freeze-title');
    DOM.freezeBody      = document.getElementById('freeze-body');
    DOM.freezeCountdown = document.getElementById('freeze-countdown');
    DOM.freezeBreath    = document.getElementById('freeze-breath');
    DOM.breathText      = document.getElementById('breath-text');
    DOM.toastContainer  = document.getElementById('toast-container');
    DOM.extraClicks     = document.getElementById('extra-clicks-indicator');
    DOM.tickerContent   = document.getElementById('ticker-content');

    DOM.stepBtn.addEventListener('click', () => Game.step());
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        Game.step();
      }
    });

    this.renderQueue();
    this.renderAchievements();
    this.startTime = performance.now();
    this.lastFrame = this.startTime;
    this.scheduleEvent();
    requestAnimationFrame((t) => this.loop(t));
  },

  loop(timestamp) {
    const dt = timestamp - this.lastFrame;
    this.lastFrame = timestamp;

    STATE.elapsedMs += dt;
    STATE.taxDollarsWasted = Math.floor(STATE.elapsedMs / 1000 * 0.42);

    if (STATE.halfStepsUntil > 0) {
      STATE.halfStepsUntil -= dt / 1000;
      if (STATE.halfStepsUntil <= 0) {
        STATE.halfStepsUntil = 0;
        this.addLog('Sequestration period ended.', 'info');
      }
    }

    this.updateStats();
    this.checkAchievements();

    requestAnimationFrame((t) => this.loop(t));
  },

  step() {
    if (STATE.isFrozen) return;

    if (STATE.extraClicksRequired > 0) {
      STATE.extraClicksDone++;
      const remaining = STATE.extraClicksRequired - STATE.extraClicksDone;
      DOM.extraClicks.textContent = remaining > 0 ? `${remaining} clicks remaining` : '';
      if (remaining <= 0) {
        STATE.extraClicksRequired = 0;
        STATE.extraClicksDone = 0;
        this.addLog('Form completed. Resuming.', 'info');
      }
      return;
    }

    let advance = 1;
    if (STATE.halfStepsUntil > 0) advance = 0.5;
    if (STATE.fakeReopenActive) advance = 2;

    STATE.stepsTaken++;
    STATE.queuePosition = Math.max(1, STATE.queuePosition - advance);

    // Bounce animation
    DOM.playerChar.classList.remove('step-bounce');
    void DOM.playerChar.offsetWidth;
    DOM.playerChar.classList.add('step-bounce');

    // Float text
    this.showFloatText(`-${advance}`, 'positive');

    // Scroll queue
    this.scrollQueue();

    // Cycle ETA
    if (STATE.stepsTaken % 7 === 0) {
      DOM.scannerEta.textContent = ETA_MESSAGES[Math.floor(Math.random() * ETA_MESSAGES.length)];
    }
  },

  scrollQueue() {
    const pct = Math.min(STATE.stepsTaken / (STATE.scannerDistance || 847), 1);
    const offset = pct * (this.queueNPCs * 20);
    DOM.queueTrack.style.transform = `translateY(-${offset}px)`;
  },

  showFloatText(text, type) {
    const el = document.createElement('div');
    el.className = `float-text ${type}`;
    el.textContent = text;
    const wrapper = document.getElementById('queue-track-wrapper');
    el.style.top = `${wrapper.offsetHeight - 40}px`;
    wrapper.appendChild(el);
    setTimeout(() => el.remove(), 700);
  },

  renderQueue() {
    DOM.queueTrack.innerHTML = '';
    for (let i = 0; i < this.queueNPCs; i++) {
      const person = document.createElement('div');
      person.className = 'queue-person';
      const dot = document.createElement('div');
      dot.className = 'dot';
      // Slightly randomize dot position
      dot.style.marginLeft = `${(Math.random() - 0.5) * 20}px`;
      person.appendChild(dot);
      DOM.queueTrack.appendChild(person);

      if ((i + 1) % 5 === 0 && i < this.queueNPCs - 1) {
        const rope = document.createElement('div');
        rope.className = 'queue-rope';
        rope.innerHTML = '<div class="rope-line"></div>';
        DOM.queueTrack.appendChild(rope);
      }
    }
  },

  updateStats() {
    DOM.statPosition.textContent = Math.ceil(STATE.queuePosition);
    DOM.statSteps.textContent = STATE.stepsTaken;

    const totalSec = Math.floor(STATE.elapsedMs / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    DOM.statTime.textContent = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;

    DOM.statDollars.textContent = `$${STATE.taxDollarsWasted.toLocaleString()}`;

    // Progress bar — log scale, capped at 38.5%
    const pct = Math.min(38.5, Math.log1p(STATE.stepsTaken) / Math.log1p(1000) * 38.5);
    DOM.progressFill.style.width = `${pct}%`;
    DOM.progressPct.textContent = `${pct.toFixed(1)}%`;
  },

  /* ── Events ──────────────────────────────── */

  scheduleEvent() {
    const delay = 10000 + Math.random() * 10000; // 10-20s
    this.eventTimer = setTimeout(() => {
      this.fireRandomEvent();
      this.scheduleEvent();
    }, delay);
  },

  fireRandomEvent() {
    // Weighted random selection
    const totalWeight = EVENTS.reduce((sum, e) => sum + e.weight, 0);
    let roll = Math.random() * totalWeight;
    let chosen = EVENTS[0];
    for (const evt of EVENTS) {
      roll -= evt.weight;
      if (roll <= 0) { chosen = evt; break; }
    }
    this.applyEvent(chosen);
  },

  applyEvent(evt) {
    STATE.eventsExperienced++;

    this.showToast(evt.title, evt.body, evt.severity);
    this.addLog(evt.title, this.severityToLogClass(evt.severity));

    const eff = evt.effect;
    switch (eff.type) {
      case 'pushback':
        this.pushback(eff.pushback);
        break;
      case 'freeze':
        this.showFreeze(evt, eff.duration, false);
        break;
      case 'pushback_freeze':
        this.pushback(eff.pushback);
        this.showFreeze(evt, eff.freeze, false);
        break;
      case 'extraClicks':
        STATE.extraClicksRequired = eff.clicks;
        STATE.extraClicksDone = 0;
        DOM.extraClicks.textContent = `${eff.clicks} clicks remaining`;
        break;
      case 'coinflip':
        if (Math.random() < 0.5) {
          this.pushback(eff.pushback);
          this.addLog(`Vote failed. Pushed back ${eff.pushback}.`, 'major');
        } else {
          STATE.queuePosition = Math.max(1, STATE.queuePosition - eff.advance);
          this.showFloatText(`-${eff.advance}`, 'positive');
          this.addLog(`Vote passed. Advanced ${eff.advance}.`, 'good');
        }
        break;
      case 'fakeReopen':
        this.startFakeReopen();
        break;
      case 'reset':
        STATE.queuePosition = 847;
        STATE.survivedResets++;
        this.scrollQueue();
        DOM.queueViewport.classList.add('pushback-flash');
        setTimeout(() => DOM.queueViewport.classList.remove('pushback-flash'), 400);
        this.addLog('Position reset to 847.', 'catastrophic');
        break;
      case 'ticker':
        this.addTicker(eff.text);
        break;
      case 'freeze_breath':
        this.showFreeze(evt, eff.duration, true);
        break;
      case 'freeze_multiply':
        STATE.scannerDistance = Math.ceil(STATE.scannerDistance * eff.multiply);
        this.showFreeze(evt, eff.freeze, false);
        break;
      case 'halfSteps':
        STATE.halfStepsUntil = eff.duration;
        this.addLog('All progress halved for 60 seconds.', 'major');
        break;
      case 'none':
        break;
    }
  },

  pushback(amount) {
    STATE.queuePosition += amount;
    this.showFloatText(`+${amount}`, 'negative');
    this.scrollQueue();
    DOM.queueViewport.classList.add('pushback-flash');
    setTimeout(() => DOM.queueViewport.classList.remove('pushback-flash'), 400);
  },

  severityToLogClass(sev) {
    const map = { info: 'info', minor: 'minor', major: 'major', catastrophic: 'catastrophic', good: 'good' };
    return map[sev] || 'info';
  },

  /* ── Freeze Overlay ──────────────────────── */

  showFreeze(evt, duration, showBreathing) {
    STATE.isFrozen = true;
    STATE.totalFreezes++;
    DOM.stepBtn.disabled = true;
    DOM.stepBtn.classList.add('breathing');

    DOM.freezeTitle.textContent = evt.title;
    DOM.freezeBody.textContent = evt.body;
    DOM.freezeOverlay.classList.remove('hidden');

    if (showBreathing) {
      DOM.freezeBreath.classList.remove('hidden');
      this.animateBreathing(duration);
    } else {
      DOM.freezeBreath.classList.add('hidden');
    }

    let remaining = duration;
    DOM.freezeCountdown.textContent = remaining;
    const interval = setInterval(() => {
      remaining--;
      DOM.freezeCountdown.textContent = remaining > 0 ? remaining : '';
      if (remaining <= 0) {
        clearInterval(interval);
        this.endFreeze();
      }
    }, 1000);
  },

  animateBreathing(duration) {
    let phase = 0;
    const texts = ['Breathe in...', 'Hold...', 'Breathe out...', 'Hold...'];
    const interval = setInterval(() => {
      DOM.breathText.textContent = texts[phase % 4];
      phase++;
    }, 4000);
    setTimeout(() => clearInterval(interval), duration * 1000);
  },

  endFreeze() {
    STATE.isFrozen = false;
    DOM.freezeOverlay.classList.add('hidden');
    DOM.stepBtn.disabled = false;
    DOM.stepBtn.classList.remove('breathing');
    this.addLog('Operations resumed.', 'info');
  },

  /* ── Fake Reopen ─────────────────────────── */

  startFakeReopen() {
    STATE.fakeReopenActive = true;
    this.addLog('Government reopened! Double speed!', 'good');
    DOM.queueViewport.classList.add('good-flash');

    setTimeout(() => {
      STATE.fakeReopenActive = false;
      STATE.fakeReopensSurvived++;
      DOM.queueViewport.classList.remove('good-flash');
      this.showToast('Just Kidding', 'Shutdown resumes.\nWe apologize for the\nfalse hope.', 'catastrophic');
      this.addLog('Government shutdown resumed. False alarm.', 'catastrophic');
      this.addTicker('CORRECTION: GOVERNMENT HAS NOT REOPENED — PREVIOUS REPORT WAS "ASPIRATIONAL"');
    }, 5000);
  },

  /* ── Toast ───────────────────────────────── */

  showToast(title, body, severity) {
    const toast = document.createElement('div');
    toast.className = `toast ${severity || 'info'}`;
    toast.innerHTML = `<div class="toast-title">${title}</div><div class="toast-body">${body.replace(/\n/g, '<br>')}</div>`;
    DOM.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('out');
      setTimeout(() => toast.remove(), 400);
    }, 3000);
  },

  /* ── Event Log ───────────────────────────── */

  addLog(text, severity) {
    const li = document.createElement('li');
    const totalSec = Math.floor(STATE.elapsedMs / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    const time = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;

    li.className = `log-entry log-${severity || 'info'}`;
    li.innerHTML = `<span class="log-time">${time}</span>${text}`;

    DOM.eventLogList.insertBefore(li, DOM.eventLogList.firstChild);

    // Keep max 50 entries
    while (DOM.eventLogList.children.length > 50) {
      DOM.eventLogList.removeChild(DOM.eventLogList.lastChild);
    }
  },

  /* ── Ticker ──────────────────────────────── */

  addTicker(text) {
    const current = DOM.tickerContent.textContent;
    DOM.tickerContent.textContent = text + ' \u00A0\u00A0\u00A0\u00B7\u00A0\u00A0\u00A0 ' + current;
  },

  /* ── Achievements ────────────────────────── */

  renderAchievements() {
    DOM.achievementsList.innerHTML = '';
    for (const ach of ACHIEVEMENTS) {
      const div = document.createElement('div');
      const unlocked = STATE.unlockedAchievements.has(ach.id);
      const cls = ach.impossible ? 'impossible' : (unlocked ? 'unlocked' : 'locked');
      div.className = `achievement-item ${cls}`;
      div.id = `ach-${ach.id}`;
      div.textContent = `${ach.label}`;
      div.title = ach.desc;
      DOM.achievementsList.appendChild(div);
    }
  },

  checkAchievements() {
    for (const ach of ACHIEVEMENTS) {
      if (ach.impossible) continue;
      if (STATE.unlockedAchievements.has(ach.id)) continue;
      if (ach.check()) {
        STATE.unlockedAchievements.add(ach.id);
        const el = document.getElementById(`ach-${ach.id}`);
        if (el) {
          el.className = 'achievement-item unlocked';
        }
        this.showToast(ach.label, ach.desc, 'achievement');
        this.addLog(`Achievement: ${ach.label}`, 'good');
      }
    }
  },
};

/* ── Boot ───────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => Game.init());
