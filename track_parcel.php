<?php
// api/track_parcel.php — Track parcel (public, no auth needed)
require_once '../includes/helpers.php';
require_once '../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') error('Method not allowed', 405);

$trackingId = trim($_GET['id'] ?? '');
if (!$trackingId) error('Tracking ID is required.');

// Get parcel + traveler info
$stmt = $conn->prepare(
    "SELECT p.id, p.tracking_id, p.status, p.pickup_address, p.drop_address,
            p.weight, p.size, p.recommended_vehicle, p.estimated_cost, p.created_at,
            u.name AS sender_name,
            t.name AS traveler_name, t.rating AS traveler_rating
     FROM parcels p
     JOIN users u ON p.sender_id = u.id
     LEFT JOIN delivery_assignments da ON da.parcel_id = p.id AND da.status != 'cancelled'
     LEFT JOIN users t ON da.traveler_id = t.id
     WHERE p.tracking_id = ?
     LIMIT 1"
);
$stmt->bind_param('s', $trackingId);
$stmt->execute();
$parcel = $stmt->get_result()->fetch_assoc();

if (!$parcel) error('Parcel not found. Check your tracking ID.', 404);

// Get tracking events
$stmt = $conn->prepare(
    "SELECT event_type, description, created_at
     FROM tracking_events WHERE parcel_id = ? ORDER BY created_at ASC"
);
$stmt->bind_param('i', $parcel['id']);
$stmt->execute();
$events = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

success('Parcel found.', [
    'parcel' => $parcel,
    'events' => $events
]);
