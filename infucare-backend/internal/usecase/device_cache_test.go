package usecase

import (
	"fmt"
	"sync"
	"testing"

	"infucare-backend/internal/domain"
)

// TestDeviceCacheConcurrent menguji apakah DeviceCache aman diakses raturan Goroutine sekaligus
func TestDeviceCacheConcurrent(t *testing.T) {
	cache := NewDeviceCache()
	var wg sync.WaitGroup

	for i := 0; i < 100; i++ {
		wg.Add(1)
		go func (id int)  {
			defer wg.Done()
			sn := fmt.Sprintf("ESP32-INF-%03d", id%5)

			cache.Set(sn, domain.DeviceCacheItem{})
			cache.Update(sn, func(it domain.DeviceCacheItem, ok bool) domain.DeviceCacheItem {
				return it
			})
			_, _ = cache.Get(sn)
		}(i)
	}

	wg.Wait()

	_, ok := cache.Get("ESP32-INF-001")
	if !ok {
		t.Errorf("Seharusnya ESP32-INF-001 terdaftar di dalam cache")
	}

}