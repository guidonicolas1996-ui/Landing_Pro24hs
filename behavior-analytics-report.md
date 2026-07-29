# Informe de Implementación de Embudo de Comportamiento

## Resumen
Se implementó un sistema de analítica de comportamiento compatible con la infraestructura actual de Firebase del proyecto. La solución reutiliza el motor Firebase/Firestore existente, no duplica conexiones y mantiene intactas las métricas históricas.

Se añadió un nuevo módulo: `js/main/behavior-analytics.js`
Se integró el módulo desde: `js/main-entry.js` y `js/main/bootstrap.js`

## Modelo de datos propuesto
Cada visita genera un documento de sesión único en la misma colección `analytics`. El documento usa la nomenclatura:

- colección: `analytics`
- documento: `landing_session_<sessionId>`

Ejemplo de estructura básica:

```json
{
  "sessionId": "...",
  "visitorId": "...",
  "visitStart": "2026-07-27T...",
  "behavior": { ... },
  "performance": { ... },
  "landingReady": { ... },
  "buttonReady": { ... },
  "exit": { ... }
}
```

Esto permite consultas potentes sin crear múltiples documentos por evento y sin alterar el documento existente `analytics/landing`.

## Eventos implementados

### 1) Landing cargada completamente

Dónde: `js/main/behavior-analytics.js`
Cuándo: cuando se completa la inicialización al arrancar la página, evaluando:
- inicialización de Firebase/Firestore
- carga de configuración remota
- disponibilidad del botón de WhatsApp

Qué guarda:
- `timestamp`
- `timeSinceNavigationStartMs`
- `device`
- `browser`
- `resolution`
- `orientation`
- `connection`
- tiempos de lectura: `firebaseReadyMs`, `firestoreReadyMs`, `remoteConfigReadyMs`, `buttonReadyMs`
- errores de botón: `buttonReadyError`

Interpreta:
- si la landing está realmente lista para interacción
- si la inicialización de dependencias es lenta
- si el botón de WhatsApp tarda demasiado

### 2) Hero visible

Dónde: `js/main/behavior-analytics.js`
Cuándo: primera vez que `.hero-header` entra en pantalla vía `IntersectionObserver`
Qué guarda:
- `timeSinceLoadMs`
- `visiblePercent`

Interpreta:
- cuántos usuarios realmente ven el primer bloque principal
- si el hero es el primer contenido efectivamente visible

### 3) Botón WhatsApp visible

Dónde: `js/main/behavior-analytics.js`
Cuándo: primera vez que el botón `#whatsapp-button` entra en la vista
Qué guarda:
- `timeSinceLoadMs`
- `visiblePercent`
- `scrollY`
- `viewportHeight`

Interpreta:
- cuánta gente llegó a ver el CTA principal
- si el botón está visible rápidamente o requiere scroll

### 4) Primer scroll

Dónde: `js/main/behavior-analytics.js`
Cuándo: en el primer evento `scroll`
Qué guarda:
- `timeSinceLoadMs`
- `distance`
- `direction`

Interpreta:
- si el usuario interactúa con la página más allá del hero
- cuánto tarda en explorar el contenido

### 5) Scroll máximo alcanzado

Dónde: `js/main/behavior-analytics.js`
Cuándo: se actualiza continuamente en `scroll`
Qué guarda al abandonar la página:
- `maxScrollPercent`

Interpreta:
- hasta qué profundidad llegó el usuario
- si los usuarios que hacen scroll más profundo convergen mejor

### 6) Tiempo activo

Dónde: `js/main/behavior-analytics.js`
Cuándo: mediante `visibilitychange`, `pagehide`, `focus`, `blur`
Qué guarda:
- `activeTimeMs`
- `totalTimeMs`

Interpreta:
- cuánto tiempo el usuario estuvo realmente interactuando
- descarta tiempos inactivos o pestañas en segundo plano

### 7) Tiempo hasta el click de WhatsApp

Dónde: `js/main/behavior-analytics.js` y `js/main/whatsapp.js`
Cuándo: cuando se hace click en el botón de WhatsApp
Qué guarda:
- `timeSinceLoadMs`
- `scrollY`
- si el botón ya había sido visible
- cuánto tiempo estuvo visible antes del click
- totales de clicks/taps hasta ese momento

Interpreta:
- si el CTA se convierte sólo tras ser visible
- la relación entre visibilidad y click

### 8) Rage clicks

Dónde: `js/main/behavior-analytics.js` y `js/main/whatsapp.js`
Cuándo: cuando el usuario hace repetidos clicks sobre el botón en menos de 2s
Qué guarda:
- contador de eventos de rage click

Interpreta:
- señales de frustración o botón poco responsivo
- posibles fallos de UX en el CTA

### 9) Clicks en cualquier parte

Dónde: `js/main/behavior-analytics.js`
Cuándo: en `pointerdown`, `mousedown`, `touchstart`
Qué guarda:
- `totalClicks`
- `totalTaps`

Interpreta:
- si el usuario es activo o pasivo
- si la experiencia es demasiado estática

### 10) Abandono

Dónde: `js/main/behavior-analytics.js`
Cuándo: `pagehide` / `beforeunload` / `visibilitychange` cuando la página oculta
Qué guarda:
- `reason`
- `totalTimeMs`
- `activeTimeMs`
- `maxScrollPercent`
- `sawButton`
- `didScroll`
- `didClick`
- `openedWhatsapp`

Interpreta:
- comportamientos de salida
- abandono antes de conversión

### 11) Performance real

Dónde: `js/main/behavior-analytics.js`
Cuándo: durante la sesión con `PerformanceObserver`
Qué guarda:
- `fcp`
- `lcp`
- `cls`
- `inp` (si está disponible)
- `domContentLoaded`
- `loadEventEnd`
- `ttfb`
- `navigationTiming`

Interpreta:
- rendimiento real de usuarios reales
- correlación entre carga lenta y abandono

### 12) Estado del botón

Dónde: `js/main/behavior-analytics.js` y `js/main/whatsapp.js`
Cuándo: cuando el botón finaliza su animación / se vuelve clickeable
Qué guarda:
- `readyAtMs`
- `readyDelayMs`
- `error`
- dependencia de firebase/config

Interpreta:
- si el botón se demora en estar listo
- si fallan dependencias de Firebase/Remote Config

### 13) Compatibilidad

- Se usa el mismo `App.state.ensureFirebaseServices()` existente.
- Se usa la misma colección `analytics`.
- No se reemplaza la lógica actual de `registerAnalyticsVisit` / `registerAnalyticsWhatsappClick`.
- No se altera el documento `analytics/landing` existente.

### 14) Optimización

- Se genera un único documento de sesión por visita.
- Se actualiza con `merge: true` para evitar múltiples escrituras de documentos separados.
- Eventos únicos (hero visible, botón visible, primer scroll) se capturan solo una vez.
- La métrica de scroll máximo se mantiene en memoria y se guarda al salir.
- El tiempo activo se calcula con estados de visibilidad y foco.

## Archivos modificados

- `js/main/behavior-analytics.js`
- `js/main-entry.js`
- `js/main/bootstrap.js`
- `js/main/whatsapp.js`
- `js/main/state.js`

## Cómo interpretar los resultados

- `behavior.buttonVisible` indica cuántos usuarios encontraron el CTA principal.
- `behavior.firstScroll` y `behavior.maxScrollPercent` muestran si el contenido generó interés.
- `performance.fcp`, `performance.lcp`, `performance.ttfb` ayudan a detectar fricción de carga.
- `exit.activeTimeMs` identifica sesiones verdaderamente activas vs pestañas en segundo plano.
- `openedWhatsapp` y `whatsappClick` vinculan el funnel con el evento de conversión actual.

## Recomendaciones adicionales

- Medir `hero` junto con el `CTA` permite detectar si la página se ve pero el botón no se encuentra.
- Además de registrar visibilidad del botón, es útil medir si el botón queda fuera de pantalla por diseño responsivo.
- Para mejorar la conversión, comparar `buttonReady` con `whatsappClick` y `exit` en diferentes segmentos.
- Un posible próximo paso es registrar la sección final del `footer` o el punto donde aparece el segundo CTA.

## Nota
La implementación es compatible con el sistema existente y está pensada para análisis posterior sin duplicar la lógica de Firebase.
