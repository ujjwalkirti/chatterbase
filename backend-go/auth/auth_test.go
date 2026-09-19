package auth

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/ujjwalkirti/chatterbase-backend-go/config"
)

func TestGenerateAndVerifyToken(t *testing.T) {
	os.Setenv("ACCESS_TOKEN_SECRET", "test-secret-key-123")

	username := "testuser"
	gender := "male"
	dob := "2000-01-01"
	status := "active"

	tokenStr, err := GenerateToken(username, gender, dob, status)
	if err != nil {
		t.Fatalf("expected no error generating token, got: %v", err)
	}

	if tokenStr == "" {
		t.Fatal("expected non-empty token string")
	}

	claims, err := VerifyToken(tokenStr)
	if err != nil {
		t.Fatalf("expected valid token verification, got: %v", err)
	}

	if claims["username"] != username {
		t.Errorf("expected username %q, got %v", username, claims["username"])
	}

	if claims["gender"] != gender {
		t.Errorf("expected gender %q, got %v", gender, claims["gender"])
	}

	if claims["dob"] != dob {
		t.Errorf("expected dob %q, got %v", dob, claims["dob"])
	}
}

func TestPasswordHashing(t *testing.T) {
	password := "SecretPass123!"
	hash, err := HashPassword(password)
	if err != nil {
		t.Fatalf("failed to hash password: %v", err)
	}
	if hash == password {
		t.Fatal("hash should not match plain password")
	}
	if !CheckPasswordHash(password, hash) {
		t.Fatal("expected password check to succeed for correct password")
	}
	if CheckPasswordHash("WrongPassword!", hash) {
		t.Fatal("expected password check to fail for incorrect password")
	}
}

func TestMain(m *testing.M) {
	_ = godotenv.Load("../.env")
	_ = godotenv.Load()
	config.InitPostgres()
	config.InitRedis()
	os.Exit(m.Run())
}

func TestPermanentUserRegister(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	api := router.Group("/api")
	RegisterRoutes(api)

	uniqueUsername := fmt.Sprintf("perm_user_%d", time.Now().UnixNano())

	payload := map[string]interface{}{
		"username":   uniqueUsername,
		"dob":        "2000-01-01",
		"gender":     "male",
		"password":   "Password123!",
		"ip_address": "127.0.0.1",
		"deviceDetails": map[string]interface{}{
			"browser":          "Chrome",
			"os":               "Windows 11",
			"screenResolution": "1920x1080",
			"userAgent":        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
		},
	}

	body, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("failed to marshal payload: %v", err)
	}

	req, err := http.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewBuffer(body))
	if err != nil {
		t.Fatalf("failed to create request: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d. Body: %s", w.Code, w.Body.String())
	}

	var response struct {
		Success bool   `json:"success"`
		Message string `json:"message"`
		Data    struct {
			Token string `json:"token"`
		} `json:"data"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}

	if !response.Success {
		t.Errorf("expected success true, got false with message: %s", response.Message)
	}
	if response.Data.Token == "" {
		t.Fatal("expected non-empty token in response")
	}

	claims, err := VerifyToken(response.Data.Token)
	if err != nil {
		t.Fatalf("failed to verify token: %v", err)
	}
	if claims["username"] != uniqueUsername {
		t.Errorf("expected username %q, got %v", uniqueUsername, claims["username"])
	}
	if claims["user_status"] != UserStatusPermanent {
		t.Errorf("expected user_status %q, got %v", UserStatusPermanent, claims["user_status"])
	}
}

func TestVerifyToken_Invalid(t *testing.T) {
	os.Setenv("ACCESS_TOKEN_SECRET", "test-secret-key-123")

	_, err := VerifyToken("invalid.token.string")
	if err == nil {
		t.Fatal("expected error verifying invalid token, got nil")
	}
}

func setupTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	api := router.Group("/api")
	RegisterRoutes(api)
	return router
}

func TestGuestLogin_Success(t *testing.T) {
	router := setupTestRouter()
	uniqueUsername := fmt.Sprintf("guest_login_%d", time.Now().UnixNano())

	payload := map[string]interface{}{
		"username":   uniqueUsername,
		"dob":        "2002-05-15",
		"gender":     "female",
		"ip_address": "127.0.0.1",
	}
	body, _ := json.Marshal(payload)
	req, _ := http.NewRequest(http.MethodPost, "/api/auth/guest-login", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d: %s", w.Code, w.Body.String())
	}

	var res struct {
		Success bool `json:"success"`
		Data    struct {
			Token string `json:"token"`
			User  struct {
				Username   string `json:"username"`
				UserStatus string `json:"user_status"`
			} `json:"user"`
		} `json:"data"`
	}
	_ = json.Unmarshal(w.Body.Bytes(), &res)

	if !res.Success || res.Data.Token == "" {
		t.Fatalf("expected successful guest login with token, got: %s", w.Body.String())
	}
	if res.Data.User.Username != uniqueUsername {
		t.Errorf("expected username %s, got %s", uniqueUsername, res.Data.User.Username)
	}
	if res.Data.User.UserStatus != UserStatusAnonymous {
		t.Errorf("expected user_status anonymous, got %s", res.Data.User.UserStatus)
	}

	// Verify Redis lock is held
	active, _ := IsGuestActive(context.Background(), uniqueUsername)
	if !active {
		t.Errorf("expected active guest key in Redis for %s", uniqueUsername)
	}
}

func TestGuestLogin_Conflict(t *testing.T) {
	router := setupTestRouter()
	uniqueUsername := fmt.Sprintf("guest_conflict_%d", time.Now().UnixNano())

	payload := map[string]interface{}{
		"username": uniqueUsername,
		"dob":      "2001-01-01",
		"gender":   "other",
	}
	body, _ := json.Marshal(payload)

	// First login succeeds
	req1, _ := http.NewRequest(http.MethodPost, "/api/auth/guest-login", bytes.NewBuffer(body))
	req1.Header.Set("Content-Type", "application/json")
	w1 := httptest.NewRecorder()
	router.ServeHTTP(w1, req1)
	if w1.Code != http.StatusOK {
		t.Fatalf("first login expected 200, got %d: %s", w1.Code, w1.Body.String())
	}

	// Second login with identical username should return 409 Conflict
	req2, _ := http.NewRequest(http.MethodPost, "/api/auth/guest-login", bytes.NewBuffer(body))
	req2.Header.Set("Content-Type", "application/json")
	w2 := httptest.NewRecorder()
	router.ServeHTTP(w2, req2)
	if w2.Code != http.StatusConflict {
		t.Fatalf("second login expected 409 Conflict, got %d: %s", w2.Code, w2.Body.String())
	}
}

func TestPermanentRegisterAndLogin(t *testing.T) {
	router := setupTestRouter()
	ts := time.Now().UnixNano()
	username := fmt.Sprintf("perm_reg_%d", ts)
	email := fmt.Sprintf("user_%d@chatterbase.io", ts)
	password := "SecurePassword123!"

	// 1. Register
	regPayload := map[string]interface{}{
		"username": username,
		"email":    email,
		"password": password,
		"dob":      "1995-10-20",
		"gender":   "female",
	}
	body, _ := json.Marshal(regPayload)
	req, _ := http.NewRequest(http.MethodPost, "/api/auth/register-permanent", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected register 200 OK, got %d: %s", w.Code, w.Body.String())
	}

	// 2. Duplicate registration returns 409
	reqDup, _ := http.NewRequest(http.MethodPost, "/api/auth/register-permanent", bytes.NewBuffer(body))
	reqDup.Header.Set("Content-Type", "application/json")
	wDup := httptest.NewRecorder()
	router.ServeHTTP(wDup, reqDup)
	if wDup.Code != http.StatusConflict {
		t.Fatalf("expected duplicate register 409 Conflict, got %d: %s", wDup.Code, wDup.Body.String())
	}

	// 3. Login with username and correct password
	loginPayload := map[string]interface{}{
		"identifier": username,
		"password":   password,
	}
	loginBody, _ := json.Marshal(loginPayload)
	loginReq, _ := http.NewRequest(http.MethodPost, "/api/auth/login-permanent", bytes.NewBuffer(loginBody))
	loginReq.Header.Set("Content-Type", "application/json")
	wLogin := httptest.NewRecorder()
	router.ServeHTTP(wLogin, loginReq)
	if wLogin.Code != http.StatusOK {
		t.Fatalf("expected login 200 OK, got %d: %s", wLogin.Code, wLogin.Body.String())
	}

	// 4. Login with email and correct password
	loginEmailPayload := map[string]interface{}{
		"identifier": email,
		"password":   password,
	}
	loginEmailBody, _ := json.Marshal(loginEmailPayload)
	loginEmailReq, _ := http.NewRequest(http.MethodPost, "/api/auth/login-permanent", bytes.NewBuffer(loginEmailBody))
	loginEmailReq.Header.Set("Content-Type", "application/json")
	wEmailLogin := httptest.NewRecorder()
	router.ServeHTTP(wEmailLogin, loginEmailReq)
	if wEmailLogin.Code != http.StatusOK {
		t.Fatalf("expected email login 200 OK, got %d: %s", wEmailLogin.Code, wEmailLogin.Body.String())
	}

	// 5. Login with invalid password returns 401
	invalidLoginPayload := map[string]interface{}{
		"identifier": username,
		"password":   "WrongPass!",
	}
	invalidLoginBody, _ := json.Marshal(invalidLoginPayload)
	invalidReq, _ := http.NewRequest(http.MethodPost, "/api/auth/login-permanent", bytes.NewBuffer(invalidLoginBody))
	invalidReq.Header.Set("Content-Type", "application/json")
	wInvalid := httptest.NewRecorder()
	router.ServeHTTP(wInvalid, invalidReq)
	if wInvalid.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 Unauthorized on invalid password, got %d: %s", wInvalid.Code, wInvalid.Body.String())
	}
}

func TestGuestLogout(t *testing.T) {
	router := setupTestRouter()
	username := fmt.Sprintf("guest_logout_%d", time.Now().UnixNano())

	// 1. Guest login
	payload := map[string]interface{}{
		"username": username,
		"dob":      "2000-01-01",
		"gender":   "male",
	}
	body, _ := json.Marshal(payload)
	req, _ := http.NewRequest(http.MethodPost, "/api/auth/guest-login", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected login 200 OK, got %d: %s", w.Code, w.Body.String())
	}

	var res struct {
		Data struct {
			Token string `json:"token"`
		} `json:"data"`
	}
	_ = json.Unmarshal(w.Body.Bytes(), &res)

	// Verify active in Redis
	active, _ := IsGuestActive(context.Background(), username)
	if !active {
		t.Fatalf("expected guest to be active in Redis")
	}

	// 2. Logout
	logoutPayload := map[string]interface{}{
		"token": res.Data.Token,
	}
	logoutBody, _ := json.Marshal(logoutPayload)
	logoutReq, _ := http.NewRequest(http.MethodPost, "/api/auth/guest-logout", bytes.NewBuffer(logoutBody))
	logoutReq.Header.Set("Content-Type", "application/json")
	wLogout := httptest.NewRecorder()
	router.ServeHTTP(wLogout, logoutReq)

	if wLogout.Code != http.StatusOK {
		t.Fatalf("expected guest logout 200 OK, got %d: %s", wLogout.Code, wLogout.Body.String())
	}

	// Verify Redis lock was released
	activeAfter, _ := IsGuestActive(context.Background(), username)
	if activeAfter {
		t.Fatalf("expected guest key in Redis to be deleted after logout")
	}

	// Verify user is archived in PostgreSQL
	var status string
	_ = config.Pool.QueryRow(context.Background(), "SELECT user_status FROM users WHERE username = $1 ORDER BY id DESC LIMIT 1", username).Scan(&status)
	if status != UserStatusArchived {
		t.Errorf("expected user status to be archived, got %s", status)
	}
}

func TestGuestHeartbeatEndpoint(t *testing.T) {
	router := setupTestRouter()
	username := fmt.Sprintf("hb_user_%d", time.Now().UnixNano())

	// Acquire initial session
	_, _ = AcquireGuestUsername(context.Background(), username, 1, 10*time.Second)
	token, _ := GenerateToken(username, "male", "2000-01-01", UserStatusAnonymous)

	payload := map[string]interface{}{"token": token}
	body, _ := json.Marshal(payload)
	req, _ := http.NewRequest(http.MethodPost, "/api/auth/heartbeat", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 OK from heartbeat, got %d: %s", w.Code, w.Body.String())
	}
}

func TestRegister_BlocksActiveGuest(t *testing.T) {
	router := setupTestRouter()
	username := fmt.Sprintf("reg_block_%d", time.Now().UnixNano())

	// Simulate active guest
	_, _ = AcquireGuestUsername(context.Background(), username, 1, DefaultGuestSessionTTL)

	payload := map[string]interface{}{
		"username": username,
		"dob":      "2000-01-01",
		"gender":   "other",
	}
	body, _ := json.Marshal(payload)
	req, _ := http.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusConflict {
		t.Fatalf("expected 409 Conflict when registering active guest username, got %d: %s", w.Code, w.Body.String())
	}
}


