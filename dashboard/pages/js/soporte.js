document.getElementById('reporteForm').addEventListener('submit', async function(event) {
    event.preventDefault();
    
    const direccion = document.getElementById('direccion').value;
    const descripcion = document.getElementById('descripcion').value;
    const reportadoPor = localStorage.getItem('usuarioActual');
    
    if (!reportadoPor) {
        window.location.href = '../../Autentication/html/login.html';
        return;
    }
    
    try {
        const response = await fetch('http://localhost:3000/api/reportar/direccion', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ direccion, reportado_por: reportadoPor, descripcion })
        });
        
        const data = await response.json();
        
        if (data.success) {
            mostrarExito('Reporte enviado correctamente. Nos contactaremos contigo pronto.');
            document.getElementById('reporteForm').reset();
        } else {
            mostrarError(data.message);
        }
    } catch (error) {
        mostrarError('Error al enviar reporte: ' + error.message);
    }
});

function mostrarError(mensaje) {
    const errorDiv = document.getElementById('mensajeError');
    errorDiv.textContent = mensaje;
    errorDiv.style.display = 'block';
    setTimeout(() => errorDiv.style.display = 'none', 5000);
}

function mostrarExito(mensaje) {
    const exitoDiv = document.getElementById('mensajeExito');
    exitoDiv.textContent = mensaje;
    exitoDiv.style.display = 'block';
}