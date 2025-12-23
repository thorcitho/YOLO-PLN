// ==================== TABS ====================
function openTab(tabName) {
    // Ocultar todos los tabs
    const tabContents = document.getElementsByClassName('tab-content');
    for (let content of tabContents) {
        content.classList.remove('active');
    }

    // Desactivar todos los botones
    const tabButtons = document.getElementsByClassName('tab-button');
    for (let button of tabButtons) {
        button.classList.remove('active');
    }

    // Mostrar tab seleccionado
    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');

    // Si cambia a video, detener cámara
    if (tabName === 'video') {
        stopCamera();
    }
}

// ==================== TIEMPO REAL ====================
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

// ==================== UPLOAD VIDEO ====================
const uploadArea = document.getElementById('uploadArea');
const videoInput = document.getElementById('videoInput');
const uploadProgress = document.getElementById('uploadProgress');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');

// Click para seleccionar
uploadArea.addEventListener('click', () => videoInput.click());

// Drag & Drop
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragging');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragging');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragging');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleVideoFile(files[0]);
    }
});

videoInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleVideoFile(e.target.files[0]);
    }
});

function handleVideoFile(file) {
    if (!file.type.startsWith('video/')) {
        alert('Por favor selecciona un archivo de video válido');
        return;
    }

    // Mostrar preview del video original
    const videoPreview = document.getElementById('videoPreview');
    const originalVideo = document.getElementById('originalVideo');
    const reader = new FileReader();

    reader.onload = (e) => {
        originalVideo.src = e.target.result;
        videoPreview.style.display = 'block';
    };
    reader.readAsDataURL(file);

    // Subir y procesar video
    uploadVideo(file);
}

function uploadVideo(file) {
    const formData = new FormData();
    formData.append('video', file);

    // Mostrar barra de progreso
    uploadProgress.style.display = 'block';
    progressText.textContent = 'Subiendo video...';

    const xhr = new XMLHttpRequest();

    // Progress
    xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
            const percentComplete = (e.loaded / e.total) * 100;
            progressFill.style.width = percentComplete + '%';
            progressText.textContent = `Subiendo: ${percentComplete.toFixed(0)}%`;
        }
    });

    // Completado
    xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
            const response = JSON.parse(xhr.responseText);
            progressText.textContent = 'Video subido. Procesando con YOLO...';
            progressFill.style.width = '100%';
            
            // Opcional: si quieres ver el stream en tiempo real, habilita la línea siguiente.
            // startLiveStream(response.stream_url, response.output_filename);
            
            // Verificar cuando el video esté listo
            checkVideoStatus(response.output_filename, response.total_frames || 0);

            // Refrescar historial
            loadHistory();
        } else {
            const errorMsg = xhr.responseText ? JSON.parse(xhr.responseText).error : 'Error desconocido';
            alert('Error al subir video: ' + errorMsg);
            uploadProgress.style.display = 'none';
        }
    });
    
    // Manejo de errores
    xhr.addEventListener('error', () => {
        alert('Error de red al subir video');
        uploadProgress.style.display = 'none';
    });

    xhr.open('POST', '/upload_video');
    xhr.send(formData);
}

let liveStreamInterval = null;
let processedOverlayInterval = null;

// Actualizar sessionId cuando se carga un video
function updateVideoSessionId(filename) {
    currentSessionId = filename;
    const liveStream = document.getElementById('liveStream');
    const detectedVideo = document.getElementById('detectedVideo');
    
    if (liveStream) {
        liveStream.dataset.filename = filename;
    }
    if (detectedVideo) {
        detectedVideo.dataset.filename = filename;
    }
}

function startLiveStream(streamUrl, filename) {
    const liveProcessingDiv = document.getElementById('liveProcessing');
    const liveStream = document.getElementById('liveStream');
    const processingPlaceholder = document.getElementById('processingPlaceholder');
    
    // Mostrar contenedor de stream en tiempo real
    liveProcessingDiv.style.display = 'block';
    processingPlaceholder.style.display = 'block';
    
    // Actualizar session ID
    if (filename) {
        updateVideoSessionId(filename);
    }
    
    // Iniciar stream después de un pequeño delay para asegurar que el servidor esté listo
    setTimeout(() => {
        liveStream.src = streamUrl + '?' + new Date().getTime();
        liveStream.classList.add('active');
        liveStream.onload = () => {
            processingPlaceholder.style.display = 'none';
        };
        liveStream.onerror = () => {
            console.log('Esperando frames del stream...');
        };
    }, 500);
}

function checkVideoStatus(filename, totalFrames = 0) {
    const interval = setInterval(() => {
        fetch(`/check_video/${filename}`)
            .then(response => response.json())
            .then(data => {
                if (data.ready && data.status === 'completed') {
                    clearInterval(interval);
                    stopLiveStream();
                    showProcessedVideo(data.url, filename, data.fps || null);
                    loadHistory();
                } else if (data.status === 'error') {
                    clearInterval(interval);
                    stopLiveStream();
                    uploadProgress.style.display = 'none';
                    alert('Error al procesar video: ' + (data.error || 'Error desconocido'));
                    progressText.textContent = 'Error al procesar';
                } else {
                    // Mostrar progreso detallado
                    const progress = data.progress || 0;
                    const processed = data.processed_frames || 0;
                    const total = data.total_frames || totalFrames;
                    
                    progressFill.style.width = progress + '%';
                    
                    if (total > 0) {
                        progressText.textContent = `Procesando: ${processed}/${total} frames (${progress}%)`;
                    } else {
                        progressText.textContent = `Procesando video con YOLO...`;
                    }
                }
            })
            .catch(error => {
                console.error('Error al verificar estado:', error);
            });
    }, 2000); // Verificar cada 2 segundos
}

function stopLiveStream() {
    const liveStream = document.getElementById('liveStream');
    const liveProcessingDiv = document.getElementById('liveProcessing');
    
    if (liveStream) {
        liveStream.src = '';
        liveStream.classList.remove('active');
    }
    
    // Ocultar después de un delay para que se vea el último frame
    setTimeout(() => {
        if (liveProcessingDiv) {
            liveProcessingDiv.style.display = 'none';
        }
    }, 1000);
}

function showProcessedVideo(videoUrl, filename, fps = null) {
    uploadProgress.style.display = 'none';
    
    const processedVideoDiv = document.getElementById('processedVideo');
    const detectedVideo = document.getElementById('detectedVideo');
    const overlay = document.getElementById('detectedOverlay');
    const downloadBtn = document.getElementById('downloadBtn');

    detectedVideo.src = videoUrl;
    downloadBtn.href = videoUrl;
    detectedVideo.dataset.filename = filename || 'unknown';
    if (fps) {
        detectedVideo.dataset.fps = fps;
    }
    processedVideoDiv.style.display = 'block';

    // Dibujar overlay de detecciones cuando cargue el video
    if (overlay && detectedVideo) {
        detectedVideo.onloadedmetadata = () => {
            drawDetectionsOnElement(detectedVideo, overlay, filename || 'unknown');
            startProcessedOverlayUpdater(detectedVideo, overlay, filename || 'unknown');
        };
    }

    progressText.textContent = 'Video procesado exitosamente';
    
    // Scroll suave al video procesado
    processedVideoDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Actualizar historial
    loadHistory();
}

// Detener cámara al cerrar pestaña
window.addEventListener('beforeunload', () => {
    if (cameraActive) {
        stopCamera();
    }
});

// ==================== DETECCIÓN DE CLICKS Y PLN ====================

let currentSessionId = 'realtime';
let detectionCheckInterval = null;

// Función para detectar qué bounding box fue clickeado
function getClickedDetection(x, y, detections, imgWidth, imgHeight, displayWidth, displayHeight) {
    if (!detections || detections.length === 0) return null;
    
    // Calcular escala entre imagen original y display
    const scaleX = imgWidth / displayWidth;
    const scaleY = imgHeight / displayHeight;
    
    // Ajustar coordenadas del click a la escala de la imagen original
    const adjustedX = x * scaleX;
    const adjustedY = y * scaleY;
    
    // Buscar el bounding box que contiene el punto clickeado
    for (let det of detections) {
        const bbox = det.bbox;
        if (adjustedX >= bbox.x1 && adjustedX <= bbox.x2 &&
            adjustedY >= bbox.y1 && adjustedY <= bbox.y2) {
            return det;
        }
    }
    
    return null;
}

// Función para obtener detecciones actuales
async function getCurrentDetections(sessionId, frameIndex = null) {
    try {
        const url = frameIndex !== null
            ? `/get_detections/${sessionId}?frame=${frameIndex}`
            : `/get_detections/${sessionId}`;
        const response = await fetch(url);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error al obtener detecciones:', error);
        return { detections: [], width: 0, height: 0 };
    }
}

function startProcessedOverlayUpdater(mediaEl, canvasEl, sessionId) {
    stopProcessedOverlayUpdater();
    if (!mediaEl || !canvasEl) return;
    // Actualiza cada 800ms para refrescar cajas dinámicamente
    processedOverlayInterval = setInterval(() => {
        drawDetectionsOnElement(mediaEl, canvasEl, sessionId);
    }, 800);
}

function stopProcessedOverlayUpdater() {
    if (processedOverlayInterval) {
        clearInterval(processedOverlayInterval);
        processedOverlayInterval = null;
    }
}

// Redibujar overlay cuando el video avanza de tiempo (captura saltos manuales)
const processedVideo = document.getElementById('detectedVideo');
if (processedVideo) {
    processedVideo.addEventListener('timeupdate', () => {
        const overlay = document.getElementById('detectedOverlay');
        if (overlay) {
            drawDetectionsOnElement(processedVideo, overlay, processedVideo.dataset.filename || 'unknown');
        }
    });
}

// Función para mostrar descripción PLN
async function showAnimalDescription(animal, confidence, sessionId = '') {
    try {
        const response = await fetch('/get_animal_description', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ animal: animal })
        });
        
        const data = await response.json();
        
        if (data.description) {
            const desc = data.description;
            // Modal
            document.getElementById('modalAnimalName').textContent = animal.charAt(0).toUpperCase() + animal.slice(1);
            document.getElementById('modalScientificName').textContent = desc.nombre_cientifico || 'No disponible';
            document.getElementById('modalDescription').textContent = desc.descripcion || 'Descripción no disponible';
            document.getElementById('modalHabitat').textContent = desc.habitat || 'No disponible';
            document.getElementById('modalUses').textContent = desc.usos || 'No disponible';
            document.getElementById('modalConfidence').textContent = `Confianza: ${(confidence * 100).toFixed(1)}%`;
            
            // Llenar características modal
            const characteristicsList = document.getElementById('modalCharacteristics');
            characteristicsList.innerHTML = '';
            if (desc.caracteristicas && Array.isArray(desc.caracteristicas)) {
                desc.caracteristicas.forEach(char => {
                    const li = document.createElement('li');
                    li.textContent = char;
                    characteristicsList.appendChild(li);
                });
            }
            
            // Panel lateral
            const isRealtime = sessionId === 'realtime';
            const panelRoot = isRealtime ? document.getElementById('infoPanelRealtime') : document.getElementById('infoPanel');
            const pnlName = panelRoot ? panelRoot.querySelector(isRealtime ? '#rtPanelAnimalName' : '#panelAnimalName') : null;
            const pnlSci = panelRoot ? panelRoot.querySelector(isRealtime ? '#rtPanelScientificName' : '#panelScientificName') : null;
            const pnlDesc = panelRoot ? panelRoot.querySelector(isRealtime ? '#rtPanelDescription' : '#panelDescription') : null;
            const pnlHab = panelRoot ? panelRoot.querySelector(isRealtime ? '#rtPanelHabitat' : '#panelHabitat') : null;
            const pnlUses = panelRoot ? panelRoot.querySelector(isRealtime ? '#rtPanelUses' : '#panelUses') : null;
            const pnlConf = panelRoot ? panelRoot.querySelector(isRealtime ? '#rtPanelConfidence' : '#panelConfidence') : null;
            const pnlChars = panelRoot ? panelRoot.querySelector(isRealtime ? '#rtPanelCharacteristics' : '#panelCharacteristics') : null;
            if (pnlName) pnlName.textContent = animal.charAt(0).toUpperCase() + animal.slice(1);
            if (pnlSci) pnlSci.textContent = desc.nombre_cientifico || 'No disponible';
            if (pnlDesc) pnlDesc.textContent = desc.descripcion || 'Descripción no disponible';
            if (pnlHab) pnlHab.textContent = desc.habitat || 'No disponible';
            if (pnlUses) pnlUses.textContent = desc.usos || 'No disponible';
            if (pnlConf) pnlConf.textContent = `Confianza: ${(confidence * 100).toFixed(1)}%`;
            if (pnlChars) {
                pnlChars.innerHTML = '';
                if (desc.caracteristicas && Array.isArray(desc.caracteristicas)) {
                    desc.caracteristicas.forEach(char => {
                        const li = document.createElement('li');
                        li.textContent = char;
                        pnlChars.appendChild(li);
                    });
                }
            }

            // Imagen sugerida (el usuario colocará el archivo)
            const panelImage = panelRoot ? panelRoot.querySelector(isRealtime ? '#rtPanelImage' : '#panelImage') : null;
            const placeholder = panelRoot ? panelRoot.querySelector('.info-image-placeholder') : null;
            if (panelImage) {
                const src = `/static/img/${animal.toLowerCase()}.jpg`;
                panelImage.style.display = 'block';
                panelImage.src = src;
                panelImage.alt = animal;
                panelImage.onerror = () => {
                    panelImage.style.display = 'none';
                    if (placeholder) {
                        placeholder.style.display = 'block';
                    }
                };
                if (placeholder) {
                    placeholder.style.display = 'none';
                }
            }
            
            // Mostrar modal
            document.getElementById('animalModal').style.display = 'block';

            // Prefill chatbot con el animal
            if (!isRealtime) {
                const chatQuestion = document.getElementById('chatQuestion');
                if (chatQuestion && !chatQuestion.value) {
                    chatQuestion.value = `Descríbeme brevemente al ${animal}`;
                }
            }
        }
    } catch (error) {
        console.error('Error al obtener descripción:', error);
        alert('Error al obtener la descripción del animal');
    }
}

// Función para manejar clicks en imágenes/videos
async function handleMediaClick(event, sessionId) {
    const element = event.target;
    const rect = element.getBoundingClientRect();
    
    // Coordenadas relativas al elemento
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Obtener dimensiones de display y originales
    const displayWidth = rect.width;
    const displayHeight = rect.height;
    
    // Obtener detecciones actuales
    const detectionData = await getCurrentDetections(sessionId);
    
    if (!detectionData || !detectionData.detections || detectionData.detections.length === 0) {
        return; // No hay detecciones
    }
    
    // Obtener dimensiones originales de la imagen
    const imgWidth = detectionData.width || element.naturalWidth || element.videoWidth;
    const imgHeight = detectionData.height || element.naturalHeight || element.videoHeight;
    
    // Buscar detección clickeada
    const clickedDetection = getClickedDetection(x, y, detectionData.detections, 
                                                 imgWidth, imgHeight, displayWidth, displayHeight);
    
    if (clickedDetection) {
        await showAnimalDescription(clickedDetection.class, clickedDetection.confidence, sessionId);
    }
}

// Configurar event listeners para detección de clicks
function setupClickDetection() {
    // Tiempo real
    const webcamStream = document.getElementById('webcamStream');
    if (webcamStream) {
        webcamStream.addEventListener('click', (e) => {
            handleMediaClick(e, 'realtime');
        });
    }
    
    // Stream en tiempo real de video
    const liveStream = document.getElementById('liveStream');
    if (liveStream) {
        liveStream.addEventListener('click', (e) => {
            const outputFilename = liveStream.dataset.filename || 'unknown';
            handleMediaClick(e, outputFilename);
        });
    }
    
    // Video procesado
    const detectedVideo = document.getElementById('detectedVideo');
    if (detectedVideo) {
        detectedVideo.addEventListener('click', (e) => {
            const outputFilename = detectedVideo.dataset.filename || 'unknown';
            handleMediaClick(e, outputFilename);
        });
    }
}

// ==================== HISTORIAL ====================

async function loadHistory() {
    try {
        const res = await fetch('/history');
        const history = await res.json();
        renderHistory(history);
    } catch (e) {
        console.error('Error al cargar historial', e);
    }
}

function renderHistory(history) {
    const historyList = document.getElementById('historyList');
    if (!historyList) return;

    historyList.innerHTML = '';

    if (!history || history.length === 0) {
        const p = document.createElement('p');
        p.className = 'history-empty';
        p.textContent = 'Sin videos procesados aún.';
        historyList.appendChild(p);
        return;
    }

    history.forEach(item => {
        const row = document.createElement('div');
        row.className = 'history-item';

        const info = document.createElement('div');
        info.className = 'history-info';
        const name = document.createElement('div');
        name.className = 'history-name';
        name.textContent = item.original_filename || item.output_filename;
        const meta = document.createElement('div');
        meta.className = 'history-meta';
        meta.textContent = `Procesado: ${item.created_at}`;
        info.appendChild(name);
        info.appendChild(meta);

        const actions = document.createElement('div');
        const status = document.createElement('div');
        status.className = 'history-status';
        status.textContent = (item.status || '').toUpperCase();
        actions.appendChild(status);

        if (item.status === 'completed') {
            const viewBtn = document.createElement('button');
            viewBtn.className = 'btn btn-primary';
            viewBtn.textContent = 'Ver';
            viewBtn.onclick = () => {
                // Cambiar a tab de video
                openTab('video');

                const processedVideoDiv = document.getElementById('processedVideo');
                const detectedVideo = document.getElementById('detectedVideo');
                const downloadBtn = document.getElementById('downloadBtn');
                if (detectedVideo && downloadBtn && processedVideoDiv) {
                    const cacheBuster = `${item.url}?t=${Date.now()}`;
                    detectedVideo.src = cacheBuster;
                    detectedVideo.dataset.filename = item.output_filename;
                    detectedVideo.dataset.fps = item.fps || 30;
                    downloadBtn.href = item.url;
                    processedVideoDiv.style.display = 'block';
                    // Forzar recarga del video
                    detectedVideo.load();
                    // Intentar reproducir (ignorar autoplay bloqueado)
                    detectedVideo.play().catch(() => {});
                    processedVideoDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

                // Dibujar overlay al cargar metadatos
                const overlay = document.getElementById('detectedOverlay');
                if (overlay) {
                    detectedVideo.onloadedmetadata = () => {
                            drawDetectionsOnElement(detectedVideo, overlay, item.output_filename);
                            startProcessedOverlayUpdater(detectedVideo, overlay, item.output_filename);
                    };
                        // También redibujar al tiempo cambiar
                        detectedVideo.ontimeupdate = () => {
                            drawDetectionsOnElement(detectedVideo, overlay, item.output_filename);
                        };
                }
                }
            };
            actions.appendChild(viewBtn);
        } else {
            const prog = document.createElement('div');
            prog.className = 'history-meta';
            prog.textContent = `Progreso: ${item.progress || 0}%`;
            actions.appendChild(prog);
        }

        row.appendChild(info);
        row.appendChild(actions);
        historyList.appendChild(row);
    });
}

// Dibuja bounding boxes sobre un elemento (video o imagen)
async function drawDetectionsOnElement(mediaEl, canvasEl, sessionId) {
    if (!mediaEl || !canvasEl) return;
    let frameIndex = null;
    // Para videos procesados, usamos currentTime para acercarnos al frame real
    if (mediaEl.tagName.toLowerCase() === 'video') {
        const fps = parseFloat(mediaEl.dataset.fps || '30');
        frameIndex = Math.max(0, Math.floor((mediaEl.currentTime || 0) * fps));
    }

    const detectionData = await getCurrentDetections(sessionId, frameIndex);
    if (!detectionData || !detectionData.detections || detectionData.detections.length === 0) {
        const ctx = canvasEl.getContext('2d');
        ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
        return;
    }

    // Ajustar canvas al tamaño mostrado
    const rect = mediaEl.getBoundingClientRect();
    canvasEl.width = rect.width;
    canvasEl.height = rect.height;

    const ctx = canvasEl.getContext('2d');
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    ctx.lineWidth = 2;
    ctx.font = '14px Segoe UI';

    const imgW = detectionData.width || mediaEl.videoWidth || mediaEl.naturalWidth || rect.width;
    const imgH = detectionData.height || mediaEl.videoHeight || mediaEl.naturalHeight || rect.height;
    if (!imgW || !imgH) return;
    const scaleX = rect.width / imgW;
    const scaleY = rect.height / imgH;

    detectionData.detections.forEach(det => {
        const { bbox, class: cls, confidence } = det;
        const x = bbox.x1 * scaleX;
        const y = bbox.y1 * scaleY;
        const w = (bbox.x2 - bbox.x1) * scaleX;
        const h = (bbox.y2 - bbox.y1) * scaleY;
        ctx.strokeStyle = '#2563eb';
        ctx.fillStyle = 'rgba(37, 99, 235, 0.18)';
        ctx.strokeRect(x, y, w, h);
        ctx.fillRect(x, y, w, h);

        const label = `${cls} ${(confidence * 100).toFixed(1)}%`;
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 1;
        const textWidth = ctx.measureText(label).width + 10;
        const labelHeight = 18;
        ctx.fillRect(x, y - labelHeight, textWidth, labelHeight);
        ctx.strokeRect(x, y - labelHeight, textWidth, labelHeight);
        ctx.fillStyle = '#1f2937';
        ctx.fillText(label, x + 4, y - 5);
    });
}

// Cerrar modal y eventos iniciales
document.addEventListener('DOMContentLoaded', () => {
    setupClickDetection();
    loadHistory();

    const refreshHistoryBtn = document.getElementById('refreshHistoryBtn');
    if (refreshHistoryBtn) {
        refreshHistoryBtn.addEventListener('click', loadHistory);
    }
    
    const modal = document.getElementById('animalModal');
    const closeBtn = document.querySelector('.modal-close');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }
    
    // Cerrar al hacer click fuera del modal
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Chatbot
    const bindChat = (btnId, questionId, answerId) => {
        const btn = document.getElementById(btnId);
        if (!btn) return;
        btn.addEventListener('click', async () => {
            const questionEl = document.getElementById(questionId);
            const answerEl = document.getElementById(answerId);
            if (!questionEl || !answerEl) return;
            const q = questionEl.value.trim();
            if (!q) {
                answerEl.textContent = 'Escribe una pregunta.';
                return;
            }
            answerEl.textContent = 'Consultando...';
            try {
                const resp = await fetch('/chatbot', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ question: q })
                });
                const data = await resp.json();
                if (resp.ok && data.answer) {
                    answerEl.textContent = data.answer;
                } else {
                    answerEl.textContent = data.error || 'No se obtuvo respuesta.';
                }
            } catch (e) {
                answerEl.textContent = 'Error de red al consultar.';
            }
        });
    };

    // Chat en video procesado
    bindChat('chatSendBtn', 'chatQuestion', 'chatAnswer');
    // Chat en tiempo real
    bindChat('rtChatSendBtn', 'rtChatQuestion', 'rtChatAnswer');
});

// Actualizar sessionId cuando se carga un video
function updateVideoSessionId(filename) {
    currentSessionId = filename;
    const liveStream = document.getElementById('liveStream');
    const detectedVideo = document.getElementById('detectedVideo');
    
    if (liveStream) {
        liveStream.dataset.filename = filename;
    }
    if (detectedVideo) {
        detectedVideo.dataset.filename = filename;
    }
}
