// ==================== ANÁLISIS DE IMÁGENES ====================
// Este archivo contiene las funciones específicas para la página de imágenes

let currentImageDetections = [];
let currentImageWidth = 0;
let currentImageHeight = 0;
let currentImageSessionId = null;

// ==================== UPLOAD IMAGE ====================
const imageUploadArea = document.getElementById('imageUploadArea');
const imageInput = document.getElementById('imageInput');

if (imageUploadArea) {
    // Click para seleccionar
    imageUploadArea.addEventListener('click', () => imageInput.click());

    // Drag & Drop
    imageUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        imageUploadArea.classList.add('dragging');
    });

    imageUploadArea.addEventListener('dragleave', () => {
        imageUploadArea.classList.remove('dragging');
    });

    imageUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        imageUploadArea.classList.remove('dragging');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleImageFile(files[0]);
        }
    });
}

if (imageInput) {
    imageInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleImageFile(e.target.files[0]);
        }
    });
}

function handleImageFile(file) {
    if (!file.type.startsWith('image/')) {
        alert('Por favor selecciona un archivo de imagen válido');
        return;
    }

    // Mostrar indicador de procesamiento
    const processing = document.getElementById('imageProcessing');
    const resultSection = document.getElementById('imageResultSection');
    processing.style.display = 'block';
    resultSection.style.display = 'none';

    // Subir y procesar imagen
    uploadImage(file);
}

async function uploadImage(file) {
    const formData = new FormData();
    formData.append('image', file);

    try {
        const response = await fetch('/upload_image', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            // Guardar datos de detección
            currentImageDetections = data.detections || [];
            currentImageWidth = data.width || 0;
            currentImageHeight = data.height || 0;
            currentImageSessionId = data.session_id;

            // Mostrar resultado
            showImageResult(data);
        } else {
            alert('Error al procesar imagen: ' + (data.error || 'Error desconocido'));
        }
    } catch (e) {
        console.error('Error al subir imagen:', e);
        alert('Error de red al subir la imagen');
    } finally {
        document.getElementById('imageProcessing').style.display = 'none';
    }
}

function showImageResult(data) {
    const resultSection = document.getElementById('imageResultSection');
    const resultImage = document.getElementById('resultImage');
    const downloadBtn = document.getElementById('downloadImageBtn');
    const detectionList = document.getElementById('detectionList');

    // Mostrar imagen procesada
    resultImage.src = data.processed_url + '?t=' + Date.now();
    downloadBtn.href = data.processed_url;
    resultSection.style.display = 'block';

    // Mostrar lista de detecciones
    detectionList.innerHTML = '';
    if (data.detections && data.detections.length > 0) {
        // Agrupar por clase
        const counts = {};
        data.detections.forEach(det => {
            const cls = det.class;
            counts[cls] = (counts[cls] || 0) + 1;
        });

        for (const [cls, count] of Object.entries(counts)) {
            const badge = document.createElement('span');
            badge.className = 'detection-badge';
            badge.textContent = `${cls}: ${count}`;
            detectionList.appendChild(badge);
        }
    } else {
        detectionList.innerHTML = '<span class="detection-badge">Ninguno detectado</span>';
    }

    // Esperar a que la imagen cargue para dibujar overlay
    resultImage.onload = () => {
        drawImageOverlay();
    };

    // Scroll al resultado
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function drawImageOverlay() {
    const resultImage = document.getElementById('resultImage');
    const canvas = document.getElementById('imageOverlay');

    if (!resultImage || !canvas || !currentImageDetections.length) {
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        return;
    }

    const rect = resultImage.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const imgW = currentImageWidth || resultImage.naturalWidth || rect.width;
    const imgH = currentImageHeight || resultImage.naturalHeight || rect.height;
    if (!imgW || !imgH) return;

    const scaleX = rect.width / imgW;
    const scaleY = rect.height / imgH;

    ctx.lineWidth = 3;
    ctx.font = '14px Segoe UI';

    currentImageDetections.forEach(det => {
        const { bbox, class: cls, confidence } = det;
        const x = bbox.x1 * scaleX;
        const y = bbox.y1 * scaleY;
        const w = (bbox.x2 - bbox.x1) * scaleX;
        const h = (bbox.y2 - bbox.y1) * scaleY;

        // Bounding box
        ctx.strokeStyle = '#2b6cb0';
        ctx.fillStyle = 'rgba(43, 108, 176, 0.15)';
        ctx.strokeRect(x, y, w, h);
        ctx.fillRect(x, y, w, h);

        // Label
        const label = `${cls} ${(confidence * 100).toFixed(1)}%`;
        const textWidth = ctx.measureText(label).width + 10;
        const labelHeight = 20;
        ctx.fillStyle = '#2b6cb0';
        ctx.fillRect(x, y - labelHeight, textWidth, labelHeight);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(label, x + 5, y - 6);
    });
}

// Manejar click en imagen para seleccionar animal
function setupImageClickHandler() {
    const resultImage = document.getElementById('resultImage');
    if (!resultImage) return;

    resultImage.addEventListener('click', (e) => {
        if (!currentImageDetections.length) return;

        const rect = resultImage.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const imgW = currentImageWidth || resultImage.naturalWidth || rect.width;
        const imgH = currentImageHeight || resultImage.naturalHeight || rect.height;

        const scaleX = imgW / rect.width;
        const scaleY = imgH / rect.height;

        const adjustedX = x * scaleX;
        const adjustedY = y * scaleY;

        // Buscar detección clickeada
        for (const det of currentImageDetections) {
            const bbox = det.bbox;
            if (adjustedX >= bbox.x1 && adjustedX <= bbox.x2 &&
                adjustedY >= bbox.y1 && adjustedY <= bbox.y2) {
                showImageAnimalDescription(det.class, det.confidence);
                return;
            }
        }
    });
}

async function showImageAnimalDescription(animal, confidence) {
    try {
        // Guardar animal para chatbot
        window.setCurrentAnimal(animal);

        const response = await fetch('/get_animal_description', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ animal: animal })
        });

        const data = await response.json();

        if (data.description) {
            const desc = data.description;
            const panel = document.getElementById('imageInfoPanel');

            // Actualizar panel
            document.getElementById('imagePanelAnimalName').textContent = animal.charAt(0).toUpperCase() + animal.slice(1);
            document.getElementById('imagePanelScientificName').textContent = desc.nombre_cientifico || '—';
            document.getElementById('imagePanelHabitat').textContent = desc.habitat || '—';
            document.getElementById('imagePanelUses').textContent = desc.usos || '—';
            document.getElementById('imagePanelConfidence').textContent = `${(confidence * 100).toFixed(1)}%`;
            document.getElementById('imagePanelDescription').textContent = desc.descripcion || '—';

            // Características
            const charsList = document.getElementById('imagePanelCharacteristics');
            charsList.innerHTML = '';
            if (desc.caracteristicas && Array.isArray(desc.caracteristicas)) {
                desc.caracteristicas.forEach(char => {
                    const li = document.createElement('li');
                    li.textContent = char;
                    charsList.appendChild(li);
                });
            }

            // Imagen del animal
            const panelImage = document.getElementById('imagePanelImage');
            const placeholder = panel.querySelector('.info-image-placeholder');
            const src = `/static/img/${animal.toLowerCase()}.jpg`;
            panelImage.src = src;
            panelImage.style.display = 'block';
            panelImage.onerror = () => {
                panelImage.style.display = 'none';
                if (placeholder) placeholder.style.display = 'block';
            };
            if (placeholder) placeholder.style.display = 'none';

            // Prefill chatbot removido - el usuario escribe su propia pregunta

            // Mostrar modal también
            const modal = document.getElementById('animalModal');
            if (modal) {
                document.getElementById('modalAnimalName').textContent = animal.charAt(0).toUpperCase() + animal.slice(1);
                document.getElementById('modalScientificName').textContent = desc.nombre_cientifico || '—';
                document.getElementById('modalDescription').textContent = desc.descripcion || '—';
                document.getElementById('modalHabitat').textContent = desc.habitat || '—';
                document.getElementById('modalUses').textContent = desc.usos || '—';
                document.getElementById('modalConfidence').textContent = `Confianza: ${(confidence * 100).toFixed(1)}%`;

                const modalChars = document.getElementById('modalCharacteristics');
                modalChars.innerHTML = '';
                if (desc.caracteristicas && Array.isArray(desc.caracteristicas)) {
                    desc.caracteristicas.forEach(char => {
                        const li = document.createElement('li');
                        li.textContent = char;
                        modalChars.appendChild(li);
                    });
                }
                modal.style.display = 'block';
            }
        }
    } catch (error) {
        console.error('Error al obtener descripción:', error);
    }
}

// Botón nueva imagen
function setupNewImageButton() {
    const newBtn = document.getElementById('newImageBtn');
    if (newBtn) {
        newBtn.addEventListener('click', () => {
            document.getElementById('imageResultSection').style.display = 'none';
            document.getElementById('resultImage').src = '';
            currentImageDetections = [];
            currentImageWidth = 0;
            currentImageHeight = 0;
            currentImageSessionId = null;
            window.setCurrentAnimal('');

            // Reset panel
            document.getElementById('imagePanelAnimalName').textContent = '—';
            document.getElementById('imagePanelScientificName').textContent = '—';
            document.getElementById('imagePanelHabitat').textContent = '—';
            document.getElementById('imagePanelUses').textContent = '—';
            document.getElementById('imagePanelConfidence').textContent = '—';
            document.getElementById('imagePanelDescription').textContent = '—';
            document.getElementById('imagePanelCharacteristics').innerHTML = '';
            document.getElementById('imageChatQuestion').value = '';
            document.getElementById('imageChatAnswer').textContent = '';
        });
    }
}

// Redibujar overlay cuando cambia el tamaño de la ventana
window.addEventListener('resize', () => {
    if (currentImageDetections.length > 0) {
        drawImageOverlay();
    }
});

// ==================== HISTORIAL DE IMÁGENES ====================

async function loadImageHistory() {
    try {
        const res = await fetch('/image_history');
        const history = await res.json();
        renderImageHistory(history);
    } catch (e) {
        console.error('Error al cargar historial de imágenes', e);
    }
}

function renderImageHistory(history) {
    const historyList = document.getElementById('imageHistoryList');
    if (!historyList) return;

    historyList.innerHTML = '';

    if (!history || history.length === 0) {
        historyList.innerHTML = '<p class="history-empty">Sin imágenes procesadas aún.</p>';
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
        meta.textContent = `${item.created_at} • ${item.detection_count || 0} detecciones`;

        info.appendChild(name);
        info.appendChild(meta);

        const actions = document.createElement('div');
        actions.className = 'history-actions';

        // Botón ver
        const viewBtn = document.createElement('button');
        viewBtn.className = 'btn btn-primary btn-sm';
        viewBtn.textContent = 'Ver';
        viewBtn.onclick = () => viewHistoryImage(item);
        actions.appendChild(viewBtn);

        // Botón eliminar
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-danger btn-sm';
        deleteBtn.textContent = 'Eliminar';
        deleteBtn.onclick = () => deleteHistoryImage(item.output_filename, item.original_filename);
        actions.appendChild(deleteBtn);

        row.appendChild(info);
        row.appendChild(actions);
        historyList.appendChild(row);
    });
}

function viewHistoryImage(item) {
    // Cargar datos de la imagen del historial
    currentImageDetections = item.detections || [];
    currentImageWidth = item.width || 0;
    currentImageHeight = item.height || 0;
    currentImageSessionId = item.session_id;

    // Mostrar resultado
    showImageResult({
        processed_url: item.url,
        detections: item.detections || [],
        width: item.width,
        height: item.height
    });
}

async function deleteHistoryImage(filename, originalName) {
    const confirmDelete = confirm(`¿Estás seguro de que deseas eliminar "${originalName || filename}"?`);

    if (!confirmDelete) return;

    try {
        const response = await fetch(`/delete_image/${filename}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (response.ok && data.success) {
            alert('Imagen eliminada correctamente');
            loadImageHistory();

            // Si la imagen eliminada está siendo mostrada, ocultarla
            const resultImage = document.getElementById('resultImage');
            if (resultImage && resultImage.src.includes(filename)) {
                document.getElementById('imageResultSection').style.display = 'none';
                resultImage.src = '';
                currentImageDetections = [];
            }
        } else {
            alert('Error al eliminar: ' + (data.error || 'Error desconocido'));
        }
    } catch (e) {
        console.error('Error al eliminar imagen:', e);
        alert('Error de red al eliminar la imagen');
    }
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    setupImageClickHandler();
    setupNewImageButton();

    // Inicializar chatbot
    initChatbot('imageChatSendBtn', 'imageChatQuestion', 'imageChatAnswer');

    // Cargar historial al iniciar
    loadImageHistory();
});

