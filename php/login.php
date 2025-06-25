<?php
/**
 * Manejo de Login - php/login.php
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Verificar método
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit;
}

require_once '../config.php';
require_once '../auth.php';

try {
    // Obtener datos JSON
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Datos JSON inválidos');
    }
    
    // Validar campos requeridos
    if (empty($data['usuario']) || empty($data['password']) || empty($data['rol'])) {
        echo json_encode([
            'success' => false,
            'message' => 'Todos los campos son requeridos'
        ]);
        exit;
    }
    
    // Intentar login
    $result = $auth->login($data['usuario'], $data['password'], $data['rol']);
    echo json_encode($result);
    
} catch (Exception $e) {
    error_log("Error en login: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Error del sistema: ' . $e->getMessage()
    ]);
}
?>