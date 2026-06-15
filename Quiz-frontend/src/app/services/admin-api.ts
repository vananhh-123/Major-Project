import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AdminDashboardStats {
  totalUsers: number;
  totalQuizzes: number;
  totalQuestions: number;
  totalResults: number;
  totalReviews: number;
  activeRooms: number;
}

export interface AdminQuizApi {
  id: string;
  title: string;
  description?: string;
  creator?: string;
  creator_id?: string;
  username?: string;
  level?: string;
  difficulty?: string;
  visibility?: string;
  status?: string;
  cover_image?: string;
  plays?: number;
  rating?: number;
  reviewCount?: number;
  questions?: number;
  questionCount?: number;
  created_at?: string;
  createdAt?: string;
}

export interface AdminUserApi {
  id: string;
  username: string;
  email: string;
  role?: string;
  created_at?: string;
  avatar?: string;
  status?: string;
}

export interface AdminReviewApi {
  id: string;
  content?: string;
  rating?: number;
  created_at?: string;
  user_id?: string;
  quiz_id?: string;
  username?: string;
  email?: string;
  quizTitle?: string;
  title?: string;
  status?: string;
  likes?: number;
  replies?: number;
}

@Injectable({
  providedIn: 'root'
})
export class AdminApi {
  private readonly apiUrl = 'http://localhost:8080/api';

  constructor(private http: HttpClient) {}

  getDashboardStats(): Observable<AdminDashboardStats> {
    return this.http.get<AdminDashboardStats>(
      `${this.apiUrl}/admin/dashboard`
    );
  }

  getAdminQuizzes(): Observable<AdminQuizApi[]> {
    return this.http.get<AdminQuizApi[]>(
      `${this.apiUrl}/admin/quizzes`
    );
  }

  getAdminUsers(): Observable<AdminUserApi[]> {
    return this.http.get<AdminUserApi[]>(
      `${this.apiUrl}/admin/users`
    );
  }

  getAdminReviews(): Observable<AdminReviewApi[]> {
    return this.http.get<AdminReviewApi[]>(
      `${this.apiUrl}/admin/reviews`
    );
  }
}