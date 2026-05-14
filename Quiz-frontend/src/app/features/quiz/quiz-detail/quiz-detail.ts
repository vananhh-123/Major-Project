import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { QuizService } from '../../../services/quiz.service';
import { HttpClient } from '@angular/common/http';
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

  isOwner: boolean = false;
  selectedVisibility: string = 'private';
  quizId: string = '';
  currentUser: any = null;
  apiUrl = API_CONFIG.API_BASE;

  // D? li?u cho danh s�ch Review (D�nh cho Guest)
  reviews: any[] = [];
  sortBy = 'latest';

  quizData: any = {
    title: 'Loading...',
    plays: '0',
    comments: '0',
    rating: '0',
    questionsCount: 0,
    duration: '0 min Avg.',
    level: 'Loading...',
    engagementRate: 0,
    createdAt: '',
    lastUpdated: '',
    category: 'Loading...',
    author: 'Loading...',
    description: '',
    imageUser: '/Cyber Security Theme.png',
    imageGuest: '/Cyber security concept.png'
  };

  questions: any[] = [];

  ngOnInit(): void {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        this.currentUser = JSON.parse(userStr);
      } catch (e) {}
    }

    this.route.paramMap.subscribe(params => {
      this.quizId = params.get('id') || '';
      if (this.quizId) {
        this.fetchQuizDetail();
      }
    });
  }
 
  fetchQuizDetail() {
    this.quizService.getQuiz(this.quizId).subscribe({
      next: (res) => {
        if (!res) return;

        // Code g?c: Ki?m tra quy?n ch? s? h?u
        if (this.currentUser && res.created_by === this.currentUser.id) {
          this.isOwner = true;          this.loadReviews();        } else {
          this.isOwner = false;
          this.loadReviews(); // Guest m?i t?i reviews
        }

        this.selectedVisibility = res.visibility || 'private';

        let totalSeconds = res.questions ? res.questions.reduce((acc: number, q: any) => acc + (q.time_limit || 20), 0) : 0;
        const totalMinutes = Math.ceil(totalSeconds / 60);

        let calculatedComments = res.comments || 0;
        let calculatedRating: number | string = res.rating || 0;
        if (res.reviews && res.reviews.length > 0) {
            calculatedComments = res.reviews.length;
            const sum = res.reviews.reduce((a: number, b: any) => a + b.rating, 0);
            calculatedRating = (sum / calculatedComments).toFixed(1);
        }

        this.quizData = {
          ...this.quizData,
          id: res.id,
          title: res.title || 'Untitled',
          plays: res.plays || 0,
          comments: calculatedComments,
          rating: calculatedRating,
          author: res.creator?.username || 'Unknown',
          description: res.description || '',
          level: res.level || 'Easy',
          category: 'General', 
          questionsCount: res.questions ? res.questions.length : 0,
          duration: totalMinutes + ' min',
          imageUser: res.cover_image || '/Cyber Security Theme.png',
          imageGuest: res.cover_image || '/Cyber security concept.png',
          createdAt: new Date(res.created_at).toLocaleDateString(),
          lastUpdated: new Date(res.updated_at || res.created_at).toLocaleDateString()
        };

        if (res.questions) {
          this.questions = res.questions.map((q: any, i: number) => {
            let options = [];
            if (typeof q.options === 'string') {
              try { options = JSON.parse(q.options); } catch (e) {}
            } else if (Array.isArray(q.options)) {
              options = q.options;
            }

            return {
              id: i + 1,
              type: q.multiple_correct ? 'MULTIPLE CHOICE' : 'SINGLE CHOICE',
              points: q.points || 100,
              time: (q.time_limit || 20) + 's',
              text: q.content || 'Question content',
              options: options
            };
          });
        }
        this.cd.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching quiz detail', err);
        this.cd.detectChanges();
      }
    });
  }

  // Ch?c nang Review h? tr? ph?n Guest
  loadReviews() {
    this.http.get(`${this.apiUrl}/quizzes/${this.quizId}/reviews`).subscribe({
      next: (res: any) => {
        this.reviews = res || [];        this.quizData.comments = this.reviews.length;
        const totalRating = this.reviews.reduce((sum: number, r: any) => sum + r.rating, 0);
        this.quizData.rating = this.reviews.length ? (totalRating / this.reviews.length).toFixed(1) : 0;        this.sortReviews();
        this.cd.detectChanges();
      },
      error: (err) => console.error('Reviews API error:', err)
    });
  }

  sortReviews() {
    if (!this.reviews.length) return;
    switch (this.sortBy) {
      case 'latest': this.reviews.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); break;
      case 'oldest': this.reviews.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()); break;
      case 'highest': this.reviews.sort((a, b) => b.rating - a.rating); break;
      case 'lowest': this.reviews.sort((a, b) => a.rating - b.rating); break;
    }
    this.cd.detectChanges();
  }

  getStars(rating: any): number[] { return Array(Math.max(0, Math.floor(Number(rating) || 0))).fill(0); }
  getEmptyStars(rating: any): number[] { return Array(Math.max(0, 5 - Math.floor(Number(rating) || 0))).fill(0); }

  // Ch?c nang g?c
  updateVisibility(visibility: string) {
    if (!this.isOwner) return;
    this.quizService.updateVisibility(this.quizId, visibility).subscribe({
      next: () => { this.selectedVisibility = visibility; this.cd.detectChanges(); },
      error: (err) => console.error('Visibility update error', err)
    });
  }

  startGame() {
    this.router.navigate(['/play/mode'], { 
      queryParams: { id: this.quizId, title: this.quizData.title, desc: this.quizData.description, level: this.quizData.level, length: this.quizData.questionsCount } 
    });
  }

  shareQuiz() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => alert('Link copied: ' + url));
  }
    // B? sung ch?c nang Delete
  deleteQuiz() {
    if (!this.isOwner) return;
    const confirmDelete = confirm('Are you sure you want to delete this quiz? This action cannot be undone.');
    if (confirmDelete) {
      this.http.delete(`${this.apiUrl}/quizzes/${this.quizId}`).subscribe({
        next: () => {
          alert('Quiz deleted successfully!');
          this.router.navigate(['/app/dashboard']);
        },
        error: (err) => {
          console.error('Error deleting quiz:', err);
          alert('Failed to delete quiz.');
        }
      });
    }
  }
}

