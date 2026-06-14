package controllers

import (
	"context"
	"net/http"
	"quiz-backend/config"
	"quiz-backend/models"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"google.golang.org/api/idtoken"
)

// =======================
func Register(c *gin.Context) {
	var input models.User

	// 1. Validate JSON input
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Dữ liệu không hợp lệ!",
		})
		return
	}

	// 2. Check email đã tồn tại chưa
	var existingUser models.User
	if err := config.DB.Where("email = ?", input.Email).First(&existingUser).Error; err == nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Email đã tồn tại!",
		})
		return
	}

	// 3. Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Password), 14)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Lỗi mã hóa mật khẩu!",
		})
		return
	}

	input.Password = string(hashedPassword)

	// 4. Lưu vào DB
	if err := config.DB.Create(&input).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Không thể đăng ký người dùng!",
		})
		return
	}

	// 5. Trả về kết quả (KHÔNG trả password)
	c.JSON(http.StatusOK, gin.H{
		"message": "Đăng ký thành công!",
		"user": gin.H{
			"id":       input.ID,
			"username": input.Username,
			"email":    input.Email,
			"avatar":   input.Avatar,
			"bio":      input.Bio,
		},
	})
}

// =======================
// LOGIN
// =======================
func Login(c *gin.Context) {
	var input models.User
	var user models.User

	// 1. Validate input
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Dữ liệu không hợp lệ!",
		})
		return
	}

	// 2. Tìm user theo email hoặc username
	// Bạn có thể nhập Username hoặc Email vào ô Email đều được
	if err := config.DB.Where("email = ? OR username = ?", input.Email, input.Email).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Email/Username hoặc mật khẩu không đúng!",
		})
		return
	}

	// 3. So sánh password (bcrypt)
	err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(input.Password))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Email/Username hoặc mật khẩu không đúng!",
		})
		return
	}

	// 4. Trả về user (KHÔNG trả password)
	c.JSON(http.StatusOK, gin.H{
		"message": "Đăng nhập thành công!",
		"user": gin.H{
			"id":       user.ID,
			"username": user.Username,
			"email":    user.Email,
			"avatar":   user.Avatar,
			"bio":      user.Bio,
			"role":     user.Role,
			"status":   user.Status,
		},
	})
}

// =======================
// GOOGLE LOGIN
// =======================
func GoogleLogin(c *gin.Context) {
	var input struct {
		Token string `json:"token"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Token missing"})
		return
	}

	// Verify the ID token (client_id is used exactly as defined in the frontend)
	payload, err := idtoken.Validate(context.Background(), input.Token, "1071989516356-g8rlcjaq54f9mfhtefnt9o84m9gfkcki.apps.googleusercontent.com")
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid Google token"})
		return
	}

	email := payload.Claims["email"].(string)
	name := payload.Claims["name"].(string)

	var user models.User
	// Tìm user bằng email hoặc táo mới. Password ở đây mình có thể hash tạm hoặc là b� qua, default google là google auth
	if err := config.DB.Where("email = ?", email).First(&user).Error; err != nil {
		// Tạo người dùng mới nếu không tìm thấy
		user = models.User{
			Username: name, // Bản chất tên đầy đủ Google
			Email:    email,
			Password: "GOOGLE_OAUTH_LOGIN", // Một chuỗi mã random mà bình thường ai gõ pass cũng ko match dc mật khẩu Hash
		}
		config.DB.Create(&user)
	}

	// Trả về user (KHÔNG trả password)
	c.JSON(http.StatusOK, gin.H{
		"message": "Đăng nhập Google thành công!",
		"token":   "fake_jwt_token_for_" + user.Username,
		"user": gin.H{
			"id":       user.ID,
			"username": user.Username,
			"email":    user.Email,
			"avatar":   user.Avatar,
			"bio":      user.Bio,
			"role":     user.Role,
			"status":   user.Status,
		},
	})
}

type UpdateProfileInput struct {
	UserID   string `json:"user_id"`
	Avatar   string `json:"avatar"`
	Bio      string `json:"bio"`
	Username string `json:"username"`
}

func UpdateProfile(c *gin.Context) {
	var input UpdateProfileInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	if err := config.DB.First(&user, "id = ?", input.UserID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	if input.Avatar != "" {
		user.Avatar = &input.Avatar
	}
	if input.Bio != "" {
		user.Bio = &input.Bio
	}
	if input.Username != "" {
		user.Username = input.Username
	}
	if err := config.DB.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not update profile"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Profile updated successfully",
		"user":    user,
	})
}
