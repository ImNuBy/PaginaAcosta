<?php
/**
 * Verificar estado de la sesión actual - php/check_session.php
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config.php';
require_once '../auth.php';

try {
    // Verificar si el usuario está logueado
    if ($auth->isLoggedIn()) {
        $user = $auth->getCurrentUser();
        
        echo json_encode([
            'logged_in' => true,
            'user' => $user
        ]);
    } else {
        echo json_encode([
            'logged_in' => false,
            'user' => null
        ]);
    }
    
} catch (Exception $e) {
    error_log("Error en check_session: " . $e->getMessage());
    echo json_encode([
        'logged_in' => false,
        'error' => 'Error del sistema'
    ]);
}
?>