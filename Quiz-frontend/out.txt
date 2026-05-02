package sockets

import (
	"fmt"
	"sync"

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
	UserID string `json:"userId"`
	Name   string `json:"name"`
	Avatar string `json:"avatar"`
	Score  int    `json:"score"`
	IsHost bool   `json:"isHost"`
}

// RoomState lưu trạng thái của 1 phòng chơi
type RoomState struct {
	HostID      string                `json:"hostId"`
	GameMode    string                `json:"gameMode"` // "classic" | "focus"
	QuizID      string                `json:"quizId"`
	GamePin     string                `json:"gamePin"`
	Status      string                `json:"status"`  // "waiting" | "playing" | "ended"
	Players     map[string]PlayerInfo `json:"players"` // userID → PlayerInfo
	QuestionIdx int                   `json:"questionIdx"`
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
		list = append(list, p)
	}
	return list
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
			HostID:   userID,
			GameMode: gameMode,
			GamePin:  gamePin,
			QuizID:   quizID,
			Status:   "waiting",
			Players:  make(map[string]PlayerInfo),
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
	h.RoomStates[roomID].Players[userID] = PlayerInfo{
		UserID: userID,
		Name:   name,
		Avatar: avatar,
		Score:  0,
		IsHost: isHost,
	}

	// Broadcast danh sách player mới cho cả phòng
	h.broadcastToRoom(roomID, Message{
		Action: "player_joined",
		RoomID: roomID,
		UserID: "SYSTEM",
		Data: map[string]interface{}{
			"players":   h.getPlayerList(roomID),
			"newPlayer": h.RoomStates[roomID].Players[userID],
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

	playerName := state.Players[userID].Name
	delete(state.Players, userID)

	h.broadcastToRoom(roomID, Message{
		Action: "player_left",
		RoomID: roomID,
		UserID: "SYSTEM",
		Data: map[string]interface{}{
			"userId":  userID,
			"players": h.getPlayerList(roomID),
		},
	})

	// Xóa phòng nếu trống
	if len(state.Players) == 0 {
		delete(h.RoomStates, roomID)
	}

	fmt.Printf("[ROOM %s] %s left. Remaining: %d\n", roomID, playerName, len(state.Players))
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

	state.Status = "playing"
	state.QuestionIdx = 0

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

	// Cộng điểm cho player
	if player, exists := state.Players[client.UserID]; exists {
		if isCorrect {
			player.Score += int(points)
			state.Players[client.UserID] = player
		}
	}

	// Gửi kết quả câu trả lời riêng cho player đó
	h.sendToClient(roomID, client.UserID, Message{
		Action: "answer_result",
		RoomID: roomID,
		UserID: "SYSTEM",
		Data: map[string]interface{}{
			"isCorrect":   isCorrect,
			"points":      int(points),
			"questionIdx": int(questionIdx),
			"totalScore":  state.Players[client.UserID].Score,
		},
	})

	// Broadcast bảng điểm cập nhật cho cả phòng
	h.broadcastToRoom(roomID, Message{
		Action: "score_update",
		RoomID: roomID,
		UserID: "SYSTEM",
		Data:   h.getPlayerList(roomID),
	})

	fmt.Printf("[ROOM %s] %s answered Q%v. Correct: %v\n", roomID, client.UserID, int(questionIdx), isCorrect)
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
