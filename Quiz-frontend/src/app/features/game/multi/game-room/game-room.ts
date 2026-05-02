import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { WebsocketService, PlayerInfo } from '../../../../core/services/websocket.service';

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────

interface Answer {
  text: string;
  is_correct: boolean;
}

interface Question {
  id: string;
  content: string;
  time_limit: number;
  points: number;
  multiple_correct: boolean;
  options: Answer[];
}

// ─────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────

@Component({
  selector: 'app-game-room',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './game-room.html',
  styleUrls: ['./game-room.css']
})
export class GameRoom implements OnInit, OnDestroy {

  // ── Params ──
  isHost: boolean = false;
  gameMode: string = 'classic';
  gamePin: string = '';
  quizId: string = '';
  currentUserId: string = '';

  // ── Quiz data ──
  questions: Question[] = [];
  currentQuestionIdx: number = 0;
  get currentQuestion(): Question | null {
    return this.questions[this.currentQuestionIdx] || null;
  }

  // ── Game state ──
  gamePhase: 'loading' | 'countdown' | 'question' | 'answer_reveal' | 'scoreboard' | 'ended'
    = 'loading';
  countdown: number = 3;           // countdown 3-2-1 trước câu hỏi
  timeLeft: number = 0;            // thời gian trả lời
  selectedAnswers: number[] = [];  // index đáp án player chọn
  hasAnswered: boolean = false;
  lastAnswerResult: { isCorrect: boolean; points: number; totalScore: number } | null = null;

  // ── Scoreboard ──
  players: (PlayerInfo & { isCurrentUser?: boolean })[] = [];

  // ── Timers ──
  private countdownTimer: any;
  private questionTimer: any;

  // ── Subscriptions ──
  private subs = new Subscription();

  // Color cho 4 ô đáp án (Kahoot-style)
  answerColors = ['#E21B3C', '#1368CE', '#26890C', '#FFA602'];
  answerIcons  = ['triangle', 'diamond', 'circle', 'square'];

  private apiUrl = `http://${window.location.hostname}:8080/api`;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private ws: WebsocketService,
    private http: HttpClient
  ) {}

  // ─────────────────────────────────────────
  // LIFECYCLE
  // ─────────────────────────────────────────

  ngOnInit(): void {
    this.subs.add(
      this.route.queryParams.subscribe(params => {
        this.isHost       = params['role'] === 'host';
        this.gameMode     = params['mode']   || 'classic';
        this.gamePin      = params['pin']    || '';
        this.quizId       = params['quizId'] || '';
        this.currentUserId = params['userId'] || '';

        this.init();
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.clearTimers();
    // Không disconnect WS ở đây vì host cần gửi end_game
  }

  // ─────────────────────────────────────────
  // INIT
  // ─────────────────────────────────────────

  private init(): void {
    this.listenToWsEvents();

    if (this.isHost) {
      // Host: load quiz từ API rồi bắt đầu phát câu hỏi
      this.loadQuiz();
    }
    // Players chỉ lắng nghe WebSocket, không cần load quiz
  }

  private loadQuiz(): void {
    if (!this.quizId) return;
    this.http.get<any>(`${this.apiUrl}/quizzes/${this.quizId}`).subscribe({
      next: (quiz) => {
        this.questions = quiz.questions?.map((q: any) => ({
          ...q,
          options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options
        })) || [];
        console.log(`📚 Loaded ${this.questions.length} questions`);

        // Host bắt đầu countdown câu đầu tiên
        this.startCountdown();
      },
      error: (err) => console.error('Load quiz error:', err)
    });
  }

  // ─────────────────────────────────────────
  // WEBSOCKET EVENTS
  // ─────────────────────────────────────────

  private listenToWsEvents(): void {

    // Nhận câu hỏi (player nhận từ server)
    this.subs.add(
      this.ws.on('question').subscribe((msg: any) => {
        const q = msg.data as { index: number; content: string; answers: Answer[]; timeLimit: number; points: number; multipleCorrect: boolean };
        if (!this.isHost) {
          // Reconstruct question object cho player
          this.questions = []; // clear
          this.currentQuestionIdx = q.index;
          // Push câu hỏi vào array (player chỉ cần câu hiện tại)
          this.questions[q.index] = {
            id: String(q.index),
            content: q.content,
            time_limit: q.timeLimit,
            points: q.points,
            multiple_correct: q.multipleCorrect,
            options: q.answers
          };
          this.startCountdown();
        }
      })
    );

    // Kết quả câu trả lời của chính mình
    this.subs.add(
      this.ws.on('answer_result').subscribe((msg: any) => {
        this.lastAnswerResult = msg.data;
        this.gamePhase = 'answer_reveal';
      })
    );

    // Cập nhật điểm số tất cả players
    this.subs.add(
      this.ws.on('score_update').subscribe((msg: any) => {
        this.players = (msg.data as PlayerInfo[])
          .map(p => ({ ...p, isCurrentUser: p.userId === this.currentUserId }))
          .sort((a, b) => b.score - a.score); // Sort theo điểm giảm dần
      })
    );

    // Game kết thúc → đi đến trang result
    this.subs.add(
      this.ws.on('game_ended').subscribe((msg: any) => {
        this.gamePhase = 'ended';
        this.clearTimers();
        // Lưu final scores vào sessionStorage để trang result đọc
        sessionStorage.setItem('finalScores', JSON.stringify(msg.data.finalScores));
        setTimeout(() => {
          this.router.navigate(['/play/result'], {
            queryParams: { pin: this.gamePin, mode: this.gameMode }
          });
        }, 2000);
      })
    );
  }

  // ─────────────────────────────────────────
  // GAME FLOW (HOST)
  // ─────────────────────────────────────────

  private startCountdown(): void {
    this.gamePhase = 'countdown';
    this.countdown = 3;
    this.selectedAnswers = [];
    this.hasAnswered = false;
    this.lastAnswerResult = null;

    this.countdownTimer = setInterval(() => {
      this.countdown--;
      if (this.countdown <= 0) {
        clearInterval(this.countdownTimer);
        this.showQuestion();
      }
    }, 1000);
  }

  private showQuestion(): void {
    const q = this.currentQuestion;
    if (!q) return;

    this.gamePhase = 'question';
    this.timeLeft = q.time_limit;

    // Host: broadcast câu hỏi tới tất cả players
    if (this.isHost) {
      this.ws.sendQuestion(this.gamePin, this.currentUserId, {
        index:          this.currentQuestionIdx,
        content:        q.content,
        answers:        q.options.map(o => ({ text: o.text })), // KHÔNG gửi is_correct
        timeLimit:      q.time_limit,
        points:         q.points,
        multipleCorrect: q.multiple_correct
      });
    }

    // Đếm ngược thời gian
    this.questionTimer = setInterval(() => {
      this.timeLeft--;
      if (this.timeLeft <= 0) {
        clearInterval(this.questionTimer);
        if (this.isHost) {
          // Hết giờ → chuyển sang scoreboard
          this.showScoreboard();
        }
      }
    }, 1000);
  }

  /** Host chuyển sang màn hình scoreboard sau mỗi câu */
  private showScoreboard(): void {
    this.gamePhase = 'scoreboard';
  }

  /** Host bấm "Next Question" */
  nextQuestion(): void {
    if (!this.isHost) return;

    if (this.currentQuestionIdx < this.questions.length - 1) {
      this.currentQuestionIdx++;
      this.startCountdown();
    } else {
      // Hết câu hỏi → kết thúc game
      this.ws.endGame(this.gamePin, this.currentUserId);
    }
  }

  // ─────────────────────────────────────────
  // PLAYER: CHỌN ĐÁP ÁN
  // ─────────────────────────────────────────

  selectAnswer(idx: number): void {
    if (this.hasAnswered || this.gamePhase !== 'question') return;

    const q = this.currentQuestion;
    if (!q) return;

    if (q.multiple_correct) {
      // Multiple choice: toggle
      const pos = this.selectedAnswers.indexOf(idx);
      if (pos === -1) this.selectedAnswers.push(idx);
      else this.selectedAnswers.splice(pos, 1);
    } else {
      // Single choice: chọn 1 và nộp ngay
      this.selectedAnswers = [idx];
      this.submitAnswer();
    }
  }

  submitAnswer(): void {
    if (this.hasAnswered) return;
    const q = this.currentQuestion;
    if (!q || this.selectedAnswers.length === 0) return;

    this.hasAnswered = true;
    clearInterval(this.questionTimer);

    // Kiểm tra đúng/sai ở client (server cũng kiểm tra lại)
    const isCorrect = this.selectedAnswers.every(i => q.options[i]?.is_correct) &&
                      q.options.filter(o => o.is_correct).length === this.selectedAnswers.length;

    // Tính điểm dựa trên thời gian còn lại
    const timeBonus = Math.floor((this.timeLeft / q.time_limit) * q.points);
    const points = isCorrect ? timeBonus : 0;

    this.ws.submitAnswer(this.gamePin, this.currentUserId, {
      questionIdx: this.currentQuestionIdx,
      answerIdx:   this.selectedAnswers,
      isCorrect,
      points,
      timeUsed:    q.time_limit - this.timeLeft
    });
  }

  // ─────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────

  isSelected(idx: number): boolean {
    return this.selectedAnswers.includes(idx);
  }

  get timePercent(): number {
    if (!this.currentQuestion) return 100;
    return (this.timeLeft / this.currentQuestion.time_limit) * 100;
  }

  get myScore(): number {
    const me = this.players.find(p => p.isCurrentUser);
    return me?.score || 0;
  }

  get myRank(): number {
    return this.players.findIndex(p => p.isCurrentUser) + 1;
  }

  private clearTimers(): void {
    clearInterval(this.countdownTimer);
    clearInterval(this.questionTimer);
  }
}
