<?php
$host = 'localhost';
$db = 'colegio_marketplace';
$user = 'root';
$pass = ''; // Cambia si usás contraseña

$conn = new mysqli($host, $user, $pass, $db);

if ($conn->connect_error) {
    die("Error de conexión: " . $conn->connect_error);
}
?>
