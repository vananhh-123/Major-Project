import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_CONFIG } from '../../../../config/api.config';

@Component({
  selector: 'app-game-room',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './game-room.html',
  styleUrls: ['./game-room.css']
})
export class GameRoomComponent implements OnInit, OnDestroy {
  quizId: string | null = null;
  questions: any[] = [];
  currentIndex: number = 0;
  currentQuestion: any = null;
  parsedOptions: any[] = [];
  isMultipleChoice: boolean = false;
  score: number = 0;
  streak: number = 0;
  maxTime: number = 20;
  timeLeft: number = 20;
  timerInterval: any;
  hasAnswered: boolean = false;
  selectedOptionId: string | null = null;
  selectedOptionIds: Set<string> = new Set();
  showScorePopup: boolean = false;
  lastGainedScore: number = 0;
  practiceMode: boolean = false;
  enableTimer: boolean = true;
  autoNextTimeout: any;
  nextCountDown: number = 3;
  countdownInterval: any;
  
  totalCorrect: number = 0;
  bestStreak: number = 0;
  totalTimeSpent: number = 0;

  constructor(private route: ActivatedRoute, private router: Router, private http: HttpClient, private cd: ChangeDetectorRef) {}

  async ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.quizId = params['id'];
      this.practiceMode = params['practiceMode'] === 'true';
      this.enableTimer = params['enableTimer'] !== 'false'; // Default to true unless explicitly false

      if (this.quizId) {
        this.loadQuizFromAPI();
      } else {
        this.loadMockQuestions();
      }
    });
  }

  ngOnDestroy() {
    this.clearTimer();
  }

  loadQuizFromAPI() {
    this.http.get(`${API_CONFIG.API_BASE}/quizzes/${this.quizId}`).subscribe({
      next: (res: any) => {
        console.log('Quiz Data Loaded from API:', res);
        if (res && res.questions && res.questions.length > 0) {
          this.questions = res.questions;
          this.startGame();
        } else {
          console.warn('Quiz API returned no questions!', res);
          // Ngừng sử dụng dữ liệu Mock nữa nếu đây là Quiz từ DB!
          if (this.quizId && this.quizId.includes('-')) {
               if (!res.questions || res.questions.length === 0) {
                  alert('Quiz created with NO QUESTIONS. Cannot start.');
                  this.router.navigate(['/app/quizzes']);
                  return;
               }
          }
          this.loadMockQuestions();
        }
      },
      error: (e) => {
        console.error('Quiz API Fetch Failed', e);
        this.loadMockQuestions();
      }
    });
  }

  loadMockQuestions() {
    this.questions = [{
      content: 'What is the primary function of the powerhouse of the cell, the mitochondria?',
      time_limit: 20,
      points: 1000,
      options: JSON.stringify([
        { id: 'A', text: 'Photosynthesis', is_correct: false },
        { id: 'B', text: 'Cellular Respiration', is_correct: true },
        { id: 'C', text: 'Protein Synthesis', is_correct: false },
        { id: 'D', text: 'Lipid Storage', is_correct: false }
      ])
    },{
      content: 'Which HTTP status code means Not Found?',
      time_limit: 15,
      points: 1000,
      options: JSON.stringify([
        { id: 'A', text: '200', is_correct: false },
        { id: 'B', text: '404', is_correct: true },
        { id: 'C', text: '500', is_correct: false },
        { id: 'D', text: '403', is_correct: false }
      ])
    }];

    // Fallback specifically for mock quiz ID 12 (Network Security)
    if (this.quizId === '12') {
      this.questions = [
        {
          content: 'What is a common method to mitigate DDOS attacks?',
          time_limit: 20,
          points: 1000,
          options: JSON.stringify([
            { id: 'A', text: 'Rate Limiting & Traffic Scrubbing', is_correct: true },
            { id: 'B', text: 'SQL Injection', is_correct: false },
            { id: 'C', text: 'Social Engineering', is_correct: false },
            { id: 'D', text: 'Brute Force', is_correct: false }
          ])
        },
        {
          content: 'Which port is typically used for HTTPS?',
          time_limit: 15,
          points: 1000,
          options: JSON.stringify([
            { id: 'A', text: '80', is_correct: false },
            { id: 'B', text: '443', is_correct: true },
            { id: 'C', text: '22', is_correct: false },
            { id: 'D', text: '21', is_correct: false }
          ])
        }
      ];
    } else if (this.quizId && !isNaN(Number(this.quizId))) {
       // generic mock
       this.questions[0].content = `Mock Question 1 for Quiz ${this.quizId}`;
    }

    this.startGame();
  }

  startGame() {
    this.currentIndex = 0;
    this.score = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.totalCorrect = 0;
    this.totalTimeSpent = 0;
    this.loadQuestion(0);
  }

  loadQuestion(index: number) {
    if (index >= this.questions.length) {
      this.router.navigate(['/play/result'], { queryParams: { isSolo: true, quizId: this.quizId, score: this.score, totalCorrect: this.totalCorrect, totalQuestions: this.questions.length, bestStreak: this.bestStreak, totalTime: this.totalTimeSpent } });
      return;
    }
    this.hasAnswered = false;
    this.selectedOptionId = null;
    this.selectedOptionIds = new Set<string>();
    this.currentQuestion = this.questions[index];
    this.maxTime = this.currentQuestion.time_limit || 20;
    this.timeLeft = this.maxTime;
    try {
      this.parsedOptions = typeof this.currentQuestion.options === 'string' ? JSON.parse(this.currentQuestion.options) : this.currentQuestion.options;
    } catch {
      this.parsedOptions = [];
    }
    this.isMultipleChoice = this.parsedOptions.filter(o => o.is_correct).length > 1;
    this.startTimer();
    this.cd.detectChanges();
  }

  startTimer() {
    this.clearTimer();
    if (!this.enableTimer) return;
    this.timerInterval = setInterval(() => {
      this.timeLeft -= 1;
      this.cd.detectChanges();
      if (this.timeLeft <= 0) {
        this.clearTimer();
        this.handleTimeout();
      }
    }, 1000);
  }

  clearTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.autoNextTimeout) clearTimeout(this.autoNextTimeout);
    if (this.countdownInterval) clearInterval(this.countdownInterval);
  }

  startAutoNext() {
    this.nextCountDown = 3;
    this.countdownInterval = setInterval(() => {
      this.nextCountDown--;
      this.cd.detectChanges();
      if (this.nextCountDown <= 0) {
        clearInterval(this.countdownInterval);
        this.goToNext();
      }
    }, 1000);
  }

  handleTimeout() {
    this.hasAnswered = true;
    this.totalTimeSpent += (this.maxTime - this.timeLeft);
    this.streak = 0;
    this.cd.detectChanges();
    if (!this.practiceMode) {
      this.startAutoNext();
    }
  }

  selectOption(opt: any) {
    if (this.hasAnswered) return;
    
    const optId = opt.id || opt.text || opt.answer;

    if (this.isMultipleChoice) {
      // Toggle selection
      if (this.selectedOptionIds.has(optId)) {
        this.selectedOptionIds.delete(optId);
      } else {
        this.selectedOptionIds.add(optId);
      }
      this.cd.detectChanges();
      return; 
      // Do not auto submit for multiple choice. Use submitMultipleChoice()
    }

    this.hasAnswered = true;
    this.totalTimeSpent += (this.maxTime - this.timeLeft);
    this.selectedOptionId = optId;
    this.clearTimer();
    
    if (opt.is_correct) {
      this.streak++;
      if (this.streak > this.bestStreak) this.bestStreak = this.streak;
      this.totalCorrect++;
      this.calculateScore();
    } else {
      this.streak = 0;
      this.lastGainedScore = 0;
    }

    if (!this.practiceMode) {
      this.startAutoNext();
    }
  }

  submitMultipleChoice() {
    if (this.hasAnswered || !this.isMultipleChoice) return;
    this.hasAnswered = true;
    this.totalTimeSpent += (this.maxTime - this.timeLeft);
    this.clearTimer();

    const correctOptions = this.parsedOptions.filter(o => o.is_correct);
    const correctOptionIds = correctOptions.map(o => o.id || o.text || o.answer);
    
    let isAllCorrect = true;
    if (this.selectedOptionIds.size === correctOptionIds.length) {
      for (let id of correctOptionIds) {
        if (!this.selectedOptionIds.has(id)) {
          isAllCorrect = false;
          break;
        }
      }
    } else {
      isAllCorrect = false;
    }

    if (isAllCorrect) {
      this.streak++;
      if (this.streak > this.bestStreak) this.bestStreak = this.streak;
      this.totalCorrect++;
      this.calculateScore();
    } else {
      this.streak = 0;
      this.lastGainedScore = 0;
    }

    if (!this.practiceMode) {
      this.startAutoNext();
    }
    this.cd.detectChanges();
  }

  calculateScore() {
    const sMax = this.currentQuestion.points || 1000;
    let finalPoints = 0;
    if (this.enableTimer) {
      const tUser = this.maxTime - this.timeLeft;
      const tMax = this.maxTime;
      const K = 0.5;
      const linearBase = sMax * (1 - (tUser / tMax) * K);
      let multiplier = 1.0;
      if (tUser < 2) multiplier = 1.5;
      else if (tUser >= 2 && tUser <= 5) multiplier = 1.2;
      else if (tUser > 5 && tUser <= 10) multiplier = 1.0;
      else multiplier = 0.8;
      finalPoints = Math.round((linearBase * multiplier) + (this.streak * 10));
    } else {
      finalPoints = sMax + (this.streak * 10);
    }
    
    this.lastGainedScore = finalPoints;
    this.score += finalPoints;
    
    this.showScorePopup = true;
    setTimeout(() => { this.showScorePopup = false; this.cd.detectChanges(); }, 1500);
  }

  goToNext() {
    this.currentIndex++;
    this.loadQuestion(this.currentIndex);
  }

  getLetter(index: number): string {
    return String.fromCharCode(65 + index); // 0 -> A, 1 -> B, 2 -> C, 3 -> D
  }

  getOptionBaseClass(index: number): string {
    const classes = ['answer-a', 'answer-b', 'answer-c', 'answer-d'];
    return classes[index % 4];
  }

  getOptionClass(index: number, opt: any): string {
    let baseClass = this.getOptionBaseClass(index);
    const optId = opt.id || opt.text || opt.answer;

    if (!this.hasAnswered) {
      if (this.isMultipleChoice && this.selectedOptionIds.has(optId)) {
         return baseClass + ' pending-selected';
      }
      return baseClass;
    }
    
    // Once answered, highlight correct & wrong
    let isSelected = false;
    if (this.isMultipleChoice) {
        isSelected = this.selectedOptionIds.has(optId);
    } else {
        isSelected = this.selectedOptionId === optId;
    }
    
    if (opt.is_correct) {
      return baseClass + ' correct-answer';
    } else if (isSelected && !opt.is_correct) {
      return baseClass + ' wrong-answer';
    }
    
    return baseClass + ' faded-answer';
  }
}

