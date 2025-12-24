# Guía de Configuración GPU para YOLO-PLN

## 🎯 Resumen

Este proyecto detecta animales andinos usando YOLO 11. Con GPU NVIDIA, obtendrás **3-5x mejor rendimiento** que en CPU.

## 📋 Requisitos

### Hardware
- **GPU NVIDIA** con soporte CUDA (GTX 1050 o superior)
- Mínimo 4GB VRAM (recomendado 6GB+)
- Tu RTX 4050 Laptop (6GB VRAM) es perfecta ✅

### Software
- Windows 10/11
- Python 3.8 - 3.11
- Drivers NVIDIA actualizados
- CUDA 11.8 o 12.x (compatible con tu CUDA 12.9)

## 🚀 Instalación Rápida

### Paso 1: Verificar GPU

```bash
nvidia-smi
```

Deberías ver información de tu GPU. Si no funciona, instala drivers desde: https://www.nvidia.com/Download/index.aspx

### Paso 2: Verificar Configuración Actual

```bash
cd c:\Users\LOQ\Downloads\YoloMestas\YOLO-PLN-main\YOLO-PLN-main
python gpu_setup.py
```

Este script te dirá exactamente qué necesitas instalar.

### Paso 3: Instalar PyTorch con CUDA

**Opción A - Instalación Completa (Recomendado)**

```bash
pip uninstall torch torchvision torchaudio -y
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
```

**Opción B - Usar requirements-gpu.txt**

```bash
pip install -r requirements-gpu.txt
```

### Paso 4: Verificar Instalación

```bash
python -c "import torch; print(f'CUDA disponible: {torch.cuda.is_available()}'); print(f'GPU: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else \"N/A\"}')"
```

Debería mostrar:
```
CUDA disponible: True
GPU: NVIDIA GeForce RTX 4050 Laptop GPU
```

### Paso 5: Ejecutar Aplicación

```bash
python app.py
```

Abre tu navegador en: http://localhost:5000

## 📊 Mejoras de Rendimiento

### Con GPU (RTX 4050)
- ✅ **Resolución**: 1280x720 (HD)
- ✅ **FPS Tiempo Real**: 30-60 FPS
- ✅ **Procesamiento Video**: 3-5x más rápido
- ✅ **Precisión FP16**: Activada
- ✅ **Detecciones simultáneas**: Hasta 300

### Sin GPU (CPU)
- ⚠️ **Resolución**: 640x480
- ⚠️ **FPS Tiempo Real**: 15-20 FPS
- ⚠️ **Procesamiento Video**: Velocidad base
- ⚠️ **Precisión**: FP32
- ⚠️ **Detecciones simultáneas**: Hasta 100

## 🔧 Solución de Problemas

### "CUDA no disponible" después de instalar PyTorch

1. Verifica que instalaste la versión CUDA:
```bash
python -c "import torch; print(torch.__version__)"
```
Debe mostrar algo como: `2.1.0+cu121`

2. Si muestra solo `2.1.0` (sin `+cu121`), reinstala:
```bash
pip uninstall torch torchvision torchaudio -y
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
```

### Error de memoria GPU

Si ves errores de "out of memory":

1. Cierra otras aplicaciones que usen GPU
2. Reduce la resolución editando `app.py`:
```python
# Línea ~213, cambiar:
target_width, target_height = 1280, 720
# Por:
target_width, target_height = 960, 540
```

### Drivers NVIDIA desactualizados

1. Descarga drivers desde: https://www.nvidia.com/Download/index.aspx
2. Selecciona:
   - Product Type: GeForce
   - Product Series: RTX 40 Series (Notebooks)
   - Product: GeForce RTX 4050 Laptop GPU
   - Operating System: Windows 11
3. Instala y reinicia

### PyTorch no encuentra CUDA 12.9

CUDA 12.1 es compatible con CUDA 12.9. No necesitas instalar CUDA por separado, PyTorch incluye las bibliotecas necesarias.

## 📈 Monitoreo de Rendimiento

### Ver Estado de GPU en Tiempo Real

Abre en tu navegador mientras la app está corriendo:
- Estado GPU: http://localhost:5000/gpu_status
- Métricas: http://localhost:5000/performance_metrics

### Instalar Herramientas de Monitoreo (Opcional)

```bash
pip install nvidia-ml-py3 psutil
```

Esto añade métricas adicionales:
- Temperatura GPU
- Consumo de energía
- Utilización de GPU/Memoria
- Stats de CPU

## 🎮 Uso Optimizado

### Detección en Tiempo Real
1. Abre http://localhost:5000
2. Click en "Iniciar Cámara"
3. Con GPU verás:
   - Resolución HD (1280x720)
   - 30-60 FPS
   - Detecciones más precisas

### Procesamiento de Video
1. Ve a pestaña "Cargar Video"
2. Arrastra un video
3. Con GPU:
   - Procesamiento 3-5x más rápido
   - Máxima calidad de detección
   - Progreso en tiempo real

## 🔍 Verificar que GPU se está Usando

Mientras la app está corriendo, abre otra terminal:

```bash
nvidia-smi
```

Deberías ver `python.exe` usando GPU con memoria asignada.

## 📝 Notas Adicionales

### Versiones Compatibles
- **PyTorch**: 2.0.0 o superior
- **CUDA**: 11.8 o 12.x
- **Python**: 3.8 - 3.11 (Python 3.12+ puede tener problemas)

### Optimizaciones Implementadas
- ✅ Detección automática de GPU
- ✅ Warmup de modelo en GPU
- ✅ Precisión mixta (FP16) en CUDA
- ✅ Parámetros optimizados por dispositivo
- ✅ Gestión eficiente de memoria GPU
- ✅ Endpoints de monitoreo

### Próximas Mejoras
- [ ] Batch processing para videos
- [ ] Configuración de calidad/velocidad ajustable
- [ ] Dashboard de métricas en frontend
- [ ] Soporte para múltiples GPUs

## 🆘 Soporte

Si tienes problemas:

1. Ejecuta `python gpu_setup.py` y comparte la salida
2. Verifica `nvidia-smi` funciona
3. Confirma versión de PyTorch: `python -c "import torch; print(torch.__version__)"`

## 📚 Referencias

- [PyTorch CUDA Installation](https://pytorch.org/get-started/locally/)
- [NVIDIA Drivers](https://www.nvidia.com/Download/index.aspx)
- [Ultralytics YOLO](https://docs.ultralytics.com/)
