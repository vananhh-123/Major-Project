import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { WebsocketService, PlayerInfo } from '../../../../core/services/websocket.service';
import { API_CONFIG } from '../../../../config/api.config';

interface Answer {
  text: string;
  is_correct?: boolean;
}

interface Question {
  id: string;
  content: string;
  time_limit: number;
  points: number;
  multiple_correct: boolean;
  options: Answer[];
}

@Component({
  selector: 'app-game-room',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './game-room.html',
  styleUrls: ['./game-room.css']
})
export class GameRoom implements OnInit, OnDestroy {
  isHost: boolean = false;
  gameMode: string = 'classic';
  gamePin: string = '';
  quizId: string = '';
  currentUserId: string = '';
  playerWaiting: boolean = false;

  questions: Question[] = [];
  currentQuestionIdx: number = 0;
  get nonHostPlayersCount(): number {
    return this.players.filter(p => !p.isHost).length;
  }

  get currentQuestion(): Question | null {
    return this.questions[this.currentQuestionIdx] || null;
  }

  gamePhase: 'loading' | 'countdown' | 'question' | 'answer_reveal' | 'scoreboard' | 'ended' = 'loading';
  countdown: number = 3;
  timeLeft: number = 0;

  hasAnswered: boolean = false;
  selectedAnswers: number[] = [];
  lastAnswerResult: { isCorrect: boolean; points: number; totalScore: number } | null = null;
  
  playerScore: number = 0;
  submissionsCount: number = 0;
  players: (PlayerInfo & { isCurrentUser?: boolean })[] = [];

  private countdownTimer: any;
  private questionTimer: any;
  private subs = new Subscription();

  answerColors = ['#E21B3C', '#1368CE', '#26890C', '#FFA602'];
  answerIcons  = ['triangle', 'diamond', 'circle', 'square'];

  get timerOffset(): number {
    if (!this.currentQuestion || this.currentQuestion.time_limit <= 0) return 283;
    const max = this.currentQuestion.time_limit;
    const ratio = this.timeLeft / max;
    return 283 - (283 * ratio);
  }
  
  private apiUrl = `http://${'localhost'}:8080/api`;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private ws: WebsocketService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

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
  }

  private clearTimers(): void {
    clearInterval(this.countdownTimer);
    clearInterval(this.questionTimer);
  }

  private init(): void {
    // Đọc lại danh sách Player từ Lobby truyền qua
    const storedPlayers = sessionStorage.getItem('roomPlayers');
    if (storedPlayers) {
        this.players = JSON.parse(storedPlayers);
    }

    this.listenToWsEvents();
    if (this.isHost) {
      this.loadQuiz();
    }
  }

  private loadQuiz(): void {
    if (!this.quizId) return;
    this.http.get<any>(`${this.apiUrl}/quizzes/${this.quizId}`).subscribe({
      next: (quiz) => {
        this.questions = quiz.questions?.map((q: any) => ({
          ...q,
          options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options
        })) || [];
        this.prepareQuestion();
      },
      error: (err) => console.error('Load quiz error:', err)
    });
  }

  private listenToWsEvents(): void {
    this.subs.add(
      this.ws.on('question').subscribe((msg: any) => {
          const q = msg.data;
          this.playerWaiting = false;
          if (!this.isHost) {
          this.questions = [];
          this.currentQuestionIdx = q.index;
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

    this.subs.add(
      this.ws.on('player_answered').subscribe((msg: any) => {
        if (this.isHost) {
           this.submissionsCount++;
           this.cdr.detectChanges();
        }
      })
    );

    this.subs.add(
      this.ws.on('answer_result').subscribe((msg: any) => {
          if (!this.isHost) {
              this.lastAnswerResult = msg.data;
              if (this.lastAnswerResult && this.lastAnswerResult.totalScore !== undefined) {
                  this.playerScore = this.lastAnswerResult.totalScore;
              }
              const correctAnswers = msg.data.correctAnswers || [];
              const q = this.currentQuestion;
              if (q && q.options) {
                  correctAnswers.forEach((idx: number) => {
                      if (q.options[idx]) q.options[idx].is_correct = true;
                  });
              }
              this.gamePhase = 'answer_reveal';
              this.cdr.detectChanges();
          }
      })
    );

    this.subs.add(
      this.ws.on('answer_reveal').subscribe((msg: any) => {
          const correctAnswers = msg.data.correctAnswers || [];
          const q = this.currentQuestion;
          if (q && q.options) {
              correctAnswers.forEach((idx: number) => {
                  if (q.options[idx]) q.options[idx].is_correct = true;
              });
          }
          this.gamePhase = 'answer_reveal';
          this.cdr.detectChanges();
      })
    );

    this.subs.add(
      this.ws.on('score_update').subscribe((msg: any) => {
        this.players = msg.data
          .map((p: any) => ({ ...p, isCurrentUser: p.userId === this.currentUserId }))
          .sort((a: any, b: any) => b.score - a.score);
      })
    );

    this.subs.add(
      this.ws.on('game_ended').subscribe((msg: any) => {
        this.gamePhase = 'ended';
        this.clearTimers();
        sessionStorage.setItem('finalScores', JSON.stringify(msg.data.finalScores));
        setTimeout(() => {
          this.router.navigate(['/play/result'], {
            queryParams: { pin: this.gamePin, mode: this.gameMode, role: this.isHost ? 'host' : 'player' }
          });
        }, 2000);
      })
    );
  }

  private prepareQuestion(): void {
    if (!this.isHost) return;
    const q = this.currentQuestion;
    if (!q) return;

    this.ws.sendQuestion(this.gamePin, this.currentUserId, {
      index:          this.currentQuestionIdx,
      content:        q.content,
      answers:        q.options.map((o: any) => ({ text: o.text, is_correct: o.is_correct })),
      timeLimit:      q.time_limit,
      points:         q.points,
      multipleCorrect: q.multiple_correct
    });
    this.startCountdown();
  }

  private startCountdown(): void {
    this.clearTimers(); // Dọn dẹp Interval bị kẹt
    this.gamePhase = 'countdown';
    this.countdown = 3;
    this.selectedAnswers = [];
    this.hasAnswered = false;
    this.lastAnswerResult = null;
    this.submissionsCount = 0;
    this.cdr.detectChanges();

    this.countdownTimer = setInterval(() => {
      this.countdown--;
      this.cdr.detectChanges();
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
    this.cdr.detectChanges();

    this.questionTimer = setInterval(() => {
      this.timeLeft--;
      this.cdr.detectChanges();
      if (this.timeLeft <= 0) {
        clearInterval(this.questionTimer);
        if (!this.isHost && !this.hasAnswered) {
          this.gamePhase = 'answer_reveal';
          this.submitAnswer();
        }
        if (this.isHost) {
            this.hostRevealAnswer();
        }
      }
    }, 1000);
  }

  selectAnswer(idx: number): void {
    if (this.hasAnswered || this.gamePhase !== 'question') return;
    const q = this.currentQuestion;
    if (!q) return;
    
    if (q.multiple_correct) {
      const pos = this.selectedAnswers.indexOf(idx);
      if (pos === -1) this.selectedAnswers.push(idx);
      else this.selectedAnswers.splice(pos, 1);
    } else {
      this.selectedAnswers = [idx];
      this.submitAnswer();
    }
  }

  playerWaitNext(): void {
    this.playerWaiting = true;
  }

  submitAnswer(): void {
    if (this.hasAnswered) return;
    const q = this.currentQuestion; // The one containing is_correct from prepareQuestion
    if (!q) return;

    this.hasAnswered = true;
    
    if (!this.isHost) {
        let isCorrectLocal = false;
        const correctIndices = q.options
          .map((a: any, idx: number) => a.is_correct ? idx : -1)
          .filter((idx: number) => idx !== -1);
        
        if (q.multiple_correct) {
          if (correctIndices.length === this.selectedAnswers.length && 
              this.selectedAnswers.every((ans: any) => correctIndices.indexOf(ans) !== -1)) {
            isCorrectLocal = true;
          }
        } else {
          if (correctIndices.indexOf(this.selectedAnswers[0]) !== -1) {
            isCorrectLocal = true;
          }
        }

        let timeBonus = 0;
        if (isCorrectLocal && this.timeLeft > 0) {
            timeBonus = q.points; 
        }
        this.ws.submitAnswer(this.gamePin, this.currentUserId, { 
            questionIdx: this.currentQuestionIdx,
            answerIdx: this.selectedAnswers, 
            isCorrect: isCorrectLocal,
            points: timeBonus,
            timeUsed: q.time_limit - this.timeLeft
        });
    }
  }

  hostRevealAnswer(): void {
    if (!this.isHost || this.gamePhase !== 'question') return;
    this.gamePhase = 'answer_reveal';
    clearInterval(this.questionTimer);
    
    const q = this.currentQuestion;
    if (!q) return;
    
    const correctIndices = q.options.map((o, idx) => o.is_correct ? idx : -1).filter(i => i !== -1);
    this.ws.send({ action: "reveal_answer", roomId: this.gamePin, userId: this.currentUserId, data: { correctIndices } });
  }

  nextQuestionOrEnd(): void {
    if (!this.isHost) return;
    if (this.currentQuestionIdx + 1 < this.questions.length) {
      this.currentQuestionIdx++;
      this.prepareQuestion();
    } else {
      this.endGameNow();
    }
  }

  endGameNow(): void {
    if (this.isHost) {
      this.ws.endGame(this.gamePin, this.currentUserId);
    }
  }

  getLetter(idx: number): string {
    return ['A', 'B', 'C', 'D'][idx] || '';
  }

  hostCardClass(idx: number): any {
    if (this.gamePhase === 'answer_reveal') {
      const isCorrect = this.currentQuestion?.options[idx]?.is_correct;
      return isCorrect ? 'ans-correct' : 'ans-wrong-host';
    }
    return '';
  }

  playerCardClass(idx: number): any {
    const isSelected = this.selectedAnswers.indexOf(idx) !== -1;

    if (this.gameMode === 'focus') {
      const base = 'focus-card';
      if (this.gamePhase === 'answer_reveal' && isSelected) {
          const isCorrect = this.currentQuestion?.options[idx]?.is_correct;
          return [base, isCorrect ? 'focus-answered-correct' : 'focus-answered-wrong'];
      }
      return base;
    } else {
      if (this.gamePhase === 'question') {
        if (!this.hasAnswered) {
          return { 'clickable': true, 'ans-selected': isSelected };
        } else {
          return { 'ans-dimmed': !isSelected, 'ans-selected': isSelected };
        }
      } else if (this.gamePhase === 'answer_reveal') {
        const isCorrect = this.currentQuestion?.options[idx]?.is_correct;
        if (isCorrect) {
            return isSelected ? 'ans-correct' : 'ans-dimmed-correct';
        } else {
            return isSelected ? 'ans-wrong-player' : 'ans-dimmed';
        }
      }
      return '';
    }
  }
}

