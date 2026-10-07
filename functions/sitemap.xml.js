import { sitemap } from '../src/paginas.js';
export const onRequestGet = ctx => sitemap(ctx.request, ctx.env);
