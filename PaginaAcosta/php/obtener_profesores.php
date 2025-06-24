<?php
include 'conexion.php';
$res = $conn->query("SELECT * FROM profesores");
echo json_encode($res->fetch_all(MYSQLI_ASSOC));
