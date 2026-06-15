import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  AdminApi,
  AdminUserApi
} from '../../../services/admin-api';

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
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-leaderboard.html',
  styleUrl: './admin-leaderboard.css'
})
export class AdminLeaderboard implements OnInit {
  searchText = '';
  activeTab: LeaderboardMode = 'All';
  timeFilter: TimeFilter = 'All Time';

  currentPage = 1;
  pageSize = 5;

  players: LeaderboardUser[] = [];

  constructor(
    private adminApi: AdminApi,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadLeaderboard();
  }

  loadLeaderboard(): void {
    this.adminApi.getAdminUsers().subscribe({
      next: (users: AdminUserApi[]) => {
        const mappedUsers = users.map((user, index) => this.mapUserToLeaderboard(user, index));

        this.players = mappedUsers
          .sort((a, b) => b.points - a.points)
          .map((player, index) => ({
            ...player,
            rank: index + 1,
            score: this.calculateScore(player.points, mappedUsers)
          }));

        this.currentPage = 1;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Load admin leaderboard failed:', err);
        this.players = [];
        this.cdr.detectChanges();
      }
    });
  }

  private mapUserToLeaderboard(user: AdminUserApi, index: number): LeaderboardUser {
    const soloGames = Number(user.soloGames || 0);
    const multiGames = Number(user.multiGames || 0);
    const games = soloGames + multiGames;
    const points = Number(user.score || 0);

    let mode: 'Solo' | 'Multi' | 'All' = 'All';

    if (soloGames > multiGames) {
      mode = 'Solo';
    } else if (multiGames > soloGames) {
      mode = 'Multi';
    }

    return {
      id: String(user.id || index + 1),
      rank: index + 1,
      trend: 'same',
      username: String(user.name || user.username || 'Unknown User'),
      email: String(user.email || ''),
      avatar: String(user.avatar || ''),
      avatarSeed: String(user.username || user.name || user.email || user.id || `user-${index}`),
      mode,
      category: mode,
      points,
      score: 0,
      games,
      streak: 0,
      badge: this.getBadge(points),
      badgeIcon: this.getBadgeIcon(points),
      status: this.normalizeStatus(user.status)
    };
  }

  private calculateScore(points: number, users: LeaderboardUser[]): number {
    const highest = Math.max(...users.map(user => user.points), 1);
    return Math.round((points / highest) * 100);
  }

  private normalizeStatus(status?: string): 'Active' | 'Blocked' {
    const value = String(status || '').toLowerCase();

    if (
      value === 'blocked' ||
      value === 'banned' ||
      value === 'inactive'
    ) {
      return 'Blocked';
    }

    return 'Active';
  }

  get totalRankedUsers(): number {
    return this.players.length;
  }

  get soloPlayers(): number {
    return this.players.filter(player => player.mode === 'Solo').length;
  }

  get multiPlayers(): number {
    return this.players.filter(player => player.mode === 'Multi').length;
  }

  get highestScore(): number {
    if (this.players.length === 0) return 0;
    return Math.max(...this.players.map(player => player.points));
  }

  get filteredPlayers(): LeaderboardUser[] {
    const keyword = this.searchText.trim().toLowerCase();

    return this.players.filter(player => {
      const matchesSearch =
        !keyword ||
        player.username.toLowerCase().includes(keyword) ||
        player.email.toLowerCase().includes(keyword) ||
        player.id.toLowerCase().includes(keyword) ||
        player.badge.toLowerCase().includes(keyword);

      const matchesMode =
        this.activeTab === 'All' ||
        player.mode === this.activeTab;

      return matchesSearch && matchesMode;
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
  }

  setTimeFilter(filter: TimeFilter): void {
    this.timeFilter = filter;
    this.currentPage = 1;
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
    alert('This feature is not yet developed. Please wait for future updates!');
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