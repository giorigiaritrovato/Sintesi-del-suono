// --- PARAMETRI INTERATTIVI ---
let activeModule = 0; // 0: Oscillatore, 1: Filtro, 2: Amplificatore, 3: Modulatori
let oscType = 0;      // 0: Sawtooth, 1: Square, 2: Triangle, 3: Noise
let filterType = 0;   // 0: Low-Pass, 1: High-Pass, 2: Band-Pass
let lfoTarget = 0;    // 0: Spento, 1: Pitch (Vibrato), 2: Cutoff (Wah), 3: Volume (Tremolo)

// --- CONTROLLI UI (SLIDERS & BUTTONS) ---
let sliderPitch, sliderCutoff, sliderRes;
let sliderAttack, sliderDecay, sliderSustain, sliderRelease;
let sliderLfoSpeed;
let btnOsc, btnFilter, btnTarget, btnAudio;

// --- ELEMENTI AUDIO REALI ---
let realOsc, realNoise, realFilter;
let audioStarted = false;
let masterVolume = 0.20;

// --- INVILUPPO ADSR ---
let envelopeStartTime = 0;
let envelopeActive = false;
let envelopePhase = 0; // 0-1: valore dell'inviluppo 

// --- PALETTE COLORI (Stile Zinc Modern Dark) ---
const COL_BG      = '#050505';   
const COL_OSC     = '#38bdf8';   // Azzurro Ciano (Sorgente)
const COL_FILT    = '#4ade80';   // Verde Smeraldo (Filtro)
const COL_AMP     = '#f472b6';   // Rosa Pastello (Amplificatore)
const COL_MOD     = '#a855f7';   // Viola Modulatori (LFO/ADSR)
const COL_BORDER  = '#161619';   
const COL_TEXT_MUTED = '#71717a';

// ============================================================
function setup() {
  // Altezza aumentata a 740px per garantire una spaziatura perfetta senza collisioni
  createCanvas(800, 740);
  
  // Iniezione CSS per personalizzare l'aspetto minimal dei componenti DOM
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
  
  // Inizializzazione audio p5.sound
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
  
  // Lettura realtime dei parametri dagli slider con allineamento metrico
  let baseFreq  = sliderPitch.value();
  let cutoffVal = sliderCutoff.value();
  let resVal    = sliderRes.value();
  let lfoSpeed  = sliderLfoSpeed.value();
  
  let atk  = sliderAttack.value();
  let dec  = sliderDecay.value();
  let sus  = sliderSustain.value();
  let rel  = sliderRelease.value();

  // Calcolo tempo/fase dell'LFO
  let lfoPhase = millis() * 0.001 * lfoSpeed * TWO_PI;
  let lfoSignal = sin(lfoPhase);

  // --- MOTORE AUDIO IN TEMPO REALE ---
  if (audioStarted) {
    // Calcolo inviluppo ADSR
    let adsr = calculateADSREnvelope(atk, dec, sus, rel);
    let adsr_volume = masterVolume * adsr;
    
    // 1. Sorgente (VCO)
    if (oscType == 3) {
      realOsc.amp(0, 0.01); 
      realNoise.amp(adsr_volume, 0.01);
    } else {
      realNoise.amp(0, 0.01); 
      realOsc.amp(adsr_volume, 0.01);
      if (oscType == 0) realOsc.setType('sawtooth');
      if (oscType == 1) realOsc.setType('square');
      if (oscType == 2) realOsc.setType('triangle');
    }

    // Modulazione LFO -> PITCH (Vibrato)
    if (activeModule == 3 && lfoTarget == 1) {
      realOsc.freq(baseFreq + lfoSignal * (baseFreq * 0.1));
    } else {
      realOsc.freq(baseFreq);
    }

    // 2. Filtro (VCF)
    if (activeModule >= 1) {
      if (filterType == 0) realFilter.setType('lowpass');
      if (filterType == 1) realFilter.setType('highpass');
      if (filterType == 2) realFilter.setType('bandpass');
      
      let targetCutoff = map(cutoffVal, 0, 1, 50, 7000);
      let targetRes = map(resVal, 0, 1, 1, 25);
      
      // Modulazione LFO -> CUTOFF (Wah-Wah)
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

    // Modulazione LFO -> VOLUME (Tremolo)
    if (activeModule == 3 && lfoTarget == 3) {
      let lfoAmp = map(lfoSignal, -1, 1, 0.01, masterVolume);
      if (oscType == 3) realNoise.amp(lfoAmp); else realOsc.amp(lfoAmp);
    }
  }

  // --- RENDERING GRAFICO FLOWCHART ---
  drawMainHeader(30, 25, "Subtractive Synthesis Laboratory");
  
  // 1. Blocco VCO
  drawBlock(40, 90, 150, 110, "1. SORGENTE (VCO)", activeModule >= 0, COL_OSC);
  drawOscPreview(40, 125, 150, 60);
  drawArrow(190, 145, 230, 145);
  
  // 2. Blocco VCF
  drawBlock(230, 90, 150, 110, "2. FILTRO (VCF)", activeModule >= 1, COL_FILT);
  drawFilterPreview(230, 125, 150, 60, cutoffVal, resVal);
  drawArrow(380, 145, 420, 145);
  
  // 3. Blocco VCA
  drawBlock(420, 90, 150, 110, "3. AMPLIFICATORE (VCA)", activeModule >= 2, COL_AMP);
  drawAmpPreview(420, 125, 150, 60, lfoSignal);
  drawArrow(570, 145, 610, 145);
  
  // Output Monitore finale
  let outCol = audioStarted ? COL_FILT : '#52525b';
  drawBlock(610, 105, 150, 80, audioStarted ? "OUTPUT ATTIVO\n\nONLINE" : "SISTEMA MUTO\n\nSTANDBY", activeModule >= 2, outCol);
  
  // Connessioni Bus Modulazioni
  stroke('#27272a'); strokeWeight(1.5);
  line(515, 275, 515, 200); 
  line(305, 305, 305, 200); 
  noStroke(); fill(COL_MOD);
  ellipse(515, 275, 6, 6); ellipse(305, 305, 6, 6);
  
  // 4. Blocco ADSR
  drawBlock(420, 275, 150, 95, "INVILUPPO ADSR", activeModule == 3, COL_MOD);
  drawEnvelopeGraph(420, 305, 150, 55, atk, dec, sus, rel);
  
  // 5. Blocco LFO
  drawBlock(230, 305, 150, 95, "LFO (GENERATORE)", activeModule == 3, COL_MOD);
  drawLFOPreview(230, 335, 150, 50, lfoPhase);

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
  beginShape();
  for (let i = 5; i < w - 5; i++) {
    let px = x + i; let py = y + h / 2;
    if (oscType == 0)      py += ((i % 25) / 25 - 0.5) * (h * 0.65);
    else if (oscType == 1) py += ((sin(i * 0.06) > 0) ? 0.25 : -0.25) * h;
    else if (oscType == 2) py += (asin(sin(i * 0.06)) / HALF_PI) * (h * 0.3);
    else if (oscType == 3) py += random(-h * 0.25, h * 0.25);
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

function drawAmpPreview(x, y, w, h, lfoSig) {
  stroke(COL_AMP); strokeWeight(1.5); noFill();
  if (activeModule < 2) { line(x + 10, y + h / 2, x + w - 10, y + h / 2); return; }
  
  beginShape();
  for (let i = 5; i < w - 5; i++) {
    let px = x + i;
    let ampMod = activeModule == 2 ? 0.5 : map(lfoSig, -1, 1, 0.15, 0.6);
    let py = (y + h / 2) + sin(i * 0.25) * (h * 0.4) * ampMod;
    vertex(px, py);
  }
  endShape();
}

function drawEnvelopeGraph(x, y, w, h, a, d, s, r) {
  stroke(COL_MOD); strokeWeight(2); noFill();
  let xA = x + 10 + a * 0.25;
  let xD = xA + d * 0.25;
  let xS = xD + 35; 
  let xR = xS + r * 0.25;
  let yS = (y + h - 5) - s * (h - 10);
  
  beginShape();
  vertex(x + 10, y + h - 5); vertex(xA, y + 5);              
  vertex(xD, yS); vertex(xS, yS); vertex(xR, y + h - 5);          
  endShape();
}

function drawLFOPreview(x, y, w, h, phase) {
  stroke(COL_MOD); strokeWeight(1.5); noFill();
  beginShape();
  for (let i = 5; i < w - 5; i++) {
    vertex(x + i, (y + h / 2) + sin(i * 0.1 + phase) * (h * 0.3));
  }
  endShape();
}

// ============================================================
// STRUTTURA DELLA DASHBOARD (Clean info & Parameter inputs)
// ============================================================
function drawDashboardLayout(pitch, cut, res, a, d, s, r, lfoSpd) {
  let dy = 420; // Punto di inizio fisso della dashboard inferiore
  stroke('#1c1c1f'); strokeWeight(1); line(20, dy, width - 20, dy);
  
  let waveNames = ["Dente di Sega", "Onda Quadra", "Triangolare", "Rumore Bianco"];
  let filterNames = ["Passa-Basso (LP)", "Passa-Alto (HP)", "Passa-Banda (BP)"];
  let lfoNames = ["Spento", "Pitch (Vibrato)", "Filtro (Wah-Wah)", "Volume (Tremolo)"];

  // --- COLONNA 1: SORGENTE & FILTRO ---
  let cx1 = 40;
  drawSectionLabel(cx1, dy + 15, "CONTROLLI VCO & VCF");
  
  fill('#a1a1aa'); textSize(11); textAlign(LEFT, TOP);
  text("Onda Corrente: " + waveNames[oscType], cx1, dy + 45);
  
  drawParamText(cx1, dy + 100, "Frequenza Osc.:", pitch + " Hz", 230);
  
  fill('#a1a1aa'); textSize(11); textAlign(LEFT, TOP);
  text("Modalita Filtro: " + filterNames[filterType], cx1, dy + 145);
  
  drawParamText(cx1, dy + 200, "Taglio (Cutoff):", floor(cut * 100) + "%", 230);
  drawParamText(cx1, dy + 245, "Risonanza (Res):", floor(res * 100) + "%", 230);

  // --- COLONNA 2: MODULATORE ADSR ---
  let cx2 = 310;
  drawSectionLabel(cx2, dy + 15, "INVILUPPO ADSR VCA");
  drawParamText(cx2, dy + 45,  "Attack (A):", floor(a) + " ms", 230);
  drawParamText(cx2, dy + 100, "Decay (D):", floor(d) + " ms", 230);
  drawParamText(cx2, dy + 155, "Sustain (S):", floor(s * 100) + "%", 230);
  drawParamText(cx2, dy + 210, "Release (R):", floor(r) + " ms", 230);

  // --- COLONNA 3: MODULATORE LFO ---
  let cx3 = 580;
  drawSectionLabel(cx3, dy + 15, "MODULATORE LFO");
  
  fill('#a1a1aa'); textSize(11); textAlign(LEFT, TOP);
  text("Target LFO: " + lfoNames[lfoTarget], cx3, dy + 45);
  
  drawParamText(cx3, dy + 100, "Velocita LFO:", lfoSpd.toFixed(1) + " Hz", 180);
  
  // Box guida strutturato e pulito
  fill('#121214'); stroke('#222225'); rect(cx3, dy + 150, 180, 125, 4);
  noStroke(); fill('#71717a'); textSize(10); textAlign(LEFT, TOP);
  textLeading(14);
  text("GUIDA TECNICA:\n\n1. Attiva l'audio master.\n2. Clicca sui moduli nel\n   flowchart in alto per\n   abilitare lo scorrimento\n   del segnale audio.", cx3 + 10, dy + 165);
}

// Helper per le metriche rigorose dei testi della dashboard
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
// CREAZIONE ELEMENTI INTERFACCIA UTENTE DOM (POSIZIONAMENTO STACKED)
// ============================================================
function setupUI() {
  let dy = 420;

  // Pulsante Audio Hardware Principale
  btnAudio = createButton('ACCENDI MASTER AUDIO').class('btn-custom active-stopped');
  btnAudio.position(610, 22); btnAudio.size(150, 28);
  btnAudio.mousePressed(toggleAudioHardware);

  // --- CONTROLLI COLONNA 1 (Sorgente & Filtro) ---
  btnOsc = createButton('Cambia Onda').class('btn-custom');
  btnOsc.position(40, dy + 65); btnOsc.size(230, 22);
  btnOsc.mousePressed(() => { oscType = (oscType + 1) % 4; });

  sliderPitch = makeSlider(60, 800, 220, 1, 40, dy + 118, 230);

  btnFilter = createButton('Cambia Filtro').class('btn-custom');
  btnFilter.position(40, dy + 165); btnFilter.size(230, 22);
  btnFilter.mousePressed(() => { filterType = (filterType + 1) % 3; });

  sliderCutoff = makeSlider(0, 1, 0.5, 0.01, 40, dy + 218, 230);
  sliderRes    = makeSlider(0, 1, 0.3, 0.01, 40, dy + 263, 230);

  // --- CONTROLLI COLONNA 2 (ADSR) ---
  sliderAttack  = makeSlider(5, 150, 40, 1,     310, dy + 63, 230);
  sliderDecay   = makeSlider(5, 150, 50, 1,     310, dy + 118, 230);
  sliderSustain = makeSlider(0, 1, 0.6, 0.01,   310, dy + 173, 230);
  sliderRelease = makeSlider(5, 150, 60, 1,     310, dy + 228, 230);

  // --- CONTROLLI COLONNA 3 (LFO) ---
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
// INTERATTIVITÀ MOUSE & ACCENSIONE AUDIO
// ============================================================
function calculateADSREnvelope(attackMs, decayMs, sustainLvl, releaseMs) {
  if (!envelopeActive) return 0;
  
  let elapsedTime = millis() - envelopeStartTime;
  
  // Fase Attack
  if (elapsedTime < attackMs) {
    return map(elapsedTime, 0, attackMs, 0, 1);
  }
  
  elapsedTime -= attackMs;
  
  // Fase Decay
  if (elapsedTime < decayMs) {
    return map(elapsedTime, 0, decayMs, 1, sustainLvl);
  }
  
  elapsedTime -= decayMs;
  
  // Fase Sustain (rimane a sustainLvl finché il gate è attivo)
  return sustainLvl;
}

// ============================================================
// INTERATTIVITÀ MOUSE & ACCENSIONE AUDIO
// ============================================================
function toggleAudioHardware() {
  if (!audioStarted) {
    userStartAudio(); 
    realOsc.start(); realNoise.start();
    audioStarted = true;
    envelopeActive = true;
    envelopeStartTime = millis();
    btnAudio.html('FERMA AUDIO MASTER').removeClass('active-stopped').addClass('active-playing');
  } else {
    realOsc.stop(); realNoise.stop();
    audioStarted = false;
    envelopeActive = false;
    btnAudio.html('ACCENDI MASTER AUDIO').removeClass('active-playing').addClass('active-stopped');
  }
}

function mousePressed() {
  // Attivazione dei moduli del segnale tramite click sul flowchart superiore
  if (mouseY > 90 && mouseY < 200) {
    if (mouseX > 40 && mouseX < 190) activeModule = 0;
    if (mouseX > 230 && mouseX < 380) activeModule = 1;
    if (mouseX > 420 && mouseX < 570) activeModule = 2;
  }
  if (mouseY > 275 && mouseY < 400 && mouseX > 230 && mouseX < 570) {
    activeModule = 3;
  }
}