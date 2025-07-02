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

// Load database config
$base_dir = __DIR__;
require_once $base_dir . '/config/database.php';


/**
 * Output the API response as JSON.
 */