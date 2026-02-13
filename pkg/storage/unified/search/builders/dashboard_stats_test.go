package builders

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"github.com/grafana/grafana/pkg/services/sqlstore"
	"github.com/grafana/grafana/pkg/tests/testsuite"
)

func TestMain(m *testing.M) {
	testsuite.Run(m)
}

func TestLoadDashboardHealthStatsFromSQL(t *testing.T) {
	store, _ := sqlstore.InitTestDB(t)
	ctx := context.Background()
	session := store.GetSqlxSession()

	_, err := session.Exec(ctx, `
CREATE TABLE IF NOT EXISTS dashboard_usage_sums (
	dashboard_id BIGINT,
	updated DATETIME,
	views_last_1_days BIGINT,
	views_last_7_days BIGINT,
	views_last_30_days BIGINT,
	views_total BIGINT,
	queries_last_1_days BIGINT,
	queries_last_7_days BIGINT,
	queries_last_30_days BIGINT,
	queries_total BIGINT,
	errors_last_1_days BIGINT,
	errors_last_7_days BIGINT,
	errors_last_30_days BIGINT,
	errors_total BIGINT,
	dashboard_uid VARCHAR(40),
	org_id BIGINT
)
`)
	require.NoError(t, err)

	_, err = session.Exec(ctx, `
CREATE TABLE IF NOT EXISTS dashboard_usage_by_day (
	dashboard_id BIGINT,
	day DATE,
	views BIGINT,
	queries BIGINT,
	errors BIGINT,
	load_duration DOUBLE,
	cached_queries BIGINT,
	dashboard_uid VARCHAR(40),
	org_id BIGINT
)
`)
	require.NoError(t, err)

	now := time.Now().UTC()
	today := now.Format("2006-01-02")
	yesterday := now.AddDate(0, 0, -1).Format("2006-01-02")
	oldDay := now.AddDate(0, 0, -60).Format("2006-01-02")

	_, err = session.Exec(ctx, `
INSERT INTO dashboard_usage_sums (
	dashboard_id, updated, views_last_1_days, views_last_7_days, views_last_30_days, views_total,
	queries_last_1_days, queries_last_7_days, queries_last_30_days, queries_total,
	errors_last_1_days, errors_last_7_days, errors_last_30_days, errors_total, dashboard_uid, org_id
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`, 1, now, 10, 20, 30, 40, 10, 50, 120, 180, 1, 3, 6, 9, "dash-a", 1)
	require.NoError(t, err)

	_, err = session.Exec(ctx, `
INSERT INTO dashboard_usage_sums (
	dashboard_id, updated, views_last_1_days, views_last_7_days, views_last_30_days, views_total,
	queries_last_1_days, queries_last_7_days, queries_last_30_days, queries_total,
	errors_last_1_days, errors_last_7_days, errors_last_30_days, errors_total, dashboard_uid, org_id
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`, 2, now, 0, 0, 0, 0, 0, 0, 100, 100, 0, 0, 1, 1, "dash-b", 2)
	require.NoError(t, err)

	_, err = session.Exec(ctx, `
INSERT INTO dashboard_usage_by_day (
	dashboard_id, day, views, queries, errors, load_duration, cached_queries, dashboard_uid, org_id
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`, 1, today, 20, 100, 5, 75000, 0, "dash-a", 1)
	require.NoError(t, err)

	_, err = session.Exec(ctx, `
INSERT INTO dashboard_usage_by_day (
	dashboard_id, day, views, queries, errors, load_duration, cached_queries, dashboard_uid, org_id
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`, 1, yesterday, 10, 20, 1, 15000, 0, "dash-a", 1)
	require.NoError(t, err)

	_, err = session.Exec(ctx, `
INSERT INTO dashboard_usage_by_day (
	dashboard_id, day, views, queries, errors, load_duration, cached_queries, dashboard_uid, org_id
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`, 1, oldDay, 5, 10, 0, 90000, 0, "dash-a", 1)
	require.NoError(t, err)

	_, err = session.Exec(ctx, `
INSERT INTO dashboard_usage_by_day (
	dashboard_id, day, views, queries, errors, load_duration, cached_queries, dashboard_uid, org_id
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`, 3, today, 1, 50, 0, 5000, 0, "dash-c", 1)
	require.NoError(t, err)

	stats, err := LoadDashboardHealthStatsFromSQL(ctx, store, 1)
	require.NoError(t, err)

	require.Len(t, stats, 2)
	require.NotContains(t, stats, "dash-b")

	require.Equal(t, int64(120), stats["dash-a"][DASHBOARD_QUERIES_LAST_30_DAYS])
	require.Equal(t, int64(6), stats["dash-a"][DASHBOARD_ERRORS_LAST_30_DAYS])
	require.Equal(t, int64(750), stats["dash-a"][DASHBOARD_PANEL_AVG_LOAD_TIME_MS_LAST_30_DAYS])
	require.Equal(t, int64(5), stats["dash-a"][DASHBOARD_PANEL_ERROR_RATE_PCT_LAST_30_DAYS])

	require.Equal(t, int64(50), stats["dash-c"][DASHBOARD_QUERIES_LAST_30_DAYS])
	require.Equal(t, int64(100), stats["dash-c"][DASHBOARD_PANEL_AVG_LOAD_TIME_MS_LAST_30_DAYS])
	require.Equal(t, int64(0), stats["dash-c"][DASHBOARD_PANEL_ERROR_RATE_PCT_LAST_30_DAYS])
}
