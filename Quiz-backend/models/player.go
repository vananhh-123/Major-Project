package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Player struct {
	ID       uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	RoomID   uuid.UUID `json:"room_id" gorm:"type:uuid"`
	UserID   uuid.UUID `json:"user_id" gorm:"type:uuid"`
	Name     string    `json:"name" gorm:"type:varchar(255)"`
	Score    int       `json:"score" gorm:"default:0"`
	JoinedAt time.Time `json:"joined_at" gorm:"autoCreateTime"`

	// Relations
	Room *Room `json:"room" gorm:"foreignKey:RoomID;references:ID"`
	User *User `json:"user" gorm:"foreignKey:UserID;references:ID"`
}

func (p *Player) BeforeCreate(tx *gorm.DB) error {
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	return nil
}
