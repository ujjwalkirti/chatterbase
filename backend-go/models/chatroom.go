package models

type Chatroom struct {
	ID               int64    `json:"id"`
	Name             string   `json:"name"`
	Description      string   `json:"description"`
	ParticipantCount int      `json:"participantCount"`
	Participants     []string `json:"participants"`
}
