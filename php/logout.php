<?php
/**
 * Cerrar sesión del usuario - php/logout.php
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config.php';
require_once '../auth.php';

try {
    $result = $auth->logout();
    echo json_encode($result);
    
} catch (Exception $e) {
    error_log("Error en logout: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Error al cerrar sesión'
    ]);
}
?>