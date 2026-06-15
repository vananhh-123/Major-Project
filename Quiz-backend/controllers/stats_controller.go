package controllers

import (
	"net/http"
	"net/url"
	"quiz-backend/config"
	"quiz-backend/models"
	"strings"

	"github.com/gin-gonic/gin"
)

type ModeStats struct {
	Games    int     `json:"games"`
	Points   int     `json:"points"`
	Rank     int     `json:"rank"`
	AvgScore float64 `json:"avgScore"`
}

type StatsResponse struct {
	Solo  ModeStats `json:"solo"`
	Multi ModeStats `json:"multi"`
}

type LeaderboardEntry struct {
	UserID string `json:"userId"`
	Rank   int    `json:"rank"`
	Name   string `json:"name"`
	Points int    `json:"points"`
	Avatar string `json:"avatar"`
}

func GetUserStats(c *gin.Context) {
	userId := c.Param("id")

	var res StatsResponse

	// ===== 1. Mạch dữ liệu cho chế độ SOLO (mode='solo' hoặc room_id IS NULL cho dữ liệu cũ) =====
	var soloResults []models.Result
	config.DB.Where("user_id = ? AND (mode = ? OR (mode IS NULL AND room_id IS NULL))", userId, "solo").Find(&soloResults)

	res.Solo.Games = len(soloResults)
	var totalSoloPoints int
	var totalSoloPercentage float64
	var soloQuizzesWithQuestionsFound int

	for _, result := range soloResults {
		totalSoloPoints += result.Score
		// Tính % số câu đúng trên tổng số câu hỏi của Quiz này
		var totalQuestions int64
		config.DB.Model(&models.Question{}).Where("quiz_id = ?", result.QuizID).Count(&totalQuestions)

		if totalQuestions > 0 {
			pct := float64(result.CorrectAnswers) / float64(totalQuestions) * 100.0
			totalSoloPercentage += pct
			soloQuizzesWithQuestionsFound++
		} else {
			// Falls back to percentage based on Score vs CorrectAnswers? No, if no questions just use 0%
		}
	}
	res.Solo.Points = totalSoloPoints
	if soloQuizzesWithQuestionsFound > 0 {
		res.Solo.AvgScore = totalSoloPercentage / float64(soloQuizzesWithQuestionsFound)
	}

	// ===== 2. Mạch dữ liệu cho chế độ MULTI (mode='multi' hoặc room_id IS NOT NULL cho dữ liệu cũ) =====
	var multiResults []models.Result
	config.DB.Where("user_id = ? AND (mode = ? OR (mode IS NULL AND room_id IS NOT NULL))", userId, "multi").Find(&multiResults)

	res.Multi.Games = len(multiResults) // Đếm cả số quiz lặp lại (mỗi lượt result là 1 game play)
	var totalMultiPoints int
	var totalMultiPercentage float64
	var multiQuizzesWithQuestionsFound int

	for _, result := range multiResults {
		totalMultiPoints += result.Score
		var totalQuestions int64
		config.DB.Model(&models.Question{}).Where("quiz_id = ?", result.QuizID).Count(&totalQuestions)
		if totalQuestions > 0 {
			pct := float64(result.CorrectAnswers) / float64(totalQuestions) * 100.0
			totalMultiPercentage += pct
			multiQuizzesWithQuestionsFound++
		}
	}
	res.Multi.Points = totalMultiPoints
	if multiQuizzesWithQuestionsFound > 0 {
		res.Multi.AvgScore = totalMultiPercentage / float64(multiQuizzesWithQuestionsFound)
	}

	// ===== 3. Rank (Tính Rank cho Solo và Multi bằng cách xem rank của user đó trong toàn hệ thống) =====
	// Rank Solo:
	type UserPoints struct {
		UserID string
		Points int
	}
	var soloLeaderboard []UserPoints
	config.DB.Model(&models.Result{}).
		Select("user_id, SUM(score) as points").
		Where("mode = ? OR (mode IS NULL AND room_id IS NULL)", "solo").
		Group("user_id").
		Order("points DESC").
		Scan(&soloLeaderboard)

	res.Solo.Rank = 0
	for i, l := range soloLeaderboard {
		if l.UserID == userId {
			res.Solo.Rank = i + 1
			break
		}
	}

	var multiLeaderboard []UserPoints
	config.DB.Model(&models.Result{}).
		Select("user_id, SUM(score) as points").
		Where("mode = ? OR (mode IS NULL AND room_id IS NOT NULL)", "multi").
		Group("user_id").
		Order("points DESC").
		Scan(&multiLeaderboard)

	res.Multi.Rank = 0
	for i, l := range multiLeaderboard {
		if l.UserID == userId {
			res.Multi.Rank = i + 1
			break
		}
	}

	c.JSON(http.StatusOK, res)
}

func GetUserHistory(c *gin.Context) {
	userId := c.Param("id")
	var results []models.Result

	// Preload the quiz so we can get its Title
	if err := config.DB.Preload("Quiz").Where("user_id = ?", userId).Order("created_at desc").Find(&results).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Không thể lấy lịch sử"})
		return
	}

	type HistoryItem struct {
		Name    string `json:"name"`
		Date    string `json:"date"`
		Score   int    `json:"score"`
		Rank    string `json:"rank"`
		Players string `json:"players"`
		Color   string `json:"color"`
		Icon    string `json:"icon"`
		IsSolo  bool   `json:"is_solo"`
		Mode    string `json:"mode"`
	}

	var history []HistoryItem
	for _, r := range results {
		quizTitle := "Unknown Quiz"
		if r.Quiz != nil {
			quizTitle = r.Quiz.Title
		}

		mode := ""
		if r.Mode != nil {
			mode = *r.Mode
		}

		isSolo := mode == "solo"
		if mode == "" {
			isSolo = (r.RoomID == nil)
			if isSolo {
				mode = "solo"
			} else {
				mode = "multi"
			}
		}

		players := "0"
		if isSolo {
			players = "1" // Solo is always 1 player
		} else {
			players = "N/A" // You can query room members later if needed
		}

		history = append(history, HistoryItem{
			Name:    quizTitle,
			Date:    r.CreatedAt.Format("02/01/2006"), // Format date as DD/MM/YYYY
			Score:   r.Score,
			Rank:    "N/A", // Currently don't have rank in history
			Players: players,
			Color:   "#6c2bd9",
			Icon:    "videogame_asset",
			IsSolo:  isSolo,
			Mode:    mode,
		})
	}

	c.JSON(http.StatusOK, history)
}

func GetLeaderboard(c *gin.Context) {
	period := c.DefaultQuery("period", "all")
	search := c.DefaultQuery("q", "")
	mode := c.Query("mode")
	var results []LeaderboardEntry

	// Kết hợp bảng results và bảng users để lấy username, avatar và tổng điểm (points)
	query := config.DB.Table("results").
		Select("users.id as user_id, users.username as name, sum(results.score) as points, users.avatar as avatar").
		Joins("left join users on users.id = results.user_id")

	// Bộ lọc thời gian thực tế
	if period == "weekly" {
		query = query.Where("results.created_at >= CURRENT_DATE - INTERVAL '7 days'")
	} else if period == "monthly" {
		query = query.Where("results.created_at >= CURRENT_DATE - INTERVAL '1 month'")
	}

	// Apply mode filter if provided. Prefer explicit `mode` column; fallback to room_id checks for older rows.
	if mode != "" {
		if mode == "solo" {
			query = query.Where("(results.mode = ? OR (results.mode IS NULL AND results.room_id IS NULL))", "solo")
		} else if mode == "multi" {
			query = query.Where("(results.mode = ? OR (results.mode IS NULL AND results.room_id IS NOT NULL))", "multi")
		}
	}

	// Bộ lọc nhập tên (LIKE)
	if search != "" {
		query = query.Where("users.username ILIKE ?", "%"+search+"%")
	}

	// Gom nhóm và sắp xếp từ trên xuống dưới theo điểm
	query.Group("users.id, users.username, users.avatar").
		Order("points DESC").
		Scan(&results)

	// Ấn định thứ hạng
	for i := range results {
		results[i].Rank = i + 1
		avatar := strings.TrimSpace(results[i].Avatar)
		if avatar == "" || strings.Contains(strings.ToLower(avatar), "quiz") || strings.Contains(strings.ToLower(avatar), "space") {
			seed := results[i].Name
			if seed == "" {
				seed = results[i].UserID
			}
			results[i].Avatar = "https://api.dicebear.com/7.x/personas/svg?seed=" + url.QueryEscape(seed)
		}
	}

	c.JSON(http.StatusOK, results)
}
func GetAdminDashboard(c *gin.Context) {
	var totalUsers int64
	var totalQuizzes int64
	var totalQuestions int64
	var totalResults int64
	var totalReviews int64

	config.DB.Model(&models.User{}).Count(&totalUsers)
	config.DB.Model(&models.Quiz{}).Count(&totalQuizzes)
	config.DB.Model(&models.Question{}).Count(&totalQuestions)
	config.DB.Model(&models.Result{}).Count(&totalResults)
	config.DB.Model(&models.Review{}).Count(&totalReviews)

	c.JSON(http.StatusOK, gin.H{
		"totalUsers":     totalUsers,
		"totalQuizzes":   totalQuizzes,
		"totalQuestions": totalQuestions,
		"totalResults":   totalResults,
		"totalReviews":   totalReviews,
		"activeRooms":    0,
	})
}
func GetAdminQuizzes(c *gin.Context) {
	type AdminQuizResponse struct {
		ID            string  `json:"id"`
		Title         string  `json:"title"`
		Description   string  `json:"description"`
		Level         string  `json:"level"`
		Visibility    string  `json:"visibility"`
		CoverImage    string  `json:"cover_image"`
		Plays         int     `json:"plays"`
		CreatedAt     string  `json:"created_at"`
		CreatorID     string  `json:"creator_id"`
		Creator       string  `json:"creator"`
		QuestionCount int64   `json:"questionCount"`
		Rating        float64 `json:"rating"`
		ReviewCount   int64   `json:"reviewCount"`
	}

	var quizzes []models.Quiz

	if err := config.DB.Order("created_at DESC").Find(&quizzes).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Cannot fetch quizzes"})
		return
	}

	var response []AdminQuizResponse

	for _, quiz := range quizzes {
		var questionCount int64
		var reviewCount int64
		var avgRating float64
		var creator models.User

		config.DB.Model(&models.Question{}).
			Where("quiz_id = ?", quiz.ID).
			Count(&questionCount)

		config.DB.Model(&models.Review{}).
			Where("quiz_id = ?", quiz.ID).
			Count(&reviewCount)

		config.DB.Model(&models.Review{}).
			Where("quiz_id = ?", quiz.ID).
			Select("COALESCE(AVG(rating), 0)").
			Scan(&avgRating)

		creatorName := "Unknown"
		creatorID := ""

		if quiz.CreatedBy != nil {
			creatorID = quiz.CreatedBy.String()

			if err := config.DB.Where("id = ?", quiz.CreatedBy).First(&creator).Error; err == nil {
				creatorName = creator.Username
			}
		}

		response = append(response, AdminQuizResponse{
			ID:            quiz.ID.String(),
			Title:         quiz.Title,
			Description:   quiz.Description,
			Level:         quiz.Level,
			Visibility:    quiz.Visibility,
			CoverImage:    quiz.CoverImage,
			Plays:         quiz.Plays,
			CreatedAt:     quiz.CreatedAt.Format("2006-01-02T15:04:05Z"),
			CreatorID:     creatorID,
			Creator:       creatorName,
			QuestionCount: questionCount,
			Rating:        avgRating,
			ReviewCount:   reviewCount,
		})
	}

	c.JSON(http.StatusOK, response)
}
