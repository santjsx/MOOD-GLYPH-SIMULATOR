const GRID_COLS = 64;
const GRID_ROWS = 64;
const CELL = 7;     // pixels per grid cell
const DOT = 5;      // dot pixels within cell (1px margin each side)
const PAD = 24;     // outer padding
const W = GRID_COLS * CELL + PAD * 2;  // 496
const H = GRID_ROWS * CELL + PAD * 2;  // 496
const CORNER = 28;
const GLOW_R = 15;  // glow radius in pixels

const STATE_COLORS = {
  idle:     { r: 0x00, g: 0xe5, b: 0xcc },
  dnd:      { r: 0xff, g: 0x00, b: 0x55 },
  battery:  { r: 0xff, g: 0x33, b: 0x00 },
  alert:    { r: 0xff, g: 0xcc, b: 0x00 },
  charging: { r: 0x00, g: 0xff, b: 0x66 },
  busy:     { r: 0xff, g: 0x66, b: 0x00 },
  sleepy:   { r: 0x7b, g: 0x8d, b: 0xa5 },
  happy:    { r: 0xff, g: 0xcc, b: 0x00 },
};

module.exports = (req, res) => {
  const { mood = 'idle' } = req.query;

  // Eye geometry
  const leyex = 18, leyey = 32;
  const reyex = 46, reyey = 32;
  let rx = 7.5, ry = 10.5, rp = 2.5, lid = 1.0;

  if (mood === 'busy')  { rx = 9.5; ry = 5.5; rp = 2.0; }
  if (mood === 'sleepy') { lid = 0.45; }
  if (mood === 'alert') { rx += 1; ry += 1; }

  // Compute lit grid cells using a 2D array (faster than Set)
  const litGrid = Array.from({ length: GRID_ROWS }, () => new Uint8Array(GRID_COLS));

  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      let lit = false;

      for (const [eyeX, eyeY] of [[leyex, leyey], [reyex, reyey]]) {
        if (mood === 'dnd') {
          const sy = eyeY + 1.2 - Math.pow(c - eyeX, 2) * 0.08;
          if (Math.abs(r - sy) <= 1.1 && Math.abs(c - eyeX) <= 8) { lit = true; break; }
        } else {
          const ev = Math.pow(c - eyeX, 2) / Math.pow(rx, 2) + Math.pow(r - eyeY, 2) / Math.pow(ry, 2);
          if (ev <= 1.0 && Math.abs(r - eyeY) <= ry * lid) {
            let pX = eyeX, pY = eyeY;
            if (mood === 'busy')  pX += (eyeX === leyex ? 2 : -2);
            if (mood === 'sleepy') pY += 2.0;
            const dp = Math.pow(c - pX, 2) + Math.pow(r - pY, 2);
            if (dp > Math.pow(rp, 2)) {
              let show = true;
              if (mood === 'battery' && r < eyeY - 2) show = false;
              if (mood === 'happy') {
                const sc = eyeY + 1.8 - Math.pow(c - eyeX, 2) * 0.08;
                if (r > sc) show = false;
              }
              if (mood === 'busy' && Math.abs(r - eyeY) > 4.5) show = false;
              if (show) { lit = true; break; }
            }
          }
        }
      }
      if (lit) litGrid[r][c] = 1;
    }
  }

  // Pre-compute per-pixel glow intensity map using additive accumulation
  const glowMap = new Float32Array(W * H);
  for (let gr = 0; gr < GRID_ROWS; gr++) {
    for (let gc = 0; gc < GRID_COLS; gc++) {
      if (!litGrid[gr][gc]) continue;
      // Center of this dot in pixel coordinates
      const cx = PAD + gc * CELL + Math.floor(CELL / 2);
      const cy = PAD + gr * CELL + Math.floor(CELL / 2);
      const x0 = Math.max(0, cx - GLOW_R);
      const x1 = Math.min(W - 1, cx + GLOW_R);
      const y0 = Math.max(0, cy - GLOW_R);
      const y1 = Math.min(H - 1, cy + GLOW_R);
      for (let py = y0; py <= y1; py++) {
        for (let px = x0; px <= x1; px++) {
          const d = Math.sqrt((px - cx) * (px - cx) + (py - cy) * (py - cy));
          const intensity = Math.max(0, 1 - d / GLOW_R);
          // Quadratic falloff for realistic LED glow
          glowMap[py * W + px] = Math.min(1.0, glowMap[py * W + px] + intensity * intensity * 0.75);
        }
      }
    }
  }

  // Mood color
  const col = STATE_COLORS[mood] || STATE_COLORS.idle;
  const { r: cr, g: cg, b: cb } = col;

  // BMP constants
  const pixelBytes = W * H * 4;
  const fileSize = 54 + pixelBytes;
  const buf = Buffer.alloc(fileSize);

  // BMP file header
  buf.write('BM', 0);
  buf.writeUInt32LE(fileSize, 2);
  buf.writeUInt32LE(0, 6);
  buf.writeUInt32LE(54, 10);
  // DIB header (BITMAPINFOHEADER)
  buf.writeUInt32LE(40, 14);
  buf.writeInt32LE(W, 18);
  buf.writeInt32LE(H, 22);
  buf.writeUInt16LE(1, 26);
  buf.writeUInt16LE(32, 28);
  buf.writeUInt32LE(0, 30);
  buf.writeUInt32LE(pixelBytes, 34);
  buf.writeInt32LE(2835, 38);
  buf.writeInt32LE(2835, 42);
  buf.writeUInt32LE(0, 46);
  buf.writeUInt32LE(0, 50);

  let offset = 54;
  // BMP is bottom-to-top
  for (let py = H - 1; py >= 0; py--) {
    for (let px = 0; px < W; px++) {

      // Rounded card corners: outside = transparent
      let tr = false;
      if      (px < CORNER     && py < CORNER)          tr = Math.pow(px - CORNER, 2)           + Math.pow(py - CORNER, 2)           > CORNER * CORNER;
      else if (px >= W - CORNER && py < CORNER)          tr = Math.pow(px - (W - 1 - CORNER), 2) + Math.pow(py - CORNER, 2)           > CORNER * CORNER;
      else if (px < CORNER     && py >= H - CORNER)      tr = Math.pow(px - CORNER, 2)           + Math.pow(py - (H - 1 - CORNER), 2) > CORNER * CORNER;
      else if (px >= W - CORNER && py >= H - CORNER)     tr = Math.pow(px - (W - 1 - CORNER), 2) + Math.pow(py - (H - 1 - CORNER), 2) > CORNER * CORNER;

      if (tr) {
        buf[offset] = 0; buf[offset + 1] = 0; buf[offset + 2] = 0; buf[offset + 3] = 0;
        offset += 4;
        continue;
      }

      // Grid cell coordinates
      const gc = Math.floor((px - PAD) / CELL);
      const gr = Math.floor((py - PAD) / CELL);
      const dx = (px - PAD) - gc * CELL;
      const dy = (py - PAD) - gr * CELL;

      const inGrid = gc >= 0 && gc < GRID_COLS && gr >= 0 && gr < GRID_ROWS;
      const inDot  = inGrid && dx >= 1 && dx <= DOT && dy >= 1 && dy <= DOT;
      const isLit  = inDot && litGrid[gr][gc] === 1;

      // Base pixel color
      let R, G, B;
      if (isLit) {
        R = cr; G = cg; B = cb;
      } else if (inDot) {
        R = 0x10; G = 0x12; B = 0x18;  // dark unlit dot
      } else {
        R = 0x09; G = 0x0a; B: 0x0e;  // gap / background
        B = 0x0e;
      }

      // Apply glow
      const gv = glowMap[py * W + px];
      if (gv > 0.01) {
        R = Math.min(255, Math.round(R + (cr - R) * gv));
        G = Math.min(255, Math.round(G + (cg - G) * gv));
        B = Math.min(255, Math.round(B + (cb - B) * gv));
      }

      // BGRA byte order for BMP
      buf[offset]     = B;
      buf[offset + 1] = G;
      buf[offset + 2] = R;
      buf[offset + 3] = 255;
      offset += 4;
    }
  }

  res.setHeader('Content-Type', 'image/bmp');
  res.setHeader('Cache-Control', 'no-cache, no-store');
  res.send(buf);
};
