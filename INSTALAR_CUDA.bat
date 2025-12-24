@echo off
echo ============================================================
echo   INSTALACION RAPIDA DE PYTORCH CON CUDA
echo ============================================================
echo.
echo Tu GPU: NVIDIA GeForce RTX 4050 Laptop
echo PyTorch actual: 2.9.0+cpu (SIN CUDA)
echo.
echo Este script instalara PyTorch con CUDA 12.1
echo Tiempo estimado: 5-8 minutos
echo.
pause

echo.
echo [1/3] Desinstalando PyTorch sin CUDA...
pip uninstall torch torchvision torchaudio -y

echo.
echo [2/3] Instalando PyTorch con CUDA 12.1...
echo (Esto puede tardar varios minutos, por favor espera...)
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

echo.
echo [3/3] Verificando instalacion...
python -c "import torch; print('\n=== VERIFICACION ==='); print('PyTorch version:', torch.__version__); print('CUDA disponible:', torch.cuda.is_available()); print('GPU:', torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'No detectada'); print('\nSi CUDA disponible = True, la instalacion fue exitosa!')"

echo.
echo ============================================================
echo   INSTALACION COMPLETADA
echo ============================================================
echo.
echo Ahora ejecuta: python app.py
echo Deberia ver: "GPU detectada: NVIDIA GeForce RTX 4050 Laptop GPU"
echo.
pause
