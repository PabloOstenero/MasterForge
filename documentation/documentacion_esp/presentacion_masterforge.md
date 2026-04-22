### **Propuesta de Proyecto Final de Grado (DAM)**

**Título** MasterForge: Plataforma ERP y Gestor de Campañas para Directores de Juego Profesionales (Pro-GMs).

**Justificación** El propósito del proyecto es desarrollar una solución de software multiplataforma que centralice la creación de contenido y la gestión empresarial para Directores de Juego profesionales (Pro-GMs) y creadores independientes de juegos de rol (TTRPG).

La justificación de este proyecto radica en el crecimiento exponencial del mercado de los juegos de rol, donde cada vez más creadores monetizan sus partidas, campañas y recursos (monstruos, mapas, objetos) a través de plataformas como Patreon o servicios de pago por sesión. Actualmente, estos profesionales carecen de un software de gestión (SGE) adaptado a su nicho. El proyecto cubrirá esta necesidad integrando herramientas de gestión de clientes (CRM para jugadores), calendario de eventos (sesiones) e inventario de activos digitales, cumpliendo así con los requisitos de Sistemas de Gestión Empresarial. A su vez, se planteará un modelo de negocio SaaS (Software as a Service) ideal para el módulo de IPE, todo ello respaldado por una arquitectura técnica robusta y moderna propia del desarrollo multiplataforma (DAM).

**Tecnología y herramientas** El desarrollo se basará en una arquitectura cliente-servidor, separando claramente el *frontend* del *backend*, utilizando las siguientes tecnologías:

* **Frontend (Cliente Multiplataforma):** **Ionic Framework y Angular**. Se desarrollará un panel de administración web completo para la gestión del Director de Juego, exportable también como aplicación móvil nativa (Android/iOS) para consultas rápidas o para la vista de los jugadores.  
* **Backend (Lógica de Negocio y API):** Se construirá una API RESTful utilizando **Kotlin** (con frameworks como Spring Boot o Ktor). Este servidor gestionará la seguridad (tokens JWT), la lógica de negocio, las reservas de sesiones y el cálculo de estadísticas de las entidades de rol.  
* **Base de Datos:** Se empleará una base de datos relacional (**PostgreSQL o MySQL**) para estructurar de forma eficiente la información corporativa (usuarios, clientes/jugadores, facturación) y la información lúdica (campañas, fichas dinámicas, bestiario).  
* **Inteligencia Artificial:** Se integrará la API de un modelo de lenguaje (OpenAI o Gemini) en el backend para asistir en la generación procedimental de contenido.  
* **Herramientas de apoyo:** Git/GitHub (control de versiones), Postman (pruebas de API) y Figma (diseño de interfaces).

**Descripción** "MasterForge" es un sistema de gestión integral dividido en dos vertientes principales: la empresarial y la creativa.

En la **vertiente empresarial (SGE)**, la plataforma actúa como un CRM y ERP ligero. El usuario (Director de Juego) cuenta con un panel para gestionar su base de datos de jugadores (clientes), organizar el calendario de sesiones con control de aforo, y administrar su "inventario digital" (paquetes de aventuras, sistemas de reglas propias o *Homebrew*), permitiéndole llevar un control de sus servicios.

En la **vertiente creativa**, la aplicación ofrece un potente creador de entidades (monstruos, NPCs, hechizos y fichas de personajes) con estadísticas dinámicas. El gran valor añadido y la innovación tecnológica del proyecto reside en la integración de Inteligencia Artificial en el backend de Kotlin. A través de un "Asistente de Forja", el usuario puede introducir un *prompt* sencillo (ej. "Crea un jefe final vampiro de nivel 8 adaptado a D\&D"), y el servidor devolverá una ficha técnica completamente generada, balanceada y con su propia historia narrativa, ahorrando horas de preparación al profesional.