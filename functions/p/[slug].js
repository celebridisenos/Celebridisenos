// Ficha de producto generada en el servidor (/p/<slug>) para buscadores y carga rápida
import { paginaProducto } from '../../src/paginas.js';
export const onRequestGet = ctx => paginaProducto(ctx.request, ctx.env, String(ctx.params.slug || ''));
