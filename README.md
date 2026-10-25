# Apuração 2026

Painel eleitoral com tema preto, resultados por estado e município, busca de candidatos, linha do tempo e notícias. A versão 3.7 pode ser publicada na Vercel com link público. A versão 3.4 corrigiu o 2º turno para governador (5 estados e DF, sem o RJ, retotalizado pelo TRE-RJ em 15/10), atualiza as notícias a cada 10 minutos na semana da eleição (g1, Agência Brasil e TSE), reduz a página de 6,8 MB para 4,2 MB e redesenha só o que muda. A versão 3.3 deixou o site todo em preto e troca o mapa-múndi da aba Exterior por um globo que gira e mostra os votos de cada país ao ser clicado. A versão 3.2 trouxe o mapa geral dividido em todos os municípios do Brasil e a aba Exterior, com a votação de brasileiros em 186 cidades de 133 países. A versão 3.1 abriu o segundo turno e destaca no mapa de governadores somente as UFs com disputa pendente. Os resultados do primeiro turno continuam disponíveis.

## Publicar na Vercel (grátis, com link público)

O projeto já está pronto para a Vercel (`vercel.json` e a pasta `api/`). As funções rodam em São Paulo (`gru1`), perto do TSE.

1. Entre em [vercel.com](https://vercel.com) com a sua conta do GitHub.
2. Clique em **Add New… → Project** e escolha o repositório **Apura-o-2026** (se ele não aparecer, clique em *Adjust GitHub App Permissions* e libere o repositório).
3. Não mude nada na tela de configuração e clique em **Deploy**. Em cerca de 2 minutos aparece o endereço público (algo como `apura-o-2026.vercel.app`).

Cada novo envio ao GitHub publica uma nova versão automaticamente. Na Vercel não há servidor ligado o tempo todo: os resultados são buscados no TSE quando alguém abre o site e ficam guardados por alguns segundos na rede da Vercel para todos os visitantes; os municípios são consultados estado por estado. A linha do tempo do 2º turno é montada no navegador de cada visitante enquanto a página fica aberta, porque a Vercel não guarda arquivos entre as consultas.

## Publicar no Render (servidor contínuo)

Este repositório já contém a aplicação completa e os dados do pacote. O botão abaixo abre a configuração do serviço no Render:

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https%3A%2F%2Fgithub.com%2FPossarle%2FApura-o-2026)

1. Entre no Render e autorize o acesso a este repositório, se solicitado.
2. Revise o serviço `apuracao-2026` e o custo apresentado. **Esta configuração usa uma instância paga e disco persistente de 1 GB**, necessários para manter a coleta ativa e guardar o histórico entre publicações.
3. Confirme a criação e aguarde a implantação. O painel exibirá o endereço público HTTPS para compartilhar.

O arquivo [`render.yaml`](render.yaml) configura Node.js 24, inicialização, verificação de saúde e armazenamento. O disco recebe os dados incluídos na primeira execução e preserva os arquivos existentes nas seguintes. A publicação automática está desativada: para publicar novas versões, use **Manual Deploy → Deploy latest commit** no serviço, ou habilite as publicações automáticas nas configurações do Render.

Para testar gratuitamente, siga a alternativa em [COMO-HOSPEDAR.md](COMO-HOSPEDAR.md). O plano gratuito suspende a aplicação por inatividade e não oferece disco persistente; portanto, não garante a coleta contínua nem a preservação dos novos registros.

## Recursos

- Presidente, governador, senador, deputado federal e deputado estadual/distrital, com filtros por UF e município.
- Mapa geral em três visões: **Municípios** (cada um dos 5.571 municípios na cor de quem lidera, com aproximação ao clicar em um estado), **Estados** (os dois com mapa livre: arrastar, zoom e tela cheia) e **Exterior** (globo que gira sozinho, com zoom pela roda do mouse, pinça ou botões e modo tela cheia; ao clicar em um país, ele gira até o país, para e mostra os votos de cada candidato e das cidades, mais uma tabela por país). A camada municipal vale para presidente, governador e senador; o exterior, só para presidente.
- Pesquisa de candidatos e perfis com votos e distribuição geográfica.
- Cores dos partidos, com Lula em vermelho e Bolsonaro em azul.
- Linha do tempo nacional com horários, separação por turno e histórico salvo pelo servidor.
- Notícias eleitorais com fonte e horário; atualização a cada 10 minutos na semana do 2º turno (a cada hora nos demais dias). As manchetes novas se somam às anteriores.
- Layout adaptável a computador e celular e cópia de dados para consultas quando a fonte estiver indisponível.

## Dados incluídos

A pasta `data/` contém a base incluída e deve permanecer no repositório. O build gera `snapshot-data.js` e `index.html` a partir de `index.template.html` e dos arquivos salvos; esses dois arquivos gerados não são versionados. O pacote contém 136 resultados consolidados: cinco cargos nas 27 UFs e presidente no Brasil, além das configurações, notícias e quatro registros nacionais reais para iniciar o histórico. A coleta incluída foi consultada em 07/10/2026; a interface informa os horários originais da fonte.

Os votos municipais são consultados conforme a navegação e armazenados após consultas bem-sucedidas. Para o mapa geral, o servidor reúne os arquivos municipais do TSE em segundo plano (até 12 consultas por segundo, separadas das consultas dos visitantes), guarda o resumo em `DATA_DIR/municipios/` e o entrega em `/api/municipios`. Municípios já 100% apurados não são consultados de novo. Sem o servidor, a página consulta só os municípios do estado aberto ou do exterior. O segundo turno aguarda os resultados oficiais: os dados do primeiro turno usados como referência aparecem identificados. Períodos anteriores sem registros não são reconstruídos artificialmente.

## Executar no computador

Instale [Node.js 24](https://nodejs.org/) e execute na pasta do projeto:

```sh
npm start
```

Abra [http://localhost:8080](http://localhost:8080). No Windows, também é possível usar `INICIAR.bat`. O servidor de produção não depende de pacotes externos.

Para desenvolvimento e verificação:

```sh
npm ci
npm run build
npm test
```

O build reconstrói o pacote de dados a partir dos arquivos salvos e incorpora estilos e scripts ao HTML. Ele não busca novos resultados na internet. `npm start` executa esse preparo automaticamente. Para alterar o visual ou a interface, edite `index.template.html` e os arquivos de estilos e scripts; depois execute o build.

## Configuração do servidor

| Variável | Uso |
| --- | --- |
| `PORT` | Porta HTTP; padrão `8080`. O Render fornece o valor automaticamente. |
| `DATA_DIR` | Diretório de dados graváveis; padrão `./data`. No Render, aponta para o disco persistente. |
| `DISABLE_BACKGROUND` | Valor `1` desativa a coleta automática para testes. Não usar em produção. |

Use uma única instância com o disco configurado. Faça backups dos dados persistentes. O endpoint `/healthz` confirma que o servidor está respondendo; a interface informa separadamente a disponibilidade das fontes.

## Documentação e fontes

- [Guia de hospedagem](COMO-HOSPEDAR.md)
- [Recursos, limitações e uso do pacote](LEIA-ME.md)
- Resultados: [Tribunal Superior Eleitoral](https://resultados.tse.jus.br/)
- Notícias: feeds públicos do g1 e da Agência Brasil, além de manchetes do TSE incluídas no pacote, com links para as publicações originais.
- Malha municipal: IBGE, via [municipal-brazilian-geodata](https://github.com/luizpedone/municipal-brazilian-geodata) (MIT). Globo: países do [Natural Earth](https://www.naturalearthdata.com/) (domínio público), via world-atlas, em `globo-geo.js`, desenhado com d3-geo e topojson-client (ISC), incluídos em `globo-libs.js`. Os arquivos são gerados por `ferramentas/gerar-mapas.cjs`.

Projeto independente, sem vínculo com a Justiça Eleitoral. O modo Demonstração utiliza dados fictícios identificados na interface e não representa resultados eleitorais.
