# PRUFODIS - Gestión de Alumnos

Frontend React/Vite para administrar alumnos, asignaturas, asistencia, evaluaciones y competencias. La autenticación y los datos usan la API REST de Django desplegada en Render; Firebase ya no forma parte de este proyecto.

## Desarrollo local

1. Copia `.env.example` como `.env.local`. `VITE_API_BASE_URL=/api` mantiene las peticiones bajo el mismo origen.
2. Instala dependencias y ejecuta:

   ```sh
   npm install
   npm run dev
   ```

Vite reenvía `/api/*` al servicio de Render configurado en `API_PROXY_TARGET`; si no se define, usa `https://prufodis-ucen-apirest.onrender.com`. Para apuntar a otro backend local, define `API_PROXY_TARGET` en `.env.local`.

## Despliegue en Vercel

- Usa `npm run build` como comando de compilación y `dist` como directorio de salida.
- Importa `.env.example` o configura `VITE_API_BASE_URL=/api` en las variables de entorno de Vercel.
- `vercel.json` reenvía `/api/*` al servicio de Render y enruta las demás rutas de React. Si cambia la URL del backend, actualiza el destino en `vercel.json`.
- En Render configura `DJANGO_CSRF_TRUSTED_ORIGINS` con los orígenes HTTPS de producción de Vercel, separados por comas, por ejemplo `https://tu-app.vercel.app,https://tu-dominio.cl`. Después de cambiarlo, vuelve a desplegar el backend.

El proxy hace que las peticiones del navegador sean del mismo origen que el frontend; no requiere publicar secretos en Vite ni habilitar CORS para este flujo. Los archivos `.env` y `.env.local` están ignorados por Git. No incluyas contraseñas ni secretos del servidor en variables `VITE_*`.

## Cuentas y permisos

El backend usa sesiones Django y protección CSRF. Las cuentas nuevas creadas desde la pantalla de registro reciben el rol `consulta` (solo lectura). Un administrador puede cambiar el rol desde Django Admin. Los roles del backend son:

- `administrador`: administra alumnos y asignaturas.
- `profesor`: actualiza alumnos asignados, registra asistencia y evaluaciones.
- `psicologo`: administra competencias.
- `consulta`: consulta los datos sin modificarlos.

La edición de correo, nombre y contraseña se realiza en el perfil; los cambios de correo o contraseña requieren la contraseña actual.

## Backend y datos existentes

Antes de desplegar esta versión, publica los cambios del repositorio backend `MatiasValencia/prufodis-ucen-apirest` en Render y ejecuta las migraciones Django, incluidas las nuevas migraciones para el rol `consulta` y el número de cada evaluación. Render debe responder en `https://prufodis-ucen-apirest.onrender.com`.

Esta versión lee y escribe en el backend; no importa los datos que estuvieran en Firebase ni el `localStorage` de versiones anteriores. Si necesitas conservar esos registros, expórtalos y migralos al backend por separado antes de retirar Firebase.
