import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { API_CONFIG } from '../../../config/api.config';

@Component({
  selector: 'app-result',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './result.html',
  styleUrls: ['./result.css'],
})
export class Result implements OnInit {
  isOwner: boolean = false;
  isSolo: boolean = false;
  quizId: string | null = null;
  private hasSaved: boolean = false;

  quizResult = {
    description: "Amazing effort! You've navigated JUST4QUIZ with luminous intelligence.",
    totalPoints: 0,
    rank: 2,
    avgTime: '0.0s',
    accuracy: 0,
    correctAnswers: 0,
    totalQuestions: 0,
    bestStreak: 0,
    imageSummary: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=400&q=80'
  };

  leaderboard = [
    { rank: 1, name: 'Alex Rivera', points: 15890, avatar: '/assets/images/user.png', badge: 'WINNER' },
    { rank: 2, name: 'Sarah', points: 12450, avatar: '/assets/images/user.png', badge: '' },
    { rank: 3, name: 'Quinn', points: 10120, avatar: '/assets/images/user.png', badge: '' },
    { rank: 4, name: 'Jordan P.', points: 9840, avatar: '/assets/images/user.png', badge: 'TOP PERFORMER' },
    { rank: 5, name: 'Mia Wong', points: 8200, avatar: '/assets/images/user.png', badge: 'CONSISTENT' }
  ];

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.isSolo = params['isSolo'] === 'true';
      this.isOwner = params['role'] === 'host';

      if (params['quizId']) {
          this.quizId = params['quizId'];
      }

      if (params['score']) {
         this.quizResult.totalPoints = Number(params['score']);
      }
      if (params['totalQuestions']) {
         this.quizResult.totalQuestions = Number(params['totalQuestions']);
      }
      if (params['totalCorrect']) {
         this.quizResult.correctAnswers = Number(params['totalCorrect']);
         if (this.quizResult.totalQuestions > 0) {
            this.quizResult.accuracy = Math.round((this.quizResult.correctAnswers / this.quizResult.totalQuestions) * 100);
         }
      }
      if (params['bestStreak']) {
         this.quizResult.bestStreak = Number(params['bestStreak']);
      }
      if (params['totalTime']) {
         let totalTime = Number(params['totalTime']);
         let average = this.quizResult.totalQuestions > 0 ? (totalTime / this.quizResult.totalQuestions) : 0;
         this.quizResult.avgTime = average.toFixed(1) + 's';
      }

      // Multi mode: extract actual leaderboard instead of dummy data
      if (!this.isSolo) {
         try {
             const scoresStr = sessionStorage.getItem('finalScores');
             if (scoresStr) {
                 const finalScores = JSON.parse(scoresStr);
                 if (Array.isArray(finalScores) && finalScores.length > 0) {
                     this.leaderboard = finalScores.map((fs: any, index: number) => ({
                         rank: index + 1,
                         name: fs.username || fs.id,
                         points: fs.score,
                         avatar: '/assets/images/user.png',
                         badge: index === 0 ? 'WINNER' : ''
                     }));
                 }
             }
         } catch (e) {
             console.error("Failed to parse leaderboard scores from session", e);
         }
      }

      this.saveResultToDatabase();
    });
  }

  saveResultToDatabase() {
    if (this.hasSaved) return;
    this.hasSaved = true;

    let userId = null;
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        userId = user.id || user.ID || null;
      }
    } catch (e) {}

    const resultPayload = {
      user_id: userId,
      quiz_id: this.quizId,
      score: this.quizResult.totalPoints,
      correct_answers: this.quizResult.correctAnswers,
      is_solo: this.isSolo
    };

    console.log("Saving result payload:", resultPayload);

    this.http.post(API_CONFIG.ENDPOINTS.RESULTS, resultPayload).subscribe({
      next: (response) => {
        console.log('Result saved successfully', response);
      },
      error: (err) => {
        console.error('Failed to save result', err);
      }
    });
  }
}

