import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-admin-logout',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-logout.html',
  styleUrl: './admin-logout.css'
})
export class AdminLogout {
  constructor(private router: Router) {}

  confirmLogout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('role');

    this.router.navigate(['/login']);
  }
}