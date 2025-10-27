// server.js - simple Express proxy to forward requests to OpenAI
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const OPENAI_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_KEY) {
  console.warn('OPENAI_API_KEY no está configurada en .env o variables de entorno.');
}

app.post('/api/proxy', async (req, res) => {
  try {
    const { prompt, mode = 'sketch' } = req.body || {};
    if (!prompt) return res.status(400).send('Falta prompt.');

    const system = `Eres un asistente que convierte descripciones artísticas en un conjunto de instrucciones de dibujo para un canvas HTML.
RESPONDE SOLO EN JSON VÁLIDO, NADA MÁS. El JSON debe tener una propiedad "mode" con valor "strokes" o "tutorial".
Si "mode" == "strokes", incluir "strokes": [...] con objetos de trazo:
- tool: 'brush' | 'watercolor' | 'marker' | 'eraser'
- color: hexadecimal (#rrggbb)
- width: número
- alpha: número (0-1)
- points: lista de puntos {x,y} en coordenadas relativas 0..1.
Si "mode" == "tutorial", incluir "steps": ["Paso 1: ...", ...].`;

    const userMsg = `Prompt: ${prompt}\nModo: ${mode}\nCanvas size: width=1000,height=650.\nRequerimiento: generar entre 1 y 6 strokes grandes para boceto si mode=sketch; si mode=art generar varios strokes con color y acuarela; si mode=tutorial, dar pasos textuales detallados.`;

    const body = {
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: userMsg }
      ],
      temperature: 0.9,
      max_tokens: 1200
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_KEY}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).send(text);
    }
    const data = await response.json();
    let text = '';
    if (data.choices && data.choices[0] && data.choices[0].message) {
      text = data.choices[0].message.content;
    } else {
      text = JSON.stringify(data);
    }
    try {
      let t = text.trim();
      if (t.startsWith('```')) {
        const parts = t.split('```');
        if (parts.length >= 2) t = parts[1].trim();
      }
      const obj = JSON.parse(t);
      return res.json(obj);
    } catch (e) {
      return res.send(text);
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error: ' + err.message);
  }
});

const PORT = process.env.PORT || 3000;
app.use(express.static('.'));
app.listen(PORT, () => console.log(`Proxy server listening on port ${PORT}`));