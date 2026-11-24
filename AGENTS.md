# Guía de forja-del-invocador

Antes de cambiar las integraciones de Riot, leer [las políticas del proyecto](docs/POLITICAS_RIOT.md).

Las recetas y datos de objetos se usan desde `src/data.js` y `src/core.js`. Revisá `src/i18n.js` cuando cambien nombres regionales. `pnpm run sync` actualiza datos del juego y debe usarse cuando la tarea pida renovar el catálogo.

Corré `pnpm test` y `pnpm run build`. Si cambian objetos o recetas, comprobá una combinación y sus nombres regionales en la interfaz con `pnpm run dev`.

Consultá los pasos de publicación en [el flujo de GitHub Actions](.github/workflows/publicar.yml). Para verificar los dos sitios publicados, seguí [la guía de publicación](docs/PUBLICACION.md).
