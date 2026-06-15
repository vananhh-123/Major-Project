import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import {
  AdminApi,
  AdminLogApi,
  AdminUserApi
} from '../../../services/admin-api';

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

@Component({
  selector: 'app-admin-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin-profile.html',
  styleUrl: './admin-profile.css'
})
export class AdminProfile implements OnInit {
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

  constructor(private adminApi: AdminApi) {}

  ngOnInit(): void {
    this.loadAdminFromLocalStorage();
    this.loadAdminFromBackend();
    this.loadPreferences();
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
      this.adminName = user.username || user.name || 'JUST4QUIZ Admin';
      this.adminEmail = user.email || 'just4quiz@gmail.com';
      this.adminRole = this.formatRole(user.role || 'admin');
      this.adminStatus = this.formatStatus(user.status || 'active');
      this.joinedAt = this.formatDate(user.created_at || user.createdAt || user.joined);
      this.adminAvatar = user.avatar || '';

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
        const currentEmail = this.adminEmail.toLowerCase();
        const currentId = this.adminId;

        const admin =
          users.find(user => String(user.id) === currentId) ||
          users.find(user => String(user.email || '').toLowerCase() === currentEmail) ||
          users.find(user => String(user.email || '').toLowerCase() === 'just4quiz@gmail.com');

        if (!admin) {
          return;
        }

        this.adminId = admin.id || this.adminId;
        this.adminName = admin.name || admin.username || this.adminName;
        this.adminEmail = admin.email || this.adminEmail;
        this.adminRole = this.formatRole(admin.role || this.adminRole);
        this.adminStatus = this.formatStatus(admin.status || this.adminStatus);
        this.joinedAt = admin.joined || this.formatDate(admin.created_at || '');

        this.totalQuizzes = Number(admin.quizzes || 0);
        this.soloGames = Number(admin.soloGames || 0);
        this.multiGames = Number(admin.multiGames || 0);
        this.avgScore = Math.round(Number(admin.score || 0));

        if (admin.avatar && admin.avatar.trim() !== '') {
          this.adminAvatar = admin.avatar;
        } else {
          this.setFallbackAvatar();
        }
      },
      error: (err) => {
        console.error('Load admin profile failed:', err);
      }
    });
  }

  loadPreferences(): void {
    const raw = localStorage.getItem('admin_profile_preferences');

    if (!raw) {
      return;
    }

    try {
      const pref = JSON.parse(raw);

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
          id: item.id,
          title: item.title,
          description: item.description,
          time: item.time,
          date: item.date,
          icon: item.icon,
          type: this.mapActivityType(item.level)
        }));
      },
      error: () => {
        this.activities = [
          {
            id: 'ACT001',
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
    const rawUser = localStorage.getItem('user');

    if (rawUser) {
      try {
        const user = JSON.parse(rawUser);

        user.id = this.adminId || user.id;
        user.username = this.adminName;
        user.name = this.adminName;
        user.email = this.adminEmail;
        user.avatar = this.adminAvatar;
        user.role = this.adminRole.toLowerCase().replace(' ', '_');
        user.status = this.adminStatus.toLowerCase();

        localStorage.setItem('user', JSON.stringify(user));
      } catch {}
    }

    localStorage.setItem(
      'admin_profile_preferences',
      JSON.stringify({
        adminPhone: this.adminPhone,
        adminLocation: this.adminLocation,
        twoFactorEnabled: this.twoFactorEnabled,
        emailNotification: this.emailNotification,
        loginAlert: this.loginAlert,
        sessionProtection: this.sessionProtection
      })
    );

    alert('Admin profile saved successfully!');
  }

  changePassword(): void {
    alert('This feature is not yet developed. Please wait for future updates!');
  }

  changeAvatar(): void {
    const seed = prompt('Enter avatar seed:', this.adminName);

    if (!seed) {
      return;
    }

    this.adminAvatar =
      `https://api.dicebear.com/8.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
  }

  private setFallbackAvatar(): void {
    this.adminAvatar =
      `https://api.dicebear.com/8.x/avataaars/svg?seed=${encodeURIComponent(this.adminEmail || this.adminName || 'Admin')}`;
  }

  private formatRole(value: string): string {
    const role = String(value || '').toLowerCase();

    if (role === 'superadmin' || role === 'super_admin') {
      return 'Super Admin';
    }

    return 'Admin';
  }

  private formatStatus(value: string): string {
    const status = String(value || '').toLowerCase();

    if (status === 'blocked') {
      return 'Blocked';
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