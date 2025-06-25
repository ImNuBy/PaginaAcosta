<?php
// Configuración de la conexión a la base de datos
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "colegio_marketplace";

// Conexión a la base de datos
$conn = new mysqli($servername, $username, $password, $dbname);

// Verificar la conexión
if ($conn->connect_error) {
    die("Conexión fallida: " . $conn->connect_error);
}

// Verificar si se han enviado los datos del formulario
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $usuario = trim($_POST['usuario'] ?? '');
    $password = trim($_POST['password'] ?? '');

    if (empty($usuario) || empty($password)) {
        echo "<script>alert('Todos los campos son obligatorios'); window.history.back();</script>";
        exit();
    }

    // Verificar si ya existe el usuario
    $stmt_check = $conn->prepare("SELECT id FROM alumnos WHERE usuario = ?");
    $stmt_check->bind_param("s", $usuario);
    $stmt_check->execute();
    $stmt_check->store_result();

    if ($stmt_check->num_rows > 0) {
        echo "<script>alert('Este usuario ya existe'); window.history.back();</script>";
        exit();
    }
    $stmt_check->close();

    // Insertar el nuevo usuario con rol 'alumno'
    $stmt = $conn->prepare("INSERT INTO alumnos (usuario, password, rol) VALUES (?, ?, 'alumno')");
    $stmt->bind_param("ss", $usuario, $password);

    if ($stmt->execute()) {
        echo "<script>alert('Usuario registrado correctamente'); window.location='../paginalogin/login.html';</script>";
    } else {
        echo "Error: " . $stmt->error;
    }

    $stmt->close();
}

$conn->close();
?>
