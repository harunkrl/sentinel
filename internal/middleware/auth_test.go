package middleware

import (
	"os"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func TestMain(m *testing.M) {
	// Set JWT_SECRET for tests
	os.Setenv("JWT_SECRET", "test-secret-key-for-unit-tests")
	
	// Reinitialize SecretKey
	SecretKey = []byte(os.Getenv("JWT_SECRET"))
	
	os.Exit(m.Run())
}

func TestGenerateToken(t *testing.T) {
	token, err := GenerateToken("testuser", "admin")
	if err != nil {
		t.Fatalf("Failed to generate token: %v", err)
	}

	if token == "" {
		t.Error("Expected non-empty token")
	}
}

func TestGenerateToken_ValidClaims(t *testing.T) {
	tokenString, err := GenerateToken("myuser", "viewer")
	if err != nil {
		t.Fatal(err)
	}

	// Parse the token
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		return SecretKey, nil
	})
	if err != nil {
		t.Fatalf("Failed to parse token: %v", err)
	}

	claims, ok := token.Claims.(*Claims)
	if !ok {
		t.Fatal("Failed to get claims")
	}

	if claims.Username != "myuser" {
		t.Errorf("Expected username 'myuser', got '%s'", claims.Username)
	}
	if claims.Role != "viewer" {
		t.Errorf("Expected role 'viewer', got '%s'", claims.Role)
	}

	// Check expiration is ~24h from now
	if claims.ExpiresAt == nil {
		t.Fatal("Expected ExpiresAt to be set")
	}
	expires := claims.ExpiresAt.Time
	expected := time.Now().Add(24 * time.Hour)
	diff := expires.Sub(expected)
	if diff < -time.Minute || diff > time.Minute {
		t.Errorf("Expiration time not as expected. Got: %v, Expected: ~%v", expires, expected)
	}
}
