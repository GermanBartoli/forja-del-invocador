import { contexto, respuesta, errorRespuesta, privadaJugador } from '../../servidor/riot.js';
export async function onRequestGet(evento) {
  try {
    if (new URL(evento.request.url).searchParams.get('accion') === 'disponibilidad') {
      return respuesta(evento.request, {
        disponible: Boolean(
          evento.env.RIOT_PRODUCTION_API_KEY || (evento.desarrolloLocal && evento.env.RIOT_API_KEY),
        ),
      });
    }
    const ctx = contexto(evento);
    const accion = ctx.parametros.get('accion') || 'perfil';
    if (
      !['perfil', 'region', 'historial', 'cronologia', 'desafios', 'maestria', 'en-vivo'].includes(
        accion,
      )
    )
      return respuesta(evento.request, { error: 'Consulta desconocida.' }, 400);
    return respuesta(evento.request, await privadaJugador(ctx, accion));
  } catch (error) {
    return errorRespuesta(evento.request, error);
  }
}
