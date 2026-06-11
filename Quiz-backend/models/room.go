package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Room struct {
	ID        uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	RoomCode  string    `json:"room_code" gorm:"type:varchar(6);unique"`
	HostID    uuid.UUID `json:"host_id" gorm:"type:uuid"`
	QuizID    uuid.UUID `json:"quiz_id" gorm:"type:uuid"`
	Status    string    `json:"status" gorm:"type:varchar(20)"`    // 'waiting', 'started', 'ended'
	GameMode  *string   `json:"game_mode" gorm:"type:varchar(10)"` // 'classic', 'focus'
	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime"`

	// Relations
	Host    *User    `json:"host" gorm:"foreignKey:HostID;references:ID"`
	Quiz    *Quiz    `json:"quiz" gorm:"foreignKey:QuizID;references:ID"`
	Players []Player `json:"players" gorm:"foreignKey:RoomID;references:ID"`
	Results []Result `json:"results" gorm:"foreignKey:RoomID;references:ID"`
}

func (r *Room) BeforeCreate(tx *gorm.DB) error {
	if r.ID == uuid.Nil {
		r.ID = uuid.New()
	}
	return nil
}
