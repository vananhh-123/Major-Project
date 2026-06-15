import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { AdminApi, AdminDashboardStats } from '../../../services/admin-api';
import { QuizService } from '../../../services/quiz.service';

type QuizStatus = 'Public' | 'Private';
type Difficulty = 'Easy' | 'Mid' | 'Pro';

interface DashboardStat {
  label: string;
  value: string;
  change: string;
  icon: string;
  type: string;
}

interface RecentQuiz {
  title: string;
  creator: string;
  difficulty: Difficulty;
  status: QuizStatus;
  rating: number;
}

interface ActivityLog {
  icon: string;
  title: string;
  description: string;
  time: string;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css'
})
export class AdminDashboard implements OnInit {
  stats: DashboardStat[] = [];
  recentQuizzes: RecentQuiz[] = [];

  activities: ActivityLog[] = [
    {
      icon: 'person_add',
      title: 'New user registered',
      description: 'User account data is connected from backend.',
      time: 'Live'
    },
    {
      icon: 'quiz',
      title: 'Quiz library synced',
      description: 'Quiz Bank is loading quizzes from Supabase.',
      time: 'Live'
    },
    {
      icon: 'rate_review',
      title: 'Reviews module ready',
      description: 'Admin can monitor quiz feedback and comments.',
      time: 'Recently'
    },
    {
      icon: 'sports_esports',
      title: 'Multiplayer service online',
      description: 'Room and result APIs are available.',
      time: 'Now'
    }
  ];

  constructor(
    private adminApi: AdminApi,
    private quizService: QuizService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadDashboardStats();
    this.loadRecentQuizzes();
  }

  loadDashboardStats(): void {
    this.adminApi.getDashboardStats().subscribe({
      next: (data: AdminDashboardStats) => {
        this.stats = [
          {
            label: 'Total Users',
            value: String(data.totalUsers || 0),
            change: 'Registered accounts',
            icon: 'group',
            type: 'primary'
          },
          {
            label: 'Total Quizzes',
            value: String(data.totalQuizzes || 0),
            change: 'Created quizzes',
            icon: 'quiz',
            type: 'secondary'
          },
          {
            label: 'Questions',
            value: String(data.totalQuestions || 0),
            change: 'Total quiz questions',
            icon: 'help',
            type: 'tertiary'
          },
          {
            label: 'Results',
            value: String(data.totalResults || 0),
            change: 'Submitted game results',
            icon: 'sports_esports',
            type: 'primary'
          },
          {
            label: 'Reviews',
            value: String(data.totalReviews || 0),
            change: 'User feedback',
            icon: 'rate_review',
            type: 'secondary'
          },
          {
            label: 'Active Rooms',
            value: String(data.activeRooms || 0),
            change: 'Live now',
            icon: 'stadia_controller',
            type: 'tertiary'
          }
        ];

        this.cdr.detectChanges();
      },
      error: () => {
        this.setFallbackStats();
      }
    });
  }

  loadRecentQuizzes(): void {
    this.quizService.getQuizzes().subscribe({
      next: (data: any[]) => {
        this.recentQuizzes = data
          .map(q => this.mapRecentQuiz(q))
          .slice(0, 5);

        this.cdr.detectChanges();
      },
      error: () => {
        this.recentQuizzes = [];
        this.cdr.detectChanges();
      }
    });
  }

  private mapRecentQuiz(q: any): RecentQuiz {
    const reviews = q.reviews || q.Reviews || [];
    const creator = q.creator || q.Creator || {};

    let rating = 0;

    if (reviews.length > 0) {
      const total = reviews.reduce(
        (sum: number, item: any) => sum + Number(item.rating || 0),
        0
      );
      rating = Math.round((total / reviews.length) * 10) / 10;
    }

    return {
      title: q.title || 'Untitled Quiz',
      creator: creator.username || q.creator || q.creatorName || 'Unknown',
      difficulty: this.normalizeDifficulty(q.level || q.difficulty),
      status: this.normalizeStatus(q.visibility || q.status),
      rating
    };
  }

  private normalizeDifficulty(value?: string): Difficulty {
    const text = (value || '').toLowerCase();

    if (text === 'easy') return 'Easy';
    if (text === 'mid' || text === 'medium') return 'Mid';
    if (text === 'pro' || text === 'hard') return 'Pro';

    return 'Easy';
  }

  private normalizeStatus(value?: string): QuizStatus {
    return (value || '').toLowerCase() === 'private' ? 'Private' : 'Public';
  }

  private setFallbackStats(): void {
    this.stats = [
      {
        label: 'Total Users',
        value: '0',
        change: 'Backend unavailable',
        icon: 'group',
        type: 'primary'
      },
      {
        label: 'Total Quizzes',
        value: '0',
        change: 'Backend unavailable',
        icon: 'quiz',
        type: 'secondary'
      },
      {
        label: 'Questions',
        value: '0',
        change: 'Backend unavailable',
        icon: 'help',
        type: 'tertiary'
      },
      {
        label: 'Results',
        value: '0',
        change: 'Backend unavailable',
        icon: 'sports_esports',
        type: 'primary'
      },
      {
        label: 'Reviews',
        value: '0',
        change: 'Backend unavailable',
        icon: 'rate_review',
        type: 'secondary'
      },
      {
        label: 'Active Rooms',
        value: '0',
        change: 'Backend unavailable',
        icon: 'stadia_controller',
        type: 'tertiary'
      }
    ];

    this.cdr.detectChanges();
  }
}