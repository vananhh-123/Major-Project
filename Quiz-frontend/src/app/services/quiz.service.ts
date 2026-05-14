import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../config/api.config';

export interface CreateQuizPayload {
  title: string;
  description?: string;
  level?: string;
  visibility?: string;
  cover_image?: string;
  user_id?: string;
  questions: {
    content: string;
    time_limit: number;
    points: number;
    multiple_correct: boolean;
    answers: {
      text: string;
      is_correct: boolean;
    }[];
  }[];
}

@Injectable({
  providedIn: 'root'
})
export class QuizService {
  private http = inject(HttpClient);
  private apiUrl = API_CONFIG.API_BASE; // Go Backend API

  createQuiz(payload: CreateQuizPayload): Observable<any> {
    return this.http.post(`${this.apiUrl}/quizzes`, payload);
  }

  getQuizzes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/quizzes`);
  }

  getQuiz(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/quizzes/${id}`);
  }

  updateQuiz(id: string, quizData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/quizzes/${id}`, quizData);
  }

  updateVisibility(id: string, visibility: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/quizzes/${id}/visibility`, { visibility });
  }
}
