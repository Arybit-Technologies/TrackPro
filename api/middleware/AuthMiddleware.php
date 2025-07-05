<?php
/**
 * AuthMiddleware.php
 */
class AuthMiddleware {
    private static $db;

    private static function getDb() {
        if (!self::$db) {
            $database = new Database();
            self::$db = $database->connect();
        }
        return self::$db;
    }

    // Example login method
    public static function login($input) {
        if (empty($input['email']) || empty($input['password'])) {
            throw new Exception('Email and password required', 400);
        }
        $email = self::getDb()->real_escape_string($input['email']);
        $password = $input['password'];

        $query = "SELECT * FROM users WHERE email = '$email' LIMIT 1";
        $result = self::getDb()->query($query);

        if ($result->num_rows === 0) {
            throw new Exception('Invalid credentials', 401);
        }

        $user = $result->fetch_assoc();
        if (!password_verify($password, $user['password'])) {
            throw new Exception('Invalid credentials', 401);
        }

        // Set session or token as needed
        $_SESSION['user_id'] = $user['id'];
        return [
            'id' => $user['id'],
            'email' => $user['email'],
            'name' => $user['name'] ?? null
        ];
    }

    // Example logout method
    public static function logout() {
        session_destroy();
        return true;
    }

    // Example registration method
    public static function register($input) {
        if (empty($input['email']) || empty($input['password'])) {
            throw new Exception('Email and password required', 400);
        }
        $email = self::getDb()->real_escape_string($input['email']);
        $password = password_hash($input['password'], PASSWORD_DEFAULT);

        // Check if user exists
        $check = self::getDb()->query("SELECT id FROM users WHERE email = '$email'");
        if ($check->num_rows > 0) {
            throw new Exception('Email already registered', 409);
        }

        $query = "INSERT INTO users (email, password) VALUES ('$email', '$password')";
        self::getDb()->query($query);

        return true;
    }

    public static function forgotPassword($input) {
        // TODO: Implement forgot password logic (send reset email)
        return ['message' => 'Forgot password logic not implemented'];
    }

    public static function resetPassword($input) {
        // TODO: Implement reset password logic (verify token, set new password)
        return ['message' => 'Reset password logic not implemented'];
    }

    public static function verifyEmail($input) {
        // TODO: Implement email verification logic
        return ['message' => 'Verify email logic not implemented'];
    }

    public static function resendVerification($input) {
        // TODO: Implement resend verification logic
        return ['message' => 'Resend verification logic not implemented'];
    }

    // Example: require authentication for protected endpoints
    public static function requireAuth() {
        if (empty($_SESSION['user_id'])) {
            throw new Exception('Authentication required', 401);
        }
        return $_SESSION['user_id'];
    }
}