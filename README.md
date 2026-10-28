# Forja del Invocador

Una armería para aprender los objetos de League of Legends, creada por Germán Bartoli con la colaboración de Codex.

## Primera versión

- Catálogo de objetos comprables de la Grieta del Invocador, con búsqueda simultánea en cuatro idiomas oficiales: español LAS (`es_AR`), LAN (`es_MX`), España (`es_ES`) e inglés (`en_US`).
- Filtros por estadísticas, categorías superpuestas, etapas y precio. Favoritos locales.
- Fichas con efectos, nombres regionales, costos, componentes repetidos y mejoras navegables.
- Tres minijuegos de diez rondas: reconocer el ícono, completar la receta y escribir el nombre. Aceptan los nombres oficiales de las cuatro regiones sin tildes ni puntuación.
- Progreso local, diseño adaptable y navegación por teclado.

## Desarrollo

Requiere Node.js 22 o superior. No requiere instalar dependencias de aplicación.

1. `npm run sync`: descarga una copia coherente de los cuatro catálogos del último parche disponible.
2. `npm test`: verifica datos, búsqueda, filtros y generación de rondas.
3. `npm run build`: genera `dist/`.
4. `npm run dev`: sirve `dist/` en `http://127.0.0.1:4173`.

## Estructura

- `src/core.js`: reglas puras de catálogo, búsqueda y juegos.
- `src/data.js`: carga de Riot y respaldo local.
- `src/i18n.js`: textos de interfaz y nombres regionales.
- `src/app.js`: navegación, catálogo, fichas, favoritos y juegos.
- `src/styles.css`, `src/theme.css`: diseño adaptable y paleta.
- `public/data/items.json`: respaldo oficial versionado.
- `scripts/`: sincronización, build y servidor local.
- `test/`: pruebas con el ejecutor nativo de Node.js.

## Actualización y alcance

Al abrir la app se consulta `versions.json` de Riot y se descarga el mismo parche para los cuatro idiomas. Si falla cualquier idioma, se usa la copia incluida y se avisa en la interfaz. La app no promete coincidir con un parche del cliente antes de que Riot lo publique en Data Dragon. Los íconos se sirven desde el CDN de Riot; no es una app sin conexión.

Los nombres son oficiales, no traducciones inventadas. LAS y LAN pueden tener nombres idénticos. No se incorpora todavía un diccionario de apodos comunitarios. Las etiquetas de tanque, AD, AP y demás describen estadísticas, no recomendaciones de builds. Se excluyen objetos exclusivos de campeones, otros mapas y objetos no comprables.

El catálogo filtra por mapa 11, disponibilidad de compra e IDs estándar inferiores a 10000; si hay variantes con el mismo nombre inglés, conserva la de menor ID. Este criterio evita duplicados de modos especiales en Data Dragon, pero la disponibilidad final sigue dependiendo de las reglas de Riot para cada cola. No es una reproducción exacta de la tienda dentro de una partida.

El progreso y los favoritos se guardan en el navegador, sin cuentas ni sincronización entre dispositivos. Las descripciones remotas se convierten en texto seguro, conservando saltos de línea. Las fichas siguen el contenido que publique Riot, incluyendo sus posibles limitaciones.

## Publicación

Sitio estático en Cloudflare Pages. Comando de build: `npm run build`. Directorio de salida: `dist`. Rama de producción: `main`.

La publicación inicial utiliza carga directa desde el panel de Cloudflare. Los siguientes pushes a GitHub no publican automáticamente. Para actualizar, ejecutar las pruebas y el build y subir el contenido de `dist/` al mismo proyecto, o usar `wrangler pages deploy dist --project-name forja-del-invocador --branch main` con una sesión autorizada. El repositorio de GitHub se mantiene privado; la página publicada es pública.

## Próximas extensiones

- Apodos comunitarios revisados y relacionados con el ID oficial.
- Desafío diario, repetición espaciada y modos adicionales.
- Nuevos mapas con catálogos y reglas independientes.

## Créditos

Datos e íconos: [Riot Data Dragon](https://developer.riotgames.com/docs/lol#data-dragon). Forja del Invocador no está respaldado por Riot Games. League of Legends y sus recursos pertenecen a Riot Games.
