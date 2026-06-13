import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { WebsocketService, PlayerInfo } from '../../../../core/services/websocket.service';
import { API_CONFIG } from '../../../../config/api.config';
import { HttpClient } from '@angular/common/http';

// ─────────────────────────────────────────
// TYPES (local)
// ─────────────────────────────────────────

interface ModeInfo {
  name: string;
  icon: string;
  desc: string;
}

export interface PlayerInfoWithStatus extends PlayerInfo {
  isCurrentUser?: boolean;
}

// ─────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────

@Component({
  selector: 'app-multi-lobby',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './multi-lobby.html',
  styleUrls: ['./multi-lobby.css']
})
export class MultiLobby implements OnInit, OnDestroy {

  // ── State từ URL params ──
  isHost: boolean = true;
  gameMode: string = 'classic';
  gamePin: string = '';
  quizId: string = '';

  // ── Thông tin user hiện tại (lấy từ localStorage / AuthService) ──
  currentUserId: string = '';
  currentUserName: string = '';
  currentUserAvatar: string = '';
  private hostIp: string = '';

  // ── Danh sách player thật từ WebSocket ──
  players: PlayerInfoWithStatus[] = [];

  // ── Subscriptions ──
  private subs = new Subscription();

  // ─────────────────────────────────────────
  get modeInfo(): ModeInfo {
    if (this.gameMode === 'focus') {
      return { name: 'Focus Mode', icon: 'psychology', desc: 'High intensity play' };
    }
    return { name: 'Classic Mode', icon: 'groups', desc: 'Standard competition' };
  }
  get joinedPlayerCount(): number {
    return this.players.filter(p => !p.isHost).length;
  }

  get lobbyJoinUrl(): string {
    const port = window.location.port ? `:${window.location.port}` : '';
    const host = this.hostIp || window.location.hostname;
    return `${window.location.protocol}//${host}${port}`;
  }
  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private ws: WebsocketService,
    private cdr: ChangeDetectorRef,
    private http: HttpClient
  ) {}

  // ─────────────────────────────────────────
  // LIFECYCLE
  // ─────────────────────────────────────────

  ngOnInit(): void {
    // 1. Lấy thông tin user từ localStorage
    this.loadCurrentUser();
    this.loadHostIp();

    // 2. Lấy params từ URL và kết nối WebSocket
    this.subs.add(
      this.route.queryParams.subscribe(params => {
        this.gameMode = params['mode'] || 'classic';
        this.isHost   = params['role'] !== 'player';
        this.gamePin  = params['pin']  || this.generatePin();
        this.quizId   = params['quizId'] || params['id'] || '';

        this.connectAndJoin();
      })
    );

    // 3. Lắng nghe các WebSocket events
    this.listenToWsEvents();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    // Do NOT disconnect the socket here, because we need it in the Game Room
  }

  // ─────────────────────────────────────────
  // SETUP
  // ─────────────────────────────────────────

  private loadCurrentUser(): void {
    // Đọc từ localStorage (do auth service lưu sau login)
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.currentUserId   = user.id   || user.userId   || '';
        this.currentUserName = user.name || user.username || 'Player';
        this.currentUserAvatar = user.avatar ||
          `https://api.dicebear.com/7.x/personas/svg?seed=${this.currentUserName}`;
      } catch {
        this.setFallbackUser();
      }
    } else {
      this.setFallbackUser();
    }
  }

  private loadHostIp(): void {
    fetch(`${API_CONFIG.API_BASE}/network-info`, {
      headers: { Accept: 'application/json' }
    })
      .then(res => res.ok ? res.json() : Promise.reject(res.status))
      .then((data: any) => {
        if (data?.hostIp) {
          this.hostIp = data.hostIp;
          this.cdr.detectChanges();
        }
      })
      .catch(() => {
        this.hostIp = this.hostIp || window.location.hostname;
        this.cdr.detectChanges();
      });
  }

  private setFallbackUser(): void {
    // Fallback nếu chưa đăng nhập (dev mode)
    this.currentUserId   = 'user_' + Math.random().toString(36).slice(2, 7);
    this.currentUserName = 'Guest_' + Math.floor(Math.random() * 1000);
    this.currentUserAvatar = `https://api.dicebear.com/7.x/personas/svg?seed=${this.currentUserName}`;
  }

  private generatePin(): string {
    // Tạo PIN 6 chữ số ngẫu nhiên
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private connectAndJoin(): void {
  if (!this.currentUserId || !this.gamePin) return;

  const joinSocket = () => {
    this.ws.connect(this.gamePin, this.currentUserId);

    setTimeout(() => {
      this.ws.joinRoom(
        this.gamePin,
        this.currentUserId,
        this.currentUserName,
        this.currentUserAvatar,
        this.isHost,
        this.gameMode,
        this.gamePin,
        this.quizId
      );

      this.http.post(`${API_CONFIG.API_BASE}/rooms/join`, {
        room_code: this.gamePin,
        user_id: this.currentUserId,
        name: this.currentUserName
      }).subscribe({
        next: () => console.log('Player saved to DB'),
        error: err => console.error('Save player error:', err)
      });

    }, 500);
  };

  if (this.isHost) {
    this.http.post(`${API_CONFIG.API_BASE}/rooms`, {
      room_code: this.gamePin,
      host_id: this.currentUserId,
      quiz_id: this.quizId,
      game_mode: this.gameMode
    }).subscribe({
      next: () => {
        console.log('Room saved to DB');
        joinSocket();
      },
      error: err => {
        console.error('Create room error:', err);
        joinSocket();
      }
    });
  } else {
    joinSocket();
  }
}

  // ─────────────────────────────────────────
  // WEBSOCKET LISTENERS
  // ─────────────────────────────────────────

  private listenToWsEvents(): void {

    // Lắng nghe lỗi Websocket
    this.subs.add(
      this.ws.on('error').subscribe((msg: any) => {
        alert(msg.data || 'Lỗi kết nối phòng');
        this.leaveRoom();
      })
    );

    // Có player mới vào phòng → cập nhật danh sách
    this.subs.add(
      this.ws.on('player_joined').subscribe((msg: any) => {
        const data = msg.data as { players: PlayerInfo[]; newPlayer: PlayerInfo; gameMode?: string };
        // Update gameMode from server state if present (so players see correct mode)
        this.gameMode = data.gameMode || this.gameMode;

        this.players = data.players.map(p => ({
          ...p,
          // Đánh dấu player hiện tại
          isCurrentUser: p.userId === this.currentUserId
        } as PlayerInfo & { isCurrentUser: boolean }));
        console.log(`👥 Player joined. Total: ${this.players.length}`, data);
        this.cdr.detectChanges(); // Bắt buộc render lại giao diện
      })
    );

    // Player rời phòng → cập nhật danh sách
    this.subs.add(
      this.ws.on('player_left').subscribe((msg: any) => {
        const data = msg.data as { userId: string; players: PlayerInfo[] };
        this.players = data.players.map(p => ({
          ...p,
          isCurrentUser: p.userId === this.currentUserId
        } as any));
        console.log(`👋 Player left: ${data.userId}`);
      })
    );

    // Host bắt đầu game → tất cả navigate vào GameRoom
    this.subs.add(
      this.ws.on('game_started').subscribe((msg: any) => {
        console.log('🎮 Game started! Navigating to game room...');
        
        sessionStorage.setItem('roomPlayers', JSON.stringify(this.players));
        sessionStorage.setItem('roomGameMode', msg.data?.gameMode || this.gameMode);

        this.router.navigate(['/play/multi/room'], {
          queryParams: {
            mode:    msg.data?.gameMode || this.gameMode,
            pin:     this.gamePin,
            quizId:  msg.data.quizId,
            role:    this.isHost ? 'host' : 'player',
            userId:  this.currentUserId
          }
        });
      })
    );

    // Room state response (authoritative) — update gameMode if server says so
    this.subs.add(
      this.ws.on('room_state').subscribe((msg: any) => {
        const data = msg.data as { gameMode?: string; players?: PlayerInfo[] };
        if (data.gameMode) {
          this.gameMode = data.gameMode;
        }
        if (data.players) {
          this.players = data.players.map(p => ({ ...p, isCurrentUser: p.userId === this.currentUserId }));
        }
        this.cdr.detectChanges();
      })
    );
  }

  // ─────────────────────────────────────────
  // ACTIONS
  // ─────────────────────────────────────────

  startGame(): void {
    if (!this.isHost) return;
    console.log('🚀 Host starting game...');
    this.ws.startGame(this.gamePin, this.currentUserId, this.gameMode, this.quizId);
    // Navigation xảy ra khi nhận được event 'game_started' từ server
  }

  leaveRoom(): void {
    this.clearLobbySession();
    this.ws.disconnect();
    if (this.hasLoggedInAccount()) {
      this.router.navigate(['/app/dashboard']);
      return;
    }

    this.router.navigate(['/']);
  }

  private hasLoggedInAccount(): boolean {
    try {
      return !!(localStorage.getItem('user') || localStorage.getItem('token'));
    } catch {
      return false;
    }
  }

  private clearLobbySession(): void {
    sessionStorage.removeItem('roomPlayers');
    sessionStorage.removeItem('roomGameMode');
  }
}

