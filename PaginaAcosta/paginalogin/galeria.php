<?php session_start(); ?>
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Tienda de Egresados</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background: #eef;
      padding: 20px;
    }
    .producto {
      background: white;
      border-radius: 12px;
      padding: 15px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.1);
      margin: 10px;
      width: 280px;
      display: inline-block;
      vertical-align: top;
      text-align: center;
    }
    .producto img {
      width: 100%;
      border-radius: 8px;
    }
    .boton {
      background-color: #4CAF50;
      color: white;
      padding: 10px 20px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: bold;
      margin: 10px;
      display: inline-block;
      cursor: pointer;
    }
    .modal {
      display: none;
      position: fixed;
      z-index: 999;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      overflow: auto;
      background-color: rgba(0,0,0,0.5);
    }
    .modal-content {
      background-color: #fff;
      margin: 10% auto;
      padding: 20px;
      border-radius: 10px;
      width: 90%;
      max-width: 500px;
    }
    .close {
      color: #aaa;
      float: right;
      font-size: 28px;
      font-weight: bold;
      cursor: pointer;
    }
  </style>
</head>
<body>

<div style="text-align: center; margin-bottom: 20px;" id="botonesAdmin">
  <!-- Se insertarán los botones desde JS si es admin -->
</div>


  <h2 style="text-align:center;">Tienda de Egresados</h2>
  <div id="galeria"></div>

  <!-- Modal para comprar -->
  <div id="modalCompra" class="modal">
    <div class="modal-content">
      <span class="close" onclick="cerrarModal()">&times;</span>
      <h3>Formulario de compra</h3>
      <form id="formCompra">
        <input type="hidden" name="producto_id" id="producto_id">
        <label>Tu nombre:</label>
        <input type="text" name="nombre" required><br>
        <label>Correo electrónico:</label>
        <input type="email" name="email" required><br>
        <label>Cantidad:</label>
        <input type="number" name="cantidad" min="1" value="1" required><br><br>

        <button type="submit" class="boton">🛒 Enviar pedido</button>
        <button type="button" class="boton" style="background-color:#2196F3;" onclick="pagarMP()">💳 Pagar con Mercado Pago</button>
      </form>
    </div>
  </div>

  <script>
    const esAdmin = <?php echo (isset($_SESSION['rol']) && $_SESSION['rol'] === 'admin') ? 'true' : 'false'; ?>;
    const galeria = document.getElementById('galeria');
    const modal = document.getElementById('modalCompra');
    const form = document.getElementById('formCompra');
    let productoSeleccionado = null;

    function abrirModal(idProducto) {
      document.getElementById('producto_id').value = idProducto;
      productoSeleccionado = idProducto;
      modal.style.display = 'block';
    }

    function cerrarModal() {
      modal.style.display = 'none';
    }

    window.onclick = function(event) {
      if (event.target == modal) {
        cerrarModal();
      }
    }

    fetch('../php/obtener_productos.php')
      .then(res => res.json())
      .then(data => {
        if (data.length === 0) {
          galeria.innerHTML = "<p>No hay productos disponibles.</p>";
          return;
        }
        data.forEach(prod => {
          const div = document.createElement('div');
          div.className = "producto";
          div.innerHTML = `
            <img src="${prod.imagen}" alt="Imagen del producto">
            <h3>${prod.nombre}</h3>
            <p><strong>Precio:</strong> $${prod.precio}</p>
            <p>${prod.descripcion}</p>
            ${prod.contacto ? `<p><strong>Contacto:</strong> ${prod.contacto}</p>` : ""}
            ${prod.donacion_completa == 1 ? `<p style="color:green;"><strong>Donación 100%</strong></p>` : ""}
            ${esAdmin 
              ? `<a href="../php/eliminar_producto.php?id=${prod.id}" onclick="return confirm('¿Seguro que querés eliminar este producto?')">🗑 Eliminar</a>`
              : `<button class="boton" onclick="abrirModal(${prod.id})">Comprar</button>`
            }
          `;
          galeria.appendChild(div);
        });
      });

    // Enviar el formulario de pedido
    form.addEventListener('submit', function(e) {
      e.preventDefault();

      const datos = new FormData(form);

      fetch('../php/guardar_pedido.php', {
        method: 'POST',
        body: datos
      })
      .then(res => res.text())
      .then(res => {
        if (res === "ok") {
          alert('¡Pedido enviado correctamente!');
          cerrarModal();
          form.reset();
        } else {
          alert("Hubo un error al guardar el pedido.");
        }
      });
    });

    function pagarMP() {
  // Validamos el formulario
  if (!form.reportValidity()) {
    return; // No seguir si hay errores
  }

  const datos = new FormData(form);
  datos.append("metodo_pago", "Mercado Pago");

  // Guardamos el pedido con el método de pago
  fetch('../php/guardar_pedido.php', {
    method: 'POST',
    body: datos
  })
  .then(res => res.text())
  .then(res => {
    if (res === "ok") {
      // Redirige a Mercado Pago
      window.open('https://link.mercadopago.com.ar/escuelatecnica', '_blank');
      cerrarModal();
      form.reset();
    } else {
      alert("Hubo un error al guardar el pedido.");
    }
  });
}
// Mostrar botones de admin si corresponde
if (esAdmin) {
  document.getElementById('botonesAdmin').innerHTML = `
    <a href="formulario.html" class="boton">Agregar producto</a>
    <a href="aulas.html" class="boton" style="background-color:#2196F3;">Volver a Aulas</a>
  `;
} else {
  document.getElementById('botonesAdmin').innerHTML = `
    <a href="aulas.html" class="boton" style="background-color:#2196F3;">Volver a Aulas</a>
  `;
}


  </script>

</body>
</html>
