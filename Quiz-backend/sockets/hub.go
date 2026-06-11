package sockets

import (
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────

// Message là cấu trúc gửi/nhận qua WebSocket
type Message struct {
	Action string      `json:"action"`
	RoomID string      `json:"roomId"`
	UserID string      `json:"userId"`
	Data   interface{} `json:"data"`
}

// Client đại diện cho 1 người chơi đang kết nối
type Client struct {
	Conn   *websocket.Conn
	UserID string
	RoomID string
	Send   chan Message
}

// PlayerInfo lưu thông tin người chơi trong phòng
type PlayerInfo struct {
	UserID         string `json:"userId"`
	Name           string `json:"name"`
	Avatar         string `json:"avatar"`
	Score          int    `json:"score"`
	CorrectAnswers int    `json:"correctAnswers"`
	IsHost         bool   `json:"isHost"`
	Connected      bool   `json:"connected"`
}

// RoomState lưu trạng thái của 1 phòng chơi
type RoomState struct {
	HostID            string                 `json:"hostId"`
	GameMode          string                 `json:"gameMode"` // "classic" | "focus"
	QuizID            string                 `json:"quizId"`
	GamePin           string                 `json:"gamePin"`
	Status            string                 `json:"status"`  // "waiting" | "playing" | "ended"
	Players           map[string]PlayerInfo  `json:"players"` // userID → PlayerInfo
	QuestionIdx       int                    `json:"questionIdx"`
	ReadyNext         map[string]bool        `json:"readyNext"`
	AdvanceSent       bool                   `json:"advanceSent"`
	QuestionPhase     string                 `json:"questionPhase"`
	CurrentQuestion   map[string]interface{} `json:"currentQuestion"`
	QuestionStartedAt time.Time              `json:"questionStartedAt"`
	QuestionDuration  int                    `json:"questionDuration"`
}

// Hub quản lý toàn bộ các phòng chơi
type Hub struct {
	Rooms      map[string]map[*Client]bool // roomID → danh sách Client
	RoomStates map[string]*RoomState       // roomID → trạng thái phòng
	Broadcast  chan Message
	Register   chan *Client
	Unregister chan *Client
	mu         sync.Mutex
}

// ─────────────────────────────────────────
// CONSTRUCTOR
// ─────────────────────────────────────────

func NewHub() *Hub {
	return &Hub{
		Rooms:      make(map[string]map[*Client]bool),
		RoomStates: make(map[string]*RoomState),
		Broadcast:  make(chan Message),
		Register:   make(chan *Client),
		Unregister: make(chan *Client),
	}
}

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────

// broadcastToRoom gửi message tới tất cả client trong phòng (KHÔNG lock, gọi trong lock)
func (h *Hub) broadcastToRoom(roomID string, msg Message) {
	if clients, ok := h.Rooms[roomID]; ok {
		for client := range clients {
			select {
			case client.Send <- msg:
			default:
				close(client.Send)
				delete(h.Rooms[roomID], client)
			}
		}
	}
}

// sendToClient gửi message chỉ cho 1 client cụ thể
func (h *Hub) sendToClient(roomID string, userID string, msg Message) {
	if clients, ok := h.Rooms[roomID]; ok {
		for client := range clients {
			if client.UserID == userID {
				select {
				case client.Send <- msg:
				default:
				}
				return
			}
		}
	}
}

// getPlayerList trả về danh sách PlayerInfo trong phòng
func (h *Hub) getPlayerList(roomID string) []PlayerInfo {
	state, ok := h.RoomStates[roomID]
	if !ok {
		return []PlayerInfo{}
	}
	list := make([]PlayerInfo, 0, len(state.Players))
	for _, p := range state.Players {
		if p.Connected {
			list = append(list, p)
		}
	}
	return list
}

func (h *Hub) getConnectedPlayerCount(roomID string) int {
	state, ok := h.RoomStates[roomID]
	if !ok {
		return 0
	}
	count := 0
	for _, p := range state.Players {
		if p.Connected {
			count++
		}
	}
	return count
}

func (h *Hub) getCurrentQuestionTimeLeft(state *RoomState) int {
	if state == nil || state.QuestionDuration <= 0 || state.QuestionStartedAt.IsZero() {
		return 0
	}
	if state.QuestionPhase != "question" {
		return 0
	}
	elapsed := int(time.Since(state.QuestionStartedAt).Seconds())
	remaining := state.QuestionDuration - elapsed
	if remaining < 0 {
		return 0
	}
	return remaining
}

// ─────────────────────────────────────────
// GAME EVENT HANDLERS
// ─────────────────────────────────────────

// handleJoinRoom: player vào phòng, cập nhật state và broadcast danh sách
func (h *Hub) handleJoinRoom(client *Client, data map[string]interface{}) {
	roomID := client.RoomID
	userID := client.UserID

	name, _ := data["name"].(string)
	avatar, _ := data["avatar"].(string)
	isHost, _ := data["isHost"].(bool)
	gameMode, _ := data["gameMode"].(string)
	gamePin, _ := data["gamePin"].(string)
	quizID, _ := data["quizId"].(string)

	// Kiểm tra xem phòng có tồn tại không
	if h.RoomStates[roomID] == nil {
		if !isHost {
			// Player đang cố nhập mã không tồn tại -> Báo lỗi
			h.sendToClient(roomID, userID, Message{
				Action: "error",
				RoomID: roomID,
				UserID: "SYSTEM",
				Data:   "Phòng chơi không tồn tại. Vui lòng kiểm tra lại mã PIN.",
			})
			return
		}
		// Tạo RoomState nếu chưa có (Host tạo phòng đầu tiên)
		h.RoomStates[roomID] = &RoomState{
			HostID:      userID,
			GameMode:    gameMode,
			GamePin:     gamePin,
			QuizID:      quizID,
			Status:      "waiting",
			Players:     make(map[string]PlayerInfo),
			ReadyNext:   make(map[string]bool),
			AdvanceSent: false,
		}
	} else {
		// Phòng đã tồn tại
		if isHost && h.RoomStates[roomID].HostID != userID {
			// Host tạo phòng nhưng mã PIN đã tồn tại -> Báo lỗi trùng mã
			h.sendToClient(roomID, userID, Message{
				Action: "error",
				RoomID: roomID,
				UserID: "SYSTEM",
				Data:   "Mã PIN này hiện đang được sử dụng. Vui lòng quay lại và thử tạo lại.",
			})
			return
		}
	}

	// Thêm player vào state
	existingPlayer, exists := h.RoomStates[roomID].Players[userID]
	h.RoomStates[roomID].Players[userID] = PlayerInfo{
		UserID:         userID,
		Name:           name,
		Avatar:         avatar,
		Score:          existingPlayer.Score,
		CorrectAnswers: existingPlayer.CorrectAnswers,
		IsHost:         isHost,
		Connected:      true,
	}
	if exists {
		// Keep the latest player metadata but preserve progress.
		if name == "" {
			h.RoomStates[roomID].Players[userID] = existingPlayer
			tmp := h.RoomStates[roomID].Players[userID]
			tmp.Connected = true
			tmp.IsHost = isHost
			h.RoomStates[roomID].Players[userID] = tmp
		}
	}

	// Broadcast danh sách player mới cho cả phòng
	h.broadcastToRoom(roomID, Message{
		Action: "player_joined",
		RoomID: roomID,
		UserID: "SYSTEM",
		Data: map[string]interface{}{
			"players":   h.getPlayerList(roomID),
			"newPlayer": h.RoomStates[roomID].Players[userID],
			"gameMode":  h.RoomStates[roomID].GameMode,
		},
	})

	fmt.Printf("[ROOM %s] %s (%s) joined. Total: %d\n", roomID, name, userID, len(h.RoomStates[roomID].Players))
}

// handlePlayerLeft: player rời phòng
func (h *Hub) handlePlayerLeft(roomID string, userID string) {
	state, ok := h.RoomStates[roomID]
	if !ok {
		return
	}

	player, exists := state.Players[userID]
	if !exists {
		return
	}
	player.Connected = false
	state.Players[userID] = player
	delete(state.ReadyNext, userID)
	playerName := player.Name

	h.broadcastToRoom(roomID, Message{
		Action: "player_left",
		RoomID: roomID,
		UserID: "SYSTEM",
		Data: map[string]interface{}{
			"userId":  userID,
			"players": h.getPlayerList(roomID),
		},
	})

	fmt.Printf("[ROOM %s] %s left. Connected: %d\n", roomID, playerName, h.getConnectedPlayerCount(roomID))
}

// handleStartGame: Host bắt đầu game
func (h *Hub) handleStartGame(client *Client, data map[string]interface{}) {
	roomID := client.RoomID
	state, ok := h.RoomStates[roomID]
	if !ok {
		return
	}

	// Chỉ Host mới được start
	if client.UserID != state.HostID {
		h.sendToClient(roomID, client.UserID, Message{
			Action: "error",
			RoomID: roomID,
			UserID: "SYSTEM",
			Data:   "Chỉ host mới được bắt đầu game",
		})
		return
	}
	// Debug: show received payload from host
	fmt.Printf("[ROOM %s] start_game received from %s: %+v\n", roomID, client.UserID, data)

	if requestedMode, ok := data["gameMode"].(string); ok && requestedMode != "" {
		state.GameMode = requestedMode
	}
	if providedQuizId, ok := data["quizId"].(string); ok && providedQuizId != "" {
		state.QuizID = providedQuizId
	}

	state.Status = "playing"
	state.QuestionIdx = 0
	state.QuestionPhase = "waiting"
	state.CurrentQuestion = nil
	state.QuestionStartedAt = time.Time{}
	state.QuestionDuration = 0

	h.broadcastToRoom(roomID, Message{
		Action: "game_started",
		RoomID: roomID,
		UserID: "SYSTEM",
		Data: map[string]interface{}{
			"gameMode": state.GameMode,
			"quizId":   state.QuizID,
			"players":  h.getPlayerList(roomID),
		},
	})

	fmt.Printf("[ROOM %s] Game started! Mode: %s, Quiz: %s\n", roomID, state.GameMode, state.QuizID)
}

// handleNextQuestion: Host gửi câu hỏi tiếp theo
func (h *Hub) handleNextQuestion(client *Client, data map[string]interface{}) {
	roomID := client.RoomID
	state, ok := h.RoomStates[roomID]
	if !ok || client.UserID != state.HostID {
		return
	}

	h.broadcastToRoom(roomID, Message{
		Action: "question",
		RoomID: roomID,
		UserID: "SYSTEM",
		Data:   data, // {index, content, answers, timeLimit, points}
	})
	state.QuestionPhase = "question"
	state.CurrentQuestion = data
	state.QuestionStartedAt = time.Now()
	if timeLimit, ok := data["timeLimit"].(float64); ok {
		state.QuestionDuration = int(timeLimit)
	} else {
		state.QuestionDuration = 0
	}
	state.AdvanceSent = false
	state.ReadyNext = make(map[string]bool)

	fmt.Printf("[ROOM %s] Question %v sent\n", roomID, data["index"])
}

// handleSubmitAnswer: Player nộp câu trả lời
func (h *Hub) handleSubmitAnswer(client *Client, data map[string]interface{}) {
	roomID := client.RoomID
	state, ok := h.RoomStates[roomID]
	if !ok {
		return
	}

	isCorrect, _ := data["isCorrect"].(bool)
	points, _ := data["points"].(float64)
	questionIdx, _ := data["questionIdx"].(float64)

	// Cộng điểm cho player và track correct answers
	if player, exists := state.Players[client.UserID]; exists {
		if isCorrect {
			player.Score += int(points)
			player.CorrectAnswers += 1
		}
		state.Players[client.UserID] = player
	}

	// Gửi kết quả câu trả lời riêng cho player đó
	currentPlayer := state.Players[client.UserID]
	h.sendToClient(roomID, client.UserID, Message{
		Action: "answer_result",
		RoomID: roomID,
		UserID: "SYSTEM",
		Data: map[string]interface{}{
			"isCorrect":      isCorrect,
			"points":         int(points),
			"questionIdx":    int(questionIdx),
			"totalScore":     currentPlayer.Score,
			"correctAnswers": currentPlayer.CorrectAnswers,
		},
	})

	// Broadcast bảng điểm cập nhật cho cả phòng
	h.broadcastToRoom(roomID, Message{
		Action: "score_update",
		RoomID: roomID,
		UserID: "SYSTEM",
		Data:   h.getPlayerList(roomID),
	})

	h.sendToClient(roomID, state.HostID, Message{
		Action: "player_answered",
		RoomID: roomID,
		UserID: "SYSTEM",
		Data:   map[string]interface{}{"userId": client.UserID},
	})

	fmt.Printf("[ROOM %s] %s answered Q%v. Correct: %v\n", roomID, client.UserID, int(questionIdx), isCorrect)
}

// handlePlayerReadyNext: player clicked NEXT (ready for next question)
func (h *Hub) handlePlayerReadyNext(client *Client, data map[string]interface{}) {
	roomID := client.RoomID
	state, ok := h.RoomStates[roomID]
	if !ok {
		return
	}

	// mark ready
	state.ReadyNext[client.UserID] = true

	// Debug: log current game mode and players (helps detect case/whitespace mismatches)
	fmt.Printf("[ROOM %s] player_ready_next from %s — GameMode='%s' AdvanceSent=%v Players=%d\n",
		roomID, client.UserID, state.GameMode, state.AdvanceSent, len(state.Players))

	// Classic mode: advance immediately on first Next click (no need to wait for everyone)
	mode := strings.ToLower(strings.TrimSpace(state.GameMode))
	if mode == "classic" {
		// For Classic mode: only record that this player is ready. Do NOT notify host
		// to advance (host-driven advance would broadcast question to all). The
		// client will advance locally in Classic mode, so server should not emit
		// an all_players_ready broadcast here.
		fmt.Printf("[ROOM %s] classic next recorded for %s (no broadcast)\n", roomID, client.UserID)
		return
	}

	// count non-host players
	totalNonHost := 0
	for _, p := range state.Players {
		if p.Connected && !p.IsHost {
			totalNonHost++
		}
	}

	// count ready
	readyCount := len(state.ReadyNext)

	fmt.Printf("[ROOM %s] player_ready_next from %s (ready %d/%d)\n", roomID, client.UserID, readyCount, totalNonHost)

	// Broadcast debug-ready state so clients can observe server-side readiness
	readyList := make([]string, 0, len(state.ReadyNext))
	for uid := range state.ReadyNext {
		readyList = append(readyList, uid)
	}
	h.broadcastToRoom(roomID, Message{
		Action: "ready_state",
		RoomID: roomID,
		UserID: "SYSTEM",
		Data:   map[string]interface{}{"readyList": readyList, "readyCount": readyCount, "totalNonHost": totalNonHost},
	})

	// If all non-host players are ready, notify the host to advance
	if totalNonHost > 0 && readyCount >= totalNonHost {
		// Notify all clients so players see the ready state and host can act
		h.broadcastToRoom(roomID, Message{
			Action: "all_players_ready",
			RoomID: roomID,
			UserID: "SYSTEM",
			Data:   map[string]interface{}{"readyCount": readyCount, "hostId": state.HostID},
		})
		fmt.Printf("[ROOM %s] All players ready, notifying host %s\n", roomID, state.HostID)
		// reset ready map for next round
		state.ReadyNext = make(map[string]bool)
	}
}

func (h *Hub) handleRoomStateRequest(client *Client) {
	roomID := client.RoomID
	state, ok := h.RoomStates[roomID]
	if !ok {
		h.sendToClient(roomID, client.UserID, Message{
			Action: "error",
			RoomID: roomID,
			UserID: "SYSTEM",
			Data:   "Phòng chơi không tồn tại.",
		})
		return
	}

	var currentPlayer *PlayerInfo
	if p, exists := state.Players[client.UserID]; exists {
		copyPlayer := p
		currentPlayer = &copyPlayer
	}

	h.sendToClient(roomID, client.UserID, Message{
		Action: "room_state",
		RoomID: roomID,
		UserID: "SYSTEM",
		Data: map[string]interface{}{
			"hostId":          state.HostID,
			"gameMode":        state.GameMode,
			"quizId":          state.QuizID,
			"status":          state.Status,
			"questionIdx":     state.QuestionIdx,
			"questionPhase":   state.QuestionPhase,
			"timeLeft":        h.getCurrentQuestionTimeLeft(state),
			"players":         h.getPlayerList(roomID),
			"currentPlayer":   currentPlayer,
			"currentQuestion": state.CurrentQuestion,
		},
	})
}

// handleEndGame: Host kết thúc game
func (h *Hub) handleEndGame(client *Client) {
	roomID := client.RoomID
	state, ok := h.RoomStates[roomID]
	if !ok || client.UserID != state.HostID {
		return
	}

	state.Status = "ended"

	h.broadcastToRoom(roomID, Message{
		Action: "game_ended",
		RoomID: roomID,
		UserID: "SYSTEM",
		Data: map[string]interface{}{
			"finalScores": h.getPlayerList(roomID),
		},
	})

	fmt.Printf("[ROOM %s] Game ended!\n", roomID)
}

// ─────────────────────────────────────────
// MAIN LOOP
// ─────────────────────────────────────────

func (h *Hub) Run() {
	for {
		select {

		// Đăng ký client mới
		case client := <-h.Register:
			h.mu.Lock()
			if h.Rooms[client.RoomID] == nil {
				h.Rooms[client.RoomID] = make(map[*Client]bool)
			}
			h.Rooms[client.RoomID][client] = true
			h.mu.Unlock()

		// Hủy đăng ký client (disconnect)
		case client := <-h.Unregister:
			h.mu.Lock()
			if _, ok := h.Rooms[client.RoomID][client]; ok {
				delete(h.Rooms[client.RoomID], client)
				close(client.Send)
				if len(h.Rooms[client.RoomID]) == 0 {
					delete(h.Rooms, client.RoomID)
				}
				// Thông báo player rời phòng
				h.handlePlayerLeft(client.RoomID, client.UserID)
			}
			h.mu.Unlock()

		// Xử lý tin nhắn từ client
		case message := <-h.Broadcast:
			h.mu.Lock()

			// Parse Data thành map để xử lý
			var data map[string]interface{}
			if d, ok := message.Data.(map[string]interface{}); ok {
				data = d
			} else {
				data = make(map[string]interface{})
			}

			// Tìm client gửi tin nhắn
			var senderClient *Client
			if clients, ok := h.Rooms[message.RoomID]; ok {
				for c := range clients {
					if c.UserID == message.UserID {
						senderClient = c
						break
					}
				}
			}

			// Dispatch theo action
			switch message.Action {

			case "join_room":
				if senderClient != nil {
					h.handleJoinRoom(senderClient, data)
				}

			case "start_game":
				if senderClient != nil {
					h.handleStartGame(senderClient, data)
				}

			case "next_question":
				if senderClient != nil {
					h.handleNextQuestion(senderClient, data)
				}

			case "submit_answer":
				if senderClient != nil {
					h.handleSubmitAnswer(senderClient, data)
				}

			case "player_ready_next":
				if senderClient != nil {
					h.handlePlayerReadyNext(senderClient, data)
				}

			case "request_room_state":
				if senderClient != nil {
					h.handleRoomStateRequest(senderClient)
				}

			case "answer_reveal":
				if senderClient != nil {
					if state, ok := h.RoomStates[message.RoomID]; ok {
						state.QuestionPhase = "answer_reveal"
					}
					h.broadcastToRoom(message.RoomID, message)
				}

			case "end_game":
				if senderClient != nil {
					h.handleEndGame(senderClient)
				}

			default:
				// Fallback: broadcast thô cho tất cả trong phòng
				h.broadcastToRoom(message.RoomID, message)
			}

			h.mu.Unlock()
		}
	}
}
