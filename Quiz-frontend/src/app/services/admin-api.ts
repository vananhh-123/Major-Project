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
  username?: string;
  name?: string;
  email: string;
  role?: string;
  created_at?: string;
  joined?: string;
  avatar?: string;
  status?: string;
  quizzes?: number;
  soloGames?: number;
  multiGames?: number;
  score?: number;
}

export interface AdminReviewApi {
  id: string;
  content?: string;
  rating?: number;
  created_at?: string;
  createdAt?: string;
  user_id?: string;
  quiz_id?: string;
  quizId?: string;
  username?: string;
  user?: string;
  email?: string;
  quizTitle?: string;
  title?: string;
  status?: string;
  likes?: number;
  replies?: number;
}

export interface AnalyticsApi {
  totalUsers: number;
  totalQuizzes: number;
  totalResults: number;
  totalReviews: number;
  soloGames: number;
  multiGames: number;
}

export interface AdminRoomApi {
  id: string;
  roomCode: string;
  quizTitle: string;
  host: string;
  players: number;
  status: string;
  createdAt: string;
}

export interface AdminLogApi {
  id: string;
  type: string;
  level: string;
  title: string;
  description: string;
  actor: string;
  time: string;
  date: string;
  icon: string;
  createdAt: string;
}

export interface AdminSettingsApi {
  id?: string;

  platformName: string;
  platformDescription: string;
  supportEmail: string;
  contactPhone: string;
  defaultLanguage: string;
  defaultTimezone: string;
  copyrightText: string;

  allowRegistration: boolean;
  requireEmailVerification: boolean;
  allowGoogleLogin: boolean;
  allowFacebookLogin: boolean;
  allowAvatarUpload: boolean;
  maxAvatarSize: number;
  minUsernameLength: number;
  maxUsernameLength: number;

  defaultVisibility: string;
  defaultDifficulty: string;
  maxQuizzesPerUser: number;
  maxQuestions: number;
  maxAnswersPerQuestion: number;
  allowQuizCloning: boolean;
  allowPublicQuizSearch: boolean;

  maxRoomSize: number;
  roomTimeout: number;
  lobbyCountdown: number;
  questionTimeLimit: number;
  allowRejoin: boolean;
  allowSpectatorMode: boolean;
  autoKickInactivePlayers: boolean;

  enableLeaderboard: boolean;
  enableXpSystem: boolean;
  xpPerQuiz: number;
  xpPerWin: number;
  enableAchievements: boolean;
  achievementNotification: boolean;
  dailyRewards: boolean;

  maintenanceMode: boolean;
  maxLoginAttempts: number;
  sessionTimeout: number;
  enableRateLimiting: boolean;
  enableAuditLogs: boolean;
  requireStrongPassword: boolean;
  autoBanSuspiciousUsers: boolean;

  primaryColor: string;
  secondaryColor: string;
  themeMode: string;
  platformLogo: string;
  favicon: string;
  homepageBanner: string;

  smtpHost: string;
  smtpPort: number;
  smtpUsername: string;
  smtpPassword: string;
  senderEmail: string;
  senderName: string;

  createdAt?: string;
  updatedAt?: string;
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

  getAdminUsers(): Observable<AdminUserApi[]> {
    return this.http.get<AdminUserApi[]>(
      `${this.apiUrl}/admin/users`
    );
  }

  getAdminQuizzes(): Observable<AdminQuizApi[]> {
    return this.http.get<AdminQuizApi[]>(
      `${this.apiUrl}/admin/quizzes`
    );
  }

  getAdminReviews(): Observable<AdminReviewApi[]> {
    return this.http.get<AdminReviewApi[]>(
      `${this.apiUrl}/admin/reviews`
    );
  }

  getAnalytics(range: string = '30'): Observable<AnalyticsApi> {
    return this.http.get<AnalyticsApi>(
      `${this.apiUrl}/admin/analytics?range=${range}`
    );
  }

  getAdminRooms(): Observable<AdminRoomApi[]> {
    return this.http.get<AdminRoomApi[]>(
      `${this.apiUrl}/admin/rooms`
    );
  }

  getAdminLogs(): Observable<AdminLogApi[]> {
    return this.http.get<AdminLogApi[]>(
      `${this.apiUrl}/admin/logs`
    );
  }

  getAdminSettings(): Observable<AdminSettingsApi> {
    return this.http.get<AdminSettingsApi>(
      `${this.apiUrl}/admin/settings`
    );
  }

  updateAdminSettings(payload: AdminSettingsApi): Observable<AdminSettingsApi> {
    return this.http.put<AdminSettingsApi>(
      `${this.apiUrl}/admin/settings`,
      payload
    );
  }
}