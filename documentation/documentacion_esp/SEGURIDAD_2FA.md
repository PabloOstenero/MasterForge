# Arquitectura de Seguridad: Autenticación de Dos Factores (2FA)

MasterForge implementa un sistema robusto de Autenticación de Dos Factores basado en el estándar **TOTP (Time-based One-Time Password)**, siguiendo específicamente el **RFC 6238**.

## Descripción General

El 2FA añade una capa extra de seguridad al requerir no solo la contraseña, sino también un código temporal de 6 dígitos generado por una aplicación de autenticación (como Google Authenticator, Authy o Microsoft Authenticator).

## Implementación Técnica

### Backend (Kotlin / Spring Boot)
- **Librería**: `dev.samstevens.totp:totp` para los cálculos principales de HMAC-SHA1.
- **Protocolo**: TOTP (Contraseña de un solo uso basada en tiempo).
- **Sincronización Temporal**: El servidor está forzado a **UTC** para asegurar la compatibilidad global.
- **Ventana de Verificación**: Se permite una ventana de +/- 60 segundos para compensar pequeñas derivas en el reloj entre el dispositivo del cliente y el servidor.
- **Persistencia**: 
    - Los secretos se almacenan como cadenas Base32 en la tabla `users`.
    - Los códigos de recuperación se gestionan mediante `@ElementCollection`.

### Frontend (Angular / Ionic)
- **Generación de QR**: Utiliza la librería `qrcode` para generar imágenes escaneables a partir del URI estándar `otpauth://`.
- **Flujo de Desafío**: Un modal dedicado (`MfaModalComponent`) gestiona el segundo paso de autenticación durante el inicio de sesión.
- **Sincronización de Estado**: La aplicación utiliza el estado de `currentUser` para mostrar/ocultar dinámicamente las opciones de configuración de 2FA.

## Sistema de Recuperación

Para prevenir el bloqueo de cuentas en caso de pérdida del dispositivo, MasterForge genera **10 Códigos de Recuperación únicos** (de 8 caracteres) durante la activación.
- **Uso único**: Cada código de recuperación se invalida inmediatamente tras un uso exitoso.
- **Opciones de exportación**: Los usuarios pueden copiar los códigos al portapapeles o descargarlos como un archivo `.txt`.

## Consideraciones de Seguridad
- **Uso de UTC**: Todos los cálculos basados en tiempo se realizan en UTC para evitar errores por zonas horarias.
- **Verificación Manual**: La implementación utiliza una verificación manual robusta a través de múltiples intervalos de tiempo para asegurar la fiabilidad sin sacrificar la seguridad.
- **Protección de Secretos**: Los secretos nunca se exponen al frontend después de la fase de configuración inicial.

## Flujo de Trabajo del Usuario
1. **Configuración**: El usuario solicita el setup -> El servidor genera el secreto -> El usuario escanea el QR.
2. **Activación**: El usuario introduce un código de 6 dígitos -> El servidor guarda el secreto y genera códigos de recuperación.
3. **Login**: Verificación de contraseña -> Generación de Token MFA -> Verificación de código 2FA o código de recuperación -> Generación del JWT final.
4. **Desactivación**: Un usuario autenticado puede desactivar el 2FA en cualquier momento, lo que borra el secreto y los códigos de recuperación de la base de datos.
