# Apuração 2026

Painel eleitoral com tema escuro, resultados por estado e município, busca de candidatos, linha do tempo e notícias. A versão 3.1 abre no segundo turno e destaca no mapa de governadores somente as UFs com disputa pendente. Os resultados do primeiro turno continuam disponíveis.

## Publicar e obter um link

Este repositório já contém a aplicação completa e os dados do pacote. O botão abaixo abre a configuração do serviço no Render:

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https%3A%2F%2Fgithub.com%2FPossarle%2FApura-o-2026)

1. Entre no Render e autorize o acesso a este repositório, se solicitado.
2. Revise o serviço `apuracao-2026` e o custo apresentado. **Esta configuração usa uma instância paga e disco persistente de 1 GB**, necessários para manter a coleta ativa e guardar o histórico entre publicações.
3. Confirme a criação e aguarde a implantação. O painel exibirá o endereço público HTTPS para compartilhar.

O arquivo [`render.yaml`](render.yaml) configura Node.js 24, inicialização, verificação de saúde e armazenamento. O disco recebe os dados incluídos na primeira execução e preserva os arquivos existentes nas seguintes. A publicação automática está desativada: para publicar novas versões, use **Manual Deploy → Deploy latest commit** no serviço, ou habilite as publicações automáticas nas configurações do Render.

Para testar gratuitamente, siga a alternativa em [COMO-HOSPEDAR.md](COMO-HOSPEDAR.md). O plano gratuito suspende a aplicação por inatividade e não oferece disco persistente; portanto, não garante a coleta contínua nem a preservação dos novos registros.

## Recursos

- Presidente, governador, senador, deputado federal e deputado estadual/distrital, com filtros por UF e município.
- Pesquisa de candidatos e perfis com votos e distribuição geográfica.
- Cores dos partidos, com Lula em vermelho e Bolsonaro em azul.
- Linha do tempo nacional com horários, separação por turno e histórico salvo pelo servidor.
- Notícias eleitorais com fonte e horário; tentativa de atualização a cada hora.
- Layout adaptável a computador e celular e cópia de dados para consultas quando a fonte estiver indisponível.

## Dados incluídos

A pasta `data/` contém a base incluída e deve permanecer no repositório. O build gera `snapshot-data.js` e `index.html` a partir de `index.template.html` e dos arquivos salvos; esses dois arquivos gerados não são versionados. O pacote contém 136 resultados consolidados: cinco cargos nas 27 UFs e presidente no Brasil, além das configurações, notícias e quatro registros nacionais reais para iniciar o histórico. A coleta incluída foi consultada em 07/10/2026; a interface informa os horários originais da fonte.

Os votos municipais são consultados conforme a navegação e armazenados após consultas bem-sucedidas. O segundo turno aguarda os resultados oficiais: os dados do primeiro turno usados como referência aparecem identificados. Períodos anteriores sem registros não são reconstruídos artificialmente.

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
- Notícias: feeds públicos do g1 e da Agência Brasil, com links para as publicações originais.
- Mapa: @svg-maps/brazil (CC BY 4.0), com crédito preservado na interface.

Projeto independente, sem vínculo com a Justiça Eleitoral. O modo Demonstração utiliza dados fictícios identificados na interface e não representa resultados eleitorais.
