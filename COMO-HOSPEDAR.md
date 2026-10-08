# Colocar a Apuração 2026 na internet

A versão 3.1 abre no segundo turno e incorpora os estilos e a base inicial no próprio HTML. Para atualizar uma publicação existente, substitua os arquivos de código, preserve o disco persistente e reinicie o serviço. No repositório, o HTML é gerado automaticamente na publicação a partir do template e dos dados incluídos.

Este projeto usa um servidor Node.js para consultar o TSE, salvar o histórico e atualizar as notícias. O caminho abaixo usa GitHub + Render e fornece um endereço público com HTTPS. Não é necessário comprar um domínio para começar.

## Publicar este repositório

Os arquivos já estão em https://github.com/Possarle/Apura-o-2026. Abra:

**[Configurar a publicação no Render](https://render.com/deploy?repo=https%3A%2F%2Fgithub.com%2FPossarle%2FApura-o-2026)**

Entre na sua conta e revise a configuração carregada de `render.yaml`. Ela usa uma instância paga de 0,5 CPU e 512 MB, mais um disco persistente de 1 GB. Confira o custo exibido antes de confirmar. O serviço recebe a base de dados incluída e mantém os registros no disco. Depois da implantação, copie o endereço HTTPS exibido pelo Render: esse é o link para compartilhar.

As atualizações de código ficam sob seu controle: após um novo commit, use **Manual Deploy → Deploy latest commit**. Se preferir publicação automática, habilite-a no painel e altere `autoDeployTrigger` para `commit` em `render.yaml` para manter a configuração consistente.

Para experimentar no plano gratuito, crie manualmente um Web Service pelas instruções abaixo, escolha a instância Free e não adicione disco persistente. Configure `DATA_DIR` como `/opt/render/project/src/storage`, mas considere esse diretório temporário sem o disco: reinicializações ou novas publicações podem apagar os registros coletados. Use o plano pago com disco para preservar o histórico.

## Configuração manual ou uso de outro repositório

## 1. Confira o pacote no computador

Extraia todo o ZIP em uma pasta nova. Instale Node.js 24 pelo site https://nodejs.org/ e abra um terminal nessa pasta:

```sh
node server.js
```

Abra http://localhost:8080. No Windows, você também pode executar `INICIAR.bat`. Mantenha o terminal aberto enquanto usar o servidor local.

## 2. Envie os arquivos para um repositório no GitHub

Crie um repositório em https://github.com/new. Envie o conteúdo extraído, com `package.json`, `package-lock.json`, `server.js`, `index.template.html`, os scripts de build, os estilos e a pasta `data` na raiz. Os arquivos `index.html` e `snapshot-data.js` são gerados automaticamente pelo build. Inclua também os demais arquivos do projeto. Não envie apenas o ZIP.

Para transferir a pasta inteira, use o GitHub Desktop: https://desktop.github.com/. Crie ou clone o repositório, copie os arquivos para a pasta dele, faça um commit e use **Publish repository** ou **Push origin**. Isso preserva os subdiretórios de `data`. O repositório pode ser privado; autorize o Render a acessá-lo na próxima etapa.

## 3. Crie um Web Service no Render

Em https://dashboard.render.com/, entre na conta, escolha **New → Web Service**, conecte o GitHub e selecione o repositório.

| Campo | Valor |
| --- | --- |
| Language / Runtime | Node |
| Branch | A branch em que você enviou os arquivos, normalmente `main` |
| Root Directory | Vazio, se `package.json` estiver na raiz |
| Build Command | `npm ci --omit=dev && npm run build` |
| Start Command | `npm start` |
| Health Check Path | `/healthz` |

Em **Environment**, acrescente:

| Nome | Valor |
| --- | --- |
| `NODE_VERSION` | `24` |
| `NODE_ENV` | `production` |
| `DATA_DIR` | `/opt/render/project/src/storage` |

Não é necessário configurar `PORT`: o servidor utiliza a porta fornecida pela hospedagem. Não defina `DISABLE_BACKGROUND=1`, pois isso desliga a coleta e a atualização automática de notícias.

## 4. Preserve o histórico e mantenha a coleta ativa

Para o uso completo, escolha uma instância paga que permaneça ativa e adicione um **Persistent Disk**, em **Advanced** na criação ou em **Disks** nas configurações do serviço.

- **Mount path:** `/opt/render/project/src/storage`
- Comece com a capacidade necessária para o pacote e aumente conforme o cache municipal crescer; acompanhe o uso no painel.
- O caminho do disco precisa ser exatamente igual ao valor de `DATA_DIR`.

Na primeira inicialização, o servidor copia automaticamente os dados incluídos para o disco. Nas próximas inicializações, preserva os arquivos que já existem. Apenas arquivos dentro desse caminho persistem entre reinicializações e novas publicações. Faça também backups da pasta de dados.

O plano gratuito serve para experimentar a interface. Ele suspende o serviço após 15 minutos sem tráfego e não permite disco persistente. Nesse cenário, a coleta para enquanto o serviço dorme e os novos registros locais podem ser perdidos ao reiniciar ou publicar. O pacote original continua disponível, mas não substitui um histórico persistente de produção.

Use uma única instância do servidor com esse diretório. Esta versão não usa um banco compartilhado entre várias instâncias.

## 5. Publique e confira

Clique em **Create Web Service** e acompanhe os logs. Ao concluir, o Render mostra um endereço como `https://nome-do-servico.onrender.com`.

Confira a página, os cinco cargos, a pesquisa de candidatos e o Radar eleitoral. Abra também `/healthz`: deve retornar `{"status":"ok"}`. Esse endereço confirma que o servidor respondeu; a disponibilidade dos dados externos aparece separadamente na interface.

Para atualizar o site depois, envie o novo código para a branch conectada. O Render pode publicar automaticamente os novos commits. Mantenha `DATA_DIR` e o disco configurados para preservar a coleta. Não substitua os dados persistentes com cópias antigas do ZIP.

Se já tem um domínio, adicione-o em **Settings → Custom Domains** e siga os registros DNS fornecidos pelo Render. O endereço `onrender.com` já pode ser compartilhado sem essa etapa.

## O que já vem no pacote

- Resultados dos cinco cargos nas 27 UFs, mais presidente no Brasil, reconsultados em 07/10/2026 com os horários originais de geração do TSE.
- Quatro registros nacionais reais de 04 e 05/10/2026 para iniciar a linha do tempo. O período anterior não foi reconstruído.
- Notícias salvas com fonte e horário; o servidor tenta renovar a consulta a cada hora.
- Nomes e códigos dos municípios. Os resultados municipais individuais são consultados online e ficam em cache no servidor após consultas bem-sucedidas.

O coletor registra a evolução nacional a cada minuto enquanto o processo estiver ativo, desde que o TSE responda. Horas sem coleta não podem ser recuperadas automaticamente sem snapshots oficiais daquele período. Falhas nas fontes mantêm as cópias salvas identificadas como tal.

GitHub Pages e hospedagens apenas de HTML não executam `server.js`. Para ter notícias, consultas pelo servidor e histórico compartilhado, use **Web Service Node.js** ou outra hospedagem que mantenha esse processo e um volume persistente.

## Referências

Documentação consultada em 08/10/2026; campos do painel e condições comerciais podem mudar.

- Configuração por Blueprint: https://render.com/docs/blueprint-spec
- Botão de publicação: https://render.com/docs/deploy-to-render
- Publicação Node: https://render.com/docs/deploy-node-express-app
- Versão do Node: https://render.com/docs/node-version
- Discos persistentes: https://render.com/docs/disks
- Limites do plano gratuito: https://render.com/docs/free
- Domínios: https://render.com/docs/custom-domains
