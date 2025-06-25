<?php
include 'conexion.php';
$id = $_GET['id'];
$conn->query("DELETE FROM profesores WHERE id=$id");
echo "ok";
