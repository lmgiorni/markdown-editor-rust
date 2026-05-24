/**
 * history-manager.js
 * Ecosistema de gestión de estados Undo / Redo Premium con Debounce para el Editor
 */

export class HistorialCambios {
  constructor(textarea, onRestore) {
    this.textarea = textarea;
    this.onRestore = onRestore;
    
    // Lista indexada de estados para Deshacer / Rehacer
    this.historial = [];
    this.indiceActual = -1;
    this.maxStates = 150; // Límite de seguridad para memoria
    
    // Control de debounce para atajos rápidos de formato
    this.ultimoFormatoTiempo = 0;
    this.debeConsolidarFormato = false;
    
    // Control de consolidación para escritura ordinaria de teclado
    this.typingTimer = null;
    this.estaEscribiendo = false;
    
    // Registrar estado inicial al cargar
    this.guardarEstado(textarea.value, textarea.selectionStart, textarea.selectionEnd, false);
  }

  // Guardar un nuevo estado en la pila
  guardarEstado(value, selectionStart, selectionEnd, esFormato = false, consolidar = false) {
    if (this.indiceActual < this.historial.length - 1) {
      this.historial = this.historial.slice(0, this.indiceActual + 1);
    }
    
    // Evitar guardar valores de texto idénticos consecutivos
    const ultimoEstado = this.historial[this.indiceActual];
    if (ultimoEstado && ultimoEstado.value === value) {
      ultimoEstado.selectionStart = selectionStart;
      ultimoEstado.selectionEnd = selectionEnd;
      return;
    }
    
    // Consolidación de formatos rápidos (Debounce premium)
    if (consolidar && ultimoEstado && ultimoEstado.esFormato) {
      ultimoEstado.value = value;
      ultimoEstado.selectionStart = selectionStart;
      ultimoEstado.selectionEnd = selectionEnd;
      ultimoEstado.timestamp = Date.now();
      return;
    }
    
    const nuevoEstado = {
      value,
      selectionStart,
      selectionEnd,
      timestamp: Date.now(),
      esFormato
    };
    
    this.historial.push(nuevoEstado);
    
    if (this.historial.length > this.maxStates) {
      this.historial.shift();
    } else {
      this.indiceActual++;
    }
  }

  // Se ejecuta ANTES de aplicar un formato por botón
  registrarCambioAntesDeFormato() {
    this.finalizarSesionEscritura();
    
    const ahora = Date.now();
    this.debeConsolidarFormato = (ahora - this.ultimoFormatoTiempo < 1500);
    
    if (!this.debeConsolidarFormato) {
      this.guardarEstado(
        this.textarea.value,
        this.textarea.selectionStart,
        this.textarea.selectionEnd,
        true
      );
    }
    
    this.ultimoFormatoTiempo = ahora;
  }

  // Se ejecuta DESPUÉS de aplicar el formato
  registrarCambioDespuesDeFormato() {
    this.guardarEstado(
      this.textarea.value,
      this.textarea.selectionStart,
      this.textarea.selectionEnd,
      true,
      this.debeConsolidarFormato
    );
  }

  // Monitorear entrada del teclado ordinaria (input)
  registrarEscritura() {
    if (!this.estaEscribiendo) {
      this.estaEscribiendo = true;
    }
    
    if (this.typingTimer) clearTimeout(this.typingTimer);
    this.typingTimer = setTimeout(() => {
      this.finalizarSesionEscritura();
    }, 1000);
  }

  // Finalizar sesión activa de escritura y confirmar el estado
  finalizarSesionEscritura() {
    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
      this.typingTimer = null;
    }
    
    if (this.estaEscribiendo) {
      this.estaEscribiendo = false;
      this.guardarEstado(
        this.textarea.value,
        this.textarea.selectionStart,
        this.textarea.selectionEnd,
        false
      );
    }
  }

  // Deshacer (Ctrl + Z)
  deshacer() {
    this.finalizarSesionEscritura();
    
    if (this.indiceActual > 0) {
      this.indiceActual--;
      const estado = this.historial[this.indiceActual];
      this.aplicarEstado(estado);
    }
  }

  // Rehacer (Ctrl + Y)
  rehacer() {
    this.finalizarSesionEscritura();
    
    if (this.indiceActual < this.historial.length - 1) {
      this.indiceActual++;
      const estado = this.historial[this.indiceActual];
      this.aplicarEstado(estado);
    }
  }

  // Aplicar el estado al editor físico y sincronizar
  aplicarEstado(estado) {
    this.textarea.value = estado.value;
    this.textarea.selectionStart = estado.selectionStart;
    this.textarea.selectionEnd = estado.selectionEnd;
    
    if (this.onRestore) {
      this.onRestore();
    }
  }
}
