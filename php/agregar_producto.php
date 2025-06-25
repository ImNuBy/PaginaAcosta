<?php
include 'conexion.php';

$nombre = $_POST['nombre'];
$descripcion = $_POST['descripcion'];
$precio = $_POST['precio'];
$contacto = $_POST['contacto'];
$donacion = isset($_POST['donacion_completa']) ? 1 : 0;

// Cargar imagen (si se sube)
$imagen = '';
if (isset($_FILES['imagen']) && $_FILES['imagen']['error'] == 0) {
    $ruta = 'uploads/';
    if (!is_dir($ruta)) {
        mkdir($ruta, 0777, true);
    }
    $nombreImagen = uniqid() . '_' . $_FILES['imagen']['name'];
    move_uploaded_file($_FILES['imagen']['tmp_name'], $ruta . $nombreImagen);
    $imagen = $ruta . $nombreImagen;
}

$sql = "INSERT INTO productos (nombre, descripcion, precio, imagen, contacto, donacion_completa)
        VALUES (?, ?, ?, ?, ?, ?)";

$stmt = $conn->prepare($sql);
$stmt->bind_param("ssdssi", $nombre, $descripcion, $precio, $imagen, $contacto, $donacion);

if ($stmt->execute()) {
    echo "<script>
                alert('Producto agregado');
                window.location.href = '../paginalogin/galeria.php';
              </script>";
} else {
    echo "Error: " . $stmt->error;
}

$stmt->close();
$conn->close();
?>
