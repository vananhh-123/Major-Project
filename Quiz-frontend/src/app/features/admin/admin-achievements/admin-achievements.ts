import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

type AchievementRarity = 'Common' | 'Rare' | 'Epic' | 'Legendary';
type AchievementStatus = 'Active' | 'Disabled';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  rarity: AchievementRarity;
  unlocks: number;
  points: number;
  status: AchievementStatus;
  colorClass: string;
}

@Component({
  selector: 'app-admin-achievements',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-achievements.html',
  styleUrl: './admin-achievements.css'
})
export class AdminAchievements {
  searchText = '';
  activeFilter: 'All' | AchievementRarity = 'All';

  achievements: Achievement[] = [
    {
      id: 'ACH001',
      title: 'First Quiz',
      description: 'Complete your very first quiz',
      icon: 'track_changes',
      rarity: 'Common',
      unlocks: 12420,
      points: 50,
      status: 'Active',
      colorClass: 'pink'
    },
    {
      id: 'ACH002',
      title: 'Hat Trick',
      description: 'Win 3 games in a row',
      icon: 'stadia_controller',
      rarity: 'Common',
      unlocks: 12570,
      points: 75,
      status: 'Active',
      colorClass: 'purple'
    },
    {
      id: 'ACH003',
      title: 'Perfect Score',
      description: 'Get 100% on any quiz',
      icon: 'workspace_premium',
      rarity: 'Rare',
      unlocks: 8621,
      points: 120,
      status: 'Active',
      colorClass: 'rose'
    },
    {
      id: 'ACH004',
      title: 'Speed Demon',
      description: 'Complete a quiz in under 60 seconds',
      icon: 'bolt',
      rarity: 'Rare',
      unlocks: 6340,
      points: 140,
      status: 'Active',
      colorClass: 'yellow'
    },
    {
      id: 'ACH005',
      title: 'Knowledge God',
      description: 'Score 95%+ on a hard difficulty quiz',
      icon: 'psychology',
      rarity: 'Epic',
      unlocks: 2540,
      points: 300,
      status: 'Active',
      colorClass: 'pink'
    },
    {
      id: 'ACH006',
      title: 'Streak Master',
      description: 'Maintain a 30 day daily quiz streak',
      icon: 'local_fire_department',
      rarity: 'Epic',
      unlocks: 941,
      points: 450,
      status: 'Active',
      colorClass: 'orange'
    },
    {
      id: 'ACH007',
      title: 'Quiz Legend',
      description: 'Reach rank #1 on the global leaderboard',
      icon: 'military_tech',
      rarity: 'Legendary',
      unlocks: 41,
      points: 1000,
      status: 'Active',
      colorClass: 'gold'
    },
    {
      id: 'ACH008',
      title: 'Night Owl',
      description: 'Play 10 quizzes after midnight',
      icon: 'nights_stay',
      rarity: 'Common',
      unlocks: 3120,
      points: 80,
      status: 'Active',
      colorClass: 'brown'
    },
    {
      id: 'ACH009',
      title: 'Social Butterfly',
      description: 'Share results with 50 friends',
      icon: 'flutter_dash',
      rarity: 'Rare',
      unlocks: 3100,
      points: 160,
      status: 'Active',
      colorClass: 'indigo'
    },
    {
      id: 'ACH010',
      title: 'Completionist',
      description: 'Finish all quizzes in one collection',
      icon: 'military_tech',
      rarity: 'Epic',
      unlocks: 1250,
      points: 350,
      status: 'Active',
      colorClass: 'blue'
    },
    {
      id: 'ACH011',
      title: 'Grand Master',
      description: 'Play 1,000+ quizzes total',
      icon: 'diamond',
      rarity: 'Legendary',
      unlocks: 88,
      points: 1500,
      status: 'Active',
      colorClass: 'cyan'
    },
    {
      id: 'ACH012',
      title: 'Early Bird',
      description: 'Log in before 8am for 7 days',
      icon: 'wb_sunny',
      rarity: 'Common',
      unlocks: 5620,
      points: 90,
      status: 'Disabled',
      colorClass: 'gray'
    }
  ];

  get totalAchievements(): number {
    return this.achievements.length;
  }

  get unlockedToday(): string {
    return '1,284';
  }

  get rarestUnlocked(): string {
    return 'Legend Tier';
  }

  get avgCompletion(): string {
    return '34.7%';
  }

  get filteredAchievements(): Achievement[] {
    return this.achievements.filter((item) => {
      const keyword = this.searchText.toLowerCase();

      const matchesSearch =
        item.title.toLowerCase().includes(keyword) ||
        item.description.toLowerCase().includes(keyword) ||
        item.rarity.toLowerCase().includes(keyword);

      const matchesFilter =
        this.activeFilter === 'All' ||
        item.rarity === this.activeFilter;

      return matchesSearch && matchesFilter;
    });
  }

  setFilter(filter: 'All' | AchievementRarity): void {
    this.activeFilter = filter;
  }

  toggleStatus(item: Achievement): void {
    item.status = item.status === 'Active'
      ? 'Disabled'
      : 'Active';
  }

  deleteAchievement(id: string): void {
    const confirmed = confirm(
      'Are you sure you want to delete this achievement?'
    );

    if (!confirmed) {
      return;
    }

    this.achievements = this.achievements.filter(
      item => item.id !== id
    );
  }
}