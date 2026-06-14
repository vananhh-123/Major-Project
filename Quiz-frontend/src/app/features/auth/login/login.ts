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

  ngOnInit() {
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

  private redirectAfterLogin(user: any) {
    const role = String(user?.role || '').toLowerCase();
    const status = String(user?.status || '').toLowerCase();

    console.log('ROLE:', role);
    console.log('STATUS:', status);

    if (status === 'blocked') {
      alert('Tài khoản của bạn đã bị khóa.');
      localStorage.clear();
      return;
    }

    if (role === 'admin') {
      this.router.navigate(['/admin/dashboard']);
    } else {
      this.router.navigate(['/app/dashboard']);
    }
  }

  handleGoogleLogin(response: any) {
    if (!response.credential) return;

    this.http.post(`${API_CONFIG.AUTH_API}/google`, {
      token: response.credential
    }).subscribe({
      next: (res: any) => {
        this.ngZone.run(() => {
          console.log('Google Login success:', res);

          localStorage.setItem('token', res?.token || 'test-token');

          if (res?.user) {
            localStorage.setItem('user', JSON.stringify(res.user));
            this.redirectAfterLogin(res.user);
          }
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

  togglePassword() {
    this.passwordVisible = !this.passwordVisible;
  }

  showComingSoon(event: Event) {
    event.preventDefault();
    alert('Tính năng này hiện tại chưa được cập nhật!');
  }

  onLogin() {
    if (!this.email || !this.password) {
      alert('Please enter email and password');
      return;
    }

    this.http.post(`${API_CONFIG.AUTH_API}/login`, {
      email: this.email,
      password: this.password
    }).subscribe({
      next: (res: any) => {
        console.log('Login success:', res);

        localStorage.setItem('token', res?.token || 'test-token');

        if (res?.user) {
          localStorage.setItem('user', JSON.stringify(res.user));
          this.redirectAfterLogin(res.user);
        }
      },
      error: (err) => {
        console.error('Login error:', err);
        alert('Login failed: ' + (err.error?.error || err.message));
      }
    });
  }
}