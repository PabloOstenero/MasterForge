# Manual de Usuario de MasterForge
## Guía Completa de la Plataforma para Jugadores y Directores de Juego (DM)

¡Bienvenido al **Manual de Usuario Oficial de MasterForge**! Esta guía detalla exhaustivamente el funcionamiento de la aplicación desde la perspectiva del usuario final, dividiéndose en las dos experiencias principales: el **Jugador** y el **Director de Juego (DM)**, además de detallar el ecosistema sandbox de creación de contenido **Homebrew**.

---

## 📌 1. Introducción y Roles en MasterForge

MasterForge es una plataforma web (PWA) de gestión integral para campañas de D&D 5ª edición. Su ecosistema divide las funcionalidades principales según el rol activo de la cuenta:

*   **El Jugador:** Puede forjar sus hojas de personaje interactivas, unirse a partidas públicas gratuitas o de pago en el *Gremio de Campañas*, gestionar su inventario, equipamiento, conjuros, y progresar de nivel de forma automatizada mediante fórmulas matemáticas validadas.
*   **El Director de Juego (DM):** Cuenta con herramientas avanzadas para crear campañas, gestionar solicitudes de inscripción, agendar sesiones con notificaciones por Discord, manejar un *Bestiario interactivo* y dirigir los combates en vivo con el *Combat Tracker* en tiempo real.

---

## 🔐 2. Configuración de Cuenta y Seguridad

### 2.1 Registro e Inicio de Sesión
1. Acceda a la pantalla de **Registro** e introduzca su nombre, correo electrónico y contraseña.
2. Tras iniciar sesión, será redirigido al panel de inicio principal (**Dashboard**).

### 2.2 Autenticación de Dos Factores (2FA)
Para proteger la integridad de sus personajes e información de facturación simulada, MasterForge incluye soporte nativo para **2FA (TOTP)**:
1. Navegue a la sección **Configuración** (`/config`).
2. Haga clic en **Activar 2FA**.
3. Escanee el código QR generado con su aplicación de autenticación preferida (Google Authenticator, Authy, Microsoft Authenticator, etc.).
4. Introduzca el código temporal de 6 dígitos para validar la activación.
5. **IMPORTANTE:** Descargue y guarde los **10 códigos de recuperación únicos** de un solo uso en un lugar seguro. Le permitirán acceder a su cuenta en caso de pérdida del dispositivo móvil.

### 2.3 Vinculación con Discord (Oauth2)
1. En la sección **Configuración**, pulse sobre el botón **Vincular con Discord**.
2. Autorice la aplicación a través de la API oficial de Discord.
3. **Resultado:** Recibirá notificaciones push automatizadas directamente en su cliente de Discord cuando se programen o actualicen sesiones de juego en sus campañas activas.

---

## 🛡️ 3. Guía de Uso para el Jugador

### 3.1 El Gremio de Campañas (Buscador de Partidas)
La sección **Gremio de Campañas** (`/search-campaigns`) le permite buscar mesas de juego utilizando filtros reales e integrados en el backend:
*   **Filtros Disponibles:**
    1.  *Texto libre*: Coincidencia con nombre, descripción o DM.
    2.  *Nombre de DM específico*: Buscar campañas de sus directores favoritos.
    3.  *Rango de Precio*: Para buscar mesas gratuitas o campañas de pago profesional.
    4.  *Capacidad de Jugadores*: Ajustar según el tamaño preferido del grupo.
    5.  *Disponibilidad*: Mostrar únicamente campañas con plazas libres vacantes.
*   **Inscripción:**
    *   *Campañas Gratuitas*: Al pulsar en **Unirse**, su personaje se inscribe de forma inmediata si hay plazas libres.
    *   *Campañas de Pago*: Requieren realizar una simulación de pago seguro (academic mock flow) consumiendo saldo de su monedero virtual.

### 3.2 Forja de Personajes (Creación Paso a Paso)
El asistente **Forjar Personaje** (`/forge-character`) le guía a través de la creación matemática y narrativa de su héroe en cumplimiento estricto de las reglas D&D 5e:
1.  **Raza y Trasfondo:** Selección de razas oficiales del SRD 5.1 (Humano, Elfo, Enano, etc.) o razas Homebrew personalizadas creadas por la comunidad. Los bonificadores de estadísticas raciales se aplican automáticamente.
2.  **Clase e Hitos:** Selección de su clase (Guerrero, Mago, Pícaro, etc.). El motor calcula dinámicamente sus puntos de golpe (HP) máximos iniciales en base al dado de golpe de la clase y su modificador de Constitución.
3.  **Habilidades y Atributos:** Distribución de estadísticas. El motor calcula al instante los modificadores correspondientes (ej: Fuerza 16 $\rightarrow$ Modificador +3).

### 3.3 La Hoja de Personaje Interactiva (`/character-sheet/:id`)
Una vez creado, acceda a su hoja para interactuar con su personaje en tiempo real:
*   **Gestión de Salud:**
    *   Edite sus puntos de golpe actuales.
    *   Añada **Puntos de Golpe Temporales** (calculados por separado de sus HP máximos según las reglas oficiales).
*   **Economía Personal:** Controle sus bolsas de monedas (Cobre, Plata, Electrum, Oro y Platino). El backend persiste cada transacción.
*   **Inventario y Equipo:** Añada armas, armaduras u objetos mágicos. Equipar una armadura recalcula al instante su **Clase de Armadura (AC)** y su modificador de iniciativa.
*   **Motor de Reglas y Descanso Largo:** 
    *   Pulse en **Descanso Largo (Long Rest)** para enviar un trigger al motor del servidor.
    *   **Efecto:** El servidor cura al 100% sus puntos de golpe actuales, restablece los espacios de conjuro gastados y recupera la mitad de sus Dados de Golpe (Hit Dice) totales.
*   **Subida de Nivel y Multiclase:**
    *   Pulse en **Subir de Nivel (Level Up)**.
    *   Puede progresar en su clase actual o seleccionar una nueva clase (Multiclase).
    *   El motor recalcula la matriz de espacios de conjuro combinada (para lanzadores múltiples) y añade los nuevos rasgos correspondientes de forma estricta.

---

## 📖 4. Guía de Uso para el Director de Juego (DM)

### 4.1 Creación y Control de Campañas (`/my-campaigns`)
Como Dungeon Master, usted tiene el control narrativo y organizativo del juego:
1.  **Crear Campaña:** Establezca el título de la aventura, la sinopsis, el precio por sesión (si es una mesa profesional) y el límite de jugadores (máximo de plazas).
2.  **Gestión de Aventureros:** Desde la vista de detalle de la campaña (`/campaigns/:id`), acepte nuevas solicitudes de inscripción de personajes de jugadores o expulse (*kick*) a aquellos que abandonen la mesa.
3.  **Programación de Sesiones:** Programe la fecha y hora de la próxima sesión de juego. El backend disparará de forma automatizada las notificaciones integradas a los Discord de todos los jugadores unidos.

### 4.2 El Gestor de Combates en Vivo (`/campaigns/:id/combat-tracker`)
Dirija las batallas tácticas de forma ágil sin necesidad de tablas externas:
1.  **Cargar Iniciativas:** El DM importa los personajes de los jugadores inscritos y selecciona monstruos directamente desde el *Bestiario*.
2.  **Lanzamiento y Ordenación:** Pulse sobre ordenar iniciativa. El sistema lee los modificadores de iniciativa de cada personaje, ejecuta los dados aleatorios virtuales y ordena a los combatientes de mayor a menor.
3.  **Control de Turnos:** Use los controles para avanzar de turno, aplicar daño directo a los objetivos y llevar un registro dinámico en el *Combat Log* de los acontecimientos de la batalla.

---

## 🛠️ 5. Forja de Contenido Sandbox (Homebrew)

La sección **Homebrew** (`/homebrew`) representa la caja de arena co-creativa de MasterForge. Le permite expandir las reglas estándar D&D 5e creando su propio material personalizado para campañas y hojas de personaje:

*   **Crear Razas:** Configure nuevos linajes, detallando velocidad nativa, incrementos de puntuación de características y rasgos raciales únicos.
*   **Crear Clases y Subclases:** Diseñe clases con dados de golpe personalizados y determine qué rasgos específicos de clase se desbloquean en cada nivel (del 1 al 20).
*   **Crear Hechizos:** Diseñe conjuros indicando escuela de magia, tiempo de lanzamiento, componentes (V/S/M), duración y escalado matemático por nivel de ranura.
*   **Crear Monstruos:** Genere bestias o villanos a medida introduciendo su Valor de Desafío (CR), estadísticas, resistencias, acciones ofensivas y habilidades pasivas.
*   **Crear Objetos:** Configure armas, armaduras u objetos maravillosos con modificadores de atributos específicos (ej: un amuleto que incrementa la Constitución).

**Compartir en la Comunidad:** Todo el contenido forjado en esta sección puede configurarse como *Privado* (para uso exclusivo del creador) o *Público* (compartido en la base de datos comunitaria para que otros jugadores lo importen a sus mesas de juego).

---

## 💳 6. Suscripción Premium y Monedero Virtual

MasterForge simula un entorno comercial premium para fines académicos (academic mock platform):

*   **Saldo Virtual:** En su panel de configuración, puede simular recargas de saldo a su monedero virtual mediante números de tarjetas de prueba.
*   **Suscripciones DM:** Los directores de juego pueden suscribirse al nivel premium para desbloquear la creación ilimitada de campañas públicas y herramientas avanzadas de combate.
*   **Pagos Simulados de Sesiones:** Los jugadores que participan en campañas de pago pagan automáticamente la tarifa de sesión utilizando su saldo virtual simulado.
*   > [!CAUTION]
    > **AVISO DE SEGURIDAD IMPORTANTE:** El sistema de pagos de MasterForge es una **simulación con fines académicos y de demostración**. No está conectado a ninguna pasarela de pago real (como Stripe o PayPal). Bajo ninguna circunstancia debe introducir números de tarjetas de crédito o débito reales ni información financiera verídica. Todo el dinero y transacciones dentro de la plataforma son enteramente ficticios.
