/**
 * data-parser.js
 * Motor Premium de traducción de Markdown a Datos Estructurados (JSON/XML) - Fase 12
 */

// 1. TRADUCTOR DE MARKDOWN A OBJETO JERÁRQUICO JSON
export function parseMarkdownToJSON(text) {
  const lines = text.split('\n');
  const root = {};
  const stack = [{ level: -1, data: root }];
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    if (line.trim().length === 0) continue;
    
    // Limpieza en caliente de metadatos de módulo/plantilla v2.0
    // Si la línea coincide con "# Categoria `Descripcion`", removemos la descripción para que sirva de nodo raíz
    const metaRegex = /^#\s*([a-zA-Z0-9_#-]+)\s*`([^`]+)`/;
    if (metaRegex.test(line.trim())) {
      line = line.replace(/\s*`[^`]+`/, ''); // Dejar solo "# Categoria"
    }
    
    // Contar sangría (tabs y grupos de 4 espacios)
    const matchSpaces = line.match(/^([ \t]*)/);
    const indentStr = matchSpaces ? matchSpaces[1] : '';
    
    const spacesCount = (indentStr.match(/ /g) || []).length;
    const tabsCount = (indentStr.match(/\t/g) || []).length;
    const level = tabsCount + Math.floor(spacesCount / 4);
    
    const content = line.substring(indentStr.length).trim();
    
    // A. Detectar si es un Nodo (# NombreNodo)
    if (content.startsWith('#')) {
      // Limpiar asteriscos y guiones en el nombre del nodo si los tiene
      const nodeNameClean = content.replace(/^#+\s*/, '').trim().replace(/^[\s*_`~]+|[\s*_`~]+$/g, '');
      const newNode = {};
      
      while (stack.length > 1 && stack[stack.length - 1].level >= level) {
        stack.pop();
      }
      
      const parent = stack[stack.length - 1].data;
      
      if (parent[nodeNameClean]) {
        if (Array.isArray(parent[nodeNameClean])) {
          parent[nodeNameClean].push(newNode);
        } else {
          parent[nodeNameClean] = [parent[nodeNameClean], newNode];
        }
      } else {
        parent[nodeNameClean] = newNode;
      }
      
      stack.push({ level: level, data: newNode, name: nodeNameClean });
      
    } else {
      // B. Detectar si es una Propiedad (Clave: Valor)
      const colonIdx = content.indexOf(':');
      if (colonIdx !== -1) {
        const claveSucia = content.substring(0, colonIdx);
        const valorSucio = content.substring(colonIdx + 1);
        
        // Limpieza por Regex premium de marcadores de formato (*, _, `, ~)
        const key = claveSucia.replace(/^[\s*_`~]+|[\s*_`~]+$/g, '').trim();
        const rawVal = valorSucio.replace(/^[\s*_`~]+|[\s*_`~]+$/g, '').trim();
        
        let parsedVal;
        const lowerVal = rawVal.toLowerCase();
        
        // Reglas de tipado fluido sobre el valor perfectamente limpio
        // I. Booleano (Sí / No / True / False)
        if (lowerVal === 'sí' || lowerVal === 'si' || lowerVal === 'true') {
          parsedVal = true;
        } else if (lowerVal === 'no' || lowerVal === 'false') {
          parsedVal = false;
        }
        // II. Entero (100i -> 100)
        else if (/^-?\d+i$/.test(rawVal)) {
          parsedVal = parseInt(rawVal.slice(0, -1), 10);
        }
        // III. Flotante (2.5f -> 2.5, o contiene '.')
        else if (/^-?\d+(\.\d+)?f$/.test(rawVal)) {
          parsedVal = parseFloat(rawVal.slice(0, -1));
        } else if (/^-?\d+\.\d+$/.test(rawVal)) {
          parsedVal = parseFloat(rawVal);
        }
        // IV. Array Vacío (Listas vacías RPG)
        else if (rawVal === '[]') {
          parsedVal = [];
        }
        // V. Cadenas de Texto (Strings) con escape de comillas
        else {
          parsedVal = rawVal;
          if (typeof parsedVal === 'string') {
            parsedVal = parsedVal.replace(/"/g, '\\"');
          }
        }
        
        const currentNode = stack[stack.length - 1].data;
        
        if (currentNode[key] !== undefined) {
          if (Array.isArray(currentNode[key])) {
            currentNode[key].push(parsedVal);
          } else {
            currentNode[key] = [currentNode[key], parsedVal];
          }
        } else {
          currentNode[key] = parsedVal;
        }
      } else {
        // C. Contenido Narrativo (Línea sin separador ':')
        if (content.length > 0) {
          const currentNode = stack[stack.length - 1].data;
          
          // Verificación inteligente de colisiones sugerida por el usuario
          let keyToUse = "contenido";
          if (currentNode[keyToUse] !== undefined && typeof currentNode[keyToUse] !== 'string') {
            keyToUse = "descripcion";
          }
          
          if (currentNode[keyToUse] !== undefined) {
            currentNode[keyToUse] += '\n' + content;
          } else {
            currentNode[keyToUse] = content;
          }
        }
      }
    }
  }
  
  return root;
}

// 2. SANITIZADOR ROBUSTO PARA ETIQUETAS XML
export function sanitizeXMLTagName(name) {
  if (!name) return "Documento";
  
  // Quitar la extensión .md o .xml si existe
  let cleanName = name;
  if (cleanName.toLowerCase().endsWith('.md')) {
    cleanName = cleanName.substring(0, cleanName.length - 4);
  } else if (cleanName.toLowerCase().endsWith('.xml')) {
    cleanName = cleanName.substring(0, cleanName.length - 4);
  }
  
  cleanName = cleanName.trim();
  
  // Si está vacío o es el default "Sin título" o similar, fallback
  const lowerName = cleanName.toLowerCase();
  if (lowerName === "" || lowerName === "sin título" || lowerName === "sin titulo" || lowerName === "untitled") {
    return "Documento";
  }
  
  // Normalizar acentos y eñes quitándolos para evitar problemas con parsers XML estrictos
  cleanName = cleanName.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  // Reemplazar espacios y caracteres especiales por guiones bajos
  cleanName = cleanName.replace(/[^a-zA-Z0-9_.-]/g, '_');
  
  // Reemplazar múltiples guiones bajos seguidos por uno solo
  cleanName = cleanName.replace(/_+/g, '_');
  
  // Quitar guiones o puntos al inicio o al final
  cleanName = cleanName.replace(/^[-_.]+|[-_.]+$/g, '');
  
  // Si empieza por un número o carácter inválido, anteponer "Node_" (sugerencia de diseño de software)
  if (/^[0-9.-]/.test(cleanName) || cleanName.length === 0) {
    cleanName = "Node_" + cleanName;
  }
  
  // Si empieza con "xml" de forma insensible a mayúsculas/minúsculas, anteponer "doc_"
  if (cleanName.toLowerCase().startsWith('xml')) {
    cleanName = "doc_" + cleanName;
  }
  
  return cleanName || "Documento";
}

// 3. CONVERTIDOR DE OBJETO JSON A XML LIMPIO Y DINÁMICO
export function convertJSONToXML(obj, rootName = "Documento") {
  const sanitizedRoot = sanitizeXMLTagName(rootName);
  
  function serialize(node, name) {
    const tagName = sanitizeXMLTagName(name);
    
    if (node === null || node === undefined) {
      return `<${tagName}/>`;
    }
    
    if (typeof node !== 'object') {
      const strVal = String(node)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
      return `<${tagName}>${strVal}</${tagName}>`;
    }
    
    if (Array.isArray(node)) {
      return node.map(item => serialize(item, name)).join('\n');
    }
    
    let childrenXml = "";
    for (let key in node) {
      childrenXml += serialize(node[key], key) + "\n";
    }
    
    return `<${tagName}>\n${childrenXml}</${tagName}>`;
  }
  
  let finalXml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  let combined = "";
  for (let key in obj) {
    combined += serialize(obj[key], key) + "\n";
  }
  finalXml += `<${sanitizedRoot}>\n${combined}</${sanitizedRoot}>`;
  
  return finalXml;
}

// 3. GENERADOR DE HTML GRÁFICO DEL ÁRBOL
export function buildTreeHTML(node) {
  if (node === null || node === undefined) return '';
  let html = '';
  
  for (let key in node) {
    const val = node[key];
    
    if (typeof val === 'object' && !Array.isArray(val)) {
      // Nodo Objeto
      html += `<div class="tree-node">
        <div class="node-header">
          <span class="node-icon">📂</span>
          <span class="node-title">${key}</span>
        </div>
        ${buildTreeHTML(val)}
      </div>`;
    } else if (Array.isArray(val)) {
      // Listas por Colisión
      if (val.length > 0 && typeof val[0] === 'object') {
        val.forEach((item, index) => {
          html += `<div class="tree-node">
            <div class="node-header">
              <span class="node-icon">📦</span>
              <span class="node-title">${key} [${index}]</span>
            </div>
            ${buildTreeHTML(item)}
          </div>`;
        });
      } else {
        html += `<div class="property-container">`;
        val.forEach(item => {
          const badge = `<span class="type-badge type-list">Lista</span>`;
          html += `<div class="tree-property">
            <span class="prop-key">${key}:</span>
            <span class="prop-val">"${item}"</span>
            ${badge}
          </div>`;
        });
        html += `</div>`;
      }
    } else {
      // Propiedades Simples con Badges de colores por Tipo
      let typeClass = 'type-str';
      let typeLabel = 'Texto';
      let formattedVal = `"${val}"`;
      
      if (typeof val === 'number') {
        formattedVal = val;
        if (Number.isInteger(val)) {
          typeClass = 'type-int';
          typeLabel = 'Entero';
        } else {
          typeClass = 'type-float';
          typeLabel = 'Decimal';
        }
      } else if (typeof val === 'boolean') {
        formattedVal = val ? 'Sí' : 'No';
        typeClass = 'type-bool';
        typeLabel = 'Booleano';
      }
      
      const badge = `<span class="type-badge ${typeClass}">${typeLabel}</span>`;
      
      html += `<div class="property-container">
        <div class="tree-property">
          <span class="prop-key">${key}:</span>
          <span class="prop-val">${formattedVal}</span>
          ${badge}
        </div>
      </div>`;
    }
  }
  
  return html;
}

// 4. CONVERTIDOR DE OBJETO JSON A MARKDOWN JERÁRQUICO
export function convertJSONToMarkdown(obj, level = 0) {
  let markdown = '';
  const indent = '\t'.repeat(level);
  
  if (obj === null || obj === undefined) return '';
  if (typeof obj !== 'object') {
    return String(obj);
  }
  
  for (const [key, value] of Object.entries(obj)) {
    if (value && typeof value === 'object') {
      if (Array.isArray(value)) {
        if (value.length === 0) {
          // Si es un array vacío, representarlo explícitamente para no perder el parámetro
          markdown += `${indent}**${key}**: []\n`;
        } else {
          // Si contiene elementos
          if (typeof value[0] === 'object') {
            // Array de objetos (Nodos duplicados de la jerarquía)
            value.forEach(item => {
              markdown += `${indent}# ${key}\n`;
              markdown += convertJSONToMarkdown(item, level + 1);
            });
          } else {
            // Array de valores simples (Propiedades duplicadas)
            value.forEach(item => {
              let formattedVal = item;
              if (typeof item === 'boolean') {
                formattedVal = item ? 'Sí' : 'No';
              } else if (typeof item === 'number') {
                if (Number.isInteger(item)) {
                  formattedVal = `${item}i`;
                } else {
                  formattedVal = `${item}f`;
                }
              }
              markdown += `${indent}**${key}**: ${formattedVal}\n`;
            });
          }
        }
      } else {
        // Objeto simple (Nodo jerárquico tradicional)
        markdown += `${indent}# ${key}\n`;
        markdown += convertJSONToMarkdown(value, level + 1);
      }
    } else {
      // Valor simple (Propiedad tradicional)
      let formattedVal = value;
      if (typeof value === 'boolean') {
        formattedVal = value ? 'Sí' : 'No';
      } else if (typeof value === 'number') {
        if (Number.isInteger(value)) {
          formattedVal = `${value}i`;
        } else {
          formattedVal = `${value}f`;
        }
      }
      markdown += `${indent}**${key}**: ${formattedVal}\n`;
    }
  }
  return markdown;
}

// 5. CONVERTIDOR DE NODO XML A OBJETO JSON
export function convertXMLToJSON(node) {
  if (!node) return null;
  
  // Si es un nodo de texto, devolver su contenido limpio
  if (node.nodeType === 3 || node.nodeType === 4) {
    const text = node.nodeValue.trim();
    if (!text) return null;
    return text;
  }
  
  const obj = {};
  
  if (node.hasChildNodes()) {
    for (let i = 0; i < node.childNodes.length; i++) {
      const child = node.childNodes[i];
      
      // Ignorar nodos de comentario u otros no relevantes
      if (child.nodeType !== 1 && child.nodeType !== 3 && child.nodeType !== 4) {
        continue;
      }
      
      if (child.nodeType === 3 || child.nodeType === 4) {
        const textVal = child.nodeValue.trim();
        if (textVal) {
          if (node.childNodes.length === 1) {
            return parseTypedValue(textVal);
          }
        }
        continue;
      }
      
      const childName = child.nodeName;
      const childVal = convertXMLToJSON(child);
      
      if (childVal !== null && childVal !== undefined) {
        if (obj[childName] !== undefined) {
          if (Array.isArray(obj[childName])) {
            obj[childName].push(childVal);
          } else {
            obj[childName] = [obj[childName], childVal];
          }
        } else {
          obj[childName] = childVal;
        }
      }
    }
  }
  
  // Si el objeto está vacío, pero el nodo tenía texto, devolver el texto
  if (Object.keys(obj).length === 0 && node.textContent) {
    const txt = node.textContent.trim();
    if (txt) return parseTypedValue(txt);
  }
  
  return obj;
}

function parseTypedValue(val) {
  const lowerVal = val.toLowerCase();
  if (lowerVal === 'sí' || lowerVal === 'si' || lowerVal === 'true') return true;
  if (lowerVal === 'no' || lowerVal === 'false') return false;
  if (val === '[]') return [];
  if (/^-?\d+i$/.test(val)) return parseInt(val.slice(0, -1), 10);
  if (/^-?\d+(\.\d+)?f$/.test(val)) return parseFloat(val.slice(0, -1));
  if (/^-?\d+\.\d+$/.test(val)) return parseFloat(val);
  if (/^-?\d+$/.test(val)) return parseInt(val, 10);
  return val;
}
