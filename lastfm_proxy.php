<?php
// Read API key from a file (safer than hardcoding)
$api_key_file = __DIR__ . '/lastfm_apikey.txt';
if (!file_exists($api_key_file)) {
    http_response_code(500);
    echo "API key file not found.";
    exit;
}
$api_key = trim(file_get_contents($api_key_file));

// Get the query string after ?
if (!isset($_SERVER['QUERY_STRING'])) {
    http_response_code(400);
    echo "No query string provided.";
    exit;
}
$query = $_SERVER['QUERY_STRING'];

// Parse and add api_key and format=json
parse_str($query, $params);
$params['api_key'] = $api_key;
$params['format'] = 'json';

$url = 'https://ws.audioscrobbler.com/2.0/?' . http_build_query($params);

// Proxy the request
$opts = [
    'http' => [
        'method' => 'GET',
        'header' => "User-Agent: PHP-Proxy\r\n"
    ]
];
$context = stream_context_create($opts);
$response = @file_get_contents($url, false, $context);

if ($response === FALSE) {
    http_response_code(502);
    echo "Error proxying to Last.fm.";
    exit;
}

header('Content-Type: application/json');
echo $response;
?>
