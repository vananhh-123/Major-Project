import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

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
export class AdminQuizBank {
  searchText = '';
  difficultyFilter = '';
  statusFilter = '';

  quizzes: AdminQuiz[] = [
    {
      id: 'QZ001',
      title: 'English Basic Quiz',
      creator: 'Nguyen Van A',
      difficulty: 'Easy',
      status: 'Public',
      rating: 4.8,
      questions: 15,
      createdAt: 'Jun 10, 2026',
      icon: 'translate'
    },
    {
      id: 'QZ002',
      title: 'Math Challenge',
      creator: 'Tran Thi B',
      difficulty: 'Mid',
      status: 'Private',
      rating: 4.4,
      questions: 20,
      createdAt: 'Jun 09, 2026',
      icon: 'calculate'
    },
    {
      id: 'QZ003',
      title: 'Programming Quiz',
      creator: 'Le Minh C',
      difficulty: 'Pro',
      status: 'Public',
      rating: 4.9,
      questions: 25,
      createdAt: 'Jun 08, 2026',
      icon: 'code'
    },
    {
      id: 'QZ004',
      title: 'History Quick Test',
      creator: 'Pham Hoang D',
      difficulty: 'Easy',
      status: 'Private',
      rating: 4.1,
      questions: 12,
      createdAt: 'Jun 07, 2026',
      icon: 'history_edu'
    }
  ];

  get totalQuizzes(): number {
    return this.quizzes.length;
  }

  get publicQuizzes(): number {
    return this.quizzes.filter(quiz => quiz.status === 'Public').length;
  }

  get privateQuizzes(): number {
    return this.quizzes.filter(quiz => quiz.status === 'Private').length;
  }

  get totalQuestions(): number {
    return this.quizzes.reduce((sum, quiz) => sum + quiz.questions, 0);
  }

  get averageRating(): string {
    if (this.quizzes.length === 0) {
      return '0.0';
    }

    const total = this.quizzes.reduce((sum, quiz) => sum + quiz.rating, 0);
    return (total / this.quizzes.length).toFixed(1);
  }

  get filteredQuizzes(): AdminQuiz[] {
    return this.quizzes.filter(quiz => {
      const keyword = this.searchText.toLowerCase();

      const matchesSearch =
        quiz.title.toLowerCase().includes(keyword) ||
        quiz.creator.toLowerCase().includes(keyword) ||
        quiz.id.toLowerCase().includes(keyword);

      const matchesDifficulty =
        this.difficultyFilter === '' ||
        quiz.difficulty === this.difficultyFilter;

      const matchesStatus =
        this.statusFilter === '' ||
        quiz.status === this.statusFilter;

      return matchesSearch && matchesDifficulty && matchesStatus;
    });
  }

  setStatus(quiz: AdminQuiz, status: QuizStatus): void {
    quiz.status = status;
  }

  deleteQuiz(id: string): void {
    const confirmed = confirm('Are you sure you want to delete this quiz?');

    if (!confirmed) {
      return;
    }

    this.quizzes = this.quizzes.filter(quiz => quiz.id !== id);
  }
}