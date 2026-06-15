import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { QuizService } from '../../../services/quiz.service';
import { API_CONFIG } from '../../../config/api.config';

interface ReviewItem {
  id: string;
  user: string;
  email: string;
  avatar: string;
  rating: number;
  content: string;
  createdAt: string;
}

@Component({
  selector: 'app-quiz-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './quiz-detail.html',
  styleUrl: './quiz-detail.css'
})
export class QuizDetail implements OnInit {
  quizId = '';
  loading = true;
  reviewSort = 'latest';

  quiz: any = null;
  reviews: ReviewItem[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private quizService: QuizService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.quizId = this.route.snapshot.paramMap.get('id') || '';

    if (!this.quizId) {
      this.router.navigate(['/app/quizzes']);
      return;
    }

    this.loadQuiz();
  }

  loadQuiz(): void {
    this.loading = true;

    this.quizService.getQuiz(this.quizId).subscribe({
      next: (res: any) => {
        this.quiz = this.normalizeQuiz(res);
        this.reviews = this.normalizeReviews(res.reviews || res.Reviews || []);
        this.applyReviewSort();

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Cannot load quiz detail:', err);
        this.loading = false;
        this.cdr.detectChanges();
        alert('Cannot load quiz detail.');
        this.router.navigate(['/app/quizzes']);
      }
    });
  }

  normalizeQuiz(q: any): any {
    const creator = q.creator || q.Creator || {};
    const questions = q.questions || q.Questions || [];

    return {
      id: q.id || q.ID,
      title: q.title || 'Untitled Quiz',
      description: q.description || 'No description available.',
      level: q.level || 'Easy',
      visibility: q.visibility || 'public',
      image: this.getCoverImage(q.cover_image || q.CoverImage),
      author: creator.username || creator.Username || 'Unknown',
      createdAt: this.formatDate(q.created_at || q.CreatedAt),
      updatedAt: this.formatDate(q.updated_at || q.UpdatedAt || q.created_at || q.CreatedAt),
      plays: q.plays || q.Plays || 0,
      questionCount: questions.length,
      questions
    };
  }

  normalizeReviews(data: any[]): ReviewItem[] {
    return data.map((item: any) => {
      const userObj = item.user || item.User || {};
      const username =
        userObj.username ||
        userObj.Username ||
        item.username ||
        item.user_id ||
        'Unknown User';

      return {
        id: item.id || item.ID,
        user: username,
        email: userObj.email || userObj.Email || item.email || 'N/A',
        avatar:
          userObj.avatar ||
          userObj.Avatar ||
          `https://api.dicebear.com/8.x/avataaars/svg?seed=${username}`,
        rating: Number(item.rating || item.Rating || 0),
        content: item.comment || item.Comment || item.content || 'No content',
        createdAt: this.formatDate(item.created_at || item.CreatedAt)
      };
    });
  }

  getCoverImage(value?: string): string {
    if (!value) return '/Tech.png';

    if (value.startsWith('data:image') || value.startsWith('http')) {
      return value;
    }

    return value;
  }

  formatDate(value?: string): string {
    if (!value) return 'N/A';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric'
    });
  }

  get averageRating(): string {
    if (this.reviews.length === 0) return '0.0';

    const total = this.reviews.reduce((sum, item) => sum + item.rating, 0);
    return (total / this.reviews.length).toFixed(1);
  }

  getStars(rating: number): number[] {
    return Array.from({ length: rating }, (_, index) => index + 1);
  }

  applyReviewSort(): void {
    if (this.reviewSort === 'latest') {
      this.reviews.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    if (this.reviewSort === 'highest') {
      this.reviews.sort((a, b) => b.rating - a.rating);
    }

    if (this.reviewSort === 'lowest') {
      this.reviews.sort((a, b) => a.rating - b.rating);
    }
  }

  startGame(): void {
    this.router.navigate(['/play/mode'], {
      queryParams: { quizId: this.quizId }
    });
  }

  editQuiz(): void {
    this.router.navigate(['/app/quiz/edit', this.quizId]);
  }

  goBack(): void {
    this.router.navigate(['/app/quizzes']);
  }
}