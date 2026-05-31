package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type User struct {
	ID       uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	Username string    `json:"username"`
	Email    string    `json:"email" gorm:"unique"`
	Password string    `json:"password"`
	Avatar   *string   `json:"avatar"`
	Bio      *string   `json:"bio"`
}

func (u *User) BeforeCreate(tx *gorm.DB) error {
	if u.ID == uuid.Nil {
		u.ID = uuid.New()
	}
	return nil
}
