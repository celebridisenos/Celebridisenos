import { robots } from '../src/paginas.js';
export const onRequestGet = ctx => robots(ctx.request);
