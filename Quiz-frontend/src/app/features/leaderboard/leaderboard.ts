import { ChangeDetectorRef, Component, NgZone, OnInit, inject } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { API_CONFIG } from '../../config/api.config';

export interface LeaderboardUser {
  userId: string;
  rank: number;
  name: string;
  points: number;
  avatar: string;
  games?: number;
  avgScore?: number;
  badges?: string[];
  subtitle?: string;
}

export interface Champion {
  rank: number;
  name: string;
  img: string;
  title?: string;
  subtitle?: string;
  points: number;
  badges?: string[];
}

export interface RankingItem {
  rank: number;
  img: string;
  name: string;
  badge?: string;
  badges?: string[];
  subtitle?: string;
  points: number;
  games?: number;
  avgScore?: number;
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

  private normalizeAvatar(avatar: string | null | undefined, name: string, userId?: string): string {
    const value = (avatar || '').trim();
    if (value && !/quiz|space/i.test(value)) {
      return value;
    }

    return '/User.png';
  }

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

      const awardedPlayers = await Promise.all(
        data.map(async (item: any) => {
          const statsUrl = API_CONFIG.ENDPOINTS.USER_STATS(item.userId || item.user_id || item.id);

          try {
            const statsResponse = await fetch(statsUrl, {
              headers: {
                Accept: 'application/json'
              }
            });

            if (!statsResponse.ok) {
              throw new Error(`HTTP ${statsResponse.status}`);
            }

            const stats = await statsResponse.json();
            const modeStats = this.mode === 'multi' ? stats.multi : stats.solo;

            return {
              ...item,
              games: modeStats?.games || 0,
              avgScore: Number(modeStats?.avgScore || 0)
            };
          } catch {
            return {
              ...item,
              games: 0,
              avgScore: 0
            };
          }
        })
      );

      const maxPoints = Math.max(...awardedPlayers.map((player: any) => Number(player.points || 0)), 0);
      const maxAvgScore = Math.max(...awardedPlayers.map((player: any) => Number(player.avgScore || 0)), 0);
      const maxGames = Math.max(...awardedPlayers.map((player: any) => Number(player.games || 0)), 0);

      const badgeForPlayer = (player: any): string[] => {
        const badges: string[] = [];

        if (Number(player.points || 0) === maxPoints && maxPoints > 0) {
          badges.push('Quiz Titan');
        }

        if (Number(player.avgScore || 0) === maxAvgScore && maxAvgScore > 0) {
          badges.push('Accuracy Ace');
        }

        if (Number(player.games || 0) === maxGames && maxGames > 0) {
          badges.push('Marathon Player');
        }

        return badges;
      };

      this.zone.run(() => {
        this.totalCount = awardedPlayers.length || 0;

        // 1. Tổ chức dữ liệu cho Top 3 (Champions)
        const top3 = awardedPlayers.slice(0, 3);
        const arrangedTop: Champion[] = [];

        const mapToChampion = (u: LeaderboardUser): Champion => ({
          rank: u.rank,
          name: u.name,
          img: this.normalizeAvatar(u.avatar, u.name, u.userId),
          title: (badgeForPlayer(u)[0] || (u.rank === 1 ? 'Quiz Master' : 'Pro Player')),
          subtitle: `${u.points.toLocaleString()} pts • ${Math.round(u.avgScore || 0)}% avg`,
          points: u.points,
          badges: badgeForPlayer(u)
        });

        if (top3.length > 0) {
          // Sắp xếp dạng bục: Hạng 2 -> Hạng 1 -> Hạng 3
          if (top3[1]) arrangedTop.push(mapToChampion(top3[1]));
          if (top3[0]) arrangedTop.push(mapToChampion(top3[0]));
          if (top3[2]) arrangedTop.push(mapToChampion(top3[2]));
        }
        this.topChampions = arrangedTop;

        // 2. Tổ chức dữ liệu cho List Ranking (từ hạng 4 trở đi)
        this.rankings = awardedPlayers.slice(3).map(u => ({
          rank: u.rank,
          img: this.normalizeAvatar(u.avatar, u.name, u.userId),
          name: u.name,
          badge: badgeForPlayer(u)[0] || '',
          badges: badgeForPlayer(u),
          subtitle: `${Math.round(u.avgScore || 0)}% avg • ${u.games || 0} games`,
          points: u.points,
          games: u.games,
          avgScore: u.avgScore,
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