import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-mode-selection',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './mode-selection.html',
  styleUrls: ['./mode-selection.css']
})
export class ModeSelection implements OnInit {
  quizTitle: string = 'Cybersecurity Fundamentals'; // Default title
  quizDesc: string = '';
  quizLevel: string = '';
  quizLength: number = 0;

  constructor(private route: ActivatedRoute, private location: Location) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.quizTitle = params['title'] || sessionStorage.getItem('currentQuizTitle') || this.quizTitle;
      this.quizDesc = params['desc'] || sessionStorage.getItem('currentQuizDescription') || this.quizDesc;
      this.quizLevel = params['level'] || sessionStorage.getItem('currentQuizLevel') || this.quizLevel;
      const lengthValue = params['length'] || sessionStorage.getItem('currentQuizLength');
      this.quizLength = lengthValue ? Number(lengthValue) : this.quizLength;

      if (params['id']) {
        sessionStorage.setItem('currentQuizId', params['id']);
      }
      sessionStorage.setItem('currentQuizTitle', this.quizTitle || '');
      sessionStorage.setItem('currentQuizDescription', this.quizDesc || '');
      sessionStorage.setItem('currentQuizLevel', this.quizLevel || '');
      sessionStorage.setItem('currentQuizLength', String(this.quizLength || 0));

    });
  }

  goBack() {
    this.location.back();
  }
}
