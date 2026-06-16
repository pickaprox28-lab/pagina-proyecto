document.addEventListener('DOMContentLoaded', async function() {
    try {
        const response = await fetch('/api/resultado/comunal');
        const data = await response.json();

        if (data.success) {
            mostrarResultados(data.data);
        } else {
            mostrarMensajeError(data.message || 'No se pudo cargar el resultado comunal');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarMensajeError('Error de conexión con el servidor');
    }
});

function mostrarResultados(data) {
    document.getElementById('loadingMessage').style.display = 'none';
    document.getElementById('resultContent').style.display = 'block';

    const totalHogares = Number(data.total_hogares_registrados ?? data.total_viviendas ?? 0);
    const hogaresReferencia = Number(data.hogares_referencia_comunal ?? totalHogares);
    const porcentajeRegistros = Number(data.porcentaje_registros_sobre_comuna ?? 0);
    const chimeneasActivas = Number(data.chimeneas_activas_estimadas ?? 0);
    const porcentajeActual = Number(data.material_particulado_actual_porcentaje ?? data.contaminacion_actual_porcentaje ?? 0);
    const materialParticuladoTotal = Number(data.material_particulado_total_estimado ?? 0);
    const contaminante = data.contaminante_actual || 'MP2.5';

    document.getElementById('contaminacionActualPorcentaje').textContent = formatearPorcentaje(porcentajeActual);
    document.getElementById('totalHogaresRegistrados').textContent = formatearNumero(totalHogares);
    document.getElementById('hogaresReferenciaComunal').textContent = formatearNumero(hogaresReferencia);
    document.getElementById('chimeneasActivasEstimadas').textContent = formatearNumero(chimeneasActivas);
    document.getElementById('materialParticuladoTotal').textContent = `${formatearNumero(materialParticuladoTotal, 1)} g ${contaminante}/mes`;
    document.getElementById('detalleContaminacionActual').textContent =
        `${contaminante} estimado al ${formatearFecha(data.fecha_calculo)} con ${formatearNumero(totalHogares)} registros (${formatearPorcentaje(porcentajeRegistros)} de la referencia comunal)`;
}

function formatearNumero(valor, decimales = 0) {
    const numero = Number(valor);
    if (!Number.isFinite(numero)) return '0';

    return numero.toLocaleString('es-CL', {
        minimumFractionDigits: decimales > 0 && !Number.isInteger(numero) ? 1 : 0,
        maximumFractionDigits: decimales
    });
}

function formatearPorcentaje(valor) {
    const numero = Number(valor);
    if (!Number.isFinite(numero)) return '0%';

    const decimales = numero > 0 && numero < 1 ? 3 : 1;
    return `${formatearNumero(numero, decimales)}%`;
}

function formatearFecha(fecha) {
    if (!fecha) return 'día de hoy';

    const partes = fecha.split('-').map(Number);
    if (partes.length !== 3 || partes.some(parte => !Number.isFinite(parte))) {
        return fecha;
    }

    return new Date(partes[0], partes[1] - 1, partes[2]).toLocaleDateString('es-CL');
}

function mostrarMensajeError(mensaje) {
    const loading = document.getElementById('loadingMessage');
    loading.textContent = mensaje;
    loading.style.color = '#f44336';
}
