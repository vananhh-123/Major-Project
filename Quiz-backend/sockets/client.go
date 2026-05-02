package sockets

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	// Cho phép mọi Origin, không bị CORS block
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

// Xử lý gửi tin nhắn từ Hub tới Client
func (c *Client) writePump() {
	defer func() {
		c.Conn.Close()
	}()
	for message := range c.Send {
		err := c.Conn.WriteJSON(message)
		if err != nil {
			log.Println("writePump error:", err)
			return
		}
	}
}

// Xử lý nhận tin nhắn từ Client truyền tới Hub
func (c *Client) readPump(hub *Hub) {
	defer func() {
		hub.Unregister <- c
		c.Conn.Close()
	}()
	for {
		var msg Message
		err := c.Conn.ReadJSON(&msg)
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("error: %v", err)
			}
			break
		}

		// Gắn thêm UserID và RoomID vào tin nhắn nội bộ
		msg.RoomID = c.RoomID
		msg.UserID = c.UserID

		// Đẩy vào kênh phát sóng của Hub
		hub.Broadcast <- msg
	}
}

// Handler kết nối WebSocket cho từng request từ Angular
func ServeWs(hub *Hub, c *gin.Context) {
	// Lấy UserID và RoomID từ tham số đường dẫn (Query Prams)
	roomID := c.Query("roomId")
	userID := c.Query("userId")

	if roomID == "" || userID == "" {
		c.JSON(400, gin.H{"error": "Thiếu thông tin RoomID / UserID"})
		return
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Println("Lỗi Upgrade WebSocket:", err)
		return
	}

	client := &Client{
		Conn:   conn,
		RoomID: roomID,
		UserID: userID,
		Send:   make(chan Message, 256),
	}

	// Đăng ký người chơi này vào Phòng của Hub
	hub.Register <- client

	// Bắt đầu 2 luồng gửi / nhận đồng thời
	go client.readPump(hub)
	go client.writePump()

	// Gửi tin nhắn chào mừng cho phòng là có người mới join
	welcomeMsg := Message{
		Action: "system_message",
		RoomID: roomID,
		UserID: "SYSTEM",
		Data:   userID + " đã tham gia phòng",
	}
	hub.Broadcast <- welcomeMsg
}

