"""
Script de prueba para verificar la API de Perplexity
"""
import requests
import json

# Tu API key
API_KEY = 'wa'

def test_perplexity_api():
    """Prueba la API de Perplexity con el modelo pplx-7b-online"""
    print("="*60)
    print("PRUEBA DE API PERPLEXITY")
    print("="*60)
    
    # Pregunta de prueba
    question = "¿Qué es una alpaca?"
    
    print(f"\nPregunta: {question}")
    print("\nEnviando solicitud a Perplexity API...")
    
    try:
        # Configuración con modelo actualizado 2025
        payload = {
            "model": "sonar",  # Modelo actualizado de Perplexity
            "messages": [
                {"role": "user", "content": question}
            ]
        }
        
        headers = {
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json"
        }
        
        response = requests.post(
            "https://api.perplexity.ai/chat/completions",
            json=payload,
            headers=headers,
            timeout=20
        )
        
        print(f"\nCódigo de respuesta: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            content = data.get('choices', [{}])[0].get('message', {}).get('content', '').strip()
            
            print("\n" + "="*60)
            print("RESPUESTA:")
            print("="*60)
            print(content)
            print("="*60)
            print("\n✅ API funcionando correctamente!")
            return True
        else:
            print(f"\n❌ Error {response.status_code}")
            print(f"Respuesta: {response.text[:500]}")
            return False
            
    except Exception as e:
        print(f"\n❌ Error: {e}")
        return False

if __name__ == "__main__":
    test_perplexity_api()
