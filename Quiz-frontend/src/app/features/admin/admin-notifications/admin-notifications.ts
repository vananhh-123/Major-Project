import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import {
  AdminNotification,
  AdminNotificationService,
  NotificationType
} from '../services/admin-notification.service';

@Component({
  selector: 'app-admin-notifications',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-notifications.html',
  styleUrl: './admin-notifications.css'
})
export class AdminNotifications implements OnInit, OnDestroy {
  searchText = '';
  activeTab: 'All' | 'Unread' | NotificationType = 'All';
  selectedNotification: AdminNotification | null = null;

  notifications: AdminNotification[] = [];

  private notificationSub?: Subscription;

  constructor(
    private readonly notificationService: AdminNotificationService
  ) {}

  ngOnInit(): void {
    this.notificationSub =
      this.notificationService.notifications$.subscribe(
        (notifications: AdminNotification[]) => {
          this.notifications = notifications;

          if (this.selectedNotification) {
            const latestSelected = notifications.find(
              (item: AdminNotification) =>
                item.id === this.selectedNotification?.id
            );

            this.selectedNotification = latestSelected ?? null;
          }
        }
      );
  }

  ngOnDestroy(): void {
    this.notificationSub?.unsubscribe();
  }

  get totalNotifications(): number {
    return this.notifications.length;
  }

  get unreadCount(): number {
    return this.notifications.filter(
      (item: AdminNotification) => item.status === 'Unread'
    ).length;
  }

  get systemCount(): number {
    return this.notifications.filter(
      (item: AdminNotification) => item.type === 'System'
    ).length;
  }

  get todayCount(): number {
    return this.notifications.filter(
      (item: AdminNotification) => item.date === 'Today'
    ).length;
  }

  get filteredNotifications(): AdminNotification[] {
    const keyword = this.searchText.toLowerCase();

    return this.notifications.filter((item: AdminNotification) => {
      const matchesSearch =
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

  setTab(tab: 'All' | 'Unread' | NotificationType): void {
    this.activeTab = tab;
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
    const confirmed = confirm('Delete this notification?');

    if (!confirmed) {
      return;
    }

    this.notificationService.deleteNotification(id);

    if (this.selectedNotification?.id === id) {
      this.selectedNotification = null;
    }
  }

  clearRead(): void {
    const confirmed = confirm('Clear all read notifications?');

    if (!confirmed) {
      return;
    }

    this.notificationService.clearRead();
    this.selectedNotification = null;
  }
}