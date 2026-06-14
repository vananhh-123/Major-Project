import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

type HealthStatus = 'Online' | 'Warning' | 'Offline';

interface HealthItem {
  name: string;
  description: string;
  status: HealthStatus;
  uptime: string;
  latency: string;
  icon: string;
}

interface HealthLog {
  title: string;
  description: string;
  time: string;
  type: 'success' | 'warning' | 'danger';
  icon: string;
}

@Component({
  selector: 'app-admin-system-health',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-system-health.html',
  styleUrl: './admin-system-health.css'
})
export class AdminSystemHealth {
  healthItems: HealthItem[] = [
    {
      name: 'API Server',
      description: 'Go Gin backend service',
      status: 'Online',
      uptime: '99.98%',
      latency: '42ms',
      icon: 'dns'
    },
    {
      name: 'Database',
      description: 'Supabase PostgreSQL connection',
      status: 'Online',
      uptime: '99.95%',
      latency: '58ms',
      icon: 'database'
    },
    {
      name: 'WebSocket',
      description: 'Realtime multiplayer room service',
      status: 'Online',
      uptime: '99.80%',
      latency: '36ms',
      icon: 'hub'
    },
    {
      name: 'Storage',
      description: 'Quiz cover images and avatar storage',
      status: 'Warning',
      uptime: '98.40%',
      latency: '120ms',
      icon: 'cloud'
    }
  ];

  logs: HealthLog[] = [
    {
      title: 'API server checked',
      description: 'Backend service responded successfully.',
      time: '2 minutes ago',
      type: 'success',
      icon: 'check_circle'
    },
    {
      title: 'Database connection stable',
      description: 'Supabase PostgreSQL latency is normal.',
      time: '10 minutes ago',
      type: 'success',
      icon: 'database'
    },
    {
      title: 'Storage latency increased',
      description: 'Image storage response time is higher than usual.',
      time: '25 minutes ago',
      type: 'warning',
      icon: 'warning'
    },
    {
      title: 'WebSocket heartbeat received',
      description: 'Realtime room gateway is running.',
      time: '40 minutes ago',
      type: 'success',
      icon: 'hub'
    }
  ];

  get onlineServices(): number {
    return this.healthItems.filter(item => item.status === 'Online').length;
  }

  get warningServices(): number {
    return this.healthItems.filter(item => item.status === 'Warning').length;
  }

  get offlineServices(): number {
    return this.healthItems.filter(item => item.status === 'Offline').length;
  }

  get systemScore(): string {
    return '98.9%';
  }

  refreshHealth(): void {
    alert('System health refreshed successfully!');
  }
}