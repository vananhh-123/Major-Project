import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Achievement {
  id: number;
  name: string;
  description: string;
  icon: string;
  xp: number;
  condition: string;
  color: string;
  status: 'Active' | 'Disabled';
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

  achievements: Achievement[] = [
    {
      id: 1,
      name: 'First Quiz',
      description: 'Create your first quiz',
      icon: 'military_tech',
      xp: 50,
      condition: 'Create 1 quiz',
      color: '#6E12F8',
      status: 'Active'
    },
    {
      id: 2,
      name: 'Quiz Master',
      description: 'Create 50 quizzes',
      icon: 'emoji_events',
      xp: 500,
      condition: 'Create 50 quizzes',
      color: '#F59E0B',
      status: 'Active'
    },
    {
      id: 3,
      name: 'Popular Creator',
      description: 'Reach 1000 plays',
      icon: 'local_fire_department',
      xp: 1000,
      condition: '1000 quiz plays',
      color: '#EF4444',
      status: 'Active'
    },
    {
      id: 4,
      name: 'Legend',
      description: 'Reach 5000 plays',
      icon: 'workspace_premium',
      xp: 5000,
      condition: '5000 quiz plays',
      color: '#10B981',
      status: 'Disabled'
    }
  ];

  get filteredAchievements() {
    return this.achievements.filter(a =>
      a.name.toLowerCase().includes(this.searchText.toLowerCase())
    );
  }

  toggleStatus(item: Achievement) {
    item.status =
      item.status === 'Active'
        ? 'Disabled'
        : 'Active';
  }

  deleteAchievement(id: number) {
    this.achievements =
      this.achievements.filter(x => x.id !== id);
  }
}