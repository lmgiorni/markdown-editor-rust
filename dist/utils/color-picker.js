// ==========================================================================
// MOTOR DEL SELECTOR DE COLOR TRIANGULAR Y SISTEMA DE ARMONÍAS CROMÁTICAS
// ==========================================================================

function getInvoke() {
  if (typeof window !== 'undefined') {
    if (window.__TAURI__ && window.__TAURI__.core && typeof window.__TAURI__.core.invoke === 'function') {
      return window.__TAURI__.core.invoke;
    }
    if (window.__TAURI__ && typeof window.__TAURI__.invoke === 'function') {
      return window.__TAURI__.invoke;
    }
  }
  return null;
}

// Estado interno del Color Picker
let pickerState = {
  hue: 280,             // 0 - 360
  sat: 0.8,            // 0 - 1
  val: 0.9,            // 0 - 1
  alpha: 1.0,          // 0 - 1
  outputFormat: 'hex',  // 'hex' | 'rgba'
  originalColor: '#bc13fe', // Color fijo inmutable durante la selección
  currentColor: '#bc13fe',  // Color en previsualización "Nuevo"
  currentScheme: 'monochromatic', // 'monochromatic' | 'complementary' | 'analogous' | 'triadic' | 'tetradic' | 'custom'
  isPinned: false,      // Si está fijado, seleccionar colores en la rueda no sobreescribe las 10 casillas
  activePaletteName: '', // Nombre de la paleta activa en disco si existe
  activeSlotIndex: 0,
  palette: [
    '#bc13fe', '#a80fe4', '#940dcb', '#800bb1', '#6d0ab0',
    '#5d0999', '#4e0882', '#3f076c', '#310555', '#240440'
  ], // 10 casillas de paleta armónica
  onApplyCallback: null,
  isDraggingHue: false,
  isDraggingTriangle: false
};

// Cargar paleta y estado de sesión si existen
try {
  if (typeof sessionStorage !== 'undefined') {
    const savedPalette = sessionStorage.getItem('md-color-palette-10');
    if (savedPalette) {
      const parsedPal = JSON.parse(savedPalette);
      if (Array.isArray(parsedPal) && parsedPal.length === 10) {
        pickerState.palette = parsedPal;
      }
    }
    const savedPin = sessionStorage.getItem('md-color-picker-pinned');
    if (savedPin !== null) {
      pickerState.isPinned = savedPin === 'true';
    }
    const savedScheme = sessionStorage.getItem('md-color-picker-scheme');
    if (savedScheme) {
      pickerState.currentScheme = savedScheme;
    }
  }
} catch (e) {
  console.warn('Error leyendo estado de sesión del color picker:', e);
}

// --------------------------------------------------------------------------
// Conversiones cromáticas matemáticas (HSV <-> RGB <-> HEX <-> RGBA)
// --------------------------------------------------------------------------

export function hsvToRgb(h, s, v) {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(1, s));
  v = Math.max(0, Math.min(1, v));

  let r, g, b;
  const i = Math.floor((h / 60) % 6);
  const f = (h / 60) - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);

  switch (i) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
}

export function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (max !== min) {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return { h, s, v };
}

export function parseColorString(str) {
  str = (str || '').trim().toLowerCase();

  // 1. Hexadecimal (#fff, #ffffff, #ffffffff)
  if (str.startsWith('#')) {
    let hex = str.slice(1);
    if (hex.length === 3 || hex.length === 4) {
      hex = hex.split('').map(c => c + c).join('');
    }
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16) || 0;
      const g = parseInt(hex.slice(2, 4), 16) || 0;
      const b = parseInt(hex.slice(4, 6), 16) || 0;
      const hsv = rgbToHsv(r, g, b);
      return { r, g, b, a: 1.0, ...hsv, format: 'hex' };
    }
    if (hex.length === 8) {
      const r = parseInt(hex.slice(0, 2), 16) || 0;
      const g = parseInt(hex.slice(2, 4), 16) || 0;
      const b = parseInt(hex.slice(4, 6), 16) || 0;
      const a = Math.round((parseInt(hex.slice(6, 8), 16) / 255) * 100) / 100;
      const hsv = rgbToHsv(r, g, b);
      return { r, g, b, a, ...hsv, format: 'hex' };
    }
  }

  // 2. RGBA o RGB
  const matchRgba = str.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/);
  if (matchRgba) {
    const r = Math.min(255, Math.max(0, parseInt(matchRgba[1], 10)));
    const g = Math.min(255, Math.max(0, parseInt(matchRgba[2], 10)));
    const b = Math.min(255, Math.max(0, parseInt(matchRgba[3], 10)));
    const a = matchRgba[4] !== undefined ? Math.min(1, Math.max(0, parseFloat(matchRgba[4]))) : 1.0;
    const hsv = rgbToHsv(r, g, b);
    return { r, g, b, a, ...hsv, format: 'rgba' };
  }

  // Por defecto blanco
  return { r: 255, g: 255, b: 255, a: 1.0, h: 0, s: 0, v: 1.0, format: 'hex' };
}

export function formatColorOutput(r, g, b, a, format) {
  if (format === 'rgba' || (format === 'hex' && a < 1)) {
    if (format === 'rgba') {
      const aVal = a < 1 ? parseFloat(a.toFixed(2)) : 1;
      return aVal === 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${aVal})`;
    }
  }

  if (format === 'hex') {
    const toHex = n => n.toString(16).padStart(2, '0');
    if (a < 1) {
      const alphaHex = Math.round(a * 255).toString(16).padStart(2, '0');
      return `#${toHex(r)}${toHex(g)}${toHex(b)}${alphaHex}`;
    }
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  return `rgba(${r}, ${g}, ${b}, ${parseFloat(a.toFixed(2))})`;
}

// --------------------------------------------------------------------------
// Cálculo Matemático de las Armonías Cromáticas (10 Casillas)
// --------------------------------------------------------------------------

function calcularArmonias10(h, s, v, a, scheme) {
  const toColor = (nh, ns, nv) => {
    const rgb = hsvToRgb(nh, ns, nv);
    return formatColorOutput(rgb.r, rgb.g, rgb.b, a, pickerState.outputFormat);
  };

  const results = [];

  switch (scheme) {
    case 'monochromatic': {
      // 10 niveles progresivos de luminosidad y saturación del mismo tono
      const steps = [
        { s: Math.max(0.12, s * 0.25), v: Math.min(1.0, v * 0.35 + 0.65) },
        { s: Math.max(0.20, s * 0.45), v: Math.min(1.0, v * 0.50 + 0.50) },
        { s: Math.max(0.30, s * 0.65), v: Math.min(1.0, v * 0.68 + 0.32) },
        { s: Math.max(0.40, s * 0.82), v: Math.min(1.0, v * 0.85 + 0.15) },
        { s: s, v: v }, // Base color
        { s: Math.min(1.0, s * 1.05), v: Math.max(0.08, v * 0.82) },
        { s: Math.min(1.0, s * 1.10), v: Math.max(0.08, v * 0.68) },
        { s: Math.min(1.0, s * 1.15), v: Math.max(0.08, v * 0.52) },
        { s: Math.min(1.0, s * 1.20), v: Math.max(0.08, v * 0.38) },
        { s: Math.min(1.0, s * 1.25), v: Math.max(0.08, v * 0.22) }
      ];
      steps.forEach(st => results.push(toColor(h, st.s, st.v)));
      break;
    }

    case 'complementary': {
      // 5 variantes del tono base y 5 variantes del tono opuesto (+180°)
      const compH = (h + 180) % 360;
      const variations = [
        { s: Math.max(0.15, s * 0.4), v: Math.min(1.0, v * 0.5 + 0.5) },
        { s: Math.max(0.25, s * 0.7), v: Math.min(1.0, v * 0.75 + 0.25) },
        { s: s, v: v },
        { s: Math.min(1.0, s * 1.08), v: Math.max(0.1, v * 0.7) },
        { s: Math.min(1.0, s * 1.18), v: Math.max(0.1, v * 0.4) }
      ];
      variations.forEach(st => results.push(toColor(h, st.s, st.v)));
      variations.forEach(st => results.push(toColor(compH, st.s, st.v)));
      break;
    }

    case 'analogous': {
      // 5 tonos adyacentes (-40°, -20°, 0°, +20°, +40°) con variaciones armónicas
      const angles = [-40, -20, 0, 20, 40];
      angles.forEach(offset => {
        const nh = (h + offset + 360) % 360;
        results.push(toColor(nh, s, v));
        results.push(toColor(nh, Math.max(0.2, s * 0.6), Math.min(1.0, v * 0.6 + 0.4)));
      });
      break;
    }

    case 'triadic': {
      // Tres tonos equidistantes (0°, +120°, +240°) con 3 variantes cada uno + 1 acento
      const hues = [h, (h + 120) % 360, (h + 240) % 360];
      hues.forEach(th => {
        results.push(toColor(th, s, v)); // Base
        results.push(toColor(th, Math.max(0.2, s * 0.55), Math.min(1.0, v * 0.6 + 0.4))); // Light
        results.push(toColor(th, Math.min(1.0, s * 1.1), Math.max(0.15, v * 0.55))); // Dark
      });
      results.push(toColor((h + 60) % 360, s, v));
      break;
    }

    case 'tetradic': {
      // Cuatro tonos perpendiculares (0°, +90°, +180°, +270°) con 2 variantes cada uno
      const tetHues = [h, (h + 90) % 360, (h + 180) % 360, (h + 270) % 360];
      tetHues.forEach(th => {
        results.push(toColor(th, s, v));
        results.push(toColor(th, Math.max(0.25, s * 0.65), Math.min(1.0, v * 0.7 + 0.3)));
      });
      results.push(toColor(h, Math.min(1.0, s * 1.15), Math.max(0.12, v * 0.45)));
      results.push(toColor((h + 180) % 360, Math.min(1.0, s * 1.15), Math.max(0.12, v * 0.45)));
      break;
    }

    case 'custom':
    default:
      return [...pickerState.palette];
  }

  return results.slice(0, 10);
}

function recalcularArmonias() {
  if (pickerState.isPinned || pickerState.currentScheme === 'custom') {
    return;
  }
  const nuevasCasillas = calcularArmonias10(
    pickerState.hue,
    pickerState.sat,
    pickerState.val,
    pickerState.alpha,
    pickerState.currentScheme
  );
  pickerState.palette = nuevasCasillas;
  guardarPaletaSesion();
  renderizarSlots();
}

// --------------------------------------------------------------------------
// Canvas Interactivo (Anillo de Tono y Triángulo Equilátero de Saturación/Valor)
// --------------------------------------------------------------------------

let canvas, ctx;
const CANVAS_SIZE = 220;
const CENTER = CANVAS_SIZE / 2;
const RING_OUTER_R = 104;
const RING_INNER_R = 86;
const TRIANGLE_R = 78;

export function inicializarColorPicker() {
  const modal = document.getElementById('modal-color-picker');
  if (!modal) return;

  canvas = document.getElementById('color-triangle-canvas');
  if (canvas && typeof canvas.getContext === 'function') {
    ctx = canvas.getContext('2d');
    configurarEventosCanvas();
  }

  configurarControlesUI();
  configurarPaletaArmonica();
  configurarArrastreFlotante();
  configurarModalNombrePaleta();

  // Cargar lista de paletas guardadas en assets/palettes
  recargarListaPaletas();
}

function dibujarCanvas() {
  if (!ctx) return;
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  // 1. Dibujar anillo de tono exterior
  for (let angle = 0; angle < 360; angle += 1) {
    const startRad = (angle - 1) * Math.PI / 180;
    const endRad = (angle + 1) * Math.PI / 180;
    ctx.beginPath();
    ctx.arc(CENTER, CENTER, (RING_OUTER_R + RING_INNER_R) / 2, startRad, endRad);
    ctx.strokeStyle = `hsl(${angle}, 100%, 50%)`;
    ctx.lineWidth = RING_OUTER_R - RING_INNER_R;
    ctx.stroke();
  }

  // Borde sutil del anillo
  ctx.beginPath();
  ctx.arc(CENTER, CENTER, RING_OUTER_R, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(CENTER, CENTER, RING_INNER_R, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // 2. Indicador del Tono actual en el anillo
  const hueRad = pickerState.hue * Math.PI / 180;
  const ringMidR = (RING_OUTER_R + RING_INNER_R) / 2;
  const indicatorX = CENTER + ringMidR * Math.cos(hueRad);
  const indicatorY = CENTER + ringMidR * Math.sin(hueRad);

  ctx.beginPath();
  ctx.arc(indicatorX, indicatorY, 6, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 3. Dibujar triángulo interior (Painter/Photoshop style)
  const vA = { x: CENTER, y: CENTER - TRIANGLE_R };
  const vB = { x: CENTER - TRIANGLE_R * Math.cos(Math.PI / 6), y: CENTER + TRIANGLE_R * Math.sin(Math.PI / 6) };
  const vC = { x: CENTER + TRIANGLE_R * Math.cos(Math.PI / 6), y: CENTER + TRIANGLE_R * Math.sin(Math.PI / 6) };

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(vA.x, vA.y);
  ctx.lineTo(vB.x, vB.y);
  ctx.lineTo(vC.x, vC.y);
  ctx.closePath();
  ctx.clip();

  // Fondo del tono en vértice A
  ctx.fillStyle = `hsl(${pickerState.hue}, 100%, 50%)`;
  ctx.fill();

  // Gradiente Blanco desde B (abajo izquierda)
  const gradWhite = ctx.createLinearGradient(vB.x, vB.y, (vA.x + vC.x) / 2, (vA.y + vC.y) / 2);
  gradWhite.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradWhite.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = gradWhite;
  ctx.fill();

  // Gradiente Negro desde C (abajo derecha)
  const gradBlack = ctx.createLinearGradient(vC.x, vC.y, (vA.x + vB.x) / 2, (vA.y + vB.y) / 2);
  gradBlack.addColorStop(0, 'rgba(0, 0, 0, 1)');
  gradBlack.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = gradBlack;
  ctx.fill();

  ctx.restore();

  // Borde sutil del triángulo
  ctx.beginPath();
  ctx.moveTo(vA.x, vA.y);
  ctx.lineTo(vB.x, vB.y);
  ctx.lineTo(vC.x, vC.y);
  ctx.closePath();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // 4. Cursor del color actual dentro del triángulo
  const pos = hsvToTriangleCoords(pickerState.sat, pickerState.val, vA, vB, vC);
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, 5, 0, Math.PI * 2);
  ctx.fillStyle = pickerState.val > 0.5 && pickerState.sat < 0.5 ? '#000000' : '#ffffff';
  ctx.strokeStyle = pickerState.val > 0.5 && pickerState.sat < 0.5 ? '#ffffff' : '#000000';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fill();
}

function hsvToTriangleCoords(s, v, vA, vB, vC) {
  const wA = s * v;
  const wB = (1 - s) * v;
  const wC = 1 - v;
  return {
    x: wA * vA.x + wB * vB.x + wC * vC.x,
    y: wA * vA.y + wB * vB.y + wC * vC.y
  };
}

function triangleCoordsToHsv(x, y, vA, vB, vC) {
  const denom = (vB.y - vC.y) * (vA.x - vC.x) + (vC.x - vB.x) * (vA.y - vC.y);
  let wA = ((vB.y - vC.y) * (x - vC.x) + (vC.x - vB.x) * (y - vC.y)) / denom;
  let wB = ((vC.y - vA.y) * (x - vC.x) + (vA.x - vC.x) * (y - vC.y)) / denom;
  let wC = 1 - wA - wB;

  wA = Math.max(0, Math.min(1, wA));
  wB = Math.max(0, Math.min(1, wB));
  wC = Math.max(0, Math.min(1, wC));
  const sum = wA + wB + wC;
  if (sum > 0) {
    wA /= sum; wB /= sum; wC /= sum;
  }

  const v = Math.max(0, Math.min(1, 1 - wC));
  const s = v === 0 ? 0 : Math.max(0, Math.min(1, wA / v));
  return { s, v };
}

function configurarEventosCanvas() {
  if (!canvas) return;

  const handlePointer = (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const dx = x - CENTER;
    const dy = y - CENTER;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (pickerState.isDraggingHue) {
      let angle = Math.atan2(dy, dx) * 180 / Math.PI;
      if (angle < 0) angle += 360;
      pickerState.hue = Math.round(angle);
      sincronizarDesdeHsv();
      dibujarCanvas();
      recalcularArmonias();
      return;
    }

    if (pickerState.isDraggingTriangle) {
      const vA = { x: CENTER, y: CENTER - TRIANGLE_R };
      const vB = { x: CENTER - TRIANGLE_R * Math.cos(Math.PI / 6), y: CENTER + TRIANGLE_R * Math.sin(Math.PI / 6) };
      const vC = { x: CENTER + TRIANGLE_R * Math.cos(Math.PI / 6), y: CENTER + TRIANGLE_R * Math.sin(Math.PI / 6) };
      const hsv = triangleCoordsToHsv(x, y, vA, vB, vC);
      pickerState.sat = hsv.s;
      pickerState.val = hsv.v;
      sincronizarDesdeHsv();
      dibujarCanvas();
      recalcularArmonias();
      return;
    }

    if (dist >= RING_INNER_R - 4 && dist <= RING_OUTER_R + 4) {
      pickerState.isDraggingHue = true;
      let angle = Math.atan2(dy, dx) * 180 / Math.PI;
      if (angle < 0) angle += 360;
      pickerState.hue = Math.round(angle);
      sincronizarDesdeHsv();
      dibujarCanvas();
      recalcularArmonias();
    } else if (dist < RING_INNER_R) {
      pickerState.isDraggingTriangle = true;
      const vA = { x: CENTER, y: CENTER - TRIANGLE_R };
      const vB = { x: CENTER - TRIANGLE_R * Math.cos(Math.PI / 6), y: CENTER + TRIANGLE_R * Math.sin(Math.PI / 6) };
      const vC = { x: CENTER + TRIANGLE_R * Math.cos(Math.PI / 6), y: CENTER + TRIANGLE_R * Math.sin(Math.PI / 6) };
      const hsv = triangleCoordsToHsv(x, y, vA, vB, vC);
      pickerState.sat = hsv.s;
      pickerState.val = hsv.v;
      sincronizarDesdeHsv();
      dibujarCanvas();
      recalcularArmonias();
    }
  };

  canvas.addEventListener('mousedown', (e) => {
    handlePointer(e);
  });

  window.addEventListener('mousemove', (e) => {
    if (pickerState.isDraggingHue || pickerState.isDraggingTriangle) {
      handlePointer(e);
    }
  });

  window.addEventListener('mouseup', () => {
    pickerState.isDraggingHue = false;
    pickerState.isDraggingTriangle = false;
  });
}

// --------------------------------------------------------------------------
// Muestra Bicapa (Color sobre Damero de Transparencia)
// --------------------------------------------------------------------------

function actualizarVisualizacionSwatch(swatchContainer, fillElement, r, g, b, alpha) {
  if (!swatchContainer) return;
  if (alpha === null || alpha === undefined || isNaN(alpha)) alpha = 1;
  alpha = Math.min(1, Math.max(0, alpha));

  if (alpha >= 1) {
    swatchContainer.classList.remove('has-transparency');
    if (fillElement) {
      fillElement.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
    } else {
      swatchContainer.style.backgroundImage = 'none';
      swatchContainer.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
    }
  } else {
    swatchContainer.classList.add('has-transparency');
    if (fillElement) {
      fillElement.style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${alpha})`;
    } else {
      swatchContainer.style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
  }
}

// --------------------------------------------------------------------------
// Sincronización de Controles UI (Actualiza "Nuevo" sin tocar "Original")
// --------------------------------------------------------------------------

function sincronizarDesdeHsv() {
  const rgb = hsvToRgb(pickerState.hue, pickerState.sat, pickerState.val);
  const formatted = formatColorOutput(rgb.r, rgb.g, rgb.b, pickerState.alpha, pickerState.outputFormat);
  pickerState.currentColor = formatted;

  // Actualizar previsualización "Nuevo" únicamente
  const newSwatch = document.getElementById('color-preview-new');
  const newFill = document.getElementById('color-fill-new');
  actualizarVisualizacionSwatch(newSwatch, newFill, rgb.r, rgb.g, rgb.b, pickerState.alpha);

  // Pista de opacidad progresiva
  const alphaGrad = document.getElementById('alpha-slider-gradient');
  if (alphaGrad) {
    alphaGrad.style.background = `linear-gradient(to right, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0), rgb(${rgb.r}, ${rgb.g}, ${rgb.b}))`;
  }

  // Inputs y etiquetas numéricas
  const inputHex = document.getElementById('color-input-hex');
  const inputR = document.getElementById('color-input-r');
  const inputG = document.getElementById('color-input-g');
  const inputB = document.getElementById('color-input-b');
  const inputA = document.getElementById('color-input-a');
  const rangeAlpha = document.getElementById('color-range-alpha');
  const labelAlpha = document.getElementById('color-alpha-val');

  const toHex = n => n.toString(16).padStart(2, '0');
  if (inputHex && document.activeElement !== inputHex) {
    inputHex.value = `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
  }
  if (inputR && document.activeElement !== inputR) inputR.value = rgb.r;
  if (inputG && document.activeElement !== inputG) inputG.value = rgb.g;
  if (inputB && document.activeElement !== inputB) inputB.value = rgb.b;
  if (inputA && document.activeElement !== inputA) inputA.value = pickerState.alpha;
  if (rangeAlpha) rangeAlpha.value = Math.round(pickerState.alpha * 100);
  if (labelAlpha) labelAlpha.textContent = `${Math.round(pickerState.alpha * 100)}%`;
}

// Carga un color activo en "Nuevo" y controles, sin tocar el Color Original
function cargarColorActivo(colorString) {
  const parsed = parseColorString(colorString);
  pickerState.hue = Math.round(parsed.h);
  pickerState.sat = parsed.s;
  pickerState.val = parsed.v;
  pickerState.alpha = parsed.a;

  sincronizarDesdeHsv();
  dibujarCanvas();
}

// Sistema nativo de arrastre y soltar (Pointer Drag & Drop) para muestras y casillas
function iniciarArrastreColor(startEvent, colorToDrag) {
  if (!colorToDrag) return;

  const startX = startEvent.clientX;
  const startY = startEvent.clientY;
  let isDragging = false;
  let ghost = null;

  const onPointerMove = (e) => {
    const dist = Math.hypot(e.clientX - startX, e.clientY - startY);
    if (!isDragging && dist > 4) {
      isDragging = true;
      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';

      ghost = document.createElement('div');
      ghost.className = 'color-drag-ghost';
      ghost.style.backgroundColor = colorToDrag;
      document.body.appendChild(ghost);
    }

    if (isDragging && ghost) {
      ghost.style.left = `${e.clientX}px`;
      ghost.style.top = `${e.clientY}px`;

      // Resaltar casilla bajo el cursor
      document.querySelectorAll('.color-slot').forEach(s => s.classList.remove('drag-over'));
      const elemBelow = document.elementFromPoint(e.clientX, e.clientY);
      const slot = elemBelow ? elemBelow.closest('.color-slot') : null;
      if (slot) {
        slot.classList.add('drag-over');
      }
    }
  };

  const onPointerUp = (e) => {
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';

    if (ghost) {
      ghost.remove();
      ghost = null;
    }

    if (isDragging) {
      document.querySelectorAll('.color-slot').forEach(s => s.classList.remove('drag-over'));
      const elemBelow = document.elementFromPoint(e.clientX, e.clientY);
      const slot = elemBelow ? elemBelow.closest('.color-slot') : null;
      if (slot) {
        const slotIdx = parseInt(slot.dataset.index, 10);
        if (!isNaN(slotIdx)) {
          pickerState.palette[slotIdx] = colorToDrag;
          pickerState.activeSlotIndex = slotIdx;
          pickerState.isPinned = true;
          actualizarBotonFijar();
          guardarPaletaSesion();
          renderizarSlots();
          mostrarToast(`Color asignado a la casilla ${slotIdx + 1}`);
        }
      }
    }
  };

  document.addEventListener('pointermove', onPointerMove);
  document.addEventListener('pointerup', onPointerUp);
}

function configurarControlesUI() {
  const inputR = document.getElementById('color-input-r');
  const inputG = document.getElementById('color-input-g');
  const inputB = document.getElementById('color-input-b');
  const inputA = document.getElementById('color-input-a');
  const inputHex = document.getElementById('color-input-hex');
  const rangeAlpha = document.getElementById('color-range-alpha');
  const selectScheme = document.getElementById('select-color-scheme');

  const updateFromRgbInputs = () => {
    const r = Math.min(255, Math.max(0, parseInt(inputR.value, 10) || 0));
    const g = Math.min(255, Math.max(0, parseInt(inputG.value, 10) || 0));
    const b = Math.min(255, Math.max(0, parseInt(inputB.value, 10) || 0));
    const hsv = rgbToHsv(r, g, b);
    pickerState.hue = Math.round(hsv.h);
    pickerState.sat = hsv.s;
    pickerState.val = hsv.v;
    sincronizarDesdeHsv();
    dibujarCanvas();
    recalcularArmonias();
  };

  [inputR, inputG, inputB].forEach(input => {
    if (input) input.addEventListener('input', updateFromRgbInputs);
  });

  if (inputA) {
    inputA.addEventListener('input', () => {
      let a = parseFloat(inputA.value);
      if (isNaN(a)) a = 1;
      pickerState.alpha = Math.min(1, Math.max(0, a));
      sincronizarDesdeHsv();
      recalcularArmonias();
    });
  }

  if (rangeAlpha) {
    rangeAlpha.addEventListener('input', (e) => {
      pickerState.alpha = parseInt(e.target.value, 10) / 100;
      sincronizarDesdeHsv();
      recalcularArmonias();
    });
  }

  if (inputHex) {
    inputHex.addEventListener('input', () => {
      const val = inputHex.value.trim();
      if (/^#[0-9a-fA-F]{3,8}$/.test(val)) {
        const parsed = parseColorString(val);
        pickerState.hue = Math.round(parsed.h);
        pickerState.sat = parsed.s;
        pickerState.val = parsed.v;
        sincronizarDesdeHsv();
        dibujarCanvas();
        recalcularArmonias();
      }
    });
  }

  // Radios de formato de salida [HEX | RGBA]
  const radioHex = document.getElementById('radio-format-hex');
  const radioRgba = document.getElementById('radio-format-rgba');
  if (radioHex) {
    radioHex.addEventListener('change', () => {
      pickerState.outputFormat = 'hex';
      sincronizarDesdeHsv();
    });
  }
  if (radioRgba) {
    radioRgba.addEventListener('change', () => {
      pickerState.outputFormat = 'rgba';
      sincronizarDesdeHsv();
    });
  }

  // Selector de Esquema Armónico
  if (selectScheme) {
    selectScheme.value = pickerState.currentScheme;
    selectScheme.addEventListener('change', (e) => {
      pickerState.currentScheme = e.target.value;
      try {
        sessionStorage.setItem('md-color-picker-scheme', pickerState.currentScheme);
      } catch (err) {}

      if (pickerState.currentScheme === 'custom') {
        // En modo libre se fija automáticamente la paleta
        pickerState.isPinned = true;
        actualizarBotonFijar();
      } else {
        // Al elegir un esquema armónico estándar, se recalcula con el color actual
        pickerState.isPinned = false;
        actualizarBotonFijar();
        recalcularArmonias();
      }
    });
  }

  // Clic en muestra de "Color Original / Actual": restaura "Nuevo" sin modificar la muestra Original
  const origSwatch = document.getElementById('color-preview-original');
  if (origSwatch) {
    origSwatch.addEventListener('click', () => {
      if (pickerState.originalColor) {
        cargarColorActivo(pickerState.originalColor);
        if (!pickerState.isPinned && pickerState.currentScheme !== 'custom') {
          recalcularArmonias();
        }
      }
    });
  }

  // Drag & Drop fluido desde la muestra "Nuevo"
  const newSwatch = document.getElementById('color-preview-new');
  if (newSwatch) {
    newSwatch.setAttribute('draggable', 'false');
    newSwatch.addEventListener('dragstart', (e) => e.preventDefault());
    newSwatch.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      iniciarArrastreColor(e, pickerState.currentColor);
    });
  }

  // Botón Aplicar (Aplica los cambios al editor/playground sin cerrar la ventana)
  const btnApply = document.getElementById('btn-apply-color-picker');
  const btnCancel = document.getElementById('btn-cancel-color-picker');
  const btnClose = document.getElementById('btn-close-color-picker');
  const modal = document.getElementById('modal-color-picker');

  const cerrarModal = () => {
    if (modal) modal.classList.remove('active');
  };

  if (btnApply) {
    btnApply.addEventListener('click', () => {
      const rgb = hsvToRgb(pickerState.hue, pickerState.sat, pickerState.val);
      const resultado = formatColorOutput(rgb.r, rgb.g, rgb.b, pickerState.alpha, pickerState.outputFormat);
      if (typeof pickerState.onApplyCallback === 'function') {
        pickerState.onApplyCallback(resultado);
      }
      mostrarToast('Color aplicado al documento');
      // No cerramos la ventana al pulsar Aplicar: se mantiene abierta para edición continua
    });
  }

  if (btnCancel) btnCancel.addEventListener('click', cerrarModal);
  if (btnClose) btnClose.addEventListener('click', cerrarModal);
}

// --------------------------------------------------------------------------
// Paleta Armónica (10 Casillas, Fijar, Cargar y Guardar en assets/palettes)
// --------------------------------------------------------------------------

let contextMenuTargetIndex = null;

function guardarPaletaSesion() {
  try {
    sessionStorage.setItem('md-color-palette-10', JSON.stringify(pickerState.palette));
    sessionStorage.setItem('md-color-picker-pinned', pickerState.isPinned ? 'true' : 'false');
  } catch (e) {}
}

function actualizarBotonFijar() {
  const btnPin = document.getElementById('btn-pin-palette');
  const iconStatus = document.getElementById('pin-icon-status');
  if (!btnPin) return;

  if (pickerState.isPinned) {
    btnPin.classList.add('pinned');
    if (iconStatus) iconStatus.textContent = '📌';
    btnPin.title = 'Paleta fijada (no se recalcula automáticamente)';
  } else {
    btnPin.classList.remove('pinned');
    if (iconStatus) iconStatus.textContent = '📍';
    btnPin.title = 'Fijar paleta para evitar actualización automática';
  }
}

function renderizarSlots() {
  const container = document.getElementById('color-palette-slots');
  const ctxMenu = document.getElementById('palette-context-menu');
  if (!container) return;

  container.innerHTML = '';

  pickerState.palette.forEach((color, idx) => {
    const slot = document.createElement('div');
    slot.className = `color-slot ${idx === pickerState.activeSlotIndex ? 'active' : ''}`;
    slot.dataset.index = idx;

    const fill = document.createElement('div');
    fill.className = 'color-slot-fill';
    slot.appendChild(fill);

    if (color) {
      slot.classList.remove('empty');
      slot.classList.add('filled');
      const parsed = parseColorString(color);
      actualizarVisualizacionSwatch(slot, fill, parsed.r, parsed.g, parsed.b, parsed.a);
      slot.title = `Casilla ${idx + 1}: ${color}\n• Clic izq: Cargar en Nuevo\n• Clic der: Menú de opciones\n• Arrastra el color Nuevo aquí para asignar`;
    } else {
      slot.classList.remove('filled', 'has-transparency');
      slot.classList.add('empty');
      fill.style.backgroundColor = 'transparent';
      slot.title = `Casilla ${idx + 1}: Vacía`;
    }

    // 1. Clic izquierdo: Carga en "Nuevo"
    slot.addEventListener('click', () => {
      pickerState.activeSlotIndex = idx;
      renderizarSlots();
      if (color) {
        cargarColorActivo(color);
        // Si no está fijada y no es modo libre, el cambio de Nuevo recalcula la paleta
        if (!pickerState.isPinned && pickerState.currentScheme !== 'custom') {
          recalcularArmonias();
        }
      }
    });

    // 2. Drag & Drop fluido: Arrastrar el color de esta casilla a otra
    slot.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || !color) return;
      iniciarArrastreColor(e, color);
    });

    // 3. Clic derecho: Menú contextual
    slot.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      pickerState.activeSlotIndex = idx;
      contextMenuTargetIndex = idx;
      renderizarSlots();

      if (ctxMenu) {
        ctxMenu.style.display = 'flex';
        ctxMenu.style.left = `${Math.min(window.innerWidth - 220, e.clientX)}px`;
        ctxMenu.style.top = `${Math.min(window.innerHeight - 100, e.clientY)}px`;
      }
    });

    container.appendChild(slot);
  });
}

function configurarPaletaArmonica() {
  const btnPin = document.getElementById('btn-pin-palette');
  const btnSave = document.getElementById('btn-save-palette');
  const selectFile = document.getElementById('select-palette-file');
  const ctxMenu = document.getElementById('palette-context-menu');
  const btnCtxAssign = document.getElementById('ctx-palette-assign');
  const btnCtxCopy = document.getElementById('ctx-palette-copy');

  actualizarBotonFijar();
  renderizarSlots();

  // Botón Fijar
  if (btnPin) {
    btnPin.addEventListener('click', () => {
      pickerState.isPinned = !pickerState.isPinned;
      actualizarBotonFijar();
      guardarPaletaSesion();
    });
  }

  // Ocultar menú contextual al hacer clic fuera
  document.addEventListener('click', (e) => {
    if (ctxMenu && !ctxMenu.contains(e.target)) {
      ctxMenu.style.display = 'none';
    }
  });

  // Opción Menú Contextual: Asignar color actual
  if (btnCtxAssign) {
    btnCtxAssign.addEventListener('click', () => {
      if (contextMenuTargetIndex !== null) {
        pickerState.palette[contextMenuTargetIndex] = pickerState.currentColor;
        pickerState.isPinned = true;
        actualizarBotonFijar();
        guardarPaletaSesion();
        renderizarSlots();
        mostrarToast(`Color asignado a la casilla ${contextMenuTargetIndex + 1}`);
      }
      if (ctxMenu) ctxMenu.style.display = 'none';
    });
  }

  // Opción Menú Contextual: Copiar código de color
  if (btnCtxCopy) {
    btnCtxCopy.addEventListener('click', async () => {
      if (contextMenuTargetIndex !== null) {
        const colorToCopy = pickerState.palette[contextMenuTargetIndex];
        if (colorToCopy && navigator.clipboard) {
          try {
            await navigator.clipboard.writeText(colorToCopy);
            mostrarToast('¡Color copiado al portapapeles!');
          } catch (err) {
            console.warn('Error al copiar al portapapeles:', err);
          }
        }
      }
      if (ctxMenu) ctxMenu.style.display = 'none';
    });
  }

  // Selector de Paletas guardadas (Cargar paleta)
  if (selectFile) {
    selectFile.addEventListener('focus', recargarListaPaletas);
    selectFile.addEventListener('mousedown', recargarListaPaletas);
    selectFile.addEventListener('change', async (e) => {
      const filePath = e.target.value;
      if (!filePath) return;
      await cargarPaletaDesdeArchivo(filePath);
    });
  }

  // Botón Guardar Paleta (Abre diálogo para nombrar)
  if (btnSave) {
    btnSave.addEventListener('click', () => {
      abrirModalGuardarPaleta();
    });
  }
}

function mostrarToast(mensaje) {
  const toast = document.createElement('div');
  toast.className = 'color-copied-toast';
  toast.textContent = mensaje;
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(15, 23, 42, 0.96);
    color: #38bdf8;
    padding: 8px 18px;
    border-radius: 8px;
    border: 1px solid rgba(56, 189, 248, 0.35);
    font-size: 12px;
    font-weight: 600;
    box-shadow: 0 10px 25px rgba(0,0,0,0.55);
    z-index: 10000;
    pointer-events: none;
    transition: opacity 0.3s;
  `;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 1600);
}

// --------------------------------------------------------------------------
// Gestión de Archivos de Paletas en assets/palettes/*.md
// --------------------------------------------------------------------------

export async function recargarListaPaletas() {
  const selectFile = document.getElementById('select-palette-file');
  if (!selectFile) return;

  const inv = getInvoke();
  if (inv) {
    try {
      const paletas = await inv('listar_paletas');
      if (Array.isArray(paletas)) {
        const currentVal = selectFile.value;
        while (selectFile.options.length > 1) {
          selectFile.remove(1);
        }
        paletas.forEach(p => {
          const opt = document.createElement('option');
          opt.value = p.filePath;
          opt.textContent = p.paletteName.replace(/_/g, ' ');
          selectFile.appendChild(opt);
        });
        if (currentVal) selectFile.value = currentVal;
      }
    } catch (e) {
      console.warn('Error listando paletas:', e);
    }
  }
}

async function cargarPaletaDesdeArchivo(filePath) {
  const inv = getInvoke();
  if (!inv) return;
  try {
    const content = await inv('leer_paleta', { filePath });
    if (!content) return;

    // Extraer los 10 colores con expresiones regulares flexibles
    const colorRegex = /\*\*(?:color|slot)-?(\d+)\*\*:\s*([^\r\n]+)/gi;
    const coloresLeidos = [];
    let match;
    while ((match = colorRegex.exec(content)) !== null) {
      const idx = parseInt(match[1], 10) - 1;
      const colorVal = match[2].trim();
      if (idx >= 0 && idx < 10) {
        coloresLeidos[idx] = colorVal;
      }
    }

    if (coloresLeidos.length > 0) {
      for (let i = 0; i < 10; i++) {
        if (coloresLeidos[i]) {
          pickerState.palette[i] = coloresLeidos[i];
        }
      }

      // Extraer nombre de la paleta
      const nameMatch = content.match(/\*\*paletteName\*\*:\s*([^\r\n]+)/i);
      if (nameMatch) {
        pickerState.activePaletteName = nameMatch[1].trim();
      }

      // La carga de una paleta fija automáticamente el estado y pasa a modo libre
      pickerState.isPinned = true;
      pickerState.currentScheme = 'custom';
      const selectScheme = document.getElementById('select-color-scheme');
      if (selectScheme) selectScheme.value = 'custom';

      actualizarBotonFijar();
      guardarPaletaSesion();

      // Cargar el primer color en "Nuevo"
      if (pickerState.palette[0]) {
        cargarColorActivo(pickerState.palette[0]);
      }
      renderizarSlots();
      mostrarToast(`Paleta cargada: ${pickerState.activePaletteName.replace(/_/g, ' ')}`);
    }
  } catch (err) {
    console.error('Error al cargar paleta desde archivo:', err);
  }
}

function configurarModalNombrePaleta() {
  const modal = document.getElementById('modal-palette-name');
  const input = document.getElementById('input-palette-name');
  const btnClose = document.getElementById('btn-close-palette-name-modal');
  const btnCancel = document.getElementById('btn-cancel-palette-name');
  const btnConfirm = document.getElementById('btn-confirm-palette-name');

  if (!modal) return;

  const cerrarModal = () => {
    modal.classList.remove('active');
  };

  const ejecutarGuardado = async () => {
    let name = (input.value || '').trim();
    if (!name) name = 'Nueva_Paleta';

    // Reemplazo de espacios por guiones bajos
    const cleanName = name.replace(/\s+/g, '_').replace(/\.md$/i, '');
    const mdContent = `# Paleta \`Colección de 10 colores armónicos\`
\t**paletteName**: ${cleanName}

\t# colors \`Colores de la paleta\`
${pickerState.palette.map((c, i) => `\t\t**color-${i + 1}**: ${c}`).join('\n')}
`;

    const inv = getInvoke();
    if (inv) {
      try {
        await inv('guardar_paleta', { fileName: cleanName, content: mdContent });
        pickerState.activePaletteName = cleanName;
        await recargarListaPaletas();

        // Seleccionar la paleta guardada en el select
        const selectFile = document.getElementById('select-palette-file');
        if (selectFile) {
          for (let i = 0; i < selectFile.options.length; i++) {
            if (selectFile.options[i].text.toLowerCase() === cleanName.replace(/_/g, ' ').toLowerCase()) {
              selectFile.selectedIndex = i;
              break;
            }
          }
        }
        mostrarToast('¡Paleta guardada exitosamente!');
      } catch (e) {
        console.error('Error guardando paleta:', e);
      }
    }

    cerrarModal();
  };

  if (btnClose) btnClose.addEventListener('click', cerrarModal);
  if (btnCancel) btnCancel.addEventListener('click', cerrarModal);
  if (btnConfirm) btnConfirm.addEventListener('click', ejecutarGuardado);

  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        ejecutarGuardado();
      } else if (e.key === 'Escape') {
        cerrarModal();
      }
    });
  }
}

function abrirModalGuardarPaleta() {
  const modal = document.getElementById('modal-palette-name');
  const input = document.getElementById('input-palette-name');
  if (!modal || !input) return;

  // Pre-cargar nombre si ya existía una paleta activa
  if (pickerState.activePaletteName) {
    input.value = pickerState.activePaletteName.replace(/_/g, ' ');
  } else {
    input.value = 'Mi Paleta';
  }

  modal.classList.add('active');
  setTimeout(() => {
    input.focus();
    input.select();
  }, 50);
}

// --------------------------------------------------------------------------
// Función Pública: Abrir Color Picker
// --------------------------------------------------------------------------

export function abrirColorPicker(colorString, onApplyCallback) {
  const modal = document.getElementById('modal-color-picker');
  if (!modal) return;

  pickerState.onApplyCallback = onApplyCallback;

  // 1. Asignar el Color Original ÚNICAMENTE AQUÍ (Inmutable durante la sesión)
  pickerState.originalColor = colorString;
  const parsedOrig = parseColorString(colorString);
  const origSwatch = document.getElementById('color-preview-original');
  const origFill = document.getElementById('color-fill-original');
  actualizarVisualizacionSwatch(origSwatch, origFill, parsedOrig.r, parsedOrig.g, parsedOrig.b, parsedOrig.a);

  // 2. Formato de salida: respeta el formato original del texto editado
  pickerState.outputFormat = parsedOrig.format;
  const radioHex = document.getElementById('radio-format-hex');
  const radioRgba = document.getElementById('radio-format-rgba');
  if (parsedOrig.format === 'rgba' && radioRgba) {
    radioRgba.checked = true;
  } else if (radioHex) {
    radioHex.checked = true;
  }

  // 3. Cargar en "Nuevo", sliders y canvas
  cargarColorActivo(colorString);

  // 4. Si la paleta no está fijada y no es personalizada, calcular armonías
  if (!pickerState.isPinned && pickerState.currentScheme !== 'custom') {
    recalcularArmonias();
  } else {
    renderizarSlots();
  }

  // 5. Refrescar lista de paletas disponibles en assets/palettes
  recargarListaPaletas();

  modal.classList.add('active');
}

function configurarArrastreFlotante() {
  const modal = document.getElementById('modal-color-picker');
  const handle = document.getElementById('color-picker-drag-handle');
  if (!modal || !handle) return;

  let isDragging = false;
  let startX, startY, initialLeft, initialTop;

  handle.addEventListener('mousedown', (e) => {
    if (e.target.closest('button') || e.target.closest('select')) return;
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    const rect = modal.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const newLeft = Math.max(10, Math.min(window.innerWidth - 300, initialLeft + dx));
    const newTop = Math.max(10, Math.min(window.innerHeight - 200, initialTop + dy));
    modal.style.left = `${newLeft}px`;
    modal.style.top = `${newTop}px`;
    modal.style.right = 'auto';
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
  });
}
