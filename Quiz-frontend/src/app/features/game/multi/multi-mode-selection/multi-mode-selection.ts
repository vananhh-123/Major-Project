import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-multi-mode-selection',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './multi-mode-selection.html',
  styleUrls: ['./multi-mode-selection.css']
})
export class MultiModeSelection implements OnInit {
  selectedMode: 'classic' | 'focus' = 'classic';

  quizId = '';
  quizTitle = '';
  quizDescription = '';
  quizLevel = '';
  quizQuestions = 0;

  constructor(private router: Router, private route: ActivatedRoute) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
        this.quizId = params['id'] || sessionStorage.getItem('currentQuizId') || '';
        this.quizTitle = params['title'] || sessionStorage.getItem('currentQuizTitle') || 'Select a quiz';
        this.quizDescription = params['desc'] || sessionStorage.getItem('currentQuizDescription') || 'Choose a quiz to continue.';
        this.quizLevel = params['level'] || sessionStorage.getItem('currentQuizLevel') || 'Mid';
        const lengthParam = params['length'] || sessionStorage.getItem('currentQuizLength');
        this.quizQuestions = lengthParam ? parseInt(lengthParam, 10) : 0;

        sessionStorage.setItem('currentQuizId', this.quizId);
        sessionStorage.setItem('currentQuizTitle', this.quizTitle);
        sessionStorage.setItem('currentQuizDescription', this.quizDescription);
        sessionStorage.setItem('currentQuizLevel', this.quizLevel);
        sessionStorage.setItem('currentQuizLength', String(this.quizQuestions || 0));
    });
  }

  selectMode(mode: 'classic' | 'focus') {
    this.selectedMode = mode;
  }

  hostGame() {
    sessionStorage.setItem('currentQuizId', this.quizId);
    sessionStorage.setItem('currentQuizTitle', this.quizTitle);
    sessionStorage.setItem('currentQuizDescription', this.quizDescription);
    sessionStorage.setItem('currentQuizLevel', this.quizLevel);
    sessionStorage.setItem('currentQuizLength', String(this.quizQuestions || 0));

    this.router.navigate(['/play/multi/lobby'], {
      queryParams: { 
        id: this.quizId,
        title: this.quizTitle,
        desc: this.quizDescription,
        level: this.quizLevel,
        length: this.quizQuestions,
        mode: this.selectedMode,
        role: 'host'
      }
    });
  }

  getLevelDots(): boolean[] {
    const levelMap: { [key: string]: number } = {
      'easy': 1,
      'mid': 2,
      'pro': 3
    };
    const level = this.quizLevel?.toLowerCase() || 'mid';
    const activeDots = levelMap[level] || 2;
    // Luôn có 3 chấm, số đầu tiên là active, còn lại inactive
    return [true, true, true].map((_, i) => i < activeDots);
  }
}
