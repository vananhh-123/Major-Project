package controllers

import (
	"net/http"
	"quiz-backend/config"
	"quiz-backend/models"
	"strings"

	"github.com/gin-gonic/gin"
)

type AdminUserResponse struct {
	ID         string  `json:"id"`
	Name       string  `json:"name"`
	Email      string  `json:"email"`
	Avatar     string  `json:"avatar"`
	Role       string  `json:"role"`
	Status     string  `json:"status"`
	Quizzes    int64   `json:"quizzes"`
	SoloGames  int64   `json:"soloGames"`
	MultiGames int64   `json:"multiGames"`
	Score      float64 `json:"score"`
	Joined     string  `json:"joined"`
}

func GetAdminUsers(c *gin.Context) {

	var users []models.User
	config.DB.Find(&users)

	var response []AdminUserResponse

	for _, user := range users {

		var quizzes int64
		config.DB.
			Model(&models.Quiz{}).
			Where("created_by = ?", user.ID).
			Count(&quizzes)

		var soloGames int64
		config.DB.
			Model(&models.Result{}).
			Where("user_id = ? AND mode = ?", user.ID, "solo").
			Count(&soloGames)

		var multiGames int64
		config.DB.
			Model(&models.Result{}).
			Where("user_id = ? AND mode = ?", user.ID, "multi").
			Count(&multiGames)

		var results []models.Result

		config.DB.
			Where("user_id = ?", user.ID).
			Find(&results)

		totalPercent := 0.0
		countQuiz := 0

		for _, r := range results {

			var totalQuestions int64

			config.DB.
				Model(&models.Question{}).
				Where("quiz_id = ?", r.QuizID).
				Count(&totalQuestions)

			if totalQuestions > 0 {
				totalPercent +=
					(float64(r.CorrectAnswers) /
						float64(totalQuestions)) * 100

				countQuiz++
			}
		}

		avgScore := 0.0

		if countQuiz > 0 {
			avgScore = totalPercent / float64(countQuiz)
		}

		avatar := ""
		if user.Avatar != nil {
			avatar = *user.Avatar
		}

		response = append(response, AdminUserResponse{
			ID:         user.ID.String(),
			Name:       user.Username,
			Email:      user.Email,
			Avatar:     avatar,
			Role:       capitalize(user.Role),
			Status:     capitalize(user.Status),
			Quizzes:    quizzes,
			SoloGames:  soloGames,
			MultiGames: multiGames,
			Score:      avgScore,
			Joined:     user.CreatedAt.Format("02 Jan 2006"),
		})
	}

	c.JSON(http.StatusOK, response)
}

func capitalize(s string) string {
	if len(s) == 0 {
		return s
	}

	return strings.ToUpper(s[:1]) + s[1:]
}

func GetAdminUserStats(c *gin.Context) {

	var total int64
	var active int64
	var admin int64
	var blocked int64

	config.DB.Model(&models.User{}).Count(&total)

	config.DB.Model(&models.User{}).
		Where("status = ?", "active").
		Count(&active)

	config.DB.Model(&models.User{}).
		Where("role = ?", "admin").
		Count(&admin)

	config.DB.Model(&models.User{}).
		Where("status = ?", "blocked").
		Count(&blocked)

	c.JSON(http.StatusOK, gin.H{
		"totalUsers":   total,
		"activeUsers":  active,
		"adminUsers":   admin,
		"blockedUsers": blocked,
	})
}

func ToggleUserStatus(c *gin.Context) {
	id := c.Param("id")

	var user models.User

	if err := config.DB.First(&user, "id = ?", id).Error; err != nil {
		c.JSON(404, gin.H{"error": "User not found"})
		return
	}

	status := strings.ToLower(user.Status)

	if status == "active" {
		user.Status = "blocked"
	} else {
		user.Status = "active"
	}

	if err := config.DB.Save(&user).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to update user status"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "User status updated",
		"id":      user.ID,
		"status":  user.Status,
	})
}

type AdminReviewResponse struct {
	ID        string `json:"id"`
	User      string `json:"user"`
	Email     string `json:"email"`
	Avatar    string `json:"avatar"`
	QuizID    string `json:"quizId"`
	QuizTitle string `json:"quizTitle"`
	Content   string `json:"content"`
	Rating    int    `json:"rating"`
	CreatedAt string `json:"createdAt"`
}

func GetAdminReviews(c *gin.Context) {
	var reviews []models.Review

	if err := config.DB.
		Preload("User").
		Preload("Quiz").
		Order("created_at desc").
		Find(&reviews).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch reviews"})
		return
	}

	var response []AdminReviewResponse

	for _, r := range reviews {
		userName := "Anonymous User"
		email := ""
		avatar := ""

		if r.User != nil {
			userName = r.User.Username
			email = r.User.Email
			if r.User.Avatar != nil {
				avatar = *r.User.Avatar
			}
		}

		quizTitle := "Unknown Quiz"
		if r.Quiz != nil {
			quizTitle = r.Quiz.Title
		}

		response = append(response, AdminReviewResponse{
			ID:        r.ID.String(),
			User:      userName,
			Email:     email,
			Avatar:    avatar,
			QuizID:    r.QuizID.String(),
			QuizTitle: quizTitle,
			Content:   r.Comment,
			Rating:    r.Rating,
			CreatedAt: r.CreatedAt.Format("02 Jan 2006"),
		})
	}

	c.JSON(http.StatusOK, response)
}

func DeleteAdminReview(c *gin.Context) {
	id := c.Param("id")

	if err := config.DB.Delete(&models.Review{}, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete review"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Review deleted"})
}
