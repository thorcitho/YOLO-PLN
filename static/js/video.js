// ==================== UPLOAD Y PROCESAMIENTO DE VIDEO ====================
// Este archivo contiene las funciones específicas para la página de videos

let processedOverlayInterval = null;

// ==================== UPLOAD VIDEO ====================
const uploadArea = document.getElementById('uploadArea');
const videoInput = document.getElementById('videoInput');
const uploadProgress = document.getElementById('uploadProgress');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');

if (uploadArea) {
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
}

if (videoInput) {
    videoInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleVideoFile(e.target.files[0]);
        }
    });
}

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

// Actualizar sessionId cuando se carga un video
function updateVideoSessionId(filename) {
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

function startProcessedOverlayUpdater(mediaEl, canvasEl, sessionId) {
    stopProcessedOverlayUpdater();
    if (!mediaEl || !canvasEl) return;

    // Función para actualizar el overlay
    const updateOverlay = () => {
        drawDetectionsOnElement(mediaEl, canvasEl, sessionId);
    };

    // Actualizar cuando el video cambia de tiempo
    mediaEl.addEventListener('timeupdate', updateOverlay);
    mediaEl.addEventListener('seeked', updateOverlay);
    mediaEl.addEventListener('play', updateOverlay);

    // También actualizar periódicamente como respaldo
    processedOverlayInterval = setInterval(updateOverlay, 500);

    // Guardar referencias para limpieza
    mediaEl._overlayUpdateFn = updateOverlay;
}

function stopProcessedOverlayUpdater() {
    if (processedOverlayInterval) {
        clearInterval(processedOverlayInterval);
        processedOverlayInterval = null;
    }

    // Limpiar event listeners del video anterior
    const detectedVideo = document.getElementById('detectedVideo');
    if (detectedVideo && detectedVideo._overlayUpdateFn) {
        detectedVideo.removeEventListener('timeupdate', detectedVideo._overlayUpdateFn);
        detectedVideo.removeEventListener('seeked', detectedVideo._overlayUpdateFn);
        detectedVideo.removeEventListener('play', detectedVideo._overlayUpdateFn);
        detectedVideo._overlayUpdateFn = null;
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
        actions.className = 'history-actions';

        const status = document.createElement('div');
        status.className = 'history-status';
        status.textContent = (item.status || '').toUpperCase();
        actions.appendChild(status);

        if (item.status === 'completed') {
            const viewBtn = document.createElement('button');
            viewBtn.className = 'btn btn-primary btn-sm';
            viewBtn.textContent = 'Ver';
            viewBtn.onclick = () => {
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
                    detectedVideo.play().catch(() => { });
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

        // Botón de eliminar
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-danger btn-sm';
        deleteBtn.textContent = 'Eliminar';
        deleteBtn.onclick = () => deleteVideo(item.output_filename, item.original_filename);
        actions.appendChild(deleteBtn);

        row.appendChild(info);
        row.appendChild(actions);
        historyList.appendChild(row);
    });
}

// Función para eliminar un video
async function deleteVideo(filename, originalName) {
    const confirmDelete = confirm(`¿Estás seguro de que deseas eliminar "${originalName || filename}"?\n\nEsto eliminará permanentemente el video procesado y el original.`);

    if (!confirmDelete) return;

    try {
        const response = await fetch(`/delete_video/${filename}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (response.ok && data.success) {
            // Mostrar mensaje de éxito
            alert('Video eliminado correctamente');
            // Recargar historial
            loadHistory();

            // Si el video eliminado está siendo mostrado, ocultarlo
            const detectedVideo = document.getElementById('detectedVideo');
            if (detectedVideo && detectedVideo.dataset.filename === filename) {
                detectedVideo.src = '';
                document.getElementById('processedVideo').style.display = 'none';
            }
        } else {
            alert('Error al eliminar: ' + (data.error || 'Error desconocido'));
        }
    } catch (e) {
        console.error('Error al eliminar video:', e);
        alert('Error de red al eliminar el video');
    }
}

// Configurar event listeners para detección de clicks en videos
function setupVideoClickDetection() {
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

        // Redibujar overlay cuando el video cambia de tiempo
        detectedVideo.addEventListener('timeupdate', () => {
            const overlay = document.getElementById('detectedOverlay');
            if (overlay) {
                drawDetectionsOnElement(detectedVideo, overlay, detectedVideo.dataset.filename || 'unknown');
            }
        });
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    setupVideoClickDetection();
    loadHistory();

    const refreshHistoryBtn = document.getElementById('refreshHistoryBtn');
    if (refreshHistoryBtn) {
        refreshHistoryBtn.addEventListener('click', loadHistory);
    }

    // Inicializar chatbot para videos
    initChatbot('chatSendBtn', 'chatQuestion', 'chatAnswer');
});
