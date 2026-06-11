import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

type SettingsTab =
  | 'General'
  | 'Users'
  | 'Quiz'
  | 'Multiplayer'
  | 'Leaderboard'
  | 'Security'
  | 'Appearance'
  | 'Email';

type AdminRole = 'Admin' | 'SuperAdmin';

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-settings.html',
  styleUrl: './admin-settings.css'
})
export class AdminSettings {
  activeTab: SettingsTab = 'General';

  currentRole: AdminRole = 'SuperAdmin';

  originalPlatformName = 'JUST4QUIZ';
  platformName = 'JUST4QUIZ';

  platformDescription = 'Interactive Quiz Platform';
  supportEmail = 'support@just4quiz.com';
  contactPhone = '+84 900 000 000';
  defaultLanguage = 'English';
  defaultTimezone = 'UTC+7';
  copyrightText = '© 2026 JUST4QUIZ. All rights reserved.';

  allowRegistration = true;
  requireEmailVerification = false;
  allowGoogleLogin = true;
  allowFacebookLogin = false;
  allowAvatarUpload = true;
  maxAvatarSize = 5;
  minUsernameLength = 4;
  maxUsernameLength = 30;

  defaultVisibility = 'Private';
  defaultDifficulty = 'Easy';
  maxQuizzesPerUser = 100;
  maxQuestions = 40;
  maxAnswersPerQuestion = 4;
  allowQuizCloning = true;
  allowPublicQuizSearch = true;

  maxRoomSize = 50;
  roomTimeout = 30;
  lobbyCountdown = 10;
  questionTimeLimit = 20;
  allowRejoin = true;
  allowSpectatorMode = false;
  autoKickInactivePlayers = true;

  enableLeaderboard = true;
  enableXpSystem = true;
  xpPerQuiz = 20;
  xpPerWin = 50;
  enableAchievements = true;
  achievementNotification = true;
  dailyRewards = false;

  maintenanceMode = false;
  maxLoginAttempts = 5;
  sessionTimeout = 30;
  enableRateLimiting = true;
  enableAuditLogs = true;
  requireStrongPassword = true;
  autoBanSuspiciousUsers = false;

  primaryColor = '#6E12F8';
  secondaryColor = '#B30064';
  themeMode = 'Light';
  platformLogo = 'just4quiz-logo.png';
  favicon = 'favicon.ico';
  homepageBanner = 'quiz-banner.png';

  smtpHost = 'smtp.gmail.com';
  smtpPort = 587;
  smtpUsername = 'support@just4quiz.com';
  smtpPassword = '********';
  senderEmail = 'support@just4quiz.com';
  senderName = 'JUST4QUIZ Support';

  showPasswordModal = false;
  adminPassword = '';
  passwordError = '';

  get canEditPlatformName(): boolean {
    return this.currentRole === 'SuperAdmin';
  }

  setTab(tab: SettingsTab): void {
    this.activeTab = tab;
  }

  saveSettings(): void {
    const newName = this.platformName.trim();
    const oldName = this.originalPlatformName.trim();

    if (!newName) {
      alert('Platform Name cannot be empty.');
      this.platformName = this.originalPlatformName;
      return;
    }

    const isChangingPlatformName = newName !== oldName;

    if (isChangingPlatformName) {
      if (!this.canEditPlatformName) {
        alert('Only Super Admin can change Platform Name.');
        this.platformName = this.originalPlatformName;
        return;
      }

      this.passwordError = '';
      this.adminPassword = '';
      this.showPasswordModal = true;
      return;
    }

    alert('Settings saved successfully!');
  }

  confirmSensitiveSave(): void {
    const demoPassword = 'admin123';

    if (this.adminPassword !== demoPassword) {
      this.passwordError = 'Invalid admin password.';
      return;
    }

    this.platformName = this.platformName.trim();
    this.originalPlatformName = this.platformName;

    this.adminPassword = '';
    this.passwordError = '';
    this.showPasswordModal = false;

    alert('Sensitive settings saved successfully!');
  }

  cancelSensitiveSave(): void {
    this.platformName = this.originalPlatformName;
    this.adminPassword = '';
    this.passwordError = '';
    this.showPasswordModal = false;
  }

  resetSettings(): void {
    const confirmed = confirm('Reset all settings to default?');

    if (!confirmed) {
      return;
    }

    this.activeTab = 'General';

    this.originalPlatformName = 'JUST4QUIZ';
    this.platformName = 'JUST4QUIZ';

    this.platformDescription = 'Interactive Quiz Platform';
    this.supportEmail = 'support@just4quiz.com';
    this.contactPhone = '+84 900 000 000';
    this.defaultLanguage = 'English';
    this.defaultTimezone = 'UTC+7';
    this.copyrightText = '© 2026 JUST4QUIZ. All rights reserved.';

    this.allowRegistration = true;
    this.requireEmailVerification = false;
    this.allowGoogleLogin = true;
    this.allowFacebookLogin = false;
    this.allowAvatarUpload = true;
    this.maxAvatarSize = 5;
    this.minUsernameLength = 4;
    this.maxUsernameLength = 30;

    this.defaultVisibility = 'Private';
    this.defaultDifficulty = 'Easy';
    this.maxQuizzesPerUser = 100;
    this.maxQuestions = 40;
    this.maxAnswersPerQuestion = 4;
    this.allowQuizCloning = true;
    this.allowPublicQuizSearch = true;

    this.maxRoomSize = 50;
    this.roomTimeout = 30;
    this.lobbyCountdown = 10;
    this.questionTimeLimit = 20;
    this.allowRejoin = true;
    this.allowSpectatorMode = false;
    this.autoKickInactivePlayers = true;

    this.enableLeaderboard = true;
    this.enableXpSystem = true;
    this.xpPerQuiz = 20;
    this.xpPerWin = 50;
    this.enableAchievements = true;
    this.achievementNotification = true;
    this.dailyRewards = false;

    this.maintenanceMode = false;
    this.maxLoginAttempts = 5;
    this.sessionTimeout = 30;
    this.enableRateLimiting = true;
    this.enableAuditLogs = true;
    this.requireStrongPassword = true;
    this.autoBanSuspiciousUsers = false;

    this.primaryColor = '#6E12F8';
    this.secondaryColor = '#B30064';
    this.themeMode = 'Light';
    this.platformLogo = 'just4quiz-logo.png';
    this.favicon = 'favicon.ico';
    this.homepageBanner = 'quiz-banner.png';

    this.smtpHost = 'smtp.gmail.com';
    this.smtpPort = 587;
    this.smtpUsername = 'support@just4quiz.com';
    this.smtpPassword = '********';
    this.senderEmail = 'support@just4quiz.com';
    this.senderName = 'JUST4QUIZ Support';

    this.showPasswordModal = false;
    this.adminPassword = '';
    this.passwordError = '';
  }
}