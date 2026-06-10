// Lógica de registro con Node.js backend
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('registerForm');
    const mensajeExito = document.getElementById('mensajeExito');
    const mensajeError = document.getElementById('mensajeError');
    
    // Botón para cambiar a login
    const btnSwitch = document.getElementById('btnSwitchToLogin');
    if (btnSwitch) {
        btnSwitch.addEventListener('click', function() {
            window.location.href = 'login.html';
        });
    }
    
    // Cargar captcha
    cargarCaptcha();
    const refreshBtn = document.getElementById('refreshCaptcha');
    if (refreshBtn) refreshBtn.addEventListener('click', cargarCaptcha);

    form.addEventListener('submit', async function(event) {
        event.preventDefault();
        
        // Obtener valores
        const nombre = document.getElementById('nombre').value;
        const usuario = document.getElementById('usuario').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        // Limpiar mensajes
        mensajeExito.style.display = 'none';
        mensajeError.style.display = 'none';
        
        // Validaciones
        if (password !== confirmPassword) {
            mostrarError('Las contraseñas no coinciden');
            return;
        }
        
        if (password.length < 4) {
            mostrarError('La contraseña debe tener al menos 4 caracteres');
            return;
        }
        
        // Validar captcha localmente
        const captchaRespuesta = parseInt(document.getElementById('captchaRespuesta')?.value);
        if (isNaN(captchaRespuesta) || captchaRespuesta !== captchaActual.resultado) {
            mostrarError('Captcha incorrecto. Intenta nuevamente.');
            cargarCaptcha();
            return;
        }

        try {
            const response = await fetch('http://localhost:3000/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ nombre, usuario, email, password })
            });
            
            const data = await response.json();
            
            if (data.success) {
                mostrarExitoYRedirigir();
            } else {
                mostrarError(data.message);
            }
            
        } catch (error) {
            console.error('Error:', error);
            mostrarError('Error de conexión con el servidor. Asegúrate de que el backend esté corriendo en http://localhost:3000');
        }
    });
    
    function mostrarError(mensaje) {
        mensajeError.textContent = mensaje;
        mensajeError.style.display = 'block';
        
        setTimeout(() => {
            mensajeError.style.display = 'none';
        }, 3000);
    }
    
    function mostrarExitoYRedirigir() {
        mensajeExito.textContent = '✅ ¡Registro exitoso! Redirigiendo al login...';
        mensajeExito.style.display = 'block';
        
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
    }
});

let captchaActual = { pregunta: '', resultado: 0 };

async function cargarCaptcha() {
    try {
        const response = await fetch('http://localhost:3000/api/captcha/obtener');
        const data = await response.json();
        captchaActual = { pregunta: data.pregunta, resultado: data.resultadoEsperado };
        const preguntaEl = document.getElementById('captchaPregunta');
        if (preguntaEl) preguntaEl.textContent = data.pregunta;
        const respuestaEl = document.getElementById('captchaRespuesta');
        if (respuestaEl) respuestaEl.value = '';
    } catch (error) {
        console.error('Error cargando captcha:', error);
    }
}