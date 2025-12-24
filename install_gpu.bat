@echo off
echo ============================================================
echo   Instalador de PyTorch con CUDA para YOLO-PLN
echo ============================================================
echo.
echo Este script instalara PyTorch con soporte CUDA 12.1
echo Compatible con tu GPU RTX 4050 (CUDA 12.9)
echo.
pause

echo.
echo [1/3] Desinstalando PyTorch anterior...
pip uninstall torch torchvision torchaudio -y

echo.
echo [2/3] Instalando PyTorch con CUDA 12.1...
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

echo.
echo [3/3] Instalando dependencias adicionales...
pip install ultralytics opencv-python flask requests

echo.
echo ============================================================
echo   Verificando instalacion...
echo ============================================================
python -c "import torch; print(f'\nCUDA disponible: {torch.cuda.is_available()}'); print(f'Version PyTorch: {torch.__version__}'); print(f'GPU: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else \"No detectada\"}')"

echo.
echo ============================================================
if errorlevel 1 (
    echo   ERROR: La instalacion fallo
    echo   Por favor revisa los mensajes de error arriba
) else (
    echo   Instalacion completada!
    echo   Ejecuta: python app.py
)
echo ============================================================
echo.
pause
