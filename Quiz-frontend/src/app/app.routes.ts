import { Routes } from '@angular/router';

// Layouts
import { AuthLayout } from './layouts/auth-layout/auth-layout';
import { MainLayout } from './layouts/main-layout/main-layout';
import { GameLayout } from './layouts/game-layout/game-layout';

// Features - Auth & Home
import { Home } from './features/home/home';
import { Login } from './features/auth/login/login';
import { Register } from './features/auth/register/register';

// Features - Dashboard & Core
import { Dashboard } from './features/dashboard/dashboard';
import { Leaderboard } from './features/leaderboard/leaderboard';
import { Profile } from './features/profile/profile';
import { ProfileEdit } from './features/profile-edit/profile-edit';

// Features - Quiz
import { QuizList } from './features/quiz/quiz-list/quiz-list';
import { CreateQuiz } from './features/quiz/create-quiz/create-quiz';
import { QuizDetail } from './features/quiz/quiz-detail/quiz-detail';
import { QuizEdit } from './features/quiz/quiz-edit/quiz-edit';

// Features - Review
import { Review } from './features/review/review';

// Features - Game Play
import { ModeSelection } from './features/game/mode-selection/mode-selection';
import { Result } from './features/game/result/result';

// Solo
import { SoloLobby } from './features/game/solo/solo-lobby/solo-lobby';
import { GameRoomComponent as SoloGameRoom } from './features/game/solo/game-room/game-room';

// Multi
import { MultiModeSelection } from './features/game/multi/multi-mode-selection/multi-mode-selection';
import { MultiLobby } from './features/game/multi/multi-lobby/multi-lobby';
import { GameRoom as MultiGameRoom } from './features/game/multi/game-room/game-room';

export const routes: Routes = [

  // AUTH LAYOUT
  {
    path: '',
    component: AuthLayout,
    children: [
      { path: '', component: Home },
      { path: 'login', component: Login },
      { path: 'register', component: Register }
    ]
  },

  // MAIN APPLICATION
  {
    path: 'app',
    component: MainLayout,
    children: [
      { path: 'dashboard', component: Dashboard },
      { path: 'quizzes', component: QuizList },
      { path: 'create-quiz', component: CreateQuiz },
      { path: 'quiz-detail/:id', component: QuizDetail },
      { path: 'quiz/edit/:id', component: QuizEdit },
      { path: 'leaderboard', component: Leaderboard },
      { path: 'profile', component: Profile },
      { path: 'profile/edit', component: ProfileEdit },
      { path: 'review/:id', component: Review }
    ]
  },

  // GAME LAYOUT
  {
    path: 'play',
    component: GameLayout,
    children: [
      { path: 'mode', component: ModeSelection },
      { path: 'result', component: Result },

      // SOLO MODE
      { path: 'solo/lobby', component: SoloLobby },
      { path: 'solo/room', component: SoloGameRoom },

      // MULTI MODE
      { path: 'multi/mode', component: MultiModeSelection },
      { path: 'multi/lobby', component: MultiLobby },
      { path: 'multi/room', component: MultiGameRoom }
    ]
  },

  // Đường dẫn mặc định khi nhập sai URL
  { path: '**', redirectTo: '' }
];
