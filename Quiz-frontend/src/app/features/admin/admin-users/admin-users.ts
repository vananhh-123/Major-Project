import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

type UserRole = 'Admin' | 'User';
type UserStatus = 'Active' | 'Blocked';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  quizzes: number;
  soloGames: number;
  multiGames: number;
  score: number;
  joined: string;
  status: UserStatus;
  seed: string;
}

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-users.html',
  styleUrl: './admin-users.css'
})
export class AdminUsers {
  searchText = '';
  roleFilter = '';
  statusFilter = '';
  currentTab: 'all' | 'active' | 'blocked' | 'admin' = 'all';

  users: AdminUser[] = [
    {
      id: 'U001',
      name: 'Nguyen Van A',
      email: 'nguyenvana@example.com',
      role: 'Admin',
      quizzes: 42,
      soloGames: 120,
      multiGames: 48,
      score: 88,
      joined: 'Jan 2026',
      status: 'Active',
      seed: 'NguyenVanA'
    },
    {
      id: 'U002',
      name: 'Tran Thi B',
      email: 'tranthib@example.com',
      role: 'User',
      quizzes: 12,
      soloGames: 86,
      multiGames: 34,
      score: 76,
      joined: 'Mar 2026',
      status: 'Active',
      seed: 'TranThiB'
    },
    {
      id: 'U003',
      name: 'Le Minh C',
      email: 'leminhc@example.com',
      role: 'User',
      quizzes: 4,
      soloGames: 15,
      multiGames: 2,
      score: 55,
      joined: 'May 2026',
      status: 'Blocked',
      seed: 'LeMinhC'
    },
    {
      id: 'U004',
      name: 'Pham Hoang D',
      email: 'phamhoangd@example.com',
      role: 'User',
      quizzes: 18,
      soloGames: 64,
      multiGames: 29,
      score: 91,
      joined: 'Jun 2026',
      status: 'Active',
      seed: 'PhamHoangD'
    }
  ];

  get totalUsers(): number {
    return this.users.length;
  }

  get activeUsers(): number {
    return this.users.filter(user => user.status === 'Active').length;
  }

  get adminUsers(): number {
    return this.users.filter(user => user.role === 'Admin').length;
  }

  get blockedUsers(): number {
    return this.users.filter(user => user.status === 'Blocked').length;
  }

  get filteredUsers(): AdminUser[] {
    return this.users.filter(user => {
      const keyword = this.searchText.toLowerCase();

      const matchesSearch =
        user.name.toLowerCase().includes(keyword) ||
        user.email.toLowerCase().includes(keyword) ||
        user.id.toLowerCase().includes(keyword);

      const matchesRole =
        this.roleFilter === '' || user.role === this.roleFilter;

      const matchesStatus =
        this.statusFilter === '' || user.status === this.statusFilter;

      const matchesTab =
        this.currentTab === 'all' ||
        (this.currentTab === 'active' && user.status === 'Active') ||
        (this.currentTab === 'blocked' && user.status === 'Blocked') ||
        (this.currentTab === 'admin' && user.role === 'Admin');

      return matchesSearch && matchesRole && matchesStatus && matchesTab;
    });
  }

  switchTab(tab: 'all' | 'active' | 'blocked' | 'admin'): void {
    this.currentTab = tab;
  }

  toggleStatus(user: AdminUser): void {
    user.status = user.status === 'Active' ? 'Blocked' : 'Active';
  }
}