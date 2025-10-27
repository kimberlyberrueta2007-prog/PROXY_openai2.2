// script.js — versión corregida para DiseñaArte IA v10 (listo para GitHub)
// Funcionalidades principales:
// - Lápiz ajustable y fluido
// - Efecto acuarela y borrador
// - Integración con proxy POST /api/proxy (espera JSON de "strokes" o "tutorial")
(function(){
  const canvas = document.getElementById('canvas') || document.querySelector('canvas');
  if (!canvas) { console.error('Canvas no encontrado'); return; }
  const ctx = canvas.getContext('2d', { alpha: true });

  const sizeInput = document.getElementById('size') || document.querySelector('input[type="range"]');
  const colorInput = document.getElementById('color') || document.querySelector('input[type="color"]');
  const toolSelect = document.getElementById('tool') || document.querySelector('select');
  const undoBtn = document.getElementById('undo');
  const clearBtn = document.getElementById('clear');
  const downloadBtn = document.getElementById('download');
  const promptInput = document.getElementById('prompt') || document.querySelector('textarea');
  const aiSketchBtn = document.getElementById('aiSketch');
  const aiArtBtn = document.getElementById('aiArt');
  const aiTutorialBtn = document.getElementById('aiTutorial');
  const logEl = document.getElementById('log') || document.createElement('div');

  let drawing = false;
  let currentStroke = null;
  let strokes = [];

  function setupCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(600, Math.floor(rect.width * dpr));
    const fixedHeight = canvas.getAttribute('height') || 650;
    canvas.height = Math.floor(parseInt(fixedHeight) * dpr);
    canvas.style.height = (parseInt(fixedHeight)) + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    redraw();
  }
  window.addEventListener('resize', setupCanvas);
  setupCanvas();

  function log(msg) {
    try {
      if (logEl) {
        const p = document.createElement('div');
        p.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
        logEl.prepend(p);
      } else console.log(msg);
    } catch(e){ console.log(msg); }
  }

  function renderStroke(s, preview=false) {
    if (!s || !s.points || s.points.length === 0) return;
    ctx.save();
    if (s.tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = s.color || '#111';
    }

    if (s.tool === 'watercolor') {
      ctx.globalAlpha = s.alpha ?? 0.35;
      const baseWidth = s.width || 10;
      for (let pass = 0; pass < 4; pass++) {
        ctx.beginPath();
        const jitterX = (Math.random() - 0.5) * (pass+1) * 0.9;
        const jitterY = (Math.random() - 0.5) * (pass+1) * 0.9;
        let p0 = s.points[0];
        ctx.moveTo(p0.x + jitterX, p0.y + jitterY);
        for (let i = 1; i < s.points.length; i++) {
          const p = s.points[i];
          const prev = s.points[i-1];
          const midX = (prev.x + p.x) / 2 + jitterX;
          const midY = (prev.y + p.y) / 2 + jitterY;
          ctx.lineWidth = Math.max(1, baseWidth * (0.7 + Math.sin(i) * 0.1));
          ctx.quadraticCurveTo(prev.x + jitterX, prev.y + jitterY, midX, midY);
        }
        ctx.stroke();
      }
    } else {
      ctx.globalAlpha = s.alpha ?? 1.0;
      const baseWidth = s.width || 4;
      ctx.beginPath();
      let p0 = s.points[0];
      ctx.moveTo(p0.x, p0.y);
      for (let i = 1; i < s.points.length; i++) {
        const p = s.points[i];
        const prev = s.points[i-1];
        const midX = (prev.x + p.x) / 2;
        const midY = (prev.y + p.y) / 2;
        const wPrev = prev.w || baseWidth;
        const wCurr = p.w || baseWidth;
        ctx.lineWidth = (wPrev + wCurr) / 2;
        ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
      }
      ctx.stroke();
    }
    ctx.restore();
    if (!preview) strokes.push(s);
  }

  function redraw() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.save();
    ctx.fillStyle = '#fff';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.restore();
    for (const s of strokes) renderStroke(s, false);
  }

  function getPointerPos(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    return { x, y };
  }

  function beginStroke(tool, width, color, alpha) {
    return {
      tool: tool || 'brush',
      width: width || 4,
      color: color || '#111111',
      alpha: alpha ?? 1.0,
      points: []
    };
  }

  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    drawing = true;
    const tool = (toolSelect && toolSelect.value) ? toolSelect.value : 'brush';
    const width = (sizeInput && parseFloat(sizeInput.value)) || 4;
    const color = (colorInput && colorInput.value) || '#111111';
    const alpha = tool === 'watercolor' ? 0.45 : 1.0;
    currentStroke = beginStroke(tool, width, color, alpha);
    const p = getPointerPos(e);
    p.w = width;
    currentStroke.points.push(p);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drawing || !currentStroke) return;
    const p = getPointerPos(e);
    const last = currentStroke.points[currentStroke.points.length - 1];
    const dx = p.x - (last.x || p.x);
    const dy = p.y - (last.y || p.y);
    const dist = Math.sqrt(dx*dx + dy*dy);
    const base = currentStroke.width || 4;
    const w = Math.max(1, Math.min(60, base * (1 - Math.min(0.7, dist/30))));
    p.w = w;
    currentStroke.points.push(p);
    redraw();
    renderStroke(currentStroke, true);
  });
  canvas.addEventListener('pointerup', (e) => {
    if (!drawing) return;
    drawing = false;
    if (currentStroke && currentStroke.points.length > 0) {
      strokes.push(currentStroke);
      currentStroke = null;
    }
    redraw();
  });
  canvas.addEventListener('pointercancel', () => { drawing = false; currentStroke = null; redraw(); });
  canvas.addEventListener('mouseleave', () => { if (drawing) { drawing = false; if (currentStroke) strokes.push(currentStroke); currentStroke = null; redraw(); } });

  if (undoBtn) undoBtn.addEventListener('click', () => { strokes.pop(); redraw(); log('Deshacer'); });
  if (clearBtn) clearBtn.addEventListener('click', () => { strokes = []; redraw(); log('Limpiar'); });
  if (downloadBtn) downloadBtn.addEventListener('click', () => {
    try {
      const link = document.createElement('a');
      link.download = 'diseño_ia.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
      log('Descargado PNG');
    } catch(e){ log('Error al descargar: ' + e.message); }
  });

  async function callProxy(prompt, mode='sketch') {
    const resp = await fetch('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, mode })
    });
    if (!resp.ok) {
      const t = await resp.text();
      throw new Error(`Proxy error ${resp.status}: ${t}`);
    }
    const data = await resp.json();
    return data;
  }

  function safeParseJSON(text) {
    try { return JSON.parse(text); } catch(e) {
      const s = text.indexOf('{'), epos = text.lastIndexOf('}');
      if (s !== -1 && epos !== -1 && epos > s) {
        try { return JSON.parse(text.substring(s, epos+1)); } catch(e2) {}
      }
      return null;
    }
  }

  function applyAIJson(obj) {
    if (!obj) return;
    if (obj.mode === 'tutorial' || obj.steps) {
      const steps = obj.steps || obj.tutorial || obj.instructions || [];
      log('Tutorial recibido:');
      steps.forEach((st,i)=> log(`${i+1}. ${st}`));
      return;
    }
    if (obj.mode !== 'strokes' && !obj.strokes) {
      log('Formato IA inesperado.');
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const newStrokes = [];
    for (const s of obj.strokes) {
      const pts = (s.points || []).map(p => ({ x: Math.round((p.x||0) * rect.width), y: Math.round((p.y||0) * rect.height), w: s.width || 4 }));
      newStrokes.push({
        tool: s.tool || 'brush',
        width: s.width || 6,
        color: s.color || '#111111',
        alpha: s.alpha ?? (s.tool === 'watercolor' ? 0.4 : 1.0),
        points: pts
      });
    }
    for (const ns of newStrokes) strokes.push(ns);
    redraw();
    log('Trazos IA aplicados.');
  }

  if (aiSketchBtn) aiSketchBtn.addEventListener('click', async () => {
    const prompt = (promptInput && promptInput.value) ? promptInput.value.trim() : 'Boceto de flores y rosas, líneas sueltas.';
    log('Solicitando boceto al proxy...');
    try {
      const resp = await callProxy(prompt, 'sketch');
      if (typeof resp === 'string') {
        const obj = safeParseJSON(resp);
        if (!obj) { log('Respuesta no JSON: ' + resp.slice(0,400)); return; }
        applyAIJson(obj);
      } else applyAIJson(resp);
    } catch (err) { log('Error proxy: ' + err.message); }
  });
  if (aiArtBtn) aiArtBtn.addEventListener('click', async () => {
    const prompt = (promptInput && promptInput.value) ? promptInput.value.trim() : 'Acuarela de rosas, pinceladas suaves.';
    log('Solicitando obra artística al proxy...');
    try {
      const resp = await callProxy(prompt, 'art');
      if (typeof resp === 'string') {
        const obj = safeParseJSON(resp);
        if (!obj) { log('Respuesta no JSON: ' + resp.slice(0,400)); return; }
        applyAIJson(obj);
      } else applyAIJson(resp);
    } catch (err) { log('Error proxy: ' + err.message); }
  });
  if (aiTutorialBtn) aiTutorialBtn.addEventListener('click', async () => {
    const prompt = (promptInput && promptInput.value) ? promptInput.value.trim() : 'Tutorial para dibujar rostro: estructura y proporciones.';
    log('Solicitando tutorial al proxy...');
    try {
      const resp = await callProxy(prompt, 'tutorial');
      if (typeof resp === 'string') {
        const obj = safeParseJSON(resp);
        if (!obj) { log('Respuesta no JSON: ' + resp.slice(0,400)); return; }
        applyAIJson(obj);
      } else applyAIJson(resp);
    } catch (err) { log('Error proxy: ' + err.message); }
  });

  function initialGuide() {
    const rect = canvas.getBoundingClientRect();
    const w = rect.width, h = rect.height;
    ctx.save();
    ctx.strokeStyle = '#eee';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w/2, 0); ctx.lineTo(w/2, h);
    ctx.moveTo(0, h/2); ctx.lineTo(w, h/2);
    ctx.stroke();
    ctx.restore();
  }
  initialGuide();

  window.__DAI = { strokes, redraw, renderStroke };
})();