package usecase

import (
	"sync"

	"infucare-backend/internal/domain"
)

type DeviceCache struct {
	mu 		sync.RWMutex
	items 	map[string]domain.DeviceCacheItem
}

func NewDeviceCache() *DeviceCache {
	return &DeviceCache{
		items: make(map[string]domain.DeviceCacheItem),
	}
}

// Get to read data from cache (RLock)
func (c *DeviceCache) Get(sn string) (domain.DeviceCacheItem, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	it, ok := c.items[sn]
	return it, ok
}

// Set to save data in the cache (Lock)
func (c *DeviceCache) Set(sn string, it domain.DeviceCacheItem) {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.items[sn] = it
}

// Update to read and simultaneously modify the cache content for a given key in a safe manner
func (c *DeviceCache) Update(sn string, fn func(domain.DeviceCacheItem, bool) domain.DeviceCacheItem) {
	c.mu.Lock()
	defer c.mu.Unlock()

	it, ok := c.items[sn]
	c.items[sn] = fn(it, ok)
}