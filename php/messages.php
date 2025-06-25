<?php
/**
 * API para mensajes del chat escolar
 * Maneja la carga y envío de mensajes entre usuarios
 */

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

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

header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

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

function verificarAutenticacion() {
    if (!isset($_SESSION['user_id']) || !isset($_SESSION['username'])) {
        throw new Exception('Usuario no autenticado', 401);
    }
    return [
        'id' => $_SESSION['user_id'],
        'username' => $_SESSION['username'],
        'rol' => $_SESSION['rol'] ?? 'estudiante'
    ];
}

function logAction($conn, $usuario_id, $accion, $descripcion) {
    $stmt = $conn->prepare("INSERT INTO logs_sistema (usuario_id, accion, descripcion, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)");
    if ($stmt) {
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        $user_agent = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';
        $stmt->bind_param("issss", $usuario_id, $accion, $descripcion, $ip, $user_agent);
        $stmt->execute();
        $stmt->close();
    }
}

try {
    $user = verificarAutenticacion();
    $conn = getDbConnection($dbconfig);
    
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Obtener mensajes
        $limite = isset($_GET['limite']) ? min(100, max(10, intval($_GET['limite']))) : 50;
        $offset = isset($_GET['offset']) ? max(0, intval($_GET['offset'])) : 0;
        $filtro_rol = isset($_GET['rol']) && in_array($_GET['rol'], ['estudiante', 'profesor', 'admin']) ? $_GET['rol'] : null;
        
        $sql = "SELECT id, autor, rol, mensaje, timestamp FROM chat_messages WHERE activo = TRUE";
        $params = [];
        $types = "";
        
        if ($filtro_rol) {
            $sql .= " AND rol = ?";
            $params[] = $filtro_rol;
            $types .= "s";
        }
        
        $sql .= " ORDER BY timestamp DESC LIMIT ? OFFSET ?";
        $params[] = $limite;
        $params[] = $offset;
        $types .= "ii";
        
        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            throw new Exception('Error preparando consulta de mensajes');
        }
        
        if (!empty($params)) {
            $stmt->bind_param($types, ...$params);
        }
        
        $stmt->execute();
        $result = $stmt->get_result();
        
        $mensajes = [];
        while ($row = $result->fetch_assoc()) {
            $mensajes[] = [
                'id' => $row['id'],
                'autor' => $row['autor'],
                'rol' => $row['rol'],
                'mensaje' => $row['mensaje'],
                'timestamp' => $row['timestamp']
            ];
        }
        
        // Reversar para mostrar los más recientes al final
        $mensajes = array_reverse($mensajes);
        
        $stmt->close();
        
        // Obtener estadísticas adicionales
        $stats_stmt = $conn->prepare("
            SELECT 
                COUNT(*) as total_mensajes,
                COUNT(DISTINCT usuario_id) as usuarios_activos,
                MAX(timestamp) as ultimo_mensaje
            FROM chat_messages 
            WHERE activo = TRUE AND DATE(timestamp) = CURDATE()
        ");
        
        if ($stats_stmt) {
            $stats_stmt->execute();
            $stats_result = $stats_stmt->get_result();
            $stats = $stats_result->fetch_assoc();
            $stats_stmt->close();
        } else {
            $stats = [
                'total_mensajes' => count($mensajes),
                'usuarios_activos' => 0,
                'ultimo_mensaje' => null
            ];
        }
        
        $response = [
            'success' => true,
            'messages' => $mensajes,
            'stats' => $stats,
            'filtro_aplicado' => $filtro_rol,
            'total_cargados' => count($mensajes),
            'timestamp' => time()
        ];
        
        http_response_code(200);
        echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // Enviar mensaje
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input || !isset($input['mensaje'])) {
            throw new Exception('Mensaje requerido', 400);
        }
        
        $mensaje = trim($input['mensaje']);
        
        if (empty($mensaje)) {
            throw new Exception('El mensaje no puede estar vacío', 400);
        }
        
        if (strlen($mensaje) > 1000) {
            throw new Exception('El mensaje es demasiado largo (máximo 1000 caracteres)', 400);
        }
        
        // Verificar rate limiting (máximo 10 mensajes por minuto)
        $rate_check = $conn->prepare("
            SELECT COUNT(*) as count_mensajes 
            FROM chat_messages 
            WHERE usuario_id = ? 
            AND timestamp > DATE_SUB(NOW(), INTERVAL 1 MINUTE)
            AND activo = TRUE
        ");
        
        if ($rate_check) {
            $rate_check->bind_param("i", $user['id']);
            $rate_check->execute();
            $rate_result = $rate_check->get_result();
            $rate_data = $rate_result->fetch_assoc();
            $rate_check->close();
            
            if ($rate_data['count_mensajes'] >= 10) {
                throw new Exception('Demasiados mensajes enviados. Espera un momento antes de enviar otro.', 429);
            }
        }
        
        // Determinar autor y rol del usuario actual
        $autor = $user['username'];
        $rol = $user['rol'];
        
        // Si hay nombre completo en la sesión, usarlo
        if (isset($_SESSION['nombre_completo']) && !empty($_SESSION['nombre_completo'])) {
            $autor = $_SESSION['nombre_completo'];
        }
        
        // Insertar mensaje
        $stmt = $conn->prepare("INSERT INTO chat_messages (usuario_id, autor, rol, mensaje) VALUES (?, ?, ?, ?)");
        if (!$stmt) {
            throw new Exception('Error preparando inserción de mensaje');
        }
        
        $stmt->bind_param("isss", $user['id'], $autor, $rol, $mensaje);
        
        if (!$stmt->execute()) {
            throw new Exception('Error al enviar mensaje: ' . $stmt->error);
        }
        
        $mensaje_id = $conn->insert_id;
        $stmt->close();
        
        // Log de la acción
        logAction($conn, $user['id'], 'chat_message_sent', "Mensaje enviado: " . substr($mensaje, 0, 50));
        
        // Obtener el mensaje insertado para confirmar
        $confirm_stmt = $conn->prepare("SELECT id, autor, rol, mensaje, timestamp FROM chat_messages WHERE id = ?");
        if ($confirm_stmt) {
            $confirm_stmt->bind_param("i", $mensaje_id);
            $confirm_stmt->execute();
            $confirm_result = $confirm_stmt->get_result();
            $nuevo_mensaje = $confirm_result->fetch_assoc();
            $confirm_stmt->close();
        } else {
            $nuevo_mensaje = [
                'id' => $mensaje_id,
                'autor' => $autor,
                'rol' => $rol,
                'mensaje' => $mensaje,
                'timestamp' => date('Y-m-d H:i:s')
            ];
        }
        
        $response = [
            'success' => true,
            'message' => 'Mensaje enviado exitosamente',
            'data' => $nuevo_mensaje,
            'timestamp' => time()
        ];
        
        http_response_code(201);
        echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        
    } else {
        throw new Exception('Método no permitido', 405);
    }
    
} catch (Exception $e) {
    $error_code = $e->getCode() ?: 500;
    http_response_code($error_code);
    
    $error_response = [
        'success' => false,
        'error' => $e->getMessage(),
        'code' => $error_code,
        'timestamp' => time()
    ];
    
    // Log del error si tenemos conexión
    if (isset($conn) && isset($user)) {
        logAction($conn, $user['id'], 'chat_error', $e->getMessage());
    }
    
    echo json_encode($error_response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    
} finally {
    if (isset($conn)) {
        $conn->close();
    }
}
?>