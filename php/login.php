<?php
/**
 * Sistema de Login con Roles
 * Maneja diferentes tipos de usuarios: estudiante, profesor, admin
 */

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

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Configuración de sesión
ini_set('session.cookie_httponly', 1);
ini_set('session.cookie_secure', isset($_SERVER['HTTPS']));
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
            throw new Exception("Error de conexión: " . $conn->connect_error);
        }
        $conn->set_charset("utf8");
        return $conn;
    } catch (Exception $e) {
        throw new Exception("No se pudo conectar a la base de datos");
    }
}

function validateInput($data) {
    return htmlspecialchars(strip_tags(trim($data)));
}

function logLoginAttempt($usuario, $success, $details = []) {
    $log_entry = [
        'timestamp' => date('Y-m-d H:i:s'),
        'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
        'usuario' => $usuario,
        'success' => $success,
        'details' => $details
    ];
    
    $log_dir = __DIR__ . '/logs';
    if (!is_dir($log_dir)) {
        mkdir($log_dir, 0755, true);
    }
    
    file_put_contents($log_dir . '/login.log', json_encode($log_entry) . "\n", FILE_APPEND | LOCK_EX);
}

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Método no permitido', 405);
    }
    
    $content_type = $_SERVER['CONTENT_TYPE'] ?? '';
    
    if (strpos($content_type, 'application/json') !== false) {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            throw new Exception('Datos JSON inválidos', 400);
        }
        $usuario = $input['usuario'] ?? '';
        $password = $input['password'] ?? '';
    } else {
        $usuario = $_POST['txtusuario'] ?? $_POST['usuario'] ?? '';
        $password = $_POST['txtpassword'] ?? $_POST['password'] ?? '';
    }
    
    if (empty($usuario) || empty($password)) {
        throw new Exception('Usuario y contraseña son requeridos', 400);
    }
    
    $usuario = validateInput($usuario);
    $password = validateInput($password);
    
    if (strlen($usuario) < 3 || strlen($usuario) > 50) {
        throw new Exception('Usuario debe tener entre 3 y 50 caracteres', 400);
    }
    
    $conn = getDbConnection($dbconfig);
    
    // Buscar en tabla de usuarios con roles
    $stmt = $conn->prepare("
        SELECT id, nombre as usuario, password, rol, nombre_completo, email, avatar 
        FROM usuarios 
        WHERE nombre = ? AND activo = 1
        LIMIT 1
    ");
    
    if (!$stmt) {
        throw new Exception('Error preparando consulta');
    }
    
    $stmt->bind_param("s", $usuario);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 1) {
        $user = $result->fetch_assoc();
        
        // Verificar contraseña (por ahora comparación directa)
        if ($user['password'] === $password) {
            // Login exitoso
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['username'] = $user['usuario'];
            $_SESSION['rol'] = $user['rol'];
            $_SESSION['nombre_completo'] = $user['nombre_completo'] ?: $user['usuario'];
            $_SESSION['login_time'] = time();
            
            session_regenerate_id(true);
            logLoginAttempt($usuario, true, ['rol' => $user['rol']]);
            
            // Determinar página de redirección según el rol
            $redirects = [
                'estudiante' => '../dashboards/estudiante.html',
                'profesor' => '../dashboards/profesor.html',
                'admin' => '../dashboards/admin.html'
            ];
            
            $redirect = $redirects[$user['rol']] ?? '../dashboards/estudiante.html';
            
            // Generar color aleatorio para avatar si no existe
            $avatar_colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8E8', '#F7DC6F'];
            $avatar_color = $user['avatar'] ?: $avatar_colors[array_rand($avatar_colors)];
            
            $response = [
                'success' => true,
                'message' => '¡Bienvenido! 🎉',
                'user' => [
                    'id' => $user['id'],
                    'username' => $user['usuario'],
                    'rol' => $user['rol'],
                    'nombre_completo' => $user['nombre_completo'],
                    'email' => $user['email'],
                    'avatar_color' => $avatar_color
                ],
                'redirect' => $redirect,
                'session_id' => session_id(),
                'timestamp' => time()
            ];
            
        } else {
            logLoginAttempt($usuario, false, ['reason' => 'invalid_password']);
            throw new Exception('Usuario o contraseña incorrectos', 401);
        }
        
    } else {
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
    
    if (isset($usuario)) {
        logLoginAttempt($usuario ?? 'unknown', false, [
            'reason' => 'exception',
            'error' => $e->getMessage()
        ]);
    }
    
    echo json_encode($error_response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
}
?>