import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

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

  constructor(private http: HttpClient, private cd: ChangeDetectorRef, private router: Router) {}

  async ngOnInit() {
    try {
      // Get all quizzes
      const res: any = await firstValueFrom(
        this.http.get('http://127.0.0.1:8080/api/quizzes')
      );
      
      if (res && Array.isArray(res)) {
        // Ch? hi?n th? c�c quiz c?a Admin d?a v�o email (?n d?nh hon username v� username c� th? thay d?i)
        const adminQuizzes = res.filter(q => q.creator && q.creator.email === 'just4quiz@gmail.com');

        // L?y t?i da 4 quiz
        this.quizzes = adminQuizzes.slice(0, 4).map(q => {
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

  onPinInput(event: Event) {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/[^0-9]/g, '');
    this.joinPin = input.value;
  }

  getQuizImg(quiz: any): string {
    return quiz.img || '/Cyber.png';
  }
}

