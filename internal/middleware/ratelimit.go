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
	ips      map[string]*rate.Limiter
	lastSeen map[string]time.Time
	mu       sync.RWMutex
	r        rate.Limit // events per second
	b        int        // burst size
}

// NewIPRateLimiter creates a custom rate limiter based on events/time and burst
// limit: requests per window
// window: time window (e.g. 1 minute)
// Example: 100 req / 1 min -> r = 100/60 = 1.66, b = 100
func NewIPRateLimiter(limit int, window time.Duration) *IPRateLimiter {
	// Convert limit/window to rate.Limit (events per second)
	r := rate.Limit(float64(limit) / window.Seconds())

	i := &IPRateLimiter{
		ips:      make(map[string]*rate.Limiter),
		lastSeen: make(map[string]time.Time),
		r:        r,
		b:        limit,
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
	i.lastSeen[ip] = time.Now()
	return limiter
}

func (i *IPRateLimiter) GetLimiter(ip string) *rate.Limiter {
	i.mu.Lock()
	limiter, exists := i.ips[ip]
	if !exists {
		limiter = rate.NewLimiter(i.r, i.b)
		i.ips[ip] = limiter
	}
	i.lastSeen[ip] = time.Now()
	i.mu.Unlock()
	return limiter
}

// cleanup removes limiters for IPs that haven't been seen in the last 10 minutes.
// This prevents unbounded memory growth from unique IP addresses.
func (i *IPRateLimiter) cleanup() {
	const ttl = 10 * time.Minute
	for {
		time.Sleep(ttl)
		i.mu.Lock()
		for ip, lastSeen := range i.lastSeen {
			if time.Since(lastSeen) > ttl {
				delete(i.ips, ip)
				delete(i.lastSeen, ip)
			}
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
	// APILimiter: 600 requests per minute (10/sec) to handle dashboard polling
	APILimiter = NewIPRateLimiter(600, time.Minute)
)
