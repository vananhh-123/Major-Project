import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

type FeedbackType = 'Review' | 'Comment';
type FeedbackStatus = 'Visible' | 'Hidden';

interface FeedbackItem {
  id: string;
  type: FeedbackType;
  user: string;
  email: string;
  avatarSeed: string;
  quizTitle: string;
  quizId: string;
  content: string;
  rating?: number;
  likes: number;
  replies: number;
  status: FeedbackStatus;
  createdAt: string;
}

@Component({
  selector: 'app-admin-reviews',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-reviews.html',
  styleUrl: './admin-reviews.css'
})
export class AdminReviews {
  searchText = '';
  activeTab: 'all' | 'reviews' | 'comments' | 'popular' = 'all';
  statusFilter = '';
  quizFilter = '';
  ratingFilter = '';

  feedbacks: FeedbackItem[] = [
    {
      id: 'RV001',
      type: 'Review',
      user: 'Sara M.',
      email: 'sara@example.com',
      avatarSeed: 'Sara',
      quizTitle: 'English Basic Quiz',
      quizId: 'QZ001',
      content: 'This quiz is very clear and useful. The questions are well organized and suitable for beginners.',
      rating: 5,
      likes: 42,
      replies: 3,
      status: 'Visible',
      createdAt: 'Jun 10, 2026'
    },
    {
      id: 'CM001',
      type: 'Comment',
      user: '@devGuru',
      email: 'devguru@example.com',
      avatarSeed: 'DevGuru',
      quizTitle: 'Programming Quiz',
      quizId: 'QZ003',
      content: 'The Python section was perfect for interview prep. It covered fundamentals clearly.',
      likes: 89,
      replies: 12,
      status: 'Visible',
      createdAt: 'Jun 10, 2026'
    },
    {
      id: 'RV002',
      type: 'Review',
      user: 'Tran Thi B',
      email: 'tranthib@example.com',
      avatarSeed: 'TranThiB',
      quizTitle: 'Math Challenge',
      quizId: 'QZ002',
      content: 'Good quiz, but some questions are quite difficult. It would be better with explanations after each answer.',
      rating: 4,
      likes: 27,
      replies: 5,
      status: 'Visible',
      createdAt: 'Jun 09, 2026'
    },
    {
      id: 'CM002',
      type: 'Comment',
      user: '@historyBuff',
      email: 'history@example.com',
      avatarSeed: 'History',
      quizTitle: 'History Quick Test',
      quizId: 'QZ004',
      content: 'Great quiz. I would love more questions about important events and historical figures.',
      likes: 31,
      replies: 4,
      status: 'Visible',
      createdAt: 'Jun 09, 2026'
    },
    {
      id: 'CM003',
      type: 'Comment',
      user: '@quizNerd',
      email: 'quiznerd@example.com',
      avatarSeed: 'QuizNerd',
      quizTitle: 'English Basic Quiz',
      quizId: 'QZ001',
      content: 'Best quiz platform I have used. The UI is clean and the questions are well written.',
      likes: 112,
      replies: 15,
      status: 'Visible',
      createdAt: 'Jun 08, 2026'
    },
    {
      id: 'RV003',
      type: 'Review',
      user: 'Le Minh C',
      email: 'leminhc@example.com',
      avatarSeed: 'LeMinhC',
      quizTitle: 'Programming Quiz',
      quizId: 'QZ003',
      content: 'Great for practicing programming fundamentals. The difficulty is fair and the quiz flow is smooth.',
      rating: 5,
      likes: 58,
      replies: 8,
      status: 'Visible',
      createdAt: 'Jun 08, 2026'
    },
    {
      id: 'CM004',
      type: 'Comment',
      user: '@learnerVN',
      email: 'learnervn@example.com',
      avatarSeed: 'LearnerVN',
      quizTitle: 'Math Challenge',
      quizId: 'QZ002',
      content: 'I hope this quiz will have more medium-level math questions in the next update.',
      likes: 18,
      replies: 2,
      status: 'Hidden',
      createdAt: 'Jun 07, 2026'
    },
    {
      id: 'RV004',
      type: 'Review',
      user: 'Pham Hoang D',
      email: 'phamhoangd@example.com',
      avatarSeed: 'PhamHoangD',
      quizTitle: 'History Quick Test',
      quizId: 'QZ004',
      content: 'The quiz is okay, but it needs more detailed explanation after incorrect answers.',
      rating: 3,
      likes: 14,
      replies: 2,
      status: 'Hidden',
      createdAt: 'Jun 07, 2026'
    }
  ];

  get totalFeedback(): number {
    return this.feedbacks.length;
  }

  get totalReviews(): number {
    return this.feedbacks.filter(item => item.type === 'Review').length;
  }

  get totalComments(): number {
    return this.feedbacks.filter(item => item.type === 'Comment').length;
  }

  get hiddenCount(): number {
    return this.feedbacks.filter(item => item.status === 'Hidden').length;
  }

  get averageRating(): string {
    const reviews = this.feedbacks.filter(item => item.type === 'Review' && item.rating);

    if (reviews.length === 0) {
      return '0.0';
    }

    const total = reviews.reduce((sum, item) => sum + (item.rating || 0), 0);

    return (total / reviews.length).toFixed(1);
  }

  get quizzes(): string[] {
    return Array.from(new Set(this.feedbacks.map(item => item.quizTitle)));
  }

  get filteredFeedbacks(): FeedbackItem[] {
    let list = [...this.feedbacks];

    if (this.activeTab === 'reviews') {
      list = list.filter(item => item.type === 'Review');
    }

    if (this.activeTab === 'comments') {
      list = list.filter(item => item.type === 'Comment');
    }

    if (this.activeTab === 'popular') {
      list = list.sort((a, b) => b.likes - a.likes);
    }

    const keyword = this.searchText.toLowerCase();

    return list.filter(item => {
      const matchesSearch =
        item.user.toLowerCase().includes(keyword) ||
        item.email.toLowerCase().includes(keyword) ||
        item.quizTitle.toLowerCase().includes(keyword) ||
        item.quizId.toLowerCase().includes(keyword) ||
        item.content.toLowerCase().includes(keyword) ||
        item.id.toLowerCase().includes(keyword);

      const matchesStatus =
        this.statusFilter === '' ||
        item.status === this.statusFilter;

      const matchesQuiz =
        this.quizFilter === '' ||
        item.quizTitle === this.quizFilter;

      const matchesRating =
        this.ratingFilter === '' ||
        (
          item.type === 'Review' &&
          item.rating === Number(this.ratingFilter)
        );

      return (
        matchesSearch &&
        matchesStatus &&
        matchesQuiz &&
        matchesRating
      );
    });
  }

  getStars(rating?: number): number[] {
    return Array.from(
      { length: rating || 0 },
      (_, index) => index + 1
    );
  }

  setTab(tab: 'all' | 'reviews' | 'comments' | 'popular'): void {
    this.activeTab = tab;
  }

  toggleStatus(item: FeedbackItem): void {
    item.status = item.status === 'Visible'
      ? 'Hidden'
      : 'Visible';
  }

  deleteFeedback(id: string): void {
    const confirmed = confirm(
      'Are you sure you want to delete this feedback?'
    );

    if (!confirmed) {
      return;
    }

    this.feedbacks = this.feedbacks.filter(
      item => item.id !== id
    );
  }
}