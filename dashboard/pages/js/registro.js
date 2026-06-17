// Mapa y lógica de registro
let mapa;
let marcador;

document.addEventListener('DOMContentLoaded', function() {
    if (!localStorage.getItem('usuarioActual')) {
        window.location.href = '/autentication/login.html';
        return;
    }

    inicializarMapa();
    
    // Mostrar/ocultar sección de frecuencia
    const radiosEstufa = document.querySelectorAll('input[name="usa_estufa"]');
    const radiosFrecuencia = document.querySelectorAll('input[name="frecuencia"]');
    const porcentajeUsoSection = document.getElementById('porcentajeUsoSection');
    const porcentajeUsoInput = document.getElementById('porcentajeUso');

    radiosEstufa.forEach(radio => {
        radio.addEventListener('change', function() {
            const frecuenciaSection = document.getElementById('frecuenciaSection');
            if (this.value === 'si') {
                frecuenciaSection.style.display = 'block';
                radiosFrecuencia.forEach(r => r.required = true);
            } else {
                frecuenciaSection.style.display = 'none';
                radiosFrecuencia.forEach(r => {
                    r.required = false;
                    r.checked = false;
                });
                ocultarPorcentajeUso();
            }
        });
    });

    radiosFrecuencia.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.value === 'a veces') {
                porcentajeUsoSection.style.display = 'block';
                porcentajeUsoInput.required = true;
            } else {
                ocultarPorcentajeUso();
            }
        });
    });

    function ocultarPorcentajeUso() {
        porcentajeUsoSection.style.display = 'none';
        porcentajeUsoInput.required = false;
        porcentajeUsoInput.value = '';
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
    
    // Obtener el valor de frecuencia
    const frecuenciaRadio = document.querySelector('input[name="frecuencia"]:checked');
    const frecuencia = frecuenciaRadio ? frecuenciaRadio.value : 'no';
    const porcentajeUsoInput = document.getElementById('porcentajeUso');
    const porcentaje_uso = frecuencia === 'a veces' ? porcentajeUsoInput.value : '';
    
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
        comentario
    });
    
    // Validar que se seleccionó respuesta
    if (!usa_estufa) {
        mostrarError('Por favor selecciona si tienes o no estufa a leña');
        return;
    }
    
    // Validar dirección
    if (!direccion || !latitud || !longitud) {
        mostrarError('Por favor selecciona tu dirección en el mapa');
        return;
    }
    
    // Si usa estufa, validar que seleccionó frecuencia
    if (usa_estufa === 'si' && !frecuenciaRadio) {
        mostrarError('Por favor selecciona la frecuencia de uso');
        return;
    }

    if (usa_estufa === 'si' && frecuencia === 'a veces') {
        const porcentajeUso = Number(porcentaje_uso);
        if (!Number.isFinite(porcentajeUso) || porcentajeUso < 1 || porcentajeUso > 99) {
            mostrarError('Ingresa un porcentaje de uso mensual entre 1 y 99');
            return;
        }
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
