// --- Parametri di Sintesi ---
let synthAmp = 0.8;
let synthFreq = 220;
let harmonicsNum = 4;
let synthType = 'square';

// Tracker di stato per modifiche real-time stabili
let lastSynthFreq = -1, lastSynthAmp = -1, lastHarmonicsNum = -1, lastSynthType = '';

// Web Audio nativo
let synthOsc = null;  
let synthGain = null; 
let playingSynth = false;

let animT = 0;
let synthAmpSlider, synthFreqSlider, harmonicsSlider, synthTypeSelect, btnPlaySynth;
const COL_SYNTH  = '#a855f7';   // Viola
const COL_BG     = '#050505';   

function setup() {
  // Tela adatta per un singolo pannello compatto
  createCanvas(500, 780);
  
  createElement('style', `
    .slider-custom { -webkit-appearance: none; background: #27272a !important; height: 6px !important; border-radius: 3px !important; outline: none; }
    .slider-custom::-webkit-slider-thumb { -webkit-appearance: none; background: #ffffff !important; width: 14px !important; height: 14px !important; border-radius: 50% !important; cursor: pointer; border: 1px solid #3f3f46 !important; }
    .btn-custom { background: #18181b !important; color: #ffffff !important; border: 1px solid #27272a !important; border-radius: 6px !important; font-family: "Neue Haas Unica", sans-serif !important; font-size: 12px !important; font-weight: 500 !important; cursor: pointer; transition: all 0.2s ease !important; }
    .btn-custom:hover { background: #27272a !important; border-color: #3f3f46 !important; }
    .btn-custom.active-playing { background: #10b98122 !important; color: #4ade80 !important; border-color: #047857 !important; font-weight: bold !important; }
    .select-custom { background: #18181b !important; color: #ffffff !important; border: 1px solid #27272a !important; border-radius: 6px !important; font-family: "Neue Haas Unica", sans-serif !important; font-size: 12px !important; padding: 2px 6px !important; outline: none; cursor: pointer; }
  `);

  textFont("neue-haas-unica");

  // Interfaccia di controllo posizionata a sinistra del pannello dedicato
  synthAmpSlider  = makeSlider(0, 200, 80, 1,     85, 42, 115);
  synthFreqSlider = makeSlider(80, 880, 220, 1,   85, 67, 115);
  harmonicsSlider = makeSlider(1, 32, 4, 1,       85, 92, 115);

  synthTypeSelect = createSelect().class('select-custom');
  synthTypeSelect.position(10, 125); synthTypeSelect.size(120, 24);
  synthTypeSelect.option('Onda Quadra', 'square');
  synthTypeSelect.option('Onda Dente Sega', 'sawtooth');
  synthTypeSelect.option('Onda Triangolare', 'triangle');
  synthTypeSelect.selected('square');

  btnPlaySynth = makeButton('▶ Suona Sintesi', 145, 125, 125, playWaveSynth);
}

function draw() {
  background(COL_BG);

  synthAmp = synthAmpSlider.value() / 100;
  synthFreq = synthFreqSlider.value();
  harmonicsNum = harmonicsSlider.value();
  synthType = synthTypeSelect.value();

  // Controllo variazioni ed esecuzione thread audio dedicati
  if (playingSynth) {
    let ctx = getAudioContext();
    if (synthFreq !== lastSynthFreq) { synthOsc.frequency.setValueAtTime(synthFreq, ctx.currentTime); lastSynthFreq = synthFreq; }
    if (synthAmp !== lastSynthAmp)   { synthGain.gain.setValueAtTime(synthAmp * 0.25, ctx.currentTime); lastSynthAmp = synthAmp; }
    if (harmonicsNum !== lastHarmonicsNum || synthType !== lastSynthType) {
      updateSynthWave();
      lastHarmonicsNum = harmonicsNum; lastSynthType = synthType;
    }
  }

  // Costruzione della grafica
  drawPanelHeader(10, 20, 460, COL_SYNTH, `Serie di Fourier — Approssimazione (${harmonicsNum} Armon.)`);
  drawLabel(10, 42, 'Ampiezza'); drawLabel(10, 67, 'Freq (Hz)'); drawLabel(10, 92, 'N. Armoniche');
  
  fill('#a1a1aa'); noStroke(); textSize(12); textAlign(LEFT);
  text((synthAmp).toFixed(2), 210, 54); text(synthFreq + ' Hz', 210, 79); text(harmonicsNum, 210, 104);
  drawLegendDot(10, 180, COL_SYNTH, 'Onda Risultante (Somma Armonica)');

  let gx = 10, gy = 210, gw = 480, gh = 500;
  drawGrid(gx, gy, gw, gh, true);

  animT += 0.025;

  // Matematica discreta di Fourier per la simulazione grafica dello spettro
  let graphSynthFreq = map(synthFreq, 80, 880, 0.8, 3.5);
  let N = 400;
  let ySynthVals = [];

  for (let i = 0; i < N; i++) {
    let x = map(i, 0, N - 1, 0, 4 * PI);
    let phase = graphSynthFreq * x - animT;
    let totalY = 0;

    if (synthType === 'square') {
      for (let k = 0; k < harmonicsNum; k++) {
        let n = 2 * k + 1;
        totalY += (4.0 / PI) * (1.0 / n) * sin(n * phase);
      }
    } else if (synthType === 'sawtooth') {
      for (let n = 1; n <= harmonicsNum; n++) {
        let sign = (n % 2 === 0) ? -1 : 1;
        totalY += (2.0 / PI) * (sign / n) * sin(n * phase);
      }
    } else if (synthType === 'triangle') {
      for (let k = 0; k < harmonicsNum; k++) {
        let n = 2 * k + 1;
        let sign = (k % 2 === 0) ? 1 : -1;
        totalY += (8.0 / (PI * PI)) * (sign / (n * n)) * sin(n * phase);
      }
    }
    ySynthVals.push(totalY * synthAmp);
  }
  drawWave(ySynthVals, N, gx, gy, gw, gh, COL_SYNTH, 2.5);
}

// ============================================================
function updateSynthWave() {
  if (!playingSynth || !synthOsc) return;
  let ctx = getAudioContext();
  let maxIdx = synthType === 'sawtooth' ? harmonicsNum : (2 * harmonicsNum - 1);
  let real = new Float32Array(maxIdx + 1);
  let imag = new Float32Array(maxIdx + 1);
  
  if (synthType === 'square') {
    for (let k = 0; k < harmonicsNum; k++) { let n = 2 * k + 1; imag[n] = 4 / (Math.PI * n); }
  } else if (synthType === 'sawtooth') {
    for (let n = 1; n <= harmonicsNum; n++) { let sign = (n % 2 === 0) ? -1 : 1; imag[n] = 2 / (Math.PI * n) * sign; }
  } else if (synthType === 'triangle') {
    for (let k = 0; k < harmonicsNum; k++) { let n = 2 * k + 1; let sign = (k % 2 === 0) ? 1 : -1; imag[n] = (8 / (Math.PI * Math.PI)) * (sign / (n * n)); }
  }
  
  let pWave = ctx.createPeriodicWave(real, imag, {disableNormalization: false});
  synthOsc.setPeriodicWave(pWave);
}

function playWaveSynth() {
  userStartAudio();
  let ctx = getAudioContext();
  
  if (!playingSynth) {
    synthOsc = ctx.createOscillator(); synthGain = ctx.createGain();
    synthGain.connect(ctx.destination); synthOsc.connect(synthGain);
    
    synthOsc.frequency.setValueAtTime(synthFreqSlider.value(), ctx.currentTime);
    synthGain.gain.setValueAtTime((synthAmpSlider.value() / 100) * 0.25, ctx.currentTime);
    
    playingSynth = true;
    updateSynthWave();
    synthOsc.start();
    btnPlaySynth.html('■ Stop S.').addClass('active-playing');
  } else {
    stopWaveSynth();
  }
}

function stopWaveSynth() {
  if (playingSynth) {
    if (synthGain) synthGain.gain.linearRampToValueAtTime(0, getAudioContext().currentTime + 0.05);
    let toStop = synthOsc;
    setTimeout(() => { try { toStop.stop(); } catch(e){} }, 60);
    playingSynth = false; btnPlaySynth.html('▶ Suona Sintesi').removeClass('active-playing');
  }
}

function drawWave(vals, N, gx, gy, gw, gh, col, sw) {
  stroke(col); strokeWeight(sw); noFill();
  let mid = gy + gh / 2; let scale = gh / 2 / 2.8; 
  beginShape();
  for (let i = 0; i < N; i++) {
    let px = gx + map(i, 0, N - 1, 0, gw);
    let py = mid - vals[i] * scale;
    vertex(px, py);
  }
  endShape();
}

function drawGrid(gx, gy, gw, gh, drawCenterLine) {
  stroke('#121214'); strokeWeight(1);
  for (let i = gx; i < gx + gw; i += 30) line(i, gy, i, gy + gh);
  for (let j = gy; j < gy + gh; j += 30) line(gx, j, gx + gw, j);
  if (drawCenterLine) { stroke('#27272a'); strokeWeight(1.5); line(gx, gy + gh/2, gx + gw, gy + gh/2); }
  stroke('#1f1f23'); strokeWeight(1); noFill(); rect(gx, gy, gw, gh, 8);
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
function makeSlider(mn, mx, val, step, x, y, w) {
  let s = createSlider(mn, mx, val, step).class('slider-custom'); s.position(x, y); s.size(w, 18); return s;
}
function makeButton(label, x, y, w, cb) {
  let b = createButton(label).class('btn-custom'); b.position(x, y); b.size(w, 28); b.mousePressed(cb); return b;
}