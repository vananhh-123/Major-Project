package controllers

import (
	"net/http"
	"quiz-backend/config"
	"quiz-backend/models"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type CreateRoomRequest struct {
	RoomCode string `json:"room_code"`
	HostID   string `json:"host_id"`
	QuizID   string `json:"quiz_id"`
	GameMode string `json:"game_mode"`
}

func CreateRoom(c *gin.Context) {
	var req CreateRoomRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	hostUUID, err := uuid.Parse(req.HostID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid host_id"})
		return
	}

	quizUUID, err := uuid.Parse(req.QuizID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid quiz_id"})
		return
	}

	var existingRoom models.Room
	if err := config.DB.
		Where("room_code = ?", req.RoomCode).
		First(&existingRoom).Error; err == nil {

		existingRoom.HostID = hostUUID
		existingRoom.QuizID = quizUUID
		existingRoom.Status = "waiting"
		existingRoom.GameMode = &req.GameMode
		existingRoom.CreatedAt = time.Now()

		if err := config.DB.Save(&existingRoom).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, existingRoom)
		return
	}

	room := models.Room{
		RoomCode: req.RoomCode,
		HostID:   hostUUID,
		QuizID:   quizUUID,
		Status:   "waiting",
		GameMode: &req.GameMode,
	}

	if err := config.DB.Create(&room).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, room)
}

type JoinRoomRequest struct {
	RoomCode string `json:"room_code"`
	UserID   string `json:"user_id"`
	Name     string `json:"name"`
}

func JoinRoom(c *gin.Context) {
	var req JoinRoomRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	var room models.Room

	if err := config.DB.
		Where("room_code = ?", req.RoomCode).
		First(&room).Error; err != nil {

		c.JSON(http.StatusNotFound, gin.H{
			"error": "Room not found",
		})
		return
	}

	if room.Status == "finished" || room.Status == "closed" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Room is already closed",
		})
		return
	}

	var userUUID *uuid.UUID

	if req.UserID != "" {
		parsedUUID, err := uuid.Parse(req.UserID)
		if err == nil {
			userUUID = &parsedUUID
		}
	}

	player := models.Player{
		RoomID: room.ID,
		UserID: *userUUID,
		Name:   req.Name,
		Score:  0,
	}

	if err := config.DB.Create(&player).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to join room",
		})
		return
	}

	c.JSON(http.StatusOK, player)
}

type UpdateRoomStatusRequest struct {
	Status string `json:"status"`
}

func UpdateRoomStatus(c *gin.Context) {
	roomCode := c.Param("roomCode")

	var req UpdateRoomStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	status := normalizeRoomStatus(req.Status)

	if status == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid room status",
		})
		return
	}

	var room models.Room

	if err := config.DB.
		Where("room_code = ?", roomCode).
		First(&room).Error; err != nil {

		c.JSON(http.StatusNotFound, gin.H{
			"error": "Room not found",
		})
		return
	}

	room.Status = status

	if err := config.DB.Save(&room).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to update room status",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":   "Room status updated",
		"room_code": room.RoomCode,
		"status":    room.Status,
	})
}

func CloseExpiredRooms(c *gin.Context) {
	cutoff := time.Now().Add(-2 * time.Hour)

	if err := config.DB.
		Model(&models.Room{}).
		Where("status = ? AND created_at < ?", "waiting", cutoff).
		Update("status", "closed").Error; err != nil {

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to close expired rooms",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Expired waiting rooms closed",
	})
}

func normalizeRoomStatus(value string) string {
	switch value {
	case "waiting", "Waiting":
		return "waiting"
	case "playing", "started", "Playing", "Started":
		return "playing"
	case "finished", "ended", "Finished", "Ended":
		return "finished"
	case "closed", "expired", "Closed", "Expired":
		return "closed"
	default:
		return ""
	}
}
