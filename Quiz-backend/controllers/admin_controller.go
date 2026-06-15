package controllers

import (
	"net/http"
	"quiz-backend/config"
	"quiz-backend/models"
	"sort"
	"strconv"
	"strings"
	"time"

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

type AnalyticsResponse struct {
	TotalUsers   int64 `json:"totalUsers"`
	TotalQuizzes int64 `json:"totalQuizzes"`
	TotalResults int64 `json:"totalResults"`
	TotalReviews int64 `json:"totalReviews"`

	SoloGames  int64 `json:"soloGames"`
	MultiGames int64 `json:"multiGames"`
}

func GetAnalytics(c *gin.Context) {
	rangeParam := c.DefaultQuery("range", "30")

	var users int64
	var quizzes int64
	var results int64
	var reviews int64
	var solo int64
	var multi int64

	if rangeParam == "all" {
		config.DB.Model(&models.User{}).Count(&users)
		config.DB.Model(&models.Quiz{}).Count(&quizzes)
		config.DB.Model(&models.Result{}).Count(&results)
		config.DB.Model(&models.Review{}).Count(&reviews)

		config.DB.Model(&models.Result{}).
			Where("mode = ? OR (mode IS NULL AND room_id IS NULL)", "solo").
			Count(&solo)

		config.DB.Model(&models.Result{}).
			Where("mode = ? OR (mode IS NULL AND room_id IS NOT NULL)", "multi").
			Count(&multi)

		c.JSON(http.StatusOK, AnalyticsResponse{
			TotalUsers:   users,
			TotalQuizzes: quizzes,
			TotalResults: results,
			TotalReviews: reviews,
			SoloGames:    solo,
			MultiGames:   multi,
		})
		return
	}

	if rangeParam == "today" {
		config.DB.Model(&models.User{}).Where("created_at >= CURRENT_DATE").Count(&users)
		config.DB.Model(&models.Quiz{}).Where("created_at >= CURRENT_DATE").Count(&quizzes)
		config.DB.Model(&models.Result{}).Where("created_at >= CURRENT_DATE").Count(&results)
		config.DB.Model(&models.Review{}).Where("created_at >= CURRENT_DATE").Count(&reviews)

		config.DB.Model(&models.Result{}).
			Where("created_at >= CURRENT_DATE").
			Where("mode = ? OR (mode IS NULL AND room_id IS NULL)", "solo").
			Count(&solo)

		config.DB.Model(&models.Result{}).
			Where("created_at >= CURRENT_DATE").
			Where("mode = ? OR (mode IS NULL AND room_id IS NOT NULL)", "multi").
			Count(&multi)
	} else {
		days := "30"

		if rangeParam == "7" {
			days = "7"
		}

		interval := days + " days"

		config.DB.Model(&models.User{}).Where("created_at >= NOW() - (?::interval)", interval).Count(&users)
		config.DB.Model(&models.Quiz{}).Where("created_at >= NOW() - (?::interval)", interval).Count(&quizzes)
		config.DB.Model(&models.Result{}).Where("created_at >= NOW() - (?::interval)", interval).Count(&results)
		config.DB.Model(&models.Review{}).Where("created_at >= NOW() - (?::interval)", interval).Count(&reviews)

		config.DB.Model(&models.Result{}).
			Where("created_at >= NOW() - (?::interval)", interval).
			Where("mode = ? OR (mode IS NULL AND room_id IS NULL)", "solo").
			Count(&solo)

		config.DB.Model(&models.Result{}).
			Where("created_at >= NOW() - (?::interval)", interval).
			Where("mode = ? OR (mode IS NULL AND room_id IS NOT NULL)", "multi").
			Count(&multi)
	}

	c.JSON(http.StatusOK, AnalyticsResponse{
		TotalUsers:   users,
		TotalQuizzes: quizzes,
		TotalResults: results,
		TotalReviews: reviews,
		SoloGames:    solo,
		MultiGames:   multi,
	})
}

type AdminRoomResponse struct {
	ID        string `json:"id"`
	RoomCode  string `json:"roomCode"`
	QuizTitle string `json:"quizTitle"`
	Host      string `json:"host"`
	Players   int64  `json:"players"`
	Status    string `json:"status"`
	CreatedAt string `json:"createdAt"`
}

func GetAdminRooms(c *gin.Context) {
	var rooms []models.Room

	if err := config.DB.
		Preload("Quiz").
		Preload("Host").
		Order("created_at desc").
		Find(&rooms).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch rooms",
		})
		return
	}

	response := make([]AdminRoomResponse, 0)

	for _, room := range rooms {
		var playerCount int64

		config.DB.Model(&models.Player{}).
			Where("room_id = ?", room.ID).
			Count(&playerCount)

		quizTitle := "Unknown Quiz"
		if room.Quiz != nil {
			quizTitle = room.Quiz.Title
		}

		hostName := "Unknown Host"
		if room.Host != nil {
			hostName = room.Host.Username
		}

		response = append(response, AdminRoomResponse{
			ID:        room.ID.String(),
			RoomCode:  room.RoomCode,
			QuizTitle: quizTitle,
			Host:      hostName,
			Players:   playerCount,
			Status:    room.Status,
			CreatedAt: room.CreatedAt.Format("02 Jan 2006"),
		})
	}

	c.JSON(http.StatusOK, response)
}

type AdminLogResponse struct {
	ID          string `json:"id"`
	Type        string `json:"type"`
	Level       string `json:"level"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Actor       string `json:"actor"`
	Time        string `json:"time"`
	Date        string `json:"date"`
	Icon        string `json:"icon"`
	CreatedAt   string `json:"createdAt"`
}

func GetAdminLogs(c *gin.Context) {
	var response []AdminLogResponse

	var users []models.User
	config.DB.Order("created_at desc").Limit(20).Find(&users)

	for i, user := range users {
		level := "Success"
		title := "User account active"
		icon := "person"

		if strings.ToLower(user.Status) == "blocked" {
			level = "Warning"
			title = "User blocked"
			icon = "block"
		}

		response = append(response, AdminLogResponse{
			ID:          "USR-" + user.ID.String()[:8],
			Type:        "User",
			Level:       level,
			Title:       title,
			Description: user.Email + " is currently " + user.Status + " in the system.",
			Actor:       user.Username,
			Time:        user.CreatedAt.Format("03:04 PM"),
			Date:        user.CreatedAt.Format("02 Jan 2006"),
			Icon:        icon,
			CreatedAt:   user.CreatedAt.Format(time.RFC3339),
		})

		_ = i
	}

	var quizzes []models.Quiz
	config.DB.Preload("Creator").Order("created_at desc").Limit(20).Find(&quizzes)

	for _, quiz := range quizzes {
		actor := "Unknown Creator"
		if quiz.Creator != nil {
			actor = quiz.Creator.Username
		}

		response = append(response, AdminLogResponse{
			ID:          "QUIZ-" + quiz.ID.String()[:8],
			Type:        "Quiz",
			Level:       "Info",
			Title:       "Quiz created",
			Description: quiz.Title + " was created and is currently " + quiz.Visibility + ".",
			Actor:       actor,
			Time:        quiz.CreatedAt.Format("03:04 PM"),
			Date:        quiz.CreatedAt.Format("02 Jan 2006"),
			Icon:        "quiz",
			CreatedAt:   quiz.CreatedAt.Format(time.RFC3339),
		})
	}

	var rooms []models.Room
	config.DB.Preload("Host").Preload("Quiz").Order("created_at desc").Limit(20).Find(&rooms)

	for _, room := range rooms {
		host := "Unknown Host"
		quizTitle := "Unknown Quiz"

		if room.Host != nil {
			host = room.Host.Username
		}

		if room.Quiz != nil {
			quizTitle = room.Quiz.Title
		}

		level := "Warning"
		title := "Multiplayer room waiting"
		icon := "hourglass_top"

		status := strings.ToLower(room.Status)

		if status == "started" || status == "playing" {
			level = "Info"
			title = "Multiplayer room started"
			icon = "sports_esports"
		}

		if status == "ended" || status == "finished" {
			level = "Success"
			title = "Multiplayer room ended"
			icon = "flag"
		}

		var playerCount int64
		config.DB.Model(&models.Player{}).Where("room_id = ?", room.ID).Count(&playerCount)

		response = append(response, AdminLogResponse{
			ID:          "ROOM-" + room.ID.String()[:8],
			Type:        "Room",
			Level:       level,
			Title:       title,
			Description: "Room PIN " + room.RoomCode + " for " + quizTitle + " has " + strconv.FormatInt(playerCount, 10) + " players.",
			Actor:       host,
			Time:        room.CreatedAt.Format("03:04 PM"),
			Date:        room.CreatedAt.Format("02 Jan 2006"),
			Icon:        icon,
			CreatedAt:   room.CreatedAt.Format(time.RFC3339),
		})
	}

	var reviews []models.Review
	config.DB.Preload("User").Preload("Quiz").Order("created_at desc").Limit(20).Find(&reviews)

	for _, review := range reviews {
		user := "Anonymous User"
		quizTitle := "Unknown Quiz"

		if review.User != nil {
			user = review.User.Username
		}

		if review.Quiz != nil {
			quizTitle = review.Quiz.Title
		}

		level := "Warning"
		if review.Rating >= 4 {
			level = "Success"
		}

		response = append(response, AdminLogResponse{
			ID:          "REV-" + review.ID.String()[:8],
			Type:        "Review",
			Level:       level,
			Title:       "Review submitted",
			Description: user + " rated " + quizTitle + " " + strconv.Itoa(review.Rating) + " stars.",
			Actor:       user,
			Time:        review.CreatedAt.Format("03:04 PM"),
			Date:        review.CreatedAt.Format("02 Jan 2006"),
			Icon:        "rate_review",
			CreatedAt:   review.CreatedAt.Format(time.RFC3339),
		})
	}

	response = append(response, AdminLogResponse{
		ID:          "SYS-001",
		Type:        "System",
		Level:       "Info",
		Title:       "Admin dashboard connected",
		Description: "Admin modules are connected to backend APIs.",
		Actor:       "System",
		Time:        "Live",
		Date:        "Today",
		Icon:        "settings",
		CreatedAt:   time.Now().Format(time.RFC3339),
	})

	sort.Slice(response, func(i, j int) bool {
		return response[i].CreatedAt > response[j].CreatedAt
	})

	c.JSON(http.StatusOK, response)
}
