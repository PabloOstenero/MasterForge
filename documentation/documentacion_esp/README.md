# MasterForge

**Plataforma ERP y Gestor de Campañas Profesional para Directores de Juego**

---

## 📋 Tabla de Contenidos

- [Visión General](#visión-general)
- [Documentación y Manuales](#documentación-y-manuales)
- [Justificación](#justificación)
- [Características Principales](#características-principales)
- [Stack Tecnológico](#stack-tecnológico)
- [Arquitectura del Proyecto](#arquitectura-del-proyecto)
- [Entornos en Vivo](#entornos-en-vivo)
- [Configuración y Desarrollo Local](#configuración-y-desarrollo-local)
- [Alcance del Proyecto](#alcance-del-proyecto)
- [Requisitos Funcionales Clave](#requisitos-funcionales-clave)
- [Hoja de Ruta](#hoja-de-ruta)
- [Documentación de API](#documentación-de-api)
- [Consideraciones de Seguridad](#consideraciones-de-seguridad)
- [Cómo Contribuir](#cómo-contribuir)
- [Apoya el Proyecto](#apoya-el-proyecto)

---

## 🎭 Visión General

**MasterForge** es una solución integral y multiplataforma diseñada exclusivamente para Directores de Juego profesionales (Pro-GMs), creadores de contenido e ideadores de campaña en Dungeons & Dragons 5ª Edición (D&D 5e). Combina planificación de recursos empresariales (ERP), gestión de relaciones con clientes (CRM) y herramientas creativas impulsadas por inteligencia artificial para optimizar los aspectos operacionales y creativos de la gestión de campañas profesionales de juegos de rol de mesa.

La plataforma centraliza:
- **Gestión Empresarial**: Bases de datos de clientes/jugadores, programación de sesiones y seguimiento de ingresos
- **Creación Creativa**: Constructor dinámico de personajes y un sistema integral para la forja, validación y balanceo de contenido homebrew (objetos, conjuros, subclases, razas y monstruos)

---

## 📖 Documentación y Manuales

Para facilitar la evaluación académica y la puesta en marcha técnica de **MasterForge**, se ha redactado un completo ecosistema documental en español que cubre todos los aspectos de la plataforma:

*   **[Manual de Proyecto (18 Capítulos)](./DOCUMENTO_PROYECTO.md)**: El documento de ingeniería principal del proyecto, redactado bajo una estructura exhaustiva de 18 partes que detalla los requisitos (MOSCOW), diagramas de diseño UML, flujogramas de reglas 5e, matriz de gestión de riesgos, arquitectura técnica y planes de calidad con automatización de pruebas.
*   **[Manual de Usuario (Jugador y DM)](./MANUAL_USUARIO.md)**: Guía detallada para el usuario final que explica la experiencia completa del jugador (hojas interactivas, subida de nivel, monedero virtual, descansos) y del Dungeon Master (gestión de aforos de campañas, agenda e inicio de combates con Combat Tracker).
*   **[Guía de Configuración Local y Sandbox](./GETTING_STARTED.md)**: Manual de instalación ágil paso a paso para desarrolladores que deseen desplegar localmente los contenedores, la base de datos PostgreSQL, la API Spring Boot y el cliente frontend de Ionic.
*   **[Manual de Arquitectura de Seguridad 2FA](./SEGURIDAD_2FA.md)**: Especificación formal detrás del sistema de autenticación de dos factores (TOTP RFC 6238) y el protocolo de invalidación de códigos de emergencia.
*   **[English Guides & Manuals (Manuales en Inglés)](../../README.md#-documentation)**: Acceso directo a la suite de especificaciones técnicas y manuales en inglés para la consistencia del repositorio.

---

## 💡 Justificación

El mercado de juegos de rol de mesa ha experimentado un crecimiento exponencial en los últimos años. Directores de Juego profesionales e ideadores independientes de TTRPG están monetizando cada vez más sus campañas, activos de contenido y servicios de juego a través de plataformas como Patreon y modelos de pago por sesión.

Sin embargo, este nicho profesional emergente carece de un **sistema de gestión de software (SGE)** especializado adaptado a sus necesidades operacionales y creativas únicas. Las soluciones existentes se enfocan en jugadores casuales o son herramientas genéricas que no comprenden las complejidades de la mecánica de D&D 5e.

**MasterForge** cubre esta brecha ofreciendo:
- Un ERP/CRM ligero diseñado específicamente para gestionar clientes jugadores y calendarios de sesiones
- Cálculo automatizado de estadísticas y mecánicas de personajes en D&D 5e
- Co-creación, validación y balanceo asistido por IA de activos de contenido homebrew personalizados
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
| **Forja de Homebrew con IA (Planificado)** | Co-crea, equilibra y valida mecánicamente objetos, conjuros, razas y clases personalizadas con soporte de modelos de lenguaje grande (Fase 3) |
| **Panel de Control y Analíticas** | Registra métricas de campaña, engagement de jugadores e ingresos de un vistazo |

### Para Jugadores

| Característica | Descripción |
|---|---|
| **Constructor de Personajes** | Crea y personaliza personajes de D&D 5e seleccionando raza, clase, nivel y puntuaciones de atributos |
| **Cálculos Automatizados** | El sistema calcula automáticamente CA, tiradas de salvación, bonificadores de habilidad, PG y espacios de conjuro |
| **Hoja de Personaje Interactiva** | Hoja amigable para móvil que se actualiza en tiempo real durante el juego |
| **Seguimiento de Combate** | Registra puntos de golpe, espacios de conjuro y condiciones temporales durante combate activo |
| **Acceso a Campaña** | Visualiza sesiones programadas, detalles de campaña y comunícate con tu Director de Juego |

### 🔮 Trabajos Futuros y Roadmap del Sistema

Hemos estructurado el roadmap de desarrollo futuro de la plataforma en torno a dos áreas críticas:

*   **Mejoras del Motor de Reglas D&D 5e**:
    *   **Sistema de Dotes (Feats)**: Opción de seleccionar dotes oficiales en lugar de aumentos de puntuación de característica (ASIs) al subir de nivel, aplicando bonos y reglas específicas de forma automática.
    *   **Seguimiento de Estados y Condiciones Activas (Conditions)**: Penalizadores mecánicos automatizados para condiciones de combate (ej. Cegado, Envenenado, Apresado) integrados de forma bidireccional con el Combat Tracker.
    *   **Cálculo Dinámico de Carga y Peso (Encumbrance)**: Cálculos automáticos de velocidad en base al peso total acumulado en el inventario y la puntuación de Fuerza del personaje.
*   **Integración de Inteligencia Artificial (IA) en la Co-creación Homebrew**:
    *   **Asistente de Redacción Homebrew**: Co-creación y refinamiento de descripciones estéticas y lore narrativo de conjuros, objetos mágicos, trasfondos y razas personalizados.
    *   **Auditor y Validador de Balance Mecánico**: Análisis dinámico de los parámetros numéricos de un elemento homebrew en comparación matemática con el corpus del SRD 5.1, alertando al creador sobre desequilibrios antes de su publicación comunitaria.

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
│   │   └── com/masterforge/masterforge_backend/
│   │       ├── config/               # Configuraciones de aplicación y seguridad
│   │       ├── controller/           # Endpoints REST (Monstruos, Personajes, Homebrew)
│   │       ├── model/                # Entidades JPA de Base de Datos y DTOs
│   │       ├── repository/           # Repositorios de Spring Data JPA
│   │       ├── service/              # Servicios core de negocio (Auth, Homebrew, Discord)
│   │       ├── util/                 # Motores de reglas y clases de utilidad
│   │       └── MasterforgeBackendApplication.kt
│   ├── src/main/resources/
│   │   ├── db/migration/             # Migraciones de base de datos con Flyway/Liquibase
│   │   ├── application.properties    # Configuración de desarrollo
│   │   └── application-prod.properties # Configuración de producción y base de datos cloud
│   ├── build.gradle.kts              # Script de construcción Gradle Kotlin y dependencias
│   └── ...
│
├── masterforge-frontend/             # Cliente Multiplataforma Ionic + Angular
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/           # Elementos UI reutilizables (tarjetas, tablas)
│   │   │   ├── guards/               # Protectores de rutas para auth y roles
│   │   │   ├── home/                 # Página principal del panel de control
│   │   │   ├── interceptors/         # Interceptores globales HTTP y cabeceras JWT
│   │   │   ├── layout/               # Plantillas de cabecera, sidebar y layouts generales
│   │   │   ├── models/               # Modelos e interfaces de datos de TypeScript
│   │   │   ├── pages/                # Vistas y páginas principales de la SPA
│   │   │   │   ├── character-sheet/  # Hoja de personaje interactiva y HUD de combate
│   │   │   │   ├── forge-character/  # Creador guiado de personajes D&D 5e
│   │   │   │   ├── homebrew/         # Taller de contenido homebrew de la comunidad
│   │   │   │   ├── homebrew-item-form/ # Creador dedicado de objetos mágicos custom
│   │   │   │   ├── homebrew-spell-form/# Creador dedicado de conjuros mágicos custom
│   │   │   │   ├── homebrew-race-form/ # Creador dedicado de razas custom
│   │   │   │   ├── homebrew-class-form/# Creador dedicado de clases custom
│   │   │   │   ├── homebrew-subclass-form/# Creador dedicado de subclases custom
│   │   │   │   ├── bestiary/         # Base de datos de monstruos oficiales y custom
│   │   │   │   └── campaigns/        # Planificador de campañas y CRM para Pro-GMs
│   │   │   ├── services/             # Clientes HTTP y lógica de servicios
│   │   │   ├── utils/                # Utilidades de frontend y cálculos matemáticos
│   │   │   └── app.routes.ts         # Configuración de rutas de navegación
│   │   ├── theme/                    # Tokens de diseño HSL y hojas de estilos globales
│   │   └── main.ts                   # Módulo de inicialización
│   ├── package.json                  # Dependencias del frontend
│   ├── ionic.config.json             # Configuración del framework Ionic
│   └── ...
│
└── README.md                         # Documentación del proyecto
```

---

## 🌐 Entornos en Vivo

La plataforma en producción está completamente desplegada y operativa:

- **Cliente Frontend (GitHub Pages):** [https://pabloostenero.github.io/MasterForge/](https://pabloostenero.github.io/MasterForge/)
- **API Backend (Render):** [https://masterforge-4n4g.onrender.com](https://masterforge-4n4g.onrender.com)
- **Base de Datos (Supabase PostgreSQL):** Conectada mediante un pool seguro en el puerto `5432`

---

## 🛠️ Configuración y Desarrollo Local

Si deseas contribuir, probar nuevas funcionalidades o ejecutar una copia local sandbox de MasterForge, por favor consulta nuestro manual de configuración detallado:

👉 **[Guía de Desarrollo Local y Primeros Pasos](./GETTING_STARTED.md)**

---

## 📦 Alcance del Proyecto

### MVP (Producto Mínimo Viable) - Incluido

- ✅ Motor de reglas de D&D 5e limitado al contenido del SRD 5.1
- ✅ Panel web de gestión para Pro-GMs (CRM y gestión de sesiones)
- ✅ App mobile-first de constructor de personajes para jugadores
- ✅ Cálculos de estadísticas de personajes en tiempo real
- ✅ Taller de Contenido Homebrew Personalizado (objetos, conjuros, razas, clases, subclases y monstruos)
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
| **RF05** | Creador de homebrew y validador mecánico de reglas asistido por IA | DEBERÍA |
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

### Fase 1 (MVP Multiplataforma - Completado ✅)
- [x] Endpoints core de API backend (auth, jugadores, sesiones)
- [x] Motor de reglas D&D 5e (creación de personajes y cálculos de estadísticas)
- [x] Constructor de personajes frontend y sincronización dinámica de hoja
- [x] Panel de control básico del GM (CRM y base de datos de jugadores)
- [x] Autenticación JWT segura sin estado
- [x] **Compilación Móvil Nativa:** Generación de la aplicación nativa Android `.apk` mediante Ionic + Capacitor
- [x] **Migración de Base de Datos Cloud:** Configuración de PostgreSQL en Supabase con pooler Hikari
- [x] **Despliegue de Backend Cloud:** Lanzamiento en Render usando compilación Docker multi-stage
- [x] **Despliegue de Frontend Cloud:** Alojamiento en GitHub Pages con soporte de deep routing SPA (fallback `404.html`) y pipeline `.nojekyll`
- [x] **Validación de Auditoría E2E:** Framework robusto de pruebas (`audit_runner.js`) garantizando cero desvíos de reglas/estadísticas

### Fase 2 (Trabajos Futuros e IA Homebrew)
- [ ] **Mejoras del Motor**: Implementación de Dotes (Feats), seguimiento de Condiciones/Estados e inventario con carga física por peso (Encumbrance)
- [ ] **Asistente de IA**: Integración segura de LLM en el Sandbox para guiar descripciones de lore en la co-creación
- [ ] **Validador de Balance de IA**: Validación numérica automatizada comparando propiedades homebrew con las curvas matemáticas del SRD 5.1

---

## 📝 Documentación de API

Una vez que el backend está en ejecución, accede a la interfaz Swagger interactiva:

```
http://localhost:8080/swagger-ui.html
```

### Endpoints Clave (Ejemplos)

```
POST   /api/users                 - Registro de nuevos usuarios
POST   /api/auth/login            - Autenticación de usuario (retorna token JWT)
GET    /api/characters/user/{id}  - Obtener personajes de un usuario
GET    /api/characters/{id}       - Obtener detalles de un personaje específico
PUT    /api/characters/{id}/hp    - Actualizar puntos de vida del personaje
GET    /api/sessions              - Listar sesiones de campaña programadas
POST   /api/sessions              - Programar nueva sesión de campaña (solo DM)
GET    /api/monsters              - Obtener lista de monstruos con filtros
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

## ⭐ Apoya el Proyecto

Si encuentras MasterForge útil, por favor considera:
- ⭐ Dar una estrella a este repositorio
- 🐛 Reportar bugs y sugerir características
- 💬 Unirte a nuestras discusiones comunitarias
- 🔄 Contribuir código o documentación


