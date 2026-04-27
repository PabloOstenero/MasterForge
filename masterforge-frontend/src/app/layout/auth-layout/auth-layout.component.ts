import { Component, inject, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { AsyncPipe } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { RoleService } from '../../services/role.service';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [RouterModule, AsyncPipe],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './auth-layout.component.html',
  styleUrls: ['./auth-layout.component.scss'],
})
export class AuthLayoutComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private roleService = inject(RoleService);

  menuItems$ = this.roleService.menuItems$;

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
