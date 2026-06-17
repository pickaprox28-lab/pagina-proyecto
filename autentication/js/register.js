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
            mostrarError('Las contrasenas no coinciden');
            return;
        }

        if (password.length < 4) {
            mostrarError('La contrasena debe tener al menos 4 caracteres');
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
            }
        } catch (error) {
            console.error('Error:', error);
            mostrarError('Error de conexion con el servidor. Abre la app desde http://localhost:3000');
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
