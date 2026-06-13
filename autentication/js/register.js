function mostrarPassword(inputId) {
    const password = document.getElementById(inputId);
    if (!password) return;
    password.type = password.type === 'password' ? 'text' : 'password';
}

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('registerForm');
    const mensajeExito = document.getElementById('mensajeExito');
    const mensajeError = document.getElementById('mensajeError');
    const submitBtn = form?.querySelector('button[type="submit"]');

    if (!form || !mensajeExito || !mensajeError || !submitBtn) return;

    const btnSwitch = document.getElementById('btnSwitchToLogin');
    if (btnSwitch) {
        btnSwitch.addEventListener('click', function() {
            window.location.href = 'login.html';
        });
    }

    cargarCaptcha();
    const refreshBtn = document.getElementById('refreshCaptcha');
    if (refreshBtn) refreshBtn.addEventListener('click', cargarCaptcha);

    form.addEventListener('submit', async function(event) {
        event.preventDefault();

        const nombre = document.getElementById('nombre').value.trim();
        const usuario = document.getElementById('usuario').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        mensajeExito.style.display = 'none';
        mensajeError.style.display = 'none';

        if (!nombre || !usuario || !email) {
            mostrarError('Completa todos los datos del formulario.');
            return;
        }

        if (password !== confirmPassword) {
            mostrarError('Las contraseñas no coinciden');
            return;
        }

        if (password.length < 4) {
            mostrarError('La contraseña debe tener al menos 4 caracteres');
            return;
        }

        const captchaRespuesta = parseInt(document.getElementById('captchaRespuesta')?.value, 10);
        if (Number.isNaN(captchaRespuesta) || captchaRespuesta !== captchaActual.resultado) {
            mostrarError('Captcha incorrecto. Intenta nuevamente.');
            cargarCaptcha();
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Registrando...';

        try {
            const response = await fetch('/api/register', {
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
                mostrarError(data.message || 'No se pudo registrar el usuario.');
                cargarCaptcha();
            }
        } catch (error) {
            console.error('Error:', error);
            mostrarError('Error de conexión con el servidor. Abre la app desde http://localhost:3000');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Registrarse';
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
        mensajeExito.textContent = 'Registro exitoso. Redirigiendo al login...';
        mensajeExito.style.display = 'block';

        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1200);
    }
});

let captchaActual = { pregunta: '', resultado: 0 };

async function cargarCaptcha() {
    try {
        const response = await fetch('/api/captcha/obtener');
        const data = await response.json();
        captchaActual = { pregunta: data.pregunta, resultado: data.resultadoEsperado };

        const preguntaEl = document.getElementById('captchaPregunta');
        if (preguntaEl) preguntaEl.textContent = data.pregunta;

        const respuestaEl = document.getElementById('captchaRespuesta');
        if (respuestaEl) respuestaEl.value = '';
    } catch (error) {
        console.error('Error cargando captcha:', error);
        const preguntaEl = document.getElementById('captchaPregunta');
        if (preguntaEl) preguntaEl.textContent = 'No disponible';
    }
}
