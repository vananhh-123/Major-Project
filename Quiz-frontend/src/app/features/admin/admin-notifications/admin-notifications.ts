import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

type NotificationType = 'System' | 'User' | 'Quiz' | 'Room' | 'Review';
type NotificationStatus = 'Read' | 'Unread';

interface AdminNotification {
  id: string;
  type: NotificationType;
  status: NotificationStatus;
  title: string;
  message: string;
  time: string;
  date: string;
  icon: string;
  priority: 'Low' | 'Normal' | 'High';
}

@Component({
  selector: 'app-admin-notifications',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-notifications.html',
  styleUrl: './admin-notifications.css'
})
export class AdminNotifications {
  searchText = '';
  activeTab: 'All' | 'Unread' | NotificationType = 'All';
  selectedNotification: AdminNotification | null = null;

  notifications: AdminNotification[] = [
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
    }
  ];

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
    return this.notifications.filter(item => item.date === 'Today').length;
  }

  get filteredNotifications(): AdminNotification[] {
    return this.notifications.filter(item => {
      const keyword = this.searchText.toLowerCase();

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
      item.status = 'Read';
    }
  }

  closeDetail(): void {
    this.selectedNotification = null;
  }

  markAsRead(item: AdminNotification): void {
    item.status = 'Read';
  }

  markAllAsRead(): void {
    this.notifications = this.notifications.map(item => {
      if (item.status === 'Unread') {
        return {
          ...item,
          status: 'Read'
        };
      }

      return item;
    });
  }

  deleteNotification(id: string): void {
    const confirmed = confirm('Delete this notification?');

    if (!confirmed) {
      return;
    }

    this.notifications = this.notifications.filter(item => item.id !== id);

    if (this.selectedNotification?.id === id) {
      this.selectedNotification = null;
    }
  }

  clearRead(): void {
    const confirmed = confirm('Clear all read notifications?');

    if (!confirmed) {
      return;
    }

    this.notifications = this.notifications.filter(item => item.status !== 'Read');
    this.selectedNotification = null;
  }
}