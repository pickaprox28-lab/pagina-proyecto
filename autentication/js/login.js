function mostrarPassword() {
    const password = document.getElementById('password');
    if (!password) return;
    password.type = password.type === 'password' ? 'text' : 'password';
}

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('loginForm');
    const mensajeError = document.getElementById('mensajeError');
    const submitBtn = form?.querySelector('button[type="submit"]');

    if (!form || !mensajeError || !submitBtn) return;

    const btnSwitch = document.getElementById('btnSwitchToRegister');
    if (btnSwitch) {
        btnSwitch.addEventListener('click', function() {
            window.location.href = 'register.html';
        });
    }

    form.addEventListener('submit', async function(event) {
        event.preventDefault();

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const recaptchaToken = obtenerRecaptchaToken();

        mensajeError.style.display = 'none';

        if (!recaptchaToken) {
            mostrarError('Completa el captcha antes de iniciar sesion.');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Ingresando...';

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password, recaptchaToken })
            });

            const data = await response.json();

            if (data.success) {
                localStorage.setItem('usuarioActual', data.user.usuario);
                localStorage.setItem('usuarioEmail', data.user.email);
                localStorage.setItem('usuarioNombre', data.user.nombre_completo);
                localStorage.setItem('usuarioLogueado', 'true');
                localStorage.setItem('usuarioData', JSON.stringify(data.user));

                mostrarExitoYRedirigir(data.user.nombre_completo);
            } else {
                mostrarError(data.message || 'Correo o contraseña incorrectos.');
            }
        } catch (error) {
            console.error('Error:', error);
            mostrarError('Error de conexión con el servidor. Abre la app desde http://localhost:3000');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Iniciar Sesión';
        }
    });

    function obtenerRecaptchaToken() {
        if (window.recaptchaHelper) return window.recaptchaHelper.getToken();
        if (typeof grecaptcha === 'undefined') return '';
        return grecaptcha.getResponse();
    }

    function reiniciarRecaptcha() {
        if (window.recaptchaHelper) {
            window.recaptchaHelper.reset();
            return;
        }

        if (typeof grecaptcha !== 'undefined') {
            grecaptcha.reset();
        }
    }

    function mostrarError(mensaje) {
        mensajeError.textContent = mensaje;
        mensajeError.style.display = 'block';
        document.getElementById('password').value = '';
        reiniciarRecaptcha();

        const loginBox = document.querySelector('.login-box');
        if (!loginBox) return;

        loginBox.classList.add('shake');
        setTimeout(() => {
            loginBox.classList.remove('shake');
        }, 500);
    }

    function mostrarExitoYRedirigir(nombre) {
        const mensajeExito = document.createElement('div');
        mensajeExito.className = 'success-message';
        mensajeExito.textContent = `Bienvenido ${nombre}. Redirigiendo...`;
        mensajeExito.style.position = 'fixed';
        mensajeExito.style.top = '20px';
        mensajeExito.style.right = '20px';
        mensajeExito.style.backgroundColor = '#4CAF50';
        mensajeExito.style.color = 'white';
        mensajeExito.style.padding = '15px';
        mensajeExito.style.borderRadius = '5px';
        mensajeExito.style.zIndex = '1000';
        document.body.appendChild(mensajeExito);

        setTimeout(() => {
            window.location.href = '/dashboard/dashboard.html';
        }, 900);
    }
});
