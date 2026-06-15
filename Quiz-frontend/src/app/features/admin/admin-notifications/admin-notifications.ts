import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import {
  AdminNotification,
  AdminNotificationService
} from '../services/admin-notification.service';

type NotificationTab =
  | 'All'
  | 'Unread'
  | 'System'
  | 'User'
  | 'Quiz'
  | 'Room'
  | 'Review';

@Component({
  selector: 'app-admin-notifications',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-notifications.html',
  styleUrl: './admin-notifications.css'
})
export class AdminNotifications implements OnInit, OnDestroy {
  searchText = '';
  activeTab: NotificationTab = 'All';
  selectedNotification: AdminNotification | null = null;

  notifications: AdminNotification[] = [];

  currentPage = 1;
  pageSize = 5;

  private notificationSub?: Subscription;

  constructor(
    private notificationService: AdminNotificationService
  ) {}

  ngOnInit(): void {
    this.notificationService.loadNotifications();

    this.notificationSub =
      this.notificationService.notifications$.subscribe({
        next: (notifications: AdminNotification[]) => {
          this.notifications = notifications;
          this.currentPage = 1;
        }
      });
  }

  ngOnDestroy(): void {
    this.notificationSub?.unsubscribe();
  }

  get totalNotifications(): number {
    return this.notifications.length;
  }

  get unreadCount(): number {
    return this.notifications.filter(item => item.status === 'Unread').length;
  }

  get systemCount(): number {
    return this.notifications.filter(item => item.type === 'System').length;
  }

  get todayCount(): number {
    return this.notifications.filter(item => this.isToday(item.date)).length;
  }

  get filteredNotifications(): AdminNotification[] {
    const keyword = this.searchText.trim().toLowerCase();

    return this.notifications.filter(item => {
      const matchesSearch =
        !keyword ||
        item.title.toLowerCase().includes(keyword) ||
        item.message.toLowerCase().includes(keyword) ||
        item.id.toLowerCase().includes(keyword) ||
        item.type.toLowerCase().includes(keyword);

      const matchesTab =
        this.activeTab === 'All' ||
        (this.activeTab === 'Unread' && item.status === 'Unread') ||
        item.type === this.activeTab;

      return matchesSearch && matchesTab;
    });
  }

  get paginatedNotifications(): AdminNotification[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredNotifications.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredNotifications.length / this.pageSize));
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, index) => index + 1);
  }

  get rangeStart(): number {
    if (this.filteredNotifications.length === 0) return 0;
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get rangeEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredNotifications.length);
  }

  setTab(tab: NotificationTab): void {
    this.activeTab = tab;
    this.currentPage = 1;
  }

  onSearchChange(): void {
    this.currentPage = 1;
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
  }

  previousPage(): void {
    this.goToPage(this.currentPage - 1);
  }

  nextPage(): void {
    this.goToPage(this.currentPage + 1);
  }

  viewNotification(item: AdminNotification): void {
    this.selectedNotification = item;

    if (item.status === 'Unread') {
      this.notificationService.markAsRead(item.id);
    }
  }

  closeDetail(): void {
    this.selectedNotification = null;
  }

  markAsRead(item: AdminNotification): void {
    this.notificationService.markAsRead(item.id);
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead();
  }

  deleteNotification(id: string): void {
    if (!confirm('Delete this notification?')) return;

    this.notificationService.deleteNotification(id);

    if (this.selectedNotification?.id === id) {
      this.selectedNotification = null;
    }
  }

  clearRead(): void {
    if (!confirm('Clear all read notifications?')) return;

    this.notificationService.clearRead();
    this.selectedNotification = null;
  }

  private isToday(value: string): boolean {
    if (!value) return false;
    if (value === 'Today') return true;

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return false;

    const today = new Date();

    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  }
}