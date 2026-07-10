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
  let litMap = new Set();

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
        litMap.add(`${r},${c}`);
      }
    }
  }

  // --- Generate 32-bit BMP Image (256x256 resolution) ---
  const width = 256;
  const height = 256;
  const pixelDataSize = width * height * 4;
  const fileSize = 54 + pixelDataSize;

  const buffer = Buffer.alloc(fileSize);

  // BMP Header
  buffer.write('BM', 0);
  buffer.writeUInt32LE(fileSize, 2);
  buffer.writeUInt16LE(0, 6);
  buffer.writeUInt16LE(0, 8);
  buffer.writeUInt32LE(54, 10);

  // DIB Header
  buffer.writeUInt32LE(40, 14);
  buffer.writeInt32LE(width, 18);
  buffer.writeInt32LE(height, 22);
  buffer.writeUInt16LE(1, 26);
  buffer.writeUInt16LE(32, 28); // 32-bit for ARGB transparency
  buffer.writeUInt32LE(0, 30);
  buffer.writeUInt32LE(pixelDataSize, 34);
  buffer.writeInt32LE(2835, 38);
  buffer.writeInt32LE(2835, 42);
  buffer.writeUInt32LE(0, 46);
  buffer.writeUInt32LE(0, 50);

  const moodColor = STATE_COLORS[mood] || STATE_COLORS.idle;
  const r_val = parseInt(moodColor.substring(1, 3), 16);
  const g_val = parseInt(moodColor.substring(3, 5), 16);
  const b_val = parseInt(moodColor.substring(5, 7), 16);

  // Colors
  const bg_r = 0x0b, bg_g = 0x0c, bg_b = 0x10;
  const dot_r = 0x14, dot_g = 0x17, dot_b = 0x1d;

  let offset = 54;
  const cornerRadius = 14;

  // BMP writes bottom-to-top
  for (let y = height - 1; y >= 0; y--) {
    const gr = Math.floor(y / 4);
    const dy = y % 4;

    for (let x = 0; x < width; x++) {
      const gc = Math.floor(x / 4);
      const dx = x % 4;

      let r_p = bg_r, g_p = bg_g, b_p = bg_b, a_p = 255;

      // Check card rounded corner transparency
      let isTransparent = false;
      if (x < cornerRadius && y < cornerRadius) {
        if (Math.pow(x - cornerRadius, 2) + Math.pow(y - cornerRadius, 2) > Math.pow(cornerRadius, 2)) isTransparent = true;
      } else if (x >= width - cornerRadius && y < cornerRadius) {
        if (Math.pow(x - (width - 1 - cornerRadius), 2) + Math.pow(y - cornerRadius, 2) > Math.pow(cornerRadius, 2)) isTransparent = true;
      } else if (x < cornerRadius && y >= height - cornerRadius) {
        if (Math.pow(x - cornerRadius, 2) + Math.pow(y - (height - 1 - cornerRadius), 2) > Math.pow(cornerRadius, 2)) isTransparent = true;
      } else if (x >= width - cornerRadius && y >= height - cornerRadius) {
        if (Math.pow(x - (width - 1 - cornerRadius), 2) + Math.pow(y - (height - 1 - cornerRadius), 2) > Math.pow(cornerRadius, 2)) isTransparent = true;
      }

      if (isTransparent) {
        r_p = 0; g_p = 0; b_p = 0; a_p = 0; // transparent
      } else {
        // Draw grid spacer borders
        if (dy === 3 || dx === 3) {
          r_p = bg_r; g_p = bg_g; b_p = bg_b;
        } else {
          if (litMap.has(`${gr},${gc}`)) {
            r_p = r_val; g_p = g_val; b_p = b_val;
          } else {
            r_p = dot_r; g_p = dot_g; b_p = dot_b;
          }
        }
      }

      // Write pixel bytes (BGRA format)
      buffer[offset] = b_p;
      buffer[offset + 1] = g_p;
      buffer[offset + 2] = r_p;
      buffer[offset + 3] = a_p;
      offset += 4;
    }
  }

  res.setHeader('Content-Type', 'image/bmp');
  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate');
  res.send(buffer);
};
