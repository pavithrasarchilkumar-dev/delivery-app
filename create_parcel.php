<?php
// api/create_parcel.php — Book a new parcel
require_once '../includes/helpers.php';
require_once '../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') error('Method not allowed', 405);

$user = get_auth_user(); // JWT check
$body = get_body();

$pickup  = trim($body['pickup_address'] ?? '');
$drop    = trim($body['drop_address'] ?? '');
$weight  = floatval($body['weight'] ?? 0);
$size    = trim($body['size'] ?? '');
$ptype   = $body['parcel_type'] ?? 'general';
$desc    = $body['description'] ?? '';

if (!$pickup || !$drop || !$weight || !$size)
    error('Pickup, drop, weight, and size are required.');

$vehicle     = recommend_vehicle($weight, $size);
$price       = estimate_price($weight, $vehicle);
$trackingId  = 'PG-' . rand_str(8);
$deliveryOtp = generate_otp();

$stmt = $conn->prepare(
    "INSERT INTO parcels
     (tracking_id, sender_id, pickup_address, drop_address,
      weight, size, parcel_type, recommended_vehicle,
      description, estimated_cost, delivery_otp, status)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,'pending')"
);
$stmt->bind_param(
    'sissdssssds',
    $trackingId, $user['id'], $pickup, $drop,
    $weight, $size, $ptype, $vehicle,
    $desc, $price, $deliveryOtp
);
$stmt->execute();
$parcelId = $conn->insert_id;

// Add first tracking event
$stmt = $conn->prepare(
    "INSERT INTO tracking_events (parcel_id, event_type, description) VALUES (?,'booked','Parcel booking confirmed')"
);
$stmt->bind_param('i', $parcelId);
$stmt->execute();

success('Parcel booked successfully!', [
    'parcel' => [
        'id'                 => $parcelId,
        'tracking_id'        => $trackingId,
        'recommended_vehicle'=> $vehicle,
        'estimated_cost'     => $price,
        'delivery_otp'       => $deliveryOtp
    ]
]);
