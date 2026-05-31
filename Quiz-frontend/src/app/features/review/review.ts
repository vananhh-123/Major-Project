import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { QuizService } from '../../services/quiz.service';
import { Subscription } from 'rxjs';
import { API_CONFIG } from '../../config/api.config';

@Component({
  selector: 'app-review',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './review.html',
  styleUrls: ['./review.css']
})
export class Review implements OnInit, OnDestroy {
  // Trạng thái Form
  selectedRating = 0;
  comment = '';
  sortBy = 'latest'; // Sắp xếp mặc định
  
  // Dữ liệu ứng dụng
  quizId = '';
  userId = '';
  reviews: any[] = [];
  quizDetails: any = { title: 'Loading data...', plays: 0 };
  
  private routeSub!: Subscription;
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private quizService = inject(QuizService);
  private cdr = inject(ChangeDetectorRef);
  private apiUrl = API_CONFIG.API_BASE;

  ngOnInit(): void {
    // 1. Lấy ID từ snapshot cho lần đầu load hoặc F5
    this.quizId = this.route.snapshot.paramMap.get('id') || '';
    if (this.quizId) {
      this.refreshPageData();
    }

    // 2. Lắng nghe thay đổi Route
    this.routeSub = this.route.paramMap.subscribe(params => {
      const newId = params.get('id');
      if (newId && newId !== this.quizId) {
        this.quizId = newId;
        this.refreshPageData();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.routeSub) {
      this.routeSub.unsubscribe();
    }
  }

  refreshPageData() {
    this.initializeUser();
    if (this.quizId) {
      this.loadQuiz();
      this.loadReviews();
    }
  }

  initializeUser() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.userId = user.id || user.ID || '';
      } catch (e) {
        console.error('Error parsing user data', e);
      }
    }
  }

  loadQuiz() {
    this.quizService.getQuiz(this.quizId).subscribe({
      next: (res: any) => {
        if (res) {
          this.quizDetails = res;
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        console.error('Quiz API error:', err);
        this.quizDetails = { title: 'Quiz Review', plays: 0 };
        this.cdr.detectChanges();
      }
    });
  }

  loadReviews() {
    this.http.get(`${this.apiUrl}/quizzes/${this.quizId}/reviews`).subscribe({
      next: (res: any) => {
        this.reviews = res || [];
        this.sortReviews(); // Áp dụng sắp xếp sau khi tải dữ liệu
        this.cdr.detectChanges();
        console.log('Total reviews loaded:', this.reviews.length);
      },
      error: (err) => {
        console.error('Reviews API error:', err);
        this.reviews = [];
        this.cdr.detectChanges();
      }
    });
  }

  // Logic xử lý sắp xếp đánh giá
  sortReviews() {
    if (!this.reviews || this.reviews.length === 0) return;

    switch (this.sortBy) {
      case 'latest':
        this.reviews.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'oldest':
        this.reviews.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'highest':
        this.reviews.sort((a, b) => b.rating - a.rating);
        break;
      case 'lowest':
        this.reviews.sort((a, b) => a.rating - b.rating);
        break;
    }
    this.cdr.detectChanges();
  }

  setRating(rating: number) { 
    this.selectedRating = rating; 
    this.cdr.detectChanges();
  }

  // Các hàm hỗ trợ giao diện
  getRatingPercentage(stars: number): number {
    if (!this.reviews || this.reviews.length === 0) return 0;
    const count = this.reviews.filter(r => Math.floor(Number(r.rating || 0)) === stars).length;
    return Math.round((count / this.reviews.length) * 100);
  }

  get averageRating(): number {
    if (!this.reviews || !this.reviews.length) return 0;
    const sum = this.reviews.reduce((a, b) => a + (Number(b.rating) || 0), 0);
    return Number((sum / this.reviews.length).toFixed(1));
  }

  get reviewCount(): number {
    return this.reviews?.length || 0;
  }

  getStars(rating: any): number[] {
    const r = Math.floor(Number(rating) || 0);
    return Array(Math.max(0, r)).fill(0);
  }
 
  getEmptyStars(rating: any): number[] {
    const r = Math.floor(Number(rating) || 0);
    return Array(Math.max(0, 5 - r)).fill(0);
  }

  submitReview() {
    if (this.selectedRating === 0) {
      alert('Please select a star rating!');
      return;
    }
    if (!this.userId) {
      alert('You must be logged in to post a review.');
      return;
    }

    const payload = {
      quiz_id: this.quizId,
      user_id: this.userId,
      rating: this.selectedRating,
      comment: this.comment
    };

    this.http.post(`${this.apiUrl}/quizzes/reviews`, payload).subscribe({
      next: () => {
        alert('Review submitted successfully!');
        this.selectedRating = 0;
        this.comment = '';
        this.loadReviews();
      },
      error: (err) => {
        alert('Error: ' + (err.error?.error || 'Could not submit review'));
      }
    });
  }
}
