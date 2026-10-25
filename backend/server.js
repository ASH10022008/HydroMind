const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const projectRoot = path.resolve(__dirname, '..');
const modelPath = path.join(projectRoot, 'ml', 'models', 'hydromind_wqi_model.joblib');
const inferencePath = path.join(projectRoot, 'ml', 'inference.py');
const state = {
  temperature: null,
  turbidityVoltage: null,
  turbidityNtu: null,
  rgb: null,
  color: 'Unknown',
  cameraUrl: null,
  updatedAt: new Date().toISOString(),
  wqi: {
    status: 'waiting',
    error: null,
    wqi: null,
    category: null,
    severity: null,
  },
};

let predictionSequence = 0;
let pendingPrediction = null;
let predictionRunning = false;

const sendJson = (res, code, payload) => {
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(payload));
};

const readNumber = (value) => {
  if (typeof value !== 'number' && !(typeof value === 'string' && value.trim())) {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const voltageToNtu = (voltage) => {
  const clamped = Math.min(3.0, Math.max(0.5, voltage));
  return Math.round(((3.0 - clamped) / 2.5) * 1000 * 100) / 100;
};

const ntuToVoltage = (ntu) => {
  const clamped = Math.min(1000, Math.max(0, ntu));
  return 3.0 - (clamped / 1000) * 2.5;
};

function finishPrediction(prediction, result, error) {
  if (prediction.id === predictionSequence) {
    if (result) {
      state.wqi = {
        ...result,
        status: 'ready',
        error: null,
        updatedAt: new Date().toISOString(),
      };
      if (typeof result.color === 'string') {
        state.color = result.color;
      }
    } else {
      state.wqi = { ...state.wqi, status: 'error', error };
    }
  }

  predictionRunning = false;
  runPendingPrediction();
}

function runPendingPrediction() {
  if (predictionRunning || !pendingPrediction) {
    return;
  }

  const prediction = pendingPrediction;
  pendingPrediction = null;

  if (!fs.existsSync(modelPath)) {
    finishPrediction(
      prediction,
      null,
      'WQI model is not trained yet. Run python -m ml.train from the project root.',
    );
    return;
  }

  predictionRunning = true;
  const args = [
    inferencePath,
    '--turbidity-voltage',
    String(prediction.turbidityVoltage),
    '--temperature',
    String(prediction.temperature),
  ];
  args.push('--red-mean', String(prediction.rgb.red));
  args.push('--green-mean', String(prediction.rgb.green));
  args.push('--blue-mean', String(prediction.rgb.blue));

  const python = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
  const child = spawn(python, args, { cwd: projectRoot });
  let stdout = '';
  let stderr = '';
  let settled = false;
  const timeout = setTimeout(() => child.kill(), 15000);

  const fail = (message) => {
    if (settled) {
      return;
    }
    settled = true;
    clearTimeout(timeout);
    finishPrediction(prediction, null, message);
  };

  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk) => { stdout += chunk; });
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  child.on('error', (error) => {
    console.error('Could not start WQI inference:', error);
    fail('Could not start Python inference. Check the PYTHON setting and ML dependencies.');
  });
  child.on('close', (code) => {
    if (settled) {
      return;
    }
    settled = true;
    clearTimeout(timeout);

    if (code !== 0) {
      console.error('WQI inference failed:', stderr || `Python exited with code ${code}`);
      finishPrediction(prediction, null, 'WQI inference failed. Check the backend logs.');
      return;
    }

    try {
      finishPrediction(prediction, JSON.parse(stdout), null);
    } catch (error) {
      console.error('Could not parse WQI inference output:', error);
      finishPrediction(prediction, null, 'WQI inference returned an invalid response.');
    }
  });
}

function requestPrediction() {
  const id = ++predictionSequence;
  if (state.temperature == null || state.turbidityVoltage == null || state.rgb == null) {
    pendingPrediction = null;
    state.wqi = { ...state.wqi, status: 'waiting', error: null };
    return;
  }

  state.wqi = { ...state.wqi, status: 'processing', error: null };
  pendingPrediction = {
    id,
    temperature: state.temperature,
    turbidityVoltage: state.turbidityVoltage,
    rgb: state.rgb,
  };
  runPendingPrediction();
}

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

  if (req.url === '/api/wqi') {
    sendJson(res, 200, state.wqi);
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
        const temperature = readNumber(payload.temperature);
        const turbidityVoltage = readNumber(payload.turbidity_voltage);
        const turbidityNtu = readNumber(payload.turbidity);
        const redMean = readNumber(payload.red_mean);
        const greenMean = readNumber(payload.green_mean);
        const blueMean = readNumber(payload.blue_mean);

        if (temperature != null) {
          state.temperature = temperature;
        }
        if (turbidityVoltage != null) {
          state.turbidityVoltage = turbidityVoltage;
          state.turbidityNtu = voltageToNtu(turbidityVoltage);
        } else if (turbidityNtu != null) {
          state.turbidityNtu = turbidityNtu;
          state.turbidityVoltage = ntuToVoltage(turbidityNtu);
        }
        if (
          redMean != null && redMean >= 0 && redMean <= 255 &&
          greenMean != null && greenMean >= 0 && greenMean <= 255 &&
          blueMean != null && blueMean >= 0 && blueMean <= 255
        ) {
          state.rgb = {
            red: redMean,
            green: greenMean,
            blue: blueMean,
          };
        }
        if (typeof payload.color === 'string') {
          state.color = payload.color;
        }
        if (typeof payload.cameraUrl === 'string' && /^http:\/\/[\w.-]+(?::\d+)?\/stream$/.test(payload.cameraUrl)) {
          state.cameraUrl = payload.cameraUrl;
        }
        state.updatedAt = new Date().toISOString();
        requestPrediction();

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
