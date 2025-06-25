<?php
/**
 * CSRF Token Generator
 * Genera y valida tokens CSRF para protección contra ataques Cross-Site Request Forgery
 */

// Configuración de headers de seguridad
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');

// Configuración CORS (ajustar según necesidades)
$allowed_origins = [
    'http://localhost',
    'http://localhost:3000',
    'http://localhost:8000',
    'http://127.0.0.1',
    'https://tu-dominio.com' // Reemplazar con tu dominio real
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
}

header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Max-Age: 86400'); // 24 horas

// Manejo de preflight OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Configuración de sesión segura
ini_set('session.cookie_httponly', 1);
ini_set('session.cookie_secure', isset($_SERVER['HTTPS']));
ini_set('session.cookie_samesite', 'Lax');
ini_set('session.use_strict_mode', 1);

// Iniciar sesión
session_start();

/**
 * Genera un token CSRF seguro
 */
function generateCSRFToken() {
    return bin2hex(random_bytes(32));
}

/**
 * Valida un token CSRF
 */
function validateCSRFToken($token) {
    if (!isset($_SESSION['csrf_token']) || !isset($_SESSION['csrf_token_time'])) {
        return false;
    }
    
    // Verificar expiración (30 minutos)
    if (time() - $_SESSION['csrf_token_time'] > 1800) {
        unset($_SESSION['csrf_token'], $_SESSION['csrf_token_time']);
        return false;
    }
    
    // Verificar token usando hash_equals para prevenir timing attacks
    return hash_equals($_SESSION['csrf_token'], $token);
}

/**
 * Regenera el ID de sesión por seguridad
 */
function regenerateSessionId() {
    if (session_status() === PHP_SESSION_ACTIVE) {
        session_regenerate_id(true);
    }
}

/**
 * Logs de seguridad
 */
function logSecurityEvent($event, $details = []) {
    $log_entry = [
        'timestamp' => date('Y-m-d H:i:s'),
        'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
        'event' => $event,
        'details' => $details
    ];
    
    // Escribir a log de seguridad (crear directorio logs/ si no existe)
    $log_dir = __DIR__ . '/logs';
    if (!is_dir($log_dir)) {
        mkdir($log_dir, 0755, true);
    }
    
    $log_file = $log_dir . '/security.log';
    file_put_contents($log_file, json_encode($log_entry) . "\n", FILE_APPEND | LOCK_EX);
}

try {
    $method = $_SERVER['REQUEST_METHOD'];
    $response = [];
    
    switch ($method) {
        case 'GET':
            // Generar nuevo token CSRF
            if (!isset($_SESSION['csrf_token']) || 
                !isset($_SESSION['csrf_token_time']) || 
                (time() - $_SESSION['csrf_token_time']) > 1800) {
                
                $_SESSION['csrf_token'] = generateCSRFToken();
                $_SESSION['csrf_token_time'] = time();
                
                // Regenerar ID de sesión ocasionalmente
                if (!isset($_SESSION['last_regeneration']) || 
                    (time() - $_SESSION['last_regeneration']) > 300) {
                    regenerateSessionId();
                    $_SESSION['last_regeneration'] = time();
                }
                
                logSecurityEvent('csrf_token_generated');
            }
            
            $response = [
                'success' => true,
                'token' => $_SESSION['csrf_token'],
                'expires_in' => 1800 - (time() - $_SESSION['csrf_token_time']),
                'session_id' => session_id(),
                'timestamp' => time()
            ];
            break;
            
        case 'POST':
            // Validar token CSRF
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!$input || !isset($input['token'])) {
                throw new Exception('Token CSRF requerido', 400);
            }
            
            if (!validateCSRFToken($input['token'])) {
                logSecurityEvent('csrf_token_validation_failed', [
                    'provided_token' => substr($input['token'], 0, 8) . '...',
                    'session_has_token' => isset($_SESSION['csrf_token'])
                ]);
                throw new Exception('Token CSRF inválido o expirado', 403);
            }
            
            logSecurityEvent('csrf_token_validated');
            
            $response = [
                'success' => true,
                'message' => 'Token CSRF válido',
                'timestamp' => time()
            ];
            break;
            
        default:
            throw new Exception('Método no permitido', 405);
    }
    
    // Añadir información de depuración en modo desarrollo
    if (defined('DEBUG_MODE') && DEBUG_MODE) {
        $response['debug'] = [
            'session_id' => session_id(),
            'session_data' => $_SESSION,
            'server_time' => date('Y-m-d H:i:s'),
            'php_version' => PHP_VERSION
        ];
    }
    
    http_response_code(200);
    echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    // Log del error
    logSecurityEvent('csrf_error', [
        'error' => $e->getMessage(),
        'code' => $e->getCode()
    ]);
    
    $error_code = $e->getCode() ?: 500;
    http_response_code($error_code);
    
    $error_response = [
        'success' => false,
        'error' => $e->getMessage(),
        'code' => $error_code,
        'timestamp' => time()
    ];
    
    // No mostrar detalles sensibles en producción
    if (defined('DEBUG_MODE') && DEBUG_MODE) {
        $error_response['debug'] = [
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'trace' => $e->getTraceAsString()
        ];
    }
    
    echo json_encode($error_response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    
} catch (Error $e) {
    // Errores fatales de PHP
    logSecurityEvent('csrf_fatal_error', [
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Error interno del servidor',
        'code' => 500,
        'timestamp' => time()
    ], JSON_UNESCAPED_UNICODE);
}

// Limpieza de salida
if (ob_get_level()) {
    ob_end_flush();
}
?>