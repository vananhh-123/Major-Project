import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.css']
})
export class Navbar implements OnInit {
  @Input() type: 'auth' | 'home' | 'profile' | 'game' | 'auth-signin' | 'auth-signup' | 'dashboard' = 'home';

  username = 'Alex Rivera';
  avatar = '/User.png';
  isAdmin = false;

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.loadUser();
  }

  loadUser(): void {
    const storedUser = localStorage.getItem('user');

    if (!storedUser) {
      return;
    }

    try {
      const user = JSON.parse(storedUser);

      this.username =
        user.user_name ||
        user.username ||
        user.name ||
        'Alex Rivera';

      this.avatar =
        user.avatar ||
        '/User.png';

      const role = String(user.role || '').toLowerCase();

      this.isAdmin =
        role === 'admin' ||
        role === 'superadmin' ||
        role === 'super_admin';
    } catch (e) {
      console.error('Error parsing user', e);
    }
  }

  goToAdmin(event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/admin/dashboard']);
  }
}