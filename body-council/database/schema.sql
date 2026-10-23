CREATE TABLE IF NOT EXISTS rooms (
  code TEXT PRIMARY KEY NOT NULL,
  state TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 0,
  matchmaking INTEGER NOT NULL DEFAULT 0,
  seats INTEGER NOT NULL DEFAULT 1,
  phase TEXT NOT NULL DEFAULT 'lobby',
  expires INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS rooms_queue ON rooms(matchmaking, phase, seats, expires);
