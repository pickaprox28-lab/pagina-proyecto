document.addEventListener('DOMContentLoaded', async function() {
    const usuarioId = localStorage.getItem('usuarioActual');

    if (!usuarioId) {
        window.location.href = '/autentication/login.html';
        return;
    }

    const reiniciarBtn = document.getElementById('reiniciarResultadoBtn');
    if (reiniciarBtn) {
        reiniciarBtn.addEventListener('click', () => reiniciarResultado(usuarioId));
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
    document.getElementById('materialParticuladoDiarioTexto').textContent = obtenerContaminanteDiario(data);
    document.getElementById('materialParticuladoTexto').textContent = obtenerContaminantesMensuales(data);

    const lista = document.getElementById('recomendacionesLista');
    lista.innerHTML = '';
    (data.recomendaciones || []).forEach(rec => {
        const li = document.createElement('li');
        li.textContent = rec;
        lista.appendChild(li);
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

function obtenerContaminantesMensuales(data) {
    const contaminante = data.contaminanteParticulado || 'MP2.5';
    const materialParticulado = Number(data.materialParticuladoGramos);
    const materialParticuladoTexto = data.materialParticuladoTexto
        || `${formatearNumero(materialParticulado)} g ${contaminante}/mes`;
    const kgCO2 = Number(data.kgCO2);

    if (!Number.isFinite(kgCO2)) {
        return materialParticuladoTexto;
    }

    return `${materialParticuladoTexto} | ${formatearNumero(kgCO2)} kg CO2/mes`;
}

function obtenerContaminanteDiario(data) {
    const contaminante = data.contaminanteParticulado || 'MP2.5';
    const materialParticulado = Number(data.materialParticuladoGramos);
    const materialParticuladoDiario = Number.isFinite(materialParticulado) ? materialParticulado / 30 : 0;

    return `${formatearNumero(materialParticuladoDiario, 1)} g ${contaminante}/día`;
}

function formatearNumero(valor, decimales = 1) {
    const numero = Number(valor);
    if (!Number.isFinite(numero)) return '0';

    return numero.toLocaleString('es-CL', {
        minimumFractionDigits: decimales > 0 && !Number.isInteger(numero) ? 1 : 0,
        maximumFractionDigits: decimales
    });
}

async function reiniciarResultado(usuarioId) {
    const confirmar = confirm('Esto reiniciara tu resultado personal del a\u00f1o actual. \u00bfQuieres continuar?');
    if (!confirmar) return;

    const boton = document.getElementById('reiniciarResultadoBtn');
    boton.disabled = true;
    boton.textContent = 'Reiniciando...';

    try {
        const data = await solicitarReinicio(usuarioId);

        if (!data.success) {
            mostrarMensajeReinicio(data.message || 'No se pudo reiniciar el resultado', true);
            boton.disabled = false;
            boton.textContent = 'Reiniciar resultado';
            return;
        }

        mostrarMensajeReinicio('Resultado reiniciado correctamente. Redirigiendo...');
        setTimeout(() => {
            window.location.href = 'registro-datos.html';
        }, 1200);
    } catch (error) {
        mostrarMensajeReinicio('Error al reiniciar resultado. Revisa la conexi\u00f3n con el servidor.', true);
        boton.disabled = false;
        boton.textContent = 'Reiniciar resultado';
    }
}

async function solicitarReinicio(usuarioId) {
    const usuario = encodeURIComponent(usuarioId);
    const response = await fetch(`/api/resultado/personal/${usuario}/reiniciar`, {
        method: 'POST'
    });

    if (response.ok) {
        return response.json();
    }

    const respaldo = await fetch(`/api/resultado/personal/${usuario}`, {
        method: 'DELETE'
    });

    return respaldo.json();
}

function mostrarMensajeReinicio(mensaje, esError = false) {
    const mensajeDiv = document.getElementById('mensajeReinicio');
    mensajeDiv.textContent = mensaje;
    mensajeDiv.className = esError ? 'error-message' : 'success-message';
    mensajeDiv.style.display = 'block';
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
