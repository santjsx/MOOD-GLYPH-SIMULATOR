const GRID_COLS = 64;
const GRID_ROWS = 64;

const STATE_COLORS = {
  idle: '#00ffcc',
  dnd: '#ff0055',
  battery: '#ff3300',
  alert: '#ffcc00',
  charging: '#00ff66',
  busy: '#ff6600',
  sleepy: '#7b8da5',
  happy: '#ffcc00'
};

module.exports = (req, res) => {
  const { mood = 'idle' } = req.query;

  // Coordinate centers for eyes
  const leyex = 18, leyey = 32;
  const reyex = 46, reyey = 32;

  // Eyeball ellipse radii (vertical oval shape by default)
  let rx_eyeball = 7.5;
  let ry_eyeball = 10.5;
  let r_pupil = 2.5;
  let activeLid = 1.0;

  if (mood === 'busy') {
    rx_eyeball = 9.5;
    ry_eyeball = 5.5;
    r_pupil = 2.0;
  } else if (mood === 'sleepy') {
    activeLid = 0.45; // half closed
  }

  let cur_rx = rx_eyeball;
  let cur_ry = ry_eyeball;
  if (mood === 'alert') {
    cur_rx = rx_eyeball + 1;
    cur_ry = ry_eyeball + 1;
  }

  // Draw list of lit dots
  let litDots = [];

  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      let lit = false;

      // 1. Draw Left Eye
      let isLeftEye = false;
      if (mood === 'dnd') {
        const sleepY = leyey + 1.2 - Math.pow(c - leyex, 2) * 0.08;
        if (Math.abs(r - sleepY) <= 1.1 && Math.abs(c - leyex) <= 8) {
          lit = true;
          isLeftEye = true;
        }
      } else {
        const valEyeball = Math.pow(c - leyex, 2) / Math.pow(cur_rx, 2) + Math.pow(r - leyey, 2) / Math.pow(cur_ry, 2);
        if (valEyeball <= 1.0) {
          const vertDist = Math.abs(r - leyey);
          if (vertDist <= cur_ry * activeLid) {
            let pX = leyex;
            let pY = leyey;
            if (mood === 'busy') {
              pX = leyex + 2.0;
            } else if (mood === 'sleepy') {
              pY = leyey + 2.0;
            }
            const distPupil = Math.pow(c - pX, 2) + Math.pow(r - pY, 2);
            if (distPupil > Math.pow(r_pupil, 2)) {
              lit = true;
              isLeftEye = true;
            }
          }
        }
        if (mood === 'battery' && isLeftEye) {
          if (r < leyey - 2) lit = false;
        }
        if (mood === 'happy' && isLeftEye) {
          const smileCurve = leyey + 1.8 - Math.pow(c - leyex, 2) * 0.08;
          if (r > smileCurve) lit = false;
        }
        if (mood === 'busy' && isLeftEye) {
          if (Math.abs(r - leyey) > 4.5) lit = false;
        }
      }

      // 2. Draw Right Eye
      let isRightEye = false;
      if (!lit) {
        if (mood === 'dnd') {
          const sleepY = reyey + 1.2 - Math.pow(c - reyex, 2) * 0.08;
          if (Math.abs(r - sleepY) <= 1.1 && Math.abs(c - reyex) <= 8) {
            lit = true;
            isRightEye = true;
          }
        } else {
          const valEyeball = Math.pow(c - reyex, 2) / Math.pow(cur_rx, 2) + Math.pow(r - reyey, 2) / Math.pow(cur_ry, 2);
          if (valEyeball <= 1.0) {
            const vertDist = Math.abs(r - reyey);
            if (vertDist <= cur_ry * activeLid) {
              let pX = reyex;
              let pY = reyey;
              if (mood === 'busy') {
                pX = reyex - 2.0;
              } else if (mood === 'sleepy') {
                pY = reyey + 2.0;
              }
              const distPupil = Math.pow(c - pX, 2) + Math.pow(r - pY, 2);
              if (distPupil > Math.pow(r_pupil, 2)) {
                lit = true;
                isRightEye = true;
              }
            }
          }
          if (mood === 'battery' && isRightEye) {
            if (r < reyey - 2) lit = false;
          }
          if (mood === 'happy' && isRightEye) {
            const smileCurve = reyey + 1.8 - Math.pow(c - reyex, 2) * 0.08;
            if (r > smileCurve) lit = false;
          }
          if (mood === 'busy' && isRightEye) {
            if (Math.abs(r - reyey) > 4.5) lit = false;
          }
        }
      }

      if (lit) {
        litDots.push({ r, c });
      }
    }
  }

  // Generate lightweight SVG
  const color = STATE_COLORS[mood] || STATE_COLORS.idle;
  let svg = `<svg viewBox="0 0 64 64" width="512" height="512" xmlns="http://www.w3.org/2000/svg" style="background:#0b0c10; border-radius: 12px;">`;
  svg += `<defs>
    <pattern id="bgGrid" width="1" height="1" patternUnits="userSpaceOnUse">
      <rect x="0.1" y="0.1" width="0.8" height="0.8" rx="0.1" fill="#14171d"/>
    </pattern>
  </defs>`;
  // Fill background grid pattern
  svg += `<rect width="64" height="64" fill="url(#bgGrid)"/>`;

  // Draw lit pixels
  litDots.forEach(dot => {
    svg += `<rect x="${dot.c + 0.1}" y="${dot.r + 0.1}" width="0.8" height="0.8" rx="0.1" fill="${color}" style="filter: drop-shadow(0 0 1px ${color});"/>`;
  });

  svg += `</svg>`;

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate');
  res.send(svg);
};
