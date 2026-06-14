import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

type LeaderboardMode = 'All' | 'Solo' | 'Multi';
type TimeFilter = 'All Time' | 'This Month' | 'This Week';

interface LeaderboardUser {
  id: string;
  rank: number;
  trend: 'up' | 'down' | 'same';
  name: string;
  username: string;
  email: string;
  avatarSeed: string;
  mode: 'Solo' | 'Multi';
  category: string;
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
export class AdminLeaderboard {
  searchText = '';
  activeTab: LeaderboardMode = 'All';
  timeFilter: TimeFilter = 'This Week';

  currentPage = 1;
  pageSize = 5;

  players: LeaderboardUser[] = [
    {
      id: 'U001',
      rank: 1,
      trend: 'same',
      name: 'NeuroQueen',
      username: '@NeuroQueen',
      email: 'neuroqueen@example.com',
      avatarSeed: 'NeuroQueen',
      mode: 'Solo',
      category: 'Science',
      score: 99.8,
      games: 842,
      streak: 47,
      badge: 'Legend',
      badgeIcon: '🏆',
      status: 'Active'
    },
    {
      id: 'U002',
      rank: 2,
      trend: 'up',
      name: 'HistoHero',
      username: '@HistoHero',
      email: 'histohero@example.com',
      avatarSeed: 'HistoHero',
      mode: 'Multi',
      category: 'History',
      score: 98.4,
      games: 631,
      streak: 31,
      badge: 'Master',
      badgeIcon: '⭐',
      status: 'Active'
    },
    {
      id: 'U003',
      rank: 3,
      trend: 'down',
      name: 'SportzKing',
      username: '@SportzKing',
      email: 'sportzking@example.com',
      avatarSeed: 'SportzKing',
      mode: 'Solo',
      category: 'Sports',
      score: 97.1,
      games: 509,
      streak: 22,
      badge: 'Expert',
      badgeIcon: '🔥',
      status: 'Active'
    },
    {
      id: 'U004',
      rank: 4,
      trend: 'up',
      name: 'CodeWizard',
      username: '@CodeWizard',
      email: 'codewizard@example.com',
      avatarSeed: 'CodeWizard',
      mode: 'Multi',
      category: 'Tech',
      score: 95.6,
      games: 741,
      streak: 18,
      badge: 'Pro',
      badgeIcon: '💡',
      status: 'Active'
    },
    {
      id: 'U005',
      rank: 5,
      trend: 'same',
      name: 'CulturePro',
      username: '@CulturePro',
      email: 'culturepro@example.com',
      avatarSeed: 'CulturePro',
      mode: 'Solo',
      category: 'Culture',
      score: 94.2,
      games: 388,
      streak: 14,
      badge: 'Pro',
      badgeIcon: '🎭',
      status: 'Active'
    },
    {
      id: 'U006',
      rank: 6,
      trend: 'up',
      name: 'QuizMaster42',
      username: '@QuizMaster42',
      email: 'quizmaster@example.com',
      avatarSeed: 'QuizMaster42',
      mode: 'Multi',
      category: 'Mixed',
      score: 92.8,
      games: 1102,
      streak: 9,
      badge: 'Elite',
      badgeIcon: '💎',
      status: 'Active'
    },
    {
      id: 'U007',
      rank: 7,
      trend: 'down',
      name: 'TriviaGod',
      username: '@TriviaGod',
      email: 'triviagod@example.com',
      avatarSeed: 'TriviaGod',
      mode: 'Solo',
      category: 'History',
      score: 91.5,
      games: 275,
      streak: 21,
      badge: 'Expert',
      badgeIcon: '☀️',
      status: 'Blocked'
    },
    {
      id: 'U008',
      rank: 8,
      trend: 'up',
      name: 'BrainStorm88',
      username: '@BrainStorm88',
      email: 'brainstorm@example.com',
      avatarSeed: 'BrainStorm88',
      mode: 'Multi',
      category: 'Science',
      score: 90.3,
      games: 494,
      streak: 7,
      badge: 'Pro',
      badgeIcon: '⚡',
      status: 'Active'
    },
    {
      id: 'U009',
      rank: 9,
      trend: 'same',
      name: 'AcePlayer',
      username: '@AcePlayer',
      email: 'aceplayer@example.com',
      avatarSeed: 'AcePlayer',
      mode: 'Solo',
      category: 'Mixed',
      score: 89.7,
      games: 612,
      streak: 5,
      badge: 'Pro',
      badgeIcon: '🎯',
      status: 'Active'
    },
    {
      id: 'U010',
      rank: 10,
      trend: 'down',
      name: 'QuizPhenom',
      username: '@QuizPhenom',
      email: 'quizphenom@example.com',
      avatarSeed: 'QuizPhenom',
      mode: 'Multi',
      category: 'Culture',
      score: 88.9,
      games: 338,
      streak: 12,
      badge: 'Expert',
      badgeIcon: '✨',
      status: 'Active'
    }
  ];

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
    return Math.max(...this.players.map(player => player.score));
  }

  get filteredPlayers(): LeaderboardUser[] {
    return this.players.filter(player => {
      const keyword = this.searchText.toLowerCase();

      const matchesSearch =
        player.name.toLowerCase().includes(keyword) ||
        player.username.toLowerCase().includes(keyword) ||
        player.email.toLowerCase().includes(keyword) ||
        player.category.toLowerCase().includes(keyword) ||
        player.badge.toLowerCase().includes(keyword);

      const matchesTab =
        this.activeTab === 'All' ||
        player.mode === this.activeTab;

      return matchesSearch && matchesTab;
    });
  }

  get topPlayers(): LeaderboardUser[] {
    return this.filteredPlayers
      .filter(player => player.rank <= 3)
      .sort((a, b) => a.rank - b.rank);
  }

  get rankingPlayers(): LeaderboardUser[] {
    return this.filteredPlayers.sort((a, b) => a.rank - b.rank);
  }

  get totalPages(): number {
    return Math.ceil(this.rankingPlayers.length / this.pageSize) || 1;
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

  toggleStatus(player: LeaderboardUser): void {
    player.status = player.status === 'Active' ? 'Blocked' : 'Active';
  }
}