package v1beta1

import "k8s.io/apimachinery/pkg/runtime/schema"

const (
	// APIGroup is the API group used by all kinds in this package
	APIGroup = "shorturl.grafana.app"
	// APIVersion is the API version used by all kinds in this package
	APIVersion = "v1beta1"
	// ExpiresAtAnnotation stores an absolute expiration timestamp in Unix seconds.
	ExpiresAtAnnotation = "shorturl.grafana.app/expiresAt"
	// TTLSecondsAnnotation stores a relative TTL in seconds from resource creation.
	TTLSecondsAnnotation = "shorturl.grafana.app/ttlSeconds"
)

var (
	// GroupVersion is a schema.GroupVersion consisting of the Group and Version constants for this package
	GroupVersion = schema.GroupVersion{
		Group:   APIGroup,
		Version: APIVersion,
	}
)
