'use strict';
// A página usa esta rota para saber que há um servidor fazendo as consultas ao TSE.
module.exports=(req,res)=>{res.setHeader('Content-Type','text/plain; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end('ok');};
