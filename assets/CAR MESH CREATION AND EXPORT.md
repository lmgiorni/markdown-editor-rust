# Estudio Comparativo de Sistemas de Ensamblaje Geométrico Modular para Monoplazas de Competición

Este documento presenta un análisis técnico y metodológico detallado que contrasta dos enfoques para la construcción, personalización y ensamblaje de vehículos modulares en motores de juego de tiempo real: el **Sistema Estático Basado en Pivotes** y el **Sistema Esquelético Dinámico (Morph + Skin)**. Asimismo, se profundiza en los procesos de configuración requeridos en las herramientas de autoría 3D (3ds Max) y de integración (Unity) para el despliegue del sistema dinámico.

---

## 1. Análisis Comparativo de Sistemas de Ensamblaje

A la hora de diseñar un editor de vehículos que permita modificar tanto la apariencia estética como la configuración dimensional (longitud, anchura, geometría de la suspensión) de un monoplaza, la elección de la arquitectura geométrica subyacente condiciona el rendimiento, la facilidad de creación de contenido y la precisión mecánica.

### Sistema A: Ensamblaje Estático por Pivotes y Jerarquías de GameObjects

Este enfoque tradicional fragmenta el vehículo en piezas rígidas independientes independientes (chasis, alerón delantero, pontones, brazos de suspensión, ruedas). Cada pieza posee un pivote local calibrado que dicta su punto de acoplamiento a un nodo padre en el motor de juego.

* **Ventajas:**
    * **Rendimiento Óptimo en Runtime:** Cada componente se renderiza como un `MeshFilter` estático acoplado a un `MeshRenderer`. La GPU procesa las transformaciones a nivel de matriz de transformación de instancias (`Transform`), lo que consume mínimos recursos.
    * **Simplicidad de Pipeline:** No requiere procesos complejos de deformación ni asignación de pesos de vértices (*weight painting*). La exportación e importación son lineales.
    * **Mapeado UV Invariable:** Al no existir deformación topológica de los componentes, las coordenadas UV nunca sufren distorsiones. Las texturas, patrocinadores y libreas (*liveries*) se proyectan con total fidelidad.
* **Desventajas:**
    * **Rigidez Absoluta:** Las piezas no pueden cambiar de forma individual sin crear variantes únicas de modelado. Los cambios se limitan a traslación, rotación y escala uniforme.
    * **Desconexión Mecánica:** Si el chasis se ensancha o se alarga por código, los puntos de anclaje visuales de elementos dinámicos complejos (como los parantes de la suspensión) se separan físicamente, obligando a recalcular escalas complejas por código C# para intentar rellenar los huecos vacíos.

### Sistema B: Ensamblaje Esquelético Dinámico (Morph + Skin)

Este sistema unifica la geometría modular bajo una arquitectura orgánica/mecánica controlada por un esqueleto de huesos (*bones*) y deformadores de deformación geométrica por software (*Morph Targets* o *BlendShapes*). Los cambios volumétricos globales se manejan por deformadores y los anclajes y longitudes específicos por la escala y traslación de articulaciones.

* **Ventajas:**
    * **Continuidad Estética y Mecánica Absoluta:** Permite transiciones fluidas de formas. Si una zona se ensancha, la geometría circundante se adapta orgánicamente.
    * **Resolución Automatizada de la Suspensión:** Los puntos de anclaje en el chasis se mueven dinámicamente junto con la deformación general de los vértices, arrastrando consigo a los huesos de control. Las restricciones direccionales (*Aim Constraints*) en Unity reorientan automáticamente los parantes de la suspensión para que apunten a los anclajes correctos de forma nativa.
    * **Flexibilidad en la Configuración:** Un solo asset base puede generar infinitas variantes morfológicas en tiempo de ejecución, reduciendo la necesidad de modelar cientos de piezas estáticas individuales.
* **Desventajas:**
    * **Costo de Procesamiento Computacional:** La deformación de mallas mediante `SkinnedMeshRenderer` obliga a calcular de forma continua la influencia de múltiples huesos sobre miles de vértices por cada fotograma, lo que impacta la CPU y GPU si se ejecutan múltiples vehículos en pista de manera simultánea.
    * **Riesgo de Distorsión de UVs:** Al estirar o comprimir una pieza alterando las posiciones de los huesos o los pesos de los deformadores, las coordenadas UV de los vértices se estiran proporcionalmente, lo que puede deformar logotipos publicitarios u texturas técnicas aplicadas en la superficie.
    * **Complejidad de Pipeline Crítica:** Eleva drásticamente los tiempos de desarrollo técnico (*Tech Art*), exigiendo una precisión absoluta en el *rigging*, el pintado de pesos y la gestión de jerarquías esqueléticas.

### Matriz de Evaluación Comparativa

| Criterio Técnico | Sistema A: Estático por Pivotes | Sistema B: Dinámico (Morph + Skin) |
| :--- | :--- | :--- |
| **Costo Computacional (Runtime)** | Extremadamente bajo (Instanciado directo) | Medio-Alto (Dependiente del número de vértices/huesos) |
| **Precisión de Suspensión Dinámica** | Deficiente (Requiere lógica C# ad-hoc propensa a fallas) | Excelente (Nativo mediante restricciones de huesos) |
| **Modularidad de Accesorios** | Alta (Mediante jerarquías simples de nodos) | Excelente (Los huesos funcionan como sockets inteligentes) |
| **Estabilidad de Libreas/Decals** | Perfecta (UVs estáticas e inalterables) | Crítica (Riesgo de estiramiento por deformación) |
| **Tiempo de Producción 3D** | Bajo-Moderado | Muy Alto (Requiere Rigging y Morphing riguroso) |

---

## 2. Flujo de Trabajo y Configuración Completa en 3ds Max

Para implementar con éxito el **Sistema B (Morph + Skin)**, la preparación de los archivos en el software de autoría 3D es el paso más crítico. Una mala jerarquía o un pintado de pesos descuidado arruinará la integración en Unity.

### 2.1. Estructura de Pivotes y Modelo Base (Root)
1.  **Alineación del Modelo:** El monoplaza o pieza modular debe modelarse centrado en el origen global del software `(X:0, Y:0, Z:0)` orientado hacia el eje de avance estándar del motor de juego final.
2.  **Configuración del Root:** El pivote del objeto raíz (`Root`) debe estar ubicado estrictamente en el origen matemático. Este nodo funcionará como el anclaje físico y el centro de masa principal de la pieza para los cálculos del sistema de físicas del motor de juego, abstrayéndose de las deformaciones visuales. Los pivotes de las geometrías asociadas pueden permanecer centrados en sus masas locales respectivas sin afectar el comportamiento físico.

### 2.2. Creación y Configuración de Morph Targets
El modificador *Morpher* en 3ds Max se encargará de los cambios de volumen estéticos y macro, como el abultamiento de los pontones, el perfil aerodinámico de la nariz o la altura de la toma de aire del motor.

1.  **Duplicación de Mallas:** Extrae copias idénticas de la malla base para usarlas como objetivos de deformación (*Morph Targets*). **Es imperativo no alterar el orden ni el conteo de vértices en los duplicados**. Cualquier adición, eliminación o soldadura de vértices corromperá el indexado topológico.
2.  **Esculpido de Variaciones:** Modifica la forma de los duplicados moviendo los vértices únicamente con herramientas de deformación o traslación. Desarrolla variantes claras, por ejemplo: `Chassis_Ponton_Ancho`, `Chassis_Ponton_Estrecho`, `Nariz_Corta`, `Nariz_Larga`.
3.  **Aplicación del Modificador:** En la malla original del auto, aplica el modificador **Morpher** situado en la parte inferior de la pila de modificadores (debe estar colocado por debajo del modificador de pesado de piel *Skin*).
4.  **Carga de Canales:** En los canales vacíos del modificador Morpher, selecciona la opción *Pick Object from Scene* y haz clic sobre las mallas modificadas correspondientes. Prueba los deslizadores del canal de 0 a 100 para verificar que la interpolación lineal se realice de manera limpia.

### 2.3. Configuración del Sistema de Huesos (Bones System) y Sockets
Los huesos resolverán los anclajes estructurales de piezas añadidas y los componentes de articulación mecánica variable (longitud de chasis, suspensión y masas de freno).

1.  **Diseño de la Jerarquía de Huesos:** Crea un sistema esquelético jerárquico estructurado de la siguiente forma:
    * `Bone_Root` (En el origen 0,0,0).
    * `Bone_Chassis_Center` (Controla el núcleo central).
        * `Bone_Anchor_Susp_FL_Upper` / `Lower` (Huesos ubicados con precisión milimétrica en los puntos de pivote donde los parantes de la suspensión delantera izquierda se atornillan al chasis).
        * `Bone_Anchor_Susp_FR_Upper` / `Lower` (Idéntico para el lado derecho).
        * `Bone_FrontWing_Attach` (Hueso en la punta del chasis que controla el acoplamiento y longitud del alerón delantero).
2.  **Huesos Mecánicos Independientes:** Diseña las barras de suspensión y el porta-masas como cadenas óseas separadas dentro del mismo archivo o en estructuras vinculadas:
    * `Bone_Susp_Strut_FL` (Ubicado en el origen físico de la barra de suspensión, apuntando hacia la rueda).
    * `Bone_Hub_FL` (Hueso ubicado en el centro exacto de la rueda y el porta-masas de freno, actuando como hijo del extremo de la suspensión).

### 2.4. Pintado de Influencias (Modificador Skin)
Este proceso determina qué vértices de la carrocería se deforman cuando los huesos de anclaje se mueven para alterar longitudes o anchuras.

1.  **Adición del Modificador:** Añade el modificador **Skin** por encima del modificador *Morpher* en la pila.
2.  **Carga de Huesos:** Agrega todos los huesos creados a la lista del modificador Skin.
3.  **Pintado Rígido vs. Elástico:**
    * **Zonas Mecánicas/Sockets:** Para los vértices que constituyen los puntos de anclaje de la suspensión o accesorios, pinta su peso de manera estrictamente **rígida** (Influencia de `1.0` al hueso de anclaje específico y `0.0` a los demás). Esto garantiza que el socket se mueva firmemente con el hueso sin sufrir distorsiones orgánicas indeseadas.
    * **Zonas de Transición Dimensional:** Para deformaciones de longitud (como alargar la trompa del auto), pinta los pesos con un degradado suave (*Soft Selection* o *Vertex Weight Blend*) entre el `Bone_Chassis_Center` y el `Bone_FrontWing_Attach`. Al desplazar el hueso del alerón hacia adelante, la carrocería se estirará de forma progresiva y elegante.

### 2.5. Pipeline de Exportación FBX
1.  Selecciona el modelo geométrico y la jerarquía de huesos completa.
2.  Abre el cuadro de diálogo de exportación de **FBX**.
3.  **Configuraciones Críticas:**
    * **Geometry:** Asegúrate de activar **Deformed Models**, **Boned**, **Skin** y de manera crucial **Deformed Models / Blend Shapes** (Esta casilla expone los canales del modificador Morpher hacia Unity).
    * **Axis Conversion:** Configura el eje de salida de acuerdo con los estándares de Unity (Up Axis: `Y-Up`).
    * **Animation:** Aunque el modelo no contenga animaciones grabadas en la línea de tiempo, la casilla de animación debe estar habilitada para poder empaquetar la estructura de articulaciones dinámicas (*Rig*) correctamente dentro del archivo contenedor FBX.

---

## 3. Integración, Programación y Configuración en Unity

Una vez importado el archivo FBX en Unity, el motor gráfico reconocerá el modelo como una estructura esquelética acompañada por un componente de renderizado dinámico y un diccionario de formas clave.

### 3.1. Configuración del Skinned Mesh Renderer y BlendShapes
Al arrastrar el prefab importado a la escena, Unity generará automáticamente un GameObject con el componente **Skinned Mesh Renderer** en lugar del típico `MeshFilter`.

1.  **Verificación de Canales:** En el componente `SkinnedMeshRenderer`, despliega la pestaña de **BlendShapes**. Verás la lista de canales que configuraste en el modificador Morpher de 3ds Max con valores deslizantes que oscilan entre `0` y `100`.
2.  **Control por Software (C#):** Las modificaciones morfológicas se manipulan en tiempo de ejecución a través del método `SetBlendShapeWeight`. El siguiente script de ejemplo demuestra cómo vincular la interfaz del editor de vehículos con las deformaciones de la carrocería:

```csharp
using UnityEngine;

public class CarGeometryController : MonoBehaviour
{
    private SkinnedMeshRenderer skinnedMeshRenderer;
    
    // Índices de los canales de BlendShapes
    private int pontonAnchoIndex;
    private int narizLargaIndex;

    void Awake()
    {
        skinnedMeshRenderer = GetComponentInChildren<SkinnedMeshRenderer>();
        
        if (skinnedMeshRenderer != null)
        {
            // Localizar los índices por nombre para evitar errores de ordenado
            pontonAnchoIndex = skinnedMeshRenderer.sharedMesh.GetBlendShapeIndex("Chassis_Ponton_Ancho");
            narizLargaIndex = skinnedMeshRenderer.sharedMesh.GetBlendShapeIndex("Nariz_Corta");
        }
    }

    /// <summary>
    /// Ajusta el ancho de los pontones laterales (Parámetro valor entre 0.0f y 1.0f)
    /// </summary>
    public void AdjustPontoonWidth(float value)
    {
        if (pontonAnchoIndex != -1)
        {
            // Unity mapea las BlendShapes en rangos de 0 a 100
            skinnedMeshRenderer.SetBlendShapeWeight(pontonAnchoIndex, value * 100f);
        }
    }
}

```

### 3.2. Configuración de Restricciones Mecánicas usando Animation Rigging

Para resolver el problema clásico de mantener los parantes de la suspensión perfectamente alineados con los anclajes del chasis cuando estos se deforman o extienden, utilizaremos el paquete oficial Animation Rigging de Unity. Esto elimina la necesidad de programar cálculos trigonométricos costosos en scripts C# manuales.

* **Instalación del Paquete:** Ve a Window > Package Manager, busca e instala Animation Rigging.


* **Setup del Rig Builder:** En el GameObject raíz de tu vehículo, añade el componente Rig Builder.


* **Creación del Nodo Rig:** Crea un GameObject hijo llamado Suspension_Rig y añádele el componente Rig. Vincula este nodo dentro de la lista Rig Layers del componente Rig Builder principal.


* **Implementación de Aim Constraints (Restricciones de Orientación):** Para cada barra o parante de la suspensión (Bone_Susp_Strut_FL), añade un GameObject hijo bajo el Rig con el componente Aim Constraint.


* **Constrained Object:** Arrastra el hueso de la barra de suspensión (Bone_Susp_Strut_FL).


* **Source Objects:** Arrastra el hueso de anclaje correspondiente en el chasis (Bone_Anchor_Susp_FL_Upper). Esto le indica al sistema que la barra de la suspensión debe "mirar" fijamente hacia ese punto del chasis de forma permanente.


* **Aim Vector & Up Vector:** Configura los vectores direccionales (por ejemplo, eje Z: 1 si el hueso apunta de forma longitudinal) para que la rotación no se invierta de manera errónea.


* **Actualización Dinámica:** Cuando el jugador mueve los deslizadores morfológicos o altera la escala del chasis, el vértice de la carrocería arrastra el hueso de anclaje. El sistema de Animation Rigging intercepta esta nueva posición y rota instantáneamente la barra de la suspensión en hilos de procesamiento de bajo nivel (C# Job System), asegurando una consistencia mecánica perfecta sin retrasos en los fotogramas.



---

## 4. Estrategias Avanzadas de Optimización y Rendimiento

Si bien el enfoque esquelético y de formas clave ofrece una versatilidad sin precedentes en el editor de personalización del coche, mantener este sistema activo durante las carreras con múltiples monoplazas en pista comprometería severamente el rendimiento del simulador. Es vital implementar técnicas de congelación geométrica y prevención de distorsión de texturas.

### 4.1. Proceso de "Baking" (Congelado de Mallas) en Tiempo de Ejecución

Para evitar el alto costo de renderizado que suponen los cálculos continuos de deformaciones óseas y BlendShapes del componente SkinnedMeshRenderer durante la competencia, se debe realizar un volcado de datos (Baking) hacia una malla estática tradicional una vez que el usuario finalice el diseño de su vehículo.

* **Paso 1:** El usuario diseña el monoplaza en el taller interactivo interactuando con los deslizadores de huesos y BlendShapes activos.


* **Paso 2:** Al guardar la configuración y prepararse para ingresar a la pista de carreras, un script C# ejecuta el método SkinnedMeshRenderer.BakeMesh().


* **Paso 3:** Este método captura el estado deformado exacto de los vértices en ese instante preciso y genera un asset de tipo Mesh estático e independiente en la memoria.


* **Paso 4:** El script destruye o desactiva el componente SkinnedMeshRenderer y la jerarquía compleja de huesos, reemplazándolo por un componente ligero de tipo MeshFilter y un MeshRenderer tradicional asociados a la nueva malla estática generada.


* **Paso 5:** Los puntos de anclaje finales calculados para las ruedas y las colisiones físicas se copian a transformaciones estáticas simples. El auto ahora corre en pista consumiendo el mínimo de recursos gráficos posibles, idéntico al óptimo rendimiento del Sistema A.



---

### 4.2. Mitigación de Distorsión en Mapeados UV y Proyección de Decals

La escala de los huesos en ejes específicos o la interpolación lineal de mallas con BlendShapes provoca que las coordenadas de textura UV sufran estiramientos proporcionales a la deformación espacial sufrida por los polígonos. Esto se vuelve inaceptable al colocar calcomanías comerciales precisas en los laterales de la carrocería.

Para resolver este inconveniente técnico, se plantean dos soluciones combinadas:

* **Zonas UV de Escala Cero (Mapeado Segmentado):** Al diseñar el mapa UV de la carrocería en 3ds Max, segmenta las islas UV de los paneles laterales propensos a estirarse de forma aislada. Si la deformación se realiza mediante BlendShapes, procura que los vértices donde se ubican las marcas publicitarias principales se desplacen de forma puramente rígida y uniforme en un bloque compacto, evitando deformaciones angulares internas que distorsionen los logotipos.


* **Sistema de Proyección de Calcomanías en Runtime (Decal Projectors):** En lugar de pintar los logotipos directamente sobre la textura difusa de la carrocería base, implementa proyectores de calcomanías (Decal Projector en URP o HDRP de Unity).


* **Funcionamiento:** Las calcomanías se instancian como proyectores independientes orientados volumétricamente hacia la superficie del coche.


* **Integración con Morphing:** Al finalizar el proceso de personalización y tras ejecutar el BakeMesh descripto en el apartado anterior, los proyectores disparan sus texturas sobre la malla estática final ya deformada. Como la proyección se calcula de manera tridimensional sobre la topología resultante y espacial del monoplaza, los logotipos mantienen sus proporciones y su aspecto original de forma idéntica, ignorando por completo cualquier estiramiento previo en el mapeado UV subyacente de la carrocería base.