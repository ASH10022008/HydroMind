const backendUrl = 'http://localhost:3000';
const cameraFeed = document.getElementById('cameraFeed');

const setText = (id, value) => {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
  }
};

function setupTabs() {
  const tabs = [
    { button: document.getElementById('dashboardTab'), panel: document.getElementById('dashboardPanel') },
    { button: document.getElementById('wqiTab'), panel: document.getElementById('wqiPanel') },
  ];

  tabs.forEach(({ button }) => {
    button.addEventListener('click', () => {
      tabs.forEach(({ button: otherButton, panel }) => {
        const selected = otherButton === button;
        otherButton.classList.toggle('active', selected);
        otherButton.setAttribute('aria-selected', String(selected));
        panel.hidden = !selected;
      });
    });
  });
}

async function loadCameraUrl() {
  try {
    const response = await fetch(`${backendUrl}/api/camera-url`);
    const data = await response.json();
    if (data.cameraUrl) {
      if (cameraFeed.src !== data.cameraUrl) {
        cameraFeed.src = data.cameraUrl;
      }
    }
  } catch (error) {
    cameraFeed.src = '';
    cameraFeed.alt = 'Camera not connected';
  }
}

async function loadData() {
  try {
    const response = await fetch(`${backendUrl}/api/data`);
    const data = await response.json();

    setText('temperature', data.temperature == null ? '--' : `${Number(data.temperature).toFixed(1)}°C`);
    setText('color', data.color || 'Unknown');
    setText('turbidity', data.turbidityVoltage == null ? '--' : `${Number(data.turbidityVoltage).toFixed(3)} V`);
    updateWqi(data.wqi);
  } catch (error) {
    setText('temperature', '--');
    setText('color', 'Waiting');
    setText('turbidity', '--');
    updateWqi({ status: 'error', error: 'Backend not connected.' });
  }
}

function updateWqi(wqi) {
  const score = wqi && wqi.wqi != null ? Number(wqi.wqi) : NaN;
  const hasScore = Number.isFinite(score);
  const card = document.querySelector('.wqi-card');
  card.classList.remove('good', 'moderate', 'critical');
  if (wqi && ['good', 'moderate', 'critical'].includes(wqi.severity)) {
    card.classList.add(wqi.severity);
  }

  setText('wqiScore', hasScore ? score.toFixed(1) : '--');
  setText('wqiCategory', hasScore ? `${wqi.category} · ${wqi.severity}` : 'WQI score unavailable');
  const ntu = wqi && wqi.ntu != null ? Number(wqi.ntu) : NaN;
  const dissolvedOxygen = wqi && wqi.dissolved_o2 != null ? Number(wqi.dissolved_o2) : NaN;
  setText('wqiNtu', Number.isFinite(ntu) ? `${ntu.toFixed(1)} NTU` : '--');
  setText('wqiOxygen', Number.isFinite(dissolvedOxygen) ? `${dissolvedOxygen.toFixed(2)} mg/L` : '--');
  setText('wqiUpdatedAt', wqi && wqi.updatedAt ? new Date(wqi.updatedAt).toLocaleTimeString() : '--');
  document.getElementById('wqiProgress').style.width = `${hasScore ? Math.max(0, Math.min(100, score)) : 0}%`;
  document.querySelector('.wqi-progress').setAttribute('aria-valuenow', hasScore ? String(score) : '0');

  let message = 'Waiting for temperature, turbidity, and camera RGB readings.';
  if (wqi && wqi.status === 'processing') {
    message = 'Calculating the latest score...';
  } else if (wqi && wqi.status === 'ready') {
    message = 'Higher scores indicate greater water-quality risk.';
  } else if (wqi && wqi.status === 'error') {
    message = wqi.error || 'WQI prediction failed.';
  }
  setText('wqiMessage', message);
}

setupTabs();
loadCameraUrl();
loadData();
setInterval(loadData, 2000);
setInterval(loadCameraUrl, 10000);
