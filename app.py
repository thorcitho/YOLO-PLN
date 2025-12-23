from flask import Flask, render_template, Response, request, jsonify
from ultralytics import YOLO
import cv2
import os
from datetime import datetime
import threading
import torch
import json
import uuid
import time
import requests

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'static/uploads'
app.config['OUTPUT_FOLDER'] = 'detected'
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100MB max
HISTORY_FILE = 'history.json'

# Crear carpetas si no existen
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['OUTPUT_FOLDER'], exist_ok=True)

# Detectar dispositivo automáticamente
def get_device():
    """Detecta automáticamente si hay GPU disponible"""
    if torch.cuda.is_available():
        return 'cuda:0'
    elif hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
        return 'mps'  # Apple Silicon
    else:
        return 'cpu'

DEVICE = get_device()
print(f"Dispositivo detectado: {DEVICE}")

# Cargar modelo YOLO
print("Cargando modelo YOLO...")
try:
    model = YOLO('models/best.pt')
    print("Modelo cargado exitosamente!")
except Exception as e:
    print(f"Error al cargar el modelo: {e}")
    model = None

# Variables globales para webcam
camera = None
camera_active = False
lock = threading.Lock()

# Estado de procesamiento de video
video_processing_status = {}
status_lock = threading.Lock()

# Almacenamiento de frames procesados para streaming en tiempo real
video_frames_cache = {}  # {filename: [frame1, frame2, ...]}
frames_cache_lock = threading.Lock()

# Almacenamiento de detecciones con coordenadas para interacción
detections_cache = {}  # {session_id: {'detections': [...], 'timestamp': ..., 'width': ..., 'height': ...}}
detections_lock = threading.Lock()
detections_frames_cache = {}  # {session_id: [{'frame': int, 'detections': [...], 'width': w, 'height': h}]}
detections_frames_lock = threading.Lock()

# ==================== HISTORIAL ====================
history_lock = threading.Lock()


def load_history():
    """Carga historial desde archivo"""
    if not os.path.exists(HISTORY_FILE):
        return []
    try:
        with open(HISTORY_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return []


def save_history(history):
    """Guarda historial en archivo"""
    try:
        with open(HISTORY_FILE, 'w', encoding='utf-8') as f:
            json.dump(history, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"Error al guardar historial: {e}")


def get_history_entry(filename):
    history = load_history()
    for h in history:
        if h.get('output_filename') == filename:
            return h
    return None


def upsert_history(entry):
    """Agrega o actualiza una entrada del historial"""
    with history_lock:
        history = load_history()
        # Reemplazar si existe mismo filename
        history = [h for h in history if h.get('output_filename') != entry.get('output_filename')]
        history.append(entry)
        # Ordenar por fecha descendente
        history = sorted(history, key=lambda x: x.get('created_at', ''), reverse=True)
        save_history(history)


def update_history_progress(output_filename, progress=None, status=None):
    with history_lock:
        history = load_history()
        updated = False
        for h in history:
            if h.get('output_filename') == output_filename:
                if progress is not None:
                    h['progress'] = progress
                if status is not None:
                    h['status'] = status
                updated = True
                break
        if updated:
            save_history(history)


def update_history_meta(output_filename, **kwargs):
    """Actualiza metadatos (fps, width, height) del historial"""
    with history_lock:
        history = load_history()
        updated = False
        for h in history:
            if h.get('output_filename') == output_filename:
                for k, v in kwargs.items():
                    h[k] = v
                updated = True
                break
        if updated:
            save_history(history)


def update_history_detections(output_filename, detections, width, height):
    with history_lock:
        history = load_history()
        updated = False
        for h in history:
            if h.get('output_filename') == output_filename:
                h['detections'] = detections
                h['width'] = width
                h['height'] = height
                updated = True
                break
        if updated:
            save_history(history)

# Base de conocimiento PLN para animales andinos
ANIMAL_DESCRIPTIONS = {
    'alpaca': {
        'nombre_cientifico': 'Vicugna pacos',
        'descripcion': 'La alpaca es un mamífero doméstico de la familia de los camélidos, nativa de los Andes. Se caracteriza por su lana suave y valiosa, utilizada en la producción textil. Las alpacas son animales sociales que viven en rebaños y se alimentan principalmente de pastos. Su lana es más fina que la de las llamas y viene en más de 22 colores naturales.',
        'habitat': 'Regiones andinas entre 3,500 y 5,000 metros sobre el nivel del mar',
        'caracteristicas': ['Lana suave y valiosa', 'Tamaño mediano', 'Cuello largo', 'Orejas puntiagudas', 'Cola corta'],
        'usos': 'Producción de lana para textiles, carne, y turismo'
    },
    'llama': {
        'nombre_cientifico': 'Lama glama',
        'descripcion': 'La llama es el animal más grande de la familia de los camélidos sudamericanos. Fue domesticada hace más de 4,000 años y ha sido fundamental para las culturas andinas. Se utiliza como animal de carga, para producción de lana, carne y abono. Las llamas son animales inteligentes y curiosos, conocidos por su comportamiento territorial.',
        'habitat': 'Altiplano andino entre 2,300 y 4,000 metros sobre el nivel del mar',
        'caracteristicas': ['Tamaño grande', 'Cuello largo y delgado', 'Orejas largas y curvas', 'Lana gruesa', 'Patas largas'],
        'usos': 'Transporte de carga, producción de lana y carne, turismo'
    },
    'cuy': {
        'nombre_cientifico': 'Cavia porcellus',
        'descripcion': 'El cuy, también conocido como cobayo o conejillo de indias, es un roedor doméstico originario de los Andes. Es una fuente importante de proteína en la dieta andina y se consume tradicionalmente en ocasiones especiales. Los cuyes son animales sociales, activos principalmente durante el crepúsculo y la noche.',
        'habitat': 'Regiones andinas, desde nivel del mar hasta 4,200 metros',
        'caracteristicas': ['Tamaño pequeño', 'Cuerpo robusto', 'Sin cola visible', 'Pelaje denso', 'Orejas pequeñas'],
        'usos': 'Consumo humano (carne rica en proteínas), mascota, investigación científica'
    },
    'oveja': {
        'nombre_cientifico': 'Ovis aries',
        'descripcion': 'La oveja es un mamífero rumiante domesticado ampliamente distribuido en los Andes. Se adapta bien a diferentes altitudes y climas. Su lana es utilizada para la producción textil y su carne es una fuente importante de proteína. Las ovejas son animales gregarios que prefieren vivir en rebaños.',
        'habitat': 'Diversas altitudes, desde valles hasta zonas altoandinas',
        'caracteristicas': ['Lana espesa', 'Cuernos (en machos)', 'Cuerpo robusto', 'Cola corta', 'Patas fuertes'],
        'usos': 'Producción de lana, carne, leche y abono'
    },
    'vaca': {
        'nombre_cientifico': 'Bos taurus',
        'descripcion': 'La vaca es un mamífero rumiante de gran tamaño, fundamental en la ganadería andina. Proporciona leche, carne y trabajo agrícola. Las vacas andinas se han adaptado a las condiciones de altura y son resistentes a las bajas temperaturas. Son animales sociales que forman grupos jerárquicos.',
        'habitat': 'Valles y zonas altoandinas hasta 4,500 metros sobre el nivel del mar',
        'caracteristicas': ['Tamaño grande', 'Cuernos', 'Ubre desarrollada', 'Pelaje corto a largo', 'Cola larga'],
        'usos': 'Producción de leche, carne, trabajo agrícola y abono'
    }
}

@app.route('/')
def index():
    """Página principal"""
    return render_template('index.html')

# ==================== DETECCIÓN EN TIEMPO REAL ====================

def generate_frames():
    """Genera frames optimizados para YOLO 11 en CPU"""
    global camera, camera_active
    
    # Configuración optimizada según dispositivo
    if DEVICE == 'cpu':
        # Para CPU: resolución muy baja y procesar menos frames
        target_width, target_height = 416, 416  # Resolución más pequeña para CPU
        frame_skip_ratio = 4  # Procesar 1 de cada 4 frames
        imgsz = 416  # Tamaño de imagen para YOLO (más pequeño = más rápido)
        conf_threshold = 0.4  # Threshold más bajo para menos procesamiento
    else:
        # Para GPU: máxima calidad y rendimiento
        target_width, target_height = 1280, 720  # Resolución HD para GPU
        frame_skip_ratio = 1  # Procesar todos los frames en GPU
        imgsz = 1280  # Tamaño completo para mejor detección
        conf_threshold = 0.5
    
    with lock:
        if camera is None:
            camera = cv2.VideoCapture(0)
            # Configurar cámara con resolución optimizada
            camera.set(cv2.CAP_PROP_FRAME_WIDTH, target_width)
            camera.set(cv2.CAP_PROP_FRAME_HEIGHT, target_height)
            camera.set(cv2.CAP_PROP_FPS, 30 if DEVICE != 'cpu' else 15)  # 30 FPS en GPU, 15 en CPU
            # Buffer mínimo para menos latencia
            camera.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        camera_active = True
    
    frame_skip = 0
    last_results = None  # Cache para frames saltados
    
    while camera_active:
        success, frame = camera.read()
        if not success:
            break
        
        # Redimensionar frame para procesamiento más rápido
        if frame.shape[1] != target_width or frame.shape[0] != target_height:
            frame = cv2.resize(frame, (target_width, target_height), interpolation=cv2.INTER_LINEAR)
        
        # Skip frames para mayor velocidad
        frame_skip += 1
        should_process = (frame_skip % frame_skip_ratio == 0)
        
        if should_process:
            # Detección YOLO 11 (optimizada)
            if model is None:
                continue
            try:
                # YOLO 11 optimizado según dispositivo
                results = model(
                    frame,
                    imgsz=imgsz,
                    conf=conf_threshold,
                    iou=0.7 if DEVICE != 'cpu' else 0.45,  # Mejor IOU en GPU
                    verbose=False,
                    half=(DEVICE != 'cpu'),  # FP16 solo en GPU
                    device=DEVICE,
                    max_det=300 if DEVICE != 'cpu' else 50,  # Más detecciones en GPU
                    agnostic_nms=False,
                    retina_masks=False
                )
                last_results = results[0]
                annotated_frame = last_results.plot()
                
                # Almacenar detecciones con coordenadas para interacción
                detections = []
                if last_results.boxes is not None:
                    boxes = last_results.boxes
                    for i in range(len(boxes)):
                        box = boxes.xyxy[i].cpu().numpy()  # [x1, y1, x2, y2]
                        cls = int(boxes.cls[i].cpu().numpy())
                        conf = float(boxes.conf[i].cpu().numpy())
                        class_name = model.names[cls]
                        
                        detections.append({
                            'class': class_name,
                            'confidence': round(conf, 2),
                            'bbox': {
                                'x1': float(box[0]),
                                'y1': float(box[1]),
                                'x2': float(box[2]),
                                'y2': float(box[3])
                            }
                        })
                
                # Almacenar detecciones en cache (usar 'realtime' como session_id)
                with detections_lock:
                    detections_cache['realtime'] = {
                        'detections': detections,
                        'timestamp': time.time(),
                        'width': target_width,
                        'height': target_height
                    }
            except Exception as e:
                print(f"Error en detección: {e}")
                annotated_frame = frame
        else:
            # Reutilizar detecciones anteriores para frames saltados
            if last_results is not None:
                annotated_frame = last_results.plot()
            else:
                annotated_frame = frame
        
        # Comprimir más agresivamente para CPU
        quality = 60 if DEVICE == 'cpu' else 75
        encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), quality]
        ret, buffer = cv2.imencode('.jpg', annotated_frame, encode_param)
        
        if ret:
            frame_bytes = buffer.tobytes()
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

@app.route('/video_feed')
def video_feed():
    """Stream de video en tiempo real"""
    return Response(generate_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/start_camera', methods=['POST'])
def start_camera():
    """Iniciar cámara"""
    global camera_active
    camera_active = True
    return jsonify({'status': 'Camera started'})

@app.route('/stop_camera', methods=['POST'])
def stop_camera():
    """Detener cámara"""
    global camera, camera_active
    camera_active = False
    
    with lock:
        if camera is not None:
            camera.release()
            camera = None
    
    return jsonify({'status': 'Camera stopped'})

# ==================== DETECCIÓN EN VIDEO ====================

@app.route('/upload_video', methods=['POST'])
def upload_video():
    """Subir y procesar video"""
    if model is None:
        return jsonify({'error': 'Modelo YOLO no está cargado'}), 500
    
    if 'video' not in request.files:
        return jsonify({'error': 'No se envió ningún video'}), 400
    
    file = request.files['video']
    if file.filename == '':
        return jsonify({'error': 'Archivo vacío'}), 400
    
    # Validar extensión
    allowed_extensions = {'.mp4', '.avi', '.mov', '.mkv', '.webm'}
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in allowed_extensions:
        return jsonify({'error': f'Formato no soportado. Use: {", ".join(allowed_extensions)}'}), 400
    
    # Guardar video original
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f"video_{timestamp}{file_ext}"
    video_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    
    try:
        file.save(video_path)
    except Exception as e:
        return jsonify({'error': f'Error al guardar video: {str(e)}'}), 500
    
    # Verificar que el video se puede leer
    test_cap = cv2.VideoCapture(video_path)
    if not test_cap.isOpened():
        test_cap.release()
        os.remove(video_path)
        return jsonify({'error': 'El archivo de video no es válido o está corrupto'}), 400
    
    fps = test_cap.get(cv2.CAP_PROP_FPS)
    frame_count = int(test_cap.get(cv2.CAP_PROP_FRAME_COUNT))
    test_cap.release()
    
    if fps <= 0 or frame_count <= 0:
        os.remove(video_path)
        return jsonify({'error': 'El video no tiene frames válidos'}), 400
    
    # Procesar video en segundo plano
    output_filename = f"detected_{timestamp}.mp4"
    output_path = os.path.join(app.config['OUTPUT_FOLDER'], output_filename)
    
    # Inicializar estado de procesamiento y cache de frames
    with status_lock:
        video_processing_status[output_filename] = {
            'status': 'processing',
            'progress': 0,
            'total_frames': frame_count,
            'processed_frames': 0
        }
    
    with frames_cache_lock:
        video_frames_cache[output_filename] = []
    
    # Guardar en historial
    entry = {
        'original_filename': file.filename,
        'output_filename': output_filename,
        'created_at': timestamp,
        'status': 'processing',
        'progress': 0,
        'url': f'/detected/{output_filename}'
    }
    upsert_history(entry)

    # Iniciar procesamiento en hilo separado
    thread = threading.Thread(target=process_video, args=(video_path, output_path, output_filename))
    thread.daemon = True
    thread.start()
    
    return jsonify({
        'status': 'processing',
        'message': 'Video en procesamiento',
        'output_filename': output_filename,
        'total_frames': frame_count,
        'stream_url': f'/video_stream/{output_filename}'
    })

def process_video(input_path, output_path, output_filename):
    """Procesa video con YOLO de forma optimizada"""
    cap = None
    out = None
    last_detections = []
    last_width = 0
    last_height = 0
    last_nonempty_detections = []
    last_nonempty_width = 0
    last_nonempty_height = 0
    sample_step = 3  # guardar detecciones cada 3 frames para overlay dinámico
    
    try:
        cap = cv2.VideoCapture(input_path)
        
        if not cap.isOpened():
            raise ValueError("No se pudo abrir el video de entrada")
        
        # Propiedades del video
        fps = cap.get(cv2.CAP_PROP_FPS)
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        update_history_meta(output_filename, fps=fps, width=width, height=height)
        
        # Validar propiedades
        if fps <= 0:
            fps = 30.0  # FPS por defecto
        if width <= 0 or height <= 0:
            raise ValueError("Dimensiones de video inválidas")
        
        # Redimensionar si el video es muy grande (optimización)
        max_dimension = 1280
        if width > max_dimension or height > max_dimension:
            scale = max_dimension / max(width, height)
            width = int(width * scale)
            height = int(height * scale)
            print(f"Redimensionando video a {width}x{height} para optimización")
        
        # Codec más compatible (H.264)
        fourcc = cv2.VideoWriter_fourcc(*'avc1')  # H.264
        # Si avc1 no funciona, intentar con mp4v
        out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
        
        # Verificar que el writer funciona
        if not out.isOpened():
            # Intentar con codec alternativo
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
            if not out.isOpened():
                raise ValueError("No se pudo crear el video de salida")
        
        print(f"Procesando video: {total_frames} frames a {fps} FPS, tamaño: {width}x{height}")
        
        frame_count = 0
        skip_frames = 0  # Procesar todos los frames para análisis completo
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            # Redimensionar frame si es necesario
            if frame.shape[1] != width or frame.shape[0] != height:
                frame = cv2.resize(frame, (width, height))
            
            # Detección YOLO optimizada según dispositivo
            try:
                # Reducir tamaño para acelerar en GPUs medias
                imgsz = 960 if DEVICE != 'cpu' else 640
                results = model(
                    frame,
                    imgsz=imgsz,
                    conf=0.45,
                    iou=0.6 if DEVICE != 'cpu' else 0.45,
                    verbose=False,
                    device=DEVICE,
                    half=(DEVICE != 'cpu'),
                    max_det=150 if DEVICE != 'cpu' else 80
                )
                annotated_frame = results[0].plot()
                
                # Almacenar detecciones con coordenadas para interacción
                detections = []
                if results[0].boxes is not None:
                    boxes = results[0].boxes
                    for i in range(len(boxes)):
                        box = boxes.xyxy[i].cpu().numpy()  # [x1, y1, x2, y2]
                        cls = int(boxes.cls[i].cpu().numpy())
                        conf = float(boxes.conf[i].cpu().numpy())
                        class_name = model.names[cls]
                        
                        detections.append({
                            'class': class_name,
                            'confidence': round(conf, 2),
                            'bbox': {
                                'x1': float(box[0]),
                                'y1': float(box[1]),
                                'x2': float(box[2]),
                                'y2': float(box[3])
                            }
                        })
                last_detections = detections
                last_width = width
                last_height = height
                if detections:
                    last_nonempty_detections = detections
                    last_nonempty_width = width
                    last_nonempty_height = height
                
                # Guardar detecciones por frame para overlay dinámico
                if frame_count % sample_step == 0:
                    with detections_frames_lock:
                        frames_list = detections_frames_cache.setdefault(output_filename, [])
                        frames_list.append({
                            'frame': frame_count,
                            'detections': detections,
                            'width': width,
                            'height': height
                        })
                        # Limitar memoria
                        if len(frames_list) > 2000:
                            frames_list.pop(0)

                # Almacenar detecciones en cache para este video
                with detections_lock:
                    detections_cache[output_filename] = {
                        'detections': detections,
                        'timestamp': time.time(),
                        'width': width,
                        'height': height
                    }
            except Exception as e:
                print(f"Error en detección frame {frame_count}: {e}")
                annotated_frame = frame  # Usar frame original si falla la detección
            
            # Escribir frame al video
            out.write(annotated_frame)
            
            # Almacenar frame procesado para streaming en tiempo real
            encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), 85]
            ret, buffer = cv2.imencode('.jpg', annotated_frame, encode_param)
            if ret:
                with frames_cache_lock:
                    if output_filename in video_frames_cache:
                        video_frames_cache[output_filename].append(buffer.tobytes())
                        # Limitar cache a últimos 100 frames para no consumir mucha memoria
                        if len(video_frames_cache[output_filename]) > 100:
                            video_frames_cache[output_filename].pop(0)
            
            frame_count += 1
            
            # Actualizar progreso
            with status_lock:
                if output_filename in video_processing_status:
                    video_processing_status[output_filename]['processed_frames'] = frame_count
                    video_processing_status[output_filename]['progress'] = int((frame_count / total_frames) * 100)
                    update_history_progress(output_filename, video_processing_status[output_filename]['progress'])
            
            # Log cada 30 frames o cada 10%
            if frame_count % max(30, total_frames // 10) == 0:
                progress = (frame_count / total_frames) * 100
                print(f"Procesado: {frame_count}/{total_frames} frames ({progress:.1f}%)")
        
        # Marcar como completado
        with status_lock:
            if output_filename in video_processing_status:
                video_processing_status[output_filename]['status'] = 'completed'
                video_processing_status[output_filename]['progress'] = 100
        update_history_progress(output_filename, 100, 'completed')
        # Guardar últimas detecciones en historial para reutilizar en videos ya listos
        if last_nonempty_detections:
            update_history_detections(output_filename, last_nonempty_detections, last_nonempty_width, last_nonempty_height)
        elif last_detections or last_width or last_height:
            # Al menos guardar lo último aunque esté vacío, para tener dimensiones
            update_history_detections(output_filename, last_detections, last_width, last_height)
        
        # Limpiar cache después de un tiempo (dejar algunos frames para el stream final)
        import time
        time.sleep(2)  # Esperar para que el stream termine
        with frames_cache_lock:
            if output_filename in video_frames_cache:
                # Mantener solo los últimos 10 frames
                if len(video_frames_cache[output_filename]) > 10:
                    video_frames_cache[output_filename] = video_frames_cache[output_filename][-10:]
        
        print(f"✅ Video procesado exitosamente: {output_path}")
        
    except Exception as e:
        print(f"❌ Error al procesar video: {e}")
        with status_lock:
            if output_filename in video_processing_status:
                video_processing_status[output_filename]['status'] = 'error'
                video_processing_status[output_filename]['error'] = str(e)
        
        # Eliminar archivo de salida si existe y está corrupto
        if os.path.exists(output_path):
            try:
                os.remove(output_path)
            except:
                pass
    
    finally:
        # Liberar recursos
        if cap is not None:
            cap.release()
        if out is not None:
            out.release()

@app.route('/check_video/<filename>')
def check_video(filename):
    """Verificar si el video procesado está listo"""
    output_path = os.path.join(app.config['OUTPUT_FOLDER'], filename)
    
    with status_lock:
        status_info = video_processing_status.get(filename, {})
    
    if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
        # Verificar que el archivo esté completamente escrito
        status = status_info.get('status', 'unknown')
        if status == 'completed':
            meta = get_history_entry(filename) or {}
            return jsonify({
                'ready': True,
                'url': f'/detected/{filename}',
                'status': 'completed',
                'fps': meta.get('fps'),
                'width': meta.get('width'),
                'height': meta.get('height')
            })
        elif status == 'error':
            return jsonify({
                'ready': False,
                'status': 'error',
                'error': status_info.get('error', 'Error desconocido')
            })
    
    # Retornar progreso si está procesando
    if status_info:
        update_history_progress(filename, status_info.get('progress', 0), status_info.get('status', 'processing'))
        return jsonify({
            'ready': False,
            'status': status_info.get('status', 'processing'),
            'progress': status_info.get('progress', 0),
            'processed_frames': status_info.get('processed_frames', 0),
            'total_frames': status_info.get('total_frames', 0)
        })
    
    return jsonify({'ready': False, 'status': 'processing'})

@app.route('/detected/<filename>')
def serve_video(filename):
    """Servir video procesado"""
    from flask import send_from_directory
    return send_from_directory(app.config['OUTPUT_FOLDER'], filename)

@app.route('/video_stream/<filename>')
def video_stream(filename):
    """Stream de frames procesados en tiempo real"""
    def generate():
        last_frame_index = -1
        import time
        
        while True:
            with frames_cache_lock:
                frames = video_frames_cache.get(filename, [])
            
            with status_lock:
                status_info = video_processing_status.get(filename, {})
                status = status_info.get('status', 'processing')
            
            # Si hay frames nuevos, enviarlos
            if len(frames) > last_frame_index + 1:
                # Enviar todos los frames nuevos
                for i in range(last_frame_index + 1, len(frames)):
                    frame_bytes = frames[i]
                    yield (b'--frame\r\n'
                           b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
                last_frame_index = len(frames) - 1
            
            # Si terminó el procesamiento
            if status == 'completed':
                # Enviar último frame si existe
                if frames and last_frame_index < len(frames) - 1:
                    yield (b'--frame\r\n'
                           b'Content-Type: image/jpeg\r\n\r\n' + frames[-1] + b'\r\n')
                break
            elif status == 'error':
                # Si hay error, enviar último frame disponible y cerrar
                if frames:
                    yield (b'--frame\r\n'
                           b'Content-Type: image/jpeg\r\n\r\n' + frames[-1] + b'\r\n')
                break
            
            # Esperar un poco antes de verificar de nuevo
            time.sleep(0.05)  # 50ms para ~20 FPS de actualización
    
    return Response(generate(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

# ==================== INFORMACIÓN DE CLASES ====================

@app.route('/get_classes')
def get_classes():
    """Obtener lista de clases del modelo"""
    classes = model.names
    return jsonify(classes)

@app.route('/history')
def get_history():
    """Obtener historial de videos procesados"""
    history = load_history()
    return jsonify(history)

@app.route('/get_detections/<session_id>')
def get_detections(session_id):
    """Obtener detecciones actuales para una sesión"""
    # Permite pedir por frame (para videos procesados)
    frame_query = request.args.get('frame', type=int)
    target_frame = frame_query if frame_query is not None else None

    with detections_lock:
        if session_id in detections_cache:
            cache_data = detections_cache[session_id]
            # Para sesiones de video procesado, mantener disponibilidad más tiempo
            max_age = 3600 if session_id != 'realtime' else 5
            if time.time() - cache_data['timestamp'] < max_age:
                # Si se solicita frame específico, buscar el más cercano en frames_cache
                if session_id != 'realtime' and target_frame is not None:
                    with detections_frames_lock:
                        frames_list = detections_frames_cache.get(session_id, [])
                    if frames_list:
                        # Buscar el frame más cercano
                        nearest = min(frames_list, key=lambda x: abs(x['frame'] - target_frame))
                        return jsonify({
                            'detections': nearest['detections'],
                            'width': nearest['width'],
                            'height': nearest['height']
                        })
                return jsonify({
                    'detections': cache_data['detections'],
                    'width': cache_data['width'],
                    'height': cache_data['height']
                })
    # Fallback a historial si el servidor se reinició
    if session_id != 'realtime':
        entry = get_history_entry(session_id)
        if entry and entry.get('detections'):
            # Si hay frame solicitado y lista de detecciones por frame en historial (no guardamos para no crecer)
            return jsonify({
                'detections': entry.get('detections', []),
                'width': entry.get('width', 0),
                'height': entry.get('height', 0)
            })
    return jsonify({'detections': [], 'width': 0, 'height': 0})

@app.route('/get_animal_description', methods=['POST'])
def get_animal_description():
    """Obtener descripción PLN de un animal"""
    data = request.json
    animal_name = data.get('animal', '').lower()
    
    if not animal_name:
        return jsonify({'error': 'Nombre de animal no proporcionado'}), 400
    
    # Buscar descripción en base de conocimiento
    if animal_name in ANIMAL_DESCRIPTIONS:
        description = ANIMAL_DESCRIPTIONS[animal_name]
        return jsonify({
            'animal': animal_name,
            'description': description,
            'found': True
        })
    
    # Si no se encuentra, generar descripción básica usando PLN
    # Aquí podrías integrar un modelo de lenguaje o API
    return jsonify({
        'animal': animal_name,
        'description': {
            'nombre_cientifico': 'Información no disponible',
            'descripcion': f'El {animal_name} es un animal andino detectado en la región. Para obtener más información específica, consulta fuentes especializadas en fauna andina.',
            'habitat': 'Regiones andinas',
            'caracteristicas': ['Animal andino', 'Adaptado a altitud'],
            'usos': 'Variados según la especie'
        },
        'found': False
    })


@app.route('/chatbot', methods=['POST'])
def chatbot():
    """Chat breve usando API Sonar Pro de Perplexity"""
    data = request.json or {}
    question = (data.get('question') or '').strip()
    if not question:
        return jsonify({'error': 'Pregunta vacía'}), 400

    api_key = os.getenv('SONAR_API_KEY')
    if not api_key:
        return jsonify({'error': 'Falta SONAR_API_KEY en variables de entorno'}), 500

    try:
        payload = {
            "model": "sonar-pro",
            "messages": [{"role": "user", "content": question}],
            "max_tokens": 160,
            "temperature": 0.4
        }
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        resp = requests.post(
            "https://api.perplexity.ai/chat/completions",
            json=payload,
            headers=headers,
            timeout=20
        )
        if resp.status_code != 200:
            return jsonify({'error': f'API error {resp.status_code}', 'detail': resp.text[:500]}), 502
        data = resp.json()
        content = data.get('choices', [{}])[0].get('message', {}).get('content', '').strip()
        if not content:
            content = 'No se recibió respuesta.'
        # Limitar longitud
        content = content[:1200]
        return jsonify({'answer': content})
    except Exception as e:
        return jsonify({'error': f'Fallo en chatbot: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000, threaded=True)
