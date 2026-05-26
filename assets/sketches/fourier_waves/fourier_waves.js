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

// --- Animazione ---
let animT = 0;
let paused = false;
let f1Slider, a1Slider, f2Slider, a2Slider;
let type1Select, type2Select;
let btnPlay1, btnPlay2, btnPause;
let isFourierPage = false;

// ---- UI helpers (Colori aggiornati allo stile lineare e scuro) ----
const COL_W1  = '#38bdf8';   // Azzurro Ciano
const COL_W2  = '#f472b6';   // Rosa Pastello
const COL_SUM = '#4ade80';   // Verde Smeraldo
const COL_BG  = '#050505';   // Fondo Scuro Profondo
const COL_TEXT = '#ffffff';

// ============================================================
function setup() {
  // Verifica se siamo su fourier.html
  let containerEl = document.querySelector('.canvas-wrapper');
  isFourierPage = !!containerEl;

  let canvasWidth, canvasHeight;
  
  if (isFourierPage) {
    canvasWidth = windowWidth - 420;
    canvasHeight = windowHeight;
  } else {
    canvasWidth = 500;
    canvasHeight = 700;
  }

  let cnv = createCanvas(canvasWidth, canvasHeight);
  
  if (isFourierPage && containerEl) {
    cnv.parent(containerEl);
    cnv.style('display', 'block');
    cnv.style('width', '100%');
    cnv.style('height', '100%');
  }
  
  // Iniezione del foglio di stile CSS per rendere i controlli DOM lineari e moderni
  createElement('style', `
    .slider-custom {
      -webkit-appearance: none;
      background: #27272a !important;
      height: 6px !important;
      border-radius: 3px !important;
      outline: none;
    }
    .slider-custom::-webkit-slider-thumb {
      -webkit-appearance: none;
      background: #ffffff !important;
      width: 14px !important;
      height: 14px !important;
      border-radius: 50% !important;
      cursor: pointer;
      border: 1px solid #3f3f46 !important;
    }
    .btn-custom {
      background: #18181b !important;
      color: #ffffff !important;
      border: 1px solid #27272a !important;
      border-radius: 6px !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      font-size: 12px !important;
      font-weight: 500 !important;
      cursor: pointer;
      transition: all 0.2s ease !important;
    }
    .btn-custom:hover {
      background: #27272a !important;
      border-color: #3f3f46 !important;
    }
    .btn-custom.active-playing {
      background: #10b98122 !important;
      color: #4ade80 !important;
      border-color: #047857 !important;
      font-weight: bold !important;
    }
    .select-custom {
      background: #18181b !important;
      color: #ffffff !important;
      border: 1px solid #27272a !important;
      border-radius: 6px !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      font-size: 12px !important;
      padding: 2px 6px !important;
      outline: none;
      cursor: pointer;
    }
    .select-custom:hover {
      background: #27272a !important;
    }
  `);

  textFont('-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif');

  // --- Sliders onda 1 ---
  a1Slider = makeSlider(0, 200, 80, 1,  70, 47, 120);
  f1Slider = makeSlider(80, 880, f1, 1,  70, 75, 120);

  // --- Selects onda 1 ---
  type1Select = createSelect().class('select-custom');
  type1Select.position(10, 100);
  type1Select.size(110, 24);
  ['sine','square','sawtooth','triangle'].forEach(t => type1Select.option(t));
  type1Select.selected('sine');

  // --- Bottone Suona 1 ---
  btnPlay1 = makeButton('▶ Suona 1', 125, 100, 115, playWave1);

  // --- Sliders onda 2 ---
  a2Slider = makeSlider(0,  200, 50, 1,  300, 47, 120);
  f2Slider = makeSlider(80, 880, f2, 1,  300, 75, 120);

  // --- Selects onda 2 ---
  type2Select = createSelect().class('select-custom');
  type2Select.position(245, 100);
  type2Select.size(110, 24);
  ['sine','square','sawtooth','triangle'].forEach(t => type2Select.option(t));
  type2Select.selected('sine');

  // --- Bottone Suona 2 ---
  btnPlay2 = makeButton('▶ Suona 2', 360, 100, 115, playWave2);

  btnPause = createButton('Pausa');
  btnPause.style('display', 'none');

  if (isFourierPage) {
    let containerEl = document.querySelector('.canvas-wrapper');
    let uiElements = [a1Slider, f1Slider, type1Select, btnPlay1, a2Slider, f2Slider, type2Select, btnPlay2];
    
    uiElements.forEach(el => {
      if (el && el.elt) {
        containerEl.appendChild(el.elt);
        el.elt.style.position = 'absolute';
        el.elt.style.zIndex = '5';
      }
    });
  }

  // --- Oscillatori ---
  userStartAudio();
  osc1 = new p5.Oscillator(); osc1.amp(0);
  osc2 = new p5.Oscillator(); osc2.amp(0);
}

function windowResized() {
  if (isFourierPage) {
    resizeCanvas(windowWidth - 420, windowHeight);
  } else {
    resizeCanvas(500, 700);
  }
}

// ============================================================
function draw() {
  background(COL_BG);

  // Leggi sliders
  f1 = f1Slider.value();
  a1 = a1Slider.value() / 100;
  f2 = f2Slider.value();
  a2 = a2Slider.value() / 100;
  type1 = type1Select.value();
  type2 = type2Select.value();

  // Aggiorna audio in tempo reale
  if (playing1) { osc1.freq(f1); osc1.amp(a1 * 0.4); }
  if (playing2) { osc2.freq(f2); osc2.amp(a2 * 0.4); }

  // --- Header pannelli in due colonne ---
  drawPanelHeader(10,  20, 220, COL_W1,  `Onda 1 — y₁`);
  drawPanelHeader(240, 20, 220, COL_W2,  `Onda 2 — y₂`);

  // Label dei parametri
  drawLabel(10,  50, 'Ampiezza');
  drawLabel(10,  80, 'Freq (Hz)');
  drawLabel(240, 50, 'Ampiezza');
  drawLabel(240, 80, 'Freq (Hz)');

  // Valori numerici live in stile Zinc
  fill('#a1a1aa'); noStroke(); textSize(12); textAlign(LEFT);
  text((a1).toFixed(2), 195, 52);
  text(f1 + ' Hz',     195, 80);
  text((a2).toFixed(2), 425, 52);
  text(f2 + ' Hz',     425, 80);

  // --- Legenda ---
  let ly = 180;
  drawLegendDot(10,  ly, COL_W1,  'y₁(x,t)');
  drawLegendDot(100, ly, COL_W2,  'y₂(x,t)');
  drawLegendDot(190, ly, COL_SUM, 'y = y₁ + y₂');

  // --- Grafico ---
  let gx = 10, gy = 225, gw = 480, gh = 380;
  drawGrid(gx, gy, gw, gh);

  if (!paused) animT += 0.025;

  // --- LOGICA ANTIALIASING (ZOOM ADATTIVO GRAFICO) ---
  // Invece di usare linearmente f1/110 che ad alte frequenze crea l'effetto "blocco solido", 
  // mappiamo le frequenze in un range controllato di cicli visibili su schermo (da 1 a 4 cicli completi).
  let graphFreq1 = map(f1, 80, 880, 0.8, 3.5);
  let graphFreq2 = map(f2, 80, 880, 0.8, 3.5);

  let N = 400;
  let y1vals = [], y2vals = [], ysvals = [];
  for (let i = 0; i < N; i++) {
    let x = map(i, 0, N - 1, 0, 4 * PI);
    
    // Il grafico usa i coefficienti ottimizzati, l'audio preserva i valori reali
    let v1 = waveVal(x, animT, graphFreq1, a1, type1);
    let v2 = waveVal(x, animT, graphFreq2, a2, type2);
    
    y1vals.push(v1);
    y2vals.push(v2);
    ysvals.push(v1 + v2);
  }

  // Rendering delle curve d'onda pulite
  drawWave(y1vals,  N, gx, gy, gw, gh, COL_W1,  1.5);
  drawWave(y2vals,  N, gx, gy, gw, gh, COL_W2,  1.5);
  drawWave(ysvals,  N, gx, gy, gw, gh, COL_SUM, 2.5);
}

// ============================================================
// Calcolo forma d'onda matematico
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
// Disegno Elementi sul Canvas
function drawWave(vals, N, gx, gy, gw, gh, col, sw) {
  stroke(col); strokeWeight(sw); noFill();
  let mid = gy + gh / 2;
  let scale = gh / 2 / 2.8;
  beginShape();
  for (let i = 0; i < N; i++) {
    let px = gx + map(i, 0, N - 1, 0, gw);
    let py = mid - vals[i] * scale;
    py = constrain(py, gy, gy + gh);
    vertex(px, py);
  }
  endShape();
}

function drawGrid(gx, gy, gw, gh) {
  stroke('#121214'); strokeWeight(1);
  // Linee griglia verticali e orizzontali fitte
  for (let i = gx; i < gx + gw; i += 30) {
    line(i, gy, i, gy + gh);
  }
  for (let j = gy; j < gy + gh; j += 30) {
    line(gx, j, gx + gw, j);
  }
  
  // Asse centrale di equilibrio
  stroke('#27272a'); strokeWeight(1.5);
  line(gx, gy + gh/2, gx + gw, gy + gh/2);
  
  // Bordo contenitore esterno arrotondato
  stroke('#1f1f23'); strokeWeight(1);
  noFill(); rect(gx, gy, gw, gh, 8);
}

function drawPanelHeader(x, y, w, col, label) {
  noStroke();
  // Indicatore verticale colorato minimalista accanto al titolo
  fill(col);
  rect(x, y, 4, 14, 2);
  
  fill('#ffffff'); textSize(13); textAlign(LEFT); textStyle(BOLD);
  text(label, x + 10, y + 12);
  textStyle(NORMAL);
}

function drawLabel(x, y, txt) {
  fill('#71717a'); noStroke(); textSize(12); textAlign(LEFT);
  text(txt, x, y + 10);
}

function drawLegendDot(x, y, col, label) {
  noStroke(); fill(col);
  ellipse(x + 6, y - 4, 10, 10); // Punti legenda circolari e puliti
  
  fill('#e4e4e7'); textSize(12); textAlign(LEFT);
  text(label, x + 18, y + 1);
}

// ============================================================
// Audio callbacks & Gestione stati classi CSS attive
function playWave1() {
  userStartAudio();
  if (!playing1) {
    osc1.setType(type1); osc1.freq(f1); osc1.amp(a1 * 0.4); osc1.start();
    playing1 = true; btnPlay1.html('■ Stop 1').addClass('active-playing');
  } else {
    stopWave1();
  }
}

function playWave2() {
  userStartAudio();
  if (!playing2) {
    osc2.setType(type2); osc2.freq(f2); osc2.amp(a2 * 0.4); osc2.start();
    playing2 = true; btnPlay2.html('■ Stop 2').addClass('active-playing');
  } else {
    stopWave2();
  }
}

function stopWave1() {
  if (playing1) {
    osc1.amp(0, 0.05);
    setTimeout(() => osc1.stop(), 100);
    playing1 = false;
    btnPlay1.html('▶ Suona 1').removeClass('active-playing');
  }
}

function stopWave2() {
  if (playing2) {
    osc2.amp(0, 0.05);
    setTimeout(() => osc2.stop(), 100);
    playing2 = false;
    btnPlay2.html('▶ Suona 2').removeClass('active-playing');
  }
}

// ============================================================
// Utility UI helpers
function makeSlider(mn, mx, val, step, x, y, w) {
  let s = createSlider(mn, mx, val, step).class('slider-custom');
  s.position(x, y); s.size(w, 18);
  return s;
}

function makeButton(label, x, y, w, cb) {
  let b = createButton(label).class('btn-custom');
  b.position(x, y); b.size(w, 28);
  b.mousePressed(cb);
  return b;
}