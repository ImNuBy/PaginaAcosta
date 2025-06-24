<?php
include 'conexion.php';
$id = $_POST['id'];
$nombre = $_POST['nombre'];
$materia = $_POST['materia'];
$horario = $_POST['horario'];

if ($id) {
  $stmt = $conn->prepare("UPDATE profesores SET nombre=?, materia=?, horario=? WHERE id=?");
  $stmt->bind_param("sssi", $nombre, $materia, $horario, $id);
} else {
  $stmt = $conn->prepare("INSERT INTO profesores (nombre, materia, horario) VALUES (?, ?, ?)");
  $stmt->bind_param("sss", $nombre, $materia, $horario);
}

if ($stmt->execute()) echo "ok";
else echo "error";
