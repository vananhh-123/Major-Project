import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AdminApi, AdminLogApi } from '../../../services/admin-api';

export type NotificationType = 'System' | 'User' | 'Quiz' | 'Room' | 'Review';
export type NotificationStatus = 'Read' | 'Unread';
export type NotificationPriority = 'Low' | 'Normal' | 'High';

export interface AdminNotification {
  id: string;
  type: NotificationType;
  status: NotificationStatus;
  title: string;
  message: string;
  time: string;
  date: string;
  icon: string;
  priority: NotificationPriority;
}

@Injectable({
  providedIn: 'root'
})
export class AdminNotificationService {
  private readonly readKey = 'just4quiz_admin_read_notifications';
  private readonly deletedKey = 'just4quiz_admin_deleted_notifications';

  private readonly notificationsSubject =
    new BehaviorSubject<AdminNotification[]>([]);

  public readonly notifications$: Observable<AdminNotification[]> =
    this.notificationsSubject.asObservable();

  constructor(private adminApi: AdminApi) {}

  loadNotifications(): void {
    this.adminApi.getAdminLogs().subscribe({
      next: (logs: AdminLogApi[]) => {
        const readIds = this.getStoredIds(this.readKey);
        const deletedIds = this.getStoredIds(this.deletedKey);

        const notifications = (logs || [])
          .filter(log => !deletedIds.includes(String(log.id)))
          .map(log => this.mapLogToNotification(log, readIds));

        this.notificationsSubject.next(notifications);
      },
      error: err => {
        console.error('Load notifications failed:', err);
        this.notificationsSubject.next([]);
      }
    });
  }

  markAsRead(id: string): void {
    const readIds = this.getStoredIds(this.readKey);

    if (!readIds.includes(id)) {
      readIds.push(id);
      localStorage.setItem(this.readKey, JSON.stringify(readIds));
    }

    this.notificationsSubject.next(
      this.notificationsSubject.value.map(item =>
        item.id === id ? { ...item, status: 'Read' } : item
      )
    );
  }

  markAllAsRead(): void {
    const ids = this.notificationsSubject.value.map(item => item.id);
    localStorage.setItem(this.readKey, JSON.stringify(ids));

    this.notificationsSubject.next(
      this.notificationsSubject.value.map(item => ({
        ...item,
        status: 'Read'
      }))
    );
  }

  deleteNotification(id: string): void {
    const deletedIds = this.getStoredIds(this.deletedKey);

    if (!deletedIds.includes(id)) {
      deletedIds.push(id);
      localStorage.setItem(this.deletedKey, JSON.stringify(deletedIds));
    }

    this.notificationsSubject.next(
      this.notificationsSubject.value.filter(item => item.id !== id)
    );
  }

  clearRead(): void {
    const readIds = this.notificationsSubject.value
      .filter(item => item.status === 'Read')
      .map(item => item.id);

    const deletedIds = this.getStoredIds(this.deletedKey);
    const merged = Array.from(new Set([...deletedIds, ...readIds]));

    localStorage.setItem(this.deletedKey, JSON.stringify(merged));

    this.notificationsSubject.next(
      this.notificationsSubject.value.filter(item => item.status !== 'Read')
    );
  }

  private mapLogToNotification(
    log: AdminLogApi,
    readIds: string[]
  ): AdminNotification {
    const id = String(log.id || crypto.randomUUID());
    const type = this.normalizeType(log.type);
    const priority = this.normalizePriority(log.level);

    return {
      id,
      type,
      status: readIds.includes(id) ? 'Read' : 'Unread',
      title: log.title || 'System activity',
      message: log.description || 'New admin activity was recorded.',
      time: log.time || this.formatTime(log.createdAt),
      date: log.date || this.formatDate(log.createdAt),
      icon: log.icon || this.getIconByType(type),
      priority
    };
  }

  private normalizeType(value?: string): NotificationType {
    const type = String(value || '').toLowerCase();

    if (type === 'user') return 'User';
    if (type === 'quiz') return 'Quiz';
    if (type === 'room') return 'Room';
    if (type === 'review') return 'Review';

    return 'System';
  }

  private normalizePriority(value?: string): NotificationPriority {
    const level = String(value || '').toLowerCase();

    if (level === 'warning' || level === 'error') return 'High';
    if (level === 'success' || level === 'info') return 'Normal';

    return 'Low';
  }

  private getIconByType(type: NotificationType): string {
    if (type === 'User') return 'person_add';
    if (type === 'Quiz') return 'quiz';
    if (type === 'Room') return 'sports_esports';
    if (type === 'Review') return 'rate_review';
    return 'settings';
  }

  private getStoredIds(key: string): string[] {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private formatTime(value?: string): string {
    if (!value) return 'Live';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Live';

    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private formatDate(value?: string): string {
    if (!value) return 'Today';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Today';

    return date.toLocaleDateString([], {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }
}