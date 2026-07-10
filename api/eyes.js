// ─── Layout constants ─────────────────────────────────────────────────────────
const GRID_COLS = 64, GRID_ROWS = 64;
const CELL = 7, DOT = 5, PAD = 24;
const CARD_W = GRID_COLS * CELL + PAD * 2;   // 496
const CARD_H = GRID_ROWS * CELL + PAD * 2;   // 496
const STATUS_H = 56;                          // status-bar height
const W = CARD_W;                             // 496
const H = CARD_H + STATUS_H;                 // 552
const CORNER = 28;
const GLOW_R = 18;

// ─── 5 × 7 pixel font ─────────────────────────────────────────────────────────
// Each entry: array of 7 rows, each a 5-bit mask (MSB = left col)
const F = {
  ' ': [0,0,0,0,0,0,0],
  '●': [0b00000,0b01110,0b11111,0b11111,0b11111,0b01110,0b00000],
  'A': [0b01110,0b10001,0b10001,0b11111,0b10001,0b10001,0b10001],
  'B': [0b11110,0b10001,0b10001,0b11110,0b10001,0b10001,0b11110],
  'C': [0b01110,0b10001,0b10000,0b10000,0b10000,0b10001,0b01110],
  'D': [0b11100,0b10010,0b10001,0b10001,0b10001,0b10010,0b11100],
  'E': [0b11111,0b10000,0b10000,0b11110,0b10000,0b10000,0b11111],
  'F': [0b11111,0b10000,0b10000,0b11110,0b10000,0b10000,0b10000],
  'G': [0b01110,0b10001,0b10000,0b10111,0b10001,0b10001,0b01110],
  'H': [0b10001,0b10001,0b10001,0b11111,0b10001,0b10001,0b10001],
  'I': [0b11111,0b00100,0b00100,0b00100,0b00100,0b00100,0b11111],
  'L': [0b10000,0b10000,0b10000,0b10000,0b10000,0b10000,0b11111],
  'M': [0b10001,0b11011,0b10101,0b10001,0b10001,0b10001,0b10001],
  'N': [0b10001,0b11001,0b10101,0b10011,0b10001,0b10001,0b10001],
  'O': [0b01110,0b10001,0b10001,0b10001,0b10001,0b10001,0b01110],
  'P': [0b11110,0b10001,0b10001,0b11110,0b10000,0b10000,0b10000],
  'R': [0b11110,0b10001,0b10001,0b11110,0b10100,0b10010,0b10001],
  'S': [0b01110,0b10001,0b10000,0b01110,0b00001,0b10001,0b01110],
  'T': [0b11111,0b00100,0b00100,0b00100,0b00100,0b00100,0b00100],
  'U': [0b10001,0b10001,0b10001,0b10001,0b10001,0b10001,0b01110],
  'W': [0b10001,0b10001,0b10001,0b10101,0b10101,0b11011,0b10001],
  'Y': [0b10001,0b10001,0b01010,0b00100,0b00100,0b00100,0b00100],
  '/': [0b00001,0b00010,0b00100,0b01000,0b10000,0b00000,0b00000],
};

// ─── Mood data ─────────────────────────────────────────────────────────────────
const MOODS = {
  idle:     { r:0x00, g:0xe5, b:0xcc, label:'IDLE' },
  dnd:      { r:0xff, g:0x00, b:0x55, label:'DND' },
  battery:  { r:0xff, g:0x33, b:0x00, label:'LOW BATTERY' },
  alert:    { r:0xff, g:0xcc, b:0x00, label:'ALERT' },
  charging: { r:0x00, g:0xff, b:0x66, label:'CHARGING' },
  busy:     { r:0xff, g:0x66, b:0x00, label:'BUSY' },
  sleepy:   { r:0x7b, g:0x8d, b:0xa5, label:'SLEEPY' },
  happy:    { r:0xff, g:0xcc, b:0x00, label:'HAPPY' },
};

module.exports = (req, res) => {
  const { mood = 'idle' } = req.query;
  const col = MOODS[mood] || MOODS.idle;

  // ── Eye geometry (matches script.js exactly) ──────────────────────────────
  const leyex = 18, leyey = 32, reyex = 46, reyey = 32;
  let rx = 7.5, ry = 10.5, rp = 2.5, lid = 1.0;
  if (mood === 'busy')  { rx = 9.5; ry = 5.5; rp = 2.0; }
  if (mood === 'sleepy') { lid = 0.45; }
  if (mood === 'alert') { rx += 1; ry += 1; }

  // ── Compute lit grid ──────────────────────────────────────────────────────
  const litGrid = Array.from({length: GRID_ROWS}, () => new Uint8Array(GRID_COLS));
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      for (const [eyeX, eyeY] of [[leyex,leyey],[reyex,reyey]]) {
        if (mood === 'dnd') {
          const sy = eyeY + 1.2 - (c - eyeX) * (c - eyeX) * 0.08;
          if (Math.abs(r - sy) <= 1.1 && Math.abs(c - eyeX) <= 8) { litGrid[r][c] = 1; break; }
        } else {
          const ev = (c-eyeX)**2/rx**2 + (r-eyeY)**2/ry**2;
          if (ev <= 1.0 && Math.abs(r - eyeY) <= ry * lid) {
            let pX = eyeX, pY = eyeY;
            if (mood === 'busy')  pX += (eyeX === leyex ? 2 : -2);
            if (mood === 'sleepy') pY += 2;
            const dp = (c-pX)**2 + (r-pY)**2;
            if (dp > rp * rp) {
              let ok = true;
              if (mood === 'battery' && r < eyeY - 2) ok = false;
              if (mood === 'happy') { const sc = eyeY+1.8-(c-eyeX)**2*0.08; if (r>sc) ok=false; }
              if (mood === 'busy' && Math.abs(r-eyeY)>4.5) ok = false;
              if (ok) { litGrid[r][c] = 1; break; }
            }
          }
        }
      }
    }
  }

  // ── Build RGBA pixel array ────────────────────────────────────────────────
  const pixels = new Uint8Array(W * H * 4);
  const sp = (x, y, r, g, b, a=255) => {
    if (x<0||x>=W||y<0||y>=H) return;
    const i=(y*W+x)*4; pixels[i]=r; pixels[i+1]=g; pixels[i+2]=b; pixels[i+3]=a;
  };

  // ── Background: solid dark fill ───────────────────────────────────────────
  for (let i = 0; i < W*H*4; i += 4) { pixels[i]=0x0b; pixels[i+1]=0x0c; pixels[i+2]=0x10; pixels[i+3]=255; }

  // ── Rounded-corner transparency (all 4 corners of full image) ────────────
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let t = false;
      if      (x<CORNER   && y<CORNER)        t = (x-CORNER)**2+(y-CORNER)**2 > CORNER**2;
      else if (x>=W-CORNER && y<CORNER)        t = (x-(W-1-CORNER))**2+(y-CORNER)**2 > CORNER**2;
      else if (x<CORNER   && y>=H-CORNER)      t = (x-CORNER)**2+(y-(H-1-CORNER))**2 > CORNER**2;
      else if (x>=W-CORNER && y>=H-CORNER)     t = (x-(W-1-CORNER))**2+(y-(H-1-CORNER))**2 > CORNER**2;
      if (t) { const i=(y*W+x)*4; pixels[i]=0; pixels[i+1]=0; pixels[i+2]=0; pixels[i+3]=0; }
    }
  }

  // ── Glow pass: pre-compute per-pixel glow intensity ──────────────────────
  const glowMap = new Float32Array(W * H);
  for (let gr = 0; gr < GRID_ROWS; gr++) {
    for (let gc = 0; gc < GRID_COLS; gc++) {
      if (!litGrid[gr][gc]) continue;
      const cx = PAD + gc*CELL + Math.floor(CELL/2);
      const cy = PAD + gr*CELL + Math.floor(CELL/2);
      const x0=Math.max(0,cx-GLOW_R), x1=Math.min(W-1,cx+GLOW_R);
      const y0=Math.max(0,cy-GLOW_R), y1=Math.min(H-1,cy+GLOW_R);
      for (let py=y0; py<=y1; py++) {
        for (let px=x0; px<=x1; px++) {
          const d = Math.sqrt((px-cx)**2+(py-cy)**2);
          const k = Math.max(0, 1-d/GLOW_R)**2 * 0.85;
          glowMap[py*W+px] = Math.min(1.0, glowMap[py*W+px]+k);
        }
      }
    }
  }

  // ── Render LED grid dots inside card area ─────────────────────────────────
  for (let py = 0; py < CARD_H; py++) {
    for (let px = 0; px < CARD_W; px++) {
      if (pixels[(py*W+px)*4+3] === 0) continue; // transparent corner
      const gc = Math.floor((px-PAD)/CELL);
      const gr = Math.floor((py-PAD)/CELL);
      const dx = (px-PAD)-gc*CELL;
      const dy = (py-PAD)-gr*CELL;
      const inGrid = gc>=0&&gc<GRID_COLS&&gr>=0&&gr<GRID_ROWS;
      const inDot  = inGrid && dx>=1&&dx<=DOT&&dy>=1&&dy<=DOT;
      const isLit  = inDot && litGrid[gr][gc]===1;

      let R, G, B;
      if (isLit)       { R=col.r; G=col.g; B=col.b; }
      else if (inDot)  { R=0x10; G=0x12; B=0x18; }
      else             { R=0x09; G=0x0a; B=0x0e; }

      const gv = glowMap[py*W+px];
      if (gv > 0.01) {
        R = Math.min(255, Math.round(R+(col.r-R)*gv));
        G = Math.min(255, Math.round(G+(col.g-G)*gv));
        B = Math.min(255, Math.round(B+(col.b-B)*gv));
      }

      const i=(py*W+px)*4; pixels[i]=R; pixels[i+1]=G; pixels[i+2]=B;
    }
  }

  // ── Thin separator line between card and status ───────────────────────────
  for (let x=CORNER; x<W-CORNER; x++) {
    const i=(CARD_H*W+x)*4;
    pixels[i]=0x1a; pixels[i+1]=0x1c; pixels[i+2]=0x22;
  }

  // ── Render status text: "● {LABEL}" centered ─────────────────────────────
  const SCALE = 2;           // glyph pixel scale
  const CHAR_W = 5, CHAR_H = 7;
  const GLYPH_W = (CHAR_W+1)*SCALE; // 12px per char
  const text = '● ' + col.label;
  const textW = text.length * GLYPH_W;
  let curX = Math.floor((W - textW) / 2);
  const textY = CARD_H + Math.floor((STATUS_H - CHAR_H*SCALE) / 2) + 1;

  for (const ch of text) {
    const glyph = F[ch] || F[' '];
    // draw dot in mood color, letters in 80% white
    const isCircle = ch === '●';
    const tR = isCircle ? col.r : 0xd0;
    const tG = isCircle ? col.g : 0xd2;
    const tB = isCircle ? col.b : 0xd8;

    for (let row=0; row<CHAR_H; row++) {
      for (let bit=0; bit<CHAR_W; bit++) {
        if (glyph[row] & (1<<(CHAR_W-1-bit))) {
          for (let sy=0; sy<SCALE; sy++) {
            for (let sx=0; sx<SCALE; sx++) {
              sp(curX+bit*SCALE+sx, textY+row*SCALE+sy, tR, tG, tB);
            }
          }
        }
      }
    }
    curX += GLYPH_W;
  }

  // ── Pack RGBA → BMP (BGRA, bottom-to-top) ────────────────────────────────
  const pixelBytes = W*H*4;
  const fileSize   = 54+pixelBytes;
  const buf        = Buffer.alloc(fileSize);

  buf.write('BM', 0);
  buf.writeUInt32LE(fileSize, 2);
  buf.writeUInt32LE(0, 6);
  buf.writeUInt32LE(54, 10);
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

  let off = 54;
  for (let y=H-1; y>=0; y--) {
    for (let x=0; x<W; x++) {
      const i=(y*W+x)*4;
      buf[off]=pixels[i+2]; buf[off+1]=pixels[i+1]; buf[off+2]=pixels[i]; buf[off+3]=pixels[i+3];
      off+=4;
    }
  }

  res.setHeader('Content-Type', 'image/bmp');
  res.setHeader('Cache-Control', 'no-cache, no-store');
  res.send(buf);
};
