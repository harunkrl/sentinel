package middleware

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

var (
	SecretKey  []byte
	secretOnce sync.Once
)

// initSecret lazily initializes the JWT secret key from environment.
// This avoids panicking at import time which breaks tests and dependent packages.
func initSecret() {
	secretOnce.Do(func() {
		secret := os.Getenv("JWT_SECRET")
		if secret == "" {
			log.Fatal("FATAL: JWT_SECRET environment variable is required")
		}
		SecretKey = []byte(secret)
	})
}

type Claims struct {
	Username string `json:"username"`
	Role     string `json:"role"`
	jwt.RegisteredClaims
}

func GenerateToken(username, role string) (string, error) {
	initSecret()
	expirationTime := time.Now().Add(24 * time.Hour)
	claims := &Claims{
		Username: username,
		Role:     role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(SecretKey)
}

func AuthMiddleware() gin.HandlerFunc {
	initSecret()
	return func(c *gin.Context) {
		tokenString := ""
		authHeader := c.GetHeader("Authorization")
		if authHeader != "" {
			tokenString = strings.TrimPrefix(authHeader, "Bearer ")
		} else {
			// Fallback to query param (useful for SSE)
			tokenString = c.Query("token")
		}

		if tokenString == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization required"})
			c.Abort()
			return
		}
		claims := &Claims{}

		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method")
			}
			return SecretKey, nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		c.Set("username", claims.Username)
		c.Set("role", claims.Role)
		c.Next()
	}
}
