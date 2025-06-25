<?php
/**
 * Sistema de Autenticación Simplificado para Localhost
 */

require_once 'config.php';

class Auth {
    private $db;
    
    public function __construct() {
        $this->db = Database::getInstance();
    }
    
    /**
     * Iniciar sesión
     */
    public function login($username, $password, $rol) {
        try {
            $username = cleanInput($username);
            $password = cleanInput($password);
            $rol = cleanInput($rol);
            
            // Buscar usuario
            $sql = "SELECT id, username, password, nombre, apellido, email, rol, estado 
                    FROM usuarios 
                    WHERE username = ? AND rol = ? AND estado = 'activo'";
            
            $user = $this->db->fetch($sql, [$username, $rol]);
            
            if ($user && verifyPassword($password, $user['password'])) {
                // Login exitoso
                $_SESSION['user_id'] = $user['id'];
                $_SESSION['username'] = $user['username'];
                $_SESSION['nombre'] = $user['nombre'];
                $_SESSION['apellido'] = $user['apellido'];
                $_SESSION['email'] = $user['email'];
                $_SESSION['rol'] = $user['rol'];
                $_SESSION['logged_in'] = true;
                
                // Actualizar última conexión
                $this->updateLastConnection($user['id']);
                
                // Registrar actividad (opcional)
                if (function_exists('logActivity')) {
                    logActivity($user['id'], 'login', 'Usuario inició sesión');
                }
                
                return [
                    'success' => true,
                    'message' => 'Inicio de sesión exitoso',
                    'user' => [
                        'id' => $user['id'],
                        'username' => $user['username'],
                        'nombre' => $user['nombre'],
                        'apellido' => $user['apellido'],
                        'email' => $user['email'],
                        'rol' => $user['rol']
                    ],
                    'redirect' => 'dashboard.php'
                ];
            }
            
            return [
                'success' => false,
                'message' => 'Credenciales incorrectas'
            ];
            
        } catch (Exception $e) {
            error_log("Error en login: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Error del sistema'
            ];
        }
    }
    
    /**
     * Registrar usuario
     */
    public function register($data) {
        try {
            // Validar datos básicos
            if (empty($data['username']) || empty($data['password']) || 
                empty($data['nombre']) || empty($data['apellido']) || 
                empty($data['email']) || empty($data['rol'])) {
                return [
                    'success' => false,
                    'message' => 'Todos los campos son requeridos'
                ];
            }
            
            // Verificar si el usuario ya existe
            if ($this->userExists($data['username'], $data['email'])) {
                return [
                    'success' => false,
                    'message' => 'El usuario o email ya están registrados'
                ];
            }
            
            // Hashear contraseña
            $hashedPassword = hashPassword($data['password']);
            
            // Insertar usuario
            $sql = "INSERT INTO usuarios (username, password, nombre, apellido, email, telefono, rol) 
                    VALUES (?, ?, ?, ?, ?, ?, ?)";
            
            $userId = $this->db->insert($sql, [
                cleanInput($data['username']),
                $hashedPassword,
                cleanInput($data['nombre']),
                cleanInput($data['apellido']),
                cleanInput($data['email']),
                cleanInput($data['telefono'] ?? ''),
                cleanInput($data['rol'])
            ]);
            
            if ($userId) {
                // Registrar actividad (opcional)
                if (function_exists('logActivity')) {
                    logActivity($userId, 'register', 'Usuario registrado');
                }
                
                return [
                    'success' => true,
                    'message' => 'Usuario registrado exitosamente',
                    'user_id' => $userId
                ];
            }
            
            return [
                'success' => false,
                'message' => 'Error al registrar usuario'
            ];
            
        } catch (Exception $e) {
            error_log("Error en registro: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Error del sistema'
            ];
        }
    }
    
    /**
     * Cerrar sesión
     */
    public function logout() {
        if (isset($_SESSION['user_id']) && function_exists('logActivity')) {
            logActivity($_SESSION['user_id'], 'logout', 'Usuario cerró sesión');
        }
        
        session_destroy();
        return [
            'success' => true,
            'message' => 'Sesión cerrada correctamente'
        ];
    }
    
    /**
     * Verificar si está logueado
     */
    public function isLoggedIn() {
        return isset($_SESSION['logged_in']) && $_SESSION['logged_in'] === true;
    }
    
    /**
     * Obtener usuario actual
     */
    public function getCurrentUser() {
        if (!$this->isLoggedIn()) {
            return null;
        }
        
        return [
            'id' => $_SESSION['user_id'],
            'username' => $_SESSION['username'],
            'nombre' => $_SESSION['nombre'],
            'apellido' => $_SESSION['apellido'],
            'email' => $_SESSION['email'],
            'rol' => $_SESSION['rol']
        ];
    }
    
    /**
     * Verificar si el usuario ya existe
     */
    private function userExists($username, $email) {
        $sql = "SELECT id FROM usuarios WHERE username = ? OR email = ?";
        $result = $this->db->fetch($sql, [$username, $email]);
        return $result !== false;
    }
    
    /**
     * Actualizar última conexión
     */
    private function updateLastConnection($userId) {
        try {
            $this->db->update(
                "UPDATE usuarios SET ultima_conexion = NOW() WHERE id = ?",
                [$userId]
            );
        } catch (Exception $e) {
            error_log("Error actualizando última conexión: " . $e->getMessage());
        }
    }
    
    /**
     * Verificar permisos
     */
    public function hasPermission($requiredRole) {
        if (!$this->isLoggedIn()) {
            return false;
        }
        
        $roleHierarchy = [
            'alumno' => 1,
            'profesor' => 2,
            'admin' => 3
        ];
        
        $userLevel = $roleHierarchy[$_SESSION['rol']] ?? 0;
        $requiredLevel = $roleHierarchy[$requiredRole] ?? 0;
        
        return $userLevel >= $requiredLevel;
    }
}

// Crear instancia global
$auth = new Auth();

/**
 * Funciones auxiliares
 */
function requireAuth() {
    global $auth;
    if (!$auth->isLoggedIn()) {
        header('Location: index.html');
        exit();
    }
}

function requireRole($role) {
    global $auth;
    requireAuth();
    if (!$auth->hasPermission($role)) {
        die('No tienes permisos para acceder a esta página');
    }
}

function getCurrentUser() {
    global $auth;
    return $auth->getCurrentUser();
}

?>