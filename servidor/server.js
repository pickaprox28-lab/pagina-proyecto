const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

// Rutas a archivos CSV
const DATA_DIR = path.join(__dirname, 'data');
const USUARIOS_CSV = path.join(DATA_DIR, 'usuarios.csv');
const ESTUFAS_CSV = path.join(DATA_DIR, 'datos_estufas.csv');
const DIRECCIONES_CSV = path.join(DATA_DIR, 'direcciones.csv');
const REPORTES_CSV = path.join(DATA_DIR, 'reportes.csv');
const CALIDAD_AIRE_CSV = path.join(DATA_DIR, 'calidad_aire_mock.csv');

// FUNCIONES

async function leerCSV(filePath, encabezados) {
    try {
        const data = await fs.readFile(filePath, 'utf-8');
        const lineas = data.trim().split('\n');
        if (lineas.length < 2) return [];
        const headers = parseCSVLine(lineas[0]);
        const resultados = [];

        for (let i = 1; i < lineas.length; i++) {
            if (lineas[i].trim() === '') continue;
            const valores = parseCSVLine(lineas[i]);
            // Si cantidad de valores coincide con headers, mapear directamente
            const obj = {};
            if (valores.length === headers.length) {
                for (let j = 0; j < headers.length; j++) {
                    obj[headers[j]] = valores[j];
                }
            } else {
                if (headers.includes('latitud') && headers.includes('longitud')) {
                    // id, usuario_id, direccion(.*), latitud, longitud
                    const latIdx = valores.findIndex(v => /^-?\d+\.\d+$/.test(v));
                    if (latIdx > 2 && latIdx < valores.length - 1) {
                        const lonIdx = latIdx + 1;
                        const direccionArr = valores.slice(2, latIdx);
                        const direccion = direccionArr.join(', ');

                        obj[headers[0]] = valores[0] || '';
                        obj[headers[1]] = valores[1] || '';
                        obj[headers[2]] = direccion;
                        obj[headers[3]] = valores[latIdx] || '';
                        obj[headers[4]] = valores[lonIdx] || '';

                        let restStart = lonIdx + 1;
                        for (let j = 5; j < headers.length && restStart < valores.length; j++, restStart++) {
                            obj[headers[j]] = valores[restStart] || '';
                        }
                    } else {
                        for (let j = 0; j < Math.min(headers.length, valores.length); j++) obj[headers[j]] = valores[j];
                    }
                } else {
                    for (let j = 0; j < Math.min(headers.length, valores.length); j++) obj[headers[j]] = valores[j];
                }
            }
            resultados.push(obj);
        }
        return resultados;
    } catch (error) {
        await fs.writeFile(filePath, encabezados.join(',') + '\n');
        return [];
    }
}

async function escribirCSV(filePath, datos, encabezados) {
    // Escribir con campos entre comillas para preservar comas en valores
    const quote = v => '"' + String(v || '').replace(/"/g, '""') + '"';
    let csvContent = encabezados.map(h => quote(h)).join(',') + '\n';
    for (const fila of datos) {
        const valores = encabezados.map(h => quote(fila[h] || ''));
        csvContent += valores.join(',') + '\n';
    }
    await fs.writeFile(filePath, csvContent, 'utf-8');
}

function parseCSVLine(line) {
    const result = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            if (inQuotes && line[i+1] === '"') { cur += '"'; i++; }
            else inQuotes = !inQuotes;
        } else if (ch === ',' && !inQuotes) {
            result.push(cur.trim()); cur = ''; 
        } else {
            cur += ch;
        }
    }
    result.push(cur.trim());
    return result.map(r => r.replace(/^"|"$/g, ''));
}

// INICIALIZAR ARCHIVOS CSV

async function inicializarArchivos() {
    // Asegurar que la carpeta data existe
    await fs.mkdir(DATA_DIR, { recursive: true });
    
    // Usuarios
    await leerCSV(USUARIOS_CSV, ['usuario', 'contraseña', 'email', 'nombre_completo']);
    
    // Datos estufas
    await leerCSV(ESTUFAS_CSV, ['id', 'usuario_id', 'direccion', 'latitud', 'longitud', 'usa_estufa', 'frecuencia', 'comentario', 'fecha_registro', 'año']);
    
    // Direcciones
    await leerCSV(DIRECCIONES_CSV, ['id', 'direccion', 'latitud', 'longitud', 'usuario_id', 'activo', 'fecha_asignacion']);
    
    // Reportes
    await leerCSV(REPORTES_CSV, ['id', 'direccion', 'reportado_por', 'descripcion', 'estado', 'fecha_reporte']);
    
    // Calidad aire mock
    await leerCSV(CALIDAD_AIRE_CSV, ['fecha', 'estacion', 'mp25', 'mp10', 'chimeneas_estimadas']);
}

// ENDPOINTS API

// LOGIN Y REGISTRO

// Login
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log(`Intento de login: ${email}`);
        
        const usuarios = await leerCSV(USUARIOS_CSV, ['usuario', 'contraseña', 'email', 'nombre_completo']);
        console.log(`Usuarios cargados: ${usuarios.length}`);
        
        const user = usuarios.find(u => u.email === email && u['contraseña'] === password);
        
        if (!user) {
            console.log(`Login fallido para: ${email}`);
            return res.json({ success: false, message: 'Credenciales inválidas' });
        }
        
        console.log(`Login exitoso: ${user.usuario}`);
        res.json({ 
            success: true, 
            user: { 
                usuario: user.usuario, 
                email: user.email, 
                nombre_completo: user.nombre_completo 
            } 
        });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ success: false, message: 'Error al realizar login' });
    }
});

// Registro
app.post('/api/register', async (req, res) => {
    try {
        const { nombre, usuario, email, password } = req.body;
        console.log(`Intento de registro: ${usuario} - ${email}`);
        
        const usuarios = await leerCSV(USUARIOS_CSV, ['usuario', 'contraseña', 'email', 'nombre_completo']);

        // Validar existencia
        if (usuarios.find(u => u.usuario === usuario)) {
            return res.json({ success: false, message: 'El nombre de usuario ya existe' });
        }
        if (usuarios.find(u => u.email === email)) {
            return res.json({ success: false, message: 'El correo ya está registrado' });
        }

        const nuevo = {
            usuario: usuario,
            'contraseña': password,
            email: email,
            nombre_completo: nombre
        };

        usuarios.push(nuevo);
        await escribirCSV(USUARIOS_CSV, usuarios, ['usuario', 'contraseña', 'email', 'nombre_completo']);

        console.log(`Registro exitoso: ${usuario}`);
        res.json({ success: true, message: 'Registro exitoso' });
    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({ success: false, message: 'Error al registrar usuario' });
    }
});

// ENDPOINTS DEL SISTEMA DE ESTUFAS

// 1. Guardar datos de estufa
app.post('/api/estufa/guardar', async (req, res) => {
    try {
        const { usuario_id, direccion, latitud, longitud, usa_estufa, frecuencia, comentario } = req.body;
        const datosEstufas = await leerCSV(ESTUFAS_CSV, []);
        
        const nuevoId = datosEstufas.length + 1;
        const fecha = new Date().toISOString().split('T')[0];
        const año = new Date().getFullYear();
        
        const nuevoRegistro = {
            id: nuevoId,
            usuario_id,
            direccion,
            latitud,
            longitud,
            usa_estufa,
            frecuencia,
            comentario: comentario || '',
            fecha_registro: fecha,
            año
        };
        
        datosEstufas.push(nuevoRegistro);
        await escribirCSV(ESTUFAS_CSV, datosEstufas, ['id', 'usuario_id', 'direccion', 'latitud', 'longitud', 'usa_estufa', 'frecuencia', 'comentario', 'fecha_registro', 'año']);
        
        // Guardar dirección
        const direcciones = await leerCSV(DIRECCIONES_CSV, []);
        const dirExistente = direcciones.find(d => d.direccion === direccion);
        
        if (!dirExistente) {
            direcciones.push({
                id: direcciones.length + 1,
                direccion,
                latitud,
                longitud,
                usuario_id,
                activo: 'true',
                fecha_asignacion: fecha
            });
            await escribirCSV(DIRECCIONES_CSV, direcciones, ['id', 'direccion', 'latitud', 'longitud', 'usuario_id', 'activo', 'fecha_asignacion']);
        }
        
        res.json({ success: true, message: 'Datos guardados correctamente', id: nuevoId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al guardar datos' });
    }
});

// 2. Obtener datos del usuario actual
app.get('/api/estufa/usuario/:usuarioId', async (req, res) => {
    try {
        const { usuarioId } = req.params;
        const datosEstufas = await leerCSV(ESTUFAS_CSV, []);
        const añoActual = new Date().getFullYear();
        
        const datosUsuario = datosEstufas.find(d => d.usuario_id === usuarioId && d.año == añoActual);
        
        if (datosUsuario) {
            res.json({ success: true, data: datosUsuario });
        } else {
            res.json({ success: false, message: 'Usuario no ha registrado datos este año' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al obtener datos' });
    }
});

// 3. Obtener resultado personal
app.get('/api/resultado/personal/:usuarioId', async (req, res) => {
    try {
        const { usuarioId } = req.params;
        const datosEstufas = await leerCSV(ESTUFAS_CSV, []);
        const añoActual = new Date().getFullYear();
        
        const datosUsuario = datosEstufas.find(d => d.usuario_id === usuarioId && d.año == añoActual);
        
        if (!datosUsuario) {
            return res.json({ success: false, message: 'No hay datos para este usuario' });
        }
        
        const contaminacion = calcularContaminacionPersonal(datosUsuario.frecuencia);
        const recomendaciones = obtenerRecomendaciones(datosUsuario.frecuencia);
        
        res.json({
            success: true,
            data: {
                frecuencia: datosUsuario.frecuencia,
                kgCO2: contaminacion.kgCO2,
                porcentaje: contaminacion.porcentaje,
                recomendaciones
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al calcular resultado' });
    }
});

function calcularContaminacionPersonal(frecuencia) {
    const valores = {
        "si": { kgCO2: 120, porcentaje: 100 },
        "todos los dias": { kgCO2: 120, porcentaje: 100 },
        "a veces": { kgCO2: 60, porcentaje: 50 },
        "solo cuando hace frío": { kgCO2: 40, porcentaje: 33 },
        "no": { kgCO2: 0, porcentaje: 0 }
    };
    return valores[frecuencia?.toLowerCase()] || valores["no"];
}

function obtenerRecomendaciones(frecuencia) {
    const recomendacionesMap = {
        "si": ["Reduce el uso a días específicos", "Usa leña seca (menos humo)", "Mantén la estufa bien regulada"],
        "todos los dias": ["Reduce el uso a días específicos", "Usa leña seca (menos humo)", "Mantén la estufa bien regulada"],
        "a veces": ["Buen trabajo reduciendo el uso", "Considera alternativas como estufa a pellet", "Ventila bien los espacios"],
        "solo cuando hace frío": ["Excelente control de uso", "Aísla mejor tu casa para menos frío", "Comparte tus hábitos con vecinos"],
        "no": ["Excelente! No generas contaminación por estufa", "Eres un ejemplo para la comunidad"]
    };
    return recomendacionesMap[frecuencia?.toLowerCase()] || ["Sigue así!"];
}

// 4. Obtener resultado comunal
app.get('/api/resultado/comunal', async (req, res) => {
    try {
        const datosEstufas = await leerCSV(ESTUFAS_CSV, []);
        const calidadAire = await leerCSV(CALIDAD_AIRE_CSV, []);
        const añoActual = new Date().getFullYear();
        
        const datosAñoActual = datosEstufas.filter(d => d.año == añoActual);
        const chimeneasActivas = await calcularChimeneasActivas();
        
        // Calcular frecuencias
        const frecuencias = {
            "todos los dias": datosAñoActual.filter(d => d.frecuencia === "todos los dias" || d.frecuencia === "si").length,
            "a veces": datosAñoActual.filter(d => d.frecuencia === "a veces").length,
            "solo cuando hace frío": datosAñoActual.filter(d => d.frecuencia === "solo cuando hace frío").length,
            "no": datosAñoActual.filter(d => d.frecuencia === "no").length
        };
        
        // Calcular contaminación total estimada
        let contaminacionTotal = 0;
        for (const dato of datosAñoActual) {
            const cont = calcularContaminacionPersonal(dato.frecuencia);
            contaminacionTotal += cont.kgCO2;
        }
        
        res.json({
            success: true,
            data: {
                total_viviendas: datosAñoActual.length,
                chimeneas_activas_estimadas: chimeneasActivas,
                frecuencias,
                contaminacion_total_estimada: contaminacionTotal,
                calidad_aire_reciente: calidadAire.slice(-7),
                año: añoActual
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al calcular datos comunales' });
    }
});

async function calcularChimeneasActivas() {
    const datosEstufas = await leerCSV(ESTUFAS_CSV, []);
    const añoActual = new Date().getFullYear();
    const datosAñoActual = datosEstufas.filter(d => d.año == añoActual);
    
    const frecuencias = {
        "todos los dias": 1.0,
        "si": 1.0,
        "a veces": 0.5,
        "solo cuando hace frío": 0.33,
        "no": 0
    };
    
    let totalFactor = 0;
    for (const dato of datosAñoActual) {
        totalFactor += frecuencias[dato.frecuencia?.toLowerCase()] || 0;
    }
    
    return Math.round(totalFactor);
}

// 5. Reportar dirección
app.post('/api/reportar/direccion', async (req, res) => {
    try {
        const { direccion, reportado_por, descripcion } = req.body;
        const reportes = await leerCSV(REPORTES_CSV, []);
        
        const nuevoReporte = {
            id: reportes.length + 1,
            direccion,
            reportado_por,
            descripcion,
            estado: 'pendiente',
            fecha_reporte: new Date().toISOString().split('T')[0]
        };
        
        reportes.push(nuevoReporte);
        await escribirCSV(REPORTES_CSV, reportes, ['id', 'direccion', 'reportado_por', 'descripcion', 'estado', 'fecha_reporte']);
        
        res.json({ success: true, message: 'Reporte enviado correctamente' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al enviar reporte' });
    }
});

// 6. Verificar si ya registró datos este año
app.get('/api/reinicio/verificar/:usuarioId', async (req, res) => {
    try {
        const { usuarioId } = req.params;
        const datosEstufas = await leerCSV(ESTUFAS_CSV, []);
        const añoActual = new Date().getFullYear();
        
        const registroActual = datosEstufas.find(d => d.usuario_id === usuarioId && d.año == añoActual);
        
        res.json({
            yaRegistro: !!registroActual,
            año: añoActual,
            datos: registroActual || null
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al verificar' });
    }
});

// 7. Obtener captcha simple
app.get('/api/captcha/obtener', (req, res) => {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    const resultado = num1 + num2;
    
    res.json({
        pregunta: `${num1} + ${num2} = ?`,
        resultadoEsperado: resultado,
    });
});

// INICIAR SERVIDOR 

app.get('/api/debug/estufas', async (req, res) => {
    try {
        const datos = await leerCSV(ESTUFAS_CSV, ['id','usuario_id','direccion','latitud','longitud','usa_estufa','frecuencia','comentario','fecha_registro','año']);
        res.json({ success: true, count: datos.length, data: datos });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

inicializarArchivos().then(() => {
    app.listen(PORT, () => {
        console.log(`Servidor corriendo en http://localhost:${PORT}`);
        console.log(`Accede a: http://localhost:${PORT}/Dashboard/dashboard.html`);
        console.log(`Datos de los usuarios en: ${DATA_DIR}`);
        console.log(`\nCredenciales de prueba:`);
        console.log(`   admin@ejemplo.com / 1234`);
        console.log(`   maria@ejemplo.com / 5678`);
        console.log(`   juan@ejemplo.com / abcd`);
    });
});

app.post('/api/debug/repair-estufas', async (req, res) => {
    try {
        const raw = await fs.readFile(ESTUFAS_CSV, 'utf-8');
        const lines = raw.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length <= 1) return res.json({ success: true, repaired: 0 });

        const headers = lines[0];
        const dataLines = lines.slice(1);
        const repaired = [];

        for (const line of dataLines) {
            const parts = line.split(',').map(p => p.trim());
            let latIdx = -1;
            for (let i = 0; i < parts.length - 1; i++) {
                if (/^-?\d+\.\d+$/.test(parts[i]) && /^-?\d+\.\d+$/.test(parts[i+1])) {
                    latIdx = i; break;
                }
            }
            if (latIdx > 2) {
                const id = parts[0] || '';
                const usuario_id = parts[1] || '';
                const direccion = parts.slice(2, latIdx).join(', ');
                const latitud = parts[latIdx] || '';
                const longitud = parts[latIdx+1] || '';
                const rest = parts.slice(latIdx+2);
                // usa_estufa,frecuencia,comentario,fecha_registro,año
                const usa_estufa = rest[0] || '';
                const frecuencia = rest[1] || '';
                const comentario = rest[2] || '';
                const fecha_registro = rest[3] || '';
                const año = rest[4] || '';

                repaired.push({ id, usuario_id, direccion, latitud, longitud, usa_estufa, frecuencia, comentario, fecha_registro, año });
            } else {
            }
        }

        if (repaired.length > 0) {
            await escribirCSV(ESTUFAS_CSV, repaired, ['id','usuario_id','direccion','latitud','longitud','usa_estufa','frecuencia','comentario','fecha_registro','año']);
        }

        res.json({ success: true, repaired: repaired.length });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});