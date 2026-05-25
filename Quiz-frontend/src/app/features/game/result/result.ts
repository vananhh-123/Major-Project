import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
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
  hasLoggedInUser: boolean = false;
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
  // Derived view arrays for rendering
  hostEntry: any = null;
  playersOnly: any[] = [];
  podiumPlayers: any[] = [];
  otherPlayers: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    try {
      this.hasLoggedInUser = !!(localStorage.getItem('user') || localStorage.getItem('token'));
    } catch {
      this.hasLoggedInUser = false;
    }

    this.route.queryParams.subscribe(params => {
      this.isSolo = params['isSolo'] === 'true';
      this.isOwner = params['role'] === 'host';

      this.quizId = this.resolveQuizId(params);

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
                userId: fs.userId || fs.id || fs.userID,
                name: fs.name || fs.username || (fs.userId || fs.id),
                points: fs.score || fs.points || 0,
                avatar: fs.avatar || `https://api.dicebear.com/7.x/personas/svg?seed=${(fs.name || fs.userId || index)}`,
                isHost: !!(fs.isHost || fs.IsHost || fs.is_host),
                badge: index === 0 ? 'WINNER' : ''
              }));

               // If we can find the current user in the leaderboard, update quizResult for display
               try {
                 const userStr = localStorage.getItem('user');
                 let currentId = '';
                 if (userStr) {
                   const user = JSON.parse(userStr);
                   currentId = user.id || user.ID || '';
                 }
                 const me = this.leaderboard.find((p: any) => p.userId === currentId || p.name === (currentId || ''));
                 if (me) {
                   this.quizResult.totalPoints = me.points || 0;
                   this.quizResult.rank = me.rank || this.leaderboard.findIndex((p: any) => p === me) + 1;
                 }
               } catch (e) {
                 // ignore
               }
             }
           }
         } catch (e) {
           console.error("Failed to parse leaderboard scores from session", e);
         }
      }

      // Prepare derived arrays: host (if any) and players-only (exclude host)
      try {
        this.hostEntry = this.leaderboard.find((p: any) => p.isHost) || null;
        this.playersOnly = this.leaderboard.filter((p: any) => !p.isHost);
        this.playersOnly.sort((a: any, b: any) => (b.points || 0) - (a.points || 0));
        // recompute rank among players-only (exclude host)
        this.playersOnly.forEach((p: any, i: number) => p.rank = i + 1);
        this.podiumPlayers = this.playersOnly.slice(0, 3);
        this.otherPlayers = this.playersOnly.slice(3);
      } catch (e) {
        this.hostEntry = null;
        this.playersOnly = [];
        this.podiumPlayers = [];
        this.otherPlayers = [];
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

  onPlayAgain(): void {
    // For solo: navigate to solo lobby with same quiz id
    if (this.isSolo) {
      this.router.navigate(['/play/solo/lobby'], { queryParams: { id: this.quizId } });
      return;
    }

    // For multiplayer:
    if (this.isOwner) {
      // Host: navigate to mode create page so host can start another lobby for same quiz
      this.router.navigate(['/play/mode'], { queryParams: { id: this.quizId } });
    } else {
      // Player: go to mode selection so they can join or create a new game
      this.router.navigate(['/play/mode']);
    }
  }

  onRateQuiz(): void {
    const resolvedQuizId = this.resolveQuizId();
    if (!resolvedQuizId || !this.canRateQuiz) {
      console.warn('Rate Quiz clicked but access is blocked or quizId is missing.', {
        resolvedQuizId,
        isOwner: this.isOwner,
        hasLoggedInUser: this.hasLoggedInUser,
      });
      return;
    }
    this.router.navigate(['/app/review', resolvedQuizId]);
  }

  get canRateQuiz(): boolean {
    return !!this.resolveQuizId() && (this.isOwner || this.hasLoggedInUser);
  }

  private resolveQuizId(params?: any): string | null {
    return (
      params?.['quizId'] ||
      params?.['id'] ||
      this.quizId ||
      sessionStorage.getItem('lastQuizId') ||
      sessionStorage.getItem('currentQuizId') ||
      this.route.snapshot.queryParamMap.get('quizId') ||
      this.route.snapshot.queryParamMap.get('id')
    );
  }
}

