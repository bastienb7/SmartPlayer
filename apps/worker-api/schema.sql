-- SlyPlayer D1 Schema

CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  plan TEXT DEFAULT 'free',
  api_key TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  org_id TEXT NOT NULL DEFAULT 'default',
  email_verified INTEGER DEFAULT 0,
  verification_token TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS videos (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'uploading',
  filename TEXT,
  hls_url TEXT,
  poster_url TEXT,
  duration REAL DEFAULT 0,
  width INTEGER DEFAULT 0,
  height INTEGER DEFAULT 0,
  size_bytes INTEGER DEFAULT 0,
  folder_id TEXT,
  category TEXT DEFAULT 'custom',
  tags TEXT DEFAULT '[]',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  video_id TEXT NOT NULL UNIQUE,
  org_id TEXT NOT NULL,
  autoplay_config TEXT DEFAULT '{"enabled":true,"mutedMessage":"Your video has already started","clickMessage":"Click to listen","overlayOpacity":0.85}',
  progress_bar_config TEXT DEFAULT '{"enabled":true,"fictitious":true,"fastPhaseEnd":0.2,"slowPhaseEnd":0.8}',
  recovery_thumbnail_config TEXT DEFAULT '{"enabled":false,"imageUrl":"","delayMs":2000}',
  resume_play_config TEXT DEFAULT '{"enabled":true,"maxAgeDays":7,"promptMessage":"Continue where you left off?"}',
  mini_hook_config TEXT DEFAULT '{"enabled":false,"hooks":[]}',
  turbo_speed_config TEXT DEFAULT '{"enabled":false,"minSpeed":0.95,"maxSpeed":1.15}',
  style_config TEXT DEFAULT '{"primaryColor":"#6366f1","backgroundColor":"#000000","controlsBackground":"rgba(0,0,0,0.7)","controlsColor":"#ffffff","borderRadius":8,"showControls":true}',
  cta_config TEXT DEFAULT '[]',
  exit_intent_config TEXT DEFAULT '{}',
  pixel_config TEXT DEFAULT '[]',
  headlines_config TEXT DEFAULT '{}',
  chapters_config TEXT DEFAULT '[]',
  countdown_config TEXT DEFAULT '{}',
  social_proof_config TEXT DEFAULT '[]',
  page_sync_config TEXT DEFAULT '[]',
  traffic_filter_config TEXT DEFAULT '{}',
  playback_config TEXT DEFAULT '{}',
  polls_config TEXT DEFAULT '{}',
  analytics_enabled INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS folders (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  parent_id TEXT,
  color TEXT DEFAULT '#6366f1',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS funnels (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft',
  combined_progress INTEGER DEFAULT 1,
  preload_seconds INTEGER DEFAULT 5,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS funnel_steps (
  id TEXT PRIMARY KEY,
  funnel_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  category TEXT DEFAULT 'custom',
  name TEXT NOT NULL,
  ab_test_enabled INTEGER DEFAULT 0,
  ab_test_status TEXT DEFAULT 'draft',
  winner_variant_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (funnel_id) REFERENCES funnels(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS funnel_step_variants (
  id TEXT PRIMARY KEY,
  step_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  video_id TEXT NOT NULL,
  name TEXT NOT NULL,
  weight INTEGER DEFAULT 100,
  is_winner INTEGER DEFAULT 0,
  is_eliminated INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (step_id) REFERENCES funnel_steps(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS analytics_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  video_id TEXT NOT NULL,
  org_id TEXT DEFAULT '',
  session_id TEXT,
  viewer_fingerprint TEXT,
  timestamp INTEGER,
  current_time REAL,
  duration REAL,
  progress INTEGER,
  variant_id TEXT,
  meta TEXT DEFAULT '{}',
  device TEXT DEFAULT '',
  browser TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_videos_org ON videos(org_id);
CREATE INDEX IF NOT EXISTS idx_events_video ON analytics_events(video_id, type);
CREATE INDEX IF NOT EXISTS idx_events_session ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_folders_org ON folders(org_id);
CREATE INDEX IF NOT EXISTS idx_funnel_steps_funnel ON funnel_steps(funnel_id);
CREATE INDEX IF NOT EXISTS idx_variants_step ON funnel_step_variants(step_id);

-- Default org
INSERT OR IGNORE INTO organizations (id, name) VALUES ('default', 'Default Organization');
