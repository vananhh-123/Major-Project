import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { API_CONFIG } from '../../config/api.config';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, HttpClientModule],
  templateUrl: './profile.html',
  styleUrl: './profile.css'
})
export class Profile implements OnInit {
  private http = inject(HttpClient);
  private cd = inject(ChangeDetectorRef);
  private router = inject(Router);

  user = {
    id: '',
    name: 'Guest Player',
    title: 'Master of Logic & Digital Lore',
    avatar: '/User.png',
    games: 0,
    points: 0,
    rank: 0,
    avgScore: 0
  };

  currentMode: 'solo' | 'multi' = 'solo';
  
  stats = {
    solo: { games: 0, points: 0, rank: 0, avgScore: 0 },
    multi: { games: 0, points: 0, rank: 0, avgScore: 0 }
  };

  historyMode: 'solo' | 'multi' = 'solo';
  rawHistory: any[] = [];
  historySessions: any[] = [];

  // BỔ SUNG ĐÚNG 3 BIẾN PHÂN TRANG
  currentPage: number = 1;
  pageSize: number = 5;
  totalPages: number = 1;

  createdQuizzes: any[] = [];

  ngOnInit() {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        this.user.name = parsed.username || parsed.name || 'Alex Rivera';
        this.user.title = parsed.bio || 'Master of Logic & Digital Lore';
        this.user.avatar = parsed.avatar || '/User.png';
        this.user.id = parsed.id || '';
      } catch(e) {}
    }

    if (this.user.id) {
      this.fetchUserStats();
      this.fetchUserHistory();
    }
    this.fetchMyQuizzes();
  }

  // BỔ SUNG HÀM LOGOUT VỚI XÁC NHẬN
  logout() {
    const confirmLogout = window.confirm("Are you sure you want to log out?");
    if (confirmLogout) {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      // Chuyển hướng về trang chủ
      this.router.navigate(['/home']);
    }
  }

  fetchUserStats() {
    this.http.get<any>(API_CONFIG.ENDPOINTS.USER_STATS(this.user.id)).subscribe({
      next: (res) => {
        this.stats = res;
        this.updateDisplayedStats();
      },
      error: (err) => console.error('Failed to load user stats', err)
    });
  }

  fetchUserHistory() {
    this.http.get<any[]>(API_CONFIG.ENDPOINTS.USER_HISTORY(this.user.id)).subscribe({
      next: (history) => {
        if (history) {
           this.rawHistory = history;
           this.updateDisplayedHistory();
        }
      },
      error: (err) => console.error('Failed to load user history', err)
    });
  }

  setMode(mode: 'solo' | 'multi') {
    this.currentMode = mode;
    this.updateDisplayedStats();
  }

  setHistoryMode(mode: 'solo' | 'multi') {
    this.historyMode = mode;
    this.currentPage = 1;
    this.updateDisplayedHistory();
  }

  // CẬP NHẬT: THÊM SLICE ĐỂ PHÂN TRANG
  updateDisplayedHistory() {
    const filtered = this.rawHistory.filter(h => {
      const mode = (h.mode || '').toString().toLowerCase();
      if (mode === 'solo') return this.historyMode === 'solo';
      if (mode === 'multi') return this.historyMode === 'multi';
      return this.historyMode === (h.is_solo ? 'solo' : 'multi');
    });

    this.totalPages = Math.ceil(filtered.length / this.pageSize) || 1;
    this.currentPage = Math.min(this.currentPage, this.totalPages);
    
    const startIndex = (this.currentPage - 1) * this.pageSize;
    this.historySessions = filtered.slice(startIndex, startIndex + this.pageSize);

    this.cd.detectChanges();
  }

  // BỔ SUNG CÁC HÀM PHÂN TRANG
  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updateDisplayedHistory();
    }
  }

  getPagesArray(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  formatPlayerCount(value: any): string {
    if (value === null || value === undefined || value === '') {
      return 'N/A';
    }

    const normalized = String(value).trim();
    if (!normalized || normalized.toLowerCase() === 'n/a') {
      return 'N/A';
    }

    return `#${normalized}`;
  }

  // BỔ SUNG PHÂN TRANG CHO MY CREATED QUIZZES
  quizCurrentPage: number = 1;
  quizzesPerPage: number = 3;

  get displayedQuizzes() {
    const startIndex = (this.quizCurrentPage - 1) * this.quizzesPerPage;
    return this.createdQuizzes.slice(startIndex, startIndex + this.quizzesPerPage);
  }

  prevQuizPage() {
    if (this.quizCurrentPage > 1) {
      this.quizCurrentPage--;
    }
  }

  nextQuizPage() {
    const maxPage = Math.ceil(this.createdQuizzes.length / this.quizzesPerPage) || 1;
    if (this.quizCurrentPage < maxPage) {
      this.quizCurrentPage++;
    }
  }

  updateDisplayedStats() {
    const currentStats = this.stats[this.currentMode];
    this.user.games = currentStats.games || 0;
    this.user.points = currentStats.points || 0;
    this.user.rank = currentStats.rank || 0;
    this.user.avgScore = currentStats.avgScore ? Math.round(currentStats.avgScore) : 0;
    this.cd.detectChanges();
  }

  fetchMyQuizzes() {
    this.http.get<any[]>(API_CONFIG.ENDPOINTS.QUIZZES).subscribe({
      next: (allQuizzes) => {
        // Nếu user.id rỗng (chưa đăng nhập chuẩn), hiện tất cả. Nếu có, hiện những cái khớp ID hoặc không có ID (quá khứ)
        const myQuizzes = allQuizzes.filter(q => (this.user.id && q.created_by === this.user.id) || (q.creator && q.creator.id === this.user.id) || (!q.creator && q.created_by && q.created_by !== null)); 
        this.createdQuizzes = myQuizzes.map(q => {
          let comments = 0;
          let rating = 0;
          if (q.reviews && q.reviews.length > 0) {
             comments = q.reviews.length;
             const sum = q.reviews.reduce((a: number, b: any) => a + b.rating, 0);
             rating = Math.round((sum / comments) * 10) / 10;
          }
          return {
            id: q.id || q.ID,
            title: q.title,
            image: q.cover_image || '/Space-Quiz.png',
            plays: q.plays || 0,
            comments: comments,
            rating: rating || 0,
            category: q.level ? q.level.toUpperCase() : 'GENERAL',
            color: '#6c2bd9'
          };
        });
        this.cd.detectChanges();
      },
      error: (err) => console.error('Failed to load quizzes', err)
    });
  }
}

