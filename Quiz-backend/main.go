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

	// Khởi tạo WebSocket Hub
	hub := sockets.NewHub()
	go hub.Run()

	r := gin.Default()
	r.Use(cors.New(cors.Config{
		AllowAllOrigins: true,
		AllowMethods:    []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:    []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:   []string{"Content-Length"},
		MaxAge:          12 * time.Hour,
	}))

	r.GET("/api/leaderboard", controllers.GetLeaderboard)
	r.GET("/api/network-info", controllers.GetNetworkInfo)

	config.ConnectDatabase()
	// Tự động tạo bảng nếu chưa tồn tại
	config.DB.AutoMigrate(&models.User{}, &models.Quiz{}, &models.Question{}, &models.Result{}, &models.Review{}, &models.Room{}, &models.Player{})

	auth := r.Group("/auth")
	{
		auth.POST("/register", controllers.Register)
		auth.POST("/login", controllers.Login)
		auth.POST("/google", controllers.GoogleLogin)
		auth.PATCH("/profile", controllers.UpdateProfile)
	}

	api := r.Group("/api")
	{
		api.GET("/ws", func(c *gin.Context) {
			sockets.ServeWs(hub, c)
		})

		api.POST("/rooms", controllers.CreateRoom)
		api.POST("/rooms/join", controllers.JoinRoom)

		api.POST("/quizzes", controllers.CreateQuiz)
		api.GET("/quizzes", controllers.GetQuizzes)
		api.GET("/quizzes/:id", controllers.GetQuiz)
		api.PUT("/quizzes/:id", controllers.UpdateQuiz)
		api.DELETE("/quizzes/:id", controllers.DeleteQuiz)

		api.POST("/results", controllers.SubmitResult)
		api.GET("/stats/:id", controllers.GetUserStats)
		api.GET("/users/:id/history", controllers.GetUserHistory)
	}

	r.Run(":8080")
}
