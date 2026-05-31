import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_CONFIG } from '../../../../config/api.config';

@Component({
  selector: 'app-solo-lobby',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './solo-lobby.html',
  styleUrls: ['./solo-lobby.css']
})
export class SoloLobby implements OnInit {
  quizId: string | null = null;
  quizTitle: string = 'Loading...';
  quizDesc: string = '';
  quizLevel: string = 'Mid';
  quizLength: number = 0;
  practiceMode: boolean = false;
  enableTimer: boolean = true;
  isLoadingData: boolean = true;

  constructor(
    private route: ActivatedRoute, 
    private router: Router,
    private http: HttpClient,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // Attempt to grab queries passed from routing
    this.route.queryParams.subscribe(async params => {
      // Lấy quizId từ params hoặc sessionStorage
      let newQuizId = params['id'] || params['quizId'] || sessionStorage.getItem('currentQuizId');
      
      if (newQuizId) {
        this.quizId = newQuizId;
        // Lưu vào sessionStorage để dùng lần sau
        sessionStorage.setItem('currentQuizId', newQuizId);
        this.isLoadingData = true;
        this.cd.detectChanges();
      }
      
      // If title is explicitly provided from another view (e.g. Mode Selection)
      if (params['title']) {
        this.quizTitle = params['title'];
        if (params['desc']) this.quizDesc = params['desc'];
        if (params['level']) this.quizLevel = params['level'];
        if (params['length']) this.quizLength = Number(params['length']) || 25;
        this.isLoadingData = false;
        this.cd.detectChanges();
      } else if (this.quizId) {
        // Fetch from API when routing natively without state caching
        try {
          const res: any = await firstValueFrom(
            this.http.get(`${API_CONFIG.API_BASE}/quizzes/${this.quizId}`)
          );
          if (res) {
            this.quizTitle = res.title || 'Untitled Quiz';
            this.quizDesc = res.description || 'No description provided';
            this.quizLevel = res.level || 'Mid'; 
            this.quizLength = res.questions ? res.questions.length : 0;
            this.isLoadingData = false;
            this.cd.detectChanges();
          }
        } catch (e) {
          console.error('Failed to load quiz info', e);
          this.quizTitle = 'Error Loading Quiz';
          this.quizDesc = 'Could not fetch quiz details. Please try again.';
          this.isLoadingData = false;
          this.cd.detectChanges();
        }
      }
    });
  }

  startGame() {
    this.router.navigate(['/play/solo/room'], { 
      queryParams: { 
        id: this.quizId,
        practiceMode: this.practiceMode ? 'true' : 'false',
        enableTimer: this.enableTimer ? 'true' : 'false'
      } 
    });
  }
}

