# Plan de Implementación Pragmática para Summa Scriptura

## Visión General

Este plan implementa mejoras en la modularidad de Summa Scriptura siguiendo el enfoque pragmático sugerido, que agrupa funcionalidades afines en 8 módulos planos sin crear estructuras artificiales profundas.

## Objetivo Principal
Reducir el tamaño de `dist/main.js` de ~967 líneas a ~120 líneas manteniendo toda la funcionalidad existente.

## Estructura Modular Propuesta

```text
dist/
├── main.js                  <-- Orquestador ultraligero (~120 líneas)
├── modules/
│   ├── file-manager.js      <-- Todo el ciclo de vida del documento (Abrir, Guardar, Versionado, Historial y Drag & Drop)
│   ├── editor-engine.js     <-- Escritura, formateo Markdown, sangría automática y Tab-to-indent
│   ├── reader-engine.js     <-- Renderizado Markdown, KaTeX, scroll sincronizado y desplazamiento con inercia
│   ├── layout-manager.js    <-- Control de vistas (Editor / Split / Visor) y proporciones de pantalla
│   ├── shortcuts-manager.js <-- Central de atajos de teclado globales (Ctrl+S, Ctrl+O, etc.)
│   ├── export-manager.js    <-- Exportaciones HTML, PDF, EPUB y plantillas dinámicas
│   ├── structured-editor.js <-- Modo Estructurado (Árbol, JSON, YAML, XML)
│   ├── theme-manager.js     <-- Gestión de temas y Theme Playground
│   └── ui-dialogs.js        <-- Ventanas emergentes, estadísticas, biblioteca lateral y menú contextual
```

## Fase 1: Diagnóstico y Preparación (Semana 1)

### Objetivos:
- Identificar bloques pesados en main.js que deben ser movidos
- Establecer métricas de éxito
- Crear entorno de desarrollo para pruebas

### Actividades:
1. **Análisis detallado de main.js**:
   - Localizar los 4 bloques principales que ocupan más de 500 líneas
   - Documentar funcionalidades específicas de cada bloque

2. **Establecer métricas de calidad**:
   - Tamaño objetivo para main.js: < 150 líneas
   - Tamaño máximo por módulo: < 500 líneas
   - Cobertura de funcionalidad: 100%

3. **Configurar entorno de desarrollo**:
   - Instalar herramientas de análisis de código
   - Configurar sistema de pruebas unitarias
   - Preparar entorno para refactorización incremental

## Fase 2: Implementación Pragmática (Semanas 2-4)

### Objetivo:
Mover funcionalidades específicas de main.js a sus módulos correspondientes, reduciendo el tamaño de main.js.

### Actividades Específicas:

#### Semana 2: Mover eventos de interacción al motor del editor
1. **Crear `dist/modules/editor-engine.js`** (si no existe)
2. **Mover bloques de código desde main.js**:
   - *Tab-to-indent* y escuchadores del área de escritura (`click`, `dblclick`, `input`)
   - Funcionalidad de detección de clics sobre códigos de color
   - Monitoreo de tipeo en vivo
3. **Resultado**: main.js se aligera en ~160 líneas

#### Semana 3: Mover física de scroll y cursores al motor del lector
1. **Mover bloques de código desde main.js**:
   - Cálculo de aceleración, desaceleración suave y fricción del visor (`aplicarInerciaScroll`)
   - Dibujo del cursor en las barras de desplazamiento
2. **Resultado**: main.js se aligera en ~140 líneas adicionales

#### Semana 4: Crear módulos especializados y mover atajos
1. **Crear `dist/modules/shortcuts-manager.js`**:
   - Central de atajos de teclado globales
   - Manejo de eventos `window.addEventListener('keydown')`
2. **Crear `dist/modules/layout-manager.js`**:
   - Función `cambiarVista`
   - Botones de visualización (Editor, Split, Preview)
3. **Resultado**: main.js se aligera en ~220 líneas adicionales

## Fase 3: Validación y Refinamiento (Semana 5)

### Objetivo:
Garantizar que todas las mejoras funcionan correctamente sin romper funcionalidad existente.

### Actividades:
1. **Ejecutar pruebas unitarias**
2. **Realizar pruebas de integración**
3. **Validar funcionalidad completa**
4. **Verificar rendimiento**

## Fase 4: Documentación y Entrega (Semana 6)

### Objetivo:
Documentar los cambios y preparar para producción.

### Actividades:
1. **Actualizar documentación técnica**
2. **Crear guía de migración para desarrolladores**
3. **Documentar nuevas APIs**
4. **Preparar informe de mejoras**

## Metodología de Implementación

### Enfoque Incremental:
- Implementar cambios en pequeños incrementos
- Mantener compatibilidad con funcionalidad existente
- Realizar pruebas continuas después de cada cambio

### Prácticas Recomendadas:
1. **Control de Versiones**: Usar ramas para cada mejora
2. **Pruebas Automáticas**: Implementar suite de pruebas unitarias
3. **Code Review**: Revisión por pares antes de fusionar
4. **Documentación**: Actualizar documentación con cada cambio

## Recursos Necesarios

### Humanos:
- Desarrollador principal (20 horas/semana)
- Revisor de código (5 horas/semana)

### Tecnológicos:
- Entorno de desarrollo configurado
- Herramientas de análisis estático
- Sistema de pruebas automatizadas

## Riesgos y Mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| Regresiones funcionales | Suite de pruebas completa |
| Tiempo de implementación excesivo | Entrega incremental por fases |
| Complejidad técnica alta | Implementación en paralelo con equipo |
| Impacto en rendimiento | Pruebas de rendimiento continuas |

## Indicadores de Éxito

1. **Reducción del tamaño de main.js**: De ~967 líneas a ~120 líneas
2. **Cobertura de funcionalidad**: 100% funcionalidad existente
3. **Facilidad de mantenimiento**: Evaluación de desarrolladores < 15% más tiempo
4. **Compatibilidad**: 100% funcionalidad existente

## Cronograma Estimado

| Fase | Duración | Entregables |
|------|----------|-------------|
| Diagnóstico y Preparación | 1 semana | Análisis, métricas, entorno |
| Implementación Pragmática | 3 semanas | Módulos movidos |
| Validación | 1 semana | Pruebas completas |
| Documentación | 1 semana | Documentación actualizada |

## Seguimiento y Evaluación

- Reuniones semanales de revisión
- Métricas de calidad mensuales
- Feedback del equipo de desarrollo
- Evaluación de impacto en rendimiento

Este plan proporciona una ruta clara para implementar las mejoras en modularidad y organización del código, manteniendo la funcionalidad existente mientras se incrementa la mantenibilidad y escalabilidad del proyecto, siguiendo el enfoque pragmático recomendado.