<?php
// Configuración de la conexión a la base de datos
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "escuela";

// Conexión a la base de datos
$conn = new mysqli($servername, $username, $password, $dbname);

// Verificar la conexión
if ($conn->connect_error) {
    die("Conexión fallida: " . $conn->connect_error);
}

// Verificar si se han enviado los datos del formulario
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // Recoger los datos del formulario
    $usuario = $_POST['usuario'];
    $password = $_POST['password'];

    // Consulta SQL para insertar un nuevo usuario en la base de datos
    $sql = "INSERT INTO alumnos (usuario, password) VALUES ('$usuario', '$password')";

    if ($conn->query($sql) === TRUE) {
        echo "Nuevo usuario registrado exitosamente.";
        header("Location: ../paginalogin/login.html"); // Redirige a la página de login
            exit();
    } else {
        echo "Error al registrar el usuario: " . $conn->error;
    }
}

// Cerrar la conexión a la base de datos
$conn->close();
?>
