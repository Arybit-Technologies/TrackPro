<?php
$host = 'trackpro.arybit.co.ke';
$port = 5000;
$message = "+RESP:GT06,860123456789012,12.345678,76.543210,40.5";

$socket = socket_create(AF_INET, SOCK_STREAM, SOL_TCP);
if (!$socket) {
    die("Socket creation failed: " . socket_strerror(socket_last_error()));
}

if (!socket_connect($socket, $host, $port)) {
    die("Connection failed: " . socket_strerror(socket_last_error($socket)));
}

socket_write($socket, $message . "\n");

$response = socket_read($socket, 1024);
echo "Server responded: $response\n";

socket_close($socket);
?>
