<?php
include 'conexion.php';

$nombre = $_POST['nombre'] ?? '';
$email = $_POST['email'] ?? '';
$cantidad = $_POST['cantidad'] ?? '';
$producto_id = $_POST['producto_id'] ?? '';
$metodo_pago = $_POST['metodo_pago'] ?? 'Pedido manual';

// Validación básica
if ($nombre && $email && $cantidad && $producto_id) {
    $stmt = $conn->prepare("INSERT INTO pedidos (nombre, email, cantidad, producto_id, metodo_pago) VALUES (?, ?, ?, ?, ?)");
    $stmt->bind_param("ssiss", $nombre, $email, $cantidad, $producto_id, $metodo_pago);

    if ($stmt->execute()) {
        echo "ok";
    } else {
        echo "error";
    }

    $stmt->close();
    $conn->close();
} else {
    echo "error";
}
?>
