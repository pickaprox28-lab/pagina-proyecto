document.addEventListener('DOMContentLoaded', async function() {
    const usuarioId = localStorage.getItem('usuarioActual');

    if (!usuarioId) {
        window.location.href = '/autentication/login.html';
        return;
    }

    try {
        const response = await fetch(`/api/resultado/personal/${encodeURIComponent(usuarioId)}`);
        const data = await response.json();

        if (data.success) {
            mostrarResultados(data.data);
        } else {
            mostrarMensajeError(data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarMensajeError('Error de conexión con el servidor');
    }
});

function mostrarResultados(data) {
    document.getElementById('loadingMessage').style.display = 'none';
    document.getElementById('resultContent').style.display = 'block';

    const porcentaje = data.porcentaje ?? 0;
    document.getElementById('porcentajeUsuario').textContent = `${porcentaje}%`;
}

function mostrarMensajeError(mensaje) {
    const loading = document.getElementById('loadingMessage');
    loading.innerHTML = mensaje;
    loading.style.color = '#f44336';
}
