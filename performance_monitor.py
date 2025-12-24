"""
Monitor de rendimiento para YOLO-PLN
Tracking de FPS, uso de GPU y métricas de rendimiento
"""

import time
import threading
from collections import deque
from datetime import datetime
import json

try:
    import pynvml
    NVML_AVAILABLE = True
except ImportError:
    NVML_AVAILABLE = False

try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False


class PerformanceMonitor:
    """Monitor de rendimiento en tiempo real"""
    
    def __init__(self, window_size=30):
        """
        Args:
            window_size: Número de muestras para promedios móviles
        """
        self.window_size = window_size
        self.fps_history = deque(maxlen=window_size)
        self.latency_history = deque(maxlen=window_size)
        self.frame_times = deque(maxlen=window_size)
        
        self.last_frame_time = None
        self.total_frames = 0
        self.start_time = time.time()
        
        # GPU monitoring
        self.gpu_available = False
        self.gpu_handle = None
        
        if NVML_AVAILABLE:
            try:
                pynvml.nvmlInit()
                self.gpu_handle = pynvml.nvmlDeviceGetHandleByIndex(0)
                self.gpu_available = True
            except:
                pass
    
    def start_frame(self):
        """Marca el inicio de procesamiento de un frame"""
        return time.time()
    
    def end_frame(self, start_time):
        """Marca el fin de procesamiento de un frame y actualiza métricas"""
        current_time = time.time()
        frame_time = current_time - start_time
        
        self.frame_times.append(frame_time)
        self.latency_history.append(frame_time * 1000)  # ms
        
        # Calcular FPS
        if self.last_frame_time is not None:
            fps = 1.0 / (current_time - self.last_frame_time)
            self.fps_history.append(fps)
        
        self.last_frame_time = current_time
        self.total_frames += 1
    
    def get_fps(self):
        """Obtiene FPS actual (promedio de ventana)"""
        if not self.fps_history:
            return 0.0
        return sum(self.fps_history) / len(self.fps_history)
    
    def get_latency(self):
        """Obtiene latencia promedio en ms"""
        if not self.latency_history:
            return 0.0
        return sum(self.latency_history) / len(self.latency_history)
    
    def get_gpu_stats(self):
        """Obtiene estadísticas de GPU"""
        if not self.gpu_available:
            return None
        
        try:
            # Memoria
            mem_info = pynvml.nvmlDeviceGetMemoryInfo(self.gpu_handle)
            mem_used = mem_info.used / 1024**2  # MB
            mem_total = mem_info.total / 1024**2  # MB
            mem_percent = (mem_info.used / mem_info.total) * 100
            
            # Utilización
            utilization = pynvml.nvmlDeviceGetUtilizationRates(self.gpu_handle)
            gpu_util = utilization.gpu
            
            # Temperatura
            temp = pynvml.nvmlDeviceGetTemperature(self.gpu_handle, pynvml.NVML_TEMPERATURE_GPU)
            
            # Potencia
            try:
                power = pynvml.nvmlDeviceGetPowerUsage(self.gpu_handle) / 1000.0  # W
            except:
                power = 0
            
            return {
                'memory_used_mb': round(mem_used, 2),
                'memory_total_mb': round(mem_total, 2),
                'memory_percent': round(mem_percent, 2),
                'gpu_utilization': gpu_util,
                'temperature_c': temp,
                'power_w': round(power, 2)
            }
        except Exception as e:
            print(f"Error obteniendo stats GPU: {e}")
            return None
    
    def get_cpu_stats(self):
        """Obtiene estadísticas de CPU"""
        if not PSUTIL_AVAILABLE:
            return None
        
        try:
            return {
                'cpu_percent': psutil.cpu_percent(interval=0.1),
                'memory_percent': psutil.virtual_memory().percent,
                'memory_used_mb': psutil.virtual_memory().used / 1024**2
            }
        except:
            return None
    
    def get_summary(self):
        """Obtiene resumen completo de métricas"""
        elapsed_time = time.time() - self.start_time
        avg_fps = self.total_frames / elapsed_time if elapsed_time > 0 else 0
        
        summary = {
            'timestamp': datetime.now().isoformat(),
            'fps_current': round(self.get_fps(), 2),
            'fps_average': round(avg_fps, 2),
            'latency_ms': round(self.get_latency(), 2),
            'total_frames': self.total_frames,
            'elapsed_time_s': round(elapsed_time, 2)
        }
        
        gpu_stats = self.get_gpu_stats()
        if gpu_stats:
            summary['gpu'] = gpu_stats
        
        cpu_stats = self.get_cpu_stats()
        if cpu_stats:
            summary['cpu'] = cpu_stats
        
        return summary
    
    def reset(self):
        """Reinicia todas las métricas"""
        self.fps_history.clear()
        self.latency_history.clear()
        self.frame_times.clear()
        self.last_frame_time = None
        self.total_frames = 0
        self.start_time = time.time()
    
    def __del__(self):
        """Cleanup"""
        if self.gpu_available and NVML_AVAILABLE:
            try:
                pynvml.nvmlShutdown()
            except:
                pass


class VideoProcessingMonitor(PerformanceMonitor):
    """Monitor especializado para procesamiento de video"""
    
    def __init__(self, total_frames, window_size=30):
        super().__init__(window_size)
        self.video_total_frames = total_frames
        self.video_start_time = time.time()
    
    def get_progress(self):
        """Obtiene progreso de procesamiento"""
        progress_percent = (self.total_frames / self.video_total_frames * 100) if self.video_total_frames > 0 else 0
        
        elapsed = time.time() - self.video_start_time
        fps = self.get_fps()
        
        # Estimar tiempo restante
        if fps > 0:
            remaining_frames = self.video_total_frames - self.total_frames
            eta_seconds = remaining_frames / fps
        else:
            eta_seconds = 0
        
        return {
            'progress_percent': round(progress_percent, 2),
            'processed_frames': self.total_frames,
            'total_frames': self.video_total_frames,
            'elapsed_time_s': round(elapsed, 2),
            'eta_seconds': round(eta_seconds, 2),
            'fps': round(fps, 2)
        }


# Instancia global para uso en la aplicación
global_monitor = PerformanceMonitor()


if __name__ == "__main__":
    """Prueba del monitor de rendimiento"""
    print("🔍 Probando monitor de rendimiento...\n")
    
    monitor = PerformanceMonitor()
    
    # Simular procesamiento de frames
    print("Simulando procesamiento de 100 frames...")
    for i in range(100):
        start = monitor.start_frame()
        time.sleep(0.03)  # Simular ~30 FPS
        monitor.end_frame(start)
        
        if (i + 1) % 20 == 0:
            summary = monitor.get_summary()
            print(f"\nFrame {i+1}:")
            print(f"  FPS: {summary['fps_current']:.2f}")
            print(f"  Latencia: {summary['latency_ms']:.2f} ms")
            if 'gpu' in summary:
                print(f"  GPU: {summary['gpu']['gpu_utilization']}% | Mem: {summary['gpu']['memory_percent']:.1f}%")
    
    print("\n" + "="*50)
    print("Resumen final:")
    print(json.dumps(monitor.get_summary(), indent=2))
