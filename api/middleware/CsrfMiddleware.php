<?php
class CsrfMiddleware {
    private static $db;

    private static function getDb() {
        if (!self::$db) {
            $database = new Database();
            self::$db = $database->connect();
        }
        return self::$db;
    }

    public static function generateToken() {
        $token = bin2hex(random_bytes(32));
        $userId = isset($_SESSION['user_id']) ? $_SESSION['user_id'] : null;
        $tokenId = uniqid('csrf_', true);
        
        // Escape values
        $tokenId = self::getDb()->real_escape_string($tokenId);
        $token = self::getDb()->real_escape_string($token);
        $userId = $userId ? self::getDb()->real_escape_string($userId) : 'NULL';
        $ipAddress = self::getDb()->real_escape_string($_SERVER['REMOTE_ADDR']);
        $userAgent = self::getDb()->real_escape_string($_SERVER['HTTP_USER_AGENT']);
        
        $query = "INSERT INTO csrf_tokens ( token_id, token, user_id, ip_address, user_agent, expires_at ) 
        VALUES ( '$tokenId', '$token', $userId, '$ipAddress', '$userAgent', DATE_ADD(NOW(), INTERVAL 1 HOUR) )";

        self::getDb()->query($query);
        
        return $token;
    }

    public static function validateToken() {
        // Skip validation for GET and OPTIONS requests
        if ($_SERVER['REQUEST_METHOD'] === 'GET' || 
            $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            return true;
        }

        $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? null;
         
        if (!$token) {
            throw new Exception('CSRF token missing', 419);
        }

        // Escape values
        $token = self::getDb()->real_escape_string($token);
        $ipAddress = self::getDb()->real_escape_string($_SERVER['REMOTE_ADDR']);
        $userAgent = self::getDb()->real_escape_string($_SERVER['HTTP_USER_AGENT']);

        $query = "SELECT * FROM csrf_tokens WHERE token = '$token';";

        $result = self::getDb()->query($query);

        if ($result->num_rows === 0) {
            throw new Exception('Invalid or expired CSRF token query ' . $query, 419);
        }

        // Mark token as used
        $row = $result->fetch_assoc();
        $tokenId = self::getDb()->real_escape_string($row['token_id']);        
        $updateQuery = "UPDATE csrf_tokens SET used_at = NOW() WHERE token_id = '$tokenId'";
                       
        self::getDb()->query($updateQuery);

        return true;
    }

    public static function cleanupExpiredTokens() {
        $query = "DELETE FROM csrf_tokens WHERE expires_at < NOW() OR used_at IS NOT NULL";
                 
        self::getDb()->query($query);
    }
}