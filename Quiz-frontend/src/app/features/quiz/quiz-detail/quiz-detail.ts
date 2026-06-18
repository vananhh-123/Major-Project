import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';

import { QuizService } from '../../../services/quiz.service';
import { API_CONFIG } from '../../../config/api.config';

@Component({
  selector: 'app-quiz-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './quiz-detail.html',
  styleUrl: './quiz-detail.css'
})
export class QuizDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private quizService = inject(QuizService);
  private router = inject(Router);
  private cd = inject(ChangeDetectorRef);
  private http = inject(HttpClient);

  quizId = '';
  apiUrl = API_CONFIG.API_BASE;

  currentUser: any = null;
  isOwner = false;
  isAdmin = false;
  canManageQuiz = false;

  selectedVisibility = 'private';

  reviews: any[] = [];
  sortBy = 'latest';
  currentReviewPage = 1;
  reviewsPerPage = 4;
  totalReviewPages = 1;

  replyOpen: Record<string, boolean> = {};
  replyDrafts: Record<string, string> = {};

  quizData: any = {
    title: 'Loading...',
    plays: 0,
    comments: 0,
    rating: 0,
    questionsCount: 0,
    duration: '0 min',
    level: 'Loading...',
    category: 'General',
    author: 'Loading...',
    description: '',
    createdAt: '',
    lastUpdated: '',
    image: '/Cyber Security Theme.png'
  };

  questions: any[] = [];

  ngOnInit(): void {
    this.loadCurrentUser();

    this.route.paramMap.subscribe(params => {
      this.quizId = params.get('id') || '';

      if (this.quizId) {
        this.fetchQuizDetail();
      }
    });
  }

  loadCurrentUser(): void {
    const rawUser = localStorage.getItem('user');
    const rawRole = localStorage.getItem('role');

    if (!rawUser) {
      this.currentUser = null;
      this.isAdmin = String(rawRole || '').toLowerCase() === 'admin';
      return;
    }

    try {
      const parsed = JSON.parse(rawUser);
      this.currentUser = parsed.user || parsed.data?.user || parsed.data || parsed;

      const role = String(
        this.currentUser?.role ||
        parsed.role ||
        parsed.data?.role ||
        rawRole ||
        ''
      ).toLowerCase();

      this.isAdmin =
        role === 'admin' ||
        role === 'superadmin' ||
        role === 'super_admin' ||
        role === 'super admin';
    } catch {
      this.currentUser = null;
      this.isAdmin = String(rawRole || '').toLowerCase() === 'admin';
    }
  }

  fetchQuizDetail(): void {
    this.quizService.getQuiz(this.quizId).subscribe({
      next: (res: any) => {
        if (!res) return;

        const creatorId =
          res.created_by ||
          res.createdBy ||
          res.creator_id ||
          res.creatorId ||
          res.creator?.id ||
          res.creator?.ID ||
          '';

        const currentUserId =
          this.currentUser?.id ||
          this.currentUser?.ID ||
          this.currentUser?.user_id ||
          this.currentUser?.userId ||
          '';

        this.isOwner =
          !!creatorId &&
          !!currentUserId &&
          String(creatorId) === String(currentUserId);

        this.canManageQuiz = this.isOwner || this.isAdmin;

        this.selectedVisibility = String(res.visibility || 'private').toLowerCase();

        const questionList = res.questions || res.Questions || [];

        const totalSeconds = questionList.reduce(
          (acc: number, q: any) =>
            acc + Number(q.time_limit || q.timeLimit || q.time_sec || 20),
          0
        );

        const totalMinutes = Math.ceil(totalSeconds / 60);

        this.quizData = {
          id: res.id || res.ID,
          title: res.title || 'Untitled Quiz',
          plays: res.plays || res.Plays || 0,
          comments: 0,
          rating: 0,
          author:
            res.creator?.username ||
            res.Creator?.Username ||
            res.creator?.name ||
            res.author ||
            'Unknown',
          description: res.description || '',
          level: res.level || res.difficulty || 'Easy',
          category: res.category || 'General',
          questionsCount: questionList.length,
          duration: `${totalMinutes || 0} min`,
          image:
            res.cover_image ||
            res.coverImage ||
            res.image ||
            '/Cyber Security Theme.png',
          createdAt: this.formatDate(res.created_at || res.CreatedAt),
          lastUpdated: this.formatDate(
            res.updated_at ||
            res.UpdatedAt ||
            res.created_at ||
            res.CreatedAt
          )
        };

        this.questions = questionList.map((q: any, i: number) => ({
          id: i + 1,
          type: q.multiple_correct || q.allow_multi ? 'MULTIPLE CHOICE' : 'SINGLE CHOICE',
          points: q.points || 100,
          time: `${q.time_limit || q.timeLimit || q.time_sec || 20}s`,
          text: q.content || q.question || 'Question content',
          options: this.normalizeOptions(q)
        }));

        this.loadReviews();
        this.cd.detectChanges();
      },
      error: err => {
        console.error('Error fetching quiz detail:', err);
        this.cd.detectChanges();
      }
    });
  }

  private normalizeOptions(q: any): any[] {
    if (Array.isArray(q.options)) {
      return q.options.map((opt: any) => ({
        text: opt.text || opt.content || opt.answer || String(opt),
        is_correct: !!(opt.is_correct || opt.correct || opt.isCorrect)
      }));
    }

    if (typeof q.options === 'string') {
      try {
        const parsed = JSON.parse(q.options);
        if (Array.isArray(parsed)) {
          return parsed.map((opt: any) => ({
            text: opt.text || opt.content || opt.answer || String(opt),
            is_correct: !!(opt.is_correct || opt.correct || opt.isCorrect)
          }));
        }
      } catch {}
    }

    const correct = String(q.correct_answer || q.correctAnswer || '').toUpperCase();

    return [
      { key: 'A', text: q.option_a || q.optionA },
      { key: 'B', text: q.option_b || q.optionB },
      { key: 'C', text: q.option_c || q.optionC },
      { key: 'D', text: q.option_d || q.optionD }
    ]
      .filter(item => !!item.text)
      .map(item => ({
        text: item.text,
        is_correct: correct === item.key
      }));
  }

  loadReviews(): void {
    this.http.get(`${this.apiUrl}/quizzes/${this.quizId}/reviews`).subscribe({
      next: (res: any) => {
        this.reviews = Array.isArray(res) ? res : [];

        this.reviews = this.reviews.map(item => ({
          ...item,
          replies: this.loadLocalReplies(item.id || item.ID)
        }));

        this.quizData.comments = this.reviews.length;

        const totalRating = this.reviews.reduce(
          (sum: number, r: any) => sum + Number(r.rating || r.Rating || 0),
          0
        );

        this.quizData.rating = this.reviews.length
          ? (totalRating / this.reviews.length).toFixed(1)
          : 0;

        this.sortReviews();
        this.cd.detectChanges();
      },
      error: err => {
        console.error('Reviews API error:', err);
        this.reviews = [];
        this.updateReviewPagination();
        this.cd.detectChanges();
      }
    });
  }

  sortReviews(): void {
    switch (this.sortBy) {
      case 'latest':
        this.reviews.sort(
          (a, b) =>
            new Date(b.created_at || b.createdAt || b.CreatedAt).getTime() -
            new Date(a.created_at || a.createdAt || a.CreatedAt).getTime()
        );
        break;

      case 'oldest':
        this.reviews.sort(
          (a, b) =>
            new Date(a.created_at || a.createdAt || a.CreatedAt).getTime() -
            new Date(b.created_at || b.createdAt || b.CreatedAt).getTime()
        );
        break;

      case 'highest':
        this.reviews.sort(
          (a, b) => Number(b.rating || b.Rating || 0) - Number(a.rating || a.Rating || 0)
        );
        break;

      case 'lowest':
        this.reviews.sort(
          (a, b) => Number(a.rating || a.Rating || 0) - Number(b.rating || b.Rating || 0)
        );
        break;
    }

    this.currentReviewPage = 1;
    this.updateReviewPagination();
  }

  updateReviewPagination(): void {
    this.totalReviewPages = Math.ceil(this.reviews.length / this.reviewsPerPage) || 1;

    if (this.currentReviewPage > this.totalReviewPages) {
      this.currentReviewPage = this.totalReviewPages;
    }

    if (this.currentReviewPage < 1) {
      this.currentReviewPage = 1;
    }
  }

  get pagedReviews(): any[] {
    const startIndex = (this.currentReviewPage - 1) * this.reviewsPerPage;
    return this.reviews.slice(startIndex, startIndex + this.reviewsPerPage);
  }

  goToReviewPage(page: number): void {
    if (page >= 1 && page <= this.totalReviewPages) {
      this.currentReviewPage = page;
    }
  }

  getReviewPagesArray(): number[] {
    return Array.from({ length: this.totalReviewPages }, (_, i) => i + 1);
  }

  getStars(rating: any): number[] {
    return Array(Math.max(0, Math.floor(Number(rating) || 0))).fill(0);
  }

  getEmptyStars(rating: any): number[] {
    return Array(Math.max(0, 5 - Math.floor(Number(rating) || 0))).fill(0);
  }

  toggleReply(reviewId: string): void {
    this.replyOpen[reviewId] = !this.replyOpen[reviewId];
  }

  submitReply(review: any): void {
    const reviewId = review.id || review.ID;
    const content = String(this.replyDrafts[reviewId] || '').trim();

    if (!content) return;

    const reply = {
      id: Date.now().toString(),
      content,
      createdAt: new Date().toISOString(),
      user: {
        username:
          this.currentUser?.username ||
          this.currentUser?.name ||
          this.currentUser?.email ||
          'Anonymous'
      }
    };

    const replies = this.loadLocalReplies(reviewId);
    replies.push(reply);

    localStorage.setItem(this.replyKey(reviewId), JSON.stringify(replies));

    review.replies = replies;
    this.replyDrafts[reviewId] = '';
    this.replyOpen[reviewId] = false;
  }

  private loadLocalReplies(reviewId: string): any[] {
    try {
      const raw = localStorage.getItem(this.replyKey(reviewId));
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private replyKey(reviewId: string): string {
    return `just4quiz_review_replies_${reviewId}`;
  }

  updateVisibility(visibility: string): void {
    if (!this.canManageQuiz) return;

    this.quizService.updateVisibility(this.quizId, visibility).subscribe({
      next: () => {
        this.selectedVisibility = visibility;
      },
      error: err => console.error('Visibility update error:', err)
    });
  }

  startGame(): void {
    this.router.navigate(['/play/mode'], {
      queryParams: {
        id: this.quizId,
        title: this.quizData.title,
        desc: this.quizData.description,
        level: this.quizData.level,
        length: this.quizData.questionsCount
      }
    });
  }

  shareQuiz(): void {
    alert('Tính năng này hiện tại chưa được phát triển. Vui lòng chờ cập nhật trong tương lai!');
  }

  deleteQuiz(): void {
    if (!this.canManageQuiz) return;

    const confirmDelete = confirm(
      'Are you sure you want to delete this quiz? This action cannot be undone.'
    );

    if (!confirmDelete) return;

    this.http.delete(`${this.apiUrl}/quizzes/${this.quizId}`).subscribe({
      next: () => {
        alert('Quiz deleted successfully!');
        this.router.navigate(['/app/dashboard']);
      },
      error: err => {
        console.error('Error deleting quiz:', err);
        alert('Failed to delete quiz.');
      }
    });
  }

  private formatDate(value: any): string {
    if (!value) return 'N/A';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'N/A';

    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }
}