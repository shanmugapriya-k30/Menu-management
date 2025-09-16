<?php
session_start();
function getPageClass() {
    $currentFile = basename($_SERVER['PHP_SELF'], ".php");
    return $currentFile; 
}
?>
<!DOCTYPE html>
<html>
<head>
    <title>Tracker</title>
    <link rel="stylesheet" href="styles/style.css">

</head>
<body class="<?php echo getPageClass() ?>">
