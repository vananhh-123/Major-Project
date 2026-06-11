package controllers

import (
	"net/http"
	"quiz-backend/config"
	"quiz-backend/models"

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

	hostUUID, _ := uuid.Parse(req.HostID)
	quizUUID, _ := uuid.Parse(req.QuizID)

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

	userUUID, _ := uuid.Parse(req.UserID)

	player := models.Player{
		RoomID: room.ID,
		UserID: userUUID,
		Name:   req.Name,
		Score:  0,
	}

	config.DB.Create(&player)

	c.JSON(http.StatusOK, player)
}
