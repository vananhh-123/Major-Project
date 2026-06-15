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
  username: string = 'Alex Rivera';
  joinPin: string = '';
  quizzes: any[] = [];

  constructor(private http: HttpClient, private cd: ChangeDetectorRef, private router: Router, private authPrompt: AuthPromptService) {}

  async ngOnInit() {
    try {
      // Get all quizzes
      const res: any = await firstValueFrom(
        this.http.get(API_CONFIG.ENDPOINTS.QUIZZES)
      );
      
      if (res && Array.isArray(res)) {
        // Lấy tất cả quiz public, không lọc theo creator email
        const publicQuizzes = res.filter(q => q.visibility === 'public' || !q.visibility);
        // Tính điểm đề xuất cho mỗi quiz: kết hợp plays, rating và độ mới
        const scored = publicQuizzes.map((q: any) => {
          const plays = Number(q.plays || 0);
          let comments = 0;
          let rating = 0;
          if (q.reviews && q.reviews.length > 0) {
             comments = q.reviews.length;
             const sum = q.reviews.reduce((a: number, b: any) => a + (Number(b.rating) || 0), 0);
             rating = Math.round((sum / comments) * 10) / 10;
          }
          // recency score: newer quizzes score higher (days since creation)
          const createdAt = q.created_at || q.createdAt || null;
          let recencyScore = 0;
          if (createdAt) {
            const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
            recencyScore = Math.max(0, 30 - days); // range 0..30
          }
          // final score weights
          const score = plays * 1 + (rating || 0) * 18 + recencyScore * 1.5;

          return { raw: q, plays, comments, rating, score };
        });

        // Sắp xếp giảm dần theo score và lấy top 4
        const recommended = scored.sort((a: any, b: any) => b.score - a.score).slice(0, 4).map((item: any) => item.raw);

        // Lấy tối đa 4 quiz
        this.quizzes = recommended.map(q => {
          const plays = q.plays || 0;
          let comments = 0;
          let rating = 0;
          if (q.reviews && q.reviews.length > 0) {
             comments = q.reviews.length;
             const sum = q.reviews.reduce((a: number, b: any) => a + b.rating, 0);
             rating = Math.round((sum / comments) * 10) / 10;
          }
          return {
            id: q.id || q.ID,
            title: q.title,
            stats: `${plays} Plays - ` + (q.questions ? q.questions.length : 0) + ' Questions',
            plays: plays,
            comments: comments,
            rating: rating || 0,
            img: q.cover_image && q.cover_image.startsWith('data:image') ? q.cover_image : '/Cyber.png'
          };
        });
        this.cd.detectChanges();
      }
    } catch (error) {
      console.error('L?i khi t?i d? li?u', error);
    }
  }

  joinGame() {
    if (this.joinPin && this.joinPin.length === 6) {
      this.router.navigate(['/play/multi/lobby'], {
        queryParams: { role: 'player', pin: this.joinPin }
      });
    }
  }

  guardedNavigate(path: string) {
    if (this.authPrompt.requireLogin(path)) {
      this.router.navigateByUrl(path);
    }
  }

  guardedAction(cb: () => void) {
    if (this.authPrompt.requireLogin()) {
      cb();
    }
  }

  openQuizDetail(id: any) {
    // Quiz detail is public; allow navigation without auth
    this.router.navigate(['/app/quiz-detail', id || 1]);
  }

  onPinInput(event: Event) {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/[^0-9]/g, '');
    this.joinPin = input.value;
  }

  getQuizImg(quiz: any): string {
    return quiz.img || '/Cyber.png';
  }

  sendInvite() {
    alert('Tính năng này hiện tại chưa được phát triển. Vui lòng chờ cập nhật trong tương lai!');
  }
}