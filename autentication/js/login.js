// Lógica de autenticación con Node.js backend
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('loginForm');
    const mensajeError = document.getElementById('mensajeError');
    
    // Botón para cambiar a registro
    const btnSwitch = document.getElementById('btnSwitchToRegister');
    if (btnSwitch) {
        btnSwitch.addEventListener('click', function() {
            window.location.href = 'register.html';
        });
    }
    
    form.addEventListener('submit', async function(event) {
        event.preventDefault();
        
        const email = document.getElementById('usuario').value;
        const password = document.getElementById('password').value;
        
        mensajeError.style.display = 'none';
        
        try {
            const response = await fetch('http://localhost:3000/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Guardar sesión
                localStorage.setItem('usuarioActual', data.user.usuario);
                localStorage.setItem('usuarioEmail', data.user.email);
                localStorage.setItem('usuarioNombre', data.user.nombre_completo);
                localStorage.setItem('usuarioLogueado', 'true');
                localStorage.setItem('usuarioData', JSON.stringify(data.user));
                
                mostrarExitoYRedirigir(data.user.nombre_completo);
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
        document.getElementById('password').value = '';
        
        const loginBox = document.querySelector('.login-box');
        loginBox.classList.add('shake');
        setTimeout(() => {
            loginBox.classList.remove('shake');
        }, 500);
    }
    
    function mostrarExitoYRedirigir(nombre) {
        const mensajeExito = document.createElement('div');
        mensajeExito.className = 'success-message';
        mensajeExito.textContent = `✅ ¡Bienvenido ${nombre}! Redirigiendo...`;
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
            window.location.href = "../../Dashboard/dashboard.html";
        }, 2000);
    }
});