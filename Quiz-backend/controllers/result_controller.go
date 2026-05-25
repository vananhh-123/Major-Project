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
	IsSolo         bool       `json:"is_solo"`
	Score          int        `json:"score"`
	CorrectAnswers int        `json:"correct_answers"`
}

func SubmitResult(c *gin.Context) {
	var req SubmitResultRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	// Logic for Solo Play: Override max score and increment play count
	if req.IsSolo && req.UserID != nil && req.QuizID != nil {
		var existingResult models.Result
		// Check if a solo result already exists for this user and quiz
		err := config.DB.Where("user_id = ? AND quiz_id = ? AND room_id IS NULL", req.UserID, req.QuizID).First(&existingResult).Error

		if err == nil {
			// Found existing record. Increment play count.
			existingResult.PlayCount += 1

			// Calculate fair points (Override if new score is higher)
			if req.Score > existingResult.Score {
				existingResult.Score = req.Score
				existingResult.CorrectAnswers = req.CorrectAnswers
			}

			if err := config.DB.Save(&existingResult).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update result"})
				return
			}
			c.JSON(http.StatusOK, existingResult)
			return
		}
	}

	result := models.Result{
		UserID:         req.UserID,
		QuizID:         req.QuizID,
		Score:          req.Score,
		CorrectAnswers: req.CorrectAnswers,
		PlayCount:      1,
	}

	if err := config.DB.Create(&result).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save result"})
		return
	}

	c.JSON(http.StatusOK, result)
}
