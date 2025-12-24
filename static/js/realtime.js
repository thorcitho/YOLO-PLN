// ==================== TIEMPO REAL ====================
// Este archivo contiene las funciones específicas para la página de detección en tiempo real

let cameraActive = false;

function startCamera() {
    const webcamStream = document.getElementById('webcamStream');
    const noCamera = document.getElementById('noCamera');
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');

    fetch('/start_camera', { method: 'POST' })
        .then(response => response.json())
        .then(data => {
            webcamStream.src = '/video_feed?' + new Date().getTime();
            webcamStream.classList.add('active');
            noCamera.style.display = 'none';
            cameraActive = true;

            startBtn.disabled = true;
            stopBtn.disabled = false;

            console.log('Cámara iniciada');
        })
        .catch(error => {
            alert('Error al iniciar cámara: ' + error);
        });
}

function stopCamera() {
    if (!cameraActive) return;

    const webcamStream = document.getElementById('webcamStream');
    const noCamera = document.getElementById('noCamera');
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');

    fetch('/stop_camera', { method: 'POST' })
        .then(response => response.json())
        .then(data => {
            webcamStream.src = '';
            webcamStream.classList.remove('active');
            noCamera.style.display = 'block';
            cameraActive = false;

            startBtn.disabled = false;
            stopBtn.disabled = true;

            console.log('Cámara detenida');
        });
}

// Configurar event listeners para detección de clicks en tiempo real
function setupRealtimeClickDetection() {
    const webcamStream = document.getElementById('webcamStream');
    if (webcamStream) {
        webcamStream.addEventListener('click', (e) => {
            handleMediaClick(e, 'realtime');
        });
    }
}

// Detener cámara al cerrar pestaña
window.addEventListener('beforeunload', () => {
    if (cameraActive) {
        stopCamera();
    }
});

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    setupRealtimeClickDetection();

    // Inicializar chatbot para tiempo real
    initChatbot('rtChatSendBtn', 'rtChatQuestion', 'rtChatAnswer');
});
