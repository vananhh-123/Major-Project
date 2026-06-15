import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  AdminApi,
  AdminReviewApi
} from '../../../services/admin-api';

type FeedbackType = 'Review' | 'Comment';
type FeedbackStatus = 'Visible' | 'Hidden';

interface FeedbackItem {
  id: string;
  type: FeedbackType;
  user: string;
  email: string;
  avatarSeed: string;
  quizTitle: string;
  quizId: string;
  content: string;
  rating?: number;
  likes: number;
  replies: number;
  status: FeedbackStatus;
  createdAt: string;
}

@Component({
  selector: 'app-admin-reviews',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-reviews.html',
  styleUrl: './admin-reviews.css'
})
export class AdminReviews implements OnInit {
  searchText = '';
  activeTab: 'all' | 'reviews' | 'comments' | 'popular' = 'all';
  statusFilter = '';
  quizFilter = '';
  ratingFilter = '';

  feedbacks: FeedbackItem[] = [];

  constructor(private adminApi: AdminApi) {}

  ngOnInit(): void {
    this.loadReviews();
  }

  loadReviews(): void {
    this.adminApi.getAdminReviews().subscribe({
      next: (data: AdminReviewApi[]) => {
        this.feedbacks = data.map((item: AdminReviewApi) =>
          this.mapReview(item)
        );
      },
      error: () => {
        alert('Cannot load reviews from backend.');
        this.feedbacks = [];
      }
    });
  }

  private mapReview(item: AdminReviewApi): FeedbackItem {
    const rating = item.rating || 0;
    const username =
      item.username ||
      item.email ||
      item.user_id ||
      'Unknown User';

    return {
      id: item.id,
      type: rating > 0 ? 'Review' : 'Comment',
      user: username,
      email: item.email || 'N/A',
      avatarSeed: username,
      quizTitle:
        item.quizTitle ||
        item.title ||
        item.quiz_id ||
        'Unknown Quiz',
      quizId: item.quiz_id || 'N/A',
      content: item.content || 'No content',
      rating: rating > 0 ? rating : undefined,
      likes: item.likes || 0,
      replies: item.replies || 0,
      status:
        item.status?.toLowerCase() === 'hidden'
          ? 'Hidden'
          : 'Visible',
      createdAt: this.formatDate(item.created_at)
    };
  }

  private formatDate(value?: string): string {
    if (!value) {
      return 'N/A';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric'
    });
  }

  get totalFeedback(): number {
    return this.feedbacks.length;
  }

  get totalReviews(): number {
    return this.feedbacks.filter(item => item.type === 'Review').length;
  }

  get totalComments(): number {
    return this.feedbacks.filter(item => item.type === 'Comment').length;
  }

  get hiddenCount(): number {
    return this.feedbacks.filter(item => item.status === 'Hidden').length;
  }

  get averageRating(): string {
    const reviews = this.feedbacks.filter(
      item => item.type === 'Review' && item.rating
    );

    if (reviews.length === 0) {
      return '0.0';
    }

    const total = reviews.reduce(
      (sum, item) => sum + (item.rating || 0),
      0
    );

    return (total / reviews.length).toFixed(1);
  }

  get quizzes(): string[] {
    return Array.from(
      new Set(this.feedbacks.map(item => item.quizTitle))
    );
  }

  get filteredFeedbacks(): FeedbackItem[] {
    let list = [...this.feedbacks];

    if (this.activeTab === 'reviews') {
      list = list.filter(item => item.type === 'Review');
    }

    if (this.activeTab === 'comments') {
      list = list.filter(item => item.type === 'Comment');
    }

    if (this.activeTab === 'popular') {
      list = list.sort((a, b) => b.likes - a.likes);
    }

    const keyword = this.searchText.toLowerCase();

    return list.filter(item => {
      const matchesSearch =
        item.user.toLowerCase().includes(keyword) ||
        item.email.toLowerCase().includes(keyword) ||
        item.quizTitle.toLowerCase().includes(keyword) ||
        item.quizId.toLowerCase().includes(keyword) ||
        item.content.toLowerCase().includes(keyword) ||
        item.id.toLowerCase().includes(keyword);

      const matchesStatus =
        this.statusFilter === '' ||
        item.status === this.statusFilter;

      const matchesQuiz =
        this.quizFilter === '' ||
        item.quizTitle === this.quizFilter;

      const matchesRating =
        this.ratingFilter === '' ||
        (
          item.type === 'Review' &&
          item.rating === Number(this.ratingFilter)
        );

      return (
        matchesSearch &&
        matchesStatus &&
        matchesQuiz &&
        matchesRating
      );
    });
  }

  getStars(rating?: number): number[] {
    return Array.from(
      { length: rating || 0 },
      (_, index) => index + 1
    );
  }

  setTab(tab: 'all' | 'reviews' | 'comments' | 'popular'): void {
    this.activeTab = tab;
  }

  toggleStatus(item: FeedbackItem): void {
    item.status =
      item.status === 'Visible'
        ? 'Hidden'
        : 'Visible';
  }

  deleteFeedback(id: string): void {
    const confirmed = confirm(
      'Are you sure you want to delete this feedback?'
    );

    if (!confirmed) {
      return;
    }

    this.feedbacks = this.feedbacks.filter(
      item => item.id !== id
    );
  }
}