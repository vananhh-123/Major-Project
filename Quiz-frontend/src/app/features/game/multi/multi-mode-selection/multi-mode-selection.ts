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
        this.quizId = params['id'] || '';
        this.quizTitle = params['title'] || 'Mastering Cyber Security 2024';
        this.quizDescription = params['desc'] || 'Test your defense mechanisms against modern threats with friends.';
        this.quizLevel = params['level'] || 'Pro';
        this.quizQuestions = params['length'] ? parseInt(params['length'], 10) : 25;
    });
  }

  selectMode(mode: 'classic' | 'focus') {
    this.selectedMode = mode;
  }

  hostGame() {
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
}
