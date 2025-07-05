-- csrf_tokens table for storing CSRF tokens
CREATE TABLE csrf_tokens (
    token_id VARCHAR(64) PRIMARY KEY,
    token VARCHAR(128) NOT NULL,
    user_id VARCHAR(64) DEFAULT NULL,
    ip_address VARCHAR(45) NOT NULL,
    user_agent VARCHAR(255) NOT NULL,
    expires_at DATETIME NOT NULL,
    used_at DATETIME DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);