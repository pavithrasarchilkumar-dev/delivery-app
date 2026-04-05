<?php
// api/verify_otp.php — Verify OTP & return auth token
require_once '../includes/helpers.php';
require_once '../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') error('Method not allowed', 405);

$body    = get_body();
$mobile  = trim($body['mobile'] ?? '');
$otp     = trim($body['otp'] ?? '');
$purpose = $body['purpose'] ?? 'login';

if (!$mobile || !$otp) error('Mobile and OTP are required.');
if (strlen($otp) !== 6) error('Enter 6-digit OTP.');

// Check OTP in DB
$stmt = $conn->prepare(
    "SELECT id FROM otp_verifications
     WHERE mobile=? AND otp=? AND purpose=? AND is_used=0 AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1"
);
$stmt->bind_param('sss', $mobile, $otp, $purpose);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0)
    error('Invalid or expired OTP. Please try again.');

$otpRow = $result->fetch_assoc();

// Mark OTP as used
$stmt = $conn->prepare("UPDATE otp_verifications SET is_used=1 WHERE id=?");
$stmt->bind_param('i', $otpRow['id']);
$stmt->execute();

// Mark user as verified
$stmt = $conn->prepare("UPDATE users SET is_verified=1 WHERE mobile=?");
$stmt->bind_param('s', $mobile);
$stmt->execute();

// Fetch user
$stmt = $conn->prepare("SELECT id, name, mobile, role, rating FROM users WHERE mobile=?");
$stmt->bind_param('s', $mobile);
$stmt->execute();
$user = $stmt->get_result()->fetch_assoc();

// Generate token
$token = generate_token($user['id'], $user['mobile'], $user['name']);

success('Login successful!', [
    'token' => $token,
    'user'  => $user
]);
