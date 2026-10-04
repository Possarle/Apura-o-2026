# Apuração 2026 – mapa ao vivo

## Como usar
1. Abra `index.html` no navegador (duplo clique). Precisa de internet.
2. Se aparecer o aviso de bloqueio (CORS), abra um terminal nesta pasta e rode `node server.js`; depois acesse http://localhost:8080. O servidor faz a ponte com o TSE.

## Fontes de dados (menu no topo)
- **Ao vivo (TSE)**: arquivos oficiais em resultados.tse.jus.br. Atualiza a cada 30 s.
- **Simulado do TSE**: ambiente de teste do próprio TSE (nomes fictícios), bom para checar a conexão.
- **Demonstração**: dados inventados, só para ver o visual funcionando.

## Ajustes (no topo do script, em `CONFIG`)
- `intervaloSegundos`: tempo entre atualizações.
- `partidosVermelho` / `partidosAzul`: cores usadas em governador, senador e deputados (por número do partido).

## Hospedar
É um único arquivo estático: pode subir no GitHub Pages, Netlify ou Vercel. Em hospedagem, se o TSE bloquear CORS, use o `server.js` (ou uma função serverless equivalente).

Mapa: @svg-maps/brazil (CC BY 4.0). Projeto independente, sem vínculo com a Justiça Eleitoral.
