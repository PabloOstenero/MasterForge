# Authentication & Password Security

This document describes the password storage and verification architecture for MasterForge.

## Technology Stack
- **Hashing Algorithm:** BCrypt
- **Implementation:** Spring Security `BCryptPasswordEncoder`
- **Session Management:** JSON Web Tokens (JWT)

## Password Storage Flow

### 1. User Registration / Creation
When a new user is created via `UserController`, the plain-text password received from the client is hashed using BCrypt before being saved to the database.

```kotlin
// UserController.kt
passwordHash = passwordEncoder.encode(userDto.passwordHash)
```

### 2. Login Verification
During the login process in `AuthController`, the system retrieves the user from the database and compares the provided raw password with the stored hash using BCrypt's matching algorithm.

```kotlin
// AuthController.kt
if (!passwordEncoder.matches(request.password, user.passwordHash)) {
    // Return UNAUTHORIZED
}
```

## Automatic Migration

To ensure that existing users (who had plain-text passwords) do not lose access to their accounts, a `PasswordMigrationService` has been implemented.

### How it works:
1. On application startup, the service scans the `users` table.
2. It identifies passwords that do not follow the BCrypt format (typically strings starting with `$2`).
3. For each plain-text password found, it generates a BCrypt hash and updates the database record.
4. Once a user is migrated, their plain-text password is permanently removed from the system.

## Security Best Practices
- **Never log passwords:** The system is configured to never log raw passwords or hashes.
- **Salt included:** BCrypt automatically handles salting, protecting against rainbow table attacks.
- **Work factor:** The default work factor is used, providing a good balance between security and performance.
