# 🧪 Guía de Pruebas de MasterForge

Esta guía describe la arquitectura de pruebas, las estrategias de verificación, las instrucciones de ejecución y las mejores prácticas tanto para el backend (Kotlin/Spring Boot) como para el frontend (Angular/Ionic) de la aplicación MasterForge.

---

## 🗺️ Descripción General de las Pruebas

MasterForge emplea una estrategia de pruebas multinivel:
1. **Pruebas Unitarias y de Integración**: Pruebas deterministas estándar dirigidas a servicios de negocio aislados, controladores HTTP y repositorios de base de datos.
2. **Pruebas Basadas en Propiedades (PBT - Property-Based Testing)**: Pruebas de fuzzing/generación de entradas aleatorias para asegurar comportamientos invariantes del sistema bajo cientos de conjuntos de datos variados, descubriendo casos extremos ocultos que las pruebas manuales no logran identificar.
3. **Integración Continua (CI)**: Flujo de trabajo de GitHub Actions automatizado que ejecuta ambas suites de pruebas en cada push o pull request.

---

## ☕ Pruebas en el Backend (Kotlin y JUnit 5)

El backend utiliza JUnit 5 estándar, Spring Boot Test y conceptos de pruebas basadas en propiedades.

### Ejecución de Pruebas del Backend
* **Ejecutar toda la suite**:
  ```bash
  # En macOS/Linux
  ./gradlew test
  
  # En Windows
  .\gradlew.bat test
  ```
* **Ejecutar una clase de prueba específica**:
  ```bash
  ./gradlew test --tests "com.masterforge.masterforge_backend.service.FeatureChoiceEngineTest"
  ```

### Principios Clave
* **Simulaciones de Pago**: Al probar campañas o resultados de transacciones, utiliza el enum `PaymentScenario` en tus solicitudes de pago para simular de forma segura escenarios de fallo o éxito sin necesidad de una conexión real con una pasarela de pago externa.
* **Mocks de Repositorios**: Utiliza los mocks estándar de Spring Boot o Spring Data. Asegúrate de mapear completamente las entidades como `CampaignEnrollment` al probar patrones de consulta de campañas de jugadores.

---

## 🎨 Pruebas en el Frontend (Angular, Jasmine, Karma y Fast-Check)

El frontend utiliza Jasmine para aserciones, Karma como ejecutor de pruebas (lanzando navegadores Chrome en modo headless o con interfaz) y `fast-check` para pruebas basadas en propiedades (PBT).

### Ejecución de Pruebas del Frontend
* **Ejecutar toda la suite (modo interactivo con watch)**:
  ```bash
  npm test
  ```
* **Ejecutar toda la suite (ejecución única, Chrome Headless)**:
  ```bash
  npx ng test --watch=false --browsers=ChromeHeadlessNoSandbox
  ```
* **Ejecutar un archivo spec específico (altamente recomendado por su rapidez)**:
  ```bash
  # Ejecuta únicamente un archivo de pruebas específico
  npx ng test --watch=false --browsers=ChromeHeadlessNoSandbox --include=src/app/pages/homebrew/homebrew.page.spec.ts
  ```

---

## 🧠 Pruebas Basadas en Propiedades (PBT) en MasterForge

Las pruebas basadas en propiedades comprueban que una *propiedad* o comportamiento invariante del sistema permanece válido para cualquier entrada permitida, utilizando generadores para fuzzear las entradas.

### PBT en el Frontend con `fast-check`
Utilizamos `fast-check` de forma extensiva para generar entradas simuladas para formularios, layouts y formateadores de datos.
Ejemplo:
```typescript
import * as fc from 'fast-check';

it('los precios positivos siempre deben terminar en "€" y contener un punto decimal', () => {
  fc.assert(
    fc.property(
      fc.double({ min: 0.01, max: 9999, noNaN: true }),
      (price) => {
        const formatted = CampaignFormatter.formatPrice(price);
        return formatted.endsWith('€') && formatted.includes('.');
      }
    )
  );
});
```

Al crear especificaciones de PBT:
1. Define generadores claros (usando `fc.record`, `fc.array`, `fc.constant`, etc.) que reflejen correctamente los límites de validación de producción.
2. En tus bloques de comparación, asegúrate de rellenar los registros generados aleatoriamente con los valores por defecto del sistema (como `actionType: 'PASSIVE'` o `id: null`), ya que los componentes de producción serializan propiedades por defecto que los generadores aleatorios puros omiten.
3. Invoca `await fixture.whenStable()` dentro de las funciones asíncronas de aserción de propiedades para garantizar que los hooks del ciclo de vida y la detección de cambios de Angular se completen de manera absoluta antes de realizar consultas en los nodos del DOM.

---

## 🛠️ Problemas Comunes y Resolución de Errores

### 1. Contexto de Inyección de Angular 18/19 Standalone (`NG0203`)
Utilizar `inject(Service)` en inicializadores de propiedades de clase lanza un error fatal `NG0203` si la clase se instancia fuera de un contexto de inyección activo (como llamadas manuales `new Service()` en pruebas de PBT).
* **Solución**: Utiliza inyección por constructor para las dependencias donde sea posible. Para servicios como `RoleService` que se resuelven tanto dentro como fuera de contextos de inyección estándar, utiliza parámetros opcionales en el constructor con un fallback seguro utilizando try-catch:
  ```typescript
  constructor(authService?: AuthService) {
    if (authService) {
      this.authService = authService;
    } else {
      try {
        this.authService = inject(AuthService);
      } catch (e) {
        this.authService = { /* Métodos mock de fallback */ } as any;
      }
    }
  }
  ```

### 2. Proveedor de HttpClient no Encontrado (`NG0201`)
Cuando un componente o servicio es `@Injectable({ providedIn: 'root' })`, resolverlo fuera de componentes tradicionales hace que se cargue desde el inyector del entorno raíz, omitiendo los proveedores definidos en el `TestBed` y fallando debido a la falta del proveedor de `HttpClient`.
* **Solución**: Añade el servicio directamente al array de `providers` en `TestBed.configureTestingModule` (por ejemplo, a través de `getCommonMocks()`). Esto fuerza a Angular a compilar el servicio dentro de los límites del inyector del TestBed donde `AuthService` o `HttpClient` se encuentran mockeados.

### 3. Inyectores Nulos en Controladores de Ionic
Cuando las páginas utilizan capas superpuestas de Ionic (Modales, ActionSheets, Alertas o Toasts), sus pruebas unitarias fallarán con un `NullInjectorError` si sus controladores correspondientes no son mockeados en el TestBed.
* **Solución**: Proporciona mocks mínimos o espías de Jasmine para los controladores de Ionic en `providers`:
  ```typescript
  providers: [
    { provide: AlertController, useValue: jasmine.createSpyObj('AlertController', ['create']) },
    { provide: ModalController, useValue: jasmine.createSpyObj('ModalController', ['create']) },
    { provide: ToastController, useValue: jasmine.createSpyObj('ToastController', ['create']) },
    { provide: ActionSheetController, useValue: jasmine.createSpyObj('ActionSheetController', ['create']) },
  ]
  ```

### 4. Renderizado Asíncrono de Plantillas
Los componentes de Angular con suscripciones anidadas u observables síncronos que desencadenan sub-renderizados pueden no reflejar el resultado en la plantilla inmediatamente tras llamar a `fixture.detectChanges()`.
* **Solución**: Fuerza el ciclo de vida de renderizado completo utilizando:
  ```typescript
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  ```

---

## 🚀 Integración en el Pipeline de CI
MasterForge ejecuta todas las suites de pruebas de Gradle y Karma automáticamente en cada commit a través de GitHub Actions.
Archivo del flujo de trabajo: `.github/workflows/ci.yml`
Compila, linterea y ejecuta las pruebas en modo headless y sandbox para asegurar la introducción de cero regresiones en cada pull request.

---

## 📊 Informe del Último Reporte de Pruebas

Se ejecutó con éxito una verificación completa tanto de la suite de pruebas del backend como del frontend.

### ☕ Suite de Pruebas JUnit 5 del Backend
* **Comando de ejecución**: `.\gradlew.bat test` (en Windows) o `./gradlew test` (en Unix/macOS)
* **Pruebas superadas**: El 100% de todos los módulos del backend compilados están en verde.
* **Estado**: **`BUILD SUCCESSFUL`** (0 fallos, estable).

### 🎨 Suite Jasmine + Karma + Fast-Check PBT del Frontend
* **Comando de ejecución**: `npx ng test --watch=false --browsers=ChromeHeadlessNoSandbox`
* **Pruebas ejecutadas**: 1,601 especificaciones de prueba (incluyendo pruebas basadas en propiedades).
* **Resultados**: 
  * **Éxito**: **1,601**
  * **Fallos**: **0**
* **Estado**: **`1601 SUCCESS`** (100% de tasa de éxito, estable).

### 📈 Matriz de Aseguramiento de Calidad

| Componente / Capa | Estrategia de Prueba | Estado |
| :--- | :--- | :---: |
| **Controladores y Servicios del Backend** | JUnit 5 Determinista | **APROBADO** |
| **Propiedades del Backend** | JUnit 5 Basado en Propiedades | **APROBADO** |
| **Componentes de Formulario y Páginas** | Angular Component TestBed | **APROBADO** |
| **Formateadores y Utilidades Lógicas** | Pruebas Unitarias Aisladas | **APROBADO** |
| **Validación de Formularios y Flujos** | Fuzzing PBT con Fast-Check | **APROBADO** |
| **Cálculos de Ficha de Personaje** | Suma de Espacios de Conjuros Anuidos | **APROBADO** |
| **Creador de Personaje (Character Forge)** | Avance de Pasos y Selector de Equipo | **APROBADO** |
