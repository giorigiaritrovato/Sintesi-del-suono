// --- Parametri onda 1 ---
let f1 = 220;       
let a1 = 0.8;       
let phi1 = 0;       
let type1 = 'sine'; 

// --- Parametri onda 2 ---
let f2 = 440;
let a2 = 0.5;
let phi2 = 0;       
let type2 = 'sine';

// --- Tracker di stato ---
let lastF1 = -1, lastA1 = -1, lastType1 = '';
let lastF2 = -1, lastA2 = -1, lastType2 = '';

// --- Oscillatori audio (p5.sound) e Analisi (FFT) ---
let osc1, osc2;
let playing1 = false;
let playing2 = false;
let fft;
let specColor; // Gestore della transizione fluida del colore dello spettro

// --- Animazione e UI ---
let animT = 0;
let paused = false;
let f1Slider, a1Slider, phi1Slider, f2Slider, a2Slider, phi2Slider; 
let type1Select, type2Select;
let btnPlay1, btnPlay2, btnPause;
let isFourierPage = false;

// ---- Colori ----
const COL_W1  = '#38bdf8';   
const COL_W2  = '#f472b6';   
const COL_SUM = '#4ade80';   
const COL_BG  = '#050505';   
const COL_TEXT = '#ffffff';

// ============================================================
function setup() {
  let containerEl = document.querySelector('.canvas-wrapper');
  isFourierPage = !!containerEl;

  let canvasWidth = isFourierPage ? windowWidth - 420 : 1000;
  let canvasHeight = isFourierPage ? windowHeight : 780; 

  let cnv = createCanvas(canvasWidth, canvasHeight);
  
  if (isFourierPage && containerEl) {
    cnv.parent(containerEl);
    cnv.style('display', 'block');
    cnv.style('width', '100%');
    cnv.style('height', '100%');
  }
  
  // Iniezione CSS
  createElement('style', `
    .slider-custom { -webkit-appearance: none; background: #27272a !important; height: 6px !important; border-radius: 3px !important; outline: none; }
    .slider-custom::-webkit-slider-thumb { -webkit-appearance: none; background: #ffffff !important; width: 14px !important; height: 14px !important; border-radius: 50% !important; cursor: pointer; border: 1px solid #3f3f46 !important; }
    .btn-custom { background: #18181b !important; color: #ffffff !important; border: 1px solid #27272a !important; border-radius: 6px !important; font-family: "Neue Haas Unica", sans-serif !important; font-size: 12px !important; font-weight: 500 !important; cursor: pointer; transition: all 0.2s ease !important; }
    .btn-custom:hover { background: #27272a !important; border-color: #3f3f46 !important; }
    .btn-custom.active-playing { background: #10b98122 !important; color: #4ade80 !important; border-color: #047857 !important; font-weight: bold !important; }
    .select-custom { background: #18181b !important; color: #ffffff !important; border: 1px solid #27272a !important; border-radius: 6px !important; font-family: "Neue Haas Unica", sans-serif !important; font-size: 12px !important; padding: 2px 6px !important; outline: none; cursor: pointer; }
    .select-custom:hover { background: #27272a !important; }
  `);


  // --- Controlli onda 1 ---
  a1Slider   = makeSlider(0, 200, 80, 1,      75, 42, 115);
  f1Slider   = makeSlider(80, 880, f1, 1,     75, 67, 115);
  phi1Slider = makeSlider(0, TWO_PI, 0, 0.01, 75, 92, 115); 

  type1Select = createSelect().class('select-custom');
  type1Select.position(10, 125);
  type1Select.size(110, 24);
  ['sine','square','sawtooth','triangle'].forEach(t => type1Select.option(t));
  type1Select.selected('sine');

  btnPlay1 = makeButton('▶ Suona 1', 125, 125, 115, playWave1);

  // --- Controlli onda 2 ---
  a2Slider   = makeSlider(0, 200, 50, 1,      305, 42, 115);
  f2Slider   = makeSlider(80, 880, f2, 1,     305, 67, 115);
  phi2Slider = makeSlider(0, TWO_PI, 0, 0.01, 305, 92, 115); 

  type2Select = createSelect().class('select-custom');
  type2Select.position(245, 125);
  type2Select.size(110, 24);
  ['sine','square','sawtooth','triangle'].forEach(t => type2Select.option(t));
  type2Select.selected('sine');

  btnPlay2 = makeButton('▶ Suona 2', 360, 125, 115, playWave2);

  if (isFourierPage) {
    let containerEl = document.querySelector('.canvas-wrapper');
    let uiElements = [a1Slider, f1Slider, phi1Slider, type1Select, btnPlay1, a2Slider, f2Slider, phi2Slider, type2Select, btnPlay2];
    uiElements.forEach(el => {
      if (el && el.elt) {
        containerEl.appendChild(el.elt);
        el.elt.style.position = 'absolute';
        el.elt.style.zIndex = '5';
      }
    });
  }

  // --- Audio ---
  userStartAudio();
  osc1 = new p5.Oscillator(); osc1.amp(0);
  osc2 = new p5.Oscillator(); osc2.amp(0);
  
  fft = new p5.FFT(0, 1024); 
  
  // Inizializza il colore dello spettro sul verde della somma
  specColor = color(COL_SUM); 
}

function windowResized() {
  resizeCanvas(isFourierPage ? windowWidth - 420 : 1000, isFourierPage ? windowHeight : 780);
}

// ============================================================
function draw() {
  background(COL_BG);

  // Leggi i valori correnti dall'interfaccia
  f1 = f1Slider.value();
  a1 = a1Slider.value() / 100;
  phi1 = phi1Slider.value(); 
  type1 = type1Select.value();

  f2 = f2Slider.value();
  a2 = a2Slider.value() / 100;
  phi2 = phi2Slider.value(); 
  type2 = type2Select.value();

  // --- LOGICA AUDIO FLUIDA E OTTIMIZZATA ---
  if (playing1) {
    if (type1 !== lastType1) { osc1.setType(type1); lastType1 = type1; }
    if (f1 !== lastF1)       { osc1.freq(f1, 0.04); lastF1 = f1; } 
    if (a1 !== lastA1)       { osc1.amp(a1 * 0.22, 0.04); lastA1 = a1; } 
  }

  if (playing2) {
    if (type2 !== lastType2) { osc2.setType(type2); lastType2 = type2; }
    if (f2 !== lastF2)       { osc2.freq(f2, 0.04); lastF2 = f2; }
    if (a2 !== lastA2)       { osc2.amp(a2 * 0.22, 0.04); lastA2 = a2; }
  }

  // --- Rendering UI ---
  drawPanelHeader(10,  20, 220, COL_W1,  `Onda 1 — y₁`);
  drawPanelHeader(240, 20, 220, COL_W2,  `Onda 2 — y₂`);

  drawLabel(10,  42, 'Ampiezza'); drawLabel(10,  67, 'Freq (Hz)'); drawLabel(10,  92, 'Fase (°)');
  drawLabel(240, 42, 'Ampiezza'); drawLabel(240, 67, 'Freq (Hz)'); drawLabel(240, 92, 'Fase (°)');

  fill('#a1a1aa'); noStroke(); textSize(12); textAlign(LEFT);
  text((a1).toFixed(2), 195, 54); text(f1 + ' Hz', 195, 79); text(Math.round(degrees(phi1)) + '°', 195, 104);
  text((a2).toFixed(2), 425, 54); text(f2 + ' Hz', 425, 79); text(Math.round(degrees(phi2)) + '°', 425, 104);

  let ly = 180;
  drawLegendDot(30,  ly, COL_W1,  'y₁(x,t)');
  drawLegendDot(160, ly, COL_W2,  'y₂(x,t)');
  drawLegendDot(290, ly, COL_SUM, 'y = y₁ + y₂');

  fill('#71717a'); textStyle(ITALIC);
  text("Nota: Suona le onde per attivare il grafico delle frequenze", 510, ly + 2);
  textStyle(NORMAL);

  // --- Grafico Dominio del Tempo (SINISTRA) ---
  let gx = 10, gy = 210, gw = 480, gh = 500; 
  drawGrid(gx, gy, gw, gh, true);
  
  fill('#ffffff'); textStyle(BOLD); text("Dominio del Tempo", gx + 10, gy + 20); textStyle(NORMAL);

  if (!paused) animT += 0.025;

  let graphFreq1 = map(f1, 80, 880, 0.8, 3.5);
  let graphFreq2 = map(f2, 80, 880, 0.8, 3.5);

  let N = 400;
  let y1vals = [], y2vals = [], ysvals = [];
  for (let i = 0; i < N; i++) {
    let x = map(i, 0, N - 1, 0, 4 * PI);
    let v1 = waveVal(x, animT, graphFreq1, a1, type1, phi1);
    let v2 = waveVal(x, animT, graphFreq2, a2, type2, phi2);
    
    y1vals.push(v1);
    y2vals.push(v2);
    ysvals.push(v1 + v2);
  }

  drawWave(y1vals,  N, gx, gy, gw, gh, COL_W1,  1.5);
  drawWave(y2vals,  N, gx, gy, gw, gh, COL_W2,  1.5);
  drawWave(ysvals,  N, gx, gy, gw, gh, COL_SUM, 2.5);

  // --- Grafico Dominio delle Frequenze (DESTRA) ---
  let rx = 510, ry = 210, rw = 470, rh = 500; 

  drawGrid(rx, ry, rw, rh, false);

  let spectrum = fft.analyze();
  let maxBin = 128; 

  // 1. Identifica il colore TARGET teorico
  let targetColor;
  if (playing1 && !playing2) {
    targetColor = color(COL_W1);  
  } else if (playing2 && !playing1) {
    targetColor = color(COL_W2);  
  } else {
    targetColor = color(COL_SUM); 
  }

  // 2. Interpola linearmente il colore corrente verso quello target (0.18 = velocità di transizione)
  // Questo elimina lo scatto netto di 1 frame assorbendo la latenza del buffer FFT
  specColor = lerpColor(specColor, targetColor, 0.18);

  // Disegna lo Spettro con il colore interpolato
  noStroke();
  fill(specColor);
  
  let barWidth = rw / maxBin; 
  for (let i = 0; i < maxBin; i++) {
    let x = i * barWidth;
    let y = map(spectrum[i], 0, 255, 0, rh - 40); 
    rect(rx + x, ry + rh, barWidth - 0.5, -y);
  }

  fill('#ffffff'); textStyle(BOLD); 
  text("Spettro Frequenze (FFT)", rx + 10, ry + 20); 
  textStyle(NORMAL);
}

// ============================================================
function waveVal(x, t, freq, amp, type, phi) {
  let phase = freq * x - t + phi; 
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

// ============================================================
function drawGrid(gx, gy, gw, gh, drawCenterLine) {
  stroke('#121214'); strokeWeight(1);
  for (let i = gx; i < gx + gw; i += 30) line(i, gy, i, gy + gh);
  for (let j = gy; j < gy + gh; j += 30) line(gx, j, gx + gw, j);
  
  if (drawCenterLine) { stroke('#27272a'); strokeWeight(1.5); line(gx, gy + gh/2, gx + gw, gy + gh/2); }
  
  stroke('#1f1f23'); strokeWeight(1);
  noFill(); rect(gx, gy, gw, gh, 8);
}

function drawPanelHeader(x, y, w, col, label) {
  noStroke(); fill(col); rect(x, y, 4, 14, 2);
  fill('#ffffff'); textSize(13); textAlign(LEFT); textStyle(BOLD); text(label, x + 10, y + 12); textStyle(NORMAL);
}

function drawLabel(x, y, txt) { fill('#71717a'); noStroke(); textSize(12); textAlign(LEFT); text(txt, x, y + 10); }

function drawLegendDot(x, y, col, label) {
  noStroke(); fill(col); ellipse(x + 6, y - 4, 10, 10);
  fill('#e4e4e7'); textSize(11); textAlign(LEFT); text(label, x + 18, y + 1);
}

// ============================================================
// Audio callbacks
function playWave1() {
  userStartAudio();
  if (!playing1) {
    osc1.setType(type1); osc1.freq(f1); osc1.amp(a1 * 0.22); osc1.phase(phi1 / TWO_PI); 
    osc1.start();
    playing1 = true; btnPlay1.html('■ Stop 1').addClass('active-playing');
    lastType1 = type1; lastF1 = f1; lastA1 = a1; 
  } else stopWave1();
}

function playWave2() {
  userStartAudio();
  if (!playing2) {
    osc2.setType(type2); osc2.freq(f2); osc2.amp(a2 * 0.22); osc2.phase(phi2 / TWO_PI); 
    osc2.start();
    playing2 = true; btnPlay2.html('■ Stop 2').addClass('active-playing');
    lastType2 = type2; lastF2 = f2; lastA2 = a2;
  } else stopWave2();
}

function stopWave1() {
  if (playing1) { osc1.amp(0, 0.05); setTimeout(() => osc1.stop(), 60); playing1 = false; btnPlay1.html('▶ Suona 1').removeClass('active-playing'); }
}

function stopWave2() {
  if (playing2) { osc2.amp(0, 0.05); setTimeout(() => osc2.stop(), 60); playing2 = false; btnPlay2.html('▶ Suona 2').removeClass('active-playing'); }
}

// ============================================================
function makeSlider(mn, mx, val, step, x, y, w) {
  let s = createSlider(mn, mx, val, step).class('slider-custom');
  s.position(x, y); s.size(w, 18); return s;
}

function makeButton(label, x, y, w, cb) {
  let b = createButton(label).class('btn-custom');
  b.position(x, y); b.size(w, 28); b.mousePressed(cb); return b;
}