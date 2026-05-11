import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

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

  constructor(
    private route: ActivatedRoute, 
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit() {
    // Attempt to grab queries passed from routing
    this.route.queryParams.subscribe(async params => {
      if (params['id']) {
        this.quizId = params['id'];
      }
      
      // If title is explicitly provided from another view (e.g. Mode Selection)
      if (params['title']) {
        this.quizTitle = params['title'];
        if (params['desc']) this.quizDesc = params['desc'];
        if (params['level']) this.quizLevel = params['level'];
        if (params['length']) this.quizLength = Number(params['length']) || 25;
      } else if (this.quizId) {
        // Fetch from API when routing natively without state caching
        try {
          const res: any = await firstValueFrom(
            this.http.get(`http://10.106.34.149:8080/api/quizzes/${this.quizId}`)
          );
          if (res) {
            this.quizTitle = res.title || 'Untitled Quiz';
            this.quizDesc = res.description || 'No description provided';
            this.quizLevel = res.level || 'Mid'; 
            this.quizLength = res.questions ? res.questions.length : 0;
          }
        } catch (e) {
          console.error('Failed to load quiz info', e);
          this.quizTitle = 'Error Loading Quiz';
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
