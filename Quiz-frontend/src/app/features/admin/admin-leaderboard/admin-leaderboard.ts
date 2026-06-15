import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { API_CONFIG } from '../../../config/api.config';

type LeaderboardMode = 'All' | 'Solo' | 'Multi';
type TimeFilter = 'All Time' | 'This Month' | 'This Week';

interface LeaderboardUser {
  id: string;
  rank: number;
  trend: 'up' | 'down' | 'same';
  username: string;
  email: string;
  avatar: string;
  avatarSeed: string;
  mode: 'Solo' | 'Multi' | 'All';
  category: string;
  points: number;
  score: number;
  games: number;
  streak: number;
  badge: string;
  badgeIcon: string;
  status: 'Active' | 'Blocked';
}

@Component({
  selector: 'app-admin-leaderboard',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './admin-leaderboard.html',
  styleUrl: './admin-leaderboard.css'
})
export class AdminLeaderboard implements OnInit {
  private http = inject(HttpClient);

  searchText = '';
  activeTab: LeaderboardMode = 'All';
  timeFilter: TimeFilter = 'All Time';

  currentPage = 1;
  pageSize = 5;

  players: LeaderboardUser[] = [];

  ngOnInit(): void {
    this.loadLeaderboard();
  }

  loadLeaderboard(): void {
    const period = this.getPeriodParam();
    const mode = this.getModeParam();

    let url = `${API_CONFIG.API_BASE}/leaderboard?period=${period}`;

    if (mode) {
      url += `&mode=${mode}`;
    }

    this.http.get<any[]>(url).subscribe({
      next: (res) => {
        const maxPoints = Math.max(...res.map(x => Number(x.points ?? 0)), 1);

        this.players = res.map((item, index): LeaderboardUser => {
          const points = Number(item.points ?? 0);

          return {
            id: String(item.userId ?? item.user_id ?? ''),
            rank: Number(item.rank ?? index + 1),
            trend: 'same',
            username: String(item.name ?? 'Unknown Player'),
            email: '',
            avatar: String(item.avatar ?? ''),
            avatarSeed: String(item.name ?? item.userId ?? 'player'),
            mode: this.activeTab === 'All' ? 'All' : this.activeTab,
            category: this.activeTab,
            points,
            score: Math.round((points / maxPoints) * 100),
            games: Number(item.games ?? 0),
            streak: Number(item.streak ?? 0),
            badge: this.getBadge(points),
            badgeIcon: this.getBadgeIcon(points),
            status: 'Active'
          };
        });

        this.currentPage = 1;
      },
      error: (err) => {
        console.error('Load leaderboard failed:', err);
      }
    });
  }

  get totalRankedUsers(): number {
    return this.players.length;
  }

  get soloPlayers(): number {
    return this.activeTab === 'Solo' ? this.players.length : 0;
  }

  get multiPlayers(): number {
    return this.activeTab === 'Multi' ? this.players.length : 0;
  }

  get highestScore(): number {
    if (this.players.length === 0) return 0;
    return Math.max(...this.players.map(p => p.points));
  }

  get filteredPlayers(): LeaderboardUser[] {
    const keyword = this.searchText.trim().toLowerCase();

    return this.players.filter(player => {
      return (
        !keyword ||
        player.username.toLowerCase().includes(keyword) ||
        player.id.toLowerCase().includes(keyword) ||
        player.badge.toLowerCase().includes(keyword)
      );
    });
  }

  get topPlayers(): LeaderboardUser[] {
    return this.filteredPlayers
      .filter(player => player.rank <= 3)
      .sort((a, b) => a.rank - b.rank);
  }

  get rankingPlayers(): LeaderboardUser[] {
    return [...this.filteredPlayers].sort((a, b) => a.rank - b.rank);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.rankingPlayers.length / this.pageSize));
  }

  get paginatedPlayers(): LeaderboardUser[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.rankingPlayers.slice(start, start + this.pageSize);
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, index) => index + 1);
  }

  get rangeStart(): number {
    if (this.rankingPlayers.length === 0) return 0;
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get rangeEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.rankingPlayers.length);
  }

  setTab(tab: LeaderboardMode): void {
    this.activeTab = tab;
    this.currentPage = 1;
    this.loadLeaderboard();
  }

  setTimeFilter(filter: TimeFilter): void {
    this.timeFilter = filter;
    this.currentPage = 1;
    this.loadLeaderboard();
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

  toggleStatus(player: LeaderboardUser): void {
    player.status = player.status === 'Active' ? 'Blocked' : 'Active';
  }

  getAvatar(player: LeaderboardUser): string {
    if (player.avatar && player.avatar.trim() !== '') {
      return player.avatar;
    }

    return `https://api.dicebear.com/8.x/avataaars/svg?seed=${encodeURIComponent(player.avatarSeed)}`;
  }

  showComingSoon(): void {
    alert('This feature is currently under development. Please check back in a future update.');
  }

  private getPeriodParam(): string {
    if (this.timeFilter === 'This Week') return 'weekly';
    if (this.timeFilter === 'This Month') return 'monthly';
    return 'all';
  }

  private getModeParam(): string {
    if (this.activeTab === 'Solo') return 'solo';
    if (this.activeTab === 'Multi') return 'multi';
    return '';
  }

  private getBadge(points: number): string {
    if (points >= 5000) return 'Legend';
    if (points >= 3000) return 'Master';
    if (points >= 1500) return 'Expert';
    if (points >= 500) return 'Pro';
    return 'Rookie';
  }

  private getBadgeIcon(points: number): string {
    if (points >= 5000) return '🏆';
    if (points >= 3000) return '⭐';
    if (points >= 1500) return '🔥';
    if (points >= 500) return '💡';
    return '🎯';
  }
}