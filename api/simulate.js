import {createHash} from 'node:crypto';
import {simulate} from '../engine/simulator.js';
import {findMember, hasCrewAccess} from '../shared/crew.js';

// Función sin disco ni estado compartido. Devuelve el resultado a la pestaña que lo solicitó.
export default {
  async fetch(request) {
    const headers = {'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'};
    const error = (status, message) => Response.json({error: message}, {status, headers});
    if (request.method !== 'POST') return error(405, 'Método no permitido.');
    if (request.headers.get('origin') && request.headers.get('origin') !== new URL(request.url).origin) return error(403, 'Origen no autorizado.');
    // Identificación de muestra, no autenticación: solo se generan datos ficticios.
    if (!hasCrewAccess(findMember(request.headers.get('x-simisa-member')))) return error(403, 'Solo comandante y médica pueden ejecutar simulaciones.');
    if (!request.headers.get('content-type')?.startsWith('application/json')) return error(415, 'Se requiere JSON.');
    let result;
    try {
      const body = await request.text();
      if (body.length > 16384) return error(413, 'Configuración demasiado grande.');
      result = simulate(JSON.parse(body));
    } catch (e) { return error(400, e.message); }
    const checksum = createHash('sha256').update(JSON.stringify(result)).digest('hex');
    const bytes = new TextEncoder().encode(JSON.stringify({fileVersion: 1, createdAt: new Date().toISOString(), checksum, result}));
    let offset = 0;
    // Los historiales superan 4,5 MB: se transmiten por partes, sin truncar las lecturas.
    const stream = new ReadableStream({pull(controller) {
      if (offset >= bytes.length) return controller.close();
      controller.enqueue(bytes.subarray(offset, offset + 65536)); offset += 65536;
    }});
    return new Response(stream, {headers: {...headers, 'Content-Type': 'application/json; charset=utf-8'}});
  },
};
