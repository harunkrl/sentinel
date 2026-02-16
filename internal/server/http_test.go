package server

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"sentinel/internal/middleware"

	"github.com/gin-gonic/gin"
)

func init() {
	gin.SetMode(gin.TestMode)
	// Set JWT secret for test token generation
	_ = os.Setenv("JWT_SECRET", "test-secret-for-server-tests")
	middleware.SecretKey = []byte("test-secret-for-server-tests")
}

// newTestServer creates a minimal HttpServer for testing without real stores
func newTestServer() *HttpServer {
	core := NewCoreServer(nil, nil, "")
	return NewHttpServer(core)
}

func TestHealthEndpoint(t *testing.T) {
	s := newTestServer()
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/health", nil)
	s.Handler().ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}

	var body map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("Failed to parse response: %v", err)
	}
	if body["status"] != "ok" {
		t.Errorf("Expected status 'ok', got '%v'", body["status"])
	}
}

func TestGetAgentsUnauthorized(t *testing.T) {
	s := newTestServer()
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/agents", nil)
	s.Handler().ServeHTTP(w, req)

	// Without auth token, should get 401
	if w.Code != http.StatusUnauthorized {
		t.Errorf("Expected status 401, got %d", w.Code)
	}
}

func TestCORSHeaders(t *testing.T) {
	s := newTestServer()
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("OPTIONS", "/api/health", nil)
	req.Header.Set("Origin", "http://localhost:3000")
	s.Handler().ServeHTTP(w, req)

	if w.Code != http.StatusNoContent {
		t.Errorf("Expected status 204 for OPTIONS, got %d", w.Code)
	}

	allowHeaders := w.Header().Get("Access-Control-Allow-Headers")
	if allowHeaders == "" {
		t.Error("Missing Access-Control-Allow-Headers")
	}
	if !strings.Contains(allowHeaders, "Authorization") {
		t.Errorf("CORS headers should contain 'Authorization', got: %s", allowHeaders)
	}
}

func TestGetAgentsReturnsEmptyList(t *testing.T) {
	s := newTestServer()
	w := httptest.NewRecorder()

	// Generate a valid token for testing
	token, err := middleware.GenerateToken("testuser", "admin")
	if err != nil {
		t.Fatalf("Failed to generate test token: %v", err)
	}

	req, _ := http.NewRequest("GET", "/api/agents", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	s.Handler().ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d (body: %s)", w.Code, w.Body.String())
	}
}
