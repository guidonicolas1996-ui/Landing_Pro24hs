# Landing Casino

Landing page estática de casino con temas dinámicos, animaciones y configuración remota vía Firebase Firestore.

## Estructura

- `index.html` — Página principal de la landing.
- `settings.html` — Página de configuración de casino.
- `css/style.css` — Estilos globales, temas y animaciones.
- `js/main.js` — Lógica de temas, Firebase y comportamiento de UI.
- `js/firebase.js` — Inicialización de Firebase y Firestore.
- `img/` — Imágenes usadas en la landing.
- `vercel.json` — Configuración de despliegue para Vercel.

## Características

- Temas dinámicos para `ganamos`, `zeus` y `apostamos`.
- Mascota y logos que cambian según el tema activo.
- Botón premium de WhatsApp con animación.
- Fondo animado con blobs y overlay semitransparente.
- Configuración remota guardada en Firebase Firestore.
- Página de settings donde se activan/desactivan las marcas.

## Requisitos

- Navegador moderno con soporte para módulos ES.
- Hosting estático o servidor local.
- Proyecto Firebase con Firestore habilitado.

## Configuración de Firebase

Actualiza `js/firebase.js` con tu propia configuración de Firebase:

```js
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### Reglas mínimas de Firestore

Para desarrollo rápido, usa reglas provisionales mientras pruebas:

```js
service cloud.firestore {
  match /databases/{database}/documents {
    match /config/landing {
      allow read, write: if true;
    }
  }
}
```

> En producción deberías reemplazar esto con reglas seguras y autenticación.

## Documentos de Firestore

Colección: `config`
Documento: `landing`

Campos booleanos:

- `showGanamos`
- `showZeus`
- `showApostamos`

Ejemplo de documento:

```json
{
  "showGanamos": true,
  "showZeus": false,
  "showApostamos": true
}
```

## Uso local

Puedes servir el proyecto con cualquier servidor estático.

Ejemplo con Python:

```bash
cd c:\Users\Operador\Documents\Programación\landing
python -m http.server 8000
```

Luego abre `http://127.0.0.1:8000`.

## Despliegue

El proyecto está listo para despliegue estático. En Vercel se usa `cleanUrls: true` en `vercel.json`.

## Consideraciones

- `js/main.js` gestiona la carga inicial desde Firestore y la sincronización en vivo.
- `settings.html` muestra los checkboxes de configuración y escribe los cambios en Firebase.
- El sitio usa `type="module"` para cargar `main.js` y aprovechar importaciones de Firebase.

## Notas

- Si aparece un error de permisos en Firestore, ajusta las reglas en la consola de Firebase.
- Si querés cambiar la configuración de tema, edita `themeConfig` en `js/main.js`.
