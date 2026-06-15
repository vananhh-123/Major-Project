import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthPromptService } from '../../core/services/auth-prompt.service';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_CONFIG } from '../../config/api.config';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class Dashboard implements OnInit {
  username = 'JUST4QUIZ';
  joinPin = '';
  quizzes: any[] = [];

  constructor(
    private http: HttpClient,
    private cd: ChangeDetectorRef,
    private router: Router,
    private authPrompt: AuthPromptService
  ) {}

  async ngOnInit() {
    this.loadCurrentUser();
    await this.loadRecommendedQuizzes();
  }

  loadCurrentUser(): void {
    const rawUser = localStorage.getItem('user');

    if (!rawUser) {
      this.username = 'JUST4QUIZ';
      return;
    }

    try {
      const parsed = JSON.parse(rawUser);
      const user = parsed.user || parsed.data?.user || parsed.data || parsed;

      this.username =
        user.username ||
        user.name ||
        user.full_name ||
        user.fullName ||
        user.email ||
        'JUST4QUIZ';
    } catch {
      this.username = 'JUST4QUIZ';
    }
  }

  async loadRecommendedQuizzes(): Promise<void> {
    try {
      const res: any = await firstValueFrom(
        this.http.get(API_CONFIG.ENDPOINTS.QUIZZES)
      );

      if (res && Array.isArray(res)) {
        const publicQuizzes = res.filter(q => q.visibility === 'public' || !q.visibility);

        const scored = publicQuizzes.map((q: any) => {
          const plays = Number(q.plays || 0);
          let comments = 0;
          let rating = 0;

          if (q.reviews && q.reviews.length > 0) {
            comments = q.reviews.length;
            const sum = q.reviews.reduce(
              (a: number, b: any) => a + (Number(b.rating) || 0),
              0
            );
            rating = Math.round((sum / comments) * 10) / 10;
          }

          const createdAt = q.created_at || q.createdAt || null;
          let recencyScore = 0;

          if (createdAt) {
            const days = Math.floor(
              (Date.now() - new Date(createdAt).getTime()) /
              (1000 * 60 * 60 * 24)
            );
            recencyScore = Math.max(0, 30 - days);
          }

          const score = plays + rating * 18 + recencyScore * 1.5;

          return { raw: q, score };
        });

        const recommended = scored
          .sort((a: any, b: any) => b.score - a.score)
          .slice(0, 4)
          .map((item: any) => item.raw);

        this.quizzes = recommended.map(q => {
          const plays = q.plays || 0;
          let comments = 0;
          let rating = 0;

          if (q.reviews && q.reviews.length > 0) {
            comments = q.reviews.length;
            const sum = q.reviews.reduce(
              (a: number, b: any) => a + (Number(b.rating) || 0),
              0
            );
            rating = Math.round((sum / comments) * 10) / 10;
          }

          return {
            id: q.id || q.ID,
            title: q.title,
            plays,
            comments,
            rating: rating || 0,
            img:
              q.cover_image && q.cover_image.startsWith('data:image')
                ? q.cover_image
                : '/Cyber.png'
          };
        });

        this.cd.detectChanges();
      }
    } catch (error) {
      console.error('Lỗi khi tải dữ liệu dashboard:', error);
    }
  }

  joinGame(): void {
    if (this.joinPin && this.joinPin.length === 6) {
      this.router.navigate(['/play/multi/lobby'], {
        queryParams: { role: 'player', pin: this.joinPin }
      });
    }
  }

  guardedNavigate(path: string): void {
    if (this.authPrompt.requireLogin(path)) {
      this.router.navigateByUrl(path);
    }
  }

  guardedAction(cb: () => void): void {
    if (this.authPrompt.requireLogin()) {
      cb();
    }
  }

  openQuizDetail(id: any): void {
    this.router.navigate(['/app/quiz-detail', id || 1]);
  }

  onPinInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/[^0-9]/g, '');
    this.joinPin = input.value;
  }

  getQuizImg(quiz: any): string {
    return quiz.img || '/Cyber.png';
  }

  sendInvite(): void {
    alert('Tính năng này hiện tại chưa được phát triển. Vui lòng chờ cập nhật trong tương lai!');
  }
}