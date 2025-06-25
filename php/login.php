<?php
/**
 * Sistema de Login Moderno con JSON Response
 * Compatible con aplicaciones JavaScript/AJAX
 */

// Headers de seguridad y JSON
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');

// Configuración CORS
$allowed_origins = [
    'http://localhost',
    'http://localhost:3000',
    'http://localhost:8000',
    'http://127.0.0.1'
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
}

header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Credentials: true');

// Manejo de preflight OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Configuración de sesión segura
ini_set('session.cookie_httponly', 1);
ini_set('session.cookie_secure', isset($_SERVER['HTTPS']));
ini_set('session.cookie_samesite', 'Lax');
session_start();

// Configuración de base de datos
$dbconfig = [
    'host' => 'localhost',
    'user' => 'root',
    'pass' => '',
    'name' => 'escuela'
];

/**
 * Función para conectar a la base de datos
 */
function getDbConnection($config) {
    try {
        $conn = new mysqli($config['host'], $config['user'], $config['pass'], $config['name']);
        
        if ($conn->connect_error) {
            throw new Exception("Error de conexión: " . $conn->connect_error);
        }
        
        // Configurar charset
        $conn->set_charset("utf8");
        return $conn;
        
    } catch (Exception $e) {
        throw new Exception("No se pudo conectar a la base de datos: " . $e->getMessage());
    }
}

/**
 * Función para validar entrada
 */
function validateInput($data) {
    return htmlspecialchars(strip_tags(trim($data)));
}

/**
 * Función para hash de contraseña (para futura implementación)
 */
function hashPassword($password) {
    return password_hash($password, PASSWORD_DEFAULT);
}

/**
 * Función para verificar contraseña
 */
function verifyPassword($password, $hash) {
    return password_verify($password, $hash);
}

/**
 * Función de logging
 */
function logLoginAttempt($usuario, $success, $details = []) {
    $log_entry = [
        'timestamp' => date('Y-m-d H:i:s'),
        'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
        'usuario' => $usuario,
        'success' => $success,
        'details' => $details
    ];
    
    $log_dir = __DIR__ . '/logs';
    if (!is_dir($log_dir)) {
        mkdir($log_dir, 0755, true);
    }
    
    $log_file = $log_dir . '/login.log';
    file_put_contents($log_file, json_encode($log_entry) . "\n", FILE_APPEND | LOCK_EX);
}

try {
    // Solo permitir POST
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Método no permitido', 405);
    }
    
    // Detectar tipo de contenido
    $content_type = $_SERVER['CONTENT_TYPE'] ?? '';
    
    if (strpos($content_type, 'application/json') !== false) {
        // Datos JSON (para AJAX)
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            throw new Exception('Datos JSON inválidos', 400);
        }
        $usuario = $input['usuario'] ?? '';
        $password = $input['password'] ?? '';
    } else {
        // Datos de formulario tradicional
        $usuario = $_POST['txtusuario'] ?? $_POST['usuario'] ?? '';
        $password = $_POST['txtpassword'] ?? $_POST['password'] ?? '';
    }
    
    // Validar datos requeridos
    if (empty($usuario) || empty($password)) {
        throw new Exception('Usuario y contraseña son requeridos', 400);
    }
    
    // Validar y limpiar entrada
    $usuario = validateInput($usuario);
    $password = validateInput($password);
    
    // Validaciones adicionales
    if (strlen($usuario) < 3 || strlen($usuario) > 50) {
        throw new Exception('Usuario debe tener entre 3 y 50 caracteres', 400);
    }
    
    if (strlen($password) < 4) {
        throw new Exception('Contraseña debe tener al menos 4 caracteres', 400);
    }
    
    // Conectar a la base de datos
    $conn = getDbConnection($dbconfig);
    
    // Preparar consulta segura (evitar SQL injection)
    $stmt = $conn->prepare("SELECT id, usuario, password FROM alumnos WHERE usuario = ? LIMIT 1");
    if (!$stmt) {
        throw new Exception('Error preparando consulta: ' . $conn->error);
    }
    
    $stmt->bind_param("s", $usuario);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 1) {
        $user = $result->fetch_assoc();
        
        // Por ahora usar comparación directa (INSEGURO - mejorar después)
        // TODO: Migrar a password_hash() y password_verify()
        if ($user['password'] === $password) {
            // Login exitoso
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['username'] = $user['usuario'];
            $_SESSION['login_time'] = time();
            
            // Regenerar ID de sesión por seguridad
            session_regenerate_id(true);
            
            logLoginAttempt($usuario, true);
            
            $response = [
                'success' => true,
                'message' => 'Login exitoso',
                'user' => [
                    'id' => $user['id'],
                    'username' => $user['usuario']
                ],
                'redirect' => '../paginalogin/aulas.html',
                'session_id' => session_id(),
                'timestamp' => time()
            ];
            
        } else {
            // Contraseña incorrecta
            logLoginAttempt($usuario, false, ['reason' => 'invalid_password']);
            throw new Exception('Usuario o contraseña incorrectos', 401);
        }
        
    } else {
        // Usuario no encontrado
        logLoginAttempt($usuario, false, ['reason' => 'user_not_found']);
        throw new Exception('Usuario o contraseña incorrectos', 401);
    }
    
    $stmt->close();
    $conn->close();
    
    http_response_code(200);
    echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    $error_code = $e->getCode() ?: 500;
    http_response_code($error_code);
    
    $error_response = [
        'success' => false,
        'error' => $e->getMessage(),
        'code' => $error_code,
        'timestamp' => time()
    ];
    
    // Log del error
    if (isset($usuario)) {
        logLoginAttempt($usuario ?? 'unknown', false, [
            'reason' => 'exception',
            'error' => $e->getMessage()
        ]);
    }
    
    echo json_encode($error_response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    
} catch (Error $e) {
    http_response_code(500);
    
    $error_response = [
        'success' => false,
        'error' => 'Error interno del servidor',
        'code' => 500,
        'timestamp' => time()
    ];
    
    // Log del error fatal
    logLoginAttempt('unknown', false, [
        'reason' => 'fatal_error',
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
    
    echo json_encode($error_response, JSON_UNESCAPED_UNICODE);
}

// Limpieza de salida
if (ob_get_level()) {
    ob_end_flush();
}
?>