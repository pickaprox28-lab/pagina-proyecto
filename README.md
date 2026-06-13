# CONTAMINACIÓN POR USO DE LEÑA

Proyecto web con autenticación, dashboard y un backend en Node.js que guarda datos en archivos CSV.

## Instalar Node.js

1. Ve a [https://nodejs.org/](https://nodejs.org/)
2. Descarga la versión LTS.
3. Instálala con las opciones por defecto.
4. Verifica la instalación en el terminal:

```bash
node -v
npm -v
```

Si ambos comandos muestran una versión, Node.js quedó instalado correctamente.

## Instalar dependencias

Las dependencias están en la carpeta `servidor`.

```bash
cd servidor
npm install
```

## Levantar el servidor

Desde la carpeta del proyecto abrir una termial:

```bash
cd servidor
node server.js
```

Si todo está bien, verás un mensaje similar a este:

```text
Servidor corriendo en http://localhost:3000
Accede a: http://localhost:3000/dashboard/dashboard.html
```

## Abrir la aplicación

Una vez iniciado el servidor, abre en tu navegador:

- `http://localhost:3000/`
- `http://localhost:3000/autentication/login.html`
- `http://localhost:3000/autentication/register.html`
- `http://localhost:3000/dashboard/dashboard.html`

## Estructura del proyecto

- `autentication/` contiene login y registro de usuarios.
- `dashboard/` contiene el panel principal y las páginas de resultados.
- `css/` contiene los estilos globales y del dashboard.
- `data/` contiene los CSV con la información guardada.
- `servidor/` contiene el backend en Node.js.

## Solución de problemas

- Si aparece `Cannot find module`, ejecuta `npm install` dentro de `servidor`.
- Si el navegador no carga datos, verifica que el servidor esté corriendo en el puerto `3000`.
- Si cambiaste archivos CSV manualmente y el dashboard no muestra registros, reinicia el servidor.

## API principal

- `POST /api/login`
- `POST /api/register`
- `POST /api/estufa/guardar`
- `GET /api/resultado/personal/:usuarioId`
- `GET /api/resultado/comunal`

## Autores

|     Nombre      |                      Gmail                        |
|-----------------|---------------------------------------------------|
| Ivan Ruiz       | ivanalejandro.ruiz@alumnos.ulagos.cl              |
| Daniel Mansilla | danielhumbertoarmando.mansilla@alumnosulagos.cl   |
| Deyanira Ojeda  | deyanirascarleth.ojeda@alumnos.ulagos.cl          |
| Jeremias Tapia  | jeremiasariel.tapia@alumnos.ulagos.cl             |
