package domain

// LoginRequest represents the expected JSON payload for authenticatin.
type  LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// LoginResponse defines the standardized output format after successful login.
type LoginResponse struct {
	Token 	string 			`json:"token"`
	User 	UserResponse 	`json:"user"`
}

// UserResponse sefely exposes user details without leaking sensitive data like passowrds.
type UserResponse struct {
	ID 			uint 	`json:"id"`
	Name 		string 	`json:"name"`
	Username	string 	`json:"username"`
	Role 		string 	`json:"role"`
}