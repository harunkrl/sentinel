package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

// IPRateLimiter manages limiters for each IP address
type IPRateLimiter struct {
	ips    map[string]*rate.Limiter
	mu     sync.RWMutex
	r      rate.Limit // events per second
	b      int        // burst size
}

// NewIPRateLimiter creates a custom rate limiter based on events/time and burst
// limit: requests per window
// window: time window (e.g. 1 minute)
// Example: 100 req / 1 min -> r = 100/60 = 1.66, b = 100
func NewIPRateLimiter(limit int, window time.Duration) *IPRateLimiter {
	// Convert limit/window to rate.Limit (events per second)
	r := rate.Limit(float64(limit) / window.Seconds())
	
	i := &IPRateLimiter{
		ips: make(map[string]*rate.Limiter),
		r:   r,
		b:   limit,
	}
	
	// Cleanup routine to prevent memory leak from stale IPs
	go i.cleanup()
	
	return i
}

func (i *IPRateLimiter) AddIP(ip string) *rate.Limiter {
	i.mu.Lock()
	defer i.mu.Unlock()

	limiter := rate.NewLimiter(i.r, i.b)
	i.ips[ip] = limiter
	return limiter
}

func (i *IPRateLimiter) GetLimiter(ip string) *rate.Limiter {
	i.mu.Lock()
	limiter, exists := i.ips[ip]
	if !exists {
		limiter = rate.NewLimiter(i.r, i.b)
		i.ips[ip] = limiter
	}
	i.mu.Unlock()
	return limiter
}

// cleanup removes limiters that haven't been used recently?
// Ideally, we need a "last seen" map for true cleanup.
// For simplicity in this iteration, we just purge the map periodically if it gets too big.
// Or we rely on the fact that rate.Limiter is small struct.
func (i *IPRateLimiter) cleanup() {
	for {
		time.Sleep(10 * time.Minute)
		i.mu.Lock()
		// Naive cleanup: clear all if too big (simple protection)
		// A better approach is checking LastSeen for each IP.
		if len(i.ips) > 10000 {
			i.ips = make(map[string]*rate.Limiter)
		}
		i.mu.Unlock()
	}
}

// RateLimitMiddleware creates a Gin middleware for rate limiting
func RateLimitMiddleware(limiter *IPRateLimiter) gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()
		l := limiter.GetLimiter(ip)
		
		if !l.Allow() {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error": "Rate limit exceeded. Please try again later.",
			})
			c.Abort()
			return
		}
		c.Next()
	}
}

// Pre-configured limiters
var (
	// LoginLimiter: 5 requests per minute
	LoginLimiter = NewIPRateLimiter(5, time.Minute)
	// APILimiter: 100 requests per minute
	APILimiter = NewIPRateLimiter(100, time.Minute)
)
