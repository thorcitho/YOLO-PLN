"""
Script de prueba para verificar la limpieza de formato Markdown
"""
import re

def clean_markdown_format(text):
    """Limpia formato Markdown de la respuesta para mejor visualización en texto plano"""
    
    # Remover negritas **texto** o __texto__
    text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)
    text = re.sub(r'__(.+?)__', r'\1', text)
    
    # Remover itálicas *texto* o _texto_
    text = re.sub(r'\*(.+?)\*', r'\1', text)
    text = re.sub(r'_(.+?)_', r'\1', text)
    
    # Remover referencias de citas [1], [2], etc.
    text = re.sub(r'\[\d+\]', '', text)
    
    # Remover enlaces [texto](url) -> solo dejar texto
    text = re.sub(r'\[(.+?)\]\(.+?\)', r'\1', text)
    
    # Remover encabezados ## o ###
    text = re.sub(r'^#{1,6}\s+', '', text, flags=re.MULTILINE)
    
    # Remover código inline `texto`
    text = re.sub(r'`(.+?)`', r'\1', text)
    
    # Limpiar espacios múltiples
    text = re.sub(r'\s+', ' ', text)
    
    # Limpiar espacios al inicio y final
    text = text.strip()
    
    return text

# Ejemplo de respuesta de Perplexity con formato Markdown
ejemplo_markdown = """**La alpaca (*Vicugna pacos*) es una especie doméstica de mamífero artiodáctilo de la familia Camelidae, originaria de los Andes sudamericanos, domesticada a partir de la vicuña.** [1][2][3][4]

Se cría principalmente por su lana de alta calidad, suave y cálida, en países como Perú, Bolivia, Ecuador y Chile, donde vive en altitudes elevadas.[1][4][5][7] Pesa entre 45 y 84 kg, mide unos 81-99 cm de altura a la cruz y tiene un cuello largo, orejas puntiagudas y pelaje que crece hasta 50 cm en colores como blanco, marrón o negro.[1][4][5]

**Características clave:**
- **Origen etimológico**: Del quechua *allpaqa* o *paqu*, vía aimara *allpaqa*, que significa "rubio" o "tierra colorada".[1][2][6]
- **Hábitat y alimentación**: Herbívora, come pasto, heno, tallos y hojas; vive en grupos sociales jerárquicos con machos alfa, hembras y crías.[4][5]
- **Comportamiento**: Escupe para defenderse o mostrar dominancia, emite graznidos de alerta y no se usa como animal de carga, a diferencia de la llama.[1][4][7]"""

print("="*70)
print("ANTES (con formato Markdown):")
print("="*70)
print(ejemplo_markdown)
print("\n")

texto_limpio = clean_markdown_format(ejemplo_markdown)

print("="*70)
print("DESPUÉS (texto limpio):")
print("="*70)
print(texto_limpio)
print("\n")

print("="*70)
print("COMPARACIÓN:")
print("="*70)
print(f"Longitud original: {len(ejemplo_markdown)} caracteres")
print(f"Longitud limpia: {len(texto_limpio)} caracteres")
print(f"Reducción: {len(ejemplo_markdown) - len(texto_limpio)} caracteres")
print("\nFormato removido:")
print("  - Negritas (**texto**)")
print("  - Itálicas (*texto*)")
print("  - Referencias [1], [2], etc.")
print("  - Encabezados (##)")
print("  - Código inline (`texto`)")
print("  - Enlaces [texto](url)")
