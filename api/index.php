<?php
session_start();

/**
 * Set CORS headers for cross-origin requests.
 */
header("Access-Control-Allow-Origin: " . ($_SERVER['HTTP_ORIGIN'] ?? '*'));
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With, X-CSRF-TOKEN");
header("Access-Control-Expose-Headers: X-CSRF-TOKEN");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Load database config and middleware
$base_dir = __DIR__;
require_once $base_dir . '/config/database.php';
require_once $base_dir . '/middleware/CsrfMiddleware.php';
require_once $base_dir . '/middleware/AuthMiddleware.php';

// Parse JSON input
$input = json_decode(file_get_contents("php://input"), true);

// Parse request
$request = $_SERVER['REQUEST_URI'];
$method = $_SERVER['REQUEST_METHOD'];

// Clean the request path
$request = parse_url($request, PHP_URL_PATH);
$request = str_replace('/api', '', $request);
$request = rtrim($request, '/');
if (empty($request)) {
    $request = '/';
}

try {
    $db = new Database();
    $conn = $db->connect();

    // Skip CSRF check for token generation and OPTIONS
    if ($request !== '/csrf-token' && $method !== 'OPTIONS' && $method !== 'GET') {
        CsrfMiddleware::validateToken();
    }

    // CSRF token endpoint
    if ($request === '/csrf-token') {
        header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? '*'));
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Allow-Methods: GET, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, X-Requested-With, X-CSRF-TOKEN');
        header('Access-Control-Expose-Headers: X-CSRF-TOKEN');
        
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(200);
            exit();
        }

        try {
            $token = CsrfMiddleware::generateToken();
            $_SESSION['csrf_token'] = $token;
            header('X-CSRF-TOKEN: ' . $token);
            echo json_encode([
                'success' => true,
                'data' => [
                    'token' => $token
                ],
                'expires' => date('c', strtotime('+1 hour'))
            ]);
            exit();
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Failed to generate CSRF token'
            ]);
            exit();
        }
    }

    // Main API endpoints
    switch ($request) {
        // Root endpoint
        case '/':
            echo json_encode([
                'success' => true,
                'message' => 'TrackPro API v1',
                'endpoints' => [
                    '/csrf-token',
                    '/auth/login',
                    '/auth/logout',
                    '/auth/register',
                    '/auth/forgot-password',
                    '/auth/reset-password',
                    '/auth/verify-email',
                    '/auth/resend-verification',
                    '/user/profile',
                    '/user/update-profile',
                    '/user/change-password',
                    '/user/delete-account',
                    '/posts/create',
                    '/posts/update',
                    '/posts/delete',
                    '/posts/list',
                    '/posts/detail',
                    '/comments/create',
                    '/comments/update',
                    '/comments/delete',
                    '/comments/list',
                    '/notifications/list',
                    '/notifications/mark-as-read',
                    '/notifications/delete',
                    '/messages/send',
                    '/messages/list',
                    '/messages/detail',
                    '/messages/delete',
                    '/settings/get',
                    '/settings/update',
                    '/reports/create',
                    '/reports/list',
                    '/reports/detail',
                    '/search/global',
                    '/search/posts',
                    '/search/users',
                    '/analytics/dashboard',
                    '/analytics/user-stats',
                    '/analytics/post-stats',
                    '/files/upload',
                    '/files/download',
                    '/files/delete',
                    '/admin/user-management',
                    '/admin/post-moderation',
                    '/admin/reports-management',
                    '/admin/settings-management'
                ]
            ], JSON_PRETTY_PRINT);
            break;

        // --- AUTH ENDPOINTS ---
        case '/auth/login':
            try {
                $user = AuthMiddleware::login($input);
                echo json_encode(['success' => true, 'user' => $user], JSON_PRETTY_PRINT);
            } catch (Exception $e) {
                http_response_code($e->getCode() ?: 400);
                echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_PRETTY_PRINT);
            }
            break;

        case '/auth/logout':
            try {
                AuthMiddleware::logout();
                echo json_encode(['success' => true, 'message' => 'Logged out'], JSON_PRETTY_PRINT);
            } catch (Exception $e) {
                http_response_code($e->getCode() ?: 400);
                echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_PRETTY_PRINT);
            }
            break;

        case '/auth/register':
            try {
                AuthMiddleware::register($input);
                echo json_encode(['success' => true, 'message' => 'Registered'], JSON_PRETTY_PRINT);
            } catch (Exception $e) {
                http_response_code($e->getCode() ?: 400);
                echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_PRETTY_PRINT);
            }
            break;

        case '/auth/forgot-password':
            try {
                $result = AuthMiddleware::forgotPassword($input);
                echo json_encode(['success' => true, 'data' => $result], JSON_PRETTY_PRINT);
            } catch (Exception $e) {
                http_response_code($e->getCode() ?: 400);
                echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_PRETTY_PRINT);
            }
            break;

        case '/auth/reset-password':
            try {
                $result = AuthMiddleware::resetPassword($input);
                echo json_encode(['success' => true, 'data' => $result], JSON_PRETTY_PRINT);
            } catch (Exception $e) {
                http_response_code($e->getCode() ?: 400);
                echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_PRETTY_PRINT);
            }
            break;

        case '/auth/verify-email':
            try {
                $result = AuthMiddleware::verifyEmail($input);
                echo json_encode(['success' => true, 'data' => $result], JSON_PRETTY_PRINT);
            } catch (Exception $e) {
                http_response_code($e->getCode() ?: 400);
                echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_PRETTY_PRINT);
            }
            break;

        case '/auth/resend-verification':
            try {
                $result = AuthMiddleware::resendVerification($input);
                echo json_encode(['success' => true, 'data' => $result], JSON_PRETTY_PRINT);
            } catch (Exception $e) {
                http_response_code($e->getCode() ?: 400);
                echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_PRETTY_PRINT);
            }
            break;

        // --- USER ENDPOINTS ---
        case '/user/profile':
            echo json_encode(['success' => true, 'message' => 'User profile endpoint']);
            break;

        case '/user/update-profile':
            echo json_encode(['success' => true, 'message' => 'Update profile endpoint']);
            break;

        case '/user/change-password':
            echo json_encode(['success' => true, 'message' => 'Change password endpoint']);
            break;

        case '/user/delete-account':
            echo json_encode(['success' => true, 'message' => 'Delete account endpoint']);
            break;

        // --- POSTS ENDPOINTS ---
        case '/posts/create':
            echo json_encode(['success' => true, 'message' => 'Create post endpoint']);
            break;

        case '/posts/update':
            echo json_encode(['success' => true, 'message' => 'Update post endpoint']);
            break;

        case '/posts/delete':
            echo json_encode(['success' => true, 'message' => 'Delete post endpoint']);
            break;

        case '/posts/list':
            echo json_encode(['success' => true, 'message' => 'List posts endpoint']);
            break;

        case '/posts/detail':
            echo json_encode(['success' => true, 'message' => 'Post detail endpoint']);
            break;

        // --- COMMENTS ENDPOINTS ---
        case '/comments/create':
            echo json_encode(['success' => true, 'message' => 'Create comment endpoint']);
            break;

        case '/comments/update':
            echo json_encode(['success' => true, 'message' => 'Update comment endpoint']);
            break;

        case '/comments/delete':
            echo json_encode(['success' => true, 'message' => 'Delete comment endpoint']);
            break;

        case '/comments/list':
            echo json_encode(['success' => true, 'message' => 'List comments endpoint']);
            break;

        // --- NOTIFICATIONS ENDPOINTS ---
        case '/notifications/list':
            echo json_encode(['success' => true, 'message' => 'List notifications endpoint']);
            break;

        case '/notifications/mark-as-read':
            echo json_encode(['success' => true, 'message' => 'Mark notification as read endpoint']);
            break;

        case '/notifications/delete':
            echo json_encode(['success' => true, 'message' => 'Delete notification endpoint']);
            break;

        // --- MESSAGES ENDPOINTS ---
        case '/messages/send':
            echo json_encode(['success' => true, 'message' => 'Send message endpoint']);
            break;

        case '/messages/list':
            echo json_encode(['success' => true, 'message' => 'List messages endpoint']);
            break;

        case '/messages/detail':
            echo json_encode(['success' => true, 'message' => 'Message detail endpoint']);
            break;

        case '/messages/delete':
            echo json_encode(['success' => true, 'message' => 'Delete message endpoint']);
            break;

        // --- SETTINGS ENDPOINTS ---
        case '/settings/get':
            echo json_encode(['success' => true, 'message' => 'Get settings endpoint']);
            break;

        case '/settings/update':
            echo json_encode(['success' => true, 'message' => 'Update settings endpoint']);
            break;

        // --- REPORTS ENDPOINTS ---
        case '/reports/create':
            echo json_encode(['success' => true, 'message' => 'Create report endpoint']);
            break;

        case '/reports/list':
            echo json_encode(['success' => true, 'message' => 'List reports endpoint']);
            break;

        case '/reports/detail':
            echo json_encode(['success' => true, 'message' => 'Report detail endpoint']);
            break;

        // --- SEARCH ENDPOINTS ---
        case '/search/global':
            echo json_encode(['success' => true, 'message' => 'Global search endpoint']);
            break;

        case '/search/posts':
            echo json_encode(['success' => true, 'message' => 'Search posts endpoint']);
            break;

        case '/search/users':
            echo json_encode(['success' => true, 'message' => 'Search users endpoint']);
            break;

        // --- ANALYTICS ENDPOINTS ---
        case '/analytics/dashboard':
            echo json_encode(['success' => true, 'message' => 'Analytics dashboard endpoint']);
            break;

        case '/analytics/user-stats':
            echo json_encode(['success' => true, 'message' => 'User stats endpoint']);
            break;

        case '/analytics/post-stats':
            echo json_encode(['success' => true, 'message' => 'Post stats endpoint']);
            break;

        // --- FILES ENDPOINTS ---
        case '/files/upload':
            echo json_encode(['success' => true, 'message' => 'File upload endpoint']);
            break;

        case '/files/download':
            echo json_encode(['success' => true, 'message' => 'File download endpoint']);
            break;

        case '/files/delete':
            echo json_encode(['success' => true, 'message' => 'File delete endpoint']);
            break;

        // --- ADMIN ENDPOINTS ---
        case '/admin/user-management':
            echo json_encode(['success' => true, 'message' => 'Admin user management endpoint']);
            break;

        case '/admin/post-moderation':
            echo json_encode(['success' => true, 'message' => 'Admin post moderation endpoint']);
            break;

        case '/admin/reports-management':
            echo json_encode(['success' => true, 'message' => 'Admin reports management endpoint']);
            break;

        case '/admin/settings-management':
            echo json_encode(['success' => true, 'message' => 'Admin settings management endpoint']);
            break;

        default:
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Endpoint not found'], JSON_PRETTY_PRINT);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Internal server error'], JSON_PRETTY_PRINT);

}
