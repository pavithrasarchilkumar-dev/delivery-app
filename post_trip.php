<?php
// api/post_trip.php — Traveler posts a new trip
require_once '../includes/helpers.php';
require_once '../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') error('Method not allowed', 405);

$user = get_auth_user();
$body = get_body();

$from      = trim($body['from_address'] ?? '');
$to        = trim($body['to_address'] ?? '');
$vehicle   = trim($body['vehicle_type'] ?? '');
$vehNo     = trim($body['vehicle_number'] ?? '');
$capacity  = floatval($body['available_capacity'] ?? 10);
$departure = trim($body['departure_time'] ?? '');
$maxParcels= intval($body['max_parcels'] ?? 3);

if (!$from || !$to || !$vehicle || !$departure)
    error('From, to, vehicle type, and departure time are required.');

$stmt = $conn->prepare(
    "INSERT INTO trips
     (traveler_id, from_address, to_address, vehicle_type,
      vehicle_number, available_capacity, departure_time, max_parcels)
     VALUES (?,?,?,?,?,?,?,?)"
);
$stmt->bind_param('issssds s', $user['id'], $from, $to, $vehicle, $vehNo, $capacity, $departure, $maxParcels);

// Fix bind types
$stmt = $conn->prepare(
    "INSERT INTO trips
     (traveler_id, from_address, to_address, vehicle_type,
      vehicle_number, available_capacity, departure_time, max_parcels)
     VALUES (?,?,?,?,?,?,?,?)"
);
$stmt->bind_param('issssdsi', $user['id'], $from, $to, $vehicle, $vehNo, $capacity, $departure, $maxParcels);
$stmt->execute();

success('Trip posted! Parcel requests will be matched to your route.', [
    'trip_id' => $conn->insert_id
]);
