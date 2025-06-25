<?php
session_start();

$dbhost = "localhost";
$dbuser = "root";
$dbpass = "";
$dbname = "colegio_marketplace";

$conn = mysqli_connect($dbhost, $dbuser, $dbpass, $dbname);

if (!$conn) {
    die("No hay conexión: " . mysqli_connect_error());
}

$nombre = $_POST["txtusuario"] ?? '';
$pass = $_POST["txtpassword"] ?? '';

$nombre = mysqli_real_escape_string($conn, $nombre);
$pass = mysqli_real_escape_string($conn, $pass);

$query = mysqli_query($conn, "SELECT * FROM alumnos WHERE usuario = '$nombre' AND password = '$pass'");
$nr = mysqli_num_rows($query);

if ($nr == 1) {
    $usuario = mysqli_fetch_assoc($query);
    
    $_SESSION['usuario'] = $usuario['usuario'];
    $_SESSION['rol'] = $usuario['rol'];

    echo "<script>
            alert('¡Bienvenido " . $usuario['usuario'] . "!');
            window.location.href = '../paginalogin/aulas.html';
          </script>";
} else {
    echo "<script>
            alert('Usuario o contraseña incorrectos');
            window.location= '../paginalogin/login.html';
          </script>";
}
?>
