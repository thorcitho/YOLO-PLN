// ==================== FUNCIONES COMUNES ====================
// Este archivo contiene funciones compartidas entre todas las páginas

// Variable global para el animal seleccionado
let currentAnimal = '';

// Función global para actualizar el animal actual
window.setCurrentAnimal = (animal) => {
    currentAnimal = animal || '';
};

// Función global para obtener el animal actual
window.getCurrentAnimal = () => {
    return currentAnimal;
};

// ==================== DETECCIÓN DE CLICKS Y PLN ====================

let currentSessionId = 'realtime';

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

// Función para mostrar descripción PLN
async function showAnimalDescription(animal, confidence, sessionId = '') {
    try {
        // Guardar el animal seleccionado para el chatbot
        window.setCurrentAnimal(animal);

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
            const modalAnimalName = document.getElementById('modalAnimalName');
            const modalScientificName = document.getElementById('modalScientificName');
            const modalDescription = document.getElementById('modalDescription');
            const modalHabitat = document.getElementById('modalHabitat');
            const modalUses = document.getElementById('modalUses');
            const modalConfidence = document.getElementById('modalConfidence');
            const modalCharacteristics = document.getElementById('modalCharacteristics');

            if (modalAnimalName) modalAnimalName.textContent = animal.charAt(0).toUpperCase() + animal.slice(1);
            if (modalScientificName) modalScientificName.textContent = desc.nombre_cientifico || 'No disponible';
            if (modalDescription) modalDescription.textContent = desc.descripcion || 'Descripción no disponible';
            if (modalHabitat) modalHabitat.textContent = desc.habitat || 'No disponible';
            if (modalUses) modalUses.textContent = desc.usos || 'No disponible';
            if (modalConfidence) modalConfidence.textContent = `Confianza: ${(confidence * 100).toFixed(1)}%`;

            // Llenar características modal
            if (modalCharacteristics) {
                modalCharacteristics.innerHTML = '';
                if (desc.caracteristicas && Array.isArray(desc.caracteristicas)) {
                    desc.caracteristicas.forEach(char => {
                        const li = document.createElement('li');
                        li.textContent = char;
                        modalCharacteristics.appendChild(li);
                    });
                }
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

            // Imagen sugerida
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
            const modal = document.getElementById('animalModal');
            if (modal) modal.style.display = 'block';

            // El usuario escribe su propia pregunta en el chatbot
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

    // Ajustar canvas al tamaño mostrado
    const rect = mediaEl.getBoundingClientRect();
    canvasEl.width = rect.width;
    canvasEl.height = rect.height;

    // Limpiar canvas
    const ctx = canvasEl.getContext('2d');
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

    if (!detectionData || !detectionData.detections || detectionData.detections.length === 0) {
        return;
    }

    const imgW = detectionData.width || mediaEl.videoWidth || mediaEl.naturalWidth || rect.width;
    const imgH = detectionData.height || mediaEl.videoHeight || mediaEl.naturalHeight || rect.height;
    if (!imgW || !imgH) return;
    const scaleX = rect.width / imgW;
    const scaleY = rect.height / imgH;

    // Almacenar detecciones escaladas para uso en clicks
    if (!window._videoDetectionsCache) window._videoDetectionsCache = {};
    window._videoDetectionsCache[sessionId] = detectionData.detections.map(det => ({
        ...det,
        scaledBbox: {
            x1: det.bbox.x1 * scaleX,
            y1: det.bbox.y1 * scaleY,
            x2: det.bbox.x2 * scaleX,
            y2: det.bbox.y2 * scaleY
        }
    }));

    // Dibujar overlay visible para videos e imágenes
    ctx.lineWidth = 2;
    ctx.font = '14px Segoe UI';

    detectionData.detections.forEach(det => {
        const { bbox, class: cls, confidence } = det;
        const x = bbox.x1 * scaleX;
        const y = bbox.y1 * scaleY;
        const w = (bbox.x2 - bbox.x1) * scaleX;
        const h = (bbox.y2 - bbox.y1) * scaleY;
        ctx.strokeStyle = '#2b6cb0';
        ctx.fillStyle = 'rgba(43, 108, 176, 0.15)';
        ctx.strokeRect(x, y, w, h);
        ctx.fillRect(x, y, w, h);

        const label = `${cls} ${(confidence * 100).toFixed(1)}%`;
        ctx.fillStyle = '#2b6cb0';
        ctx.strokeStyle = '#2b6cb0';
        ctx.lineWidth = 1;
        const textWidth = ctx.measureText(label).width + 10;
        const labelHeight = 18;
        ctx.fillRect(x, y - labelHeight, textWidth, labelHeight);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(label, x + 4, y - 5);
    });
}

// ==================== CHATBOT ====================
function initChatbot(btnId, questionId, answerId) {
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
                body: JSON.stringify({
                    question: q,
                    animal: window.getCurrentAnimal()
                })
            });
            const data = await resp.json();
            if (resp.ok && data.answer) {
                answerEl.textContent = data.answer;
            } else {
                answerEl.textContent = data.error || 'No se obtuvo respuesta.';
                if (data.detail) {
                    answerEl.textContent += '\n\nDetalle: ' + data.detail;
                }
            }
        } catch (e) {
            answerEl.textContent = 'Error de red al consultar.';
        }
    });
}

// ==================== MODAL ====================
document.addEventListener('DOMContentLoaded', () => {
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
});
