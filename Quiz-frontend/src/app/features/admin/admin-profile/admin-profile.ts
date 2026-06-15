import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';

import {
  AdminApi,
  AdminLogApi,
  AdminUserApi
} from '../../../services/admin-api';

import { API_CONFIG } from '../../../config/api.config';

type ActivityType = 'success' | 'info' | 'warning';

interface AdminActivity {
  id: string;
  title: string;
  description: string;
  time: string;
  date: string;
  icon: string;
  type: ActivityType;
}

interface AdminPreference {
  adminPhone: string;
  adminLocation: string;
  twoFactorEnabled: boolean;
  emailNotification: boolean;
  loginAlert: boolean;
  sessionProtection: boolean;
}

@Component({
  selector: 'app-admin-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HttpClientModule],
  templateUrl: './admin-profile.html',
  styleUrl: './admin-profile.css'
})
export class AdminProfile implements OnInit {
  private adminApi = inject(AdminApi);
  private http = inject(HttpClient);

  adminId = '';
  adminName = 'Admin';
  adminEmail = 'just4quiz@gmail.com';
  adminRole = 'Admin';
  adminStatus = 'Active';
  adminPhone = '+84 900 000 000';
  adminLocation = 'Vietnam';
  joinedAt = 'N/A';
  lastLogin = 'Today';
  adminAvatar = '';

  totalQuizzes = 0;
  soloGames = 0;
  multiGames = 0;
  avgScore = 0;

  twoFactorEnabled = true;
  emailNotification = true;
  loginAlert = true;
  sessionProtection = true;

  activities: AdminActivity[] = [];

  ngOnInit(): void {
    this.loadAdminFromLocalStorage();
    this.loadPreferences();
    this.loadAdminFromBackend();
    this.loadActivities();
  }

  loadAdminFromLocalStorage(): void {
    const rawUser = localStorage.getItem('user');

    if (!rawUser) {
      this.setFallbackAvatar();
      return;
    }

    try {
      const user = JSON.parse(rawUser);

      this.adminId = String(user.id || user.ID || '');
      this.adminName = String(user.username || user.name || 'JUST4QUIZ Admin');
      this.adminEmail = String(user.email || 'just4quiz@gmail.com');
      this.adminRole = this.formatRole(user.role || 'admin');
      this.adminStatus = this.formatStatus(user.status || 'active');
      this.joinedAt = this.formatDate(user.created_at || user.createdAt || user.joined || '');
      this.adminAvatar = String(user.avatar || '');

      if (!this.adminAvatar) {
        this.setFallbackAvatar();
      }
    } catch {
      this.setFallbackAvatar();
    }
  }

  loadAdminFromBackend(): void {
    this.adminApi.getAdminUsers().subscribe({
      next: (users: AdminUserApi[]) => {
        const currentEmail = this.adminEmail.toLowerCase().trim();
        const currentId = this.adminId.trim();

        const admin =
          users.find(user => String(user.id || '') === currentId) ||
          users.find(user => String(user.email || '').toLowerCase().trim() === currentEmail) ||
          users.find(user => String(user.email || '').toLowerCase().trim() === 'just4quiz@gmail.com') ||
          users.find(user => String(user.role || '').toLowerCase().includes('admin'));

        if (!admin) {
          this.setFallbackAvatar();
          return;
        }

        this.adminId = String(admin.id || this.adminId);
        this.adminName = String(admin.name || admin.username || this.adminName);
        this.adminEmail = String(admin.email || this.adminEmail);
        this.adminRole = this.formatRole(admin.role || this.adminRole);
        this.adminStatus = this.formatStatus(admin.status || this.adminStatus);
        this.joinedAt = String(admin.joined || this.formatDate(admin.created_at || '') || this.joinedAt);

        this.totalQuizzes = Number(admin.quizzes || 0);
        this.soloGames = Number(admin.soloGames || 0);
        this.multiGames = Number(admin.multiGames || 0);
        this.avgScore = Math.round(Number(admin.score || 0));

        if (admin.avatar && String(admin.avatar).trim() !== '') {
          this.adminAvatar = String(admin.avatar);
        } else {
          this.setFallbackAvatar();
        }

        this.syncLocalUser();
      },
      error: (err) => {
        console.error('Load admin profile failed:', err);
        this.setFallbackAvatar();
      }
    });
  }

  loadPreferences(): void {
    const raw = localStorage.getItem('admin_profile_preferences');

    if (!raw) {
      return;
    }

    try {
      const pref = JSON.parse(raw) as Partial<AdminPreference>;

      this.adminPhone = pref.adminPhone || this.adminPhone;
      this.adminLocation = pref.adminLocation || this.adminLocation;
      this.twoFactorEnabled = pref.twoFactorEnabled ?? this.twoFactorEnabled;
      this.emailNotification = pref.emailNotification ?? this.emailNotification;
      this.loginAlert = pref.loginAlert ?? this.loginAlert;
      this.sessionProtection = pref.sessionProtection ?? this.sessionProtection;
    } catch {
      localStorage.removeItem('admin_profile_preferences');
    }
  }

  loadActivities(): void {
    this.adminApi.getAdminLogs().subscribe({
      next: (logs: AdminLogApi[]) => {
        this.activities = logs.slice(0, 5).map((item) => ({
          id: String(item.id || ''),
          title: String(item.title || 'Admin activity'),
          description: String(item.description || ''),
          time: String(item.time || 'Live'),
          date: String(item.date || 'Today'),
          icon: String(item.icon || 'history'),
          type: this.mapActivityType(item.level)
        }));
      },
      error: () => {
        this.activities = [
          {
            id: 'ACT-LIVE',
            title: 'Admin profile opened',
            description: 'Admin viewed profile information.',
            time: 'Live',
            date: 'Today',
            icon: 'account_circle',
            type: 'info'
          }
        ];
      }
    });
  }

  saveProfile(): void {
    this.savePreferences();

    if (!this.adminId) {
      this.syncLocalUser();
      alert('Admin profile saved locally.');
      return;
    }

    this.http.patch<any>(API_CONFIG.ENDPOINTS.PROFILE_UPDATE, {
      user_id: this.adminId,
      username: this.adminName,
      avatar: this.adminAvatar,
      bio: `Phone: ${this.adminPhone} | Location: ${this.adminLocation}`
    }).subscribe({
      next: (res) => {
        if (res?.user) {
          const user = res.user;

          this.adminName = user.username || this.adminName;
          this.adminEmail = user.email || this.adminEmail;
          this.adminAvatar = user.avatar || this.adminAvatar;
          this.adminRole = this.formatRole(user.role || this.adminRole);
          this.adminStatus = this.formatStatus(user.status || this.adminStatus);
          this.joinedAt = this.formatDate(user.created_at || user.CreatedAt || this.joinedAt);
        }

        this.syncLocalUser();
        alert('Admin profile saved successfully!');
      },
      error: (err) => {
        console.error('Save admin profile failed:', err);
        this.syncLocalUser();
        alert('Profile saved locally. Backend profile update is not available.');
      }
    });
  }

  changePassword(): void {
    alert('This feature is not yet developed. Please wait for future updates!');
  }

  changeAvatar(): void {
    const seed = prompt('Enter avatar seed:', this.adminName);

    if (!seed || !seed.trim()) {
      return;
    }

    this.adminAvatar =
      `https://api.dicebear.com/8.x/avataaars/svg?seed=${encodeURIComponent(seed.trim())}`;
  }

  private savePreferences(): void {
    const pref: AdminPreference = {
      adminPhone: this.adminPhone,
      adminLocation: this.adminLocation,
      twoFactorEnabled: this.twoFactorEnabled,
      emailNotification: this.emailNotification,
      loginAlert: this.loginAlert,
      sessionProtection: this.sessionProtection
    };

    localStorage.setItem('admin_profile_preferences', JSON.stringify(pref));
  }

  private syncLocalUser(): void {
    const rawUser = localStorage.getItem('user');
    let user: any = {};

    if (rawUser) {
      try {
        user = JSON.parse(rawUser);
      } catch {
        user = {};
      }
    }

    user.id = this.adminId || user.id || '';
    user.username = this.adminName;
    user.name = this.adminName;
    user.email = this.adminEmail;
    user.avatar = this.adminAvatar;
    user.role = this.adminRole.toLowerCase().replace(' ', '_');
    user.status = this.adminStatus.toLowerCase();
    user.created_at = user.created_at || this.joinedAt;

    localStorage.setItem('user', JSON.stringify(user));
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

    if (role === 'admin') {
      return 'Admin';
    }

    return 'Admin';
  }

  private formatStatus(value: string): string {
    const status = String(value || '').toLowerCase();

    if (status === 'blocked') {
      return 'Blocked';
    }

    if (status === 'inactive') {
      return 'Inactive';
    }

    return 'Active';
  }

  private formatDate(value: string): string {
    if (!value) {
      return 'N/A';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric'
    });
  }

  private mapActivityType(level: string): ActivityType {
    const normalized = String(level || '').toLowerCase();

    if (normalized === 'success') {
      return 'success';
    }

    if (normalized === 'warning' || normalized === 'danger') {
      return 'warning';
    }

    return 'info';
  }
}