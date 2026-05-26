// --- Parametri onda 1 ---
let f1 = 220;       // frequenza Hz
let a1 = 0.8;       // ampiezza 0..1
let type1 = 'sine'; // 'sine' | 'square' | 'sawtooth' | 'triangle'

// --- Parametri onda 2 ---
let f2 = 440;
let a2 = 0.5;
let type2 = 'sine';

// --- Oscillatori audio (p5.sound) ---
let osc1, osc2;
let playing1 = false;
let playing2 = false;
let playingBoth = false;
let oscBoth1, oscBoth2;

// --- Animazione ---
let animT = 0;
let paused = false;
let speedSlider, f1Slider, a1Slider, f2Slider, a2Slider;
let type1Select, type2Select;
let btnPlay1, btnPlay2, btnBoth, btnPause;
let isFourierPage = false;

// ---- UI helpers ----
const COL_W1  = '#6DC1FF';
const COL_W2  = '#FF7EC8';
const COL_SUM = '#7CE6A6';
const COL_BG  = '#000000';
const COL_GRID = 'rgba(255,255,255,0.12)';
const COL_TEXT = '#ffffff';




function setup() {
	createCanvas(windowWidth, windowHeight)

	// --- Sliders onda 1 (AMPIEZZA) ---
  a1Slider = makeSlider(0, 200, 80, 1,  110, 57, 170);

  // --- Sliders onda 1 (FREQUENZA) ---
  f1Slider = makeSlider(80, 880, f1, 1,  110, 101, 170);

  // --- Selects onda 1 ---
  type1Select = createSelect();
  type1Select.position(20, 150);
  type1Select.size(155, 26);
  ['sine','square','sawtooth','triangle'].forEach(t => type1Select.option(t));
  type1Select.selected('sine');
  styleSelect(type1Select);

  // --- Bottone Suona 1 ---
  btnPlay1 = makeButton('▶ Suona 1', 200, 150, 155, playWave1);

  // --- Sliders onda 2 (AMPIEZZA) ---
  a2Slider = makeSlider(0,  200, 50, 1,  515, 57, 170);

  // --- Sliders onda 2 (FREQUENZA) ---
  f2Slider = makeSlider(80, 880, f2, 1,  515, 101, 170);

  // --- Selects onda 2 ---
  type2Select = createSelect();
  type2Select.position(430, 150);
  type2Select.size(155, 26);
  ['sine','square','sawtooth','triangle'].forEach(t => type2Select.option(t));
  type2Select.selected('sine');
  styleSelect(type2Select);

  // --- Bottone Suona 2 ---
  btnPlay2 = makeButton('▶ Suona 2', 610, 150, 155, playWave2);

  // --- Speed slider (PIÙ CORTO) ---
  speedSlider = makeSlider(0, 4, 1, 0.1, 85, 235, 150);

  // --- Bottone Entrambe ---
  btnBoth  = makeButton('♪ Entrambe', 570, 233, 200, playBoth);
  
  // Placeholder per pulsante pausa (nascosto su fourier)
  btnPause = createButton('Pausa');
  btnPause.style('display', 'none');

    // --- Oscillatori ---
  userStartAudio(); // richiede gesto utente per audio context
  osc1 = new p5.Oscillator(); osc1.amp(0);
  osc2 = new p5.Oscillator(); osc2.amp(0);
  oscBoth1 = new p5.Oscillator(); oscBoth1.amp(0);
  oscBoth2 = new p5.Oscillator(); oscBoth2.amp(0);
}

function draw() {
	background(0)

	// leggi sliders
  f1 = f1Slider.value();
  a1 = a1Slider.value() / 100;
  f2 = f2Slider.value();
  a2 = a2Slider.value() / 100;
  type1 = type1Select.value();
  type2 = type2Select.value();
  let spd = float(speedSlider.value());

  // aggiorna audio in tempo reale
  if (playing1) { osc1.freq(f1); osc1.amp(a1 * 0.4); }
  if (playing2) { osc2.freq(f2); osc2.amp(a2 * 0.4); }
  if (playingBoth) {
    oscBoth1.freq(f1); oscBoth1.amp(a1 * 0.35);
    oscBoth2.freq(f2); oscBoth2.amp(a2 * 0.35);
  }

  // --- Header pannelli in due colonne ---
  drawPanelHeader(20,  25, 240, COL_W1,  `Onda 1 — y₁`);
  drawPanelHeader(310, 25, 240, COL_W2,  `Onda 2 — y₂`);

  // label sliders in due colonne (accanto ai controlli)
  drawLabel(20,  60, 'Ampiezza');
  drawLabel(20, 105, 'Freq (Hz)');
  drawLabel(310, 60, 'Ampiezza');
  drawLabel(310, 105, 'Freq (Hz)');
  drawLabel(20, 238, 'Velocità');

  // valori live in due colonne
  fill(COL_TEXT); noStroke(); textSize(11); textAlign(LEFT);
  text((a1).toFixed(2), 220, 71);
  text(f1 + ' Hz',     220, 116);
  text((a2).toFixed(2), 510, 71);
  text(f2 + ' Hz',     510, 116);
  text(nf(spd,1,1) + 'x',  180, 250);

  // --- Legenda ---
  let ly = 320;
  drawLegendDot(20,  ly, COL_W1,  'y₁(x,t)');
  drawLegendDot(100, ly, COL_W2,  'y₂(x,t)');
  drawLegendDot(180, ly, COL_SUM, 'y = y₁ + y₂');

  // --- Grafico (RIMPICCIOLITO) ---
  let gx = 20, gy = 360, gw = 532, gh = 320;
  drawGrid(gx, gy, gw, gh);

  if (!paused) animT += 0.025 * spd;

  let N = 400;
  let y1vals = [], y2vals = [], ysvals = [];
  for (let i = 0; i < N; i++) {
    let x = map(i, 0, N - 1, 0, 4 * PI);
    let v1 = waveVal(x, animT, f1 / 110, a1, type1);
    let v2 = waveVal(x, animT, f2 / 110, a2, type2);
    y1vals.push(v1);
    y2vals.push(v2);
    ysvals.push(v1 + v2);
  }

  drawWave(y1vals,  N, gx, gy, gw, gh, COL_W1,  1.5);
  drawWave(y2vals,  N, gx, gy, gw, gh, COL_W2,  1.5);
  drawWave(ysvals,  N, gx, gy, gw, gh, COL_SUM, 2.5);
}

// ============================================================
// Calcolo forma d'onda
function waveVal(x, t, freq, amp, type) {
  let phase = freq * x - t;
  if (type === 'sine')     return amp * sin(phase);
  if (type === 'square')   return amp * (sin(phase) >= 0 ? 1 : -1);
  if (type === 'sawtooth') return amp * (2 * ((phase / TWO_PI % 1) + 1) % 1 - 1);
  if (type === 'triangle') {
    let p = ((phase / PI % 2) + 2) % 2;
    return amp * (p < 1 ? 2 * p - 1 : 3 - 2 * p);
  }
  return amp * sin(phase);
}

// ============================================================
// Disegno
function drawWave(vals, N, gx, gy, gw, gh, col, sw) {
  stroke(col); strokeWeight(sw); noFill();
  let mid = gy + gh / 2;
  let scale = gh / 2 / 2.2;
  beginShape();
  for (let i = 0; i < N; i++) {
    let px = gx + map(i, 0, N - 1, 0, gw);
    let py = mid - vals[i] * scale;
    vertex(px, py);
  }
  endShape();
}

function drawGrid(gx, gy, gw, gh) {
  stroke(COL_GRID); strokeWeight(0.5);
  // asse centrale
  stroke('rgba(128,128,128,0.35)'); strokeWeight(1);
  line(gx, gy + gh/2, gx + gw, gy + gh/2);
  // bordo
  stroke(200); strokeWeight(0.5);
  noFill(); rect(gx, gy, gw, gh, 4);
  // linee orizzontali
  stroke(COL_GRID); strokeWeight(0.5);
  for (let i = 1; i < 4; i++) {
    let yy = gy + gh * i / 4;
    line(gx, yy, gx + gw, yy);
  }
}

function drawPanelHeader(x, y, w, col, label) {
  noStroke(); fill(col + '22'); rect(x - 2, y, w + 4, 14, 3);
  fill(col); textSize(12); textAlign(LEFT); textStyle(BOLD);
  text(label, x + 2, y + 11);
  textStyle(NORMAL);
}

function drawLabel(x, y, txt) {
  fill(COL_TEXT); noStroke(); textSize(11); textAlign(LEFT);
  text(txt, x, y + 11);
}

function drawLegendDot(x, y, col, label) {
  fill(col); noStroke(); rect(x, y - 8, 14, 10, 2);
  fill(COL_TEXT); textSize(12); textAlign(LEFT);
  text(label, x + 18, y);
}

// ============================================================
// Audio callbacks
function playWave1() {
  userStartAudio();
  if (!playing1) {
    osc1.setType(type1); osc1.freq(f1); osc1.amp(a1 * 0.4); osc1.start();
    playing1 = true; btnPlay1.html('■ Stop 1');
  } else {
    osc1.amp(0, 0.05); setTimeout(() => osc1.stop(), 100);
    playing1 = false; btnPlay1.html('▶ Suona 1');
  }
}

function playWave2() {
  userStartAudio();
  if (!playing2) {
    osc2.setType(type2); osc2.freq(f2); osc2.amp(a2 * 0.4); osc2.start();
    playing2 = true; btnPlay2.html('■ Stop 2');
  } else {
    osc2.amp(0, 0.05); setTimeout(() => osc2.stop(), 100);
    playing2 = false; btnPlay2.html('▶ Suona 2');
  }
}

function playBoth() {
  userStartAudio();
  if (!playingBoth) {
    oscBoth1.setType(type1); oscBoth1.freq(f1); oscBoth1.amp(a1 * 0.35); oscBoth1.start();
    oscBoth2.setType(type2); oscBoth2.freq(f2); oscBoth2.amp(a2 * 0.35); oscBoth2.start();
    playingBoth = true; btnBoth.html('■ Stop');
  } else {
    oscBoth1.amp(0, 0.05); oscBoth2.amp(0, 0.05);
    setTimeout(() => { oscBoth1.stop(); oscBoth2.stop(); }, 100);
    playingBoth = false; btnBoth.html('♪ Entrambe');
  }
}

function togglePause() {
  paused = !paused;
  btnPause.html(paused ? 'Riprendi' : 'Pausa');
}

// ============================================================
// Utility UI
function makeSlider(mn, mx, val, step, x, y, w) {
  let s = createSlider(mn, mx, val, step);
  s.position(x, y); s.size(w, 18);
  s.style('accent-color', '#378ADD');
  return s;
}

function makeButton(label, x, y, w, cb) {
  let b = createButton(label);
  b.position(x, y); b.size(w, 28);
  b.style('font-size', '12px');
  b.style('cursor', 'pointer');
  b.style('border', '0.5px solid rgba(255,255,255,0.25)');
  b.style('border-radius', '8px');
  b.style('background', 'rgba(255,255,255,0.08)');
  b.style('color', '#fff');
  b.style('padding', '0 6px');
  b.mousePressed(cb);
  return b;
}

function styleSelect(sel) {
  sel.style('font-size', '12px');
  sel.style('border', '0.5px solid rgba(255,255,255,0.25)');
  sel.style('border-radius', '6px');
  sel.style('padding', '4px 6px');
  sel.style('background', 'rgba(255,255,255,0.08)');
  sel.style('color', '#fff');
}