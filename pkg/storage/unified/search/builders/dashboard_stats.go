package builders

import (
	"context"
	"database/sql"
	"math"
	"time"

	grafanadb "github.com/grafana/grafana/pkg/infra/db"
)

type OssDashboardStats struct{}

func ProvideDashboardStats() *OssDashboardStats {
	return &OssDashboardStats{}
}

func (s *OssDashboardStats) GetStats(ctx context.Context, namespace string) (map[string]map[string]int64, error) {
	return nil, nil
}

func LoadDashboardHealthStatsFromSQL(ctx context.Context, sqlStore grafanadb.DB, orgID int64) (map[string]map[string]int64, error) {
	stats := make(map[string]map[string]int64)
	if sqlStore == nil || orgID < 1 {
		return stats, nil
	}

	if err := loadDashboardUsageSums(ctx, sqlStore, orgID, stats); err != nil {
		return nil, err
	}

	if err := loadDashboardLoadDurations(ctx, sqlStore, orgID, stats); err != nil {
		return nil, err
	}

	for _, values := range stats {
		queries, hasQueries := values[DASHBOARD_QUERIES_LAST_30_DAYS]
		errors, hasErrors := values[DASHBOARD_ERRORS_LAST_30_DAYS]
		if !hasQueries && !hasErrors {
			continue
		}
		values[DASHBOARD_PANEL_ERROR_RATE_PCT_LAST_30_DAYS] = dashboardErrorRatePct(errors, queries)
	}

	return stats, nil
}

func loadDashboardUsageSums(ctx context.Context, sqlStore grafanadb.DB, orgID int64, stats map[string]map[string]int64) error {
	rows, err := sqlStore.GetSqlxSession().Query(ctx, `
SELECT dashboard_uid, queries_last_30_days, errors_last_30_days
FROM dashboard_usage_sums
WHERE org_id = ? AND dashboard_uid IS NOT NULL
`, orgID)
	if err != nil {
		return err
	}
	defer func() {
		_ = rows.Close()
	}()

	for rows.Next() {
		var uid string
		var queriesLast30 int64
		var errorsLast30 int64
		if err := rows.Scan(&uid, &queriesLast30, &errorsLast30); err != nil {
			return err
		}

		values := getOrCreateDashboardStats(stats, uid)
		values[DASHBOARD_QUERIES_LAST_30_DAYS] = queriesLast30
		values[DASHBOARD_ERRORS_LAST_30_DAYS] = errorsLast30
	}

	return rows.Err()
}

func loadDashboardLoadDurations(ctx context.Context, sqlStore grafanadb.DB, orgID int64, stats map[string]map[string]int64) error {
	cutoffDate := time.Now().AddDate(0, 0, -30).Format("2006-01-02")
	rows, err := sqlStore.GetSqlxSession().Query(ctx, `
SELECT dashboard_uid, SUM(load_duration) AS total_load_duration, SUM(queries) AS total_queries
FROM dashboard_usage_by_day
WHERE org_id = ? AND dashboard_uid IS NOT NULL AND day >= ?
GROUP BY dashboard_uid
`, orgID, cutoffDate)
	if err != nil {
		return err
	}
	defer func() {
		_ = rows.Close()
	}()

	for rows.Next() {
		var uid string
		var totalLoadDuration sql.NullFloat64
		var totalQueries sql.NullInt64
		if err := rows.Scan(&uid, &totalLoadDuration, &totalQueries); err != nil {
			return err
		}

		if !totalQueries.Valid || totalQueries.Int64 < 1 || !totalLoadDuration.Valid {
			continue
		}

		values := getOrCreateDashboardStats(stats, uid)
		values[DASHBOARD_PANEL_AVG_LOAD_TIME_MS_LAST_30_DAYS] = int64(math.Round(totalLoadDuration.Float64 / float64(totalQueries.Int64)))

		if _, ok := values[DASHBOARD_QUERIES_LAST_30_DAYS]; !ok {
			values[DASHBOARD_QUERIES_LAST_30_DAYS] = totalQueries.Int64
		}
	}

	return rows.Err()
}

func getOrCreateDashboardStats(stats map[string]map[string]int64, uid string) map[string]int64 {
	values, ok := stats[uid]
	if !ok {
		values = make(map[string]int64)
		stats[uid] = values
	}
	return values
}

func dashboardErrorRatePct(errors int64, queries int64) int64 {
	if queries < 1 {
		if errors > 0 {
			return 100
		}
		return 0
	}
	return int64(math.Round((float64(errors) * 100) / float64(queries)))
}
