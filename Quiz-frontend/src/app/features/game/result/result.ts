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
    rank: 0,
    avgTime: '0.0s',
    accuracy: 0,
    correctAnswers: 0,
    totalQuestions: 0,
    bestStreak: 0,
    imageSummary: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=400&q=80'
  };

  leaderboard: any[] = [
    { rank: 1, name: 'Alex Rivera', points: 15890, avatar: '/assets/images/user.png', badge: 'WINNER' },
    { rank: 2, name: 'Sarah',       points: 12450, avatar: '/assets/images/user.png', badge: '' },
    { rank: 3, name: 'Quinn',       points: 10120, avatar: '/assets/images/user.png', badge: '' },
    { rank: 4, name: 'Jordan P.',   points:  9840, avatar: '/assets/images/user.png', badge: 'TOP PERFORMER' },
    { rank: 5, name: 'Mia Wong',    points:  8200, avatar: '/assets/images/user.png', badge: 'CONSISTENT' }
  ];

  // View arrays — tất cả đều tính từ toàn bộ leaderboard (bao gồm Host nếu Host cũng chơi)
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
      this.isSolo    = params['isSolo'] === 'true';
      this.isOwner   = params['role']   === 'host';
      this.quizId    = this.resolveQuizId(params);

      if (params['score'])          this.quizResult.totalPoints    = Number(params['score']);
      if (params['totalQuestions']) this.quizResult.totalQuestions = Number(params['totalQuestions']);
      if (params['totalCorrect']) {
        this.quizResult.correctAnswers = Number(params['totalCorrect']);
        if (this.quizResult.totalQuestions > 0) {
          this.quizResult.accuracy = Math.round(
            (this.quizResult.correctAnswers / this.quizResult.totalQuestions) * 100
          );
        }
      }
      if (params['bestStreak']) this.quizResult.bestStreak = Number(params['bestStreak']);
      if (params['totalTime']) {
        const totalTime = Number(params['totalTime']);
        const average   = this.quizResult.totalQuestions > 0
          ? totalTime / this.quizResult.totalQuestions : 0;
        this.quizResult.avgTime = average.toFixed(1) + 's';
      }

      // Multi mode: lấy leaderboard thực từ sessionStorage (do WebSocket game_ended ghi vào)
      if (!this.isSolo) {
        try {
          const scoresStr = sessionStorage.getItem('finalScores');
          if (scoresStr) {
            const finalScores = JSON.parse(scoresStr);
            if (Array.isArray(finalScores) && finalScores.length > 0) {

              // Lọc Host ra — Host không thi đấu, không vào bảng xếp hạng
              const playersOnly = finalScores.filter(
                (fs: any) => !(fs.isHost || fs.IsHost || fs.is_host)
              );

              // Sort theo điểm giảm dần (chỉ players, không có host)
              const sorted = [...playersOnly].sort(
                (a: any, b: any) => ((b.score || b.points || 0) - (a.score || a.points || 0))
              );

              // Map với rank chính xác sau khi đã lọc host và sort
              this.leaderboard = sorted.map((fs: any, index: number) => ({
                rank:   index + 1,
                userId: fs.userId || fs.id || fs.userID,
                name:   fs.name   || fs.username || (fs.userId || fs.id),
                points: fs.score  || fs.points || 0,
                avatar: fs.avatar || `https://api.dicebear.com/7.x/personas/svg?seed=${fs.name || fs.userId || index}`,
                isHost: false,
                badge:  index === 0 ? 'WINNER' : ''
              }));

              // Cập nhật quizResult cho Player/Guest view
              // Ưu tiên: localStorage userId → sessionStorage currentUserId → fallback name
              try {
                let currentId = '';
                let currentName = '';
                const userStr = localStorage.getItem('user');
                if (userStr) {
                  const user = JSON.parse(userStr);
                  currentId = user.id || user.ID || '';
                  currentName = user.username || user.name || '';
                }
                if (!currentId) {
                  currentId = sessionStorage.getItem('currentUserId') || '';
                }
                if (!currentName) {
                  currentName = sessionStorage.getItem('currentUserName') || '';
                }

                // So sánh userId trước, fallback sang name nếu không khớp
                let me = this.leaderboard.find(
                  (p: any) => p.userId && currentId && p.userId === currentId
                );
                if (!me && currentName) {
                  me = this.leaderboard.find((p: any) => p.name === currentName);
                }

                if (me) {
                  this.quizResult.totalPoints = me.points || 0;
                  this.quizResult.rank        = me.rank;
                } else {
                  console.warn('Result: could not identify current player in leaderboard', { currentId, currentName });
                }
              } catch { /* ignore */ }
            }
          }
        } catch (e) {
          console.error('Failed to parse leaderboard scores from session', e);
        }
      }

      // Tính podium và phần còn lại — leaderboard lúc này đã lọc host, sort đúng
      try {
        this.podiumPlayers = this.leaderboard.slice(0, 3);
        this.otherPlayers  = this.leaderboard.slice(3);
      } catch {
        this.podiumPlayers = [];
        this.otherPlayers  = [];
      }

      this.saveResultToDatabase();
    });

    // Temporary debug hook: allow invoking Play Again from browser console
    try {
      (window as any).__playAgain = () => this.onPlayAgain();
    } catch (e) { /* noop */ }
  }

  saveResultToDatabase() {
    if (this.hasSaved) return;
    this.hasSaved = true;

    // Ưu tiên lấy userId từ localStorage (authenticated user), fallback sang sessionStorage
    let userId = null;
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        userId = user.id || user.ID || null;
      }
    } catch { /* ignore */ }

    // Fallback: lấy từ sessionStorage nếu localStorage không có
    if (!userId) {
      try {
        userId = sessionStorage.getItem('currentUserId');
      } catch { /* ignore */ }
    }

    // Lấy roomId từ query params (pin) khi là Multi
    let roomId: string | null = null;
    try {
      const pin = this.route.snapshot.queryParamMap.get('pin');
      if (!this.isSolo && pin) roomId = pin;
    } catch { /* ignore */ }

    const resultPayload = {
      user_id:         userId,
      quiz_id:         this.quizId,
      room_id:         roomId,
      score:           this.quizResult.totalPoints,
      correct_answers: this.quizResult.correctAnswers,
      is_solo:         this.isSolo,
      mode:             this.isSolo ? 'solo' : 'multi'
    };

    console.log('Saving result payload:', resultPayload);

    this.http.post(API_CONFIG.ENDPOINTS.RESULTS, resultPayload).subscribe({
      next:  (res) => {
        console.log('Result saved successfully', res);
        console.log('Kết quả đã lưu vào database');
      },
      error: (err) => {
        console.error('Failed to save result', err);
        console.error('Backend response:', err.error || err.message);
      }
    });
  }

  onPlayAgain(): void {
    if (this.isSolo) {
      // Solo: về lobby cùng quiz
      this.router.navigate(['/play/solo/lobby'], { queryParams: { id: this.quizId } });
      return;
    }
    // Multi — chỉ Host mới gọi được hàm này (nút đã ẩn với Player/Guest)
    this.router.navigate(['/play/mode'], {
      queryParams: {
        id: this.quizId,
        title: sessionStorage.getItem('currentQuizTitle') || '',
        desc: sessionStorage.getItem('currentQuizDescription') || '',
        level: sessionStorage.getItem('currentQuizLevel') || '',
        length: sessionStorage.getItem('currentQuizLength') || ''
      }
    });
  }

  onRateQuiz(): void {
    const resolvedQuizId = this.resolveQuizId();
    if (!resolvedQuizId || !this.canRateQuiz) {
      console.warn('Rate Quiz: blocked or quizId missing.', {
        resolvedQuizId, isOwner: this.isOwner, hasLoggedInUser: this.hasLoggedInUser,
      });
      return;
    }
    this.router.navigate(['/app/review', resolvedQuizId]);
  }

  get canRateQuiz(): boolean {
    return !!this.resolveQuizId() && (this.isOwner || this.hasLoggedInUser);
  }

  // Guest = chưa đăng nhập
  get isGuest(): boolean {
    return !this.hasLoggedInUser;
  }

  // Solo hoặc Host Multi mới có Play Again
  get canPlayAgain(): boolean {
    return this.isSolo || this.isOwner;
  }

  onReturnHome(): void {
    this.router.navigate(['/']);
  }

  onReturnDashboard(): void {
    this.router.navigate(['/app/dashboard']);
  }

  private resolveQuizId(params?: any): string | null {
    return (
      params?.['quizId'] ||
      params?.['id']     ||
      this.quizId        ||
      sessionStorage.getItem('lastQuizId')    ||
      sessionStorage.getItem('currentQuizId') ||
      this.route.snapshot.queryParamMap.get('quizId') ||
      this.route.snapshot.queryParamMap.get('id')
    );
  }
}