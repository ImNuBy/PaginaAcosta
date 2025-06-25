<?php
/**
 * Configuración para entorno local con XAMPP/WAMP/LAMP
 */

// ===== CONFIGURACIÓN DE BASE DE DATOS =====
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', ''); // Generalmente vacío en XAMPP
define('DB_NAME', 'sistema_escolar');
define('DB_CHARSET', 'utf8mb4');

// ===== CONFIGURACIÓN DE LA APLICACIÓN =====
define('APP_NAME', 'Sistema de Gestión Escolar');
define('APP_VERSION', '2.0');
define('APP_URL', 'http://localhost/sistema-escolar'); // Ajusta según tu carpeta

// ===== CONFIGURACIÓN DE SESIONES =====
define('SESSION_LIFETIME', 3600); // 1 hora
define('SESSION_NAME', 'escuela_session');

// ===== CONFIGURACIÓN DE SEGURIDAD =====
define('HASH_ALGORITHM', 'sha256');
define('CSRF_TOKEN_LENGTH', 32);

// ===== CONFIGURACIÓN DE ARCHIVOS =====
define('UPLOAD_DIR', 'uploads/');
define('MAX_FILE_SIZE', 5242880); // 5MB

// ===== ZONA HORARIA =====
date_default_timezone_set('America/Argentina/Buenos_Aires');

// ===== CONFIGURACIÓN DE ERRORES =====
// En desarrollo, mostrar errores
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

/**
 * Clase para manejar la conexión a la base de datos
 */
class Database {
    private static $instance = null;
    private $connection;
    
    private function __construct() {
        try {
            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES " . DB_CHARSET
            ];
            
            $this->connection = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            // En desarrollo, mostrar el error completo
            die("Error de conexión: " . $e->getMessage());
        }
    }
    
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    public function getConnection() {
        return $this->connection;
    }
    
    public function query($sql, $params = []) {
        try {
            $stmt = $this->connection->prepare($sql);
            $stmt->execute($params);
            return $stmt;
        } catch (PDOException $e) {
            error_log("Error en consulta: " . $e->getMessage());
            throw new Exception("Error en la consulta: " . $e->getMessage());
        }
    }
    
    public function fetch($sql, $params = []) {
        $stmt = $this->query($sql, $params);
        return $stmt->fetch();
    }
    
    public function fetchAll($sql, $params = []) {
        $stmt = $this->query($sql, $params);
        return $stmt->fetchAll();
    }
    
    public function insert($sql, $params = []) {
        $this->query($sql, $params);
        return $this->connection->lastInsertId();
    }
    
    public function update($sql, $params = []) {
        $stmt = $this->query($sql, $params);
        return $stmt->rowCount();
    }
    
    public function delete($sql, $params = []) {
        $stmt = $this->query($sql, $params);
        return $stmt->rowCount();
    }
}

/**
 * Funciones de utilidad
 */
function hashPassword($password) {
    return hash(HASH_ALGORITHM, $password);
}

function verifyPassword($password, $hash) {
    return hash(HASH_ALGORITHM, $password) === $hash;
}

function cleanInput($data) {
    $data = trim($data);
    $data = stripslashes($data);
    $data = htmlspecialchars($data, ENT_QUOTES, 'UTF-8');
    return $data;
}

function validateEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL);
}

function formatDate($date, $format = 'd/m/Y H:i') {
    if ($date instanceof DateTime) {
        return $date->format($format);
    }
    return date($format, strtotime($date));
}

function redirect($url) {
    header("Location: $url");
    exit();
}

/**
 * Función para logging de actividades (simplificada)
 */
function logActivity($user_id, $action, $details = '') {
    try {
        $db = Database::getInstance();
        
        // Crear tabla de logs si no existe
        $sql = "CREATE TABLE IF NOT EXISTS logs_actividad (
            id INT AUTO_INCREMENT PRIMARY KEY,
            usuario_id INT,
            accion VARCHAR(100) NOT NULL,
            detalles TEXT,
            ip_address VARCHAR(45),
            user_agent VARCHAR(500),
            fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        )";
        $db->query($sql);
        
        // Insertar log
        $sql = "INSERT INTO logs_actividad (usuario_id, accion, detalles, ip_address, user_agent) 
                VALUES (?, ?, ?, ?, ?)";
        $db->query($sql, [
            $user_id,
            $action,
            $details,
            $_SERVER['REMOTE_ADDR'] ?? '',
            $_SERVER['HTTP_USER_AGENT'] ?? ''
        ]);
    } catch (Exception $e) {
        error_log("Error al registrar actividad: " . $e->getMessage());
    }
}

// ===== INICIALIZACIÓN =====
// Iniciar sesión solo si no está ya iniciada
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Verificar conexión a la base de datos
try {
    $db = Database::getInstance();
    // echo "Conexión a la base de datos exitosa<br>";
} catch (Exception $e) {
    die("Error conectando a la base de datos: " . $e->getMessage());
}

?>