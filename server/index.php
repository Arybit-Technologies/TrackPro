<?php
// Create a TCP socket
$host = '0.0.0.0';
$port = 5000;
$socket = socket_create(AF_INET, SOCK_STREAM, SOL_TCP);

if ($socket === false) {
    die("Socket creation failed: " . socket_strerror(socket_last_error()));
}

// Set socket options (reuse address)
socket_set_option($socket, SOL_SOCKET, SO_REUSEADDR, 1);

// Bind to host and port
if (socket_bind($socket, $host, $port) === false) {
    die("Socket bind failed: " . socket_strerror(socket_last_error($socket)));
}

// Listen for connections
if (socket_listen($socket, 5) === false) {
    die("Socket listen failed: " . socket_strerror(socket_last_error($socket)));
}

echo "✅ TrackPro TCP server running on $host:$port\n";

$shutdown = false;

while (!$shutdown) {
    // Accept incoming connections
    $client = @socket_accept($socket);
    if ($client === false) {
        continue;
    }

    // Get client address
    socket_getpeername($client, $client_ip);
    echo "🔌 Device connected: $client_ip\n";

    // Optional: set timeout
    socket_set_option($client, SOL_SOCKET, SO_RCVTIMEO, ['sec' => 10, 'usec' => 0]);

    // Handle client communication
    while (true) {
        $data = @socket_read($client, 1024, PHP_NORMAL_READ);
        if ($data === false) {
            echo "❌ Device disconnected: $client_ip\n";
            break;
        }

        $data = trim($data);
        if (!empty($data)) {
            echo "📥 Received: $data\n";

            // Shutdown command detection
            if ($data === 'SHUTDOWN_SERVER') {
                echo "🛑 Shutdown command received from $client_ip. Shutting down server...\n";
                socket_write($client, "Server shutting down.\n");
                $shutdown = true;
                break 2; // Exit both loops
            }

            // Simple Protocol Detection
            if (strpos($data, '+RESP') === 0) {
                echo "[Queclink Protocol Detected]\n";
                // Optional: parse fields
            } elseif (preg_match('/imei:\d+/', $data)) {
                echo "[Teltonika or Concox Format]\n";
            } else {
                echo "[Unknown Format]\n";
            }

            // Optional: log or forward
            if (!is_dir(__DIR__ . "/logs")) {
                mkdir(__DIR__ . "/logs", 0777, true);
            }
            file_put_contents(__DIR__ . "/logs/trackpro.log", date('Y-m-d H:i:s') . " | $client_ip | $data\n", FILE_APPEND);

            // Send acknowledgment
            socket_write($client, "ACK\n");
        }
    }

    // Close client socket
    socket_close($client);
}

// Close server socket
socket_close($socket);
echo "✅ Server shutdown complete.\n";
?>