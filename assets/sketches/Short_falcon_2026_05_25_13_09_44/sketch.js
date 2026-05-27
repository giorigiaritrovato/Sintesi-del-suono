let osc;
let isPlaying = false;

// --- Parametri Onda ---
let amp = 0.5;
let freq = 440;
let type = 'sine';
let phase = 0; // Nuova variabile per lo sfasamento statico dell'onda

// --- Elementi UI ---
let sliderAmp, sliderFreq, sliderPhase;
let selectType, btnPlay;

// --- Configurazione Cromatico/Estetica ---
const COL_W1   = '#ff0095';   // Magenta
const COL_BG     = '#050505';   // Fondo Scuro Profondo
const COL_TEXT   = '#ffffff';

// ============================================================
function setup() {
  // Altezza del canvas aumentata a 640px per ospitare comodamente il terzo slider
  createCanvas(500, 640);

  // Iniezione dinamica del foglio di stile CSS lineare e moderno
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
      font-family: "Neue Haas Unica", sans-serif !important;
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
      font-family: "Neue Haas Unica", sans-serif !important;
      font-size: 12px !important;
      padding: 2px 6px !important;
      outline: none;
      cursor: pointer;
    }
    .select-custom:hover {
      background: #27272a !important;
    }
  `);

  textFont("neue-haas-unica");

  // --- Generazione Controlli Generici (Riorganizzati spazialmente) ---
  sliderAmp   = makeSlider(0, 1, 0.5, 0.01,   100, 45, 160);
  sliderFreq  = makeSlider(60, 1500, 440, 1,  100, 75, 160);
  sliderPhase = makeSlider(0, TWO_PI, 0, 0.01, 100, 105, 160); // Nuovo Slider per la Fase

  // --- Menu Selezione Tipo Onda ---
  selectType = createSelect().class('select-custom');
  selectType.position(10, 140);
  selectType.size(130, 26);
  selectType.option('Sinusoidale', 'sine'); 
  selectType.option('Quadra', 'square'); 
  selectType.option('Triangolare', 'triangle'); 
  selectType.option('Dente di Sega', 'sawtooth');
  selectType.selected('sine');

  // --- Pulsante di Attivazione Audio ---
  btnPlay = makeButton('▶ Avvia Audio', 155, 139, 115, toggleOsc);

  // --- Inizializzazione Audio ---
  userStartAudio();
  osc = new p5.Oscillator('sine');
  osc.amp(0);
}

// ============================================================
function draw() {
  background(COL_BG);

  // Lettura dinamica dei dati dagli slider e dai menu
  amp = sliderAmp.value();
  freq = sliderFreq.value();
  type = selectType.value();
  phase = sliderPhase.value();

  // Sincronizzazione audio in tempo reale (attenuato a 0.3 per evitare clipping)
  if (isPlaying) { 
    osc.freq(freq); 
    osc.amp(amp * 0.3, 0.05); 
    osc.setType(type); 
    osc.phase(phase / TWO_PI); // Mappa il range 0-2PI nel range 0.0-1.0 richiesto da p5.Oscillator
  }

  // [NOTARE] Rimossa l'istruzione di incremento temporale (t += 0.02) per immobilizzare l'onda

  // --- Disegno Header e Etichette d'Interfaccia ---
  drawPanelHeader(10, 20, 480, COL_W1, 'Strumento di Visualizzazione Audio');
  
  drawLabel(10, 48, 'Ampiezza');
  drawLabel(10, 78, 'Freq (Hz)');
  drawLabel(10, 108, 'Fase (rad)');

  // Valori numerici live accanto ai rispettivi slider
  fill('#a1a1aa'); noStroke(); textSize(12); textAlign(LEFT);
  text(amp.toFixed(2), 275, 58);
  text(freq + ' Hz',   275, 88);
  text(phase.toFixed(2), 275, 118);

  // --- Legenda ---
  drawLegendDot(10, 190, COL_W1, 'Forma d\'onda corrente');

  // --- Area del Grafico (Oscilloscopio traslata verso il basso) ---
  let gx = 10, gy = 220, gw = 480, gh = 400;
  drawGrid(gx, gy, gw, gh);

  // --- LOGICA ANTIALIASING (ZOOM ADATTIVO) ---
  let N = 400;
  let yvals = [];
  let numCycles = map(freq, 60, 1500, 2, 7);

  for (let i = 0; i < N; i++) {
    let xNormalized = i / (N - 1);
    // Sostituito il decremento temporale con il fattore di sfasamento statico manuale (+ phase)
    let angle = (xNormalized * numCycles * TWO_PI) + phase;
    yvals.push(evaluateWave(type, angle) * amp);
  }

  // Rendering della curva d'onda all'interno dei confini della griglia
  drawWave(yvals, N, gx, gy, gw, gh, COL_W1, 2.5);
}

// ============================================================
// Generatore matematico delle forme d'onda primitive
function evaluateWave(type, angle) {
  angle = angle % TWO_PI;
  if (angle < 0) angle += TWO_PI;

  if (type === 'sine')     return sin(angle);
  if (type === 'square')   return angle < PI ? 1 : -1;
  if (type === 'triangle') return angle < PI ? map(angle, 0, PI, -1, 1) : map(angle, PI, TWO_PI, 1, -1);
  if (type === 'sawtooth') return map(angle, 0, TWO_PI, -1, 1);
  return 0;
}

// ============================================================
// Disegno Elementi di Interfaccia sul Canvas
function drawWave(vals, N, gx, gy, gw, gh, col, sw) {
  stroke(col); strokeWeight(sw); noFill();
  let mid = gy + gh / 2;
  let scale = (gh / 2) * 0.85; 
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
  for (let i = gx; i < gx + gw; i += 30) {
    line(i, gy, i, gy + gh);
  }
  for (let j = gy; j < gy + gh; j += 30) {
    line(gx, j, gx + gw, j);
  }
  
  stroke('#27272a'); strokeWeight(1.5);
  line(gx, gy + gh/2, gx + gw, gy + gh/2);
  
  stroke('#1f1f23'); strokeWeight(1);
  noFill(); rect(gx, gy, gw, gh, 8);
}

function drawPanelHeader(x, y, w, col, label) {
  noStroke();
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
  ellipse(x + 6, y - 4, 10, 10);
  
  fill('#e4e4e7'); textSize(12); textAlign(LEFT);
  text(label, x + 18, y + 1);
}

// ============================================================
// Callback Gestione Audio e Stati UI attivi
function toggleOsc() {
  userStartAudio();
  if (!isPlaying) { 
    osc.start(); 
    isPlaying = true; 
    btnPlay.html('■ Ferma Audio').addClass('active-playing');
  } else { 
    osc.stop(); 
    isPlaying = false; 
    btnPlay.html('▶ Avvia Audio').removeClass('active-playing');
  }
}

// ============================================================
// Costruttori Utilità UI DOM
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