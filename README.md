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

## Configurar reCAPTCHA en Render

En Render agrega estas variables de entorno con las claves del mismo registro de Google reCAPTCHA:

- `RECAPTCHA_SITE_KEY`: clave del sitio, publica.
- `RECAPTCHA_SECRET_KEY`: clave secreta.

No pegues la clave secreta en el código ni en archivos del proyecto.

En Google reCAPTCHA revisa que el dominio autorizado sea el dominio real de Render, por ejemplo `tu-servicio.onrender.com`, sin `https://` y sin rutas. Para probar localmente, agrega también `localhost`.

Si regeneras las claves en Google, actualiza ambas variables en Render y reinicia el servicio.

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

## Autores

|     Nombre      |                      Gmail                        |
|-----------------|---------------------------------------------------|
| Ivan Ruiz       | ivanalejandro.ruiz@alumnos.ulagos.cl              |
| Daniel Mansilla | danielhumbertoarmando.mansilla@alumnosulagos.cl   |
| Deyanira Ojeda  | deyanirascarleth.ojeda@alumnos.ulagos.cl          |
| Jeremias Tapia  | jeremiasariel.tapia@alumnos.ulagos.cl             |
