package controllers

import (
	"net/http"
	"quiz-backend/config"
	"quiz-backend/models"

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
	Rank   int    `json:"rank"`
	Name   string `json:"name"`
	Points int    `json:"points"`
	Avatar string `json:"avatar"`
}

func GetUserStats(c *gin.Context) {
	userId := c.Param("id")

	var res StatsResponse

	// ===== 1. Mạch dữ liệu cho chế độ SOLO (room_id IS NULL) =====
	var soloResults []models.Result
	config.DB.Where("user_id = ? AND room_id IS NULL", userId).Find(&soloResults)

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

	// ===== 2. Mạch dữ liệu cho chế độ MULTI (room_id IS NOT NULL) =====
	var multiResults []models.Result
	config.DB.Where("user_id = ? AND room_id IS NOT NULL", userId).Find(&multiResults)

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
		Where("room_id IS NULL").
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
		Where("room_id IS NOT NULL").
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
	}

	var history []HistoryItem
	for _, r := range results {
		quizTitle := "Unknown Quiz"
		if r.Quiz != nil {
			quizTitle = r.Quiz.Title
		}

		isSolo := (r.RoomID == nil)
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
		})
	}

	c.JSON(http.StatusOK, history)
}

func GetLeaderboard(c *gin.Context) {
	period := c.DefaultQuery("period", "all")
	search := c.DefaultQuery("q", "")

	var results []LeaderboardEntry

	// Kết hợp bảng results và bảng users để lấy username, avatar và tổng điểm (points)
	query := config.DB.Table("results").
		Select("users.username as name, sum(results.score) as points, users.avatar as avatar").
		Joins("left join users on users.id = results.user_id")

	// Bộ lọc thời gian thực tế
	if period == "weekly" {
		query = query.Where("results.created_at >= CURRENT_DATE - INTERVAL '7 days'")
	} else if period == "monthly" {
		query = query.Where("results.created_at >= CURRENT_DATE - INTERVAL '1 month'")
	}

	// Bộ lọc nhập tên (LIKE)
	if search != "" {
		query = query.Where("users.username ILIKE ?", "%"+search+"%")
	}

	// Gom nhóm và sắp xếp từ trên xuống dưới theo điểm
	query.Group("users.username, users.avatar").
		Order("points DESC").
		Limit(100).
		Scan(&results)

	// Ấn định thứ hạng
	for i := range results {
		results[i].Rank = i + 1
	}

	c.JSON(http.StatusOK, results)
}
