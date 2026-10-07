// Cloudflare Pages Functions: todas las rutas /api/* van a la API segura
import { handleApi } from '../../src/api.js';
export const onRequest = ctx => handleApi(ctx.request, ctx.env, ctx);
