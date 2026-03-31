CREATE DATABASE IF NOT EXISTS smartplayer;

CREATE TABLE IF NOT EXISTS smartplayer.events
(
    event_id       UUID DEFAULT generateUUIDv4(),
    type           LowCardinality(String),
    video_id       String,
    org_id         String,
    session_id     String,
    viewer_fingerprint String,
    timestamp      DateTime64(3),
    server_timestamp DateTime64(3) DEFAULT now64(3),
    current_time   Float32,
    duration       Float32,
    progress       UInt8,
    variant_id     Nullable(String),
    headline_variant_id Nullable(String),
    speed_variant  Nullable(Float32),
    meta           String DEFAULT '{}',
    country        LowCardinality(String) DEFAULT '',
    device         LowCardinality(String) DEFAULT '',
    browser        LowCardinality(String) DEFAULT ''
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (org_id, video_id, timestamp, session_id)
TTL toDateTime(timestamp) + INTERVAL 12 MONTH
SETTINGS index_granularity = 8192;

-- Materialized view for daily video stats (auto-aggregated)
CREATE MATERIALIZED VIEW IF NOT EXISTS smartplayer.video_stats_daily_mv
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (org_id, video_id, date)
AS
SELECT
    org_id,
    video_id,
    toDate(timestamp) AS date,
    countIf(type = 'play') AS plays,
    countIf(type = 'complete') AS completions,
    countIf(type = 'cta_click') AS cta_clicks,
    countIf(type = 'cta_show') AS cta_shows,
    uniqExactIf(viewer_fingerprint, type = 'play') AS unique_viewers,
    uniqExactIf(session_id, type = 'play') AS unique_sessions,
    avgIf(progress, type = 'complete' OR type = 'heartbeat') AS avg_progress
FROM smartplayer.events
GROUP BY org_id, video_id, date;

-- Materialized view for retention curve data
CREATE MATERIALIZED VIEW IF NOT EXISTS smartplayer.retention_mv
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (org_id, video_id, date, progress_bucket)
AS
SELECT
    org_id,
    video_id,
    toDate(timestamp) AS date,
    intDiv(progress, 5) * 5 AS progress_bucket,
    uniqExact(session_id) AS viewers
FROM smartplayer.events
WHERE type IN ('heartbeat', 'progress', 'complete')
GROUP BY org_id, video_id, date, progress_bucket;
