# Publicación automática

Cada push a `main` ejecuta las verificaciones y publica el mismo commit en [Cloudflare Pages](https://forja-del-invocador.pages.dev/) y [GitHub Pages](https://germanbartoli.github.io/forja-del-invocador/). Los pull requests solo verifican y compilan.

Los secretos de Actions `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID` autentican la publicación en el proyecto existente `forja-del-invocador`. GitHub Pages utiliza GitHub Actions como origen. No guardar tokens en el repositorio.

`scripts/preparar-github-pages.mjs` crea una copia en `dist-github/`, adapta las rutas a la subcarpeta y dirige las consultas API a Cloudflare. Las funciones y los secretos permanecen en Cloudflare. Las etiquetas sociales usan imágenes públicas con URL absoluta.

Verificar ambos trabajos de despliegue y sus URLs después del push. La miniatura puede tardar en renovarse por la caché de la aplicación donde se comparte.
