import { Component } from '@angular/core';
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
export class AdminLayout {
  unreadNotifications = 4;
  showSupportModal = false;

  constructor(private router: Router) {}

  openSupport(): void {
    this.showSupportModal = true;
  }

  closeSupport(): void {
    this.showSupportModal = false;
  }

  logout(): void {
    const confirmed = confirm('Are you sure you want to logout?');

    if (!confirmed) {
      return;
    }

    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('role');

    this.router.navigate(['/login']);
  }
}