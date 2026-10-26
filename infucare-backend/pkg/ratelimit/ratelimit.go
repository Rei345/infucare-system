package ratelimit

import (
	"net/http"
	"time"
	"sync"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

type visitor struct {
	limiter *rate.Limiter
	lastSeen time.Time
}

type IPLimiter struct {
	mu 		 sync.Mutex
	visitors map[string]*visitor
	r 		 rate.Limit
	burst	 int
}

func NewIPLimiter(r rate.Limit, burst int) *IPLimiter {
	l := &IPLimiter{
		visitors: 	make(map[string]*visitor), 
		r:		  	r, 
		burst: 		burst,
	}

	go l.cleanup()
	
	return l
}

func (l *IPLimiter) get(ip string) *rate.Limiter {
	l.mu.Lock()
	defer l.mu.Unlock()

	v, ok := l.visitors[ip]
	if !ok {
		v = &visitor{limiter: rate.NewLimiter(l.r, l.burst)}
		l.visitors[ip] = v
	}

	v.lastSeen = time.Now()
	return v.limiter
}

func (l *IPLimiter) cleanup() {
	for {
		time.Sleep(time.Minute)
		l.mu.Lock()
		for ip, v := range l.visitors {
			if time.Since(v.lastSeen) > 3*time.Minute {
				delete(l.visitors, ip)
			}
		}
		l.mu.Unlock()
	}
}

func (l *IPLimiter) Middleware() gin.HandlerFunc {
	return func (c *gin.Context)  {
		if !l.get(c.ClientIP()).Allow() {
			c.Header("Retry-After", "60")
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error": "Terlalu banyak permintaan, coba lagi nanti",
			})
			return
		}
		c.Next()
	}
}