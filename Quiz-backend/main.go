package main

import (
	"log"
	"quiz-backend/config"
	"quiz-backend/controllers"
	"quiz-backend/models"
	"quiz-backend/sockets"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {

	err := godotenv.Load()
	if err != nil {
		log.Fatal("Error loading .env file")
	}

	// =========================
	// WebSocket Hub
	// =========================
	hub := sockets.NewHub()
	go hub.Run()

	// =========================
	// Gin
	// =========================
	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowAllOrigins: true,
		AllowMethods: []string{
			"GET",
			"POST",
			"PUT",
			"PATCH",
			"DELETE",
			"OPTIONS",
		},
		AllowHeaders: []string{
			"Origin",
			"Content-Type",
			"Accept",
			"Authorization",
		},
		ExposeHeaders: []string{
			"Content-Length",
		},
		MaxAge: 12 * time.Hour,
	}))

	// =========================
	// Database
	// =========================
	config.ConnectDatabase()

	config.DB.AutoMigrate(
		&models.User{},
		&models.Quiz{},
		&models.Question{},
		&models.Result{},
		&models.Review{},
		&models.Room{},
		&models.Player{},
	)

	// =========================
	// Public APIs
	// =========================
	r.GET("/api/leaderboard", controllers.GetLeaderboard)
	r.GET("/api/network-info", controllers.GetNetworkInfo)

	// =========================
	// Auth
	// =========================
	auth := r.Group("/auth")
	{
		auth.POST("/register", controllers.Register)
		auth.POST("/login", controllers.Login)
		auth.POST("/google", controllers.GoogleLogin)
		auth.PATCH("/profile", controllers.UpdateProfile)
	}

	// =========================
	// Main API
	// =========================
	api := r.Group("/api")
	{
		// =====================
		// WebSocket
		// =====================
		api.GET("/ws", func(c *gin.Context) {
			sockets.ServeWs(hub, c)
		})

		// =====================
		// Rooms
		// =====================
		api.POST("/rooms", controllers.CreateRoom)
		api.POST("/rooms/join", controllers.JoinRoom)
		api.PATCH("/rooms/:roomCode/status", controllers.UpdateRoomStatus)
		api.PATCH("/rooms/close-expired", controllers.CloseExpiredRooms)

		// =====================
		// Quizzes
		// =====================
		api.POST("/quizzes", controllers.CreateQuiz)
		api.GET("/quizzes", controllers.GetQuizzes)
		api.GET("/quizzes/:id", controllers.GetQuiz)
		api.PUT("/quizzes/:id", controllers.UpdateQuiz)
		api.PATCH("/quizzes/:id/visibility", controllers.UpdateQuizVisibility)
		api.DELETE("/quizzes/:id", controllers.DeleteQuiz)

		// =====================
		// Reviews
		// =====================
		api.GET("/quizzes/:id/reviews", controllers.GetReviewsByQuiz)
		api.POST("/reviews", controllers.CreateReview)

		// =====================
		// Results
		// =====================
		api.POST("/results", controllers.SubmitResult)

		// =====================
		// Stats
		// =====================
		api.GET("/stats/:id", controllers.GetUserStats)
		api.GET("/users/:id/history", controllers.GetUserHistory)

		// =====================
		// Admin Dashboard
		// =====================
		api.GET("/admin/dashboard", controllers.GetAdminDashboard)

		// =====================
		// Admin Users
		// =====================
		api.GET("/admin/users", controllers.GetAdminUsers)
		api.GET("/admin/users/stats", controllers.GetAdminUserStats)
		api.PATCH("/admin/users/:id/status", controllers.ToggleUserStatus)

		// =====================
		// Admin Quiz Bank
		// =====================
		api.GET("/admin/quizzes", controllers.GetAdminQuizzes)

		// =====================
		// Admin Reviews
		// =====================
		api.GET("/admin/reviews", controllers.GetAdminReviews)
		api.DELETE("/admin/reviews/:id", controllers.DeleteAdminReview)

		// =====================
		// Admin Analytics
		// =====================
		api.GET("/admin/analytics", controllers.GetAnalytics)

		// =====================
		// Admin Multiplayer Rooms
		// =====================
		api.GET("/admin/rooms", controllers.GetAdminRooms)

		// =====================
		// Admin Logs
		// =====================
		api.GET("/admin/logs", controllers.GetAdminLogs)

	}

	log.Println("Server running at :8080")

	if err := r.Run(":8080"); err != nil {
		log.Fatal(err)
	}
}
