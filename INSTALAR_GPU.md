# INSTALACIÓN DE GPU - GUÍA PASO A PASO

## 🎯 Problema Actual

Tu código está optimizado para GPU pero PyTorch no tiene CUDA instalado.

```
CUDA available: False  ❌
```

## ✅ Solución: Instalar PyTorch con CUDA

### Opción 1: Script Automático (RECOMENDADO)

Ejecuta el script que ya creamos:

```bash
install_gpu.bat
```

Este script hará:
1. Desinstalar PyTorch actual (sin CUDA)
2. Instalar PyTorch con CUDA 12.1 (compatible con tu CUDA 12.9)
3. Verificar instalación

### Opción 2: Manual

Si prefieres hacerlo manualmente:

```bash
# 1. Desinstalar PyTorch actual
pip uninstall torch torchvision torchaudio -y

# 2. Instalar PyTorch con CUDA 12.1
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

# 3. Verificar instalación
python -c "import torch; print('CUDA:', torch.cuda.is_available())"
```

## 📋 Verificación Paso a Paso

### 1. Antes de instalar

```bash
python -c "import torch; print(torch.__version__)"
```

Resultado actual: `2.x.x` (sin `+cu121`)

### 2. Ejecutar instalación

```bash
install_gpu.bat
```

O manualmente con los comandos de arriba.

### 3. Después de instalar

```bash
python -c "import torch; print(torch.__version__)"
```

Resultado esperado: `2.x.x+cu121` ✅

### 4. Verificar GPU

```bash
python -c "import torch; print('CUDA:', torch.cuda.is_available()); print('GPU:', torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'N/A')"
```

Resultado esperado:
```
CUDA: True
GPU: NVIDIA GeForce RTX 4050 Laptop GPU
```

### 5. Ejecutar aplicación

```bash
python app.py
```

Deberías ver:
```
GPU detectada: NVIDIA GeForce RTX 4050 Laptop GPU
Memoria GPU: 6.00 GB
Dispositivo seleccionado: cuda:0
Moviendo modelo a cuda:0...
Realizando warmup de GPU...
Warmup completado!
```

## ⏱️ Tiempo Estimado

- Desinstalación: 30 segundos
- Descarga: 2-5 minutos (depende de tu internet)
- Instalación: 1-2 minutos
- **Total: ~5-8 minutos**

## 🔍 Solución de Problemas

### Error: "Could not find a version that satisfies the requirement"

Verifica tu versión de Python:
```bash
python --version
```

Debe ser Python 3.8 - 3.11 (Python 3.12+ puede tener problemas)

### Error: "No module named 'torch'"

Reinstala:
```bash
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
```

### CUDA sigue en False después de instalar

1. Reinicia el terminal/IDE
2. Verifica que instalaste desde el índice correcto (`--index-url`)
3. Ejecuta: `pip show torch` y verifica que diga `+cu121` en la versión

## 📊 Mejoras que Obtendrás

Una vez instalado PyTorch con CUDA:

| Métrica | Antes (CPU) | Después (GPU) |
|---------|-------------|---------------|
| Resolución | 640x480 | **1280x720** |
| FPS Tiempo Real | 15-20 | **30-60** |
| Velocidad Video | 1x | **3-5x** |
| Calidad | Media | **Alta** |

## 🚀 Comando Rápido

Si solo quieres el comando más simple:

```bash
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
```

Luego ejecuta `python app.py` y listo!

## ✅ Checklist

- [ ] Ejecutar `install_gpu.bat` o comando manual
- [ ] Verificar `torch.__version__` contiene `+cu121`
- [ ] Verificar `torch.cuda.is_available()` es `True`
- [ ] Ejecutar `python app.py`
- [ ] Ver mensaje "GPU detectada: NVIDIA GeForce RTX 4050"
- [ ] Probar detección en tiempo real (debería ser más rápido)

---

**Nota**: El código ya está completamente optimizado para GPU. Solo falta instalar PyTorch con CUDA.
