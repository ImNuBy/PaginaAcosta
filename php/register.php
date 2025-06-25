<?php
/**
 * Manejo de Registro de Usuarios
 * Procesa las solicitudes de registro y valida los datos
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Verificar que sea una petición POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit;
}

require_once '../config.php';
require_once '../auth.php';

try {
    // Obtener datos JSON del cuerpo de la petición
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    // Validar que se recibieron datos
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Datos JSON inválidos');
    }
    
    // Validar campos requeridos
    $requiredFields = ['nombre', 'apellido', 'email', 'username', 'password', 'rol'];
    foreach ($requiredFields as $field) {
        if (empty($data[$field])) {
            throw new Exception("Campo '$field' es requerido");
        }
    }
    
    // Validar que las contraseñas coincidan
    if ($data['password'] !== $data['confirm_password']) {
        throw new Exception('Las contraseñas no coinciden');
    }
    
    // Validaciones específicas
    $validationErrors = validateRegistrationData($data);
    if (!empty($validationErrors)) {
        echo json_encode([
            'success' => false,
            'message' => 'Datos de registro inválidos',
            'errors' => $validationErrors
        ]);
        exit;
    }
    
    // Verificar límite de registros por IP
    checkRegistrationAttempts($_SERVER['REMOTE_ADDR'] ?? '');
    
    // Intentar registrar usuario
    $result = $auth->register($data);
    
    if ($result['success']) {
        // Registro exitoso
        logRegistrationAttempt($data['username'], $_SERVER['REMOTE_ADDR'] ?? '', true);
        
        // Opcional: enviar email de bienvenida
        if (Config::SEND_WELCOME_EMAIL ?? true) {
            sendWelcomeEmail($data['email'], $data['nombre']);
        }
        
        // Si está configurado para auto-login después del registro
        if (Config::AUTO_LOGIN_AFTER_REGISTER ?? false) {
            $loginResult = $auth->login($data['username'], $data['password'], $data['rol']);
            if ($loginResult['success']) {
                $result['auto_login'] = true;
                $result['user'] = $loginResult['user'];
                $result['redirect'] = $loginResult['redirect'];
            }
        }
        
        echo json_encode($result);
    } else {
        // Registro fallido
        logRegistrationAttempt($data['username'], $_SERVER['REMOTE_ADDR'] ?? '', false);
        echo json_encode($result);
    }
    
} catch (Exception $e) {
    error_log("Error en register.php: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}

/**
 * Validar datos de registro
 */
function validateRegistrationData($data) {
    $errors = [];
    
    // Validar nombre
    if (strlen($data['nombre']) < 2 || strlen($data['nombre']) > 50) {
        $errors[] = 'El nombre debe tener entre 2 y 50 caracteres';
    }
    if (!preg_match('/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/', $data['nombre'])) {
        $errors[] = 'El nombre solo puede contener letras y espacios';
    }
    
    // Validar apellido
    if (strlen($data['apellido']) < 2 || strlen($data['apellido']) > 50) {
        $errors[] = 'El apellido debe tener entre 2 y 50 caracteres';
    }
    if (!preg_match('/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/', $data['apellido'])) {
        $errors[] = 'El apellido solo puede contener letras y espacios';
    }
    
    // Validar email
    if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
        $errors[] = 'Email inválido';
    }
    if (strlen($data['email']) > 100) {
        $errors[] = 'El email es demasiado largo';
    }
    
    // Validar username
    if (strlen($data['username']) < 3 || strlen($data['username']) > 20) {
        $errors[] = 'El nombre de usuario debe tener entre 3 y 20 caracteres';
    }
    if (!preg_match('/^[a-zA-Z0-9._-]+$/', $data['username'])) {
        $errors[] = 'El nombre de usuario solo puede contener letras, números, puntos, guiones y guiones bajos';
    }
    
    // Validar contraseña
    if (strlen($data['password']) < 6) {
        $errors[] = 'La contraseña debe tener al menos 6 caracteres';
    }
    if (strlen($data['password']) > 255) {
        $errors[] = 'La contraseña es demasiado larga';
    }
    
    // Validar fortaleza de contraseña
    $passwordStrength = checkPasswordStrength($data['password']);
    if ($passwordStrength['score'] < 2) {
        $errors[] = 'La contraseña es demasiado débil. ' . implode('. ', $passwordStrength['suggestions']);
    }
    
    // Validar teléfono si se proporciona
    if (!empty($data['telefono'])) {
        if (!preg_match('/^[\+]?[1-9][\d]{0,15}$/', str_replace([' ', '-', '(', ')'], '', $data['telefono']))) {
            $errors[] = 'Formato de teléfono inválido';
        }
    }
    
    // Validar rol
    $allowedRoles = ['alumno', 'profesor'];
    if (!in_array($data['rol'], $allowedRoles)) {
        $errors[] = 'Rol inválido';
    }
    
    // Validar que el usuario no exista
    if (userExists($data['username'], $data['email'])) {
        $errors[] = 'El nombre de usuario o email ya están registrados';
    }
    
    return $errors;
}

/**
 * Verificar fortaleza de contraseña
 */
function checkPasswordStrength($password) {
    $score = 0;
    $suggestions = [];
    
    // Longitud
    if (strlen($password) >= 8) {
        $score++;
    } else {
        $suggestions[] = 'Use al menos 8 caracteres';
    }
    
    // Mayúsculas
    if (preg_match('/[A-Z]/', $password)) {
        $score++;
    } else {
        $suggestions[] = 'Incluya letras mayúsculas';
    }
    
    // Minúsculas
    if (preg_match('/[a-z]/', $password)) {
        $score++;
    } else {
        $suggestions[] = 'Incluya letras minúsculas';
    }
    
    // Números
    if (preg_match('/[0-9]/', $password)) {
        $score++;
    } else {
        $suggestions[] = 'Incluya números';
    }
    
    // Caracteres especiales
    if (preg_match('/[^a-zA-Z0-9]/', $password)) {
        $score++;
    } else {
        $suggestions[] = 'Incluya caracteres especiales';
    }
    
    return [
        'score' => $score,
        'suggestions' => $suggestions
    ];
}

/**
 * Verificar si el usuario ya existe
 */
function userExists($username, $email) {
    $db = Database::getInstance();
    
    $sql = "SELECT id FROM usuarios WHERE username = ? OR email = ?";
    $result = $db->fetch($sql, [$username, $email]);
    
    return $result !== false;
}

/**
 * Verificar límite de registros por IP
 */
function checkRegistrationAttempts($ip) {
    $db = Database::getInstance();
    
    // Obtener intentos de registro en la última hora
    $sql = "SELECT COUNT(*) as attempts 
            FROM registros_intentos 
            WHERE ip_address = ? 
            AND fecha > DATE_SUB(NOW(), INTERVAL 1 HOUR)";
    
    $result = $db->fetch($sql, [$ip]);
    
    if ($result && $result['attempts'] >= 3) {
        throw new Exception('Demasiados intentos de registro. Intente nuevamente en una hora.');
    }
}

/**
 * Registrar intento de registro
 */
function logRegistrationAttempt($username, $ip, $success) {
    $db = Database::getInstance();
    
    try {
        $sql = "INSERT INTO registros_intentos (username, ip_address, exitoso, fecha) VALUES (?, ?, ?, NOW())";
        $db->query($sql, [$username, $ip, $success ? 1 : 0]);
    } catch (Exception $e) {
        error_log("Error registrando intento de registro: " . $e->getMessage());
    }
}

/**
 * Enviar email de bienvenida
 */
function sendWelcomeEmail($email, $nombre) {
    try {
        // Configurar PHPMailer o usar mail() de PHP
        $subject = "Bienvenido al Sistema Escolar";
        $message = "
        <html>
        <head>
            <title>Bienvenido</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #2c3e50; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; background: #f9f9f9; }
                .footer { padding: 20px; text-align: center; font-size: 12px; color: #777; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h1>¡Bienvenido al Sistema Escolar!</h1>
                </div>
                <div class='content'>
                    <h2>Hola {$nombre},</h2>
                    <p>Te damos la bienvenida a nuestro sistema de gestión escolar.</p>
                    <p>Tu cuenta ha sido creada exitosamente. Ahora puedes acceder al sistema con las credenciales que configuraste.</p>
                    <p><strong>Características disponibles:</strong></p>
                    <ul>
                        <li>Consulta de calificaciones</li>
                        <li>Horarios de clases</li>
                        <li>Noticias y eventos</li>
                        <li>Calendario académico</li>
                        <li>Y mucho más...</li>
                    </ul>
                    <p>Si tienes alguna pregunta, no dudes en contactar al administrador del sistema.</p>
                </div>
                <div class='footer'>
                    <p>© " . date('Y') . " Sistema Escolar. Todos los derechos reservados.</p>
                </div>
            </div>
        </body>
        </html>
        ";
        
        $headers = "MIME-Version: 1.0" . "\r\n";
        $headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
        $headers .= "From: Sistema Escolar <no-reply@escuela.edu>" . "\r\n";
        
        mail($email, $subject, $message, $headers);
        
    } catch (Exception $e) {
        error_log("Error enviando email de bienvenida: " . $e->getMessage());
    }
}

/**
 * Validar dominio de email institucional (opcional)
 */
function validateInstitutionalEmail($email, $allowedDomains = []) {
    if (empty($allowedDomains)) {
        return true; // Si no hay dominios restringidos, permitir cualquier email
    }
    
    $domain = substr(strrchr($email, "@"), 1);
    return in_array($domain, $allowedDomains);
}

/**
 * Generar código de verificación para email
 */
function generateVerificationCode() {
    return sprintf("%06d", mt_rand(100000, 999999));
}

/**
 * Enviar código de verificación por email
 */
function sendVerificationCode($email, $code) {
    $subject = "Código de verificación - Sistema Escolar";
    $message = "
    <html>
    <body style='font-family: Arial, sans-serif;'>
        <div style='max-width: 600px; margin: 0 auto; padding: 20px;'>
            <h2>Código de verificación</h2>
            <p>Tu código de verificación es:</p>
            <div style='background: #f0f0f0; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px;'>
                {$code}
            </div>
            <p>Este código expira en 10 minutos.</p>
            <p>Si no solicitaste este código, ignora este mensaje.</p>
        </div>
    </body>
    </html>
    ";
    
    $headers = "MIME-Version: 1.0" . "\r\n";
    $headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
    $headers .= "From: Sistema Escolar <no-reply@escuela.edu>" . "\r\n";
    
    return mail($email, $subject, $message, $headers);
}

/**
 * Limpiar datos de entrada
 */
function sanitizeInput($data) {
    if (is_array($data)) {
        return array_map('sanitizeInput', $data);
    }
    
    $data = trim($data);
    $data = stripslashes($data);
    $data = htmlspecialchars($data, ENT_QUOTES, 'UTF-8');
    
    return $data;
}

// Crear tabla de intentos de registro si no existe
try {
    $db = Database::getInstance();
    $sql = "CREATE TABLE IF NOT EXISTS registros_intentos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50),
        ip_address VARCHAR(45),
        exitoso BOOLEAN DEFAULT FALSE,
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_ip_fecha (ip_address, fecha)
    )";
    $db->query($sql);
} catch (Exception $e) {
    error_log("Error creando tabla registros_intentos: " . $e->getMessage());
}

// Crear tabla de códigos de verificación si no existe
try {
    $db = Database::getInstance();
    $sql = "CREATE TABLE IF NOT EXISTS codigos_verificacion (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(100),
        codigo VARCHAR(10),
        usado BOOLEAN DEFAULT FALSE,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_expiracion TIMESTAMP,
        INDEX idx_email_codigo (email, codigo),
        INDEX idx_expiracion (fecha_expiracion)
    )";
    $db->query($sql);
} catch (Exception $e) {
    error_log("Error creando tabla codigos_verificacion: " . $e->getMessage());
}

// Configuraciones adicionales
if (!defined('Config::SEND_WELCOME_EMAIL')) {
    define('Config::SEND_WELCOME_EMAIL', true);
}

if (!defined('Config::AUTO_LOGIN_AFTER_REGISTER')) {
    define('Config::AUTO_LOGIN_AFTER_REGISTER', false);
}

if (!defined('Config::REQUIRE_EMAIL_VERIFICATION')) {
    define('Config::REQUIRE_EMAIL_VERIFICATION', false);
}

?>