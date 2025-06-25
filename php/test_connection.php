<?php
/**
 * Archivo para probar la conexión a la base de datos
 * Guarda este archivo como test_connection.php y ábrelo en el navegador
 */

include 'config.php';

echo "<h1>🧪 Prueba de Conexión - Sistema Escolar</h1>";

try {
    $db = Database::getInstance();
    echo "✅ <strong>Conexión exitosa a la base de datos</strong><br><br>";
    
    // Probar consulta básica
    $usuarios = $db->fetchAll("SELECT username, nombre, apellido, rol FROM usuarios");
    
    echo "<h3>👥 Usuarios en el sistema:</h3>";
    echo "<table border='1' style='border-collapse: collapse; margin: 20px 0;'>";
    echo "<tr style='background: #2c3e50; color: white;'>
            <th style='padding: 10px;'>Usuario</th>
            <th style='padding: 10px;'>Nombre</th>
            <th style='padding: 10px;'>Apellido</th>
            <th style='padding: 10px;'>Rol</th>
          </tr>";
    
    foreach ($usuarios as $usuario) {
        $roleColor = '';
        switch($usuario['rol']) {
            case 'admin': $roleColor = 'color: #e74c3c; font-weight: bold;'; break;
            case 'profesor': $roleColor = 'color: #f39c12; font-weight: bold;'; break;
            case 'alumno': $roleColor = 'color: #3498db; font-weight: bold;'; break;
        }
        
        echo "<tr>";
        echo "<td style='padding: 8px;'>" . htmlspecialchars($usuario['username']) . "</td>";
        echo "<td style='padding: 8px;'>" . htmlspecialchars($usuario['nombre']) . "</td>";
        echo "<td style='padding: 8px;'>" . htmlspecialchars($usuario['apellido']) . "</td>";
        echo "<td style='padding: 8px; $roleColor'>" . ucfirst($usuario['rol']) . "</td>";
        echo "</tr>";
    }
    echo "</table>";
    
    // Verificar especialidades
    $especialidades = $db->fetchAll("SELECT nombre, codigo FROM especialidades");
    echo "<h3>🎓 Especialidades disponibles:</h3>";
    echo "<ul>";
    foreach ($especialidades as $esp) {
        echo "<li><strong>" . htmlspecialchars($esp['nombre']) . "</strong> (" . htmlspecialchars($esp['codigo']) . ")</li>";
    }
    echo "</ul>";
    
    // Verificar materias
    $totalMaterias = $db->fetch("SELECT COUNT(*) as total FROM materias");
    echo "<h3>📚 Total de materias: " . $totalMaterias['total'] . "</h3>";
    
    // Verificar calificaciones
    $totalCalificaciones = $db->fetch("SELECT COUNT(*) as total FROM calificaciones");
    echo "<h3>📝 Total de calificaciones: " . $totalCalificaciones['total'] . "</h3>";
    
    echo "<br><hr><br>";
    echo "<h3>🔑 Credenciales de prueba:</h3>";
    echo "<div style='background: #f8f9fa; padding: 15px; border-radius: 5px; font-family: monospace;'>";
    echo "<strong>Administrador:</strong> admin / admin123<br>";
    echo "<strong>Alumno:</strong> juan.perez / alumno123<br>";
    echo "<strong>Profesor:</strong> prof.rodriguez / prof123<br>";
    echo "</div>";
    
    echo "<br><div style='background: #d4edda; color: #155724; padding: 15px; border-radius: 5px;'>";
    echo "🎉 <strong>¡Todo configurado correctamente!</strong><br>";
    echo "Puedes acceder al sistema en: <a href='index.html'>index.html</a>";
    echo "</div>";
    
} catch (Exception $e) {
    echo "❌ <strong>Error:</strong> " . $e->getMessage();
    echo "<br><br><div style='background: #f8d7da; color: #721c24; padding: 15px; border-radius: 5px;'>";
    echo "<strong>Posibles soluciones:</strong><br>";
    echo "1. Verifica que XAMPP/WAMP esté funcionando<br>";
    echo "2. Asegúrate de haber importado la base de datos<br>";
    echo "3. Revisa las credenciales en config.php<br>";
    echo "4. Verifica que la base de datos 'sistema_escolar' exista";
    echo "</div>";
}
?>

<style>
body {
    font-family: Arial, sans-serif;
    max-width: 800px;
    margin: 50px auto;
    padding: 20px;
    background: #f5f5f5;
}

h1 {
    color: #2c3e50;
    text-align: center;
    margin-bottom: 30px;
}

table {
    width: 100%;
    margin: 20px 0;
}

th, td {
    text-align: left;
    padding: 12px;
    border: 1px solid #ddd;
}

th {
    background-color: #2c3e50;
    color: white;
}

tr:nth-child(even) {
    background-color: #f2f2f2;
}
</style>