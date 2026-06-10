import { Injectable } from '@angular/core';
import { Subject, Observable, filter } from 'rxjs';
import { API_CONFIG } from '../../config/api.config';

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────

export interface WsMessage {
  action: string;
  roomId: string;
  userId: string;
  data: any;
}

export interface PlayerInfo {
  userId: string;
  name: string;
  avatar: string;
  score: number;
  correctAnswers?: number;
  isHost: boolean;
}

// ─────────────────────────────────────────
// SERVICE
// ─────────────────────────────────────────

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {
  private socket!: WebSocket;
  private messageSubject = new Subject<WsMessage>();
  private currentRoomId = '';
  private currentUserId = '';
  private reconnectTimer: any;

  // ── Lấy luồng tất cả message ──
  public getMessages(): Observable<WsMessage> {
    return this.messageSubject.asObservable();
  }

  // ── Lọc message theo action cụ thể ──
  public on(action: string): Observable<WsMessage> {
    return this.messageSubject.pipe(
      filter(msg => msg.action === action)
    );
  }

  // ── Kết nối WebSocket ──
  public connect(roomId: string, userId: string): void {
    // Nếu đã kết nối đúng phòng, bỏ qua
    if (
      this.socket &&
      this.socket.readyState === WebSocket.OPEN &&
      this.currentRoomId === roomId &&
      this.currentUserId === userId
    ) {
      console.log('✅ Đã kết nối sẵn rồi.');
      return;
    }

    this.currentRoomId = roomId;
    this.currentUserId = userId;

    const url = `ws://${API_CONFIG.WS_HOST}:${API_CONFIG.WS_PORT}/api/ws?roomId=${roomId}&userId=${userId}`;
    console.log('🌐 WebSocket connecting to:', url);
    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      console.log(`✅ WebSocket kết nối thành công → Room: ${roomId}`);
      // Xóa reconnect timer nếu đang có
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
    };

    this.socket.onmessage = (event) => {
      try {
        const msg: WsMessage = JSON.parse(event.data);
        console.log(`📥 [${msg.action}]`, msg.data);
        this.messageSubject.next(msg);
      } catch (e) {
        console.error('❌ Parse lỗi WebSocket message:', e);
      }
    };

    this.socket.onclose = (event) => {
      console.log('🔌 WebSocket ngắt kết nối.', event.code, event.reason);
      // Tự reconnect sau 3s nếu không phải đóng chủ động
      if (event.code !== 1000) {
        this.reconnectTimer = setTimeout(() => {
          console.log('🔄 Đang reconnect...');
          this.connect(this.currentRoomId, this.currentUserId);
        }, 3000);
      }
    };

    this.socket.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
    };
  }

  // ── Gửi message ──
  public send(msg: WsMessage): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      console.log('📤 WebSocket send:', msg.action, msg.data || {});
      this.socket.send(JSON.stringify(msg));
    } else {
      console.warn('⚠️ Chưa kết nối WebSocket, không thể gửi:', msg.action);
    }
  }

  // ── Các action game tiện lợi ──

  /** Player vào phòng */
  public joinRoom(roomId: string, userId: string, name: string, avatar: string, isHost: boolean, gameMode: string, gamePin: string, quizId: string): void {
    this.send({
      action: 'join_room',
      roomId,
      userId,
      data: { name, avatar, isHost, gameMode, gamePin, quizId }
    });
    // Ask server for authoritative room state immediately after joining
    setTimeout(() => {
      this.send({ action: 'request_room_state', roomId, userId, data: {} });
    }, 200);
  }

  /** Host bắt đầu game */
  public startGame(roomId: string, userId: string, gameMode?: string, quizId?: string): void {
    const payload = { gameMode, quizId };
    console.log('🚀 startGame -> sending', { roomId, userId, payload });
    this.send({ action: 'start_game', roomId, userId, data: payload });
  }

  /** Host gửi câu hỏi */
  public sendQuestion(roomId: string, userId: string, question: any): void {
    this.send({ action: 'next_question', roomId, userId, data: question });
  }

  /** Player nộp câu trả lời */
  public submitAnswer(roomId: string, userId: string, payload: {
    questionIdx: number;
    answerIdx: number | number[];
    isCorrect: boolean;
    points: number;
    timeUsed: number;
  }): void {
    this.send({ action: 'submit_answer', roomId, userId, data: payload });
  }

  /** Player clicked NEXT (ready for next question) */
  public playerReadyNext(roomId: string, userId: string): void {
    this.send({ action: 'player_ready_next', roomId, userId, data: {} });
  }

  /** Host kết thúc game */
  public endGame(roomId: string, userId: string): void {
    this.send({ action: 'end_game', roomId, userId, data: {} });
  }

  // ── Đóng kết nối ──
  public disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    if (this.socket) {
      this.socket.close(1000, 'User disconnected');
    }
  }
}
