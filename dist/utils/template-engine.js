/**
 * template-engine.js
 * Motor Premium de Plantillas, Variables Dinámicas {{}} e Inserción Modular - Fase 12
 */

// Módulos dinámicos integrables (anteriormente BLOQUES_MODULOS fijos)
// Ahora se leen dinámicamente mediante el sistema de archivos de Tauri de forma robusta.

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
