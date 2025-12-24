@echo off
echo ============================================================
echo   EJECUTAR APLICACION YOLO-PLN
echo ============================================================
echo.

REM Verificar si existe el entorno virtual
if not exist "venv\Scripts\activate.bat" (
    echo [ERROR] Entorno virtual no encontrado
    echo.
    echo Por favor ejecuta primero: SETUP_VENV.bat
    echo.
    pause
    exit /b 1
)

echo Activando entorno virtual...
call venv\Scripts\activate

echo Ejecutando aplicacion...
echo.
python app.py

pause
