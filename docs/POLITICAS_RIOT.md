# Políticas de Riot Games para Forja del Invocador

## Registro y claves

Forja del Invocador es un proyecto independiente y gratuito para la comunidad de League of Legends. Cada sitio registra y verifica su propio dominio y utiliza exclusivamente la clave de producción aprobada para ese producto. La verificación de dominio y la aprobación de producción son pasos distintos.

Las claves de desarrollo e interinas sirven únicamente para prototipos privados. El servidor local escucha en loopback y recibe `RIOT_API_KEY` desde el entorno. En Cloudflare Pages se configura `RIOT_PRODUCTION_API_KEY` como secreto exclusivo de este proyecto una vez aprobado. Ninguna clave se incorpora al navegador, las URLs, Git o los registros. El archivo público `riot.txt` verifica el dominio.

## Uso de datos, identidad y juego limpio

- Cumplir la ley, los términos de las herramientas de terceros y las políticas vigentes. Mantener actualizada la descripción del producto en el portal.
- Consultar únicamente endpoints documentados y herramientas autorizadas. Para datos estáticos y arte compatible usar Data Dragon. Revisar con Riot cualquier excepción antes de incorporar otra fuente. Respetar cuotas y tiempos de espera.
- Mantener una identidad visual independiente. El arte de juego permitido puede ilustrar la experiencia. Los logos oficiales, la imitación de las interfaces nativas y las afirmaciones de asociación o aval quedan excluidos.
- Ofrecer todas las funciones de este proyecto gratuitamente, sin acceso exclusivo de pago. Proteger la experiencia de los jugadores y sus decisiones.
- Presentar resultados, maestrías, logros y clasificatorias oficiales de forma neutral. Excluir evaluaciones públicas de terceros, reportes alternativos, etiquetas humillantes y cálculos de MMR o Elo alternativos.
- Respetar las identidades ocultas y la información privada. Excluir historiales de partidas personalizadas del buscador público. No proporcionar ventajas competitivas, seguimiento de enfriamientos enemigos, datos ocultos, instrucciones obligatorias en vivo ni porcentajes de victoria de aumentos u objetos de Arena.
- Evitar integraciones no autorizadas con el chat, el cliente o servicios internos de League. Una integración que requiera Riot Sign On o acceso especial debe contar con su autorización específica.

## Torneos

El sitio consulta información pública de Clash cuando corresponde. La organización de torneos propios requiere gestionar el permiso de torneos y cumplir las reglas de la región. La API de torneos se reserva para eventos reales de al menos 20 participantes activos y con progresión por enfrentamientos directos, como eliminación o todos contra todos. El organizador debe garantizar emparejamientos equilibrados, condiciones de victoria transparentes y acceso gratuito a las funciones para todos los participantes.

No usar códigos de torneo para crear salas individuales de conveniencia. Excluir apuestas, juegos de azar, monedas con valor monetario y pagos ajenos a una inscripción nominal permitida. Cuando corresponda una inscripción, expresarla en moneda fiduciaria, distribuir los premios según la clasificación y cumplir las reglas vigentes de premios y de la región.

## Fuentes oficiales

- [Términos de las herramientas de Riot](https://developer.riotgames.com/terms)
- [Políticas generales](https://developer.riotgames.com/policies/general)
- [Políticas y documentación de League of Legends](https://developer.riotgames.com/docs/lol)
- [Reglas legales sobre propiedad intelectual](https://www.riotgames.com/en/legal)
- [Claves y registro de productos](https://developer.riotgames.com/docs/portal)

Este documento registra los criterios del proyecto. La aceptación del titular y el estado de la solicitud corresponden al Developer Portal. Ante una duda de alcance, consultar a Riot desde la solicitud antes de publicar la función.
