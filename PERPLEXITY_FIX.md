# Corrección de API de Perplexity - Resumen

## ✅ Problema Resuelto

La API de Perplexity no funcionaba en Python pero sí en PHP.

## 🔍 Problemas Encontrados

### 1. API Key Incorrecta (Línea 848)
**Antes:**
```python
api_key = os.getenv('wa')
```
❌ Esto intentaba leer una variable de entorno con ese nombre largo, que no existe.

**Después:**
```python
api_key = 'wa'
```
✅ Ahora usa la API key directamente.

### 2. Modelo Desactualizado (Línea 854)
**Antes:**
```python
"model": "sonar-pro"  # o "pplx-7b-online" en PHP
```
❌ Modelos antiguos o incorrectos.

**Después:**
```python
"model": "sonar"  # Modelo actualizado 2025
```
✅ Modelo correcto según documentación de Perplexity 2025.

## 📊 Modelos Disponibles en Perplexity (2025)

- **`sonar`** - Modelo base (RECOMENDADO) ✅
- **`sonar-pro`** - Búsquedas avanzadas con razonamiento
- **`sonar-reasoning`** - Razonamiento complejo

Los modelos antiguos como `pplx-7b-online` ya no están disponibles.

## 🧪 Prueba Exitosa

```bash
python test_perplexity.py
```

**Resultado:**
```
Código de respuesta: 200
RESPUESTA:
**La alpaca (*Vicugna pacos*) es una especie doméstica de mamífero...
[Respuesta completa y detallada con citas]
```

✅ **API funcionando correctamente**

## 📝 Cambios en app.py

### [app.py](file:///c:/Users/LOQ/Downloads/YoloMestas/YOLO-PLN-main/YOLO-PLN-main/app.py#L848-L859)

```python
@app.route('/chatbot', methods=['POST'])
def chatbot():
    """Chat breve usando API Sonar Pro de Perplexity"""
    data = request.json or {}
    question = (data.get('question') or '').strip()
    if not question:
        return jsonify({'error': 'Pregunta vacía'}), 400

    # API Key de Perplexity - usar directamente
    api_key = 'wa'
    
    if not api_key:
        return jsonify({'error': 'Falta API key de Perplexity'}), 500

    try:
        # Usar modelos actualizados de Perplexity (2025)
        payload = {
            "model": "sonar",  # Modelo base más confiable
            "messages": [{"role": "user", "content": question}]
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
        # ... resto del código
```

## 🎯 Uso en la Aplicación

1. Ejecuta la aplicación:
```bash
python app.py
```

2. Abre http://localhost:5000

3. En la pestaña de **Tiempo Real** o **Video Procesado**, haz click en un animal detectado

4. En el panel derecho, escribe una pregunta en el chat:
   - "¿Qué come una alpaca?"
   - "¿Dónde vive la llama?"
   - "¿Para qué se usa el cuy?"

5. La API de Perplexity responderá con información actualizada

## ⚠️ Nota de Seguridad

Para producción, es mejor usar variable de entorno:

```python
# Opción más segura:
api_key = os.getenv('PERPLEXITY_API_KEY', 'tu-api-key-default')
```

Y configurar en Windows:
```bash
setx PERPLEXITY_API_KEY "wa"
```

## ✨ Resultado

✅ API de Perplexity funcionando correctamente  
✅ Modelo actualizado a "sonar" (2025)  
✅ Integración completa con el chatbot  
✅ Respuestas con citas y referencias  
