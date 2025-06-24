<?php
include 'conexion.php';

$result = $conn->query("SELECT * FROM productos ORDER BY fecha_publicacion DESC");

$productos = [];

while ($row = $result->fetch_assoc()) {
    $productos[] = $row;
}

header('Content-Type: application/json');
echo json_encode($productos);
$conn->close();
?>
