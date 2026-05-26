// --- Parametri Iniziali ---
let fc = 440;
let fm = 220;
let I = 2;

// --- Tracker per Ottimizzazione Audio (come in fourier_waves) ---
let lastFc = -1;
let lastFm = -1;
let lastI = -1;

// --- Oscillatori Audio (Web Audio API) ---
let audioCtx = null;
let carrierOsc = null;
let modulatorOsc = null;
let modulatorGain = null;
let masterGain = null;
let isAudioPlaying = false;

// --- Animazione e UI ---
let animT = 0;
let fcSlider, fmSlider, iSlider;
let btnPlay;

// --- Colori Tema (Stile Fourier Waves) ---
const COL_BG  = '#050505';   
const COL_W1  = '#4ade80'; // Azzurro Portante
const COL_W2  = '#4ade80'; // Rosa Modulante
const COL_SUM = '#4ade80'; // Verde Segnale FM
const COL_TEXT = '#ffffff';

function setup() {
  createCanvas(800, 600);
  
  // Iniezione CSS per replicare esattamente lo stile grafico richiesto
  createElement('style', `
    .slider-custom { -webkit-appearance: none; background: #27272a !important; height: 6px !important; border-radius: 3px !important; outline: none; }
    .slider-custom::-webkit-slider-thumb { -webkit-appearance: none; background: #ffffff !important; width: 14px !important; height: 14px !important; border-radius: 50% !important; cursor: pointer; border: 1px solid #3f3f46 !important; }
    .btn-custom { background: #18181b !important; color: #ffffff !important; border: 1px solid #27272a !important; border-radius: 6px !important; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important; font-size: 12px !important; font-weight: 500 !important; cursor: pointer; transition: all 0.2s ease !important; }
    .btn-custom:hover { background: #27272a !important; border-color: #3f3f46 !important; }
    .btn-custom.active-playing { background: #10b98122 !important; color: #4ade80 !important; border-color: #047857 !important; font-weight: bold !important; }
  `);

  textFont('-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif');

  // --- Creazione UI ---
  // makeSlider(min, max, val, step, x, y, width)
  fcSlider = makeSlider(50, 1500, fc, 1,   20,  67, 150);
  fmSlider = makeSlider(1, 1000, fm, 1,    260, 67, 150);
  iSlider  = makeSlider(0, 30, I, 0.1,     500, 67, 150);

  btnPlay = makeButton('▶ Accendi Audio', 20, 115, 150, toggleAudioEngine);
}

function draw() {
  background(COL_BG);

  // 1. Lettura Parametri Correnti
  fc = fcSlider.value();
  fm = fmSlider.value();
  I = iSlider.value();

  // 2. Aggiornamento Audio Ottimizzato (Evita di inondare l'audio a 60fps)
  if (isAudioPlaying && audioCtx) {
    if (fc !== lastFc) { 
        carrierOsc.frequency.setValueAtTime(fc, audioCtx.currentTime); 
        lastFc = fc; 
    }
    if (fm !== lastFm) { 
        modulatorOsc.frequency.setValueAtTime(fm, audioCtx.currentTime); 
        lastFm = fm; 
    }
    if (I !== lastI || fm !== lastFm) { 
        let deviation = I * fm; 
        modulatorGain.gain.setValueAtTime(deviation, audioCtx.currentTime); 
        lastI = I; 
    }
    
    // Avanza l'animazione dell'oscilloscopio solo se in play
    animT += 0.05;
  }

  // 3. Rendering Interfaccia (Pannelli e Testi)
  drawPanelHeader(20,  20, 220, COL_W1,  'Portante (Fc)');
  drawPanelHeader(260, 20, 220, COL_W2,  'Modulante (Fm)');
  drawPanelHeader(500, 20, 220, COL_SUM, 'Indice di Modulazione (I)');

  drawLabel(20,  42, 'Frequenza (Hz)');
  drawLabel(260, 42, 'Frequenza (Hz)');
  drawLabel(500, 42, 'Quantità (Dev/Fm)');

  fill('#a1a1aa'); noStroke(); textSize(12); textAlign(LEFT);
  text(fc + ' Hz', 180, 79);
  text(fm + ' Hz', 420, 79);
  text(I.toFixed(1), 660, 79);

  // Legenda
  drawLegendDot(20, 160, COL_SUM, 'Onda Modulata in Frequenza (FM)');

  // 4. Rendering Griglia Oscilloscopio
  let gx = 20, gy = 185, gw = 760, gh = 395; 
  drawGrid(gx, gy, gw, gh, true);

  // 5. Calcolo e Disegno Forma d'Onda FM
  let visBaseCycles = 4;
  let visFc = 1; 
  let visRatio = fm / fc; 
  let visFm = visRatio * visFc;

  let N = 800; // Alta risoluzione per una curva morbida
  let yvals = [];

  for (let i = 0; i < N; i++) {
    // Normalizziamo l'asse X e applichiamo animT per lo scorrimento
    let tNorm = map(i, 0, N - 1, 0, TWO_PI * visBaseCycles);
    let t = tNorm - animT;
    
    // Formula esatta dell'FM
    let phase = visFc * t + I * sin(visFm * t);
    yvals.push(sin(phase));
  }

  // Tracciato
  stroke(COL_SUM); 
  strokeWeight(2.5); 
  noFill();
  
  let midY = gy + gh / 2;
  let scaleY = gh / 2.5; // Margine interno

  beginShape();
  for (let i = 0; i < N; i++) {
    let px = gx + map(i, 0, N - 1, 0, gw);
    let py = midY - yvals[i] * scaleY;
    // Vincoliamo l'onda dentro la griglia per pulizia
    py = constrain(py, gy, gy + gh);
    vertex(px, py);
  }
  endShape();
}

// ============================================================
// Motore Audio NATIVO
// ============================================================
function toggleAudioEngine() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    carrierOsc = audioCtx.createOscillator();
    modulatorOsc = audioCtx.createOscillator();
    modulatorGain = audioCtx.createGain();
    masterGain = audioCtx.createGain();
    
    carrierOsc.type = 'sine';
    modulatorOsc.type = 'sine';
    
    // Connessioni FM routing
    modulatorOsc.connect(modulatorGain);
    modulatorGain.connect(carrierOsc.frequency);
    carrierOsc.connect(masterGain);
    masterGain.connect(audioCtx.destination);
    
    masterGain.gain.setValueAtTime(0.15, audioCtx.currentTime); // Volume sicuro
    
    carrierOsc.start();
    modulatorOsc.start();
  }

  if (!isAudioPlaying) {
    audioCtx.resume();
    btnPlay.html('■ Spegni Audio').addClass('active-playing');
    isAudioPlaying = true;
    
    // Forza reset dei tracker al resume
    lastFc = -1; 
  } else {
    audioCtx.suspend();
    btnPlay.html('▶ Accendi Audio').removeClass('active-playing');
    isAudioPlaying = false;
  }
}

// ============================================================
// Utility Rendering & UI (Ricalcate su fourier_waves.js)
// ============================================================
function drawGrid(gx, gy, gw, gh, drawCenterLine) {
  stroke('#121214'); strokeWeight(1);
  for (let i = gx; i < gx + gw; i += 30) line(i, gy, i, gy + gh);
  for (let j = gy; j < gy + gh; j += 30) line(gx, j, gx + gw, j);
  
  if (drawCenterLine) { 
    stroke('#27272a'); 
    strokeWeight(1.5); 
    line(gx, gy + gh/2, gx + gw, gy + gh/2); 
  }
  
  stroke('#1f1f23'); strokeWeight(1);
  noFill(); rect(gx, gy, gw, gh, 8);
}

function drawPanelHeader(x, y, w, col, label) {
  noStroke(); fill(col); rect(x, y, 4, 14, 2);
  fill('#ffffff'); textSize(13); textAlign(LEFT); textStyle(BOLD); 
  text(label, x + 10, y + 12); 
  textStyle(NORMAL);
}

function drawLabel(x, y, txt) { 
  fill('#71717a'); noStroke(); textSize(12); textAlign(LEFT); 
  text(txt, x, y + 10); 
}

function drawLegendDot(x, y, col, label) {
  noStroke(); fill(col); ellipse(x + 6, y - 4, 10, 10);
  fill('#e4e4e7'); textSize(11); textAlign(LEFT); text(label, x + 18, y + 1);
}

function makeSlider(mn, mx, val, step, x, y, w) {
  let s = createSlider(mn, mx, val, step).class('slider-custom');
  s.position(x, y); s.size(w, 18); 
  return s;
}

function makeButton(label, x, y, w, cb) {
  let b = createButton(label).class('btn-custom');
  b.position(x, y); b.size(w, 28); b.mousePressed(cb); 
  return b;
}