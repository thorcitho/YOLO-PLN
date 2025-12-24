@echo off
echo ============================================================
echo   CONFIGURACION DE ENTORNO VIRTUAL CON PYTHON 3.11
echo ============================================================
echo.
echo PROBLEMA: Python 3.13 no es compatible con PyTorch
echo SOLUCION: Usar Python 3.11 en entorno virtual
echo.

REM Verificar si Python 3.11 está instalado
py -3.11 --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python 3.11 no esta instalado
    echo.
    echo Por favor descarga e instala Python 3.11 desde:
    echo https://www.python.org/downloads/
    echo.
    echo Asegurate de marcar "Add Python to PATH" durante la instalacion
    pause
    exit /b 1
)

echo [OK] Python 3.11 detectado
py -3.11 --version
echo.

echo [1/5] Creando entorno virtual con Python 3.11...
py -3.11 -m venv venv

echo [2/5] Activando entorno virtual...
call venv\Scripts\activate

echo [3/5] Actualizando pip...
python -m pip install --upgrade pip

echo [4/5] Instalando PyTorch con CUDA 12.1...
echo (Esto puede tardar varios minutos...)
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

echo [5/5] Instalando otras dependencias...
pip install ultralytics opencv-python flask requests

echo.
echo ============================================================
echo   VERIFICANDO INSTALACION
echo ============================================================
python -c "import torch; print('PyTorch:', torch.__version__); print('CUDA disponible:', torch.cuda.is_available()); print('GPU:', torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'No detectada')"

echo.
echo ============================================================
echo   INSTALACION COMPLETADA
echo ============================================================
echo.
echo Para ejecutar la aplicacion:
echo   1. Activa el entorno: venv\Scripts\activate
echo   2. Ejecuta: python app.py
echo.
echo O simplemente ejecuta: EJECUTAR_APP.bat
echo.
pause
