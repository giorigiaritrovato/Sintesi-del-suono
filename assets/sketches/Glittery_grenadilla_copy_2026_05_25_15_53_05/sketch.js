// --- PARAMETRI INTERATTIVI ---
let activeModule = 0; // 0: Oscillatore, 1: Filtro, 2: Amplificatore, 3: Modulatori
let oscType = 0;      // 0: Sawtooth, 1: Square, 2: Triangle, 3: Noise, 4: Flauto, 5: Pianoforte
let filterType = 0;   // 0: Low-Pass, 1: High-Pass, 2: Band-Pass
let lfoTarget = 0;    // 0: Spento, 1: Pitch (Vibrato), 2: Cutoff (Wah), 3: Volume (Tremolo)

// --- CONTROLLI UI (SLIDERS & BUTTONS) ---
let sliderPitch, sliderCutoff, sliderRes;
let sliderAttack, sliderDecay, sliderSustain, sliderRelease;
let sliderLfoSpeed;
let btnOsc, btnFilter, btnTarget, btnAudio;

// --- ELEMENTI AUDIO REALI ---
let realOsc, realNoise, realFilter;
let fluteWave, pianoWave; // Tabelle di Fourier native
let audioStarted = false;
let masterVolume = 0.20;

// --- INVILUPPO ADSR ---
let envelopeStartTime = 0;
let envelopeActive = false;

// --- PALETTE COLORI (Stile Zinc Modern Dark) ---
const COL_BG      = '#050505';   
const COL_OSC     = '#ff0095';   
const COL_FILT    = '#ffffff';   
const COL_AMP     = '#ff87c1';   
const COL_MOD     = '#ffffff';   
const COL_TEXT_MUTED = '#71717a';

// ============================================================
function setup() {
  createCanvas(800, 740);
  
  createElement('style', `
    .btn-custom {
      background: #121214 !important;
      color: #ffffff !important;
      border: 1px solid #27272a !important;
      border-radius: 4px !important;
      font-family: "Neue Haas Unica", sans-serif !important;
      font-size: 11px !important;
      font-weight: 600 !important;
      cursor: pointer;
      transition: all 0.15s ease !important;
    }
    .btn-custom:hover {
      background: #1c1c1f !important;
      border-color: #3f3f46 !important;
    }
    .btn-custom.active-playing {
      background: #10b98115 !important;
      color: #4ade80 !important;
      border-color: #059669 !important;
    }
    .btn-custom.active-stopped {
      background: #ef444410 !important;
      color: #f87171 !important;
      border-color: #dc2626 !important;
    }
    .slider-custom {
      -webkit-appearance: none;
      background: #18181b !important;
      height: 4px !important;
      border-radius: 2px !important;
      outline: none;
    }
    .slider-custom::-webkit-slider-thumb {
      -webkit-appearance: none;
      background: #ffffff !important;
      width: 12px !important;
      height: 12px !important;
      border-radius: 50% !important;
      cursor: pointer;
      border: 1px solid #27272a !important;
    }
  `);

  textFont('"Neue Haas Unica", sans-serif');
  
  realOsc = new p5.Oscillator('sawtooth');
  realNoise = new p5.Noise('white');
  realFilter = new p5.LowPass();
  
  realOsc.disconnect();
  realNoise.disconnect();
  realOsc.connect(realFilter);
  realNoise.connect(realFilter);
  realFilter.connect();
  
  setupUI();
}

// ============================================================
function draw() {
  background(COL_BG);
  
  let baseFreq  = sliderPitch.value();
  let cutoffVal = sliderCutoff.value();
  let resVal    = sliderRes.value();
  let lfoSpeed  = sliderLfoSpeed.value();
  
  let atk  = sliderAttack.value();
  let dec  = sliderDecay.value();
  let sus  = sliderSustain.value();
  let rel  = sliderRelease.value();

  let lfoPhaseAudio = millis() * 0.001 * lfoSpeed * TWO_PI;
  let lfoSignal = sin(lfoPhaseAudio);

  // --- MOTORE AUDIO IN TEMPO REALE ---
  if (audioStarted) {
    let adsr = calculateADSREnvelope(atk, dec, sus, rel);
    let adsr_volume = masterVolume * adsr;
    
    if (oscType == 3) {
      realOsc.amp(0, 0.005); 
      realNoise.amp(adsr_volume, 0.005);
    } else {
      realNoise.amp(0, 0.005); 
      realOsc.amp(adsr_volume, 0.005);
    }

    if (activeModule == 3 && lfoTarget == 1) {
      realOsc.freq(baseFreq + lfoSignal * (baseFreq * 0.05));
    } else {
      realOsc.freq(baseFreq);
    }

    if (activeModule >= 1) {
      if (filterType == 0) realFilter.setType('lowpass');
      if (filterType == 1) realFilter.setType('highpass');
      if (filterType == 2) realFilter.setType('bandpass');
      
      let targetCutoff = map(cutoffVal, 0, 1, 50, 7000);
      let targetRes = map(resVal, 0, 1, 1, 25);
      
      if (activeModule == 3 && lfoTarget == 2) {
        targetCutoff += lfoSignal * (targetCutoff * 0.4);
        targetCutoff = constrain(targetCutoff, 40, 15000);
      }
      realFilter.freq(targetCutoff);
      realFilter.res(targetRes);
    } else {
      realFilter.setType('lowpass');
      realFilter.freq(20000);
      realFilter.res(1);
    }

    if (activeModule == 3 && lfoTarget == 3) {
      let lfoAmp = map(lfoSignal, -1, 1, 0.01, masterVolume);
      let finalAmp = lfoAmp * adsr; 
      if (oscType == 3) realNoise.amp(finalAmp); else realOsc.amp(finalAmp);
    }
  }

  // --- RENDERING GRAFICO FLOWCHART ---
  drawMainHeader(30, 25, "Subtractive Synthesis Laboratory");
  
  drawBlock(40, 90, 150, 110, "1. SORGENTE (VCO)", activeModule >= 0, COL_OSC);
  drawOscPreview(40, 125, 150, 60);
  drawArrow(190, 145, 230, 145);
  
  drawBlock(230, 90, 150, 110, "2. FILTRO (VCF)", activeModule >= 1, COL_FILT);
  drawFilterPreview(230, 125, 150, 60, cutoffVal, resVal);
  drawArrow(380, 145, 420, 145);
  
  drawBlock(420, 90, 150, 110, "3. AMPLIFICATORE (VCA)", activeModule >= 2, COL_AMP);
  drawAmpPreview(420, 125, 150, 60);
  drawArrow(570, 145, 610, 145);
  
  let outCol = audioStarted ? COL_FILT : '#52525b';
  drawBlock(610, 105, 150, 80, audioStarted ? "OUTPUT ATTIVO\n\nPLAYING" : "SISTEMA MUTO\n\nSTANDBY", activeModule >= 2, outCol);
  
  stroke('#27272a'); strokeWeight(1.5);
  line(515, 275, 515, 200); 
  line(305, 305, 305, 200); 
  noStroke(); fill(COL_MOD);
  ellipse(515, 275, 6, 6); ellipse(305, 305, 6, 6);
  
  drawBlock(420, 275, 150, 95, "INVILUPPO ADSR", activeModule == 3, COL_MOD);
  drawEnvelopeGraph(420, 305, 150, 55, atk, dec, sus, rel);
  
  drawBlock(230, 305, 150, 95, "LFO (GENERATORE)", activeModule == 3, COL_MOD);
  drawLFOPreview(230, 335, 150, 50);

  // --- DASHBOARD CONTROLLI INFERIORE ---
  drawDashboardLayout(baseFreq, cutoffVal, resVal, atk, dec, sus, rel, lfoSpeed);
}

// ============================================================
// COMPONENTI GRAFICI DEL FLOWCHART
// ============================================================
function drawBlock(x, y, w, h, title, isActive, accentColor) {
  if (isActive) {
    fill('#09090b'); stroke(accentColor); strokeWeight(1.5);
  } else {
    fill('#141416'); stroke('#27272a'); strokeWeight(1);
  }
  rect(x, y, w, h, 6);
  
  stroke(isActive ? '#18181b' : '#17171a'); strokeWeight(1);
  for (let i = x + 15; i < x + w; i += 20) line(i, y + 25, i, y + h - 5);

  noStroke();
  fill(isActive ? '#ffffff' : COL_TEXT_MUTED);
  textSize(10); textStyle(BOLD); textAlign(CENTER, TOP);
  text(title, x + w / 2, y + 10);
  textStyle(NORMAL);
}

function drawMainHeader(x, y, txt) {
  noStroke(); fill(COL_OSC); rect(x, y + 2, 4, 16, 2);
  fill('#ffffff'); textSize(15); textStyle(BOLD); textAlign(LEFT, TOP);
  text(txt, x + 12, y); textStyle(NORMAL);
}

function drawArrow(x1, y1, x2, y2) {
  stroke('#3f3f46'); strokeWeight(1.5); line(x1, y1, x2, y2);
  push(); translate(x2, y2); rotate(PI / 2); fill('#3f3f46'); noStroke();
  triangle(-3, 3, 0, -3, 3, 3); pop();
}

function drawOscPreview(x, y, w, h) {
  stroke(COL_OSC); strokeWeight(1.5); noFill();
  
  if (oscType == 3) randomSeed(99); 
  
  beginShape();
  for (let i = 5; i < w - 5; i++) {
    let px = x + i; let py = y + h / 2;
    if (oscType == 0)      py += ((i % 25) / 25 - 0.5) * (h * 0.65);
    else if (oscType == 1) py += ((sin(i * 0.06) > 0) ? 0.25 : -0.25) * h;
    else if (oscType == 2) py += (asin(sin(i * 0.06)) / HALF_PI) * (h * 0.3);
    else if (oscType == 3) py += random(-h * 0.25, h * 0.25);
    else if (oscType == 4) { 
      let phase = map(i, 5, w - 5, 0, TWO_PI * 3);
      py += (sin(phase) + 0.40 * sin(2 * phase) + 0.10 * sin(3 * phase)) * (h * 0.26);
    }
    else if (oscType == 5) { 
      let phase = map(i, 5, w - 5, 0, TWO_PI * 2.5);
      let pianoHarmonics = sin(phase) + 0.65 * sin(2 * phase) + 0.45 * sin(3 * phase) + 0.30 * sin(4 * phase) + 0.20 * sin(5 * phase);
      py += pianoHarmonics * (h * 0.16);
    }
    vertex(px, py);
  }
  endShape();
}

function drawFilterPreview(x, y, w, h, cVal, rVal) {
  stroke(COL_FILT); strokeWeight(1.5); noFill();
  let cutX = map(cVal, 0, 1, x + 15, x + w - 15);
  let resY = map(rVal, 0, 1, 0, h * 0.35);
  
  beginShape();
  for (let px = x + 5; px < x + w - 5; px++) {
    let py = y + h - 5;
    if (filterType == 0) { 
      if (px < cutX) py = (y + h / 2) - (px == floor(cutX) ? resY : 0);
      else py = (y + h / 2) - resY * exp(-(px - cutX) * 0.1) + (px - cutX) * 1.2;
    } else if (filterType == 1) { 
      if (px > cutX) py = (y + h / 2) - (px == floor(cutX) ? resY : 0);
      else py = (y + h / 2) - resY * exp(-(cutX - px) * 0.1) + (cutX - px) * 1.2;
    } else if (filterType == 2) { 
      let diff = abs(px - cutX);
      py = (y + h / 2) - resY * exp(-diff * 0.15) + diff * 1.5;
    }
    py = constrain(py, y + 2, y + h - 5);
    vertex(px, py);
  }
  endShape();
  stroke('#27272a'); line(cutX, y + 2, cutX, y + h - 5);
}

function drawAmpPreview(x, y, w, h) {
  stroke(COL_AMP); strokeWeight(1.5); noFill();
  if (activeModule < 2) { line(x + 10, y + h / 2, x + w - 10, y + h / 2); return; }
  
  beginShape();
  for (let i = 5; i < w - 5; i++) {
    let px = x + i;
    let ampMod = 0.5; 
    let py = (y + h / 2) + sin(i * 0.25) * (h * 0.4) * ampMod;
    vertex(px, py);
  }
  endShape();
}

function drawEnvelopeGraph(x, y, w, h, a, d, s, r) {
  stroke(COL_MOD); strokeWeight(2); noFill();
  
  let padding = 10;
  let sustainVisualWidth = 25; 
  let availableWidth = w - (padding * 2) - sustainVisualWidth;
  
  let totalTime = a + d + r;
  if (totalTime === 0) totalTime = 1; 
  
  let xStart = x + padding;
  let xA = xStart + (a / totalTime) * availableWidth;
  let xD = xA + (d / totalTime) * availableWidth;
  let xS = xD + sustainVisualWidth;
  let xR = xS + (r / totalTime) * availableWidth;
  
  let yBottom = y + h - 5;
  let yTop = y + 5;
  let yS = yBottom - s * (h - 10);
  
  beginShape();
  vertex(xStart, yBottom); 
  vertex(xA, yTop);              
  vertex(xD, yS); 
  vertex(xS, yS); 
  vertex(xR, yBottom);          
  endShape();
}

function drawLFOPreview(x, y, w, h) {
  stroke(COL_MOD); strokeWeight(1.5); noFill();
  beginShape();
  for (let i = 5; i < w - 5; i++) {
    vertex(x + i, (y + h / 2) + sin(i * 0.1) * (h * 0.3)); 
  }
  endShape();
}

// ============================================================
// STRUTTURA DELLA DASHBOARD
// ============================================================
function drawDashboardLayout(pitch, cut, res, a, d, s, r, lfoSpd) {
  let dy = 420; 
  stroke('#1c1c1f'); strokeWeight(1); line(20, dy, width - 20, dy);
  
  let waveNames = ["Dente di Sega", "Onda Quadra", "Triangolare", "Rumore Bianco", "Flauto (Spettro Reale)", "Pianoforte (Spettro Reale)"];
  let filterNames = ["Passa-Basso (LP)", "Passa-Alto (HP)", "Passa-Banda (BP)"];
  let lfoNames = ["Spento", "Pitch (Vibrato)", "Filtro (Wah-Wah)", "Volume (Tremolo)"];

  let cx1 = 40;
  drawSectionLabel(cx1, dy + 15, "CONTROLLI VCO & VCF");
  fill('#a1a1aa'); textSize(11); textAlign(LEFT, TOP);
  text("Onda/Strumento: " + waveNames[oscType], cx1, dy + 45);
  drawParamText(cx1, dy + 100, "Frequenza Osc.:", pitch + " Hz", 230);
  fill('#a1a1aa'); textSize(11); textAlign(LEFT, TOP);
  text("Modalita Filtro: " + filterNames[filterType], cx1, dy + 145);
  drawParamText(cx1, dy + 200, "Taglio (Cutoff):", floor(cut * 100) + "%", 230);
  drawParamText(cx1, dy + 245, "Risonanza (Res):", floor(res * 100) + "%", 230);

  let cx2 = 310;
  drawSectionLabel(cx2, dy + 15, "INVILUPPO ADSR VCA");
  drawParamText(cx2, dy + 45,  "Attack (A):", floor(a) + " ms", 230);
  drawParamText(cx2, dy + 100, "Decay (D):", floor(d) + " ms", 230);
  drawParamText(cx2, dy + 155, "Sustain (S):", floor(s * 100) + "%", 230);
  drawParamText(cx2, dy + 210, "Release (R):", floor(r) + " ms", 230);

  let cx3 = 580;
  drawSectionLabel(cx3, dy + 15, "MODULATORE LFO");
  fill('#a1a1aa'); textSize(11); textAlign(LEFT, TOP);
  text("Target LFO: " + lfoNames[lfoTarget], cx3, dy + 45);
  drawParamText(cx3, dy + 100, "Velocita LFO:", lfoSpd.toFixed(1) + " Hz", 180);
  
  fill('#121214'); stroke('#222225'); rect(cx3, dy + 150, 125, 125, 4);
  noStroke(); fill('#71717a'); textSize(10); textAlign(LEFT, TOP);
  textLeading(14);
  text("CONTROLLO TOTALE:\n\nGli automatismi dei\npreset sono stati\neliminati. Ora i tuoi\nparametri rimangono\ninvariati al cambio\ndi timbro armonica.", cx3 + 10, dy + 165);
}

function drawSectionLabel(x, y, txt) {
  fill('#ffffff'); noStroke(); textSize(10); textStyle(BOLD); textAlign(LEFT, TOP); text(txt, x, y); textStyle(NORMAL);
}

function drawParamText(x, y, label, val, w) {
  fill(COL_TEXT_MUTED); noStroke(); textSize(11); textAlign(LEFT, TOP);
  text(label, x, y);
  fill('#ffffff'); textAlign(RIGHT, TOP);
  text(val, x + w, y);
}

// ============================================================
// INTERFACCIA UTENTE DOM & EVENTI CHIAVE
// ============================================================
function setupUI() {
  let dy = 420;

  btnAudio = createButton('▶ PLAY LOOP').class('btn-custom active-stopped');
  btnAudio.position(610, 22); btnAudio.size(150, 28);
  btnAudio.mousePressed(toggleAudioHardware);

  btnOsc = createButton('Cambia Onda / Strumento').class('btn-custom');
  btnOsc.position(40, dy + 65); btnOsc.size(230, 22);
  btnOsc.mousePressed(() => { 
    oscType = (oscType + 1) % 6; 
    // CORREZIONE: Nessun preset viene applicato, gli slider restano immobili.
    updateOscillatorHardware(); 
  });

  sliderPitch = makeSlider(60, 800, 261.63, 1, 40, dy + 118, 230); 

  btnFilter = createButton('Cambia Filtro').class('btn-custom');
  btnFilter.position(40, dy + 165); btnFilter.size(230, 22);
  btnFilter.mousePressed(() => { filterType = (filterType + 1) % 3; });

  sliderCutoff = makeSlider(0, 1, 0.65, 0.01, 40, dy + 218, 230);
  sliderRes    = makeSlider(0, 1, 0.20, 0.01, 40, dy + 263, 230);

  sliderAttack  = makeSlider(5, 500, 40, 1,     310, dy + 63, 230);
  sliderDecay   = makeSlider(5, 500, 50, 1,     310, dy + 118, 230);
  sliderSustain = makeSlider(0, 1, 0.6, 0.01,   310, dy + 173, 230);
  sliderRelease = makeSlider(5, 500, 60, 1,     310, dy + 228, 230);

  btnTarget = createButton('Assegna Target LFO').class('btn-custom');
  btnTarget.position(580, dy + 65); btnTarget.size(180, 22);
  btnTarget.mousePressed(() => { lfoTarget = (lfoTarget + 1) % 4; });

  sliderLfoSpeed = makeSlider(0.1, 20, 4.0, 0.1, 580, dy + 118, 180);
}

function makeSlider(mn, mx, val, step, x, y, w) {
  let s = createSlider(mn, mx, val, step).class('slider-custom');
  s.position(x, y); s.size(w, 12); return s;
}

// ============================================================
// AGGIORNAMENTO HARDWARE DELLE INTERFACCIE AUDIO
// ============================================================
function updateOscillatorHardware() {
  if (!audioStarted || !realOsc.oscillator) return;

  if (oscType == 0) realOsc.setType('sawtooth');
  else if (oscType == 1) realOsc.setType('square');
  else if (oscType == 2) realOsc.setType('triangle');
  else if (oscType == 4 && fluteWave) {
    realOsc.oscillator.setPeriodicWave(fluteWave);
  }
  else if (oscType == 5 && pianoWave) {
    realOsc.oscillator.setPeriodicWave(pianoWave);
  }
}

function toggleAudioHardware() {
  if (!audioStarted) {
    userStartAudio(); 
    let ac = getAudioContext(); 
    
    if (!fluteWave) {
      let fReal = new Float32Array([0, 0, 0, 0, 0]);
      let fImag = new Float32Array([0, 1.0, 0.40, 0.10, 0.05]);
      fluteWave = ac.createPeriodicWave(fReal, fImag);

      let pReal = new Float32Array([0, 0, 0, 0, 0, 0, 0]);
      let pImag = new Float32Array([0, 1.0, 0.65, 0.45, 0.30, 0.20, 0.10]);
      pianoWave = ac.createPeriodicWave(pReal, pImag);
    }

    realOsc.start(); 
    realNoise.start();
    audioStarted = true;
    
    updateOscillatorHardware(); 
    
    envelopeActive = true;
    envelopeStartTime = millis();
    btnAudio.html('⏹ STOP LOOP').removeClass('active-stopped').addClass('active-playing');
  } else {
    realOsc.stop(); realNoise.stop();
    audioStarted = false;
    envelopeActive = false;
    btnAudio.html('▶ PLAY LOOP').removeClass('active-playing').addClass('active-stopped');
  }
}

// ============================================================
// LOGICA ADSR IN LOOP
// ============================================================
function calculateADSREnvelope(attackMs, decayMs, sustainLvl, releaseMs) {
  if (!envelopeActive) return 0;
  
  let elapsedTime = millis() - envelopeStartTime;
  let sustainDuration = 250; 
  let loopDuration = attackMs + decayMs + sustainDuration + releaseMs;
  
  if (elapsedTime >= loopDuration) {
    envelopeStartTime = millis();
    elapsedTime = 0;
  }
  
  if (elapsedTime < attackMs) return map(elapsedTime, 0, attackMs, 0, 1);
  elapsedTime -= attackMs;
  
  if (elapsedTime < decayMs) return map(elapsedTime, 0, decayMs, 1, sustainLvl);
  elapsedTime -= decayMs;
  
  if (elapsedTime < sustainDuration) return sustainLvl;
  elapsedTime -= sustainDuration;
  
  return map(elapsedTime, 0, releaseMs, sustainLvl, 0);
}

function mousePressed() {
  if (mouseY > 90 && mouseY < 200) {
    if (mouseX > 40 && mouseX < 190) activeModule = 0;
    if (mouseX > 230 && mouseX < 380) activeModule = 1;
    if (mouseX > 420 && mouseX < 570) activeModule = 2;
  }
  if (mouseY > 275 && mouseY < 400 && mouseX > 230 && mouseX < 570) {
    activeModule = 3;
  }
}