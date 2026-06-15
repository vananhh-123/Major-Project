import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { QuizService } from '../../../services/quiz.service';

type QuizStatus = 'Public' | 'Private';
type Difficulty = 'Easy' | 'Mid' | 'Pro';

interface AdminQuiz {
  id: string;
  title: string;
  creator: string;
  difficulty: Difficulty;
  status: QuizStatus;
  rating: number;
  questions: number;
  createdAt: string;
  icon: string;
}

@Component({
  selector: 'app-admin-quiz-bank',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-quiz-bank.html',
  styleUrl: './admin-quiz-bank.css'
})
export class AdminQuizBank implements OnInit {
  searchText = '';
  difficultyFilter = '';
  statusFilter = '';

  quizzes: AdminQuiz[] = [];
  loading = false;

  constructor(
    private quizService: QuizService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadQuizzes();
  }

  loadQuizzes(): void {
    this.loading = true;

    this.quizService.getQuizzes().subscribe({
      next: (data: any[]) => {
        this.quizzes = data.map(q => this.mapQuiz(q));
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: err => {
        console.error('Cannot load quizzes:', err);
        this.quizzes = [];
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private mapQuiz(q: any): AdminQuiz {
    const reviews = q.reviews || q.Reviews || [];
    const questions = q.questions || q.Questions || [];
    const creator = q.creator || q.Creator || {};

    let rating = 0;

    if (reviews.length > 0) {
      const total = reviews.reduce(
        (sum: number, item: any) => sum + Number(item.rating || 0),
        0
      );
      rating = Math.round((total / reviews.length) * 10) / 10;
    }

    return {
      id: String(q.id || q.ID),
      title: q.title || 'Untitled Quiz',
      creator: creator.username || q.creator || q.creatorName || 'Unknown',
      difficulty: this.normalizeDifficulty(q.level || q.difficulty),
      status: this.normalizeStatus(q.visibility || q.status),
      rating,
      questions: questions.length || q.questionCount || 0,
      createdAt: this.formatDate(q.created_at || q.CreatedAt || q.createdAt),
      icon: this.getIcon(q.level || q.difficulty)
    };
  }

  private normalizeDifficulty(value?: string): Difficulty {
    const text = (value || '').toLowerCase();
    if (text === 'easy') return 'Easy';
    if (text === 'mid' || text === 'medium') return 'Mid';
    if (text === 'pro' || text === 'hard') return 'Pro';
    return 'Easy';
  }

  private normalizeStatus(value?: string): QuizStatus {
    return (value || '').toLowerCase() === 'private' ? 'Private' : 'Public';
  }

  private formatDate(value?: string): string {
    if (!value) return 'N/A';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric'
    });
  }

  private getIcon(value?: string): string {
    const difficulty = this.normalizeDifficulty(value);
    if (difficulty === 'Easy') return 'school';
    if (difficulty === 'Mid') return 'psychology';
    return 'workspace_premium';
  }

  get totalQuizzes(): number {
    return this.quizzes.length;
  }

  get publicQuizzes(): number {
    return this.quizzes.filter(q => q.status === 'Public').length;
  }

  get privateQuizzes(): number {
    return this.quizzes.filter(q => q.status === 'Private').length;
  }

  get totalQuestions(): number {
    return this.quizzes.reduce((sum, q) => sum + q.questions, 0);
  }

  get averageRating(): string {
    if (this.quizzes.length === 0) return '0.0';
    const total = this.quizzes.reduce((sum, q) => sum + q.rating, 0);
    return (total / this.quizzes.length).toFixed(1);
  }

  get filteredQuizzes(): AdminQuiz[] {
    const keyword = this.searchText.toLowerCase();

    return this.quizzes.filter(q => {
      const matchesSearch =
        q.title.toLowerCase().includes(keyword) ||
        q.creator.toLowerCase().includes(keyword) ||
        q.id.toLowerCase().includes(keyword);

      const matchesDifficulty =
        this.difficultyFilter === '' ||
        q.difficulty === this.difficultyFilter;

      const matchesStatus =
        this.statusFilter === '' ||
        q.status === this.statusFilter;

      return matchesSearch && matchesDifficulty && matchesStatus;
    });
  }

  setStatus(quiz: AdminQuiz, status: QuizStatus): void {
    quiz.status = status;
  }

  deleteQuiz(id: string): void {
    const confirmed = confirm('Are you sure you want to delete this quiz?');
    if (!confirmed) return;

    this.quizzes = this.quizzes.filter(q => q.id !== id);
    this.cdr.detectChanges();
  }
}