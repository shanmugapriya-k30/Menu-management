<?php
$conn = new mysqli("localhost", "root", "root", "upgrade_tracker_db");
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}
?>