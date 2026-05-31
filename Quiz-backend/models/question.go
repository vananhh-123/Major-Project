package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Question struct {
	ID              uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	QuizID          uuid.UUID `json:"quiz_id" gorm:"type:uuid;not null"`
	Content         string    `json:"content" gorm:"type:text;not null"`
	TimeLimit       int       `json:"time_limit" gorm:"type:int;default:20"`
	Points          int       `json:"points" gorm:"type:int;default:100"`
	MultipleCorrect bool      `json:"multiple_correct" gorm:"type:boolean;default:false"`
	OrderIndex      int       `json:"order_index" gorm:"type:int;default:0"`
	Options         string    `json:"options" gorm:"type:jsonb;not null;default:'[]'"`
}

func (q *Question) BeforeCreate(tx *gorm.DB) error {
	if q.ID == uuid.Nil {
		q.ID = uuid.New()
	}
	return nil
}
