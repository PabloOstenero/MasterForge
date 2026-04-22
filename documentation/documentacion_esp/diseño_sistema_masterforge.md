## **1\. Arquitectura del sistema**

El proyecto "MasterForge" se construirá utilizando una **Arquitectura Cliente-Servidor**, implementando una separación estricta entre el *frontend* (presentación) y el *backend* (lógica de negocio y acceso a datos).

**Arquitectura por capas del Backend (Patrón N-Tier):** El servidor estará estructurado internamente en capas para garantizar la escalabilidad y el mantenimiento del código:

* **Capa de Presentación / Controladores (Controllers):** Expone los *endpoints* de la API REST. Se encarga de recibir las peticiones HTTP del cliente (Ionic), validar los datos de entrada (DTOs) y devolver las respuestas HTTP correspondientes.  
* **Capa de Lógica de Negocio (Services):** Es el "cerebro" de la aplicación. Aquí reside el Motor de Reglas de D\&D 5e (cálculo de modificadores, vida, etc.) y la lógica de integración con la IA. Se comunica con los controladores y los repositorios, asegurando que las reglas de negocio se cumplan antes de guardar nada.  
* **Capa de Acceso a Datos (Repositories):** Se encarga de la persistencia. Interactúa directamente con la base de datos relacional para realizar operaciones CRUD (Crear, Leer, Actualizar, Borrar).

**Tecnologías y frameworks:**

* **Frontend (Cliente):** \* *Framework:* Ionic Framework v7+ con Angular.  
  * *Lenguaje:* TypeScript, HTML5, SCSS.  
  * *Herramientas:* Capacitor (para compilación a app móvil nativa).  
* **Backend (Servidor):**  
  * *Framework:* Spring Boot 3.x.  
  * *Lenguaje:* Kotlin.  
  * *Seguridad:* Spring Security con JWT (JSON Web Tokens).  
  * *ORM:* Spring Data JPA / Hibernate.  
* **Base de Datos:** PostgreSQL (elegido por su excelente soporte nativo para el tipo de dato `JSONB`, crucial para la flexibilidad del bestiario).

## **2\. Diagramas UML**

* **Diagrama de Casos de Uso:**

<p align="center">
  <img src="../../assets/masterforge_casos_de_uso.png" width=70% alt="Use Case Diagram">
</p>

* **Diagrama de Clases (Lógica de Dominio):**

<p align="center">
  <img src="../../assets/masterforge_clases.png" width=70% alt="Diagram Classes">
</p>

* **Diagrama de Secuencia (Ejemplo: Generación de Monstruo con IA):**

<p align="center">
  <img src="../../assets/masterforge_secuencia.png" width=100% alt="Sequence Diagram">
</p>

## **3\. Diseño de la base de datos**

El sistema utiliza una base de datos relacional **PostgreSQL**, diseñada para soportar tanto la gestión empresarial (SGE) como el motor de reglas de rol. El modelo lógico se divide en tres bloques principales:

1. **Módulo SGE/CRM:**  
   * `users`: Almacena las credenciales del Director de Juego (Pro-GM) y su nivel de suscripción.  
   * `clients`: Almacena la cartera de jugadores asociados a un Pro-GM.  
   * `sessions` y `session_attendees` (Tabla intermedia): Gestionan el calendario de eventos y el control de pagos por asistencia.  
2. **Módulo SRD (Reglas D\&D 5e):**  
   * `dnd_races` y `dnd_classes`: Tablas paramétricas (diccionarios) que almacenan los bonificadores estadísticos oficiales (ej. dado de golpe, bonificador de destreza). El backend lee de aquí para automatizar cálculos.  
3. **Módulo de Entidades Dinámicas:**  
   * `characters`: Fichas de los jugadores. Contiene claves foráneas a razas y clases, y almacena las "tiradas base" de características y el estado dinámico (Puntos de Golpe actuales).  
   * `monsters`: Almacena el bestiario del Máster. Destaca el uso de una columna de tipo `JSONB` (`stats_data`) para almacenar de forma flexible y eficiente los atributos y acciones complejas generadas por la IA.

## **4\. Diseño de la interfaz de usuario**

El diseño visual de MasterForge seguirá un enfoque *Mobile-First* para la vista del Jugador (optimizada para uso en mesa durante la partida) y un enfoque tipo *Dashboard* de escritorio para la vista de gestión del Pro-GM.

* **Estilo Visual y Colores:** Se adoptará un tema oscuro (Dark Mode) para reducir la fatiga visual durante las partidas nocturnas, con una estética de "fantasía moderna".  
  1. *Fondo Principal:* Gris carbón muy oscuro (ej. `#121212`).  
  2. *Superficies/Tarjetas:* Gris antracita (ej. `#1E1E1E`).  
  3. *Acentos (Botones primarios):* Oro viejo o bronce (para evocar la temática de rol sin sobrecargar).  
  4. *Alertas/Combate:* Rojo carmesí (para los botones de restar Puntos de Golpe o alertas de impagos).  
* **Pantallas Principales (Mockups):**  
  1. *Dashboard del GM (Escritorio):* 

<p align="center">
  <img src="../../assets/masterforge_dm_dashboard.png" width=100% alt="GM dashboard">
</p>

2. *Character Sheet del Jugador (Móvil):*

<p align="center">
  <img src="../../assets/masterforge_ficha_pj.png" width=50% alt="Character Sheet">
</p>

## 

## **5\. Diseño de la API o servicios externos**

MasterForge expondrá una API RESTful consumida por el cliente Ionic, y a su vez, actuará como cliente de un servicio externo de Inteligencia Artificial.

**Endpoints Principales (API Propia):**

* `POST /api/auth/login`: Autenticación y obtención de token JWT.  
* `GET /api/clients`: Obtiene la lista de jugadores de un Pro-GM (Protegido por JWT).  
* `POST /api/sessions`: Crea un nuevo evento en el calendario.  
* `GET /api/characters/{id}`: Devuelve la ficha de un personaje. El backend calculará al vuelo los modificadores totales antes de enviar el JSON de respuesta.

**Integración con Servicios Externos (LLM API):**

* El backend se comunicará con la API de OpenAI (o equivalente, como Google Gemini).  
* Se utilizará una petición HTTP POST segura (ocultando la API Key en las variables de entorno del servidor Kotlin).  
* El servidor enviará un *System Prompt* estricto indicando a la IA que asuma el rol de creador de D\&D 5e y devuelva la información **exclusivamente en un formato JSON predefinido** (sin texto conversacional), para que el backend de Kotlin pueda parsearlo e insertarlo directamente en la columna `JSONB` de la tabla `monsters`.
