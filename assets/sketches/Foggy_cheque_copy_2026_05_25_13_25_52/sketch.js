let oscillator, filter, fft;
let isPlaying = false;

// --- Elementi UI ---
let freqSlider, timbreSlider, viewSelect, btnPlay;

// --- Variabili di rendering e Storico ---
let gw = 480; // Larghezza grafica standard
let gh_spectrogram = 300;
let gh_waveform = 120;
let spectrumHistory = [];
let historyIndex = 0;
let maxHistory = 50; // Per il 3D Waterfall

// --- Palette Colori Stile Zinc ---
const COL_W1   = '#38bdf8';   // Azzurro Ciano (Blob / Spettro principale)
const COL_W2   = '#f472b6';   // Rosa Pastello (Waterfall / Forma d'onda)
const COL_SUM  = '#4ade80';   // Verde Smeraldo
const COL_BG   = '#050505';   // Fondo Scuro Profondo
const COL_TEXT = '#ffffff';

function setup() {
  createCanvas(500, 780);
  
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

  textFont('"Neue Haas Unica", sans-serif');

  // --- Audio Setup ---
  oscillator = new p5.Oscillator('sawtooth');
  filter = new p5.LowPass();
  fft = new p5.FFT(0.8, 1024);
  
  oscillator.disconnect();
  oscillator.connect(filter);
  filter.connect();

  // --- UI Setup ---
  btnPlay = makeButton('▶ Avvia Audio', 10, 50, 115, togglePlay);

  viewSelect = createSelect().class('select-custom');
  viewSelect.position(135, 52);
  viewSelect.size(200, 24);
  viewSelect.option('Spettrogramma Classico', '1');
  viewSelect.option('Spettro ad Area (Blob)', '2');
  viewSelect.option('Waterfall 3D', '3');
  viewSelect.selected('2');

  freqSlider = makeSlider(20, 2000, 220, 1, 135, 98, 200);
  timbreSlider = makeSlider(20, 15000, 2000, 1, 135, 128, 200);

  // Inizializza buffer per spettrogramma
  for(let i=0; i < gw; i++) {
    spectrumHistory[i] = new Array(150).fill(0);
  }
}

function draw() {
  background(COL_BG);

  let freqVal = freqSlider.value();
  let timbreVal = timbreSlider.value();

  // Aggiorna Audio
  if (isPlaying) {
    oscillator.freq(freqVal);
    filter.freq(timbreVal);
  }

  let spectrum = fft.analyze();
  let waveform = fft.waveform();

  // --- Disegno Pannelli di Controllo ---
  drawPanelHeader(10, 20, 480, COL_W1, 'Sintetizzatore & Audio');
  
  drawLabel(10, 90, 'Frequenza (Hz)');
  drawLabel(10, 120, 'Timbro (Cutoff)');

  // Valori live
  fill('#a1a1aa'); noStroke(); textSize(12); textAlign(LEFT);
  text(freqVal + ' Hz', 345, 100);
  text(timbreVal + ' Hz', 345, 130);

  // --- Sezione Spettro (Metodi 1, 2, 3) ---
  drawPanelHeader(10, 175, 480, COL_W1, 'Analisi Frequenze (Spettro)');
  let gx1 = 10, gy1 = 205;
  drawGrid(gx1, gy1, gw, gh_spectrogram);

  let mode = viewSelect.value();
  push();
  if (mode === '1') renderMethod1(spectrum, gx1, gy1, gw, gh_spectrogram);
  else if (mode === '2') renderMethod2(spectrum, gx1, gy1, gw, gh_spectrogram);
  else if (mode === '3') renderMethod3(spectrum, gx1, gy1, gw, gh_spectrogram);
  pop();

  // --- Sezione Forma d'Onda ---
  drawPanelHeader(10, 525, 480, COL_W2, 'Dominio del Tempo (Forma d\'Onda)');
  let gx2 = 10, gy2 = 555;
  drawGrid(gx2, gy2, gw, gh_waveform);
  drawSimpleWaveform(waveform, gx2, gy2, gw, gh_waveform);
}

// ============================================================
// --- METODO 1: Spettrogramma Classico ---
function renderMethod1(spectrum, gx, gy, gw, gh) {
  let binsToShow = Math.floor(gh / 2); // Adatta ai pixel verticali
  
  // Aggiorna buffer circolare
  let currentSlice = [];
  for(let i=0; i<binsToShow; i++) currentSlice[i] = spectrum[i];
  spectrumHistory[historyIndex] = currentSlice;
  historyIndex = (historyIndex + 1) % gw;

  noStroke();
  for(let x = 0; x < gw; x++){
    let idx = (historyIndex + x) % gw;
    let slice = spectrumHistory[idx];
    for(let y = 0; y < binsToShow; y++){
      let intensity = slice[y];
      if(intensity > 5) {
        fill(getThermalColor(intensity, false));
        rect(gx + x, gy + gh - (y * 2), 1, 2);
      }
    }
  }
}

// --- METODO 2: Blob/Area Smooth ---
function renderMethod2(spectrum, gx, gy, gw, gh) {
  let c = color(COL_W1);
  noStroke();
  
  // Effetto "Glow" morbido
  for(let i = 0; i < 4; i++) {
    beginShape();
    fill(red(c), green(c), blue(c), 30 - i * 5); 
    vertex(gx, gy + gh);
    for (let j = 0; j < 200; j++) {
      let x = map(j, 0, 200, gx, gx + gw);
      let h = map(spectrum[j], 0, 255, 0, gh);
      curveVertex(x, gy + gh - h + (i * 4));
    }
    vertex(gx + gw, gy + gh);
    endShape(CLOSE);
  }

  // Linea di picco solida
  stroke(COL_W1);
  strokeWeight(2);
  noFill();
  beginShape();
  for (let j = 0; j < 200; j++) {
    let x = map(j, 0, 200, gx, gx + gw);
    let h = map(spectrum[j], 0, 255, 0, gh);
    vertex(x, gy + gh - h);
  }
  endShape();
}

// --- METODO 3: Waterfall 3D ---
function renderMethod3(spectrum, gx, gy, gw, gh) {
  // Salviamo solo gli ultimi frame per la cascata
  if(frameCount % 2 === 0) {
    // Array separato per il waterfall, ricicliamo historyIndex concettualmente
    spectrumHistory.unshift([...spectrum.slice(0, 120)]);
    if(spectrumHistory.length > maxHistory) spectrumHistory.pop();
  }

  // Margini interni per effetto 3D
  let drawW = gw - 120;
  let baseX = gx + 10;
  
  // Disegno dal fondo verso il davanti
  for (let i = spectrumHistory.length - 1; i >= 0; i--) {
    if(!spectrumHistory[i]) continue;

    let offsetZ = i * 2.5;
    let offsetX = i * 2;
    let baseY = gy + gh - 10 - offsetZ;
    
    beginShape();
    let normI = map(i, 0, maxHistory, 1, 0); // 1 dietro, 0 davanti
    
    // Sfumatura tra Ciano e Rosa
    let c1 = color(COL_W1);
    let c2 = color(COL_W2);
    let col = lerpColor(c1, c2, normI);
    col.setAlpha(200); // Trasparenza per far respirare il 3D
    
    fill(col);
    stroke('#121214'); // Bordo in stile scuro
    strokeWeight(0.5);
    
    vertex(baseX + offsetX, baseY);
    for (let j = 0; j < spectrumHistory[i].length; j++) {
      let x = map(j, 0, 120, 0, drawW) + baseX + offsetX;
      let h = map(spectrumHistory[i][j], 0, 255, 0, 120);
      vertex(x, baseY - h);
    }
    vertex(baseX + offsetX + drawW, baseY);
    endShape(CLOSE);
  }
}

// --- Forma d'Onda Semplice ---
function drawSimpleWaveform(w, gx, gy, gw, gh) {
  stroke(COL_W2);
  strokeWeight(2);
  noFill();
  let midY = gy + gh / 2;
  
  beginShape();
  for(let i=0; i<w.length; i++) {
    let x = map(i, 0, w.length, gx, gx + gw);
    let y = map(w[i], -1, 1, midY + (gh/2 * 0.8), midY - (gh/2 * 0.8));
    vertex(x, y);
  }
  endShape();
}

// ============================================================
// --- Utilities di Supporto ---

function getThermalColor(v, is3D = false) {
  colorMode(HSB, 360, 100, 100);
  let h = map(v, 0, 255, 240, 0); // Da blu a rosso termico
  let c = color(h, 80, 90);
  colorMode(RGB);
  return c;
}

function drawGrid(gx, gy, gw, gh) {
  stroke('#121214'); strokeWeight(1);
  for (let i = gx; i < gx + gw; i += 30) line(i, gy, i, gy + gh);
  for (let j = gy; j < gy + gh; j += 30) line(gx, j, gx + gw, j);
  
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

function togglePlay() {
  userStartAudio(); // Obbligatorio per i browser moderni
  if (isPlaying) {
    oscillator.stop();
    btnPlay.html('▶ Avvia Audio').removeClass('active-playing');
  } else {
    oscillator.start();
    btnPlay.html('■ Ferma Audio').addClass('active-playing');
  }
  isPlaying = !isPlaying;
}

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