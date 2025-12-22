-- Initialize the database with any required extensions or initial setup
-- This file is executed when the PostgreSQL container starts for the first time

-- Enable UUID extension for generating UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the main database if it doesn't exist
-- (This is handled by the POSTGRES_DB environment variable in docker-compose.yml)

-- Any additional initialization can be added here