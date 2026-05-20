**DOCUMENTO DE DISEÑO TÉCNICO: HUMANITY ENGINE (v5.0)**

**Proyecto:** GP\_Paddock (F1 Manager 90s)
**Módulo:** Sistema de Simulación Psicológica y Ontológica
**Versión:** 5.0 – Consolidado
**Estado:** Listo para Implementación

**1. INTENCIÓN Y FILOSOFÍA DEL SISTEMA**

**1.1. Visión General**

El **Humanity Engine** no es un sistema de estadísticas lineales (como los RPG tradicionales), sino un simulador de la condición humana basado en la **Antropología Tomista**. Su objetivo es modelar la psique de los personajes (ingenieros, pilotos) como una interacción dinámica entre su naturaleza intrínseca y las presiones del entorno.

**1.2. Pilares Filosóficos**

* **Potencia vs. Acto:** El sistema distingue entre lo que el sujeto *puede* ser o hacer (**Potencia/Envelopes**) y lo que efectivamente manifiesta en la realidad (**Acto/**$P\_{a}$).
* **La Virtud como Equilibrio:** Siguiendo el concepto del "Justo Medio", la virtud se define como la estabilidad en el centro del plano moral, mientras que el vicio es la oscilación extrema o la dispersión.
* **El Discernimiento:** El objetivo del jugador (Manager) no es "subir niveles" de un empleado, sino realizar un ejercicio de discernimiento: descubrir la topología oculta del sujeto para colocarlo en un entorno donde sus capacidades florezcan y sus vicios no sean detonados.

**2. CONCEPTOS FUNDAMENTALES**

**2.1. La Topología de Envelopes (Envolventes)**

El sistema abandona los valores numéricos simples por **Áreas de Operación (Polígonos)** dibujadas sobre planos cartesianos.

* **El Envelope:** Representa la finitud humana. Todo estímulo que cae *dentro* del área es soportado o procesado con normalidad. Todo lo que cae *fuera* genera crisis, trauma o fallo.

**2.2. La Tensión Vectorial (**$P\_{i}$**vs**$P\_{a}$**)**

El estado anímico se define por la relación entre dos vectores:

1. **Intención (**$P\_{i}$**):** El "Corazón". Representa lo que el sujeto desea o su tendencia natural profunda.
2. **Acto (**$P\_{a}$**):** La "Máscara". Representa la conducta visible y el resultado final de la acción.

**3. ARQUITECTURA DEL SUJETO (LAS 5 DIMENSIONES)**

Cada personaje posee cinco gráficos de radar (Envelopes). La interacción con el mundo ocurre a través de estos ejes:

**Tabla 1: Dimensiones del Ser y sus Ejes de Tensión**

| **Dimensión** | **Eje Y (Estructura / Juicio)** | **Eje X (Energía / Impulso)** | **Lógica del Área (Envelope)** |
| --- | --- | --- | --- |
| **1. BIOLÓGICA** | Robustez $\leftrightarrow $ Gracilidad | Explosividad $\leftrightarrow $ Resistencia | **Capacidad:** Define el límite físico y somático. |
| **2. SENSORIAL** | Espectro (Ej: Agudos $\leftrightarrow $ Graves) | Sutileza $\leftrightarrow $ Amortiguación | **Rango:** Define qué información entra al cerebro. |
| **3. COGNITIVA** | Análisis $\leftrightarrow $ Intuición | Enfoque Túnel $\leftrightarrow $ Visión Global | **Procesamiento:** Capacidad de resolver problemas. |
| **4. RELACIONAL** | Apertura $\leftrightarrow $ Hermetismo | Empatía $\leftrightarrow $ Pragmatismo | **Interfaz:** Calidad del vínculo con otros sujetos. |
| **5. ESPIRITUAL** | Soberbia $\leftrightarrow $ Pusilanimidad | Ira/Valor $\leftrightarrow $ Acidia/Miedo | **Virtud (Inversa):** Área pequeña = Estabilidad / Área grande = Vicio. |

**4. EL ENTORNO Y LA GENERACIÓN DE ESTÍMULOS**

El mundo no envía valores, sino **Vectores de Presión**. Estos se dividen en tres capas:

1. **Capa Física (Materia):** Variables objetivas (Temperatura, Ruido, Visibilidad).
2. **Capa Abstracta (Espacio):** Contextos operativos (Privacidad, Saturación de elementos, Accesibilidad).
3. **Capa Atmosférica (Espíritu):** Presiones psicológicas (Tensión ambiental, Orden vs Caos, Teleología del lugar).

**5. EL MOTOR DE TRANSDUCCIÓN (FLUJO LÓGICO)**

La "magia" del sistema ocurre en el puente entre el entorno y la voluntad. El flujo de procesamiento es el siguiente:

$$Evento\rightarrow Dimensi?n Primaria\rightarrow Filtro de Resonancia\rightarrow Desplazamiento Vectorial\rightarrow Acto (P\_{a})$$

**5.1. El Filtro de Resonancia (Hitos y Traumas)**

Antes de que un evento afecte la moral, pasa por el historial del sujeto (HumanityData).

* Si el estímulo coincide con un **Hito** (ej: el sonido de un motor rompiéndose resuena con un trauma previo), la señal "salta" la dimensión física y golpea directamente la **Dimensión Espiritual**.

**5.2. Cálculo de Disonancia y Fatiga Moral**

Cuando el sujeto intenta mantener una máscara ($P\_{a}$) diferente a su intención ($P\_{i}$), se genera **Fatiga Moral**.

$$Fatiga Moral=?(Distancia P\_{i}\rightarrow P\_{a})×Multiplicador de Contexto$$

* **Contextos:** Fábrica (x0.2), Práctica (x1.5), Carrera (x5.0).

**5.3. El Colapso y la Gracia**

* **Colapso:** Si $Fatiga Moral>Voluntad$, ocurre un rebote violento donde $P\_{a}$ es absorbido por $P\_{i}$. La máscara se rompe y el sujeto actúa según su vicio o miedo más profundo.
* **Gracia:** Evento extraordinario que mueve a $P\_{i}$ asintóticamente (85%) hacia el centro $\left(0\right)$ y limpia la fatiga acumulada.

**6. INTERFAZ NARRATIVA: HUMANITY SPEAKER**

El sistema de diálogos no usa frases predefinidas, sino un **Ensamblador Dinámico** basado en el vector dominante de $P\_{a}$.

**6.1. Capas de Construcción del Mensaje**

1. **Capa Superficial (Cuadrante):** Selecciona la base del mensaje según el cuadrante de $P\_{a}$ (ej: Soberbia + Ira).
2. **Capa de Partículas (Sintaxis Anímica):** Inyecta modificadores según la dominancia:
   * **Ira:** Exclamaciones y urgencia ("¡Ya!", "¡Maldita sea!").
   * **Acidia:** Muletillas de desinterés ("bueh...", "total...").
   * **Soberbia:** Adverbios de certeza ("obviamente", "indiscutiblemente").
   * **Duda/Pusilanimidad:** Adverbios de inseguridad ("quizás", "creo que").
3. **Capa Profunda (Fisuras):** Si la Fatiga Moral es alta, el sistema inserta un pensamiento oculto entre paréntesis que revela $P\_{i}$.

**Ejemplo de salida:** *"Obviamente el problema está en los carburadores... (pero no tengo ni idea de cómo arreglarlo sin quedar en ridículo)."*

**7. RESUMEN DE COMPONENTES TÉCNICOS (UNITY/C#)**

| **Componente** | **Tipo** | **Función Principal** |
| --- | --- | --- |
| HumanityData | ScriptableObject | Almacena los Envelopes, Voluntad y Hitos del personaje. |
| HumanityEngine | MonoBehaviour | Calcula la física moral frame-a-frame y gestiona $P\_{i}$ y $P\_{a}$. |
| EnvironmentManager | MonoBehaviour | Genera los vectores de presión según el escenario actual. |
| HumanitySpeaker | MonoBehaviour | Ensambla el texto final usando la lógica de partículas y fisuras. |
| VoiceFragments | ScriptableObject | Base de datos de fragmentos de texto organizados por cuadrantes. |
