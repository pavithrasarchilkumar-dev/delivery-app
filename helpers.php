<?php
// includes/helpers.php — Common helpers for all API files

// Allow CORS for frontend
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200); exit();
}

// Send JSON response helper
function send($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data);
    exit();
}

function success($message, $extra = []) {
    send(array_merge(['success' => true, 'message' => $message], $extra));
}

function error($message, $code = 400) {
    send(['success' => false, 'message' => $message], $code);
}

// Get JSON body from POST request
function get_body() {
    return json_decode(file_get_contents('php://input'), true) ?? [];
}

// Generate random string
function rand_str($len = 8) {
    $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    $result = '';
    for ($i = 0; $i < $len; $i++)
        $result .= $chars[random_int(0, strlen($chars) - 1)];
    return $result;
}

// Generate 6-digit OTP
function generate_otp() {
    return str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
}

// Generate JWT-like token (simple, secure enough for project)
function generate_token($user_id, $mobile, $name) {
    $secret = 'parcelgo_secret_key_2024';
    $payload = base64_encode(json_encode([
        'id'     => $user_id,
        'mobile' => $mobile,
        'name'   => $name,
        'exp'    => time() + (7 * 24 * 3600) // 7 days
    ]));
    $sig = base64_encode(hash_hmac('sha256', $payload, $secret, true));
    return $payload . '.' . $sig;
}

// Verify token & return user data
function verify_token($token) {
    $secret = 'parcelgo_secret_key_2024';
    $parts  = explode('.', $token);
    if (count($parts) !== 2) return null;

    [$payload, $sig] = $parts;
    $expected = base64_encode(hash_hmac('sha256', $payload, $secret, true));
    if (!hash_equals($expected, $sig)) return null;

    $data = json_decode(base64_decode($payload), true);
    if (!$data || $data['exp'] < time()) return null;
    return $data;
}

// Get logged-in user from Authorization header
function get_auth_user() {
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (!$header) error('Access denied. Please login.', 401);

    $token = str_replace('Bearer ', '', $header);
    $user  = verify_token($token);
    if (!$user) error('Invalid or expired session. Please login again.', 401);
    return $user;
}

// Vehicle recommendation
function recommend_vehicle($weight, $size) {
    if ($size === 'bulk' || $weight > 200) return 'truck';
    if ($size === 'large' || $weight > 25)  return 'van';
    if ($size === 'medium' || $weight > 5)  return 'car';
    return 'bike';
}

// Price estimate
function estimate_price($weight, $vehicle) {
    $base  = ['bike'=>30, 'car'=>60, 'van'=>120, 'truck'=>250];
    $perkg = ['bike'=>5,  'car'=>8,  'van'=>12,  'truck'=>20];
    return round($base[$vehicle] + ($weight * $perkg[$vehicle]));
}
