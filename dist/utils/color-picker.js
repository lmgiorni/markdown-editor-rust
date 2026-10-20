// ==========================================================================
// MOTOR DEL SELECTOR DE COLOR TRIANGULAR (ESTILO PAINTER / PHOTOSHOP)
// ==========================================================================

// Estado interno del Color Picker
let pickerState = {
  hue: 280,            // 0 - 360
  sat: 0.8,           // 0 - 1
  val: 0.9,           // 0 - 1
  alpha: 1.0,         // 0 - 1
  outputFormat: 'hex', // 'hex' o 'rgba'
  originalColor: '#bc13fe',
  currentColor: '#bc13fe',
  activeSlotIndex: 0,
  palette: ['', '', '', '', '', ''],
  onApplyCallback: null,
  isDraggingHue: false,
  isDraggingTriangle: false
};

// Cargar paleta de sesión si existe
try {
  if (typeof sessionStorage !== 'undefined') {
    const savedPalette = sessionStorage.getItem('md-color-palette');
    if (savedPalette) {
      pickerState.palette = JSON.parse(savedPalette);
    }
  }
} catch (e) {
  console.warn('Error leyendo paleta de sesión:', e);
}

// --------------------------------------------------------------------------
// Conversiones cromáticas matemáticas (HSV <-> RGB <-> HEX <-> RGBA)
// --------------------------------------------------------------------------

export function hsvToRgb(h, s, v) {
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
// Inicialización del Color Picker y Renderizado en Canvas
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
  configurarPaletaSesion();
  configurarArrastreFlotante();
}

// Dibuja el anillo de tono y el triángulo equilátero interior
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
  // Vértices del triángulo equilátero orientado hacia arriba:
  // Vértice A (Arriba): Color Puro (Hue, Sat=1, Val=1)
  // Vértice B (Abajo-Izquierda): Blanco Puro (Sat=0, Val=1)
  // Vértice C (Abajo-Derecha): Negro Puro (Val=0)
  const vA = { x: CENTER, y: CENTER - TRIANGLE_R };
  const vB = { x: CENTER - TRIANGLE_R * Math.cos(Math.PI / 6), y: CENTER + TRIANGLE_R * Math.sin(Math.PI / 6) };
  const vC = { x: CENTER + TRIANGLE_R * Math.cos(Math.PI / 6), y: CENTER + TRIANGLE_R * Math.sin(Math.PI / 6) };

  // Renderizar degradado del triángulo
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(vA.x, vA.y);
  ctx.lineTo(vB.x, vB.y);
  ctx.lineTo(vC.x, vC.y);
  ctx.closePath();
  ctx.clip();

  // Fondo del color del Hue en vértice A
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
  // Mapear Saturation y Value a coordenadas del triángulo
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
  // s: saturación (0 a 1), v: valor (0 a 1)
  // Si v=0, es negro (punto C). Si v=1, s=0 es blanco (punto B), v=1, s=1 es puro (punto A)
  const wA = s * v;
  const wB = (1 - s) * v;
  const wC = 1 - v;
  return {
    x: wA * vA.x + wB * vB.x + wC * vC.x,
    y: wA * vA.y + wB * vB.y + wC * vC.y
  };
}

function triangleCoordsToHsv(x, y, vA, vB, vC) {
  // Coordenadas baricéntricas con clamp
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

// --------------------------------------------------------------------------
// Interacción de Ratón con el Canvas
// --------------------------------------------------------------------------

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
      return;
    }

    // Comprobar inicio de clic
    if (dist >= RING_INNER_R - 4 && dist <= RING_OUTER_R + 4) {
      pickerState.isDraggingHue = true;
      let angle = Math.atan2(dy, dx) * 180 / Math.PI;
      if (angle < 0) angle += 360;
      pickerState.hue = Math.round(angle);
      sincronizarDesdeHsv();
      dibujarCanvas();
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
// Sincronización Bidireccional de Controles UI
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

function sincronizarDesdeHsv() {
  const rgb = hsvToRgb(pickerState.hue, pickerState.sat, pickerState.val);
  const formatted = formatColorOutput(rgb.r, rgb.g, rgb.b, pickerState.alpha, pickerState.outputFormat);
  pickerState.currentColor = formatted;

  // Actualizar previsualización: bicapa con color sobre damero progresivo
  const newSwatch = document.getElementById('color-preview-new');
  const newFill = document.getElementById('color-fill-new');
  actualizarVisualizacionSwatch(newSwatch, newFill, rgb.r, rgb.g, rgb.b, pickerState.alpha);

  // Pista de opacidad progresiva: El color cubre gradualmente el damero físico
  const alphaGrad = document.getElementById('alpha-slider-gradient');
  if (alphaGrad) {
    alphaGrad.style.background = `linear-gradient(to right, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0), rgb(${rgb.r}, ${rgb.g}, ${rgb.b}))`;
  }

  // Actualizar campos de texto y número
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

function configurarControlesUI() {
  // Inputs numéricos R, G, B, A
  const inputR = document.getElementById('color-input-r');
  const inputG = document.getElementById('color-input-g');
  const inputB = document.getElementById('color-input-b');
  const inputA = document.getElementById('color-input-a');
  const inputHex = document.getElementById('color-input-hex');
  const rangeAlpha = document.getElementById('color-range-alpha');

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
    });
  }

  if (rangeAlpha) {
    rangeAlpha.addEventListener('input', (e) => {
      pickerState.alpha = parseInt(e.target.value, 10) / 100;
      sincronizarDesdeHsv();
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
      }
    });
  }

  // Radios de formato
  const radioHex = document.getElementById('radio-format-hex');
  const radioRgba = document.getElementById('radio-format-rgba');
  if (radioHex) radioHex.addEventListener('change', () => { pickerState.outputFormat = 'hex'; sincronizarDesdeHsv(); });
  if (radioRgba) radioRgba.addEventListener('change', () => { pickerState.outputFormat = 'rgba'; sincronizarDesdeHsv(); });

  // Clic en muestra de "Color Actual" restaura todos los valores al color original
  const origSwatch = document.getElementById('color-preview-original');
  if (origSwatch) {
    origSwatch.addEventListener('click', () => {
      if (pickerState.originalColor) {
        cargarColorEnPicker(pickerState.originalColor);
      }
    });
  }

  // Botones Aceptar y Cancelar
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
      cerrarModal();
    });
  }

  if (btnCancel) btnCancel.addEventListener('click', cerrarModal);
  if (btnClose) btnClose.addEventListener('click', cerrarModal);
}

// --------------------------------------------------------------------------
// Paleta de Sesión con Armonías (Complementario y Análogo)
// --------------------------------------------------------------------------

let contextMenuTargetIndex = null;

function configurarPaletaSesion() {
  const container = document.getElementById('color-palette-slots');
  const btnSave = document.getElementById('btn-save-to-palette');
  const ctxMenu = document.getElementById('palette-context-menu');
  const btnComplementary = document.getElementById('ctx-palette-complementary');
  const btnAnalogous = document.getElementById('ctx-palette-analogous');

  if (!container) return;

  const renderSlots = () => {
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
        slot.title = `Casilla ${idx + 1}: ${color} (Clic izq: cargar, Clic der: armonía)`;
      } else {
        slot.classList.remove('filled', 'has-transparency');
        slot.classList.add('empty');
        fill.style.backgroundColor = 'transparent';
        slot.title = `Casilla ${idx + 1}: Vacía`;
      }

      // Clic izquierdo: Cargar color
      slot.addEventListener('click', () => {
        pickerState.activeSlotIndex = idx;
        renderSlots();
        if (color) {
          cargarColorEnPicker(color);
        }
      });

      // Clic derecho: Menú contextual de armonía
      slot.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        pickerState.activeSlotIndex = idx;
        renderSlots();

        if (color && ctxMenu) {
          contextMenuTargetIndex = idx;
          ctxMenu.style.display = 'block';
          ctxMenu.style.left = `${e.clientX}px`;
          ctxMenu.style.top = `${e.clientY}px`;
        }
      });

      container.appendChild(slot);
    });
  };

  renderSlots();

  // Guardar paleta en sessionStorage
  const guardarPaleta = () => {
    try {
      sessionStorage.setItem('md-color-palette', JSON.stringify(pickerState.palette));
    } catch (e) {}
  };

  // Botón guardar color actual en casilla seleccionada
  if (btnSave) {
    btnSave.addEventListener('click', () => {
      const rgb = hsvToRgb(pickerState.hue, pickerState.sat, pickerState.val);
      const colorToSave = formatColorOutput(rgb.r, rgb.g, rgb.b, pickerState.alpha, pickerState.outputFormat);
      pickerState.palette[pickerState.activeSlotIndex] = colorToSave;
      guardarPaleta();
      renderSlots();
    });
  }

  // Ocultar menú contextual al hacer clic fuera
  document.addEventListener('click', (e) => {
    if (ctxMenu && !ctxMenu.contains(e.target)) {
      ctxMenu.style.display = 'none';
    }
  });

  // Opción 1: Color Complementario (+180° de Hue)
  if (btnComplementary) {
    btnComplementary.addEventListener('click', () => {
      if (contextMenuTargetIndex !== null) {
        const baseColor = pickerState.palette[contextMenuTargetIndex];
        if (baseColor) {
          const parsed = parseColorString(baseColor);
          const compHue = (parsed.h + 180) % 360;
          const compRgb = hsvToRgb(compHue, parsed.s, parsed.v);
          const compFormatted = formatColorOutput(compRgb.r, compRgb.g, compRgb.b, parsed.a, parsed.format);
          pickerState.palette[contextMenuTargetIndex] = compFormatted;
          guardarPaleta();
          renderSlots();
          cargarColorEnPicker(compFormatted);
        }
      }
      if (ctxMenu) ctxMenu.style.display = 'none';
    });
  }

  // Opción 2: Color Análogo (+30° de Hue)
  if (btnAnalogous) {
    btnAnalogous.addEventListener('click', () => {
      if (contextMenuTargetIndex !== null) {
        const baseColor = pickerState.palette[contextMenuTargetIndex];
        if (baseColor) {
          const parsed = parseColorString(baseColor);
          const anaHue = (parsed.h + 30) % 360;
          const anaRgb = hsvToRgb(anaHue, parsed.s, parsed.v);
          const anaFormatted = formatColorOutput(anaRgb.r, anaRgb.g, anaRgb.b, parsed.a, parsed.format);
          pickerState.palette[contextMenuTargetIndex] = anaFormatted;
          guardarPaleta();
          renderSlots();
          cargarColorEnPicker(anaFormatted);
        }
      }
      if (ctxMenu) ctxMenu.style.display = 'none';
    });
  }
}

// --------------------------------------------------------------------------
// Función Pública: Abrir Color Picker
// --------------------------------------------------------------------------

export function abrirColorPicker(colorString, onApplyCallback) {
  const modal = document.getElementById('modal-color-picker');
  if (!modal) return;

  pickerState.onApplyCallback = onApplyCallback;
  pickerState.originalColor = colorString;

  cargarColorEnPicker(colorString);

  modal.classList.add('active');
}

function cargarColorEnPicker(colorString) {
  const parsed = parseColorString(colorString);
  pickerState.hue = Math.round(parsed.h);
  pickerState.sat = parsed.s;
  pickerState.val = parsed.v;
  pickerState.alpha = parsed.a;
  pickerState.outputFormat = parsed.format;

  // Actualizar muestra original bicapa (color sobre damero si tiene alfa < 1)
  const origSwatch = document.getElementById('color-preview-original');
  const origFill = document.getElementById('color-fill-original');
  actualizarVisualizacionSwatch(origSwatch, origFill, parsed.r, parsed.g, parsed.b, parsed.a);

  // Sincronizar radio buttons
  const radioHex = document.getElementById('radio-format-hex');
  const radioRgba = document.getElementById('radio-format-rgba');
  if (parsed.format === 'rgba' && radioRgba) {
    radioRgba.checked = true;
  } else if (radioHex) {
    radioHex.checked = true;
  }

  sincronizarDesdeHsv();
  dibujarCanvas();
}


function configurarArrastreFlotante() {
  const modal = document.getElementById('modal-color-picker');
  const handle = document.getElementById('color-picker-drag-handle');
  if (!modal || !handle) return;

  let isDragging = false;
  let startX, startY, initialLeft, initialTop;

  handle.addEventListener('mousedown', (e) => {
    if (e.target.closest('button')) return;
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
