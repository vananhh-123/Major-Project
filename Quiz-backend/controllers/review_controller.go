package controllers

import (
	"net/http"
	"quiz-backend/config"
	"quiz-backend/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type CreateReviewInput struct {
	QuizID  string `json:"quiz_id" binding:"required"`
	UserID  string `json:"user_id" binding:"required"`
	Rating  int    `json:"rating" binding:"required,min=1,max=5"`
	Comment string `json:"comment"`
}

func CreateReview(c *gin.Context) {
	var input CreateReviewInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	quizID, err := uuid.Parse(input.QuizID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Quiz ID"})
		return
	}

	userID, err := uuid.Parse(input.UserID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid User ID"})
		return
	}

	review := models.Review{
		QuizID:  quizID,
		UserID:  userID,
		Rating:  input.Rating,
		Comment: input.Comment,
	}

	if err := config.DB.Create(&review).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create review"})
		return
	}

	// Preload the user relation to return
	config.DB.Preload("User").First(&review, review.ID)

	c.JSON(http.StatusCreated, gin.H{
		"message": "Review created successfully",
		"review":  review,
	})
}

func GetQuizReviews(c *gin.Context) {
	noStore(c)
	quizID := c.Param("id")

	if _, err := uuid.Parse(quizID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Quiz ID"})
		return
	}

	var reviews []models.Review
	if err := config.DB.Preload("User").Where("quiz_id = ?", quizID).Order("created_at desc").Find(&reviews).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch reviews"})
		return
	}

	c.JSON(http.StatusOK, reviews)
}
func GetReviewsByQuiz(c *gin.Context) {
	quizID := c.Param("id")

	var reviews []models.Review

	if err := config.DB.
		Where("quiz_id = ?", quizID).
		Order("created_at DESC").
		Find(&reviews).Error; err != nil {

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to load reviews",
		})
		return
	}

	c.JSON(http.StatusOK, reviews)
}
