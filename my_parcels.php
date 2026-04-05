<?php
// api/my_parcels.php — Get sender's own parcels
require_once '../includes/helpers.php';
require_once '../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') error('Method not allowed', 405);

$user = get_auth_user();

$stmt = $conn->prepare(
    "SELECT id, tracking_id, pickup_address, drop_address,
            weight, size, recommended_vehicle, status, estimated_cost, created_at
     FROM parcels WHERE sender_id = ? ORDER BY created_at DESC"
);
$stmt->bind_param('i', $user['id']);
$stmt->execute();
$parcels = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

success('Parcels fetched.', ['parcels' => $parcels]);
