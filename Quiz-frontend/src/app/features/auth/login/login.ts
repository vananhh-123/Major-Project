import { Component, inject, OnInit, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { API_CONFIG } from '../../../config/api.config';

declare var google: any;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, RouterModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class Login implements OnInit {
  passwordVisible = false;
  email = '';
  password = '';

  private http = inject(HttpClient);
  private router = inject(Router);
  private ngZone = inject(NgZone);

  ngOnInit(): void {
    if (typeof google !== 'undefined') {
      google.accounts.id.initialize({
        client_id: '1071989516356-g8rlcjaq54f9mfhtefnt9o84m9gfkcki.apps.googleusercontent.com',
        callback: (response: any) => this.handleGoogleLogin(response)
      });

      google.accounts.id.renderButton(
        document.getElementById('google-btn'),
        {
          theme: 'outline',
          size: 'large',
          width: 360,
          shape: 'rectangular',
          type: 'standard',
          text: 'continue_with'
        }
      );
    }
  }

  togglePassword(): void {
    this.passwordVisible = !this.passwordVisible;
  }

  showComingSoon(event: Event): void {
    event.preventDefault();
    alert('Tính năng này hiện tại chưa được cập nhật!');
  }

  onLogin(): void {
    if (!this.email || !this.password) {
      alert('Please enter email and password');
      return;
    }

    this.http.post(`${API_CONFIG.AUTH_API}/login`, {
      email: this.email.trim(),
      password: this.password
    }).subscribe({
      next: (res: any) => {
        console.log('Login success:', res);
        this.handleLoginSuccess(res);
      },
      error: (err) => {
        console.error('Login error:', err);
        alert('Login failed: ' + (err.error?.error || err.message));
      }
    });
  }

  handleGoogleLogin(response: any): void {
    if (!response.credential) return;

    this.http.post(`${API_CONFIG.AUTH_API}/google`, {
      token: response.credential
    }).subscribe({
      next: (res: any) => {
        this.ngZone.run(() => {
          console.log('Google Login success:', res);
          this.handleLoginSuccess(res);
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          console.error('Google Login error:', err);
          alert('Google login failed: ' + (err.error?.error || 'Server error'));
        });
      }
    });
  }

  private handleLoginSuccess(res: any): void {
    const token = res?.token || res?.access_token || 'test-token';

    const rawUser =
      res?.user ||
      res?.data?.user ||
      res?.account ||
      res;

    const normalizedUser = this.normalizeUser(rawUser);

    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(normalizedUser));

    this.redirectAfterLogin(normalizedUser);
  }

  private normalizeUser(user: any): any {
    const email = String(
      user?.email ||
      this.email ||
      ''
    ).trim();

    let role = String(
      user?.role ||
      user?.Role ||
      ''
    ).toLowerCase();

    const status = String(
      user?.status ||
      user?.Status ||
      'active'
    ).toLowerCase();

    if (email.toLowerCase() === 'just4quiz@gmail.com') {
      role = 'admin';
    }

    if (!role) {
      role = 'user';
    }

    return {
      id: user?.id || user?.ID || '',
      username:
        user?.username ||
        user?.Username ||
        user?.name ||
        user?.Name ||
        (role === 'admin' ? 'JUST4QUIZ Admin' : 'Player'),
      email,
      role,
      status,
      avatar: user?.avatar || user?.Avatar || '',
      created_at: user?.created_at || user?.CreatedAt || user?.createdAt || ''
    };
  }

  private redirectAfterLogin(user: any): void {
    const role = String(user?.role || '').toLowerCase();
    const status = String(user?.status || '').toLowerCase();

    console.log('FINAL USER:', user);
    console.log('ROLE:', role);
    console.log('STATUS:', status);

    if (status === 'blocked') {
      alert('Tài khoản của bạn đã bị khóa.');
      localStorage.clear();
      this.router.navigate(['/login']);
      return;
    }

    if (role === 'admin' || role === 'super_admin' || role === 'superadmin') {
      this.router.navigateByUrl('/admin/dashboard');
      return;
    }

    this.router.navigateByUrl('/app/dashboard');
  }
}