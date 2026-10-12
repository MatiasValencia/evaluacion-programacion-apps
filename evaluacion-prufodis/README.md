# Evaluación Prufodis

Aplicación React para administrar alumnos, asignaturas, asistencias y evaluaciones. Los datos se sincronizan en tiempo real con Cloud Firestore para que los administradores autorizados accedan desde distintos dispositivos.

## Configurar Firebase

1. En Firebase Console, registra la aplicación web y habilita el proveedor **Correo electrónico/contraseña** en Authentication.
2. Crea la base de datos **Cloud Firestore** en modo de producción.
3. Crea `.env.local` en la raíz a partir de `.env.example` y completa la configuración web de Firebase y los UID de las cuentas administradoras:

   ```env
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=tu-proyecto
   VITE_FIREBASE_APP_ID=...
   VITE_FIREBASE_ADMIN_UIDS=uid-admin-1,uid-admin-2
   ```

4. Copia `firestore.rules` en **Firestore Database → Reglas**. Antes de publicar, reemplaza `REPLACE_WITH_ADMIN_UID` por los UID exactos de las cuentas autorizadas. Si hay más de un administrador, agrega sus UID entre comillas y separados por comas dentro de la lista. Publica las reglas y verifica que la lista coincida con `VITE_FIREBASE_ADMIN_UIDS`.
5. En **Authentication → Configuración → Dominios autorizados**, autoriza `localhost` para desarrollo y el dominio de producción.
6. Instala dependencias y ejecuta el proyecto:

   ```sh
   npm install
   npm run dev
   ```

La aplicación crea y utiliza estas colecciones: `students`, `assignments`, `attendanceRecords` y `evaluationGrades`. La colección `metadata` registra la migración inicial.

## Datos existentes en localStorage

Al iniciar sesión por primera vez, si las cuatro colecciones de Firestore están vacías y no existe el marcador `metadata/localStorageMigration`, la aplicación importa los datos de localStorage de ese navegador. Si ya hay documentos en Firestore, estos se consideran la fuente de verdad y no se importan datos locales automáticamente. El marcador evita repetir la importación.

Por ello, antes de iniciar sesión en el dispositivo que contiene los datos actuales, confirma que las reglas estén publicadas y que Firestore esté vacío. Los datos locales de otros navegadores no se combinan automáticamente; si contienen información distinta, consérvalos y coordina su importación antes de completar la migración inicial.

## Seguridad

Los UID de `VITE_FIREBASE_ADMIN_UIDS` limitan la interfaz, pero no son un control de seguridad para la base. Firestore aplica la autorización en el servidor mediante `firestore.rules`, que solo permite leer y escribir a los UID enumerados. No publiques reglas que permitan acceso general a usuarios autenticados o acceso público. Los archivos `.env.local` no deben subirse al repositorio.
