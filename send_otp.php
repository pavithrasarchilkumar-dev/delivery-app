<?php
// api/send_otp.php — Send OTP to mobile number
require_once '../includes/helpers.php';
require_once '../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') error('Method not allowed', 405);

$body    = get_body();
$mobile  = trim($body['mobile'] ?? '');
$name    = trim($body['name'] ?? '');
$purpose = $body['purpose'] ?? 'login';

// Validate mobile
if (!preg_match('/^\+?[0-9]{10,15}$/', $mobile))
    error('Enter a valid mobile number.');

// Check if user exists
$stmt = $conn->prepare("SELECT id, name FROM users WHERE mobile = ?");
$stmt->bind_param('s', $mobile);
$stmt->execute();
$result    = $stmt->get_result();
$userExists = $result->num_rows > 0;
$existingUser = $userExists ? $result->fetch_assoc() : null;

if ($purpose === 'register' && $userExists)
    error('Mobile already registered. Please login.');

if ($purpose === 'login' && !$userExists)
    error('Mobile not registered. Please register first.');

// If registering: create user
if ($purpose === 'register') {
    if (!$name) error('Name is required for registration.');
    $stmt = $conn->prepare("INSERT INTO users (name, mobile, is_verified) VALUES (?, ?, 0)");
    $stmt->bind_param('ss', $name, $mobile);
    $stmt->execute();
}

// Invalidate old OTPs
$stmt = $conn->prepare("UPDATE otp_verifications SET is_used=1 WHERE mobile=? AND purpose=? AND is_used=0");
$stmt->bind_param('ss', $mobile, $purpose);
$stmt->execute();

// Generate & store OTP
$otp       = generate_otp();
$expiresAt = date('Y-m-d H:i:s', time() + 600); // 10 minutes

$stmt = $conn->prepare("INSERT INTO otp_verifications (mobile, otp, purpose, expires_at) VALUES (?,?,?,?)");
$stmt->bind_param('ssss', $mobile, $otp, $purpose, $expiresAt);
$stmt->execute();

// ── DEVELOPMENT MODE: log OTP to file ──
// In production: replace this with real SMS API (e.g., Twilio, MSG91, Fast2SMS)
$logFile = __DIR__ . '/../otp_log.txt';
file_put_contents($logFile, date('Y-m-d H:i:s') . " | Mobile: $mobile | OTP: $otp\n", FILE_APPEND);

/*
// ── PRODUCTION: Fast2SMS (India, free tier available) ──
$apiKey = 'YOUR_FAST2SMS_API_KEY'; // https://fast2sms.com
$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => "https://www.fast2sms.com/dev/bulkV2",
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode([
        "route"    => "otp",
        "variables_values" => $otp,
        "numbers"  => $mobile,
        "flash"    => "0"
    ]),
    CURLOPT_HTTPHEADER => ["authorization: $apiKey", "Content-Type: application/json"]
]);
curl_exec($ch);
curl_close($ch);
*/

success('OTP sent successfully!', ['is_new_user' => !$userExists]);
