import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

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
export class AdminDashboard {
  stats: DashboardStat[] = [
    {
      label: 'Total Users',
      value: '1,248',
      change: '+32 this week',
      icon: 'group',
      type: 'primary'
    },
    {
      label: 'Total Quizzes',
      value: '326',
      change: '+18 new quizzes',
      icon: 'quiz',
      type: 'secondary'
    },
    {
      label: 'Solo Games',
      value: '4,890',
      change: '+240 plays',
      icon: 'person',
      type: 'tertiary'
    },
    {
      label: 'Multi Games',
      value: '1,736',
      change: '+92 rooms',
      icon: 'groups',
      type: 'primary'
    },
    {
      label: 'Reviews',
      value: '892',
      change: '4.6 average rating',
      icon: 'rate_review',
      type: 'secondary'
    },
    {
      label: 'Active Rooms',
      value: '24',
      change: 'Live now',
      icon: 'stadia_controller',
      type: 'tertiary'
    }
  ];

  recentQuizzes: RecentQuiz[] = [
    {
      title: 'English Basic Quiz',
      creator: 'Nguyen Van A',
      difficulty: 'Easy',
      status: 'Public',
      rating: 4.8
    },
    {
      title: 'Math Challenge',
      creator: 'Tran Thi B',
      difficulty: 'Mid',
      status: 'Private',
      rating: 4.4
    },
    {
      title: 'Programming Quiz',
      creator: 'Le Minh C',
      difficulty: 'Pro',
      status: 'Public',
      rating: 4.9
    }
  ];

  activities: ActivityLog[] = [
    {
      icon: 'person_add',
      title: 'New user registered',
      description: 'phamhoang@example.com joined the system',
      time: '5 minutes ago'
    },
    {
      icon: 'quiz',
      title: 'Quiz created',
      description: 'English Basic Quiz was created',
      time: '20 minutes ago'
    },
    {
      icon: 'rate_review',
      title: 'New review submitted',
      description: 'A user rated Math Challenge 4 stars',
      time: '1 hour ago'
    },
    {
      icon: 'sports_esports',
      title: 'Multiplayer room started',
      description: 'Room PIN 482913 is currently active',
      time: '2 hours ago'
    }
  ];
}