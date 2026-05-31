import { ChangeDetectorRef, Component, NgZone, OnInit, inject } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { API_CONFIG } from '../../config/api.config';

export interface LeaderboardUser {
  rank: number;
  name: string;
  points: number;
  avatar: string;
}

export interface Champion {
  rank: number;
  name: string;
  img: string;
  title?: string;
  points: number;
}

export interface RankingItem {
  rank: number;
  img: string;
  name: string;
  badge?: string;
  subtitle?: string;
  points: number;
  trendDown?: boolean;
  trend?: string;
  isUser?: boolean;
}

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HttpClientModule],
  templateUrl: './leaderboard.html',
  styleUrls: ['./leaderboard.css']
})
export class Leaderboard implements OnInit {
  private zone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);

  searchQuery: string = '';
  activeTab: 'weekly' | 'monthly' | 'all' = 'all';
  // Filter by game mode; default 'solo'
  mode: 'solo' | 'multi' | '' = 'solo'; // Default to solo mode

  topChampions: Champion[] = [];
  rankings: RankingItem[] = [];
  totalCount: number = 0;

  ngOnInit() {
    // Tải dữ liệu lần đầu tiên truy cập
    this.fetchLeaderboard();
  }

  setTab(tab: 'weekly' | 'monthly' | 'all') {
    this.activeTab = tab;
    this.fetchLeaderboard();
  }

  onSearch() {
    this.fetchLeaderboard();
  }

  async fetchLeaderboard() {
    // Chèn params để gửi lên Backend
    const params = new URLSearchParams();
    params.set('period', this.activeTab);
    params.set('q', this.searchQuery);
    if (this.mode) {
      params.set('mode', this.mode);
    }
    const url = `${API_CONFIG.API_BASE}/leaderboard?${params.toString()}`;

    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const res = await response.json();

      // Backend may return an array or an object wrapping the array (e.g., { value: [...], Count: n })
      let dataArray: any[] = [];
      if (Array.isArray(res)) {
        dataArray = res;
      } else if (res && (res.value || res.results)) {
        dataArray = res.value || res.results;
      } else if (res && typeof res === 'object') {
        // sometimes backend returns { Count: n, ... } or a custom wrapper; try to find first array
        const firstArray = Object.values(res).find(v => Array.isArray(v));
        dataArray = firstArray || [];
      }

      const data = dataArray || [];

      this.zone.run(() => {
        this.totalCount = data.length || 0;

        // 1. Tổ chức dữ liệu cho Top 3 (Champions)
        const top3 = data.slice(0, 3);
        const arrangedTop: Champion[] = [];

        const mapToChampion = (u: LeaderboardUser): Champion => ({
          rank: u.rank,
          name: u.name,
          img: u.avatar || 'assets/default-avatar.png',
          title: u.rank === 1 ? 'Quiz Master' : 'Pro Player',
          points: u.points
        });

        if (top3.length > 0) {
          // Sắp xếp dạng bục: Hạng 2 -> Hạng 1 -> Hạng 3
          if (top3[1]) arrangedTop.push(mapToChampion(top3[1]));
          if (top3[0]) arrangedTop.push(mapToChampion(top3[0]));
          if (top3[2]) arrangedTop.push(mapToChampion(top3[2]));
        }
        this.topChampions = arrangedTop;

        // 2. Tổ chức dữ liệu cho List Ranking (từ hạng 4 trở đi)
        this.rankings = data.slice(3).map(u => ({
          rank: u.rank,
          img: u.avatar || 'assets/default-avatar.png',
          name: u.name,
          badge: u.points > 1000 ? 'TOP PERFORMER' : '', // Giả lập dữ liệu badge
          subtitle: 'Active Player',
          points: u.points,
          trend: 'STABLE', 
          trendDown: false,
          isUser: false // Hiện tại giả lập false, có thể so user hiện tại từ localstorage sau
        }));

        this.cdr.detectChanges();
      });
    } catch (err) {
      this.zone.run(() => {
        console.error('Lỗi lấy dữ liệu bảng xếp hạng từ backend:', err);
        this.topChampions = [];
        this.rankings = [];
        this.totalCount = 0;
        this.cdr.detectChanges();
      });
    }
  }
}