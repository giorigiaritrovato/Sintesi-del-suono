// --- Stati dell'applicazione ---
let osc1;
let isPlaying = false;
let timeOffset = 0;

// --- Controlli UI ---
let btnPlay;
let sliderFreq1, sliderAmp1, sliderSpeed;
let sliderSampleRate, sliderBits;

// --- Palette Colori (Stile Lineare e Scuro) ---
const COL_ANALOG  = '#38bdf8';   // Azzurro Ciano (Onda continua)
const COL_DIGITAL = '#4ade80';   // Verde Smeraldo (Onda digitalizzata)
const COL_BG      = '#050505';   // Fondo Scuro Profondo
const COL_TEXT    = '#ffffff';

// ============================================================
function setup() {
  createCanvas(800, 600);

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
  `);

  textFont('-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif');

  // --- INIZIALIZZAZIONE AUDIO ---
  userStartAudio();
  osc1 = new p5.Oscillator('sine');
  osc1.disconnect();
  osc1.connect();
  osc1.amp(0);

  // --- CONFIGURAZIONE INTERFACCIA UTENTE (UI) ---
  // Colonna 1: Parametri Onda
  sliderAmp1  = makeSlider(0, 1, 0.5, 0.01,  100, 47, 150);
  sliderFreq1 = makeSlider(100, 800, 220, 1, 100, 77, 150);

  // Colonna 2: Parametri Digitali
  sliderBits       = makeSlider(2, 10, 3, 1,    500, 47, 150);
  btnPlay          = makeButton('▶ Avvia Audio', 500, 107, 150, toggleAudio);
}

// ============================================================
function draw() {
  background(COL_BG);

  // Leggi i valori in tempo reale dai cursori
  let freq = sliderFreq1.value();
  let amp = sliderAmp1.value();
  let speed = 1; // Valore fisso
  let sampleDist = 2; // Valore fisso
  let bitDepth = sliderBits.value();

  // Aggiorna audio e animazione
  if (isPlaying) {
    osc1.freq(freq);
    osc1.amp(amp * 0.4, 0.1);
    timeOffset += (speed * 0.05);
  }

  // --- Header dei pannelli di controllo ---
  drawPanelHeader(10,  20, 250, COL_ANALOG,  'Parametri Onda analogica');
  drawPanelHeader(380, 20, 250, COL_DIGITAL, 'Configurazione Digitale (ADC)');

  // Label dei parametri
  drawLabel(10,  50, 'Ampiezza');
  drawLabel(10,  80, 'Frequenza');
  
  drawLabel(380, 50, 'Risoluzione');

  // Valori numerici live in stile Zinc
  fill('#a1a1aa'); noStroke(); textSize(12); textAlign(LEFT);
  text(amp.toFixed(2), 265, 52);
  text(freq + ' Hz',   265, 80);
  
  text(bitDepth + ' bit (' + pow(2, bitDepth) + ' liv.)', 665, 52);

  // --- Legenda ---
  let ly = 165;
  drawLegendDot(10,  ly, COL_ANALOG,  'Onda Analogica Continua');
  drawLegendDot(240, ly, COL_DIGITAL, 'Segnale Quantizzato (DAC Tensione/Tempo)');

  // --- Dimensioni e calcoli del Grafico ---
  let gx = 10, gy = 195, gw = 780, gh = 385;
  let centerY = gy + gh / 2;
  let quantLevels = pow(2, bitDepth);
  let qStep = gh / (quantLevels - 1);

  // Disegno della griglia geometrica integrata con i livelli di quantizzazione
  drawGrid(gx, gy, gw, gh, quantLevels, qStep);

  // --- RAPPRESENTAZIONE GRAFICA DELLE ONDE ---
  let maxAmpPixels = gh / 2 - 15;
  let visualFreq = freq * 0.0002;

  // 1. Onda Analogica Continua (Sfondo)
  noFill();
  stroke(color(56, 189, 248, 100)); // COL_ANALOG trasparente per non sovraccaricare
  strokeWeight(2);
  beginShape();
  for (let x = gx; x <= gx + gw; x++) {
    let angle = (x - gx) * visualFreq - timeOffset;
    let y = centerY + sin(angle) * (amp * maxAmpPixels);
    vertex(x, y);
  }
  endShape();

  // 2. Onda Digitalizzata (Campionamento + Quantizzazione DAC)
  let previousSampledQ = null;
  let previousX = null;

  for (let x = gx; x <= gx + gw; x += sampleDist) {
    let angle = (x - gx) * visualFreq - timeOffset;
    let exactY = centerY + sin(angle) * (amp * maxAmpPixels);

    // Mappatura e arrotondamento al gradino quantizzato più vicino
    let relativeY = exactY - gy; 
    let nearestLevel = round(relativeY / qStep);
    let quantizedY = gy + nearestLevel * qStep;

    // Linea verticale di proiezione del campione (finitura radar/tecnica)
    stroke('#1f1f23');
    strokeWeight(1);
    line(x, centerY, x, quantizedY);

    // Disegno del gradino d'onda continuo (Ricostruzione Zero-Order Hold)
    if (previousSampledQ !== null) {
      stroke(COL_DIGITAL);
      strokeWeight(2);
      line(previousX, previousSampledQ, x, previousSampledQ); // Tenuta del valore
      line(x, previousSampledQ, x, quantizedY);             // Salto quantico
    }

    // Punto di campionamento discreto finale
    fill(COL_DIGITAL);
    noStroke();
    ellipse(x, quantizedY, 5, 5);

    previousSampledQ = quantizedY;
    previousX = x;
  }
}

// ============================================================
// Funzioni di rendering ed elementi grafici custom
function drawGrid(gx, gy, gw, gh, quantLevels, qStep) {
  stroke('#111113'); strokeWeight(1);
  // Linee di griglia verticali fitte
  for (let i = gx; i < gx + gw; i += 40) {
    line(i, gy, i, gy + gh);
  }
  
  // Linee di quantizzazione orizzontali reali
  stroke('#161619');
  for (let i = 0; i < quantLevels; i++) {
    let y = gy + i * qStep;
    line(gx, y, gx + gw, y);
  }
  
  // Asse centrale di equilibrio (Zero)
  stroke('#27272a'); strokeWeight(1.5);
  line(gx, gy + gh / 2, gx + gw, gy + gh / 2);
  
  // Bordo contenitore esterno arrotondato
  stroke('#1f1f23'); strokeWeight(1);
  noFill(); rect(gx, gy, gw, gh, 8);
}

function drawPanelHeader(x, y, w, col, label) {
  noStroke();
  fill(col);
  rect(x, y, 4, 14, 2); // Indicatore di sezione verticale
  
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
// Gestione Callbacks Audio & Cambiamenti di stato
function toggleAudio() {
  userStartAudio();
  if (!isPlaying) {
    osc1.start();
    btnPlay.html('■ Ferma Audio').addClass('active-playing');
    isPlaying = true;
  } else {
    osc1.amp(0, 0.05);
    setTimeout(() => osc1.stop(), 100);
    btnPlay.html('▶ Avvia Audio').removeClass('active-playing');
    isPlaying = false;
  }
}

// ============================================================
// Utility Costruttori Interfaccia Utente
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