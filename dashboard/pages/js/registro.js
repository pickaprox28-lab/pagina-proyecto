// Mapa y lógica de registro
let mapa;
let marcador;

document.addEventListener('DOMContentLoaded', function() {
    if (!localStorage.getItem('usuarioActual')) {
        window.location.href = '/autentication/login.html';
        return;
    }

    inicializarMapa();
    
    // Mostrar/ocultar detalle del equipo
    const radiosEstufa = document.querySelectorAll('input[name="usa_estufa"]');
    const radiosTipoChimenea = document.querySelectorAll('input[name="tipo_chimenea"]');
    const radiosTipoUso = document.querySelectorAll('input[name="tipo_uso"]');
    const radiosTipoLena = document.querySelectorAll('input[name="tipo_lena"]');
    const detalleEstufaSection = document.getElementById('detalleEstufaSection');
    const tipoLenaSection = document.getElementById('tipoLenaSection');

    radiosEstufa.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.value === 'si') {
                detalleEstufaSection.style.display = 'block';
                radiosTipoChimenea.forEach(r => r.required = true);
                radiosTipoUso.forEach(r => r.required = true);
                actualizarPreguntaLena();
            } else {
                detalleEstufaSection.style.display = 'none';
                limpiarRadios(radiosTipoChimenea);
                limpiarRadios(radiosTipoUso);
                limpiarRadios(radiosTipoLena);
                tipoLenaSection.style.display = 'none';
            }
        });
    });

    radiosTipoChimenea.forEach(radio => {
        radio.addEventListener('change', actualizarPreguntaLena);
    });

    function actualizarPreguntaLena() {
        const tipoChimenea = obtenerValorRadio('tipo_chimenea');
        const requiereLena = Boolean(tipoChimenea) && !esEquipoPellet(tipoChimenea);

        tipoLenaSection.style.display = requiereLena ? 'block' : 'none';
        radiosTipoLena.forEach(radio => {
            radio.required = requiereLena;
            if (!requiereLena) radio.checked = false;
        });
    }
    
    // Submit del formulario
    document.getElementById('registroForm').addEventListener('submit', enviarRegistro);
});

function inicializarMapa() {
    // Centro de Puerto Montt
    mapa = L.map('mapa').setView([-41.4693, -72.9424], 12);
    
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
    }).addTo(mapa);
    
    mapa.on('click', function(e) {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;
        
        if (marcador) mapa.removeLayer(marcador);
        marcador = L.marker([lat, lng]).addTo(mapa);
        
        document.getElementById('latitud').value = lat;
        document.getElementById('longitud').value = lng;
        
        // Reverse geocoding simple
        obtenerDireccionDesdeCoordenadas(lat, lng);
    });
}

async function obtenerDireccionDesdeCoordenadas(lat, lng) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
        const data = await response.json();
        const direccion = data.display_name || `${lat}, ${lng}`;
        document.getElementById('direccion').value = direccion;
    } catch (error) {
        document.getElementById('direccion').value = `${lat}, ${lng}`;
    }
}

async function enviarRegistro(event) {
    event.preventDefault();
    
    const usuarioId = localStorage.getItem('usuarioActual');
    
    // Obtener el valor de usa_estufa de manera más robusta
    const usaEstufaRadio = document.querySelector('input[name="usa_estufa"]:checked');
    const usa_estufa = usaEstufaRadio ? usaEstufaRadio.value : null;
    
    const tipo_chimenea = obtenerValorRadio('tipo_chimenea');
    const tipo_uso = obtenerValorRadio('tipo_uso');
    const tipo_lena = obtenerValorRadio('tipo_lena');
    const frecuencia = usa_estufa === 'si' ? obtenerFrecuenciaDesdeTipoUso(tipo_uso) : 'no';
    const porcentaje_uso = usa_estufa === 'si' ? obtenerPorcentajeDesdeTipoUso(tipo_uso) : 0;
    
    const comentario = document.getElementById('comentario').value;
    const direccion = document.getElementById('direccion').value;
    const latitud = document.getElementById('latitud').value;
    const longitud = document.getElementById('longitud').value;
    
    console.log('Datos a enviar:', {
        usuario_id: usuarioId,
        direccion,
        latitud,
        longitud,
        usa_estufa,
        frecuencia,
        porcentaje_uso,
        tipo_chimenea,
        tipo_uso,
        tipo_lena,
        comentario
    });
    
    // Validar que se seleccionó respuesta
    if (!usa_estufa) {
        mostrarError('Por favor selecciona si utilizas estufa, chimenea o estufa a pallet');
        return;
    }
    
    // Validar dirección
    if (!direccion || !latitud || !longitud) {
        mostrarError('Por favor selecciona tu dirección en el mapa');
        return;
    }
    
    if (usa_estufa === 'si' && !tipo_chimenea) {
        mostrarError('Por favor selecciona qué tipo de chimenea utilizas');
        return;
    }

    if (usa_estufa === 'si' && !tipo_uso) {
        mostrarError('Por favor selecciona el tipo de uso');
        return;
    }

    if (usa_estufa === 'si' && !esEquipoPellet(tipo_chimenea) && !tipo_lena) {
        mostrarError('Por favor selecciona qué leña utilizas');
        return;
    }
    
    try {
        const response = await fetch('/api/estufa/guardar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                usuario_id: usuarioId,
                direccion: direccion,
                latitud: latitud,
                longitud: longitud,
                usa_estufa: usa_estufa,
                frecuencia: frecuencia,
                porcentaje_uso: porcentaje_uso,
                tipo_chimenea: tipo_chimenea,
                tipo_uso: tipo_uso,
                tipo_lena: tipo_lena,
                comentario: comentario || ''
            })
        });
        
        const data = await response.json();
        console.log('Respuesta del servidor:', data);
        
        if (data.success) {
            mostrarExito('Datos guardados correctamente. Redirigiendo...');
            setTimeout(() => {
                window.location.href = 'resultado-personal.html';
            }, 2000);
        } else {
            mostrarError(data.message);
        }
    } catch (error) {
        console.error('Error detallado:', error);
        mostrarError('Error al guardar datos: ' + error.message);
    }
}

function mostrarError(mensaje) {
    const errorDiv = document.getElementById('mensajeError');
    errorDiv.textContent = mensaje;
    errorDiv.style.display = 'block';
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 4000);
}

function mostrarExito(mensaje) {
    const exitoDiv = document.getElementById('mensajeExito');
    exitoDiv.textContent = mensaje;
    exitoDiv.style.display = 'block';
}

function limpiarRadios(radios) {
    radios.forEach(radio => {
        radio.required = false;
        radio.checked = false;
    });
}

function obtenerValorRadio(nombre) {
    const radio = document.querySelector(`input[name="${nombre}"]:checked`);
    return radio ? radio.value : '';
}

function esEquipoPellet(tipoChimenea) {
    return tipoChimenea === 'estufa_a_pellet' || tipoChimenea === 'caldera_a_pellet';
}

function obtenerFrecuenciaDesdeTipoUso(tipoUso) {
    if (tipoUso === 'todos_los_dias') return 'todos los dias';
    if (tipoUso === 'calefaccionar') return 'calefaccionar';
    if (tipoUso === 'solo_cocinar') return 'solo cocinar';
    return 'no';
}

function obtenerPorcentajeDesdeTipoUso(tipoUso) {
    if (tipoUso === 'todos_los_dias') return 100;
    if (tipoUso === 'calefaccionar') return 50;
    if (tipoUso === 'solo_cocinar') return 25;
    return 0;
}
