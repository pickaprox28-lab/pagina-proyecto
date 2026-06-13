let usuarioActual = null;
let anioActual = new Date().getFullYear();

document.addEventListener('DOMContentLoaded', async function() {
    const logueado = localStorage.getItem('usuarioLogueado');
    if (!logueado || logueado !== 'true') {
        window.location.href = '/autentication/login.html';
        return;
    }

    usuarioActual = {
        id: localStorage.getItem('usuarioActual'),
        email: localStorage.getItem('usuarioEmail'),
        nombre: localStorage.getItem('usuarioNombre')
    };

    document.getElementById('userName').textContent = usuarioActual.nombre || usuarioActual.id;

    const anioEl = document.getElementById('anioTexto');
    if (anioEl) anioEl.textContent = anioActual;

    await verificarRegistro();

    document.getElementById('logoutBtn').addEventListener('click', cerrarSesion);
});

async function verificarRegistro() {
    const estadoP = document.getElementById('estadoRegistro');
    const actionBtn = document.getElementById('actionBtn');

    try {
        const response = await fetch(`/api/reinicio/verificar/${encodeURIComponent(usuarioActual.id)}`);
        const data = await response.json();

        if (data.yaRegistro) {
            estadoP.innerHTML = `Ya has registrado tus datos este año (${data.año})<br>
                                 Registrado el: ${data.datos?.fecha_registro || 'fecha no disponible'}`;
            actionBtn.textContent = 'Ver mis resultados';
            actionBtn.onclick = () => window.location.href = 'pages/html/resultado-personal.html';

            document.getElementById('dashboardLinks').style.display = 'grid';
        } else {
            estadoP.innerHTML = `Aún no has registrado tus datos para el año ${data.año}<br>
                                 Por favor completa el formulario para contribuir a las estadísticas.`;
            actionBtn.textContent = 'Registrar mis datos';
            actionBtn.onclick = () => window.location.href = 'pages/html/registro-datos.html';
        }
    } catch (error) {
        console.error('Error:', error);
        estadoP.innerHTML = 'Error al conectar con el servidor. Abre la app desde http://localhost:3000.';
        actionBtn.textContent = 'Reintentar';
        actionBtn.onclick = () => verificarRegistro();
    }
}

function verResultadoPersonal() {
    window.location.href = 'pages/html/resultado-personal.html';
}

function verResultadoComunal() {
    window.location.href = 'pages/html/resultado-comunal.html';
}

function irSoporte() {
    window.location.href = 'pages/html/soporte.html';
}

function cerrarSesion() {
    localStorage.removeItem('usuarioActual');
    localStorage.removeItem('usuarioEmail');
    localStorage.removeItem('usuarioNombre');
    localStorage.removeItem('usuarioLogueado');
    localStorage.removeItem('usuarioData');
    window.location.href = '/autentication/login.html';
}
