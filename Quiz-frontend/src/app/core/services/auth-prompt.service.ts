import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AuthPromptService {
  constructor(private router: Router) {}

  isAuthenticated(): boolean {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        return !!(user && (user.id || user.ID));
      }
    } catch {}
    try {
      const s = sessionStorage.getItem('currentUserId');
      if (s) return true;
    } catch {}
    return false;
  }

  // If authenticated, return true. Otherwise prompt and navigate to login if confirmed.
  requireLogin(redirectAfterLogin?: string): boolean {
    if (this.isAuthenticated()) return true;
    const ok = window.confirm('Bạn cần đăng nhập hoặc đăng ký để thực hiện hành động này. Mở trang đăng nhập bây giờ?');
    if (ok) {
      // pass redirect as query param so login page can redirect back if implemented
      const url = '/login' + (redirectAfterLogin ? ('?redirect=' + encodeURIComponent(redirectAfterLogin)) : '');
      this.router.navigateByUrl(url);
    }
    return false;
  }
}
