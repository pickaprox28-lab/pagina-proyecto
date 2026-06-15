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
            mostrarMensajeSinDatos();
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarMensajeError();
    }
});

function mostrarResultados(data) {
    document.getElementById('loadingMessage').style.display = 'none';
    document.getElementById('resultContent').style.display = 'block';

    if (!tieneEstufa(data)) {
        document.getElementById('sinEstufaMensaje').style.display = 'block';
        document.getElementById('usoEstufaContent').style.display = 'none';
        return;
    }

    document.getElementById('sinEstufaMensaje').style.display = 'none';
    document.getElementById('usoEstufaContent').style.display = 'block';
    document.getElementById('frecuenciaTexto').textContent = capitalizar(data.frecuencia);
    document.getElementById('porcentajeTexto').textContent = `${data.porcentaje}%`;
    document.getElementById('usoMensualTexto').textContent = `${data.porcentajeUso ?? data.porcentaje}%`;

    const lista = document.getElementById('recomendacionesLista');
    lista.innerHTML = '';
    data.recomendaciones.forEach(rec => {
        const li = document.createElement('li');
        li.textContent = rec;
        lista.appendChild(li);
    });

    const ctx = document.getElementById('impactChart').getContext('2d');
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Contaminación mensual', 'Sin contaminación estimada'],
            datasets: [{
                data: [data.porcentaje, 100 - data.porcentaje],
                backgroundColor: ['#ff6b6b', '#4ecdc4'],
                borderWidth: 0
            }]
        },
        options: {
            cutout: '70%',
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}

function tieneEstufa(data) {
    const respuesta = normalizar(data.usa_estufa);
    const frecuencia = normalizar(data.frecuencia);
    return respuesta ? respuesta === 'si' && frecuencia !== 'no' : Boolean(frecuencia && frecuencia !== 'no');
}

function normalizar(str) {
    return (str || '')
        .toString()
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

function capitalizar(str) {
    if (!str) return '-';
    return str.split(' ').map(word => word[0].toUpperCase() + word.slice(1)).join(' ');
}

function mostrarMensajeSinDatos() {
    const loading = document.getElementById('loadingMessage');
    loading.innerHTML = 'No has registrado datos para este año. <a href="registro-datos.html">Haz clic aquí para registrar</a>';
    loading.style.color = '#ff9800';
}

function mostrarMensajeError() {
    const loading = document.getElementById('loadingMessage');
    loading.innerHTML = 'Error al cargar tus datos. Abre la app desde http://localhost:3000.';
    loading.style.color = '#f44336';
}
