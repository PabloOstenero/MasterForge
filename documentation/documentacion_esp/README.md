# MasterForge

**Plataforma ERP y Gestor de Campañas Profesional para Directores de Juego**

---

## 📋 Tabla de Contenidos

- [Visión General](#visión-general)
- [Justificación](#justificación)
- [Características Principales](#características-principales)
- [Stack Tecnológico](#stack-tecnológico)
- [Arquitectura del Proyecto](#arquitectura-del-proyecto)
- [Primeros Pasos](#primeros-pasos)
- [Alcance del Proyecto](#alcance-del-proyecto)
- [Hoja de Ruta](#hoja-de-ruta)
- [Cómo Contribuir](#cómo-contribuir)
- [Licencia](#licencia)

---

## 🎭 Visión General

**MasterForge** es una solución integral y multiplataforma diseñada exclusivamente para Directores de Juego profesionales (Pro-GMs), creadores de contenido e ideadores de campaña en Dungeons & Dragons 5ª Edición (D&D 5e). Combina planificación de recursos empresariales (ERP), gestión de relaciones con clientes (CRM) y herramientas creativas impulsadas por inteligencia artificial para optimizar los aspectos operacionales y creativos de la gestión de campañas profesionales de juegos de rol de mesa.

La plataforma centraliza:
- **Gestión Empresarial**: Bases de datos de clientes/jugadores, programación de sesiones y seguimiento de ingresos
- **Creación Creativa**: Constructor dinámico de personajes, generación de PNJs/monstruos e inventario de activos homebrew
- **Asistencia Inteligente**: Generación procedimental de encuentros y narrativa impulsada por IA

---

## 💡 Justificación

El mercado de juegos de rol de mesa ha experimentado un crecimiento exponencial en los últimos años. Directores de Juego profesionales e ideadores independientes de TTRPG están monetizando cada vez más sus campañas, activos de contenido y servicios de juego a través de plataformas como Patreon y modelos de pago por sesión.

Sin embargo, este nicho profesional emergente carece de un **sistema de gestión de software (SGE)** especializado adaptado a sus necesidades operacionales y creativas únicas. Las soluciones existentes se enfocan en jugadores casuales o son herramientas genéricas que no comprenden las complejidades de la mecánica de D&D 5e.

**MasterForge** cubre esta brecha ofreciendo:
- Un ERP/CRM ligero diseñado específicamente para gestionar clientes jugadores y calendarios de sesiones
- Cálculo automatizado de estadísticas y mecánicas de personajes en D&D 5e
- Generación procedimental asistida por IA de encuentros equilibrados y narrativamente ricos
- Una experiencia mobile-first para directores y jugadores
- Un modelo de negocio SaaS escalable para una comunidad profesional en crecimiento

---

## ✨ Características Principales

### Para Directores de Juego (Pro-GMs)

| Característica | Descripción |
|---|---|
| **Gestión de Clientes Jugadores** | Mantén una base de datos integral de jugadores con información de contacto, historial de sesiones y estado de pagos |
| **Programación de Sesiones y Control** | Planifica campañas, gestiona asistencia de jugadores, establece límites de aforo y registra estados de sesión (pendiente/pagado/completado) |
| **Inventario de Activos Digitales** | Organiza y gestiona aventuras personalizadas, reglas homebrew y paquetes de contenido propietarios |
| **Monitoreo Remoto de Jugadores** | Visualiza estadísticas clave e información de personajes de tus jugadores en tiempo real |
| **Generador IA de Encuentros** | Genera enemigos compatibles con D&D 5e con bloques de estadísticas y narrativas completas mediante prompts en lenguaje natural |
| **Panel de Control y Analíticas** | Registra métricas de campaña, engagement de jugadores e ingresos de un vistazo |

### Para Jugadores

| Característica | Descripción |
|---|---|
| **Constructor de Personajes** | Crea y personaliza personajes de D&D 5e seleccionando raza, clase, nivel y puntuaciones de atributos |
| **Cálculos Automatizados** | El sistema calcula automáticamente CA, tiradas de salvación, bonificadores de habilidad, PG y espacios de conjuro |
| **Hoja de Personaje Interactiva** | Hoja amigable para móvil que se actualiza en tiempo real durante el juego |
| **Seguimiento de Combate** | Registra puntos de golpe, espacios de conjuro y condiciones temporales durante combate activo |
| **Acceso a Campaña** | Visualiza sesiones programadas, detalles de campaña y comunícate con tu Director de Juego |

### Innovación Impulsada por IA

- **Asistente de Forja**: Generación de contenido inteligente impulsada por modelos de lenguaje grande (OpenAI/Gemini)
- **Balance Procedimental**: IA genera encuentros válidos en D&D 5e alineados con las reglas del SRD 5.1
- **Integración Narrativa**: Cada criatura generada incluye estadísticas mecánicas y ganchos narrativos temáticos

---

## 🛠️ Stack Tecnológico

### Frontend (Cliente Multiplataforma)

| Capa | Tecnología | Propósito |
|---|---|---|
| **Framework** | Ionic Framework + Angular | Desarrollo multiplataforma web y móvil (Android/iOS) |
| **Estilos** | SCSS/Sass | Estilos basados en componentes |
| **Herramienta de Construcción** | Webpack (via Angular CLI) | Empaquetamiento y optimización |
| **Gestor de Paquetes** | npm | Gestión de dependencias |

### Backend (Lógica de Negocio e API)

| Capa | Tecnología | Propósito |
|---|---|---|
| **Lenguaje** | Kotlin | Lenguaje JVM moderno y type-safe |
| **Framework** | Spring Boot | Desarrollo de API REST empresarial |
| **Herramienta de Construcción** | Gradle | Construcción del proyecto y gestión de dependencias |
| **Puerto** | Default: 8080 | Puerto de escucha del servidor API |

### Capa de Datos

| Componente | Tecnología | Propósito |
|---|---|---|
| **Base de Datos** | PostgreSQL | Datos relacionales para usuarios, jugadores, campañas y mecánicas de juego |
| **ORM** | JPA/Hibernate (Spring Data) | Mapeo objeto-relacional para operaciones de base de datos |

### Servicios Externos y Herramientas

| Herramienta | Propósito |
|---|---|
| **OpenAI / Gemini API** | Integración de modelo IA para generación de contenido procedimental |
| **JWT (JSON Web Tokens)** | Autenticación y autorización sin estado |
| **BCrypt** | Hashing seguro de contraseñas |
| **GitHub** | Control de versiones y colaboración |
| **Postman** | Pruebas y documentación de API |
| **Figma** | Diseño y prototipado UI/UX |

---

## 🏗️ Arquitectura del Proyecto

```
MasterForge/
├── masterforge-backend/              # API Spring Boot + Kotlin
│   ├── src/main/kotlin/
│   │   └── com/masterforge/
│   │       ├── controllers/          # Endpoints REST
│   │       ├── services/             # Lógica de negocio y motor de reglas
│   │       ├── repositories/         # Capa de acceso a datos
│   │       ├── models/               # Modelos de entidad
│   │       ├── security/             # JWT y autenticación
│   │       ├── ai/                   # Integración de LLM
│   │       └── MasterforgeBackendApplication.kt
│   ├── src/main/resources/
│   │   └── application.properties    # Configuración
│   ├── build.gradle.kts              # Dependencias
│   └── ...
│
├── masterforge-frontend/             # App Ionic + Angular
│   ├── src/
│   │   ├── app/
│   │   │   ├── home/                 # Landing/dashboard
│   │   │   ├── auth/                 # Login/registro
│   │   │   ├── player/               # Características del jugador
│   │   │   │   └── character-builder/
│   │   │   ├── gm/                   # Características admin del GM
│   │   │   │   ├── player-management/
│   │   │   │   ├── session-scheduling/
│   │   │   │   └── ai-generator/
│   │   │   └── app.routes.ts
│   │   ├── services/                 # Lógica de negocio e HTTP
│   │   ├── models/                   # Interfaces TypeScript
│   │   ├── theme/                    # Estilos y variables
│   │   └── main.ts
│   ├── package.json
│   ├── ionic.config.json
│   └── ...
│
└── README.md                         # Este archivo
```

---

## 🚀 Primeros Pasos

### Requisitos Previos

- **Node.js** v18+ (para desarrollo frontend)
- **npm** o **yarn** (gestor de paquetes)
- **Java 11+** (para backend)
- **Gradle** 7.0+ (incluido en el wrapper)
- **PostgreSQL** 13+ (base de datos)
- **Git** (control de versiones)

### Configuración del Backend

1. **Navega al directorio del backend:**
   ```bash
   cd masterforge-backend
   ```

2. **Configura la conexión a PostgreSQL** en `src/main/resources/application.properties`:
   ```properties
   spring.datasource.url=jdbc:postgresql://localhost:5432/masterforge
   spring.datasource.username=tu_usuario_bd
   spring.datasource.password=tu_contraseña_bd
   spring.jpa.hibernate.ddl-auto=update
   ```

3. **Construye y ejecuta:**
   ```bash
   ./gradlew build
   ./gradlew bootRun
   ```

4. **Verifica que la API esté ejecutándose:**
   ```bash
   curl http://localhost:8080/api/health
   ```

### Configuración del Frontend

1. **Navega al directorio del frontend:**
   ```bash
   cd masterforge-frontend
   ```

2. **Instala las dependencias:**
   ```bash
   npm install
   ```

3. **Configura el endpoint de la API** en `src/environments/environment.ts`:
   ```typescript
   export const environment = {
     apiUrl: 'http://localhost:8080/api'
   };
   ```

4. **Inicia el servidor de desarrollo:**
   ```bash
   npm start
   ```

5. **Abre en tu navegador:**
   ```
   http://localhost:4200
   ```

### Docker (Opcional)

*(Próximamente: configuración de Docker Compose para despliegue full-stack)*

---

## 📦 Alcance del Proyecto

### MVP (Producto Mínimo Viable) - Incluido

- ✅ Motor de reglas de D&D 5e limitado al contenido del SRD 5.1
- ✅ Panel web de gestión para Pro-GMs (CRM y gestión de sesiones)
- ✅ App mobile-first de constructor de personajes para jugadores
- ✅ Cálculos de estadísticas de personajes en tiempo real
- ✅ Integración básica de IA para generación de monstruos
- ✅ Autenticación JWT y control de acceso basado en roles
- ✅ Almacenamiento de datos persistente con PostgreSQL

### Objetivos Extendidos (Backlog - Disponibilidad de Tiempo)

- 🔜 Soporte para libros de expansión y mecánicas avanzadas homebrew
- 🔜 Creación de clases/razas personalizadas con balanceo automatizado
- 🔜 Seguimiento de pagos con ledger interno
- 🔜 Notas de campaña y registro de sesiones

### Fuera de Alcance (Exclusiones Deliberadas)

- ❌ **Gestión de Inventario**: Sin cálculos automáticos de peso/sobrecarga
- ❌ **Virtual Tabletop (VTT)**: Sin mapas interactivos, grillas de combate o dados 3D
- ❌ **Integración de Pasarela de Pago**: Sin procesamiento de pagos reales (Stripe/PayPal) en v1
- ❌ **Marketplace de Módulos**: Sin sistema integrado de compra de contenido
- ❌ **Chat de Voz/Video**: Sin comunicación integrada más allá de chat de texto

---

## 🎯 Requisitos Funcionales Clave

| ID Req. | Descripción | Prioridad |
|---|---|---|
| **RF01** | Sistema distingue entre roles Pro-GM y Jugador | DEBE |
| **RF02** | Pro-GMs pueden programar sesiones y registrar estado de pagos | DEBE |
| **RF03** | Jugadores pueden crear personajes D&D 5e con cálculos automáticos | DEBE |
| **RF04** | Seguimiento en tiempo real de PG y espacios de conjuro | DEBE |
| **RF05** | Generación de monstruos asistida por IA | DEBERÍA |
| **RF06** | Seguimiento de asistencia y gestión de aforo | DEBERÍA |
| **RF07** | Organización de activos digitales (aventuras, homebrew) | SERÍA DESEABLE |

### Requisitos No Funcionales

| ID Req. | Descripción | Estándar |
|---|---|---|
| **RNF01** | Todo contenido mecánico basado en D&D 5.1 SRD (Creative Commons) | Cumplimiento Legal |
| **RNF02** | Autenticación JWT + hashing de contraseñas con BCrypt | Seguridad |
| **RNF03** | Separación estricta frontend/backend | Arquitectura |
| **RNF04** | < 2s tiempo de respuesta endpoints API (p95) | Rendimiento |
| **RNF05** | Diseño responsive mobile (iOS & Android) | UX |

---

## 🗺️ Hoja de Ruta

### Fase 1 (MVP - Q2-Q3 2026)
- [ ] Endpoints core de API backend (auth, jugadores, sesiones)
- [ ] Motor de reglas D&D 5e (creación de personajes y cálculos de estadísticas)
- [ ] Constructor de personajes frontend
- [ ] Panel de control básico del GM
- [ ] Autenticación JWT

### Fase 2 (Integración IA - Q4 2026)
- [ ] Integración API OpenAI/Gemini
- [ ] Generador de encuentros (monstruos/PNJs)
- [ ] Generación de narrativa para botín/misiones
- [ ] Ingeniería de prompts y validación de respuestas

### Fase 3 (Optimización Mobile - Q1 2027)
- [ ] Construcción nativa Ionic (Android/iOS)
- [ ] Soporte offline para hoja de personaje
- [ ] Notificaciones push para recordatorios de sesión
- [ ] Optimización UI para móvil

### Fase 4+ (Características Extendidas)
- [ ] Contenido de libros de expansión (Xanathar's, Tasha's, etc.)
- [ ] Marketplace de módulos homebrew
- [ ] Integración de pasarela de pagos
- [ ] Reporting y analíticas avanzadas

---

## 📝 Documentación de API

Una vez que el backend está en ejecución, accede a la interfaz Swagger interactiva:

```
http://localhost:8080/swagger-ui.html
```

### Endpoints Clave (Ejemplos)

```
POST   /api/auth/register         - Registro de jugador
POST   /api/auth/login            - Login de usuario (retorna JWT)
GET    /api/players/{id}          - Obtener personaje de jugador
PATCH  /api/players/{id}/stats    - Actualizar estadísticas de personaje
GET    /api/gm/sessions           - Listar sesiones del GM
POST   /api/gm/sessions           - Crear nueva sesión
POST   /api/ai/generate-monster   - Generar monstruo D&D 5e
```

Consulta la documentación completa de API en el spec OpenAPI del backend.

---

## 🔒 Consideraciones de Seguridad

- **Autenticación**: Tokens JWT con expiración configurable
- **Seguridad de Contraseñas**: Hashing BCrypt con salt (mínimo 12 rondas)
- **Autorización**: Control de acceso basado en roles (RBAC) para Pro-GM vs. Jugador
- **Validación de Datos**: Sanitización de entrada en todos los endpoints de API
- **CORS**: Configurado para comunicación frontend-backend
- **HTTPS**: Recomendado para despliegues en producción

---

## 🤝 Cómo Contribuir

¡Bienvenemos contribuciones de la comunidad! Para contribuir:

1. **Haz un fork** del repositorio
2. **Crea una rama de feature**: `git checkout -b feature/nombre-de-tu-feature`
3. **Confirma cambios**: `git commit -m "Añade descripción de feature"`
4. **Sube a la rama**: `git push origin feature/nombre-de-tu-feature`
5. **Abre un Pull Request** con una descripción clara

### Estilo de Código

- **Kotlin**: Sigue la [Kotlin Style Guide](https://kotlinlang.org/docs/coding-conventions.html)
- **TypeScript/Angular**: Sigue la [Angular Style Guide](https://angular.io/guide/styleguide)
- **Mensajes de Commit**: Usa conventional commits (feat:, fix:, docs:, etc.)

---

## 📄 Licencia

MasterForge está licenciado bajo la **Licencia MIT**. Consulta el archivo [LICENSE](LICENSE) para detalles.

**Importante**: Todo el contenido mecánico de D&D 5e en la base de datos se basa en el **Documento de Referencia del Sistema D&D 5.1 (SRD)**, que está licenciado bajo la **Licencia Creative Commons Atribución 4.0 Internacional**.

---

## 📞 Contacto y Soporte

- **Líder del Proyecto**: [Tu Nombre/Equipo]
- **Email**: contacto@masterforge.dev
- **Comunidad Discord**: [Próximamente]
- **Rastreador de Issues**: [GitHub Issues](../../issues)

---

## 🙏 Agradecimientos

- Wizards of the Coast por D&D 5e y el SRD 5.1
- Las comunidades de Kotlin y Angular por frameworks excepcionales
- Ionic por excelencia en desarrollo móvil
- La comunidad profesional de TTRPG que inspiró este proyecto

---

## ⭐ Apoya el Proyecto

Si encuentras MasterForge útil, por favor considera:
- ⭐ Dar una estrella a este repositorio
- 🐛 Reportar bugs y sugerir características
- 💬 Unirte a nuestras discusiones comunitarias
- 🔄 Contribuir código o documentación

---

**¡Que el Forjado sea Épico, Directores!** 🔨🐉

*Última Actualización: Abril 2026*

