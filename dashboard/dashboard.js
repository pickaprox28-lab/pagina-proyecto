// Dashboard principal
let usuarioActual = null;
let añoActual = new Date().getFullYear();

document.addEventListener('DOMContentLoaded', async function() {
    // Verificar sesión
    const logueado = localStorage.getItem('usuarioLogueado');
    if (!logueado || logueado !== 'true') {
        window.location.href = '../Autentication/html/login.html';
        return;
    }
    
    // Obtener datos del usuario
    usuarioActual = {
        id: localStorage.getItem('usuarioActual'),
        email: localStorage.getItem('usuarioEmail'),
        nombre: localStorage.getItem('usuarioNombre')
    };
    
    document.getElementById('userName').textContent = `👤 ${usuarioActual.nombre || usuarioActual.id}`;
    // Mostrar año en el encabezado
    const anioEl = document.getElementById('anioTexto');
    if (anioEl) anioEl.textContent = añoActual;
    
    // Verificar si ya registró datos este año
    await verificarRegistro();
    
    // Configurar logout
    document.getElementById('logoutBtn').addEventListener('click', cerrarSesion);
});

async function verificarRegistro() {
    const statusCard = document.getElementById('statusCard');
    const estadoP = document.getElementById('estadoRegistro');
    const actionBtn = document.getElementById('actionBtn');
    
    try {
        const response = await fetch(`http://localhost:3000/api/reinicio/verificar/${usuarioActual.id}`);
        const data = await response.json();
        
        if (data.yaRegistro) {
            estadoP.innerHTML = `✅ Ya has registrado tus datos este año (${data.año})<br>
                                 📅 Registrado el: ${data.datos?.fecha_registro || 'fecha no disponible'}`;
            actionBtn.textContent = 'Ver mis resultados';
            actionBtn.onclick = () => window.location.href = 'pages/html/resultado-personal.html';
            
            // Mostrar enlaces adicionales
            document.getElementById('dashboardLinks').style.display = 'grid';
        } else {
            estadoP.innerHTML = `⚠️ Aún no has registrado tus datos para el año ${data.año}<br>
                                 Por favor completa el formulario para contribuir a las estadísticas.`;
            actionBtn.textContent = 'Registrar mis datos';
            actionBtn.onclick = () => window.location.href = 'pages/html/registro-datos.html';
        }
    } catch (error) {
        console.error('Error:', error);
        estadoP.innerHTML = '❌ Error al conectar con el servidor. Asegúrate que el backend esté corriendo.';
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
    window.location.href = '../Autentication/html/login.html';
}