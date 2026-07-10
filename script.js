(function () {
  const GRID_COLS = 64,
    GRID_ROWS = 64;
  const LEFT_CANVAS = 1,
    RIGHT_CANVAS = 17;

  // New center-relative gaze offset mapping for the 64x64 grid
  const GAZE = {
    center: { dx: 0, dy: 0 },
    left: { dx: -3, dy: 0 },
    right: { dx: 3, dy: 0 },
    up: { dx: 0, dy: -3 },
    down: { dx: 0, dy: 3 },
  };

  const STATE_META = {
    idle: {
      color: '--c-idle',
      glow: '--c-idle-glow',
      label: 'IDLE',
      mood: 0,
      pattern: 'idle_open',
    },
    dnd: {
      color: '--c-dnd',
      glow: '--c-dnd-glow',
      label: 'DND',
      mood: 1,
      pattern: 'dnd',
    },
    battery: {
      color: '--c-battery',
      glow: '--c-battery-glow',
      label: 'LOW BATTERY',
      mood: 2,
      pattern: 'battery',
    },
    alert: {
      color: '--c-alert',
      glow: '--c-alert-glow',
      label: 'ALERT',
      mood: 3,
      pattern: 'alert',
    },
    charging: {
      color: '--c-charging',
      glow: '--c-charging-glow',
      label: 'CHARGING',
      mood: 4,
      pattern: 'charging',
    },
    busy: {
      color: '--c-busy',
      glow: '--c-busy-glow',
      label: 'BUSY / FOCUS',
      mood: 5,
      pattern: 'busy',
    },
    sleepy: {
      color: '--c-sleepy',
      glow: '--c-sleepy-glow',
      label: 'SLEEPY / BEDTIME',
      mood: 6,
      pattern: 'sleepy',
    },
    happy: {
      color: '--c-happy',
      glow: '--c-happy-glow',
      label: 'HAPPY',
      mood: 7,
      pattern: 'happy',
    },
  };

  const GAZE_3D = {
    center: {
      glareX: '35%',
      glareY: '25%',
    },
    left: {
      glareX: '40%',
      glareY: '25%',
    },
    right: {
      glareX: '30%',
      glareY: '25%',
    },
    up: {
      glareX: '35%',
      glareY: '30%',
    },
    down: {
      glareX: '35%',
      glareY: '20%',
    },
  };

  const gridEl = document.getElementById('grid');
  const dots = [];
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const d = document.createElement('div');
      d.className = 'dot';
      gridEl.appendChild(d);
      dots.push(d);
    }
  }
  function idx(r, c) {
    return r * GRID_COLS + c;
  }
  function cssVar(name) {
    return getComputedStyle(document.documentElement)
      .getPropertyValue(name)
      .trim();
  }

  function renderPattern(patternKey, colorVar, glowVar, gaze) {
    gaze = gaze || GAZE.center;
    const state = computeState();
    const cssColor = cssVar(colorVar);
    const cssGlow = cssVar(glowVar);

    // Coordinate centers for eyes (perfectly centered vertically on 64x64 grid)
    const leyex = 18, leyey = 32;
    const reyex = 46, reyey = 32;

    // Eyeball ellipse radii (vertical oval shape by default)
    let rx_eyeball = 7.5;
    let ry_eyeball = 10.5;
    let r_pupil = 2.5;

    // State modifiers for eye geometry
    if (state === 'busy') {
      rx_eyeball = 9.5;
      ry_eyeball = 5.5;
      r_pupil = 2.0;
    }

    // eyeball size modifiers for wide/alert states
    let cur_rx = rx_eyeball;
    let cur_ry = ry_eyeball;
    if ((patternKey === 'idle_wide' || state === 'alert') && state !== 'busy') {
      cur_rx = rx_eyeball + 1;
      cur_ry = ry_eyeball + 1;
    }

    // Dynamic breathing offset for peaceful sleep (DND state)
    const breatheOffset = state === 'dnd' ? Math.sin(performance.now() * 0.0022) * 1.3 : 0;

    // Sleepy Zzz animation (floating cycles of three Zs)
    const zCycle = Math.floor(performance.now() / 800) % 3;

    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        let lit = false;

        // Draw sleepy floating Zzzs
        if (state === 'sleepy') {
          if (zCycle === 0) {
            const dx = c - 52, dy = r - 16;
            if (dx >= 0 && dx <= 2 && dy >= 0 && dy <= 2) {
              if (dy === 0 || dy === 2 || dx + dy === 2) lit = true;
            }
          } else if (zCycle === 1) {
            const dx = c - 50, dy = r - 11;
            if (dx >= 0 && dx <= 3 && dy >= 0 && dy <= 3) {
              if (dy === 0 || dy === 3 || dx + dy === 3) lit = true;
            }
          } else if (zCycle === 2) {
            const dx = c - 48, dy = r - 6;
            if (dx >= 0 && dx <= 4 && dy >= 0 && dy <= 4) {
              if (dy === 0 || dy === 4 || dx + dy === 4) lit = true;
            }
          }
        }

        if (!lit) {
          // 1. Draw Left Eye
          let isLeftEye = false;
          if (state === 'dnd') {
            // Happy valley curve sleeping eyes (u shape) with smooth tapering
            const sleepY = leyey + breatheOffset + 1.2 - Math.pow(c - leyex, 2) * 0.08;
            if (Math.abs(r - sleepY) <= 1.1 && Math.abs(c - leyex) <= 8) {
              lit = true;
              isLeftEye = true;
            }
          } else if (currentLid < 0.1) {
            // Closed eye blink line
            if (Math.abs(r - leyey) <= 0.8 && Math.abs(c - leyex) <= 7) {
              lit = true;
              isLeftEye = true;
            }
          } else {
            // Ellipse eyeball formula for oval eyes
            const valEyeball = Math.pow(c - leyex, 2) / Math.pow(cur_rx, 2) + Math.pow(r - leyey, 2) / Math.pow(cur_ry, 2);
            if (valEyeball <= 1.0) {
              // Eyelid vertical crop (dynamic blinks or sleepy droop)
              const vertDist = Math.abs(r - leyey);
              let activeLid = currentLid;
              if (state === 'sleepy') {
                activeLid = 0.45; // sleepy droop
              }
              
              if (vertDist <= cur_ry * activeLid) {
                // Focus cross-gaze or normal gaze
                let pX = leyex + gaze.dx;
                let pY = leyey + gaze.dy;
                if (state === 'busy') {
                  pX = leyex + 2.0; // focused cross-eyed
                  pY = leyey;
                } else if (state === 'sleepy') {
                  pX = leyex;
                  pY = leyey + 2.0; // looking down tired
                }
                
                const distPupil = Math.pow(c - pX, 2) + Math.pow(r - pY, 2);
                if (distPupil > Math.pow(r_pupil, 2)) {
                  lit = true;
                  isLeftEye = true;
                }
              }
            }
            if (state === 'battery' && isLeftEye) {
              if (r < leyey - 2) lit = false;
            }
            if (state === 'happy' && isLeftEye) {
              const smileCurve = leyey + 1.8 - Math.pow(c - leyex, 2) * 0.08;
              if (r > smileCurve) lit = false; // crop bottom to smile crescent
            }
            if (state === 'busy' && isLeftEye) {
              if (Math.abs(r - leyey) > 4.5) lit = false; // flat top and bottom
            }
          }
        }

        if (!lit) {
          // 2. Draw Right Eye
          let isRightEye = false;
          if (state === 'dnd') {
            const sleepY = reyey + breatheOffset + 1.2 - Math.pow(c - reyex, 2) * 0.08;
            if (Math.abs(r - sleepY) <= 1.1 && Math.abs(c - reyex) <= 8) {
              lit = true;
              isRightEye = true;
            }
          } else if (currentLid < 0.1) {
            if (Math.abs(r - reyey) <= 0.8 && Math.abs(c - reyex) <= 7) {
              lit = true;
              isRightEye = true;
            }
          } else {
            const valEyeball = Math.pow(c - reyex, 2) / Math.pow(cur_rx, 2) + Math.pow(r - reyey, 2) / Math.pow(cur_ry, 2);
            if (valEyeball <= 1.0) {
              const vertDist = Math.abs(r - reyey);
              let activeLid = currentLid;
              if (state === 'sleepy') {
                activeLid = 0.45;
              }
              
              if (vertDist <= cur_ry * activeLid) {
                let pX = reyex + gaze.dx;
                let pY = reyey + gaze.dy;
                if (state === 'busy') {
                  pX = reyex - 2.0; // focused cross-eyed
                  pY = reyey;
                } else if (state === 'sleepy') {
                  pX = reyex;
                  pY = reyey + 2.0; // looking down tired
                }

                const distPupil = Math.pow(c - pX, 2) + Math.pow(r - pY, 2);
                if (distPupil > Math.pow(r_pupil, 2)) {
                  lit = true;
                  isRightEye = true;
                }
              }
            }
            if (state === 'battery' && isRightEye) {
              if (r < reyey - 2) lit = false;
            }
            if (state === 'happy' && isRightEye) {
              const smileCurve = reyey + 1.8 - Math.pow(c - reyex, 2) * 0.08;
              if (r > smileCurve) lit = false;
            }
            if (state === 'busy' && isRightEye) {
              if (Math.abs(r - reyey) > 4.5) lit = false;
            }
          }
        }

        // Draw background weather overlay if the dot is not part of the eyes or Zzzs
        if (!lit && weatherType !== 'clear') {
          let weatherLit = false;
          if (weatherType === 'rain') {
            particles.forEach((p) => {
              if (
                Math.round(p.x) === c &&
                r >= Math.round(p.y) &&
                r < Math.round(p.y + p.length)
              ) {
                weatherLit = true;
              }
            });
          } else if (weatherType === 'snow') {
            particles.forEach((p) => {
              if (Math.round(p.x) === c && Math.round(p.y) === r) {
                weatherLit = true;
              }
            });
          }
          
          if (weatherLit) {
            const d = dots[idx(r, c)];
            d.classList.add('lit');
            d.style.backgroundColor = weatherType === 'rain' ? 'rgba(159, 216, 255, 0.28)' : 'rgba(255, 255, 255, 0.35)';
            d.style.setProperty('--dot-glow', 'transparent');
            continue;
          }
        }

        // Apply state and styling to dot element
        const d = dots[idx(r, c)];
        if (lit) {
          d.classList.add('lit');
          d.style.backgroundColor = cssColor;
          d.style.setProperty('--dot-glow', cssGlow);
        } else {
          d.classList.remove('lit');
          d.style.backgroundColor = '';
          d.style.setProperty('--dot-glow', 'transparent');
        }
      }
    }
  }

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('widget')) {
    document.body.classList.add('widget-mode');
  }

  // Parse state variables from URL parameters (allowing configuration from widget URLs)
  const queryMood = urlParams.get('mood');
  let notifCount = parseInt(urlParams.get('notif') || '0', 10);
  let dnd = urlParams.get('dnd') === 'true';
  let battLevel = parseInt(urlParams.get('battery') || '72', 10);
  let charging = urlParams.get('charging') === 'true';
  let focusMode = urlParams.get('focus') === 'true';
  let bedtimeMode = urlParams.get('bedtime') === 'true';
  let happyDay = urlParams.get('happy') === 'true';

  if (queryMood === 'idle') {
    notifCount = 0; dnd = false; battLevel = 72; charging = false; focusMode = false; bedtimeMode = false; happyDay = false;
  } else if (queryMood === 'alert') {
    notifCount = 3; dnd = false; battLevel = 72; charging = false; focusMode = false; bedtimeMode = false; happyDay = false;
  } else if (queryMood === 'dnd') {
    notifCount = 0; dnd = true; battLevel = 72; charging = false; focusMode = false; bedtimeMode = false; happyDay = false;
  } else if (queryMood === 'battery') {
    notifCount = 0; dnd = false; battLevel = 10; charging = false; focusMode = false; bedtimeMode = false; happyDay = false;
  } else if (queryMood === 'charging') {
    notifCount = 0; dnd = false; battLevel = 72; charging = true; focusMode = false; bedtimeMode = false; happyDay = false;
  } else if (queryMood === 'busy') {
    notifCount = 0; dnd = false; battLevel = 72; charging = false; focusMode = true; bedtimeMode = false; happyDay = false;
  } else if (queryMood === 'sleepy') {
    notifCount = 0; dnd = false; battLevel = 72; charging = false; focusMode = false; bedtimeMode = true; happyDay = false;
  } else if (queryMood === 'happy') {
    notifCount = 0; dnd = false; battLevel = 72; charging = false; focusMode = false; bedtimeMode = false; happyDay = true;
  }

  let cursorTracking = urlParams.get('follow') === 'true';
  let weatherType = urlParams.get('weather') || 'clear';
  let particles = [];

  function initParticles() {
    particles = [];
    const count = weatherType === 'rain' ? 12 : (weatherType === 'snow' ? 8 : 0);
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * GRID_COLS,
        y: Math.random() * GRID_ROWS,
        speed: weatherType === 'rain' ? rand(12, 24) : rand(3, 7),
        length: weatherType === 'rain' ? rand(2, 4) : 1,
        drift: weatherType === 'snow' ? rand(-0.8, 0.8) : 0,
      });
    }
  }

  function computeState() {
    if (notifCount > 0) return 'alert';
    if (battLevel <= 15 && !charging) return 'battery';
    if (dnd) return 'dnd';
    if (charging) return 'charging';
    if (focusMode) return 'busy';
    if (bedtimeMode) return 'sleepy';
    if (happyDay) return 'happy';
    return 'idle';
  }
  function isIdle() {
    return computeState() === 'idle';
  }

  const widget = document.getElementById('widget');
  const badge = document.getElementById('badge');
  const statusDot = document.getElementById('statusDot');
  const statusLabel = document.getElementById('statusLabel');
  const formulaBox = document.getElementById('formulaBox');
  const focusSwitch = document.getElementById('focusSwitch');
  const bedtimeSwitch = document.getElementById('bedtimeSwitch');
  const happySwitch = document.getElementById('happySwitch');
  const followSwitch = document.getElementById('followSwitch');
  const shapeSelect = document.getElementById('shapeSelect');
  const weatherSelect = document.getElementById('weatherSelect');

  const reduceMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;
  const delay = (ms) => new Promise((res) => setTimeout(res, ms));
  const rand = (min, max) => min + Math.random() * (max - min);

  function updateGaze(dir) {
    const data = GAZE_3D[dir] || GAZE_3D.center;
    widget.style.setProperty('--glare-x', data.glareX);
    widget.style.setProperty('--glare-y', data.glareY);
  }

  let activePatternKey = 'idle_open';

  let currentGaze = { x: 0, y: 0 };
  let targetGaze = { x: 0, y: 0 };
  let gazeVelocity = { x: 0, y: 0 };

  let currentLid = 1.0;
  let targetLid = 1.0;
  let lidVelocity = 0;

  // Biological eye muscle spring physics coefficients (softer, highly natural movement)
  const GAZE_STIFFNESS = 180;
  const GAZE_DAMPING = 16;

  // Faster spring stiffness for quick organic blinks with tiny elastic rebounds
  const LID_STIFFNESS = 280;
  const LID_DAMPING = 18;

  let lastFrameTime = performance.now();

  function physicsStep(now) {
    let dt = (now - lastFrameTime) / 1000;
    lastFrameTime = now;

    if (dt > 0.05) dt = 0.05; // clamp delta to prevent system instability

    // 1. Solve Gaze Mass-Spring-Damper system
    const forceX = GAZE_STIFFNESS * (targetGaze.x - currentGaze.x) - GAZE_DAMPING * gazeVelocity.x;
    gazeVelocity.x += forceX * dt;
    currentGaze.x += gazeVelocity.x * dt;

    const forceY = GAZE_STIFFNESS * (targetGaze.y - currentGaze.y) - GAZE_DAMPING * gazeVelocity.y;
    gazeVelocity.y += forceY * dt;
    currentGaze.y += gazeVelocity.y * dt;

    // 2. Solve Eyelid Lid-Spring system
    const forceLid = LID_STIFFNESS * (targetLid - currentLid) - LID_DAMPING * lidVelocity;
    lidVelocity += forceLid * dt;
    currentLid += lidVelocity * dt;

    // 3. Solve Weather Particles Kinematics
    if (weatherType !== 'clear') {
      particles.forEach((p) => {
        p.y += p.speed * dt;
        p.x += p.drift * dt;

        // Wrap around
        if (p.y >= GRID_ROWS) {
          p.y = 0;
          p.x = Math.random() * GRID_COLS;
        }
        if (p.x < 0) p.x = GRID_COLS - 1;
        if (p.x >= GRID_COLS) p.x = 0;
      });
    }

    // 3. Add subtle physiological tremor/drift (micro-saccades & continuous breathing focus)
    const state = computeState();
    const time = now * 0.003;
    const isAsleep = state === 'sleepy' || state === 'dnd';
    const jitterX = isAsleep ? 0 : Math.sin(time * 3.7) * 0.09 + Math.cos(time * 0.9) * 0.12;
    const jitterY = isAsleep ? 0 : Math.cos(time * 2.9) * 0.09 + Math.sin(time * 0.7) * 0.12;

    const renderX = currentGaze.x + jitterX;
    const renderY = currentGaze.y + jitterY;

    // Re-render display using current physics coordinates
    const meta = STATE_META[state];
    renderPattern(activePatternKey, meta.color, meta.glow, {
      dx: renderX,
      dy: renderY,
    });

    requestAnimationFrame(physicsStep);
  }

  // Start the continuous physics loop immediately
  requestAnimationFrame(physicsStep);

  function setFaceState(patternKey, targetG = null) {
    activePatternKey = patternKey;
    const state = computeState();
    const meta = STATE_META[state];

    let activePattern = patternKey;
    if (patternKey === 'idle_open') {
      activePattern = meta.pattern;
    } else if (patternKey === 'idle_wide') {
      activePattern = (state === 'battery' || state === 'dnd') ? 'idle_wide' : meta.pattern;
    }
    activePatternKey = activePattern;

    if (targetG) {
      targetGaze.x = targetG.dx;
      targetGaze.y = targetG.dy;
    }
  }

  async function triggerBlink() {
    targetLid = 0.0;
    await delay(70);
    targetLid = 1.0;
    await delay(120);
  }

  async function actionBlink() {
    await triggerBlink();
  }

  async function actionDoubleBlink() {
    await triggerBlink();
    await delay(80);
    await triggerBlink();
  }

  async function actionLook(dir) {
    // 1. Eyelids start closing AND gaze starts moving simultaneously!
    targetLid = 0.0;
    targetGaze.x = GAZE[dir].dx;
    targetGaze.y = GAZE[dir].dy;
    if (!reduceMotion) updateGaze(dir);
    
    // Allow the eye to blink shut and start traveling to target
    await delay(120);

    // 2. Open eyes (gaze has already arrived or is finishing its spring settle at destination!)
    targetLid = 1.0;
    await delay(rand(650, 1100));

    // 3. Eyelids start closing AND gaze starts traveling back to center simultaneously!
    targetLid = 0.0;
    targetGaze.x = GAZE.center.dx;
    targetGaze.y = GAZE.center.dy;
    updateGaze('center');
    
    await delay(120);

    // 4. Open eyes
    targetLid = 1.0;
    await delay(150);
  }

  async function actionCurious() {
    if (!reduceMotion) {
      widget.style.setProperty('--glare-x', '33%');
      widget.style.setProperty('--glare-y', '23%');
    }
    // Gaze slides directly with mass inertia (curious look)
    targetGaze.x = -1.5;
    targetGaze.y = -1.5;
    await delay(260);

    updateGaze('center');
    targetGaze.x = GAZE.center.dx;
    targetGaze.y = GAZE.center.dy;
    await delay(150);
  }

  async function actionContentBlink() {
    targetLid = 0.0;
    await delay(150);
    targetLid = 1.0;
    await delay(150);
  }

  const IDLE_ACTIONS = [
    { weight: 5, fn: actionBlink },
    { weight: 2, fn: actionDoubleBlink },
    { weight: 3, fn: () => actionLook('left') },
    { weight: 3, fn: () => actionLook('right') },
    { weight: 2, fn: () => actionLook('up') },
    { weight: 1, fn: () => actionLook('down') },
    { weight: 1, fn: actionCurious },
    { weight: 1, fn: actionContentBlink },
  ];

  function weightedPick(list) {
    const total = list.reduce((s, a) => s + a.weight, 0);
    let r = Math.random() * total;
    for (const item of list) {
      if (r < item.weight) return item;
      r -= item.weight;
    }
    return list[list.length - 1];
  }

  let idleLoopRunning = false;
  async function idleLoop() {
    if (idleLoopRunning) return;
    idleLoopRunning = true;
    while (true) {
      await delay(reduceMotion ? 4000 : rand(2200, 4200));
      const action = weightedPick(IDLE_ACTIONS);
      await action.fn();
    }
  }

  function paint() {
    const state = computeState();
    const meta = STATE_META[state];

    updateGaze('center');
    widget.classList.remove(
      'state-alert',
      'state-dnd',
      'state-battery',
      'state-charging'
    );

    if (state !== 'idle') {
      widget.classList.add('state-' + state);
    }

    // Reset physics states instantly when switching state presets
    currentGaze.x = GAZE.center.dx;
    currentGaze.y = GAZE.center.dy;
    targetGaze.x = GAZE.center.dx;
    targetGaze.y = GAZE.center.dy;
    gazeVelocity.x = 0;
    gazeVelocity.y = 0;

    currentLid = 1.0;
    targetLid = 1.0;
    lidVelocity = 0;

    activePatternKey = (state === 'idle') ? 'idle_open' : meta.pattern;
    renderPattern(activePatternKey, meta.color, meta.glow, { dx: currentGaze.x, dy: currentGaze.y });

    const colorVal = cssVar(meta.color);
    const glowVal = cssVar(meta.glow);
    widget.style.boxShadow = `0 30px 60px -25px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.04)`;
    statusDot.style.setProperty('--dot-color', colorVal);
    statusLabel.textContent = meta.label;
    formulaBox.style.setProperty('--dot-color', colorVal);

    if (notifCount > 0) {
      badge.textContent = notifCount > 9 ? '9+' : notifCount;
      badge.classList.add('show');
    } else {
      badge.classList.remove('show');
    }

    formulaBox.innerHTML = `<span class="tag">gv(mood) resolves to ${
      meta.mood
    } — ${meta.label}</span>$if(
  ni(count) &gt; 0, 3,             <span class="${
    state === 'alert' ? 'active' : ''
  }">${state === 'alert' ? '← matched' : ''}</span>
  bi(level) &lt;= 15 &amp; bi(charging) = 0, 2,  <span class="${
    state === 'battery' ? 'active' : ''
  }">${state === 'battery' ? '← matched' : ''}</span>
  si(ringer) = "SILENT", 1,      <span class="${
    state === 'dnd' ? 'active' : ''
  }">${state === 'dnd' ? '← matched' : ''}</span>
  bi(charging) = 1, 4,           <span class="${
    state === 'charging' ? 'active' : ''
  }">${state === 'charging' ? '← matched' : ''}</span>
  gv(focus) = 1 | setting(global, zen_mode) = 1, 5, <span class="${
    state === 'busy' ? 'active' : ''
  }">${state === 'busy' ? '← matched' : ''}</span>
  gv(bedtime) = 1 | setting(global, zen_mode) = 3, 6, <span class="${
    state === 'sleepy' ? 'active' : ''
  }">${state === 'sleepy' ? '← matched' : ''}</span>
  gv(happy) = 1, 7,              <span class="${
    state === 'happy' ? 'active' : ''
  }">${state === 'happy' ? '← matched' : ''}</span>
  0                              <span class="${
    state === 'idle' ? 'active' : ''
  }">${state === 'idle' ? '← matched' : ''}</span>
)$`;

    // Highlight matching preset button
    document.querySelectorAll('.preset-btn').forEach((btn) => {
      if (btn.dataset.mood === state) {
        btn.classList.add('active');
        btn.style.setProperty('--theme-color', `var(${meta.color})`);
        btn.style.setProperty('--theme-glow', `var(${meta.glow})`);
      } else {
        btn.classList.remove('active');
        btn.style.removeProperty('--theme-color');
        btn.style.removeProperty('--theme-glow');
      }
    });
  }

  const notifCountEl = document.getElementById('notifCount');
  document.getElementById('notifStepper').addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const dir = parseInt(btn.dataset.dir, 10);
    notifCount = Math.max(0, Math.min(9, notifCount + dir));
    notifCountEl.textContent = notifCount;
    paint();
  });

  const dndSwitch = document.getElementById('dndSwitch');
  dndSwitch.addEventListener('click', () => {
    dnd = !dnd;
    dndSwitch.classList.toggle('on', dnd);
    dndSwitch.setAttribute('aria-checked', String(dnd));
    paint();
  });

  const chargeSwitch = document.getElementById('chargeSwitch');
  chargeSwitch.addEventListener('click', () => {
    charging = !charging;
    chargeSwitch.classList.toggle('on', charging);
    chargeSwitch.setAttribute('aria-checked', String(charging));
    paint();
  });

  const battRange = document.getElementById('battRange');
  const battVal = document.getElementById('battVal');
  battRange.addEventListener('input', () => {
    battLevel = parseInt(battRange.value, 10);
    battVal.textContent = battLevel + '%';
    paint();
  });

  // Preset Mood buttons handlers
  document.querySelectorAll('.preset-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const mood = btn.dataset.mood;
      if (mood === 'idle') {
        notifCount = 0;
        dnd = false;
        battLevel = 72;
        charging = false;
        focusMode = false;
        bedtimeMode = false;
        happyDay = false;
      } else if (mood === 'alert') {
        notifCount = 3;
        dnd = false;
        battLevel = 72;
        charging = false;
        focusMode = false;
        bedtimeMode = false;
        happyDay = false;
      } else if (mood === 'dnd') {
        notifCount = 0;
        dnd = true;
        battLevel = 72;
        charging = false;
        focusMode = false;
        bedtimeMode = false;
        happyDay = false;
      } else if (mood === 'battery') {
        notifCount = 0;
        dnd = false;
        battLevel = 10;
        charging = false;
        focusMode = false;
        bedtimeMode = false;
        happyDay = false;
      } else if (mood === 'charging') {
        notifCount = 0;
        dnd = false;
        battLevel = 72;
        charging = true;
        focusMode = false;
        bedtimeMode = false;
        happyDay = false;
      } else if (mood === 'busy') {
        notifCount = 0;
        dnd = false;
        battLevel = 72;
        charging = false;
        focusMode = true;
        bedtimeMode = false;
        happyDay = false;
      } else if (mood === 'sleepy') {
        notifCount = 0;
        dnd = false;
        battLevel = 72;
        charging = false;
        focusMode = false;
        bedtimeMode = true;
        happyDay = false;
      } else if (mood === 'happy') {
        notifCount = 0;
        dnd = false;
        battLevel = 72;
        charging = false;
        focusMode = false;
        bedtimeMode = false;
        happyDay = true;
      }

      // Reset options on preset change
      cursorTracking = false;
      weatherType = 'clear';
      initParticles();

      // Sync UI controls
      notifCountEl.textContent = notifCount;
      dndSwitch.classList.toggle('on', dnd);
      dndSwitch.setAttribute('aria-checked', String(dnd));
      battRange.value = battLevel;
      battVal.textContent = battLevel + '%';
      chargeSwitch.classList.toggle('on', charging);
      chargeSwitch.setAttribute('aria-checked', String(charging));
      focusSwitch.classList.toggle('on', focusMode);
      focusSwitch.setAttribute('aria-checked', String(focusMode));
      bedtimeSwitch.classList.toggle('on', bedtimeMode);
      bedtimeSwitch.setAttribute('aria-checked', String(bedtimeMode));
      happySwitch.classList.toggle('on', happyDay);
      happySwitch.setAttribute('aria-checked', String(happyDay));
      followSwitch.classList.toggle('on', cursorTracking);
      followSwitch.setAttribute('aria-checked', String(cursorTracking));
      shapeSelect.value = 'square';
      gridEl.classList.remove('shape-circle', 'shape-plus');
      weatherSelect.value = 'clear';

      paint();
    });
  });

  focusSwitch.addEventListener('click', () => {
    focusMode = !focusMode;
    focusSwitch.classList.toggle('on', focusMode);
    focusSwitch.setAttribute('aria-checked', String(focusMode));
    paint();
  });

  bedtimeSwitch.addEventListener('click', () => {
    bedtimeMode = !bedtimeMode;
    bedtimeSwitch.classList.toggle('on', bedtimeMode);
    bedtimeSwitch.setAttribute('aria-checked', String(bedtimeMode));
    paint();
  });

  happySwitch.addEventListener('click', () => {
    happyDay = !happyDay;
    happySwitch.classList.toggle('on', happyDay);
    happySwitch.setAttribute('aria-checked', String(happyDay));
    paint();
  });

  followSwitch.addEventListener('click', () => {
    cursorTracking = !cursorTracking;
    followSwitch.classList.toggle('on', cursorTracking);
    followSwitch.setAttribute('aria-checked', String(cursorTracking));
    if (!cursorTracking) {
      targetGaze.x = GAZE.center.dx;
      targetGaze.y = GAZE.center.dy;
      updateGaze('center');
    }
  });

  widget.addEventListener('mousemove', (e) => {
    if (!cursorTracking) return;
    const rect = widget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Normalized position (-1 to 1)
    const nx = (x / rect.width) * 2 - 1;
    const ny = (y / rect.height) * 2 - 1;

    // Map to Gaze range (dx: -4 to 4, dy: -4 to 4)
    targetGaze.x = nx * 4.0;
    targetGaze.y = ny * 4.0;

    if (!reduceMotion) {
      widget.style.setProperty('--glare-x', `${35 + nx * 10}%`);
      widget.style.setProperty('--glare-y', `${25 + ny * 10}%`);
    }
  });

  widget.addEventListener('mouseleave', () => {
    if (!cursorTracking) return;
    targetGaze.x = GAZE.center.dx;
    targetGaze.y = GAZE.center.dy;
    updateGaze('center');
  });

  shapeSelect.addEventListener('change', () => {
    const shape = shapeSelect.value;
    gridEl.classList.remove('shape-circle', 'shape-plus');
    if (shape === 'circle') {
      gridEl.classList.add('shape-circle');
    } else if (shape === 'plus') {
      gridEl.classList.add('shape-plus');
    }
  });

  weatherSelect.addEventListener('change', () => {
    weatherType = weatherSelect.value;
    initParticles();
  });

  // On startup, sync UI switches and select drop-downs to match values parsed from URL search
  notifCountEl.textContent = notifCount;
  dndSwitch.classList.toggle('on', dnd);
  dndSwitch.setAttribute('aria-checked', String(dnd));
  battRange.value = battLevel;
  battVal.textContent = battLevel + '%';
  chargeSwitch.classList.toggle('on', charging);
  chargeSwitch.setAttribute('aria-checked', String(charging));
  focusSwitch.classList.toggle('on', focusMode);
  focusSwitch.setAttribute('aria-checked', String(focusMode));
  bedtimeSwitch.classList.toggle('on', bedtimeMode);
  bedtimeSwitch.setAttribute('aria-checked', String(bedtimeMode));
  happySwitch.classList.toggle('on', happyDay);
  happySwitch.setAttribute('aria-checked', String(happyDay));
  followSwitch.classList.toggle('on', cursorTracking);
  followSwitch.setAttribute('aria-checked', String(cursorTracking));

  const initialShape = urlParams.get('shape') || 'square';
  shapeSelect.value = initialShape;
  gridEl.classList.remove('shape-circle', 'shape-plus');
  if (initialShape === 'circle') {
    gridEl.classList.add('shape-circle');
  } else if (initialShape === 'plus') {
    gridEl.classList.add('shape-plus');
  }

  weatherSelect.value = weatherType;
  initParticles();

  paint();
  idleLoop();
})();
