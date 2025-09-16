<?php
include "config/db.php";
 
if (isset($_GET['type'])) {
    $type = $_GET['type'];
 
    // Fetch ApplicationName from ApplicationID
    if ($type === 'application' && isset($_GET['id'])) {
        $id = $_GET['id'];
        $stmt = $conn->prepare("SELECT ApplicationName FROM Application WHERE ApplicationID = ?");
        $stmt->bind_param("s", $id);
        $stmt->execute();
        $stmt->bind_result($appName);
        if ($stmt->fetch()) {
            echo $appName;
        }
        $stmt->close();
    }
 
    // Fetch ResourceName from ResourceID
    if ($type === 'resource' && isset($_GET['id'])) {
        $id = $_GET['id'];
        $stmt = $conn->prepare("SELECT ResourceName FROM Resource WHERE ResourceID = ?");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $stmt->bind_result($resName);
        if ($stmt->fetch()) {
            echo $resName;
        }
        $stmt->close();
    }
 
    // Fetch Rate from RoleName
    if ($type === 'role' && isset($_GET['name'])) {
        $name = $_GET['name'];
        $stmt = $conn->prepare("SELECT Rate FROM Role WHERE RoleName = ?");
        $stmt->bind_param("s", $name);
        $stmt->execute();
        $stmt->bind_result($rate);
        if ($stmt->fetch()) {
            echo $rate;
        }
        $stmt->close();
    }
}
?>
 
 
 