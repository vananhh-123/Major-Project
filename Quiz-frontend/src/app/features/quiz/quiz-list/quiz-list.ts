import { Component, OnInit, OnDestroy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { QuizService } from '../../../services/quiz.service';

interface Quiz {
  id: any;
  title: string;
  author: string;
  authorAvatar: string;
  creatorId: string;
  visibility: string;
  items: number;
  plays: string;
  comments: string;
  rating: string;
  level: string;
  image: string;
  description: string;
}

@Component({
  selector: 'app-quiz-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './quiz-list.html',
  styleUrls: ['./quiz-list.css']
})
export class QuizList implements OnInit, OnDestroy {
  searchTerm: string = '';
  viewMode: 'all' | 'my' = 'all';
  currentUserId: string = '';
  
  selectedLevels: { [key: string]: boolean } = {
    Easy: false,
    Mid: false,
    Pro: false
  };

  quizzes: Quiz[] = [];
  sortBy: string = 'recent';

  // Phân trang
  currentPage: number = 1;
  pageSize: number = 9;

  constructor(private router: Router, private quizService: QuizService) {}

  private cd = inject(ChangeDetectorRef);

  ngOnInit() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const parsed = JSON.parse(userStr);
        this.currentUserId = parsed.id || parsed.ID || '';
      } catch (e) {}
    }

    const savedState = sessionStorage.getItem('quizFilterState');
    if (savedState) {
      const state = JSON.parse(savedState);
      this.searchTerm = state.searchTerm || '';
      this.selectedLevels = state.selectedLevels || { Easy: false, Mid: false, Pro: false };
      this.viewMode = state.viewMode || 'all';
    }
    this.fetchQuizzes();
  }

  fetchQuizzes() {
    this.quizService.getQuizzes().subscribe({
      next: (res: any[]) => {
        // Map data từ Backend sang dạng hiển thị trên giao diện
        const apiQuizzes = res.map(q => {
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
            description: q.description || 'Test your knowledge on this topic.',
            author: q.creator ? q.creator.username : 'Unknown Author',
            authorAvatar: q.creator && q.creator.avatar ? q.creator.avatar : 'User.png',
            creatorId: q.created_by || (q.creator ? (q.creator.id || q.creator.ID) : null),
            visibility: q.visibility || 'public',
            items: q.questions ? q.questions.length : 0,
            plays: String(q.plays || 0),
            comments: String(comments),
            rating: String(rating),
            // additional fields for sorting
            createdAt: q.created_at || q.createdAt || '',
            playsNum: Number(q.plays || 0),
            ratingNum: Number(rating),
            level: q.level || 'Mid',
            image: q.cover_image && q.cover_image.startsWith('data:image') ? q.cover_image : '/Tech.png' // Fallback náº¿u ko cÃ³
          };
        });

        this.quizzes = apiQuizzes;
        // Apply initial sort
        this.applySort();
        this.cd.detectChanges();
      },
      error: (err: any) => {
        console.error('Failed to load quizzes', err);
      }
    });
  }

  ngOnDestroy() {
    // Chỉ giữ lại filter state nếu chuẩn bị đi vào các trang con của Quiz (chơi game hoặc xem chi tiết)
    // Nếu người dùng điều hướng sang trang khác hoàn toàn như Dashboard, Profile... thì xóa filter.
    if (!this.router.url.includes('/play/') && !this.router.url.includes('/quiz-detail')) {
      sessionStorage.removeItem('quizFilterState');
    }
  }

  saveState() {
    sessionStorage.setItem('quizFilterState', JSON.stringify({
      searchTerm: this.searchTerm,
      selectedLevels: this.selectedLevels,
      viewMode: this.viewMode
    }));
  }

  setViewMode(mode: 'all' | 'my') {
    if (!this.currentUserId && mode === 'my') {
      alert('You need to log in to view your quizzes.');
      return;
    }
    this.viewMode = mode;
    this.saveState();
    this.currentPage = 1;
  }

  get filteredQuizzes(): Quiz[] {
    return this.quizzes.filter(quiz => {
      // Filter by View Mode
      if (this.viewMode === 'my') {
         if (quiz.creatorId !== this.currentUserId) return false;
      } else {
         if (quiz.visibility !== 'public') return false;
         if (this.currentUserId && quiz.creatorId === this.currentUserId) return false;
      }

      // Filter by Search Term
      const matchesSearch = quiz.title.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      // Filter by Selected Levels
      const activeLevels = Object.keys(this.selectedLevels).filter(key => this.selectedLevels[key]);
      const matchesLevel = activeLevels.length === 0 || activeLevels.includes(quiz.level);

      return matchesSearch && matchesLevel;
    });
  }

  get totalPages(): number {
    return Math.ceil(this.filteredQuizzes.length / this.pageSize);
  }

  get paginatedQuizzes(): Quiz[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    return this.filteredQuizzes.slice(startIndex, startIndex + this.pageSize);
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  getPagesArray(): number[] {
    return Array(this.totalPages).fill(0).map((x, i) => i + 1);
  }

  clearAll() {
    this.searchTerm = '';
    this.selectedLevels = {
      Easy: false,
      Mid: false,
      Pro: false
    };
    this.saveState();
  }

  // Apply sort based on the selected option
  applySort() {
    if (!this.quizzes || this.quizzes.length === 0) return;
    switch (this.sortBy) {
      case 'recent':
        this.quizzes.sort((a: any, b: any) => {
          const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return tb - ta;
        });
        break;
      case 'played':
        this.quizzes.sort((a: any, b: any) => (b.playsNum || 0) - (a.playsNum || 0));
        break;
      case 'popular':
        this.quizzes.sort((a: any, b: any) => (b.ratingNum || 0) - (a.ratingNum || 0));
        break;
      case 'trending':
        // Simple trending heuristic: prioritize recent plays
        this.quizzes.sort((a: any, b: any) => {
          const scoreA = (a.playsNum || 0) * 0.7 + (a.ratingNum || 0) * 10;
          const scoreB = (b.playsNum || 0) * 0.7 + (b.ratingNum || 0) * 10;
          return scoreB - scoreA;
        });
        break;
      case 'alphabetical':
        this.quizzes.sort((a: any, b: any) => (a.title || '').localeCompare(b.title || ''));
        break;
    }
    this.currentPage = 1;
    this.cd.detectChanges();
  }

  // Notify user for unimplemented features
  notifyNotImplemented() {
    alert('Tính năng này hiện tại chưa được phát triển. Vui lòng chờ cập nhật trong tương lai!');
  }
}
