"""
Script de diagnóstico y configuración de GPU para YOLO-PLN
Verifica la configuración de GPU y genera recomendaciones
"""

import sys
import subprocess
import platform

def check_nvidia_gpu():
    """Verifica si hay GPU NVIDIA disponible"""
    print("=" * 60)
    print("VERIFICACIÓN DE GPU NVIDIA")
    print("=" * 60)
    
    try:
        result = subprocess.run(['nvidia-smi'], capture_output=True, text=True)
        if result.returncode == 0:
            print("✅ GPU NVIDIA detectada!")
            print("\n" + result.stdout)
            return True
        else:
            print("❌ No se pudo ejecutar nvidia-smi")
            return False
    except FileNotFoundError:
        print("❌ nvidia-smi no encontrado. Drivers NVIDIA no instalados.")
        return False

def check_pytorch():
    """Verifica instalación de PyTorch y soporte CUDA"""
    print("\n" + "=" * 60)
    print("VERIFICACIÓN DE PYTORCH")
    print("=" * 60)
    
    try:
        import torch
        print(f"✅ PyTorch instalado: {torch.__version__}")
        print(f"   CUDA disponible: {torch.cuda.is_available()}")
        
        if torch.cuda.is_available():
            print(f"   CUDA version: {torch.version.cuda}")
            print(f"   cuDNN version: {torch.backends.cudnn.version()}")
            print(f"   Número de GPUs: {torch.cuda.device_count()}")
            for i in range(torch.cuda.device_count()):
                print(f"   GPU {i}: {torch.cuda.get_device_name(i)}")
                props = torch.cuda.get_device_properties(i)
                print(f"      Memoria total: {props.total_memory / 1024**3:.2f} GB")
                print(f"      Compute capability: {props.major}.{props.minor}")
            return True
        else:
            print("⚠️  PyTorch instalado SIN soporte CUDA")
            print(f"   Versión actual: {torch.__version__}")
            return False
    except ImportError:
        print("❌ PyTorch no está instalado")
        return False

def check_ultralytics():
    """Verifica instalación de Ultralytics YOLO"""
    print("\n" + "=" * 60)
    print("VERIFICACIÓN DE ULTRALYTICS")
    print("=" * 60)
    
    try:
        import ultralytics
        print(f"✅ Ultralytics instalado: {ultralytics.__version__}")
        return True
    except ImportError:
        print("❌ Ultralytics no está instalado")
        return False

def generate_installation_commands():
    """Genera comandos de instalación según el sistema"""
    print("\n" + "=" * 60)
    print("COMANDOS DE INSTALACIÓN RECOMENDADOS")
    print("=" * 60)
    
    print("[INSTALACION] Para instalar PyTorch con CUDA 12.1 (compatible con CUDA 12.9):")
    print("\nOpción 1 - Instalación completa (recomendado):")
    print("   pip uninstall torch torchvision torchaudio -y")
    print("   pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121")
    
    print("\nOpción 2 - Solo PyTorch:")
    print("   pip install torch --index-url https://download.pytorch.org/whl/cu121")
    
    print("\n📦 Para instalar/actualizar Ultralytics:")
    print("   pip install --upgrade ultralytics")
    
    print("\n📦 Dependencias adicionales:")
    print("   pip install opencv-python>=4.8.0 flask requests")

def test_yolo_inference():
    """Prueba rápida de inferencia YOLO"""
    print("\n" + "=" * 60)
    print("PRUEBA DE INFERENCIA YOLO")
    print("=" * 60)
    
    try:
        import torch
        from ultralytics import YOLO
        import time
        import numpy as np
        
        if not torch.cuda.is_available():
            print("⚠️  CUDA no disponible, saltando prueba de GPU")
            return
        
        print("\n🧪 Creando imagen de prueba...")
        # Crear imagen de prueba
        test_image = np.random.randint(0, 255, (640, 640, 3), dtype=np.uint8)
        
        print("📥 Cargando modelo YOLO...")
        # Intentar cargar el modelo del proyecto
        try:
            model = YOLO('models/best.pt')
        except:
            print("   Modelo del proyecto no encontrado, usando yolov8n.pt")
            model = YOLO('yolov8n.pt')
        
        # Prueba en CPU
        print("\n⏱️  Prueba en CPU...")
        start = time.time()
        results = model(test_image, device='cpu', verbose=False)
        cpu_time = time.time() - start
        print(f"   Tiempo: {cpu_time:.3f}s")
        
        # Prueba en GPU
        print("\n⚡ Prueba en GPU...")
        start = time.time()
        results = model(test_image, device='cuda:0', verbose=False)
        gpu_time = time.time() - start
        print(f"   Tiempo: {gpu_time:.3f}s")
        
        speedup = cpu_time / gpu_time
        print(f"\n🚀 Aceleración GPU: {speedup:.2f}x más rápido")
        
        # Información de memoria GPU
        print(f"\n💾 Memoria GPU:")
        print(f"   Asignada: {torch.cuda.memory_allocated(0) / 1024**2:.2f} MB")
        print(f"   Reservada: {torch.cuda.memory_reserved(0) / 1024**2:.2f} MB")
        
    except Exception as e:
        print(f"❌ Error en prueba: {e}")

def main():
    """Función principal"""
    print("\n" + "="*60)
    print("DIAGNOSTICO DE GPU PARA YOLO-PLN")
    print("="*60)
    print(f"Sistema: {platform.system()} {platform.release()}")
    print(f"Python: {sys.version.split()[0]}\n")
    
    has_gpu = check_nvidia_gpu()
    has_pytorch_cuda = check_pytorch()
    has_ultralytics = check_ultralytics()
    
    print("\n" + "=" * 60)
    print("RESUMEN")
    print("=" * 60)
    
    if has_gpu and has_pytorch_cuda and has_ultralytics:
        print("✅ ¡Todo configurado correctamente!")
        print("   Tu sistema está listo para usar GPU con YOLO")
        test_yolo_inference()
    elif has_gpu and not has_pytorch_cuda:
        print("⚠️  GPU disponible pero PyTorch sin CUDA")
        print("   Necesitas reinstalar PyTorch con soporte CUDA")
        generate_installation_commands()
    elif has_gpu and has_pytorch_cuda and not has_ultralytics:
        print("⚠️  GPU y PyTorch OK, falta Ultralytics")
        print("   Instala: pip install ultralytics")
    else:
        print("❌ Configuración incompleta")
        generate_installation_commands()
    
    print("\n" + "=" * 60)
    print("PRÓXIMOS PASOS")
    print("=" * 60)
    print("1. Ejecuta los comandos de instalación mostrados arriba")
    print("2. Reinicia el terminal/IDE después de instalar")
    print("3. Ejecuta este script nuevamente para verificar")
    print("4. Si todo está OK, ejecuta: python app.py")
    print("=" * 60 + "\n")

if __name__ == "__main__":
    main()
