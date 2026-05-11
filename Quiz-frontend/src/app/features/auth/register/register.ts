import { Component, inject, OnInit, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';

declare var google: any;

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, RouterModule],
  templateUrl: './register.html',
  styleUrls: ['./register.css']
})
export class Register implements OnInit {
  passwordVisible: boolean = false;
  username = '';
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
        document.getElementById("google-btn"),
        { theme: "outline", size: "large", width: 360, shape: "rectangular", type: "standard", text: "continue_with" }
      );
    }
  }

  handleGoogleLogin(response: any) {
    if (response.credential) {
      const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
      this.http.post('http://10.106.34.149:8080/auth/google', { token: response.credential }, { headers }).subscribe({
        next: (res: any) => {
          this.ngZone.run(() => {
            if (res?.user) {
              localStorage.setItem('user', JSON.stringify(res.user));
              localStorage.setItem('token', res.token || 'fake_jwt_token');
            }
            alert('Welcome! Google Auth Successful.');
            this.router.navigate(['/app/dashboard']);
          });
        },
        error: (err) => {
          console.error('Google register error:', err);
          this.ngZone.run(() => alert('Google Register failed: ' + (err.error?.error || err.message)));
        }
      });
    }
  }

  togglePassword() { 
    this.passwordVisible = !this.passwordVisible; 
  }

  onRegister() {
    if (!this.username || !this.email || !this.password) {
      alert('Please fill out all fields');
      return;
    }
    
    this.http.post('http://10.106.34.149:8080/auth/register', {
      username: this.username,
      email: this.email,
      password: this.password
    }).subscribe({
      next: (res: any) => {
        console.log('Register success:', res);
        
        // Save user info and login immediately
        if (res?.user) {
          localStorage.setItem('user', JSON.stringify(res.user));
          localStorage.setItem('token', 'test-token'); // Replace this with real JWT token if backend implements it
        }

        alert('Welcome ' + this.username + '! Starting your Journey...');
        
        // Auto-login after register
        this.router.navigate(['/app/dashboard']);
      },
      error: (err) => {
        console.error('Register error:', err);
        alert('Registration failed: ' + (err.error?.error || err.message));
      }
    });
  }

  showComingSoon(event: Event) {
    event.preventDefault();
    alert('Tính năng này hiện tại chưa được cập nhật!');
  }
}
