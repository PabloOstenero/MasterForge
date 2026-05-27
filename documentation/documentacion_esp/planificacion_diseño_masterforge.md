**1\. Objetivos del proyecto**

* **Objetivo General:** Desarrollar "MasterForge", una plataforma de gestión (ERP/CRM) y motor de creación de personajes automatizado, exclusivo para el sistema Dungeons & Dragons 5ª Edición (D\&D 5e), orientado a Directores de Juego profesionales (Pro-GMs) y sus Jugadores.  
* **Objetivos Específicos:**  
  * Implementar un "Motor de Reglas" en el backend (Kotlin) capaz de calcular automáticamente estadísticas derivadas (modificadores, CA, PG máximos, bonificadores de competencia, espacios de conjuro) basándose en la raza, clase y nivel del personaje, con persistencia flexible.  
  * Desarrollar un módulo CRM para que el Director de Juego gestione campañas, solicitudes de inscripción, y planifique el calendario de sesiones conectadas a notificaciones externas.  
  * Proporcionar a los jugadores una aplicación multiplataforma (*mobile-first*) en Ionic para la creación guiada (Character Builder) e interacción en tiempo real con sus fichas de D\&D 5e automatizadas.  
  * Diseñar un Taller Homebrew Sandbox co-creativo que permita forjar nuevas razas, clases, conjuros, monstruos y objetos con cálculo automático, integrando asistencia de Inteligencia Artificial (LLM) para redacción narrativa y auditorías de balance matemático.

**2\. Requisitos funcionales y no funcionales**

* **Requisitos Funcionales:**  
  * RF01: El sistema debe distinguir entre roles de usuario (Pro-GM administrador y Jugador cliente).  
  * RF02: El sistema debe permitir al Pro-GM planificar sesiones, asociar clientes/jugadores y automatizar un control de cobros mediante un monedero virtual simulado.  
  * RF03: El sistema debe permitir a los Jugadores crear fichas de D\&D 5e seleccionando parámetros base del SRD 5.1 o contenido Homebrew, calculando automáticamente el resto de valores derivados (salvaciones, habilidades, modificadores).  
  * RF04: El sistema debe permitir actualizar parámetros dinámicos en tiempo real durante la partida (puntos de golpe actuales, temporales, monedas y espacios de conjuro gastados) con triggers de descanso (Short/Long Rest) y subida de nivel / multiclase automáticos.  
  * RF05: El sistema debe permitir a los creadores de contenido Homebrew recibir asistencia narrativa interactiva y validaciones de balance matemático asistidos por una IA integrada en el Sandbox de creación.  
* **Requisitos No Funcionales:**  
  * RNF01 (Legalidad): El contenido mecánico pre-cargado nativo en la base de datos se basará estrictamente en la licencia Creative Commons del SRD 5.1 de D\&D.  
  * RNF02 (Seguridad): Autenticación mediante JWT, encriptación segura de contraseñas con BCrypt y soporte nativo para autenticación de dos factores (2FA / TOTP).  
  * RNF03 (Arquitectura): Separación estricta entre el cliente multiplataforma (Ionic/Angular) y la lógica de negocio/cálculo matemático (Kotlin/Spring Boot) con persistencia en PostgreSQL (`JSONB`).

**3\. Identificación de actores**

* **Director de Juego (Pro-GM):** Administrador de campañas y sesiones. Gestiona a los jugadores confirmados y utiliza el Combat Tracker táctico en tiempo real.  
* **Jugador (Cliente):** Usuario final de la app móvil. Crea y mantiene actualizada su ficha interactiva de D\&D 5e consumiendo contenido oficial o Homebrew.  
* **Creador Homebrew:** Usuario que diseña mecánicas personalizadas en el taller Sandbox con ayuda de la IA de asistencia.
* **Sistema LLM (Actor Externo):** Inteligencia Artificial que actúa como servicio de asistencia de lenguaje natural y validador de balance para las creaciones del Sandbox Homebrew.

**4\. Casos de Uso / Historias de Usuario principales**

* **Historia de Usuario 1 (Character Builder):** *Como Jugador, quiero seleccionar mi clase y raza de una lista, e introducir mis tiradas de características, para que la app calcule mi Clase de Armadura y Modificadores automáticamente sin usar papel y lápiz.*  
* **Historia de Usuario 2 (Gestión de Combate):** *Como Jugador, quiero poder restar mis Puntos de Golpe en la app móvil al recibir daño y añadir puntos temporales, para llevar el control de mi vida en tiempo real durante la sesión.*  
* **Historia de Usuario 3 (CRM del Máster):** *Como Pro-GM, quiero programar una sesión en el calendario y registrar de forma automatizada las confirmaciones de asistencia y pagos simulados mediante monedero virtual.*  
* **Historia de Usuario 4 (Asistente IA):** *Como Creador Homebrew, quiero que la IA me asista en la descripción narrativa de mi hechizo homebrew original y valide que sus modificadores numéricos no rompan el balance mecánico del juego.*

**5\. Alcance del proyecto (Límites del MVP)**

* **Incluido en el alcance (MVP \- Producto Mínimo Viable):**  
  * Motor matemático de reglas de D\&D 5e compatible con el corpus SRD 5.1.  
  * Taller de co-creación Homebrew Sandbox modular (crear razas, clases, conjuros, monstruos y objetos con cálculo automático).  
  * Panel web y de escritorio para el Pro-GM (CRM de campañas, control de aforos y Combat Tracker táctico).  
  * App móvil responsiva para la ficha interactiva del Jugador con triggers automáticos de descanso (Long/Short Rest) y subida de nivel/multiclase.  
  * Autenticación segura mediante JWT, BCrypt, 2FA (TOTP) y notificaciones integradas por Discord.  
  * Procesador simulado de pagos virtuales (monedero virtual cerrado y suscripciones DM).  
* **Fuera del alcance definitivo (Para garantizar la viabilidad técnica):**  
  * *Virtual Tabletop (VTT):* No habrá tableros, mapas interactivos en tiempo real, ni simulador de dados 3D.  
  * *Pasarela bancaria real:* La pasarela bancaria y el monedero serán una simulación académica para pruebas de viabilidad del modelo de negocio, sin conectar pasarelas de pago reales como Stripe o PayPal.  
  * *Gestor de peso por carga física estricto:* El inventario permite anotar y equipar objetos, pero el cálculo automático de sobrecarga por carga de peso de D&D se pospone como trabajo futuro.