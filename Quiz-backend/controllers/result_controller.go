package controllers

import (
	"net/http"
	"quiz-backend/config"
	"quiz-backend/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type SubmitResultRequest struct {
	UserID         *uuid.UUID `json:"user_id"`
	QuizID         *uuid.UUID `json:"quiz_id"`
	RoomID         *string    `json:"room_id"`
	Mode           *string    `json:"mode"`
	Score          int        `json:"score"`
	CorrectAnswers int        `json:"correct_answers"`
}

func resolveRoomUUID(roomRef *string) (*uuid.UUID, error) {
	if roomRef == nil || *roomRef == "" {
		return nil, nil
	}

	if parsed, err := uuid.Parse(*roomRef); err == nil {
		return &parsed, nil
	}

	var room struct {
		ID uuid.UUID `gorm:"column:id"`
	}
	if err := config.DB.Table("rooms").Select("id").Where("room_code = ?", *roomRef).Take(&room).Error; err != nil {
		return nil, err
	}

	return &room.ID, nil
}

func SubmitResult(c *gin.Context) {
	var req SubmitResultRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	roomUUID, err := resolveRoomUUID(req.RoomID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid room_id"})
		return
	}

	// Determine mode: prefer explicit field, else infer from room presence
	var modePtr *string
	if req.Mode != nil {
		modePtr = req.Mode
	} else {
		m := "solo"
		if roomUUID != nil {
			m = "multi"
		}
		modePtr = &m
	}

	// If this is a solo play, try updating existing solo result (user+quiz with no room)
	if modePtr != nil && *modePtr == "solo" && req.UserID != nil && req.QuizID != nil {
		var existingResult models.Result
		err := config.DB.Where("user_id = ? AND quiz_id = ? AND room_id IS NULL", req.UserID, req.QuizID).First(&existingResult).Error
		if err == nil {
			// Found existing record. Update score if higher
			if req.Score > existingResult.Score {
				existingResult.Score = req.Score
				existingResult.CorrectAnswers = req.CorrectAnswers
			}
			solo := "solo"
			existingResult.Mode = &solo
			if err := config.DB.Save(&existingResult).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update result"})
				return
			}
			c.JSON(http.StatusOK, existingResult)
			return
		}
	}

	// Otherwise create a new result row
	result := models.Result{
		UserID:         req.UserID,
		QuizID:         req.QuizID,
		RoomID:         roomUUID,
		Score:          req.Score,
		CorrectAnswers: req.CorrectAnswers,
		Mode:           modePtr,
	}

	if err := config.DB.Create(&result).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save result"})
		return
	}

	c.JSON(http.StatusOK, result)
}
