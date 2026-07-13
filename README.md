# Casino VIP Landing

Esta aplicación funciona como una landing promocional premium para casinos, pensada para convertir visitas en contacto directo por WhatsApp. Combina una experiencia visual dinámica, gestión de branding por plataforma y persistencia remota en Firebase para mantener el contenido actualizado.

## Qué hace la app

- Muestra una landing pública con hero section, banner promocional, carousel de mascotas/logos y botón de WhatsApp.
- Permite alternar branding entre múltiples casinos activos, cambiando colores, mascota, logo y textos promocionales.
- Mantiene la configuración remota sincronizada con Firebase, con respaldo local para funcionamiento offline o en entornos simples.
- Registra visitas y clics de WhatsApp para medir rendimiento por fuente y por campaña.

## Flujo principal

1. El visitante entra a la landing pública.
2. La app selecciona el casino o conjunto de casinos activos, aplica el tema visual correspondiente y muestra el branding dinámico.
3. El botón de WhatsApp queda listo para abrir la conversación directa con el equipo comercial.
4. Desde el panel de administración se pueden modificar textos, activar plataformas y gestionar logos/mascotas.
5. Las métricas quedan registradas para revisar tráfico, interacciones y performance en el dashboard de analytics.

## Funcionalidades destacadas

- Landing responsive con diseño premium y contenido adaptable.
- Rotación automática de temas entre casinos activos.
- Carousel de mascotas y logos con transición visual controlada.
- Gestión dinámica de casinos desde una interfaz sencilla.
- Persistencia remota en Firestore y fallback local mediante localStorage.

## Stack tecnológico

- HTML5 para la landing pública.
- CSS modular para separar estilos por secciones y componentes.
- JavaScript ES modules para la lógica de la app.
- Firebase Firestore para persistir configuración, textos y analytics.
- Cloudinary para subir y servir imágenes de logos y mascotas.
- Vercel para el despliegue estático.

## Estructura del proyecto

- [index.html](index.html): landing pública principal.
- [css/styles.css](css/styles.css): entrypoint de estilos modularizados.
- [css/style.css](css/style.css): copia del stylesheet original como referencia.
- [css/styles](css/styles): carpeta con los archivos CSS separados por responsabilidad.
- [js/main.js](js/main.js): lógica central de la landing, temas, carousels, analytics, Firebase y configuración dinámica.
- [js/firebase.js](js/firebase.js): inicialización de Firebase.
- [img](img): assets estáticos como logos, mascotas y fondos.
- [vercel.json](vercel.json): configuración de despliegue en Vercel.

## Cómo funciona la configuración dinámica

La app no depende de un solo tema fijo. En su corazón, la lógica carga un conjunto de casinos desde Firestore o desde un fallback local, y luego:

- marca cuáles están activos,
- ordena su presentación,
- aplica su color principal,
- reemplaza logo y mascota en la landing,
- actualiza textos promocionales y CTA.

Todo eso se gestiona desde la sesión de administración y queda disponible para la landing en tiempo real.

## Persistencia y seguridad

La landing mantiene la configuración de branding y textos en Firebase, con respaldo local y un flujo de carga seguro para la experiencia pública.

## Analytics

La landing registra eventos de:

- visita inicial,
- visitas por fuente o link alternativo,
- clics de WhatsApp,
- métricas agregadas por horario, día o período.

Los datos se almacenan en Firestore para poder visualizar tendencias y analizar la performance de cada campaña o canal.

## Desarrollo local

No requiere build step. Lo ideal es servir la carpeta desde un servidor local para evitar problemas con módulos y fetches de Firebase.

Opciones recomendadas:

1. Usar XAMPP y abrir la carpeta en el servidor web local.
2. O ejecutar un servidor estático simple, por ejemplo:

```bash
npx serve .
```

Luego abrir la URL que entregue el servidor.

## Despliegue

El proyecto está preparado para desplegarse en Vercel. El archivo [vercel.json](vercel.json) define la configuración necesaria para servir el sitio estático correctamente.

## Configuración recomendada

Si vas a usar una instancia propia de Firebase o Cloudinary, revisa los valores de configuración en [js/firebase.js](js/firebase.js) y [js/main.js](js/main.js) y actualízalos con tus propias credenciales.

## Resumen

Esta app es una solución completa para lanzar campañas VIP de casinos con una experiencia visual atractiva, administración simple y métricas útiles, todo desde una base estática con backend remoto en Firebase.
