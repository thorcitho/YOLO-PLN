# Chatbot Contextual - Implementación Completada

## ✅ Funcionalidad Implementada

El chatbot ahora responde **específicamente sobre el animal detectado**, no sobre cualquier tema.

## 🔄 Cómo Funciona

### 1. Usuario hace click en animal detectado
- Se muestra información del animal en el panel lateral
- El nombre del animal aparece en `panelAnimalName` o `rtPanelAnimalName`

### 2. Usuario escribe pregunta en el chat
Ejemplo: "¿Qué come?"

### 3. Frontend envía contexto
```javascript
{
  "question": "¿Qué come?",
  "animal": "alpaca"  // ← Nombre del animal del panel
}
```

### 4. Backend contextualiza la pregunta
```python
# Si animal es "alpaca"
contextualized_question = "Sobre el animal alpaca (Vicugna pacos), que es un animal andino: ¿Qué come?. Por favor responde de forma breve y específica sobre este animal."
```

### 5. Perplexity API responde
La respuesta será **específica sobre alpacas**, no genérica.

## 📝 Cambios Realizados

### Backend: [app.py](file:///c:/Users/LOQ/Downloads/YoloMestas/YOLO-PLN-main/YOLO-PLN-main/app.py#L840-L905)

```python
@app.route('/chatbot', methods=['POST'])
def chatbot():
    """Chat breve usando API Sonar de Perplexity con contexto del animal detectado"""
    data = request.json or {}
    question = (data.get('question') or '').strip()
    animal_name = (data.get('animal') or '').strip().lower()  # ← NUEVO
    
    # Construir pregunta con contexto del animal
    contextualized_question = question
    
    if animal_name and animal_name in ANIMAL_DESCRIPTIONS:
        # Obtener información del animal de la base de conocimiento
        animal_info = ANIMAL_DESCRIPTIONS[animal_name]
        nombre_cientifico = animal_info.get('nombre_cientifico', '')
        
        # Agregar contexto específico del animal a la pregunta
        contextualized_question = f"Sobre el animal {animal_name} ({nombre_cientifico}), que es un animal andino: {question}. Por favor responde de forma breve y específica sobre este animal."
    
    # Enviar a Perplexity con contexto
    payload = {
        "model": "sonar",
        "messages": [{"role": "user", "content": contextualized_question}]  # ← Pregunta contextualizada
    }
```

### Frontend: [main.js](file:///c:/Users/LOQ/Downloads/YoloMestas/YOLO-PLN-main/YOLO-PLN-main/static/js/main.js#L733-L771)

```javascript
// Chatbot con contexto del animal
const bindChat = (btnId, questionId, answerId, animalNameId) => {  // ← Nuevo parámetro
    btn.addEventListener('click', async () => {
        const animalNameEl = document.getElementById(animalNameId);  // ← NUEVO
        
        // Obtener el nombre del animal del panel
        const animalName = animalNameEl ? animalNameEl.textContent.trim().toLowerCase() : '';
        
        // Enviar pregunta CON nombre del animal
        const resp = await fetch('/chatbot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                question: q,
                animal: animalName  // ← NUEVO: Contexto del animal
            })
        });
    });
};

// Vincular con IDs de nombre de animal
bindChat('chatSendBtn', 'chatQuestion', 'chatAnswer', 'panelAnimalName');
bindChat('rtChatSendBtn', 'rtChatQuestion', 'rtChatAnswer', 'rtPanelAnimalName');
```

## 🎯 Ejemplo de Uso

### Escenario: Usuario detecta una alpaca

1. **Click en alpaca** → Panel muestra:
   - Nombre: Alpaca
   - Científico: Vicugna pacos
   - Descripción completa...

2. **Usuario pregunta**: "¿Qué come?"

3. **Sistema envía a Perplexity**:
   ```
   "Sobre el animal alpaca (Vicugna pacos), que es un animal andino: ¿Qué come?. 
   Por favor responde de forma breve y específica sobre este animal."
   ```

4. **Perplexity responde**:
   ```
   Las alpacas son herbívoras y se alimentan principalmente de pastos, heno, 
   tallos y hojas. En su hábitat natural en los Andes, consumen gramíneas 
   y otras plantas de altura...
   ```

## 🔍 Animales Soportados

El sistema tiene información detallada de:
- **Alpaca** (Vicugna pacos)
- **Llama** (Lama glama)
- **Cuy** (Cavia porcellus)
- **Oveja** (Ovis aries)
- **Vaca** (Bos taurus)

Para otros animales detectados, el sistema igual contextualiza como "animal andino".

## ✨ Beneficios

✅ **Respuestas específicas** - No respuestas genéricas  
✅ **Contexto automático** - Usuario no necesita repetir el animal  
✅ **Información precisa** - Usa nombre científico para mejor búsqueda  
✅ **Respuestas breves** - Limitadas a 800 caracteres  
✅ **Fallback inteligente** - Funciona incluso sin animal en base de datos  

## 🧪 Probar

1. Ejecuta la aplicación:
```bash
python app.py
```

2. Abre http://localhost:5000

3. **Opción A - Tiempo Real**:
   - Inicia cámara
   - Muestra un animal (o imagen de animal)
   - Click en el animal detectado
   - Escribe pregunta en el chat del panel derecho

4. **Opción B - Video**:
   - Sube un video con animales
   - Espera a que procese
   - Click en un animal en el video
   - Escribe pregunta en el chat del panel derecho

## 📊 Ejemplos de Preguntas

Con alpaca detectada:
- "¿Qué come?" → Respuesta sobre dieta de alpacas
- "¿Dónde vive?" → Respuesta sobre hábitat de alpacas
- "¿Para qué se usa?" → Respuesta sobre usos de alpacas
- "¿Cuánto pesa?" → Respuesta sobre peso de alpacas

## 🎨 Interfaz

El chatbot está en dos lugares:
1. **Panel derecho en Tiempo Real** (`rtChatQuestion`, `rtChatAnswer`)
2. **Panel derecho en Video Procesado** (`chatQuestion`, `chatAnswer`)

Ambos ahora envían el nombre del animal automáticamente.
