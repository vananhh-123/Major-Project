package controllers

import (
	"encoding/json"
	"net/http"
	"quiz-backend/config"
	"quiz-backend/models"

	"github.com/google/uuid"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func noStore(c *gin.Context) {
	c.Header("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
	c.Header("Pragma", "no-cache")
	c.Header("Expires", "0")
}

type CreateQuizInput struct {
	Title       string                `json:"title"`
	Description string                `json:"description"`
	Level       string                `json:"level"`
	Visibility  string                `json:"visibility"`
	CoverImage  string                `json:"cover_image"`
	UserID      string                `json:"user_id"` // Receive user_id from frontend since no token middleware
	Questions   []CreateQuestionInput `json:"questions"`
}

type AnswerInput struct {
	Text      string `json:"text"`
	IsCorrect bool   `json:"is_correct"`
}

type CreateQuestionInput struct {
	Content         string        `json:"content"`
	TimeLimit       int           `json:"time_limit"`
	Points          int           `json:"points"`
	MultipleCorrect bool          `json:"multiple_correct"`
	Answers         []AnswerInput `json:"answers"`
}

func CreateQuiz(c *gin.Context) {
	var input CreateQuizInput

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

	if input.Title == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Title is required"})
		return
	}

	var createdBy *uuid.UUID = nil
	if input.UserID != "" {
		parsedUUID, err := uuid.Parse(input.UserID)
		if err == nil {
			createdBy = &parsedUUID
		}
	}

	tx := config.DB.Begin()

	quiz := models.Quiz{
		Title:       input.Title,
		Description: input.Description,
		Level:       input.Level,
		Visibility:  input.Visibility,
		CoverImage:  input.CoverImage,
		CreatedBy:   createdBy,
	}

	if err := tx.Create(&quiz).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not create quiz"})
		return
	}

	var questions []models.Question
	for i, qData := range input.Questions {
		optionsJSON, err := json.Marshal(qData.Answers)
		if err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not marshal answers"})
			return
		}

		q := models.Question{
			QuizID:          quiz.ID,
			Content:         qData.Content,
			TimeLimit:       qData.TimeLimit,
			Points:          qData.Points,
			MultipleCorrect: qData.MultipleCorrect,
			Options:         string(optionsJSON),
			OrderIndex:      i,
		}
		questions = append(questions, q)
	}

	if len(questions) > 0 {
		if err := tx.Create(&questions).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not create questions", "details": err.Error()})
			return
		}
	}

	tx.Commit()

	c.JSON(http.StatusCreated, gin.H{
		"message": "Quiz created successfully",
		"quiz":    quiz,
	})
}

func GetQuizzes(c *gin.Context) {
	var quizzes []models.Quiz
	if err := config.DB.Preload("Creator").Preload("Questions", func(db *gorm.DB) *gorm.DB { return db.Order("order_index asc") }).Preload("Reviews").Order("created_at desc").Find(&quizzes).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch quizzes"})
		return
	}

	noStore(c)
	// Recompute plays from actual results rows so UI never depends on stale denormalized counts.
	quizIDs := make([]uuid.UUID, 0, len(quizzes))
	for _, quiz := range quizzes {
		quizIDs = append(quizIDs, quiz.ID)
	}

	playsByQuiz := map[uuid.UUID]int{}
	if len(quizIDs) > 0 {
		var rows []struct {
			QuizID uuid.UUID `gorm:"column:quiz_id"`
			Count  int       `gorm:"column:count"`
		}
		if err := config.DB.Table("results").Select("quiz_id, COUNT(*) as count").Where("quiz_id IN ?", quizIDs).Group("quiz_id").Scan(&rows).Error; err == nil {
			for _, row := range rows {
				playsByQuiz[row.QuizID] = row.Count
			}
		}
	}

	for i := range quizzes {
		if count, ok := playsByQuiz[quizzes[i].ID]; ok {
			quizzes[i].Plays = count
		} else {
			quizzes[i].Plays = 0
		}
	}

	c.JSON(http.StatusOK, quizzes)
}

func GetQuiz(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID is required"})
		return
	}

	noStore(c)
	var quiz models.Quiz

	if err := config.DB.Preload("Creator").Preload("Questions", func(db *gorm.DB) *gorm.DB { return db.Order("order_index asc") }).Preload("Reviews").First(&quiz, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Quiz not found"})
		return
	}

	// Recompute plays from actual result rows for this quiz.
	var playCount int64
	config.DB.Table("results").Where("quiz_id = ?", quiz.ID).Count(&playCount)
	quiz.Plays = int(playCount)

	c.JSON(http.StatusOK, quiz)
}

func UpdateQuizVisibility(c *gin.Context) {
	id := c.Param("id")
	var input struct {
		Visibility string `json:"visibility"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	var quiz models.Quiz
	if err := config.DB.First(&quiz, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Quiz not found"})
		return
	}

	quiz.Visibility = input.Visibility
	config.DB.Save(&quiz)

	c.JSON(http.StatusOK, gin.H{"message": "Visibility updated", "visibility": quiz.Visibility})
}

func DeleteQuiz(c *gin.Context) {
	id := c.Param("id")

	var quiz models.Quiz
	if err := config.DB.First(&quiz, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Quiz not found"})
		return
	}

	if err := config.DB.Delete(&quiz).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete quiz"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Quiz deleted successfully"})
}

func UpdateQuiz(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID is required"})
		return
	}

	var input CreateQuizInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

	if input.Title == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Title is required"})
		return
	}

	tx := config.DB.Begin()

	var quiz models.Quiz
	if err := tx.First(&quiz, "id = ?", id).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusNotFound, gin.H{"error": "Quiz not found"})
		return
	}

	quiz.Title = input.Title
	quiz.Description = input.Description
	quiz.Level = input.Level
	quiz.Visibility = input.Visibility
	quiz.CoverImage = input.CoverImage

	if err := tx.Save(&quiz).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update quiz"})
		return
	}

	// Delete old questions
	if err := tx.Where("quiz_id = ?", quiz.ID).Delete(&models.Question{}).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove old questions"})
		return
	}

	// Add new questions
	for i, qInput := range input.Questions {
		ansBytes, _ := json.Marshal(qInput.Answers)

		question := models.Question{
			QuizID:          quiz.ID,
			Content:         qInput.Content,
			Options:         string(ansBytes),
			TimeLimit:       qInput.TimeLimit,
			Points:          qInput.Points,
			MultipleCorrect: qInput.MultipleCorrect,
			OrderIndex:      i,
		}

		if err := tx.Create(&question).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to recreate questions"})
			return
		}
	}

	tx.Commit()

	c.JSON(http.StatusOK, gin.H{
		"message": "Quiz updated successfully",
		"quiz":    quiz,
	})
}
