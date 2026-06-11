package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Result struct {
	ID             uuid.UUID  `gorm:"type:uuid;primaryKey"`
	QuizID         *uuid.UUID `gorm:"type:uuid"`
	RoomID         *uuid.UUID `gorm:"type:uuid"`
	PlayerID       *uuid.UUID `gorm:"type:uuid"`
	UserID         *uuid.UUID `gorm:"type:uuid"`
	Score          int        `gorm:"default:0"`
	CorrectAnswers int        `gorm:"default:0"`
	// Mode indicates how the result was obtained: 'solo' or 'multi'
	Mode      *string   `json:"mode" gorm:"type:varchar(10)"`
	CreatedAt time.Time `gorm:"autoCreateTime"`

	Quiz *Quiz `json:"quiz" gorm:"foreignKey:QuizID;references:ID"`
}

func (r *Result) BeforeCreate(tx *gorm.DB) error {
	if r.ID == uuid.Nil {
		r.ID = uuid.New()
	}
	return nil
}
