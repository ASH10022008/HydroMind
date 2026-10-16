const backendUrl = 'http://localhost:3000';
const cameraFeed = document.getElementById('cameraFeed');

const setText = (id, value) => {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
  }
};

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
  } catch (error) {
    setText('temperature', '--');
    setText('color', 'Waiting');
    setText('turbidity', '--');
  }
}

loadCameraUrl();
loadData();
setInterval(loadData, 2000);
setInterval(loadCameraUrl, 10000);
