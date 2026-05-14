# Autenticación y Seguridad de Contraseñas

Este documento describe la arquitectura de almacenamiento y verificación de contraseñas de MasterForge.

## Stack Tecnológico
- **Algoritmo de Hashing:** BCrypt
- **Implementación:** Spring Security `BCryptPasswordEncoder`
- **Gestión de Sesiones:** JSON Web Tokens (JWT)

## Flujo de Almacenamiento de Contraseñas

### 1. Registro / Creación de Usuario
Cuando se crea un nuevo usuario a través de `UserController`, la contraseña en texto plano recibida del cliente se cifra (hashing) utilizando BCrypt antes de guardarse en la base de datos.

```kotlin
// UserController.kt
passwordHash = passwordEncoder.encode(userDto.passwordHash)
```

### 2. Verificación de Inicio de Sesión
Durante el proceso de login en `AuthController`, el sistema recupera al usuario de la base de datos y compara la contraseña proporcionada con el hash almacenado utilizando el algoritmo de coincidencia de BCrypt.

```kotlin
// AuthController.kt
if (!passwordEncoder.matches(request.password, user.passwordHash)) {
    // Devuelve UNAUTHORIZED
}
```

## Migración Automática

Para garantizar que los usuarios existentes (que tenían contraseñas en texto plano) no pierdan el acceso a sus cuentas, se ha implementado un servicio llamado `PasswordMigrationService`.

### Cómo funciona:
1. Al iniciar la aplicación, el servicio escanea la tabla de usuarios (`users`).
2. Identifica las contraseñas que no siguen el formato de BCrypt (normalmente cadenas que no empiezan por `$2`).
3. Por cada contraseña en texto plano encontrada, genera un hash de BCrypt y actualiza el registro en la base de datos.
4. Una vez que un usuario ha sido migrado, su contraseña en texto plano se elimina permanentemente del sistema.

## Buenas Prácticas de Seguridad
- **Nunca registrar contraseñas:** El sistema está configurado para no registrar nunca contraseñas en bruto ni sus hashes en los logs.
- **Sal (Salt) incluida:** BCrypt gestiona automáticamente la "sal", protegiendo contra ataques de tablas arcoíris (rainbow tables).
- **Factor de trabajo:** Se utiliza el factor de trabajo por defecto, proporcionando un buen equilibrio entre seguridad y rendimiento.
