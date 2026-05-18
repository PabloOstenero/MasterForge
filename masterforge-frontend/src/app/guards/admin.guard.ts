import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const currentUser = authService.getCurrentUser();
  if (currentUser && (currentUser.role === 'ADMIN' || currentUser.role === 'MANAGER')) {
    return true;
  }

  // Not an admin, redirect to home
  router.navigate(['/home']);
  return false;
};
