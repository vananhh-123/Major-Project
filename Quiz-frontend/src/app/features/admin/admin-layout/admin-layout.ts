import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet
} from '@angular/router';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive
  ],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.css'
})
export class AdminLayout implements OnInit {
  unreadNotifications = 4;
  showSupportModal = false;

  adminName = 'Admin';
  adminEmail = 'just4quiz@gmail.com';
  adminRole = 'Admin';
  adminAvatar = '';

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.loadAdminInfo();
  }

  loadAdminInfo(): void {
    const rawUser = localStorage.getItem('user');

    if (!rawUser) {
      this.setFallbackAvatar();
      return;
    }

    try {
      const user = JSON.parse(rawUser);

      this.adminName = user.username || user.name || 'JUST4QUIZ Admin';
      this.adminEmail = user.email || 'just4quiz@gmail.com';
      this.adminRole = this.formatRole(user.role || 'admin');
      this.adminAvatar = user.avatar || '';

      if (!this.adminAvatar) {
        this.setFallbackAvatar();
      }
    } catch {
      this.setFallbackAvatar();
    }
  }

  goToUserView(): void {
    this.router.navigate(['/app/dashboard']);
  }

  goToAdminConsole(): void {
    this.router.navigate(['/admin/dashboard']);
  }

  openSupport(): void {
    this.showSupportModal = true;
  }

  closeSupport(): void {
    this.showSupportModal = false;
  }

  logout(): void {
    const confirmed = confirm('Are you sure you want to logout?');

    if (!confirmed) return;

    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    localStorage.removeItem('admin_profile_preferences');

    this.router.navigate(['/login']);
  }

  private setFallbackAvatar(): void {
    this.adminAvatar =
      `https://api.dicebear.com/8.x/avataaars/svg?seed=${encodeURIComponent(this.adminEmail || this.adminName || 'Admin')}`;
  }

  private formatRole(value: string): string {
    const role = String(value || '').toLowerCase();

    if (role === 'superadmin' || role === 'super_admin' || role === 'super admin') {
      return 'Super Admin';
    }

    return 'Admin';
  }
}