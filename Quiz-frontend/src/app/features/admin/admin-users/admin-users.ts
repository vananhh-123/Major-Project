import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { API_CONFIG } from '../../../config/api.config';

type UserRole = 'Admin' | 'User';
type UserStatus = 'Active' | 'Blocked';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: UserRole;
  status: UserStatus;
  quizzes: number;
  soloGames: number;
  multiGames: number;
  score: number;
  joined: string;
  seed: string;
}

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './admin-users.html',
  styleUrl: './admin-users.css'
})
export class AdminUsers implements OnInit {
  private http = inject(HttpClient);

  searchText = '';
  roleFilter = '';
  statusFilter = '';
  currentTab: 'all' | 'active' | 'blocked' | 'admin' = 'all';

  selectedUserIds = new Set<string>();

  pageSize = 10;
  currentPage = 1;

  totalUsers = 0;
  activeUsers = 0;
  adminUsers = 0;
  blockedUsers = 0;

  users: AdminUser[] = [];

  ngOnInit(): void {
    this.loadStats();
    this.loadUsers();
  }

  loadStats(): void {
    this.http.get<any>(`${API_CONFIG.API_BASE}/admin/users/stats`).subscribe({
      next: (res) => {
        this.totalUsers = Number(res.totalUsers ?? 0);
        this.activeUsers = Number(res.activeUsers ?? 0);
        this.adminUsers = Number(res.adminUsers ?? 0);
        this.blockedUsers = Number(res.blockedUsers ?? 0);
      },
      error: (err) => console.error('Load stats failed:', err)
    });
  }

  loadUsers(): void {
    this.http.get<any>(`${API_CONFIG.API_BASE}/admin/users`).subscribe({
      next: (res) => {
        const data = Array.isArray(res) ? res : res.users ?? [];

        this.users = data.map((u: any): AdminUser => ({
          id: String(u.id ?? ''),
          name: String(u.name ?? u.username ?? 'Unknown User'),
          email: String(u.email ?? ''),
          avatar: String(u.avatar ?? ''),
          role: this.normalizeRole(u.role),
          status: this.normalizeStatus(u.status),
          quizzes: Number(u.quizzes ?? 0),
          soloGames: Number(u.soloGames ?? 0),
          multiGames: Number(u.multiGames ?? 0),
          score: Math.round(Number(u.score ?? 0)),
          joined: String(u.joined ?? ''),
          seed: String(u.id ?? u.email ?? u.name ?? 'user')
        }));

        this.currentPage = 1;
        console.log('ADMIN USERS:', this.users);
      },
      error: (err) => console.error('Load users failed:', err)
    });
  }

  get filteredUsers(): AdminUser[] {
    const keyword = this.searchText.trim().toLowerCase();

    return this.users.filter((user) => {
      const matchesSearch =
        !keyword ||
        user.name.toLowerCase().includes(keyword) ||
        user.email.toLowerCase().includes(keyword) ||
        user.id.toLowerCase().includes(keyword);

      const matchesRole =
        !this.roleFilter || user.role === this.roleFilter;

      const matchesStatus =
        !this.statusFilter || user.status === this.statusFilter;

      const matchesTab =
        this.currentTab === 'all' ||
        (this.currentTab === 'active' && user.status === 'Active') ||
        (this.currentTab === 'blocked' && user.status === 'Blocked') ||
        (this.currentTab === 'admin' && user.role === 'Admin');

      return matchesSearch && matchesRole && matchesStatus && matchesTab;
    });
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredUsers.length / this.pageSize));
  }

  get pagedUsers(): AdminUser[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredUsers.slice(start, start + this.pageSize);
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  switchTab(tab: 'all' | 'active' | 'blocked' | 'admin'): void {
    this.currentTab = tab;
    this.currentPage = 1;
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
  }

  nextPage(): void {
    this.goToPage(this.currentPage + 1);
  }

  prevPage(): void {
    this.goToPage(this.currentPage - 1);
  }

  toggleStatus(user: AdminUser): void {
    this.http
      .patch(`${API_CONFIG.API_BASE}/admin/users/${user.id}/status`, {})
      .subscribe({
        next: () => {
          this.loadUsers();
          this.loadStats();
        },
        error: (err) => console.error('Toggle status failed:', err)
      });
  }

  private normalizeRole(role: any): UserRole {
    return String(role ?? '').toLowerCase() === 'admin' ? 'Admin' : 'User';
  }

  private normalizeStatus(status: any): UserStatus {
    return String(status ?? '').toLowerCase() === 'blocked'
      ? 'Blocked'
      : 'Active';
  }

  showComingSoon(): void {
    alert('This feature is not available yet. Please wait for a future update!');
  }

  getAvatar(user: AdminUser): string {
    if (user.avatar && user.avatar.trim() !== '') {
      return user.avatar;
    }

    return `https://api.dicebear.com/8.x/avataaars/svg?seed=${encodeURIComponent(user.seed || user.id || user.email)}`;
  }

  isAllSelected(): boolean {
    return this.pagedUsers.length > 0 &&
      this.pagedUsers.every(user => this.selectedUserIds.has(user.id));
  }

  toggleSelectAll(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;

    this.pagedUsers.forEach(user => {
      if (checked) {
        this.selectedUserIds.add(user.id);
      } else {
        this.selectedUserIds.delete(user.id);
      }
    });
  }

  toggleSelectUser(userId: string): void {
    if (this.selectedUserIds.has(userId)) {
      this.selectedUserIds.delete(userId);
    } else {
      this.selectedUserIds.add(userId);
    }
  }
}