<?php
include 'conexion.php';

if (!isset($_GET['id'])) {
    die("Error: No se recibió el ID del producto.");
}

$id = intval($_GET['id']);

$sql = "DELETE FROM productos WHERE id = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $id);

if ($stmt->execute()) {
    if ($stmt->affected_rows > 0) {
        echo "<script>
                alert('Producto eliminado');
                window.location.href = '../paginalogin/galeria.php';
              </script>";
    } else {
        echo "<script>
                alert('No se encontró el producto para eliminar.');
                window.location.href = '../paginalogin/galeria.php';
              </script>";
    }
} else {
    echo "<script>
            alert('Error al eliminar el producto.');
            window.location.href = '../paginalogin/galeria.php';
          </script>";
}

$stmt->close();
$conn->close();
?>
