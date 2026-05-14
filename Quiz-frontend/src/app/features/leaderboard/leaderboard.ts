import { Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './leaderboard.html',
  styleUrls: ['./leaderboard.css']
})
export class Leaderboard implements OnInit {
  private http = inject(HttpClient);
  
  searchQuery: string = '';
  activeTab: 'weekly' | 'monthly' | 'all' = 'all';

  topChampions: Champion[] = [];
  rankings: RankingItem[] = [];

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

  fetchLeaderboard() {
    // Chèn params để gửi lên Backend
    const url = `${API_CONFIG.API_BASE}/leaderboard?period=${this.activeTab}&q=${this.searchQuery}`;
    
    this.http.get<LeaderboardUser[]>(url).subscribe({
      next: (res) => {
        const data = res || [];

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

        // 2. Tổ chức dữ liệu cho List Ranking (Từ hạng 4 trở đi)
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
      },
      error: (err) => {
        console.error("Lỗi lấy dữ liệu bảng xếp hạng từ backend:", err);
      }
    });
  }
}