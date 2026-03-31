package v1beta1

import (
	"strconv"
	"time"
)

// GetExpirationTimestamp resolves a short URL expiration timestamp from annotations.
// ExpiresAtAnnotation takes precedence over TTLSecondsAnnotation.
func GetExpirationTimestamp(annotations map[string]string, createdAt time.Time) (int64, bool) {
	if len(annotations) == 0 {
		return 0, false
	}

	if expiresAtStr, ok := annotations[ExpiresAtAnnotation]; ok {
		expiresAt, err := strconv.ParseInt(expiresAtStr, 10, 64)
		if err == nil && expiresAt > 0 {
			return expiresAt, true
		}
	}

	if ttlStr, ok := annotations[TTLSecondsAnnotation]; ok {
		ttlSeconds, err := strconv.ParseInt(ttlStr, 10, 64)
		if err == nil && ttlSeconds > 0 {
			return createdAt.Unix() + ttlSeconds, true
		}
	}

	return 0, false
}

func IsExpired(annotations map[string]string, createdAt time.Time, now time.Time) bool {
	expiresAt, ok := GetExpirationTimestamp(annotations, createdAt)
	return ok && expiresAt <= now.Unix()
}
