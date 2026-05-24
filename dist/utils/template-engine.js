/**
 * template-engine.js
 * Motor Premium de Plantillas, Variables Dinámicas {{}} e Inserción Modular - Fase 12
 */

// Módulos predefinidos integrables
export const BLOQUES_MODULOS = {
  atributos: `# Atributos
	**Vida:** 100i
	**Fuerza:** 10i
	**Agilidad:** 5.5f
	**Activo:** Sí`,
  inventario: `# Inventario
	**Item:** Espada Corta
	**Item:** Escudo Pequeño
	**Item:** Raciones de Viaje`,
  habilidad: `# Habilidad
	**Nombre:** Ráfaga Feroz
	**Costo:** 15i
	**Multiplicador:** 1.5f`,
  historia: `# Historia
	Este guerrero proviene de las tierras frías del norte. Su clan ha custodiado los secretos del metal durante generaciones.`
};

// 1. ESCANEAR VARIABLES DINÁMICAS {{variable}} EN TEXTO
export function escanearVariablesDePlantilla(text) {
  const regex = /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g;
  const variables = [];
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    const varName = match[1];
    if (!variables.includes(varName)) {
      variables.push(varName);
    }
  }
  
  return variables;
}

// 2. ALINEAR E INSERTAR MÓDULO HEREDANDO SANGRÍA RELATIVA DEL CURSOR
export function obtenerTextoModuloConSangria(moduloTexto, originalText, cursorPosition) {
  // Buscar el inicio de la línea donde está posicionado el cursor
  let inicioLinea = originalText.lastIndexOf('\n', cursorPosition - 1);
  if (inicioLinea === -1) {
    inicioLinea = 0;
  } else {
    inicioLinea += 1;
  }
  
  const textoDeLinea = originalText.substring(inicioLinea, cursorPosition);
  const matchSangria = textoDeLinea.match(/^([ \t]*)/);
  const sangria = matchSangria ? matchSangria[1] : '';
  
  // Alinear cada línea del módulo aplicando proporcionalmente la sangría
  const lineasModulo = moduloTexto.split('\n');
  const moduloAlineado = lineasModulo.map((linea, idx) => {
    // La primera línea se coloca justo donde está el cursor, no necesita sangría inicial redundante
    if (idx === 0) return linea;
    return sangria + linea;
  }).join('\n');
  
  return moduloAlineado;
}
