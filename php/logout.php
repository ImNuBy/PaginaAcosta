<?php
/**
 * Sistema de Logout
 * Cierra la sesión del usuario y limpia datos
 */

session_start();

// Configuración de base de datos
$dbconfig = [
    'host' => 'localhost',
    'user' => 'root',
    'pass' => '',
    'name' => 'sistema_escolar'
];

function getDbConnection($config) {
    try {
        $conn = new mysqli($config['host'], $config['user'], $config['pass'], $config['name']);
        if ($conn->connect_error) {
            return null;
        }
        $conn->set_charset("utf8");
        return $conn;
    } catch (Exception $e) {
        return null;
    }
}

function logLogout($conn, $usuario_id, $session_id) {
    if (!$conn || !$usuario_id) return;
    
    try {
        // Log de logout
        $stmt = $conn->prepare("INSERT INTO logs_sistema (usuario_id, accion, descripcion, ip_address, user_agent) VALUES (?, 'logout', 'Usuario cerró sesión', ?, ?)");
        if ($stmt) {
            $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
            $user_agent = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';
            $stmt->bind_param("iss", $usuario_id, $ip, $user_agent);
            $stmt->execute();
            $stmt->close();
        }
        
        // Marcar sesión como inactiva
        if ($session_id) {
            $stmt2 = $conn->prepare("UPDATE sesiones_activas SET activa = FALSE WHERE session_id = ? AND usuario_id = ?");
            if ($stmt2) {
                $stmt2->bind_param("si", $session_id, $usuario_id);
                $stmt2->execute();
                $stmt2->close();
            }
        }
        
    } catch (Exception $e) {
        // Silenciar errores en logout
        error_log("Error en logout: " . $e->getMessage());
    }
}

try {
    $conn = getDbConnection($dbconfig);
    
    // Guardar datos antes de destruir la sesión
    $usuario_id = $_SESSION['user_id'] ?? null;
    $session_id = session_id();
    
    // Log del logout
    if ($conn && $usuario_id) {
        logLogout($conn, $usuario_id, $session_id);
    }
    
    // Limpiar datos del lado cliente
    setcookie('PHPSESSID', '', time() - 3600, '/');
    
    // Destruir sesión
    session_unset();
    session_destroy();
    
    // Limpiar cualquier cookie adicional
    if (isset($_SERVER['HTTP_COOKIE'])) {
        $cookies = explode(';', $_SERVER['HTTP_COOKIE']);
        foreach($cookies as $cookie) {
            $parts = explode('=', $cookie);
            $name = trim($parts[0]);
            setcookie($name, '', time() - 3600, '/');
        }
    }
    
    // Cerrar conexión
    if ($conn) {
        $conn->close();
    }
    
    // Detectar si es una petición AJAX
    $is_ajax = isset($_SERVER['HTTP_X_REQUESTED_WITH']) && 
               strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest';
    
    if ($is_ajax) {
        // Respuesta JSON para AJAX
        header('Content-Type: application/json; charset=utf-8');
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Sesión cerrada exitosamente',
            'redirect' => '../paginalogin/login.html',
            'timestamp' => time()
        ]);
    } else {
        // Redirección tradicional
        header('Location: ../paginalogin/login.html');
        exit();
    }
    
} catch (Exception $e) {
    // En caso de error, igual redirigir al login
    if ($conn) {
        $conn->close();
    }
    
    // Forzar limpieza de sesión aunque haya errores
    session_unset();
    session_destroy();
    
    $is_ajax = isset($_SERVER['HTTP_X_REQUESTED_WITH']) && 
               strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest';
    
    if ($is_ajax) {
        header('Content-Type: application/json; charset=utf-8');
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Sesión cerrada',
            'redirect' => '../paginalogin/login.html',
            'timestamp' => time()
        ]);
    } else {
        header('Location: ../paginalogin/login.html');
        exit();
    }
}
?>