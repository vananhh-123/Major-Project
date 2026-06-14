import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

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
  private readonly initialNotifications: AdminNotification[] = [
    {
      id: 'NT001',
      type: 'User',
      status: 'Unread',
      title: 'New user registered',
      message: 'nguyenvana@example.com has created a new account.',
      time: '10:20 AM',
      date: 'Today',
      icon: 'person_add',
      priority: 'Normal'
    },
    {
      id: 'NT002',
      type: 'Quiz',
      status: 'Unread',
      title: 'New quiz submitted',
      message: 'English Basic Quiz was created and is now private by default.',
      time: '10:35 AM',
      date: 'Today',
      icon: 'quiz',
      priority: 'Normal'
    },
    {
      id: 'NT003',
      type: 'Room',
      status: 'Unread',
      title: 'Multiplayer room started',
      message: 'Room PIN 482913 is currently playing with 18 participants.',
      time: '10:42 AM',
      date: 'Today',
      icon: 'sports_esports',
      priority: 'High'
    },
    {
      id: 'NT004',
      type: 'Review',
      status: 'Read',
      title: 'New review submitted',
      message: 'A user rated Math Challenge with 4 stars and left a comment.',
      time: '09:50 AM',
      date: 'Today',
      icon: 'rate_review',
      priority: 'Normal'
    },
    {
      id: 'NT005',
      type: 'System',
      status: 'Read',
      title: 'System settings updated',
      message: 'Default quiz visibility was changed to Private.',
      time: 'Yesterday',
      date: 'Jun 10, 2026',
      icon: 'settings',
      priority: 'Low'
    },
    {
      id: 'NT006',
      type: 'System',
      status: 'Unread',
      title: 'Security confirmation required',
      message: 'A sensitive setting change requires Super Admin confirmation.',
      time: 'Yesterday',
      date: 'Jun 10, 2026',
      icon: 'admin_panel_settings',
      priority: 'High'
    },
    {
      id: 'NT007',
      type: 'Room',
      status: 'Read',
      title: 'Room closed',
      message: 'Room PIN 650312 was closed by Admin.',
      time: 'Yesterday',
      date: 'Jun 10, 2026',
      icon: 'do_not_disturb_on',
      priority: 'Normal'
    },
    {
      id: 'NT008',
      type: 'Quiz',
      status: 'Read',
      title: 'Quiz status changed',
      message: 'Programming Quiz was changed from Private to Public.',
      time: 'Yesterday',
      date: 'Jun 10, 2026',
      icon: 'public',
      priority: 'Low'
    }
  ];

  private readonly notificationsSubject =
    new BehaviorSubject<AdminNotification[]>(this.initialNotifications);

  readonly notifications$: Observable<AdminNotification[]> =
    this.notificationsSubject.asObservable();

  getCurrentNotifications(): AdminNotification[] {
    return this.notificationsSubject.value;
  }

  getUnreadCount(): number {
    return this.notificationsSubject.value.filter(
      (item: AdminNotification) => item.status === 'Unread'
    ).length;
  }

  markAsRead(id: string): void {
    const updated: AdminNotification[] =
      this.notificationsSubject.value.map((item: AdminNotification) => {
        if (item.id === id) {
          return {
            ...item,
            status: 'Read'
          };
        }

        return item;
      });

    this.notificationsSubject.next(updated);
  }

  markAllAsRead(): void {
    const updated: AdminNotification[] =
      this.notificationsSubject.value.map((item: AdminNotification) => ({
        ...item,
        status: 'Read'
      }));

    this.notificationsSubject.next(updated);
  }

  deleteNotification(id: string): void {
    const updated: AdminNotification[] =
      this.notificationsSubject.value.filter(
        (item: AdminNotification) => item.id !== id
      );

    this.notificationsSubject.next(updated);
  }

  clearRead(): void {
    const updated: AdminNotification[] =
      this.notificationsSubject.value.filter(
        (item: AdminNotification) => item.status !== 'Read'
      );

    this.notificationsSubject.next(updated);
  }
}