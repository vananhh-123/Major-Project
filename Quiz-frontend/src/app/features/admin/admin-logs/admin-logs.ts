import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  AdminApi,
  AdminLogApi
} from '../../../services/admin-api';

type LogType = 'User' | 'Quiz' | 'Room' | 'Review' | 'System';
type LogLevel = 'Success' | 'Info' | 'Warning' | 'Danger';

interface AdminLog {
  id: string;
  type: LogType;
  level: LogLevel;
  title: string;
  description: string;
  actor: string;
  time: string;
  date: string;
  icon: string;
}

@Component({
  selector: 'app-admin-logs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-logs.html',
  styleUrl: './admin-logs.css'
})
export class AdminLogs implements OnInit {
  searchText = '';
  activeTab: 'All' | LogType = 'All';

  currentPage = 1;
  pageSize = 6;

  logs: AdminLog[] = [];
  loading = false;

  constructor(
    private adminApi: AdminApi,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadLogs();
  }

  loadLogs(): void {
    this.loading = true;

    this.adminApi.getAdminLogs().subscribe({
      next: (data: AdminLogApi[]) => {
        this.logs = data.map(item => ({
          id: item.id,
          type: this.normalizeType(item.type),
          level: this.normalizeLevel(item.level),
          title: item.title,
          description: item.description,
          actor: item.actor,
          time: item.time,
          date: item.date,
          icon: item.icon
        }));

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: err => {
        console.error('Load logs failed:', err);
        this.logs = [];
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private normalizeType(value: string): LogType {
    const text = value as LogType;

    if (['User', 'Quiz', 'Room', 'Review', 'System'].includes(text)) {
      return text;
    }

    return 'System';
  }

  private normalizeLevel(value: string): LogLevel {
    const text = value as LogLevel;

    if (['Success', 'Info', 'Warning', 'Danger'].includes(text)) {
      return text;
    }

    return 'Info';
  }

  get totalLogs(): number {
    return this.logs.length;
  }

  get todayEvents(): number {
    return this.logs.filter(log => log.date === 'Today').length;
  }

  get userActivities(): number {
    return this.logs.filter(log => log.type === 'User').length;
  }

  get systemEvents(): number {
    return this.logs.filter(log => log.type === 'System').length;
  }

  get filteredLogs(): AdminLog[] {
    const keyword = this.searchText.toLowerCase();

    return this.logs.filter(log => {
      const matchesSearch =
        log.id.toLowerCase().includes(keyword) ||
        log.title.toLowerCase().includes(keyword) ||
        log.description.toLowerCase().includes(keyword) ||
        log.actor.toLowerCase().includes(keyword) ||
        log.type.toLowerCase().includes(keyword);

      const matchesTab =
        this.activeTab === 'All' ||
        log.type === this.activeTab;

      return matchesSearch && matchesTab;
    });
  }

  get totalPages(): number {
    return Math.ceil(this.filteredLogs.length / this.pageSize) || 1;
  }

  get paginatedLogs(): AdminLog[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredLogs.slice(start, start + this.pageSize);
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, index) => index + 1);
  }

  setTab(tab: 'All' | LogType): void {
    this.activeTab = tab;
    this.currentPage = 1;
  }

  goToPage(page: number): void {
    this.currentPage = page;
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }
}