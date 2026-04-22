**1\. Objetivos del proyecto**

* **Objetivo General:** Desarrollar "MasterForge", una plataforma de gestión (ERP/CRM) y motor de creación de personajes automatizado, exclusivo para el sistema Dungeons & Dragons 5ª Edición (D\&D 5e), orientado a Directores de Juego profesionales (Pro-GMs) y sus Jugadores.  
* **Objetivos Específicos:**  
  * Implementar un "Motor de Reglas" en el backend (Kotlin) capaz de calcular automáticamente estadísticas derivadas (modificadores, CA, PG máximos, bonificadores de competencia) basándose en la raza, clase y nivel del personaje.  
  * Desarrollar un módulo CRM para que el Director de Juego gestione su base de jugadores y planifique el calendario de sesiones de sus campañas.  
  * Proporcionar a los jugadores una aplicación móvil (*mobile-first*) en Ionic para la creación guiada (tipo *Character Builder*) y consulta de sus fichas de D\&D 5e automatizadas.  
  * Integrar una API de Inteligencia Artificial (LLM) en el backend para generar trasfondos narrativos y monstruos compatibles con el sistema 5e bajo demanda del Director.

**2\. Requisitos funcionales y no funcionales**

* **Requisitos Funcionales:**  
  * RF01: El sistema debe distinguir entre roles de usuario (Pro-GM administrador y Jugador cliente).  
  * RF02: El sistema debe permitir al Pro-GM planificar sesiones, asociar clientes/jugadores y llevar un control de estado (pendientes/pagados).  
  * RF03: El sistema debe permitir a los Jugadores crear fichas de D\&D 5e seleccionando parámetros base (raza, clase, nivel, características), y el sistema debe calcular automáticamente el resto de valores derivados (salvaciones, habilidades, modificadores).  
  * RF04: El sistema debe permitir actualizar parámetros dinámicos en tiempo real durante la partida (puntos de golpe actuales, espacios de conjuro gastados).  
  * RF05: El sistema debe permitir al Pro-GM generar monstruos con estadísticas válidas para D\&D 5e mediante peticiones de texto a una IA integrada.  
* **Requisitos No Funcionales:**  
  * RNF01 (Legalidad): El contenido mecánico pre-cargado en la base de datos se basará en el SRD 5.1 (Creative Commons) de D\&D.  
  * RNF02 (Seguridad): Autenticación mediante JWT y encriptación de contraseñas (BCrypt).  
  * RNF03 (Arquitectura): Separación estricta entre el cliente multiplataforma (Ionic/Angular) y la lógica de negocio/cálculo matemático (Kotlin/Spring Boot).

**3\. Identificación de actores**

* **Director de Juego (Pro-GM):** Administrador de la campaña. Gestiona la parte empresarial (CRM, sesiones) y genera contenido (monstruos IA). Puede visualizar las estadísticas clave de las fichas de sus jugadores de forma remota.  
* **Jugador (Cliente):** Usuario final de la app móvil. Crea y mantiene actualizada su ficha interactiva de D\&D 5e.  
* **Sistema LLM (Actor Externo):** Inteligencia Artificial (ej. OpenAI/Gemini) que actúa como servicio externo para la generación procedimental de enemigos y narrativa.

**4\. Casos de Uso / Historias de Usuario principales**

* **Historia de Usuario 1 (Character Builder):** *Como Jugador, quiero seleccionar mi clase y raza de una lista, e introducir mis tiradas de características, para que la app calcule mi Clase de Armadura y Modificadores automáticamente sin usar papel y lápiz.*  
* **Historia de Usuario 2 (Gestión de Combate):** *Como Jugador, quiero poder restar mis Puntos de Golpe en la app móvil al recibir daño, para llevar el control de mi vida en tiempo real durante la sesión.*  
* **Historia de Usuario 3 (CRM del Máster):** *Como Pro-GM, quiero dar de alta una sesión en el calendario y ver qué jugadores han confirmado su asistencia y pagado la sesión.*  
* **Historia de Usuario 4 (Asistente IA):** *Como Pro-GM, quiero pedirle a la IA "Crea un trasgo jefe de nivel 3", para que el sistema rellene su ficha con estadísticas legales de D\&D 5e automáticamente.*

**5\. Alcance del proyecto (Límites del TFG)**

* **Incluido en el alcance (MVP \- Producto Mínimo Viable):**  
  * Motor matemático de reglas de D\&D 5e limitado inicialmente al contenido del SRD 5.1 (razas, clases y conjuros base).  
  * Panel web de gestión para el Pro-GM (CRM de jugadores y eventos).  
  * App móvil para la ficha interactiva del Jugador.  
* **Objetivos Extendidos (Deseables, sujetos a disponibilidad de tiempo):**  
  * *Soporte para Expansiones y Homebrew complejo:* Se intentará diseñar la arquitectura de la base de datos con la flexibilidad suficiente para permitir la inclusión de mecánicas de libros de expansión o la creación de clases/razas personalizadas (Homebrew) que requieran automatización, si el progreso del desarrollo principal lo permite.  
* **Fuera del alcance definitivo (Para garantizar la viabilidad técnica):**  
  * *Gestor de Inventario con peso automático:* La app permitirá anotar objetos, pero no calculará la sobrecarga por peso o el cambio de monedas automáticamente.  
  * *Virtual Tabletop (VTT):* No habrá tableros, mapas interactivos en tiempo real, ni simulador de dados 3D.  
  * *Pasarela bancaria real:* El control de pagos será de registro manual interno, sin integración con pasarelas de pago reales como Stripe o PayPal en esta fase.