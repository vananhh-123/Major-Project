package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Quiz struct {
	ID          uuid.UUID  `json:"id" gorm:"type:uuid;primaryKey"`
	Title       string     `json:"title" gorm:"type:varchar(100);not null"`
	Description string     `json:"description" gorm:"type:text"`
	Level       string     `json:"level" gorm:"type:varchar(50)"`
	Visibility  string     `json:"visibility" gorm:"type:varchar(20);default:'public'"`
	CoverImage  string     `json:"cover_image" gorm:"type:text"`
	Plays       int        `json:"plays" gorm:"default:0"`
	CreatedBy   *uuid.UUID `json:"created_by" gorm:"type:uuid"`
	CreatedAt   time.Time  `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt   time.Time  `json:"updated_at" gorm:"autoUpdateTime"`

	Creator   *User      `json:"creator" gorm:"foreignKey:CreatedBy;references:ID"`
	Questions []Question `json:"questions" gorm:"foreignKey:QuizID;references:ID"`
	Reviews   []Review   `json:"reviews" gorm:"foreignKey:QuizID;references:ID"`
}

func (q *Quiz) BeforeCreate(tx *gorm.DB) error {
	if q.ID == uuid.Nil {
		q.ID = uuid.New()
	}
	return nil
}
