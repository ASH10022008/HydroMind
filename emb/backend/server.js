const http = require('http');

const PORT = 3000;
const state = {
  temperature: null,
  turbidityVoltage: null,
  hueAngle: null,
  color: 'Unknown',
  cameraUrl: null,
  updatedAt: new Date().toISOString(),
};

const sendJson = (res, code, payload) => {
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(payload));
};

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  if (req.url === '/api/health') {
    sendJson(res, 200, { ok: true, uptime: process.uptime() });
    return;
  }

  if (req.url === '/api/camera-url') {
    sendJson(res, 200, { cameraUrl: state.cameraUrl });
    return;
  }

  if (req.url === '/api/data') {
    sendJson(res, 200, {
      ...state,
      updatedAt: state.updatedAt,
    });
    return;
  }

  if (req.url === '/api/esp' && req.method === 'POST') {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk;
    });

    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        if (Number.isFinite(Number(payload.temperature))) {
          state.temperature = Number(payload.temperature);
        }
        if (Number.isFinite(Number(payload.turbidity_voltage))) {
          state.turbidityVoltage = Number(payload.turbidity_voltage);
        }
        if (Number.isFinite(Number(payload.hue_angle))) {
          state.hueAngle = Number(payload.hue_angle);
        }
        if (typeof payload.color === 'string') {
          state.color = payload.color;
        }
        if (typeof payload.cameraUrl === 'string' && /^http:\/\/[\w.-]+(?::\d+)?\/stream$/.test(payload.cameraUrl)) {
          state.cameraUrl = payload.cameraUrl;
        }
        state.updatedAt = new Date().toISOString();

        sendJson(res, 200, {
          ok: true,
          received: { ...state },
        });
      } catch (error) {
        sendJson(res, 400, {
          ok: false,
          error: 'Invalid JSON payload',
        });
      }
    });
    return;
  }

  sendJson(res, 404, { ok: false, message: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
