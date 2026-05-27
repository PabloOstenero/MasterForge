# Guía de Desarrollo Local y Primeros Pasos

Este documento describe los requisitos y pasos de configuración necesarios para establecer tu entorno sandbox local y ejecutar MasterForge en tu ordenador.

---

## 🚀 Primeros Pasos

### Requisitos Previos

- **Node.js** v18+ (para desarrollo frontend)
- **npm** o **yarn** (gestor de paquetes)
- **Java 17** (para backend)
- **Gradle** 7.0+ (incluido en el wrapper)
- **PostgreSQL** 13+ (base de datos)
- **Git** (control de versiones)

---

## 💻 Configuración del Backend

1. **Navega al directorio del backend:**
   ```bash
   cd masterforge-backend
   ```

2. **Configura tu conexión local a PostgreSQL** en `src/main/resources/application.properties`:
   ```properties
   spring.datasource.url=jdbc:postgresql://localhost:5432/masterforge
   spring.datasource.username=tu_usuario_bd
   spring.datasource.password=tu_contraseña_bd
   spring.jpa.hibernate.ddl-auto=update
   ```

3. **Construye y compila el backend:**
   ```bash
   ./gradlew build
   ```

4. **Inicia el servidor Spring Boot:**
   ```bash
   ./gradlew bootRun
   ```

5. **Verifica que la API local esté en ejecución:**
   ```bash
   curl http://localhost:8080/api/health
   ```

---

## 🎨 Configuración del Frontend

1. **Navega al directorio del frontend:**
   ```bash
   cd masterforge-frontend
   ```

2. **Instala las dependencias del proyecto:**
   ```bash
   npm install
   ```

3. **Configura los endpoints locales de API y WebSockets** en `src/environments/environment.ts`:
   ```typescript
   export const environment = {
     production: false,
     apiBaseUrl: 'http://localhost:8080',
     wsBaseUrl: 'ws://localhost:8080',
   };
   ```

4. **Inicia el servidor de desarrollo local de Ionic/Angular:**
   ```bash
   npm start
   ```

5. **Abre la aplicación en tu navegador:**
   ```
   http://localhost:8100
   ```

---

## 🐳 Docker (Opcional)

*(Próximamente: configuración de Docker Compose para despliegues contenedorizados locales de la plataforma completa)*
