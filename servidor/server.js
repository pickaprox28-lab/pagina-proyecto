const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;
const PASSWORD_SALT_ROUNDS = 10;
const USUARIOS_HEADERS = ['usuario', 'contraseña', 'email', 'nombre_completo'];

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
const ESTUFAS_HEADERS = ['id', 'usuario_id', 'direccion', 'latitud', 'longitud', 'usa_estufa', 'frecuencia', 'porcentaje_uso', 'comentario', 'fecha_registro', 'año'];
const MATERIAL_PARTICULADO_MAXIMO_MENSUAL_GR = 1200;
const HOGARES_PARTICULARES_PUERTO_MONTT = 83700;

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

function obtenerPasswordUsuario(usuario) {
    return usuario?.[USUARIOS_HEADERS[1]] || '';
}

function asignarPasswordUsuario(usuario, passwordHash) {
    usuario[USUARIOS_HEADERS[1]] = passwordHash;
}

function esHashBcrypt(password) {
    return /^\$2[aby]\$\d{2}\$/.test(password || '');
}

async function validarPassword(usuario, password) {
    const passwordGuardada = obtenerPasswordUsuario(usuario);
    if (!passwordGuardada) return false;

    if (esHashBcrypt(passwordGuardada)) {
        return bcrypt.compare(password, passwordGuardada);
    }

    return passwordGuardada === password;
}

// INICIALIZAR ARCHIVOS CSV

async function inicializarArchivos() {
    // Asegurar que la carpeta data existe
    await fs.mkdir(DATA_DIR, { recursive: true });
    
    // Usuarios
    await leerCSV(USUARIOS_CSV, USUARIOS_HEADERS);
    
    // Datos estufas
    await leerCSV(ESTUFAS_CSV, ESTUFAS_HEADERS);
    
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

        const usuarios = await leerCSV(USUARIOS_CSV, USUARIOS_HEADERS);
        console.log(`Usuarios cargados: ${usuarios.length}`);
        
        const user = usuarios.find(u => u.email === email);
        
        if (!user || !(await validarPassword(user, password))) {
            console.log(`Login fallido para: ${email}`);
            return res.json({ success: false, message: 'Credenciales inválidas' });
        }

        if (!esHashBcrypt(obtenerPasswordUsuario(user))) {
            asignarPasswordUsuario(user, await bcrypt.hash(password, PASSWORD_SALT_ROUNDS));
            await escribirCSV(USUARIOS_CSV, usuarios, USUARIOS_HEADERS);
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

        const usuarios = await leerCSV(USUARIOS_CSV, USUARIOS_HEADERS);

        // Validar existencia
        if (usuarios.find(u => u.usuario === usuario)) {
            return res.json({ success: false, message: 'El nombre de usuario ya existe' });
        }
        if (usuarios.find(u => u.email === email)) {
            return res.json({ success: false, message: 'El correo ya está registrado' });
        }

        const nuevo = {
            usuario: usuario,
            [USUARIOS_HEADERS[1]]: await bcrypt.hash(password, PASSWORD_SALT_ROUNDS),
            email: email,
            nombre_completo: nombre
        };

        usuarios.push(nuevo);
        await escribirCSV(USUARIOS_CSV, usuarios, USUARIOS_HEADERS);

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
        const { usuario_id, direccion, latitud, longitud, usa_estufa, frecuencia, porcentaje_uso, comentario } = req.body;
        const datosEstufas = await leerCSV(ESTUFAS_CSV, ESTUFAS_HEADERS);
        
        const nuevoId = datosEstufas.length + 1;
        const fecha = obtenerFechaLocalISO();
        const año = new Date().getFullYear();
        const frecuenciaGuardada = esFrecuenciaAFrio(normalizarFrecuencia(frecuencia)) ? 'a veces' : frecuencia;
        const porcentajeUso = normalizarPorcentajeUso(frecuenciaGuardada, porcentaje_uso);

        if (normalizarFrecuencia(usa_estufa) === 'si' && normalizarFrecuencia(frecuenciaGuardada) === 'a veces' && porcentajeUso === null) {
            return res.status(400).json({ success: false, message: 'Ingresa un porcentaje de uso mensual válido' });
        }
        
        const nuevoRegistro = {
            id: nuevoId,
            usuario_id,
            direccion,
            latitud,
            longitud,
            usa_estufa,
            frecuencia: normalizarFrecuencia(usa_estufa) === 'no' ? 'no' : frecuenciaGuardada,
            porcentaje_uso: porcentajeUso ?? '',
            comentario: comentario || '',
            fecha_registro: fecha,
            año
        };
        
        datosEstufas.push(nuevoRegistro);
        await escribirCSV(ESTUFAS_CSV, datosEstufas, ESTUFAS_HEADERS);
        
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
        const datosEstufas = await leerCSV(ESTUFAS_CSV, ESTUFAS_HEADERS);
        const usuarios = await leerCSV(USUARIOS_CSV, USUARIOS_HEADERS);
        const anioActual = new Date().getFullYear();
        
        const datosUsuario = obtenerRegistroUsuarioAnio(datosEstufas, usuarioId, usuarios, anioActual);
        
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
        const datosEstufas = await leerCSV(ESTUFAS_CSV, ESTUFAS_HEADERS);
        const usuarios = await leerCSV(USUARIOS_CSV, USUARIOS_HEADERS);
        const anioActual = new Date().getFullYear();
        
        const datosUsuario = obtenerRegistroUsuarioAnio(datosEstufas, usuarioId, usuarios, anioActual);
        
        if (!datosUsuario) {
            return res.json({ success: false, message: 'No hay datos para este usuario' });
        }
        
        const frecuenciaEfectiva = obtenerFrecuenciaEfectiva(datosUsuario);
        const porcentajeUso = obtenerPorcentajeUso(datosUsuario, frecuenciaEfectiva);
        const contaminacion = calcularContaminacionPersonal(frecuenciaEfectiva, porcentajeUso);
        const frecuenciaVisible = obtenerFrecuenciaVisible(frecuenciaEfectiva);
        const recomendaciones = obtenerRecomendaciones(frecuenciaVisible, contaminacion.porcentaje);
        const usaEstufa = normalizarFrecuencia(frecuenciaEfectiva) === 'no' ? 'no' : 'si';
        
        res.json({
            success: true,
            data: {
                usa_estufa: usaEstufa,
                frecuencia: frecuenciaVisible,
                kgCO2: contaminacion.kgCO2,
                porcentaje: contaminacion.porcentaje,
                porcentajeUso: porcentajeUso,
                contaminanteParticulado: contaminacion.contaminanteParticulado,
                materialParticuladoGramos: contaminacion.materialParticuladoGramos,
                materialParticuladoTexto: contaminacion.materialParticuladoTexto,
                mensaje: contaminacion.porcentaje === 0 ? '¡Gracias por apoyar con los resultados!' : '',
                recomendaciones
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al calcular resultado' });
    }
});

app.delete('/api/resultado/personal/:usuarioId', async (req, res) => {
    try {
        const resultado = await reiniciarResultadoPersonal(req.params.usuarioId);
        res.json(resultado);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al reiniciar resultado' });
    }
});

app.post('/api/resultado/personal/:usuarioId/reiniciar', async (req, res) => {
    try {
        const resultado = await reiniciarResultadoPersonal(req.params.usuarioId);
        res.json(resultado);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al reiniciar resultado' });
    }
});

async function reiniciarResultadoPersonal(usuarioId) {
    const datosEstufas = await leerCSV(ESTUFAS_CSV, ESTUFAS_HEADERS);
    const usuarios = await leerCSV(USUARIOS_CSV, USUARIOS_HEADERS);
    const anioActual = String(new Date().getFullYear());
    const idsUsuario = obtenerIdentificadoresUsuario(usuarioId, usuarios);
    const datosActualizados = datosEstufas.filter(d => {
        return !(coincideUsuarioRegistro(d, idsUsuario) && coincideAnioRegistro(d, anioActual));
    });
    const eliminados = datosEstufas.length - datosActualizados.length;

    if (eliminados === 0) {
        return { success: false, message: 'No hay resultado para reiniciar' };
    }

    await escribirCSV(ESTUFAS_CSV, datosActualizados, ESTUFAS_HEADERS);
    return { success: true, message: 'Resultado reiniciado correctamente', eliminados };
}

function obtenerIdentificadoresUsuario(usuarioId, usuarios) {
    const ids = new Set();
    agregarIdentificadorUsuario(ids, usuarioId);

    const usuarioBuscado = normalizarIdentificador(usuarioId);
    const usuario = usuarios.find(u => {
        return normalizarIdentificador(u.usuario) === usuarioBuscado
            || normalizarIdentificador(u.email) === usuarioBuscado;
    });

    if (usuario) {
        agregarIdentificadorUsuario(ids, usuario.usuario);
        agregarIdentificadorUsuario(ids, usuario.email);
    }

    return ids;
}

function obtenerRegistroUsuarioAnio(datosEstufas, usuarioId, usuarios, anio) {
    const idsUsuario = obtenerIdentificadoresUsuario(usuarioId, usuarios);
    return [...datosEstufas]
        .reverse()
        .find(d => coincideUsuarioRegistro(d, idsUsuario) && coincideAnioRegistro(d, anio));
}

function coincideUsuarioRegistro(registro, idsUsuario) {
    return idsUsuario.has(normalizarIdentificador(registro?.usuario_id));
}

function coincideAnioRegistro(registro, anio) {
    return String(obtenerAnioRegistro(registro)).trim() === String(anio).trim();
}

function agregarIdentificadorUsuario(ids, valor) {
    const identificador = normalizarIdentificador(valor);
    if (identificador) ids.add(identificador);
}

function normalizarIdentificador(valor) {
    return (valor || '').toString().trim().toLowerCase();
}

function normalizarFrecuencia(frecuencia) {
    return (frecuencia || '')
        .toString()
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

function esFrecuenciaAFrio(frecuenciaNormalizada) {
    return frecuenciaNormalizada === 'solo cuando hace frio' || frecuenciaNormalizada.includes('cuando hace fr');
}

function obtenerFrecuenciaEfectiva(registro) {
    const usaEstufa = normalizarFrecuencia(registro?.usa_estufa);

    if (usaEstufa === 'no') {
        return 'no';
    }

    return registro?.frecuencia || (usaEstufa === 'si' ? 'si' : 'no');
}

function normalizarPorcentajeUso(frecuencia, porcentajeUso) {
    const frecuenciaNormalizada = normalizarFrecuencia(frecuencia);

    if (frecuenciaNormalizada === 'no') return 0;
    if (frecuenciaNormalizada === 'si' || frecuenciaNormalizada === 'todos los dias') return 100;

    if (frecuenciaNormalizada === 'a veces') {
        const porcentaje = Number(porcentajeUso);
        if (!Number.isFinite(porcentaje) || porcentaje < 1 || porcentaje > 99) return null;
        return Math.round(porcentaje);
    }

    return 0;
}

function obtenerPorcentajeUso(registro, frecuencia) {
    const frecuenciaNormalizada = normalizarFrecuencia(frecuencia);

    if (esFrecuenciaAFrio(frecuenciaNormalizada)) {
        const porcentaje = Number(registro?.porcentaje_uso);
        return Number.isFinite(porcentaje) && porcentaje >= 1 && porcentaje <= 99 ? Math.round(porcentaje) : 33;
    }

    if (frecuenciaNormalizada === 'a veces') {
        const porcentaje = Number(registro?.porcentaje_uso);
        return Number.isFinite(porcentaje) && porcentaje >= 1 && porcentaje <= 99 ? Math.round(porcentaje) : 50;
    }

    return normalizarPorcentajeUso(frecuencia, registro?.porcentaje_uso) ?? 0;
}

function obtenerFrecuenciaVisible(frecuencia) {
    return esFrecuenciaAFrio(normalizarFrecuencia(frecuencia)) ? 'a veces' : frecuencia;
}

function calcularContaminacionPersonal(frecuencia, porcentajeUso) {
    const porcentaje = obtenerPorcentajeUso({ porcentaje_uso: porcentajeUso }, frecuencia);
    const materialParticuladoGramos = redondear(MATERIAL_PARTICULADO_MAXIMO_MENSUAL_GR * (porcentaje / 100), 1);

    return {
        kgCO2: redondear(120 * (porcentaje / 100), 1),
        porcentaje,
        contaminanteParticulado: 'MP2.5',
        materialParticuladoGramos,
        materialParticuladoTexto: `${materialParticuladoGramos} g MP2.5/mes`
    };
}

function redondear(valor, decimales = 0) {
    const factor = 10 ** decimales;
    return Math.round(valor * factor) / factor;
}

function obtenerFechaLocalISO(fecha = new Date()) {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
}

function obtenerRecomendaciones(frecuencia, porcentaje = 0) {
    if (normalizarFrecuencia(frecuencia) === 'no') {
        return [
            'Excelente! No generas contaminaci\u00f3n por estufa a le\u00f1a.',
            'Mantener alternativas de calefacci\u00f3n limpia ayuda a la comunidad.'
        ];
    }

    const impacto = Number(porcentaje);
    const recomendaciones = [];

    if (Number.isFinite(impacto) && impacto >= 75) {
        recomendaciones.push('Limpiar los ca\u00f1ones de tu estufa si la contaminaci\u00f3n es muy alta, para evitar riesgos de incendios y contaminar dentro de tu hogar.');
    }

    recomendaciones.push(
        'Cambiar a estufa a pellet, que contamina menos.',
        'Usar estufa el\u00e9ctrica, que contamina mucho menos.',
        'Usar aire acondicionado el\u00e9ctrico, que contamina mucho menos.',
        'Mejorar el aislamiento t\u00e9rmico de tu hogar.',
        'Abrigarse para reducir la necesidad de calefacci\u00f3n.'
    );

    return recomendaciones;
}

// 4. Obtener resultado comunal
app.get('/api/resultado/comunal', async (req, res) => {
    try {
        const datosEstufas = await leerCSV(ESTUFAS_CSV, ESTUFAS_HEADERS);
        const calidadAire = await leerCSV(CALIDAD_AIRE_CSV, []);
        const fechaCalculo = obtenerFechaLocalISO();
        const añoActual = new Date().getFullYear();
        
        const datosAñoActual = datosEstufas.filter(d => obtenerAnioRegistro(d) == añoActual);
        const totalHogaresRegistrados = datosAñoActual.length;
        const chimeneasActivas = calcularChimeneasActivas(datosAñoActual);
        
        // Calcular frecuencias
        const frecuencias = {
            "todos los dias": datosAñoActual.filter(d => {
                const frecuencia = normalizarFrecuencia(obtenerFrecuenciaVisible(obtenerFrecuenciaEfectiva(d)));
                return frecuencia === "todos los dias" || frecuencia === "si";
            }).length,
            "a veces": datosAñoActual.filter(d => normalizarFrecuencia(obtenerFrecuenciaVisible(obtenerFrecuenciaEfectiva(d))) === "a veces").length,
            "no": datosAñoActual.filter(d => normalizarFrecuencia(obtenerFrecuenciaEfectiva(d)) === "no").length
        };
        
        // Calcular contaminación total estimada
        let contaminacionTotal = 0;
        let materialParticuladoTotal = 0;
        for (const dato of datosAñoActual) {
            const frecuenciaEfectiva = obtenerFrecuenciaEfectiva(dato);
            const cont = calcularContaminacionPersonal(frecuenciaEfectiva, obtenerPorcentajeUso(dato, frecuenciaEfectiva));
            contaminacionTotal += cont.kgCO2;
            materialParticuladoTotal += cont.materialParticuladoGramos;
        }

        const hogaresReferenciaComunal = HOGARES_PARTICULARES_PUERTO_MONTT;
        const materialParticuladoMaximoComunal = hogaresReferenciaComunal * MATERIAL_PARTICULADO_MAXIMO_MENSUAL_GR;
        const materialParticuladoActualPorcentaje = materialParticuladoMaximoComunal > 0
            ? redondear((materialParticuladoTotal / materialParticuladoMaximoComunal) * 100, 3)
            : 0;
        const porcentajeRegistrosSobreComuna = hogaresReferenciaComunal > 0
            ? redondear((totalHogaresRegistrados / hogaresReferenciaComunal) * 100, 3)
            : 0;
        
        res.json({
            success: true,
            data: {
                total_viviendas: totalHogaresRegistrados,
                total_hogares_registrados: totalHogaresRegistrados,
                hogares_referencia_comunal: hogaresReferenciaComunal,
                porcentaje_registros_sobre_comuna: porcentajeRegistrosSobreComuna,
                chimeneas_activas_estimadas: chimeneasActivas,
                frecuencias,
                contaminacion_total_estimada: contaminacionTotal,
                material_particulado_total_estimado: redondear(materialParticuladoTotal, 1),
                material_particulado_actual_porcentaje: materialParticuladoActualPorcentaje,
                contaminacion_actual_porcentaje: materialParticuladoActualPorcentaje,
                contaminante_actual: 'MP2.5',
                fecha_calculo: fechaCalculo,
                calidad_aire_reciente: calidadAire.slice(-7),
                año: añoActual
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al calcular datos comunales' });
    }
});

function obtenerAnioRegistro(registro) {
    return registro?.[ESTUFAS_HEADERS[10]] || registro?.año || registro?.['aÃ±o'] || registro?.anio || registro?.ano || '';
}

function calcularChimeneasActivas(datosAñoActual) {
    let totalFactor = 0;
    for (const dato of datosAñoActual) {
        const frecuenciaEfectiva = obtenerFrecuenciaEfectiva(dato);
        totalFactor += obtenerPorcentajeUso(dato, frecuenciaEfectiva) / 100;
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
        const datosEstufas = await leerCSV(ESTUFAS_CSV, ESTUFAS_HEADERS);
        const usuarios = await leerCSV(USUARIOS_CSV, USUARIOS_HEADERS);
        const anioActual = new Date().getFullYear();
        
        const registroActual = obtenerRegistroUsuarioAnio(datosEstufas, usuarioId, usuarios, anioActual);
        
        res.json({
            yaRegistro: !!registroActual,
            año: anioActual,
            datos: registroActual || null
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al verificar' });
    }
});

// INICIAR SERVIDOR 

app.get('/api/debug/estufas', async (req, res) => {
    try {
        const datos = await leerCSV(ESTUFAS_CSV, ESTUFAS_HEADERS);
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
                const usa_estufa = rest[0] || '';
                const frecuencia = esFrecuenciaAFrio(normalizarFrecuencia(rest[1])) ? 'a veces' : (rest[1] || '');
                const tienePorcentaje = /^\d{1,3}$/.test(rest[2] || '') && /^\d{4}-\d{2}-\d{2}$/.test(rest[4] || '');
                const porcentaje_uso = tienePorcentaje ? rest[2] : '';
                const comentario = tienePorcentaje ? (rest[3] || '') : (rest[2] || '');
                const fecha_registro = tienePorcentaje ? (rest[4] || '') : (rest[3] || '');
                const año = tienePorcentaje ? (rest[5] || '') : (rest[4] || '');

                repaired.push({ id, usuario_id, direccion, latitud, longitud, usa_estufa, frecuencia, porcentaje_uso, comentario, fecha_registro, año });
            } else {
            }
        }

        if (repaired.length > 0) {
            await escribirCSV(ESTUFAS_CSV, repaired, ESTUFAS_HEADERS);
        }

        res.json({ success: true, repaired: repaired.length });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
