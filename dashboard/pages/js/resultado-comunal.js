document.addEventListener('DOMContentLoaded', async function() {
    document.getElementById('anioTexto').textContent = new Date().getFullYear();

    try {
        const response = await fetch('/api/resultado/comunal');
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

    document.getElementById('totalViviendas').textContent = data.total_viviendas;
    document.getElementById('chimeneasActivas').textContent = data.chimeneas_activas_estimadas;
    document.getElementById('contaminacionTotal').textContent =
        `Contaminación total estimada: ${data.contaminacion_total_estimada} kg CO2/mes`;

    const ctxFrecuencias = document.getElementById('frecuenciasChart').getContext('2d');
    new Chart(ctxFrecuencias, {
        type: 'bar',
        data: {
            labels: ['Todos los días', 'A veces', 'Solo frío', 'No usa'],
            datasets: [{
                label: 'Número de viviendas',
                data: [
                    data.frecuencias['todos los dias'] || 0,
                    data.frecuencias['a veces'] || 0,
                    data.frecuencias['solo cuando hace frío'] || 0,
                    data.frecuencias['no'] || 0
                ],
                backgroundColor: ['#ff6b6b', '#ffa500', '#4ecdc4', '#2ecc71']
            }]
        },
        options: { responsive: true, maintainAspectRatio: true }
    });

    const ctxContaminacion = document.getElementById('contaminacionChart').getContext('2d');
    new Chart(ctxContaminacion, {
        type: 'line',
        data: {
            labels: ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'],
            datasets: [{
                label: 'kg CO2 estimado',
                data: [
                    data.contaminacion_total_estimada * 0.25,
                    data.contaminacion_total_estimada * 0.25,
                    data.contaminacion_total_estimada * 0.25,
                    data.contaminacion_total_estimada * 0.25
                ],
                borderColor: '#ff6b6b',
                tension: 0.4
            }]
        },
        options: { responsive: true, maintainAspectRatio: true }
    });

    if (data.calidad_aire_reciente && data.calidad_aire_reciente.length > 0) {
        const tablaHtml = `
            <table class="data-table">
                <thead>
                    <tr><th>Fecha</th><th>PM2.5 (µg/m³)</th><th>PM10 (µg/m³)</th><th>Chimeneas estimadas</th></tr>
                </thead>
                <tbody>
                    ${data.calidad_aire_reciente.map(dia => `
                        <tr>
                            <td>${dia.fecha}</td>
                            <td>${dia.mp25}</td>
                            <td>${dia.mp10}</td>
                            <td>${dia.chimeneas_estimadas}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        document.getElementById('calidadAireTabla').innerHTML = tablaHtml;
    } else {
        document.getElementById('calidadAireTabla').innerHTML = '<p>No hay datos recientes de calidad del aire</p>';
    }
}

function mostrarMensajeError(mensaje) {
    const loading = document.getElementById('loadingMessage');
    loading.innerHTML = mensaje;
    loading.style.color = '#f44336';
}
