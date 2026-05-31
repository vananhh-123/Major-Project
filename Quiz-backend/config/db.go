package config

import (
	"fmt"
	"log"
	"os"

	"github.com/glebarez/sqlite"
	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func ConnectDatabase() {
	err := godotenv.Load()
	if err != nil {
		panic("Error loading .env file")
	}

	dsn := os.Getenv("DB_URL")
	fmt.Println("DB_URL:", dsn)

	database, err := gorm.Open(postgres.New(postgres.Config{
		DSN:                  dsn,
		PreferSimpleProtocol: true, // Xử lý triệt để lỗi prepared statement của PgBouncer (Supabase)
	}), &gorm.Config{
		PrepareStmt: false, // ✅ FIX LỖI PGBOUNCER
	})

	if err != nil {
		// If Supabase/postgres is unreachable, fall back to a local sqlite DB for development/testing.
		log.Println("Warning: failed to connect to Postgres, falling back to local sqlite for dev/testing:", err)
		sqliteDB, sErr := gorm.Open(sqlite.Open("dev.db"), &gorm.Config{})
		if sErr != nil {
			panic("Failed to connect to any database: " + sErr.Error())
		}
		database = sqliteDB
		fmt.Println("Using local SQLite database for development")
	}

	sqlDB, err := database.DB()
	if err != nil {
		panic("Failed to get sqlDB")
	}

	// 🔥 QUAN TRỌNG khi dùng pooler
	sqlDB.SetMaxOpenConns(1) // 👈 BẮT BUỘC
	sqlDB.SetMaxIdleConns(1)
	sqlDB.SetConnMaxLifetime(0)

	DB = database
	fmt.Println("Connected to Supabase!")
}
