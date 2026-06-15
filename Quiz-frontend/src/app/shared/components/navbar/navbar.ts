import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class Navbar implements OnInit {
  @Input() type: string = 'profile';

  username = 'JUST4QUIZ';
  avatar = '/User.png';
  isAdmin = false;

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.loadCurrentUser();
  }

  loadCurrentUser(): void {
    const rawUser = localStorage.getItem('user');
    const rawRole = localStorage.getItem('role');

    if (!rawUser) {
      this.username = 'JUST4QUIZ';
      this.avatar = '/User.png';
      this.isAdmin = String(rawRole || '').toLowerCase() === 'admin';
      return;
    }

    try {
      const parsed = JSON.parse(rawUser);

      const user =
        parsed.user ||
        parsed.data?.user ||
        parsed.data ||
        parsed;

      this.username =
        user.username ||
        user.name ||
        user.full_name ||
        user.fullName ||
        user.email ||
        'JUST4QUIZ Admin';

      const role = String(
        user.role ||
        parsed.role ||
        parsed.data?.role ||
        rawRole ||
        ''
      ).toLowerCase();

      this.isAdmin =
        role === 'admin' ||
        role === 'superadmin' ||
        role === 'super_admin' ||
        role === 'super admin';

      this.avatar =
        user.avatar ||
        user.avatarUrl ||
        user.photoURL ||
        `https://api.dicebear.com/8.x/avataaars/svg?seed=${encodeURIComponent(this.username)}`;
    } catch {
      this.username = 'JUST4QUIZ Admin';
      this.avatar =
        'https://api.dicebear.com/8.x/avataaars/svg?seed=JUST4QUIZAdmin';
      this.isAdmin = String(rawRole || '').toLowerCase() === 'admin';
    }
  }

  goToAdmin(event?: Event): void {
    event?.stopPropagation();
    localStorage.setItem('view_mode', 'admin');
    this.router.navigate(['/admin/dashboard']);
  }
}