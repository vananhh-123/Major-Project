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
		// Multi players can reach the result screen after the room is already cleaned up.
		// In that case, keep the result save and fall back to a nil room_id.
		roomUUID = nil
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

	if req.UserID != nil && req.QuizID != nil {
		var existingResult models.Result
		query := config.DB.Where("user_id = ? AND quiz_id = ?", req.UserID, req.QuizID)

		if roomUUID != nil {
			query = query.Where("room_id = ?", roomUUID)
		} else if modePtr != nil && *modePtr == "solo" {
			query = query.Where("room_id IS NULL")
		} else if modePtr != nil && *modePtr == "multi" {
			query = query.Where("mode = ? OR (mode IS NULL AND room_id IS NOT NULL)", "multi")
		}

		if err := query.First(&existingResult).Error; err == nil {
			// Keep solo records at the highest score, but allow multi records to be refreshed.
			if modePtr != nil && *modePtr == "solo" {
				if req.Score > existingResult.Score {
					existingResult.Score = req.Score
					existingResult.CorrectAnswers = req.CorrectAnswers
				}
			} else {
				existingResult.Score = req.Score
				existingResult.CorrectAnswers = req.CorrectAnswers
			}

			existingResult.RoomID = roomUUID
			existingResult.Mode = modePtr
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
