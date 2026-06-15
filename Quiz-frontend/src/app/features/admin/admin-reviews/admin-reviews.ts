import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { API_CONFIG } from '../../../config/api.config';

interface AdminReview {
  id: string;
  user: string;
  email: string;
  avatar: string;
  quizId: string;
  quizTitle: string;
  content: string;
  rating: number;
  createdAt: string;
}

interface AdminQuiz {
  id: string;
  title: string;
}

@Component({
  selector: 'app-admin-reviews',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './admin-reviews.html',
  styleUrl: './admin-reviews.css'
})
export class AdminReviews implements OnInit {
  private http = inject(HttpClient);

  reviews: AdminReview[] = [];
  allQuizzes: AdminQuiz[] = [];

  searchText = '';
  quizFilter = '';
  ratingFilter = '';
  sortBy = 'latest';

  ngOnInit(): void {
    this.loadReviews();
    this.loadQuizzes();
  }

  loadReviews(): void {
    this.http.get<any[]>(`${API_CONFIG.API_BASE}/admin/reviews`).subscribe({
      next: (res) => {
        this.reviews = res.map((r) => ({
          id: String(r.id ?? ''),
          user: String(r.user ?? r.username ?? 'Anonymous User'),
          email: String(r.email ?? ''),
          avatar: String(r.avatar ?? ''),
          quizId: String(r.quizId ?? r.quiz_id ?? ''),
          quizTitle: String(r.quizTitle ?? r.title ?? 'Unknown Quiz'),
          content: String(r.content ?? r.comment ?? ''),
          rating: Number(r.rating ?? 0),
          createdAt: String(r.createdAt ?? r.created_at ?? '')
        }));
      },
      error: (err) => {
        console.error('Load admin reviews failed:', err);
        this.reviews = [];
      }
    });
  }

  loadQuizzes(): void {
    this.http.get<any[]>(`${API_CONFIG.API_BASE}/quizzes`).subscribe({
      next: (res) => {
        this.allQuizzes = res.map((q) => ({
          id: String(q.id ?? q.ID ?? ''),
          title: String(q.title ?? 'Untitled Quiz')
        }));
      },
      error: (err) => {
        console.error('Load quizzes failed:', err);
        this.allQuizzes = [];
      }
    });
  }

  get totalReviews(): number {
    return this.reviews.length;
  }

  get reviewedQuizzes(): number {
    return new Set(this.reviews.map((r) => r.quizId)).size;
  }

  get averageRating(): string {
    if (this.reviews.length === 0) {
      return '0.0';
    }

    const total = this.reviews.reduce((sum, r) => sum + r.rating, 0);
    return (total / this.reviews.length).toFixed(1);
  }

  get fiveStarReviews(): number {
    return this.reviews.filter((r) => r.rating === 5).length;
  }

  get quizzes(): AdminQuiz[] {
    return this.allQuizzes;
  }

  get filteredReviews(): AdminReview[] {
    const keyword = this.searchText.trim().toLowerCase();

    let list = this.reviews.filter((r) => {
      const matchesSearch =
        !keyword ||
        r.user.toLowerCase().includes(keyword) ||
        r.email.toLowerCase().includes(keyword) ||
        r.quizTitle.toLowerCase().includes(keyword) ||
        r.content.toLowerCase().includes(keyword);

      const matchesQuiz =
        !this.quizFilter || r.quizId === this.quizFilter;

      const matchesRating =
        !this.ratingFilter || r.rating === Number(this.ratingFilter);

      return matchesSearch && matchesQuiz && matchesRating;
    });

    if (this.sortBy === 'highest') {
      list = [...list].sort((a, b) => b.rating - a.rating);
    }

    if (this.sortBy === 'lowest') {
      list = [...list].sort((a, b) => a.rating - b.rating);
    }

    if (this.sortBy === 'latest') {
      list = [...list].sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();

        return dateB - dateA;
      });
    }

    return list;
  }

  getStars(rating: number): number[] {
    return Array.from({ length: Math.max(rating, 0) });
  }

  getEmptyStars(rating: number): number[] {
    return Array.from({ length: Math.max(5 - rating, 0) });
  }

  getRatingPercentage(star: number): number {
    const source = this.quizFilter
      ? this.reviews.filter((r) => r.quizId === this.quizFilter)
      : this.reviews;

    if (source.length === 0) {
      return 0;
    }

    const count = source.filter((r) => r.rating === star).length;
    return Math.round((count / source.length) * 100);
  }

  getAvatar(review: AdminReview): string {
    if (review.avatar && review.avatar.trim() !== '') {
      return review.avatar;
    }

    return `https://api.dicebear.com/8.x/avataaars/svg?seed=${encodeURIComponent(
      review.email || review.user || review.id
    )}`;
  }

  deleteReview(id: string): void {
    if (!confirm('Are you sure you want to delete this review?')) {
      return;
    }

    this.http.delete(`${API_CONFIG.API_BASE}/admin/reviews/${id}`).subscribe({
      next: () => this.loadReviews(),
      error: (err) => console.error('Delete review failed:', err)
    });
  }

  showComingSoon(): void {
    alert(
      'This feature is currently under development. Please check back in a future update.'
    );
  }

  get quizCards(): {
    id: string;
    title: string;
    count: number;
    avgRating: string;
  }[] {
    return this.allQuizzes.map((quiz) => {
      const items = this.reviews.filter((r) => r.quizId === quiz.id);
      const totalRating = items.reduce(
        (sum, item) => sum + item.rating,
        0
      );

      return {
        id: quiz.id,
        title: quiz.title,
        count: items.length,
        avgRating:
          items.length > 0
            ? (totalRating / items.length).toFixed(1)
            : '0.0'
      };
    });
  }
}