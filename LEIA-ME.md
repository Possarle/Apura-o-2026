# Apuração 2026 — versão 3.1 · segundo turno

## Correção do layout e segundo turno

O `index.html` agora incorpora o CSS, as regras de apuração e os dados iniciais. Assim, o visual e a consulta salva funcionam mesmo se o HTML for aberto isoladamente. O servidor continua necessário para a coleta contínua, atualização de notícias e consultas online sem bloqueio do navegador.

A página inicia em **Governador → 2º turno**. Os estados com disputa confirmada pelo TSE aparecem em verde antes da apuração; os demais ficam em cinza. Verde indica participação, não liderança. Quando chegarem os votos do segundo turno, entram as cores dos candidatos. Na eleição presidencial, todas as UFs participam.

A consulta de 07/10/2026 confirmou AC, AM, DF, ES, RJ, RN e TO com segundo turno para governador. A lista é derivada da situação dos candidatos nos arquivos do TSE e é reconsultada enquanto o site está aberto. Não há uma lista fixa no código da interface. Eventuais retotalizações podem mudar a classificação.

Candidatos com situação “2º turno” não aparecem mais como “eleitos”. Senador e deputados ficam na consulta de **1º turno**. Na busca do segundo turno, os votos usados como referência histórica estão identificados como votos do primeiro turno.

**Como atualizar:** extraia o novo ZIP em uma pasta nova. Abra o `index.html` para conferir o visual ou execute `INICIAR.bat` / `node server.js` para usar as consultas online. Em uma hospedagem, substitua os arquivos do projeto e reinicie o serviço, preservando o disco de dados. O HTML entregue já está preparado; não exige etapa de build.

## Nova interface

Visual escuro com navegação por Resultados, Cidades, Candidatos, Notícias e Fontes. O painel dá destaque aos votos, à cobertura e ao horário dos dados. A navegação se adapta ao celular, com menu inferior, tabelas deslizáveis e controles acessíveis pelo teclado.

A busca aceita nome, nome completo, número e partido, tem filtros por cargo e UF, carregamento de mais resultados e perfil detalhado. O botão **Copiar consulta** preserva os filtros no endereço. O Radar eleitoral inclui notícias salvas e mantém a última consulta se as fontes falharem.

**Para publicar na internet:** siga o passo a passo de `COMO-HOSPEDAR.md`. Inclui os campos do Render, GitHub, disco persistente e verificação da publicação.

## Dados dos cinco cargos incluídos

O pacote contém **136 resultados oficiais do TSE do primeiro turno**: presidente no Brasil e em 27 UFs, mais governador, senador, deputado federal e deputado estadual nas 27 UFs (deputado distrital no DF). Os 139 arquivos de resultados e configurações foram reconsultados em 07/10/2026; cada resultado preserva a data e o horário de geração do TSE. A coleta completa está registrada em `data/coleta-ufs.json`.

- `snapshot-data.js`: dados iniciais para carregar imediatamente, inclusive ao abrir o HTML sem servidor. O conteúdo também está incorporado em `index.html`; mantenha este arquivo para regenerar o pacote.
- `data/tse/`: arquivos oficiais originais e configurações de municípios. O servidor utiliza essas cópias se a consulta ao TSE falhar.
- `data/history-1.json`: registros nacionais coletados para a linha do tempo. Não é um histórico completo desde 17h.
- `data/snapshots/`: snapshots nacionais usados no histórico.

Os **resultados municipais individuais ainda exigem consulta online**. A configuração com nomes/códigos dos municípios está incluída, mas este ZIP não contém os resultados de todos os municípios do país.

Quando usa uma cópia salva, a interface mostra um aviso com os horários dos dados e não a apresenta como atualização ao vivo. Consultas online que falham não apagam os resultados salvos de outras UFs. Os gráficos usam os mesmos dados das listas de candidatos.

No primeiro turno, ao abrir um cargo estadual sem uma UF selecionada, o site usa a UF de “Por cidade” (SP por padrão). No segundo turno, Governador abre com o resumo das disputas confirmadas. O seletor “Resultados e gráficos de” permite trocar de UF ou abrir o resumo nacional.

### Executar

Extraia **todo o ZIP** em uma pasta nova. Com Node.js 24 instalado, execute `node server.js` e abra http://localhost:8080. No Windows, também pode dar dois cliques em `INICIAR.bat`, aguardar a mensagem e abrir o endereço mostrado. Abrir só o HTML exibe as cópias salvas, mas a consulta ao vivo pode sofrer bloqueio de CORS; notícias atualizadas e coleta contínua precisam do servidor.

Preserve a pasta `data` de qualquer instalação anterior que tenha histórico próprio. Para evitar sobrescrevê-la, extraia esta versão em outra pasta e importe os snapshots antigos com `importar-historico.js`.

## Correção e novo gráfico temporal

- Gráfico escuro ampliado, com layout adaptado ao celular e horários legíveis.
- Começa pelo período realmente coletado, evitando comprimir os registros no canto da tela. A opção “Desde 17h” mostra também o trecho anterior sem dados.
- Por padrão, compara os dois candidatos mais votados; a legenda permite adicionar ou ocultar outros candidatos. Pelo menos uma série permanece ativa.
- Filtros de 30 minutos, uma hora e período completo; votos ou percentuais; escala ajustada ou desde zero.
- Cursor, barra acessível pelo teclado e botões anterior/próximo para examinar uma atualização. “Último registro” retoma o acompanhamento das atualizações.
- Intervalos maiores que cinco minutos aparecem sem ligação e com indicação de ausência de registros. Um único registro aparece como ponto, com aviso de que ainda não há uma curva.
- Histórico do servidor salvo também no navegador; funciona após recarregar sem conexão, quando já existirem registros salvos.
- Registros duplicados no mesmo horário são substituídos pela versão mais recente. Registros inválidos são descartados, sem quebrar o gráfico. Horários de coleta e horários oficiais são identificados; registros antigos sem identificação mostram “horário do registro”.
- Demonstração não reutiliza históricos de sessões antigas. Fontes e turnos permanecem separados.

**Atualização:** substitua os arquivos do projeto, incluindo o novo `history-core.js`, e reinicie `node server.js`. Preserve a pasta `data` da instalação existente. Recarregue a página com Ctrl+F5.


## Abrir o site

Instale Node.js 24, extraia este ZIP e execute nesta pasta:

```sh
node server.js
```

Abra http://localhost:8080. Não precisa instalar dependências para usar o site.

## Recursos

- **Por cidade:** presidente, governador, senador, deputado federal e deputado estadual. No Distrito Federal, a consulta usa deputado distrital. A tabela tem busca de cidades, ordenação, votos, apuração, detalhes de todos os candidatos e exportação CSV. Cargos sem segundo turno ficam desabilitados nesse turno.
- **Cores:** cada partido tem uma cor consistente em mapas, gráficos e candidatos. Lula recebe vermelho e Flávio Bolsonaro recebe azul. As demais cores são uma paleta visual do projeto inspirada nos partidos, não uma classificação por blocos políticos; partidos não cadastrados aparecem em cinza.
- **Busca:** nome, nome completo, número ou partido, com filtros de cargo e UF. “Atualizar todos os cargos” consulta as candidaturas do turno; a lista inicial usa o que já foi carregado. Não há mais o corte de 250 candidaturas nos dados.
- **Perfil:** votos, percentual, posição, situação informada pelo TSE, apuração, votação presidencial por região e comparação dos municípios de uma UF, com maiores volumes e percentuais locais. O ranking municipal exibe os primeiros 30. O percentual de regiões é ponderado pelos votos, não pela média dos percentuais das UFs.
- **Evolução nacional:** eixo de horários de Brasília, com opção de mostrar o período desde a abertura da apuração; séries selecionáveis de candidatos e registros consultáveis com horário, votos e percentual. O coletor do servidor grava a cada minuto sem depender de visitantes. Histórico persistente separado por turno. Demonstração e simulado não são gravados no histórico oficial do servidor.
- **Notícias:** títulos e links dos feeds públicos de política do g1 e da Agência Brasil, filtrados por termos eleitorais, com fonte e data. Atualização automática a cada hora, cache compartilhado e indicação de falha das fontes. O botão consulta esse cache; não força chamadas ilimitadas às fontes. Não republica artigos completos.

## Limite do histórico anterior à instalação

O ZIP original só guardava percentuais no navegador, sem horários. Não é possível reconstruir fielmente a linha desde 17h com esses dados. O filtro “Desde 17h” mostra o período inteiro, mas a curva começa no primeiro registro real disponível. O pacote contém quatro registros nacionais reais, incluindo a totalização disponível em 05/10/2026 às 12:51:47. Não foram inventados pontos anteriores nem atribuídos horários aos registros antigos.

Para preencher o período anterior, obtenha snapshots reais do TSE e importe-os antes de iniciar o servidor:

```sh
node importar-historico.js 1 ./snapshots
```

A pasta deve conter arquivos JSON originais de resultados nacionais de presidente, com `dg`, `hg`, `t`, `ele` e `carg`. O importador valida o turno, ordena e deduplica pelos horários. Sem esses arquivos, a coleta preserva apenas o período em que o servidor esteve ativo. Falhas de rede podem deixar intervalos sem pontos; as linhas ligam registros, não representam medições contínuas.

## Hospedagem

Para notícias atualizadas e coleta persistente, hospede **o servidor Node**, não só o HTML. GitHub Pages serve apenas arquivos estáticos: ali o histórico compartilhado e a atualização de notícias não funcionarão. `PORT` define a porta. `DATA_DIR` define o diretório persistente (padrão: `./data`). Um volume novo recebe automaticamente os dados incluídos; arquivos já existentes são preservados. Mantenha esse volume entre reinicializações e faça backup. Rode uma instância coletora por diretório de dados. O roteiro completo está em `COMO-HOSPEDAR.md`.

O servidor limita novas consultas proxied ao TSE a 20 por segundo e reutiliza respostas por 30 segundos. Cidades são consultadas novamente mesmo após 100%, pois podem ocorrer retotalizações. O modo demonstração contém candidatos e municípios fictícios e fica identificado na tela. Não substitui resultados oficiais quando a fonte falha.

## Interpretação dos números

Os totais calculados no projeto somam votos nominais dos candidatos recebidos, sem votos de legenda. A posição individual de deputado não determina sua eleição; a situação de eleito vem do TSE. No Senado, totais de votos não devem ser confundidos com quantidade de eleitores. Resultados são parciais enquanto houver apuração. Regiões da busca presidencial consideram as UFs carregadas; votos do exterior não são atribuídos a uma região brasileira. O perfil informa cobertura parcial e consultas indisponíveis.

## Atualizar os arquivos de origem

O CSS pode ser editado em `professional.css`, e as regras de classificação em `election-core.js`. Depois dessas alterações, incorpore os recursos ao HTML novamente:

```sh
npm run build
```

O comando usa os arquivos oficiais existentes em `data/tse` e não faz uma nova coleta de toda a base. Para gerar um pacote novo, atualize os arquivos e o manifesto primeiro. `preparar-site.js` pode ser executado sozinho após mudanças apenas no CSS ou nas regras, sem regenerar a base.

## Testes

```sh
npm install
npm test
```

Testes de histórico, parsing e segurança dos links RSS, rotas HTTP, inicialização do disco e interações DOM: busca, perfil, municípios nos cinco cargos, DF, segundo turno e gráfico temporal. Há testes específicos de datas, correções no mesmo horário, dados inválidos e seleção de registros. O teste municipal usa dados de demonstração e limita a três municípios por UF para execução rápida. Use Node.js 24.

## Fontes técnicas

- TSE: https://www.tse.jus.br/eleicoes/informacoes-tecnicas-sobre-a-divulgacao-de-resultados
- Documentação: https://www.tse.jus.br/eleicoes/eleicoes-2026-content/arquivos/divulgacao-de-resultados
- g1 Política RSS: https://g1.globo.com/rss/g1/politica/
- Agência Brasil RSS: https://agenciabrasil.ebc.com.br/rss/politica/feed.xml

Projeto independente, sem vínculo com a Justiça Eleitoral. Os números oficiais são os do TSE. Mapa: @svg-maps/brazil (CC BY 4.0).
