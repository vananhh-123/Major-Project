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
  currentUserAvatar: string = '/User.png';
  playerWaiting: boolean = false;
  private pendingRoomState: any = null;

  questions: Question[] = [];
  currentQuestionIdx: number = 0;
  get nonHostPlayersCount(): number {
    return this.players.filter(p => !p.isHost).length;
  }

  get currentQuestion(): Question | null {
    return this.questions[this.currentQuestionIdx] || null;
  }

  get hostLeaderboardPlayers(): (PlayerInfo & { isCurrentUser?: boolean })[] {
    return [...this.players]
      .filter(p => !p.isHost)
      .sort((a, b) => (b.score || 0) - (a.score || 0));
  }

  gamePhase: 'loading' | 'countdown' | 'question' | 'answer_reveal' | 'scoreboard' | 'ended' = 'loading';
  countdown: number = 3;
  timeLeft: number = 0;

  hasAnswered: boolean = false;
  selectedAnswers: number[] = [];
  lastAnswerResult: { isCorrect: boolean; points: number; totalScore: number; correctAnswers?: number } | null = null;
  
  playerScore: number = 0;
  correctAnswersCount: number = 0;
  submissionsCount: number = 0;
  submittedPlayerIds = new Set<string>();
  players: (PlayerInfo & { isCurrentUser?: boolean; correctAnswers?: number })[] = [];

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
  
  private apiUrl = API_CONFIG.API_BASE;

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
        this.gameMode     = params['mode']   || sessionStorage.getItem('roomGameMode') || 'classic';
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

  get allPlayersAnswered(): boolean {
    return this.nonHostPlayersCount > 0 && this.submissionsCount >= this.nonHostPlayersCount;
  }

  get submissionStatusText(): string {
    return this.allPlayersAnswered ? 'All players have answered.' : 'Players are thinking...';
  }

  private init(): void {
    this.loadCurrentUserAvatar();

    // Đọc lại danh sách Player từ Lobby truyền qua
    const storedPlayers = sessionStorage.getItem('roomPlayers');
    if (storedPlayers) {
      this.players = JSON.parse(storedPlayers).map((p: any) => ({
        ...p,
        avatar: p.avatar || `https://api.dicebear.com/7.x/personas/svg?seed=${p.name || p.userId}`,
        isCurrentUser: p.userId === this.currentUserId
      }));
    }

    this.listenToWsEvents();
    // Load quiz for both host and players so players can advance locally in Classic mode
    this.loadQuiz();

    // Ensure websocket is connected and we're joined to the room so reloads can re-enter
    if (this.gamePin && this.currentUserId) {
      try {
        this.ws.connect(this.gamePin, this.currentUserId);
        setTimeout(() => {
          this.ws.joinRoom(
            this.gamePin,
            this.currentUserId,
            // preserve name/avatar from sessionPlayers or localStorage
            (this.players.find(p => p.userId === this.currentUserId)?.name) || (localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user') || '{}').name : 'Guest'),
            (this.players.find(p => p.userId === this.currentUserId)?.avatar) || (localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user') || '{}').avatar : this.currentUserAvatar),
            this.isHost,
            this.gameMode,
            this.gamePin,
            this.quizId
          );
        }, 300);
      } catch (e) {
        console.warn('Reconnect/join attempt failed', e);
      }
    }
  }

  private loadCurrentUserAvatar(): void {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        this.currentUserAvatar = user.avatar || `https://api.dicebear.com/7.x/personas/svg?seed=${user.name || user.username || this.currentUserId || 'user'}`;
      }
    } catch {
      this.currentUserAvatar = `https://api.dicebear.com/7.x/personas/svg?seed=${this.currentUserId || 'user'}`;
    }

    // Prefer the avatar from roomPlayers if present
    const me = this.players.find(p => p.userId === this.currentUserId);
    if (me?.avatar) {
      this.currentUserAvatar = me.avatar;
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
        // Host will prepare and broadcast questions. For Classic mode, players
        // should run the quiz locally and advance independently — show the
        // first question locally so they can answer without waiting for host.
        if (this.isHost) {
          this.prepareQuestion();
        } else {
          if (this.gameMode === 'classic' && this.questions.length > 0) {
            this.currentQuestionIdx = 0;
            this.gamePhase = 'question';
            // Ensure local question object exists
            const q = this.questions[0];
            this.questions[0] = {
              id: String(0),
              content: q.content,
              time_limit: q.time_limit,
              points: q.points,
              multiple_correct: q.multiple_correct,
              options: q.options
            };
            // Start countdown locally for player
            this.startCountdown();
          }
        }

        if (this.pendingRoomState) {
          this.applyRoomState(this.pendingRoomState);
          this.pendingRoomState = null;
        }
      },
      error: (err) => console.error('Load quiz error:', err)
    });
  }

  private applyRoomState(state: any): void {
    if (!state) return;

    this.gameMode = state.gameMode || this.gameMode;
    this.quizId = state.quizId || this.quizId;

    if (Array.isArray(state.players)) {
      this.players = state.players.map((p: any) => ({
        ...p,
        avatar: p.avatar || `https://api.dicebear.com/7.x/personas/svg?seed=${p.name || p.userId}`,
        isCurrentUser: p.userId === this.currentUserId
      }));
    }

    const me = this.players.find(p => p.userId === this.currentUserId);
    if (me) {
      this.playerScore = me.score || 0;
      this.correctAnswersCount = me.correctAnswers || 0;
      if (me.avatar) {
        this.currentUserAvatar = me.avatar;
      }
    }

    const questionIndex = Number(state.questionIdx || 0);
    this.currentQuestionIdx = Number.isFinite(questionIndex) ? questionIndex : 0;

    if (state.currentQuestion) {
      const q = state.currentQuestion;
      const normalizedQuestion = {
        id: String(q.index ?? this.currentQuestionIdx),
        content: q.content,
        time_limit: q.timeLimit ?? q.time_limit ?? 20,
        points: q.points ?? 100,
        multiple_correct: q.multipleCorrect ?? q.multiple_correct ?? false,
        options: (q.answers || q.options || []).map((opt: any) => ({
          text: opt.text,
          is_correct: opt.is_correct
        }))
      };

      this.questions[this.currentQuestionIdx] = normalizedQuestion;

      if (state.questionPhase === 'question') {
        const remaining = Number(state.timeLeft || normalizedQuestion.time_limit || 20);
        this.resumeQuestionFromState(remaining, normalizedQuestion);
      } else if (state.questionPhase === 'answer_reveal') {
        this.gamePhase = 'answer_reveal';
        this.timeLeft = 0;
        this.hasAnswered = true;
        const correctAnswers = (q.answers || q.options || [])
          .map((a: any, idx: number) => a.is_correct ? idx : -1)
          .filter((idx: number) => idx !== -1);
        correctAnswers.forEach((idx: number) => {
          if (this.questions[this.currentQuestionIdx]?.options[idx]) {
            this.questions[this.currentQuestionIdx].options[idx].is_correct = true;
          }
        });
      } else if (state.status === 'playing') {
        this.gamePhase = 'question';
      }
    }

    this.playerWaiting = false;
    this.cdr.detectChanges();
  }

  private resumeQuestionFromState(remainingTime: number, q: Question): void {
    this.clearTimers();
    this.gamePhase = 'question';
    this.countdown = 0;
    this.timeLeft = Math.max(0, remainingTime);
    this.hasAnswered = false;
    this.selectedAnswers = [];
    this.lastAnswerResult = null;
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

  private listenToWsEvents(): void {
    this.subs.add(
      this.ws.on('room_state').subscribe((msg: any) => {
        if (!msg?.data) return;
        if (!this.questions || this.questions.length === 0) {
          this.pendingRoomState = msg.data;
          return;
        }
        this.applyRoomState(msg.data);
      })
    );

    this.subs.add(
      this.ws.on('question').subscribe((msg: any) => {
          const q = msg.data;
          this.playerWaiting = false;
          if (!this.isHost) {
            // In Classic mode players advance locally; ignore host question broadcasts
            // to avoid overriding the player's independent flow.
            if (this.gameMode === 'classic') {
              console.log('[INFO] Ignoring host question broadcast in classic mode for player');
              return;
            }
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
          } else {
            this.gamePhase = 'question';
            this.cdr.detectChanges();
        }
      })
    );

    this.subs.add(
      this.ws.on('player_answered').subscribe((msg: any) => {
        if (this.isHost) {
           const userId = msg?.data?.userId;
           if (userId && userId !== this.currentUserId && !this.submittedPlayerIds.has(userId)) {
             this.submittedPlayerIds.add(userId);
             this.submissionsCount = this.submittedPlayerIds.size;
           }
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
              if (this.lastAnswerResult && this.lastAnswerResult.correctAnswers !== undefined) {
                  this.correctAnswersCount = this.lastAnswerResult.correctAnswers;
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
        // Ensure avatars exist and mark current user; sort by score desc
        this.players = msg.data
          .map((p: any) => ({
            ...p,
            avatar: p.avatar || (`https://api.dicebear.com/7.x/personas/svg?seed=${p.name || p.userId}`),
            isCurrentUser: p.userId === this.currentUserId
          }))
          .sort((a: any, b: any) => (b.score || 0) - (a.score || 0));

        const me = this.players.find(p => p.userId === this.currentUserId);
        if (me?.avatar) {
          this.currentUserAvatar = me.avatar;
        }
      })
    );

    this.subs.add(
      this.ws.on('game_ended').subscribe((msg: any) => {
        this.gamePhase = 'ended';
        this.clearTimers();
        sessionStorage.setItem('finalScores', JSON.stringify(msg.data.finalScores));
        if (this.quizId) {
          sessionStorage.setItem('lastQuizId', this.quizId);
        }
        // Lưu thông tin player hiện tại để result.ts tìm đúng rank
        sessionStorage.setItem('currentUserId', this.currentUserId);
        const meNow = this.players.find(p => p.userId === this.currentUserId);
        if (meNow?.name) sessionStorage.setItem('currentUserName', meNow.name);
        setTimeout(() => {
          this.router.navigate(['/play/result'], {
            queryParams: {
              pin: this.gamePin,
              mode: this.gameMode,
              role: this.isHost ? 'host' : 'player',
              quizId: this.quizId
            }
          });
        }, 2000);
      })
    );

    // Host: when server notifies that all players are ready, advance question
    this.subs.add(
      this.ws.on('all_players_ready').subscribe((msg: any) => {
        if (this.isHost) {
          // Auto-advance the host's question
          this.nextQuestionOrEnd();
        }
      })
    );
  }

  private prepareQuestion(): void {
    if (!this.isHost) return;
    const q = this.currentQuestion;
    if (!q) return;
    console.log('[HOST] prepareQuestion idx=', this.currentQuestionIdx, 'questionsLen=', this.questions.length, 'q=', q);
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
    console.log('[HOST] startCountdown — countdown will begin');
    this.gamePhase = 'countdown';
    this.countdown = 3;
    this.selectedAnswers = [];
    this.hasAnswered = false;
    this.lastAnswerResult = null;
    this.submissionsCount = 0;
    this.submittedPlayerIds.clear();
    this.cdr.detectChanges();

    this.countdownTimer = setInterval(() => {
      this.countdown--;
      // debug log for host countdown
      if (this.isHost) console.log('[HOST] countdown', this.countdown);
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
    if (this.isHost) console.log('[HOST] showQuestion idx=', this.currentQuestionIdx, 'time_limit=', q.time_limit);

    this.gamePhase = 'question';
    this.timeLeft = q.time_limit;
    this.cdr.detectChanges();

    this.questionTimer = setInterval(() => {
      this.timeLeft--;
      if (this.isHost) console.log('[HOST] timeLeft', this.timeLeft);
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
    // Notify server we are ready for the next question (recording only)
    this.ws.playerReadyNext(this.gamePin, this.currentUserId);

    // In Classic mode, advance locally for the player immediately (don't wait for others)
    if (this.gameMode === 'classic') {
      // If we don't have the quiz loaded, fall back to waiting
      if (!this.questions || this.questions.length === 0) {
        this.playerWaiting = true;
        return;
      }

      if (this.currentQuestionIdx + 1 < this.questions.length) {
        // advance this player to next question locally
        this.currentQuestionIdx++;
        this.hasAnswered = false;
        this.selectedAnswers = [];
        this.lastAnswerResult = null;
        this.submissionsCount = 0;
        this.submittedPlayerIds.clear();
        this.playerWaiting = false;
        // start countdown for the newly advanced question
        this.startCountdown();
      } else {
        // reached end locally — submit result and navigate to Result page for this player
        this.finishLocalGame();
      }
      return;
    }

    // For non-classic modes, keep previous behavior (show waiting screen until host advances)
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

        // Calculate points strictly from remaining time so late answers score less.
        let awardedPoints = 0;
        if (isCorrectLocal) {
          const maxPoints = q.points || 100;
          const totalTime = Math.max(1, q.time_limit || 20);
          const remainingTime = Math.max(0, Math.min(this.timeLeft, totalTime));
          const remainingRatio = remainingTime / totalTime;

          if (q.multiple_correct) {
            // Partial credit only if the selected answers are correct;
            // still capped by remaining time.
            const totalCorrect = correctIndices.length || 1;
            const selectedCorrect = this.selectedAnswers.filter((a: number) => correctIndices.indexOf(a) !== -1).length;
            const portion = Math.min(selectedCorrect / totalCorrect, 1);
            awardedPoints = Math.round(maxPoints * portion * remainingRatio);
          } else {
            awardedPoints = Math.round(maxPoints * remainingRatio);
          }

          if (awardedPoints > maxPoints) awardedPoints = maxPoints;
          if (awardedPoints < 0) awardedPoints = 0;
        }

        this.ws.submitAnswer(this.gamePin, this.currentUserId, {
          questionIdx: this.currentQuestionIdx,
          answerIdx: this.selectedAnswers,
          isCorrect: isCorrectLocal,
          points: awardedPoints,
          timeUsed: Math.max(0, q.time_limit - this.timeLeft)
        });
        if (isCorrectLocal) {
          this.correctAnswersCount = (this.correctAnswersCount || 0) + 1;
        }
    }
  }

  hostRevealAnswer(): void {
    if (!this.isHost || this.gamePhase !== 'question') return;
    this.gamePhase = 'answer_reveal';
    clearInterval(this.questionTimer);
    
    const q = this.currentQuestion;
    if (!q) return;
    
    const correctIndices = q.options.map((o, idx) => o.is_correct ? idx : -1).filter(i => i !== -1);
    // Send the canonical `answer_reveal` event with `correctAnswers` key (clients listen for this)
    this.ws.send({ action: 'answer_reveal', roomId: this.gamePin, userId: this.currentUserId, data: { correctAnswers: correctIndices } });
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

  private finishLocalGame(): void {
    // Cập nhật score mới nhất của player hiện tại vào this.players
    this.players = this.players.map(p =>
      p.userId === this.currentUserId ? { ...p, score: this.playerScore || 0 } : p
    );

    // Dùng toàn bộ danh sách players (đã sync qua score_update) làm finalScores
    // để Result page có đầy đủ leaderboard và tính rank đúng cho mọi người
    const finalScores = this.players.map(p => ({
      userId: p.userId,
      name:   p.name,
      score:  p.score || 0,
      avatar: p.avatar || `https://api.dicebear.com/7.x/personas/svg?seed=${p.name || p.userId}`,
      isHost: p.isHost || false
    }));
    sessionStorage.setItem('finalScores', JSON.stringify(finalScores));
    if (this.quizId) sessionStorage.setItem('lastQuizId', this.quizId);
    // Lưu thêm userId/Name để result.ts tìm đúng player hiện tại
    sessionStorage.setItem('currentUserId', this.currentUserId);
    const me = this.players.find(p => p.userId === this.currentUserId);
    if (me?.name) sessionStorage.setItem('currentUserName', me.name);

    // Navigate to Result screen with summary params
    this.router.navigate(['/play/result'], {
      queryParams: {
        pin: this.gamePin,
        mode: this.gameMode,
        role: 'player',
        quizId: this.quizId,
        score: this.playerScore || 0,
        totalQuestions: this.questions.length || 0,
        totalCorrect: this.correctAnswersCount || 0
      }
    });
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

  trackByUserId(_: number, player: PlayerInfo & { isCurrentUser?: boolean }): string {
    return player.userId;
  }
}