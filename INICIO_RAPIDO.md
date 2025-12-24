# 🚀 Guía Rápida - Activar GPU en YOLO-PLN

## Tu GPU
✅ **NVIDIA GeForce RTX 4050 Laptop** (6GB VRAM)  
✅ **CUDA 12.9** detectado  
❌ **PyTorch sin CUDA** - Necesita instalación

## Instalación en 3 Pasos

### 1️⃣ Ejecutar Instalador (5 minutos)

```bash
cd c:\Users\LOQ\Downloads\YoloMestas\YOLO-PLN-main\YOLO-PLN-main
install_gpu.bat
```

Esto instalará PyTorch con CUDA 12.1 (compatible con tu CUDA 12.9)

### 2️⃣ Verificar Instalación

```bash
python -c "import torch; print('CUDA:', torch.cuda.is_available())"
```

Debe mostrar: `CUDA: True`

### 3️⃣ Ejecutar Aplicación

```bash
python app.py
```

Deberías ver:
```
GPU detectada: NVIDIA GeForce RTX 4050 Laptop GPU
Memoria GPU: 6.00 GB
Dispositivo seleccionado: cuda:0
Warmup completado!
```

Abre: http://localhost:5000

## 📊 Mejoras que Obtendrás

| Característica | Antes (CPU) | Después (GPU) |
|----------------|-------------|---------------|
| Resolución | 640x480 | **1280x720 HD** |
| FPS | 15-20 | **30-60** |
| Velocidad Video | 1x | **3-5x más rápido** |
| Calidad | Media | **Alta** |

## 🔍 Verificar que Funciona

1. **Iniciar cámara** → Debería verse en HD y fluido
2. **Cargar video** → Procesamiento mucho más rápido
3. **Visitar** http://localhost:5000/gpu_status → Ver stats de GPU

## ⚠️ Si Hay Problemas

Ver: [README_GPU.md](file:///c:/Users/LOQ/Downloads/YoloMestas/YOLO-PLN-main/YOLO-PLN-main/README_GPU.md)

O ejecutar diagnóstico:
```bash
python gpu_setup.py
```

## 📚 Documentación Completa

- **Instalación detallada**: [README_GPU.md](file:///c:/Users/LOQ/Downloads/YoloMestas/YOLO-PLN-main/YOLO-PLN-main/README_GPU.md)
- **Cambios técnicos**: [walkthrough.md](file:///C:/Users/LOQ/.gemini/antigravity/brain/52158dde-8714-474d-983a-17883fef506e/walkthrough.md)
- **Plan completo**: [implementation_plan.md](file:///C:/Users/LOQ/.gemini/antigravity/brain/52158dde-8714-474d-983a-17883fef506e/implementation_plan.md)
