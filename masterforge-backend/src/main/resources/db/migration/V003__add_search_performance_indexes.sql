-- Migration: V003 - Add search performance indexes
-- Purpose: Optimize campaign search queries with GIN full-text, trigram, and composite indexes.

-- ============================================================
-- Full-text search index (GIN) on name + description
-- Used by: to_tsvector-based FTS queries for fast text search
-- Requirement: 2.3, 8.2
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_campaigns_fts
    ON campaigns
    USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- ============================================================
-- Composite index on (visibility, join_price)
-- Used by: price-range + visibility filtering queries
-- Requirement: 3.1, 8.3
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_campaigns_visibility_join_price
    ON campaigns(visibility, join_price);

-- ============================================================
-- Composite index on (visibility, max_players)
-- Used by: capacity + visibility filtering queries
-- Requirement: 3.2, 8.3
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_campaigns_visibility_max_players
    ON campaigns(visibility, max_players);

-- ============================================================
-- Composite index on (visibility, id DESC)
-- Used by: default sort order (visibility + id DESC) queries
-- Requirement: 1.1, 8.1
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_campaigns_visibility_id
    ON campaigns(visibility, id DESC);

-- ============================================================
-- Trigram indexes for LIKE-based partial text search
-- Requires pg_trgm extension (available in standard PostgreSQL)
-- Used by: LIKE '%searchText%' queries on name and description
-- Requirement: 2.1, 2.2, 8.2
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_campaigns_name_trgm
    ON campaigns
    USING gin(name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_campaigns_description_trgm
    ON campaigns
    USING gin(description gin_trgm_ops);
