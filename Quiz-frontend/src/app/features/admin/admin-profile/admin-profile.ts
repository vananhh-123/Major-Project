import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

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
export class AdminProfile {
  adminName = 'Admin';
  adminEmail = 'admin@just4quiz.com';
  adminRole = 'Super Admin';
  adminStatus = 'Active';
  adminPhone = '+84 900 000 000';
  adminLocation = 'Vietnam';
  joinedAt = 'Jun 01, 2026';
  lastLogin = 'Today';

  twoFactorEnabled = true;
  emailNotification = true;
  loginAlert = true;
  sessionProtection = true;

  activities: AdminActivity[] = [
    {
      id: 'ACT001',
      title: 'Changed platform settings',
      description: 'Updated System Settings configuration.',
      time: '10:20 AM',
      date: 'Today',
      icon: 'settings',
      type: 'info'
    },
    {
      id: 'ACT002',
      title: 'Closed multiplayer room',
      description: 'Room PIN 482913 was closed manually.',
      time: '09:45 AM',
      date: 'Today',
      icon: 'sports_esports',
      type: 'warning'
    },
    {
      id: 'ACT003',
      title: 'Hidden review',
      description: 'A review was hidden from public display.',
      time: '08:50 AM',
      date: 'Today',
      icon: 'visibility_off',
      type: 'warning'
    },
    {
      id: 'ACT004',
      title: 'Exported leaderboard',
      description: 'Leaderboard ranking was exported successfully.',
      time: 'Yesterday',
      date: 'Jun 10, 2026',
      icon: 'download',
      type: 'success'
    }
  ];

  saveProfile(): void {
    alert('Admin profile saved successfully!');
  }

  changePassword(): void {
    alert('Password reset will be connected to backend later.');
  }
}