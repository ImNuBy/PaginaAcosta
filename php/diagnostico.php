<?php
/**
 * Diagnóstico del Sistema Escolar
 * Este archivo ayuda a identificar problemas de configuración
 */

// Configurar errores para mostrar
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

echo "<h1>🔍 Diagnóstico del Sistema Escolar</h1>";
echo "<style>
body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
.success { background: #d4edda; color: #155724; padding: 10px; border-radius: 5px; margin: 10px 0; }
.error { background: #f8d7da; color: #721c24; padding: 10px; border-radius: 5px; margin: 10px 0; }
.warning { background: #fff3cd; color: #856404; padding: 10px; border-radius: 5px; margin: 10px 0; }
.info { background: #d1ecf1; color: #0c5460; padding: 10px; border-radius: 5px; margin: 10px 0; }
table { width: 100%; border-collapse: collapse; margin: 20px 0; }
th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
th { background-color: #f2f2f2; }
</style>";

// 1. Verificar PHP
echo "<h2>🔧 Verificación de PHP</h2>";
echo "<div class='success'>✅ PHP versión: " . phpversion() . "</div>";

// 2. Verificar extensiones necesarias
echo "<h2>📦 Extensiones de PHP</h2>";
$extensions = ['pdo', 'pdo_mysql', 'json', 'session'];
foreach ($extensions as $ext) {
    if (extension_loaded($ext)) {
        echo "<div class='success'>✅ $ext: Instalada</div>";
    } else {
        echo "<div class='error'>❌ $ext: NO INSTALADA</div>";
    }
}

// 3. Verificar archivos
echo "<h2>📁 Verificación de Archivos</h2>";
$files = [
    'config.php' => 'Configuración principal',
    'auth.php' => 'Sistema de autenticación',
    'php/login.php' => 'Manejo de login',
    'php/check_session.php' => 'Verificación de sesión',
    'php/logout.php' => 'Cerrar sesión'
];

foreach ($files as $file => $desc) {
    if (file_exists($file)) {
        echo "<div class='success'>✅ $file: Existe ($desc)</div>";
    } else {
        echo "<div class='error'>❌ $file: NO EXISTE ($desc)</div>";
    }
}

// 4. Verificar base de datos
echo "<h2>🗄️ Verificación de Base de Datos</h2>";

try {
    // Intentar conectar sin incluir config.php primero
    $host = 'localhost';
    $dbname = 'sistema_escolar';
    $username = 'root';
    $password = '';
    
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    echo "<div class='success'>✅ Conexión a base de datos: EXITOSA</div>";
    
    // Verificar tablas
    $tables = ['usuarios', 'especialidades', 'anos', 'materias', 'calificaciones'];
    foreach ($tables as $table) {
        $stmt = $pdo->query("SHOW TABLES LIKE '$table'");
        if ($stmt->rowCount() > 0) {
            echo "<div class='success'>✅ Tabla '$table': Existe</div>";
        } else {
            echo "<div class='error'>❌ Tabla '$table': NO EXISTE</div>";
        }
    }
    
    // Verificar datos de usuarios
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM usuarios");
    $result = $stmt->fetch();
    echo "<div class='info'>ℹ️ Total usuarios en base de datos: " . $result['total'] . "</div>";
    
} catch (PDOException $e) {
    echo "<div class='error'>❌ Error de base de datos: " . $e->getMessage() . "</div>";
    echo "<div class='warning'>⚠️ Posibles soluciones:<br>
    1. Verificar que MySQL esté funcionando<br>
    2. Crear la base de datos 'sistema_escolar'<br>
    3. Importar el archivo SQL<br>
    4. Verificar credenciales de conexión</div>";
}

// 5. Verificar permisos
echo "<h2>🔐 Verificación de Permisos</h2>";
if (is_writable('.')) {
    echo "<div class='success'>✅ Permisos de escritura: OK</div>";
} else {
    echo "<div class='warning'>⚠️ Permisos de escritura: Limitados</div>";
}

// 6. Verificar sesiones
echo "<h2>🔑 Verificación de Sesiones</h2>";
if (session_start()) {
    echo "<div class='success'>✅ Sesiones PHP: Funcionando</div>";
    $_SESSION['test'] = 'ok';
    if (isset($_SESSION['test'])) {
        echo "<div class='success'>✅ Guardar en sesión: OK</div>";
        unset($_SESSION['test']);
    }
} else {
    echo "<div class='error'>❌ Sesiones PHP: Error</div>";
}

// 7. Test de login
echo "<h2>🧪 Test de Login</h2>";
if (file_exists('config.php') && file_exists('auth.php')) {
    try {
        include_once 'config.php';
        include_once 'auth.php';
        
        // Test con usuario admin
        $result = $auth->login('admin', 'admin123', 'admin');
        if ($result['success']) {
            echo "<div class='success'>✅ Test de login: EXITOSO</div>";
            echo "<div class='info'>Usuario: " . $result['user']['nombre'] . " " . $result['user']['apellido'] . "</div>";
        } else {
            echo "<div class='error'>❌ Test de login: FALLIDO - " . $result['message'] . "</div>";
        }
    } catch (Exception $e) {
        echo "<div class='error'>❌ Error en test de login: " . $e->getMessage() . "</div>";
    }
} else {
    echo "<div class='warning'>⚠️ No se puede realizar test de login (archivos faltantes)</div>";
}

// 8. Información del servidor
echo "<h2>🖥️ Información del Servidor</h2>";
echo "<table>";
echo "<tr><th>Variable</th><th>Valor</th></tr>";
echo "<tr><td>Servidor Web</td><td>" . $_SERVER['SERVER_SOFTWARE'] . "</td></tr>";
echo "<tr><td>PHP</td><td>" . phpversion() . "</td></tr>";
echo "<tr><td>Sistema Operativo</td><td>" . php_uname() . "</td></tr>";
echo "<tr><td>Directorio de trabajo</td><td>" . getcwd() . "</td></tr>";
echo "<tr><td>Tiempo límite</td><td>" . ini_get('max_execution_time') . " segundos</td></tr>";
echo "<tr><td>Memoria límite</td><td>" . ini_get('memory_limit') . "</td></tr>";
echo "</table>";

// 9. URLs de prueba
echo "<h2>🔗 URLs de Prueba</h2>";
$base_url = 'http://' . $_SERVER['HTTP_HOST'] . dirname($_SERVER['REQUEST_URI']);
echo "<div class='info'>";
echo "<strong>URLs para probar:</strong><br>";
echo "• Página principal: <a href='index_simple.html' target='_blank'>$base_url/index_simple.html</a><br>";
echo "• Test de conexión: <a href='test_connection.php' target='_blank'>$base_url/test_connection.php</a><br>";
echo "• Login API: $base_url/php/login.php (POST)<br>";
echo "• Check Session: $base_url/php/check_session.php<br>";
echo "</div>";

// 10. Recomendaciones
echo "<h2>💡 Recomendaciones</h2>";
echo "<div class='info'>";
echo "<strong>Para solucionar problemas:</strong><br>";
echo "1. Usar 'index_simple.html' en lugar de 'index.html'<br>";
echo "2. Verificar que XAMPP/WAMP esté funcionando<br>";
echo "3. Importar la base de datos desde phpMyAdmin<br>";
echo "4. Verificar la consola del navegador para errores JavaScript<br>";
echo "5. Revisar los logs de error de PHP<br>";
echo "</div>";

echo "<div class='success'>";
echo "<strong>Si todo está en verde, el sistema debería funcionar correctamente.</strong><br>";
echo "Usa: <a href='index_simple.html'>index_simple.html</a> para una versión simplificada y funcional.";
echo "</div>";

echo "<hr>";
echo "<p><small>Diagnóstico generado el: " . date('Y-m-d H:i:s') . "</small></p>";
?>