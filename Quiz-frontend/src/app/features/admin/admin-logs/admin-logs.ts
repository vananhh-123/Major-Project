import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
export class AdminLogs {
  searchText = '';
  activeTab: 'All' | LogType = 'All';

  currentPage = 1;
  pageSize = 6;

  logs: AdminLog[] = [
    {
      id: 'LOG001',
      type: 'User',
      level: 'Success',
      title: 'New user registered',
      description: 'nguyenvana@example.com joined JUST4QUIZ.',
      actor: 'System',
      time: '10:20 AM',
      date: 'Jun 10, 2026',
      icon: 'person_add'
    },
    {
      id: 'LOG002',
      type: 'Quiz',
      level: 'Info',
      title: 'Quiz created',
      description: 'English Basic Quiz was created by Nguyen Van A.',
      actor: 'Nguyen Van A',
      time: '10:28 AM',
      date: 'Jun 10, 2026',
      icon: 'quiz'
    },
    {
      id: 'LOG003',
      type: 'Room',
      level: 'Success',
      title: 'Multiplayer room started',
      description: 'Room PIN 482913 started with 18 players.',
      actor: 'Tran Thi B',
      time: '10:35 AM',
      date: 'Jun 10, 2026',
      icon: 'sports_esports'
    },
    {
      id: 'LOG004',
      type: 'Review',
      level: 'Warning',
      title: 'Review hidden',
      description: 'Review RV004 was hidden by admin.',
      actor: 'Admin',
      time: '10:42 AM',
      date: 'Jun 10, 2026',
      icon: 'visibility_off'
    },
    {
      id: 'LOG005',
      type: 'System',
      level: 'Info',
      title: 'Settings updated',
      description: 'Default quiz visibility changed to Private.',
      actor: 'Admin',
      time: '11:05 AM',
      date: 'Jun 10, 2026',
      icon: 'settings'
    },
    {
      id: 'LOG006',
      type: 'Quiz',
      level: 'Danger',
      title: 'Quiz deleted',
      description: 'Old draft quiz was removed from Quiz Bank.',
      actor: 'Admin',
      time: '11:18 AM',
      date: 'Jun 10, 2026',
      icon: 'delete'
    },
    {
      id: 'LOG007',
      type: 'Room',
      level: 'Warning',
      title: 'Room closed',
      description: 'Room PIN 650312 was manually closed.',
      actor: 'Admin',
      time: '11:42 AM',
      date: 'Jun 10, 2026',
      icon: 'do_not_disturb_on'
    },
    {
      id: 'LOG008',
      type: 'User',
      level: 'Danger',
      title: 'User blocked',
      description: 'sara@example.com was blocked from ranking.',
      actor: 'Admin',
      time: '12:05 PM',
      date: 'Jun 10, 2026',
      icon: 'block'
    }
  ];

  get totalLogs(): number {
    return this.logs.length;
  }

  get todayEvents(): number {
    return this.logs.filter(log => log.date === 'Jun 10, 2026').length;
  }

  get userActivities(): number {
    return this.logs.filter(log => log.type === 'User').length;
  }

  get systemEvents(): number {
    return this.logs.filter(log => log.type === 'System').length;
  }

  get filteredLogs(): AdminLog[] {
    return this.logs.filter(log => {
      const keyword = this.searchText.toLowerCase();

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