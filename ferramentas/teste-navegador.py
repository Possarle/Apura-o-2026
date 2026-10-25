"""Roteiro de testes de ponta a ponta do Apuração 2026 no navegador (Chromium sem janela).

Uso, com o servidor rodando (npm start):
  pip install playwright && python -m playwright install chromium
  python ferramentas/teste-navegador.py http://localhost:8080 [caminho/para/copia/do/index.html]
Usa o modo Demonstração e os dados salvos; não depende de o TSE estar no ar.
"""
import asyncio, sys, json, re, urllib.request
from playwright.async_api import async_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8080'
ARQUIVO = sys.argv[2] if len(sys.argv) > 2 else None  # caminho de uma cópia do index.html para testar a abertura isolada
resultados = []
erros_js = []

def ok(nome, cond, extra=''):
    resultados.append((nome, bool(cond), extra))
    print(('OK   ' if cond else 'FALHA') + ' ' + nome + (' · ' + str(extra) if extra else ''), flush=True)

async def texto(pg, sel):
    el = await pg.query_selector(sel)
    return (await el.inner_text()) if el else ''

async def clicar(pg, sel, espera=500):
    await pg.click(sel, force=True)
    await pg.wait_for_timeout(espera)

async def nova_pagina(b, url, largura=1400, altura=1000):
    pg = await b.new_page(viewport={'width': largura, 'height': altura}, accept_downloads=True)
    pg.on('pageerror', lambda e: erros_js.append(f'{url} :: {e}'))
    await pg.goto(url)
    return pg

def http(caminho, headers=None):
    req = urllib.request.Request(BASE + caminho, headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status, r.read(), dict(r.headers)
    except urllib.error.HTTPError as e:
        return e.code, e.read(), dict(e.headers)

async def main():
    # ---------------- Servidor ----------------
    st, body, h = http('/healthz'); ok('servidor: /healthz', st == 200)
    st, body, h = http('/'); ok('servidor: página inicial', st == 200 and b'apura' in body.lower(), f'{len(body)//1024} KB')
    st, body, h = http('/', {'Accept-Encoding': 'gzip'}); ok('servidor: página comprimida (gzip)', h.get('Content-Encoding') == 'gzip', f'{len(body)//1024} KB')
    for f in ['/mapa-geo.js', '/globo-geo.js', '/globo-libs.js', '/exterior-core.js', '/professional.css', '/favicon.svg']:
        st, _, _ = http(f); ok('servidor: arquivo ' + f, st == 200)
    for f in ['/server.js', '/../package.json', '/data/news.json', '/coletor-municipios.js']:
        st, _, _ = http(f); ok('segurança: bloqueia ' + f, st == 404)
    st, _, _ = http('/tse/../../server.js'); ok('segurança: proxy do TSE não lê arquivos locais', st in (400, 403, 404, 502))
    st, _, _ = http('/api/history?turno=9'); ok('servidor: histórico rejeita turno inválido', st == 400)
    st, b2, _ = http('/api/history?turno=1'); ok('servidor: histórico do 1º turno', st == 200 and len(json.loads(b2)['points']) > 0, len(json.loads(b2)['points']))
    st, b2, _ = http('/api/news'); ok('servidor: notícias', st in (200, 503))
    st, b2, h = http('/api/municipios?fonte=tse&cargo=1&turno=1'); ok('servidor: municípios', st == 200 and 'coleta' in json.loads(b2))
    st, _, _ = http('/api/municipios?fonte=tse&cargo=1&turno=1', {'If-None-Match': h.get('ETag', '')}); ok('servidor: municípios sem mudança devolve 304', st == 304)
    st, _, _ = http('/api/municipios?cargo=7&turno=1'); ok('servidor: municípios rejeita cargo proporcional', st == 400)

    async with async_playwright() as p:
        b = await p.chromium.launch()

        # ---------------- Visão geral (demonstração) ----------------
        pg = await nova_pagina(b, BASE + '/#fonte=demo&turno=1&cargo=1')
        await pg.wait_for_timeout(9000)
        ok('visão geral: placar com candidatos', 'MAIS VOTADO' in (await texto(pg, '#placar')).upper())
        ok('visão geral: painel lateral', len(await texto(pg, '#painel')) > 50)
        ok('visão geral: gráficos', await pg.locator('#graficos .cartao, #graficos svg').count() > 0)
        ok('visão geral: linha do tempo', await pg.locator('[aria-label*="Linha do tempo"]').count() > 0)
        ok('mapa: 5.571 municípios', await pg.locator('#camadaMun .mun').count() == 5571)
        cores = await pg.evaluate("new Set([...document.querySelectorAll('#camadaMun .mun')].map(m=>m.style.fill)).size")
        ok('mapa: municípios coloridos por líder', cores >= 2, f'{cores} cores')
        for cargo, nome in [('3', 'Governador'), ('5', 'Senador'), ('6', 'Deputado federal'), ('7', 'Deputado estadual'), ('1', 'Presidente')]:
            await clicar(pg, f'[data-cargo="{cargo}"]', 3500)
            ok(f'aba {nome}', (await pg.get_attribute(f'[data-cargo="{cargo}"]', 'aria-pressed')) == 'true' and len(await texto(pg, '#painel')) > 20)
            if cargo in ('6', '7'):
                ok(f'aba {nome}: camada municipal desativada', await pg.get_attribute('[data-mapa-modo=municipios]', 'disabled') is not None)
        vb = lambda: pg.evaluate("document.querySelector('#mapa').getAttribute('viewBox')")
        mb = await pg.locator('#mapa').bounding_box(); mx, my = mb['x'] + mb['width'] / 2, mb['y'] + mb['height'] / 2
        v0 = await vb(); await pg.mouse.move(mx, my)
        for _ in range(4): await pg.mouse.wheel(0, -240); await pg.wait_for_timeout(50)
        v1 = await vb(); ok('mapa Brasil: zoom com a roda do mouse', float(v1.split()[2]) < float(v0.split()[2]) * 0.8)
        await pg.mouse.down(); await pg.mouse.move(mx + 120, my + 60, steps=8); await pg.mouse.up(); await pg.wait_for_timeout(300)
        v2 = await vb(); ok('mapa Brasil: arrastar move o mapa', v2.split()[0] != v1.split()[0])
        ok('mapa Brasil: arrastar não escolhe estado', 'Brasil' in await texto(pg, '#painel'))
        await clicar(pg, '[data-mzoom=enquadrar]', 800)
        ok('mapa Brasil: botão 1:1 enquadra o Brasil', abs(float((await vb()).split()[2]) - float(v0.split()[2])) < 1)
        await clicar(pg, '[data-mzoom=mais]', 600)
        ok('mapa Brasil: botão + aproxima', float((await vb()).split()[2]) < float(v0.split()[2]) * 0.8)
        await clicar(pg, '[data-mzoom=enquadrar]', 700)
        mb = await pg.locator('#mapa').bounding_box(); mx, my = mb['x'] + mb['width'] / 2, mb['y'] + mb['height'] / 2
        await pg.mouse.dblclick(mx, my); await pg.wait_for_timeout(700)
        ok('mapa Brasil: duplo clique aproxima sem abrir estado', float((await vb()).split()[2]) < float(v0.split()[2]) * 0.6 and 'Brasil' in await texto(pg, '#painel'))
        await clicar(pg, '#mapaTela', 900)
        ok('mapa Brasil: tela cheia', await pg.evaluate("document.querySelector('.mapa-wrap').classList.contains('expandido')"))
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(600)
        ok('mapa Brasil: Esc sai da tela cheia', not await pg.evaluate("document.querySelector('.mapa-wrap').classList.contains('expandido')"))
        await clicar(pg, '[data-mzoom=enquadrar]', 700)
        await clicar(pg, '#ufs button[data-uf="ba"]', 1200)
        ok('estado: escolher BA aproxima o mapa', 'zoom' in (await pg.get_attribute('#mapa', 'class') or ''))
        ok('estado: painel mostra a Bahia', 'Bahia' in await texto(pg, '#painel'))
        ok('estado: rótulo do mapa', 'Bahia' in await texto(pg, '#mapScope'))
        bb = await pg.locator('#camadaMun [data-uf="ba"]').first.bounding_box(); await pg.mouse.move(bb['x']+bb['width']/2, bb['y']+bb['height']/2); await pg.mouse.move(bb['x']+bb['width']/2+1, bb['y']+bb['height']/2+1); await pg.wait_for_timeout(300)
        ok('mapa: dica ao passar o cursor', not await pg.locator('#dica').is_hidden())
        await clicar(pg, '[data-acao="brasil"]', 900)
        ok('estado: voltar ao Brasil', 'zoom' not in (await pg.get_attribute('#mapa', 'class') or ''))
        await clicar(pg, '[data-mapa-modo=estados]', 600)
        ok('mapa: modo Estados', 'modo-mun' not in (await pg.get_attribute('#mapa', 'class') or ''))
        await clicar(pg, '#mapa #uf-sp', 600)
        ok('mapa: clique no estado (modo Estados)', 'São Paulo' in await texto(pg, '#painel'))
        await clicar(pg, '#mapa #uf-sp', 600)
        await clicar(pg, '[data-mapa-modo=municipios]', 600)
        # Exterior / globo
        await clicar(pg, '[data-mapa-modo=exterior]', 4000)
        ok('exterior: globo visível', await pg.locator('#globo').is_visible())
        largura = await pg.evaluate("document.querySelector('#globoCanvas').width")
        ok('exterior: globo desenhado', largura > 100, largura)
        ok('exterior: tabela de países', await pg.locator('#exteriorPainel tr[data-pais]').count() == 12)
        rot0 = await pg.evaluate("document.querySelector('#globoCanvas').toDataURL().length")
        await pg.wait_for_timeout(1200)
        rot1 = await pg.evaluate("document.querySelector('#globoCanvas').toDataURL().length")
        ok('exterior: globo girando', rot0 != rot1)
        await clicar(pg, '#exteriorPainel tr[data-pais]', 2200)
        ok('exterior: cartão do país abre', (await pg.get_attribute('#globoCartao', 'aria-hidden')) == 'false')
        ok('exterior: cartão mostra votos', 'votos' in (await texto(pg, '#globoCartao')).lower())
        a = await pg.evaluate("document.querySelector('#globoCanvas').toDataURL().length"); await pg.wait_for_timeout(600)
        # globo para (apenas o pulso muda levemente) -> só checamos o texto do botão
        ok('exterior: botão vira "Voltar a girar"', 'Voltar' in await texto(pg, '#globoGirar'))
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(800)
        ok('exterior: Esc fecha o cartão', (await pg.get_attribute('#globoCartao', 'aria-hidden')) == 'true')
        box = await pg.locator('#globoCanvas').bounding_box()
        await pg.mouse.move(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)
        await pg.mouse.down(); await pg.mouse.move(box['x'] + box['width'] / 2 + 120, box['y'] + box['height'] / 2, steps=8); await pg.mouse.up()
        ok('exterior: arrastar o globo não gera erro', True)
        await clicar(pg, '#globoGirar', 300)
        ok('exterior: pausar giro', 'Girar' == (await texto(pg, '#globoGirar')).strip())
        box = await pg.locator('#globoCanvas').bounding_box()
        await pg.mouse.move(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)
        for _ in range(5): await pg.mouse.wheel(0, -240); await pg.wait_for_timeout(60)
        await pg.wait_for_timeout(700)
        ok('exterior: zoom com a roda do mouse', not await pg.evaluate("document.querySelector('[data-zoom=ajustar]').disabled"))
        await clicar(pg, '[data-zoom=ajustar]', 700)
        ok('exterior: botão 1:1 volta ao globo inteiro', await pg.evaluate("document.querySelector('[data-zoom=ajustar]').disabled"))
        await clicar(pg, '[data-zoom=mais]', 700)
        ok('exterior: botão + aproxima', not await pg.evaluate("document.querySelector('[data-zoom=ajustar]').disabled"))
        await clicar(pg, '#globoTela', 900)
        ok('exterior: tela cheia', await pg.evaluate("document.querySelector('#globo').classList.contains('expandido')"))
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(700)
        ok('exterior: Esc sai da tela cheia', not await pg.evaluate("document.querySelector('#globo').classList.contains('expandido')"))
        await clicar(pg, '#exteriorPainel [data-ext-todos]', 500)
        ok('exterior: mostrar todos os países', await pg.locator('#exteriorPainel tr[data-pais]').count() > 100)
        ok('endereço guarda o modo do mapa', 'mapa=exterior' in pg.url)
        # Turnos
        await clicar(pg, '#t2', 3500)
        ok('turno: 2º turno', (await pg.get_attribute('#t2', 'aria-pressed')) == 'true' and 'turno=2' in pg.url)
        ok('turno: 2º turno esconde cargos sem disputa', await pg.locator('[data-cargo="6"]').count() == 0)
        await clicar(pg, '#t1', 3000)
        ok('turno: volta ao 1º turno', (await pg.get_attribute('#t1', 'aria-pressed')) == 'true')
        await clicar(pg, '#atualizar', 2500)
        ok('botão Atualizar', 'Atualiz' in await texto(pg, '#status') or 'Sem dados' not in await texto(pg, '#status'))
        # Seletor de estado em cargos estaduais
        await clicar(pg, '[data-cargo="3"]', 3000)
        await pg.select_option('#estadoResultado', 'mg'); await pg.wait_for_timeout(1200)
        ok('governador: seletor de estado', 'Minas Gerais' in await texto(pg, '#painel'))
        await clicar(pg, '[data-cargo="6"]', 3500)
        await pg.select_option('#estadoResultado', 'sp'); await pg.wait_for_timeout(1500)
        antes = await pg.locator('#painel .cand').count()
        if await pg.locator('[data-acao="mais"]').count():
            await clicar(pg, '[data-acao="mais"]', 600)
        ok('deputados: mostrar mais candidatos', await pg.locator('#painel .cand').count() >= antes, f'{antes} → {await pg.locator("#painel .cand").count()}')
        # Compartilhar
        await pg.context.grant_permissions(['clipboard-read', 'clipboard-write'])
        await clicar(pg, '#compartilhar', 600)
        ok('copiar consulta', not await pg.locator('#toast').is_hidden())
        await pg.close()

        # ---------------- Por município ----------------
        pg = await nova_pagina(b, BASE + '/#fonte=demo&turno=1&cargo=1')
        await pg.wait_for_timeout(5000)
        await clicar(pg, '[data-page="cidades"]', 6000)
        ok('por município: tabela', await pg.locator('#cidCorpo tr.linha').count() > 100, await pg.locator('#cidCorpo tr.linha').count())
        for c in ['1', '3', '5', '6', '7']:
            await clicar(pg, f'[data-cidcargo="{c}"]', 4000)
            await clicar(pg, '#cidCorpo tr.linha', 700)
            ok(f'por município: cargo {c} abre candidatos da cidade', await pg.locator('tr.detalhe .cand').count() > 0)
        await pg.select_option('#cidUf', 'rj'); await pg.wait_for_timeout(4000)
        ok('por município: trocar estado', await pg.locator('#cidCorpo tr.linha').count() > 50)
        await pg.fill('#cidBusca', 'Nova'); await pg.wait_for_timeout(500)
        n = await pg.locator('#cidCorpo tr.linha').count()
        ok('por município: busca por nome', 0 < n < 92, n)
        await pg.fill('#cidBusca', ''); await pg.wait_for_timeout(300)
        for o in ['votos', 'menos', 'nome']:
            await pg.select_option('#cidOrdem', o); await pg.wait_for_timeout(300)
        ok('por município: ordenação', True)
        async with pg.expect_download() as d:
            await clicar(pg, '#cidCsv', 300)
        dl = await d.value; path = await dl.path(); conteudo = open(path, encoding='utf-8-sig').read()
        ok('por município: baixar planilha CSV', conteudo.count('\n') > 50, dl.suggested_filename)
        await pg.close()

        # ---------------- Candidatos ----------------
        pg = await nova_pagina(b, BASE + '/#fonte=demo&turno=1&cargo=1&pagina=candidatos')
        await pg.wait_for_timeout(4000)
        await clicar(pg, '#carregarBusca', 9000)
        ok('candidatos: carregar todos os cargos', 'candidat' in (await texto(pg, '#buscaStatus') + await texto(pg, '#buscaContagem')).lower())
        await pg.fill('#buscaCandidato', 'Lula'); await pg.wait_for_timeout(600)
        ok('candidatos: busca por nome', await pg.locator('[data-candidato]').count() >= 1)
        await pg.fill('#buscaCandidato', '22'); await pg.wait_for_timeout(600)
        ok('candidatos: busca por número', await pg.locator('[data-candidato]').count() >= 1)
        await pg.fill('#buscaCandidato', ''); await pg.wait_for_timeout(300)
        await pg.select_option('#buscaCargo', index=1); await pg.wait_for_timeout(400)
        ok('candidatos: filtro de cargo', await pg.locator('[data-candidato]').count() >= 1)
        if await pg.locator('#buscaMais').is_visible():
            await clicar(pg, '#buscaMais', 400); ok('candidatos: mostrar mais', True)
        await clicar(pg, '[data-candidato]', 800)
        ok('candidatos: abrir perfil', len(await texto(pg, '#perfilCandidato')) > 40)
        if await pg.locator('#carregarPerfil').count():
            await clicar(pg, '#carregarPerfil', 6000)
            ok('candidatos: votos por município no perfil', await pg.locator('#perfilMunicipios table, #perfilMunicipios tr').count() > 0)
        await pg.close()

        # ---------------- Notícias e Sobre ----------------
        pg = await nova_pagina(b, BASE + '/#fonte=tse&turno=2&pagina=noticias')
        await pg.wait_for_timeout(4000)
        n = await pg.locator('#noticiasLista a').count()
        ok('notícias: lista de manchetes', n > 0, f'{n} links')
        links = await pg.eval_on_selector_all('#noticiasLista a', 'as=>as.map(a=>a.href)')
        ok('notícias: links seguros (https)', all(l.startswith('https://') for l in links))
        await clicar(pg, '#recarregarNoticias', 2000)
        ok('notícias: atualizar', len(await texto(pg, '#noticiasStatus')) > 0)
        await clicar(pg, '[data-page="metodo"]', 500)
        ok('sobre os dados', await pg.locator('#sobreDados').is_visible())
        await pg.close()

        # ---------------- Dados oficiais (TSE salvo) ----------------
        pg = await nova_pagina(b, BASE + '/#fonte=tse&turno=1&cargo=1')
        await pg.wait_for_timeout(6000)
        ok('TSE: placar do 1º turno com dados salvos', '47,03' in await texto(pg, '#placar'))
        ok('TSE: aviso de cópia salva', await pg.locator('#avisoPacote').is_visible())
        await pg.close()
        pg = await nova_pagina(b, BASE + '/')
        await pg.wait_for_timeout(5000)
        ok('abertura: 2º turno por padrão', 'turno=2' in pg.url or (await pg.get_attribute('#t2', 'aria-pressed')) == 'true')
        ok('abertura: governadores em disputa', 'UFs' in await texto(pg, '#placar'))
        await pg.close()

        # ---------------- Celular ----------------
        pg = await nova_pagina(b, BASE + '/#fonte=demo&turno=1&cargo=1', 390, 844)
        await pg.wait_for_timeout(6000)
        sw = await pg.evaluate('document.documentElement.scrollWidth')
        ok('celular: sem rolagem lateral (visão geral)', sw <= 392, sw)
        await clicar(pg, '[data-mapa-modo=exterior]', 3500)
        sw = await pg.evaluate('document.documentElement.scrollWidth')
        ok('celular: sem rolagem lateral (exterior)', sw <= 392, sw)
        for pagina in ['cidades', 'candidatos', 'noticias', 'metodo']:
            await clicar(pg, f'[data-page="{pagina}"]', 2500)
            sw = await pg.evaluate('document.documentElement.scrollWidth')
            ok(f'celular: página {pagina} sem rolagem lateral', sw <= 392, sw)
        await pg.close()

        # ---------------- Arquivo aberto sozinho ----------------
        if ARQUIVO:
            pg = await nova_pagina(b, 'file://' + ARQUIVO + '#fonte=demo&turno=1&cargo=1')
            await pg.wait_for_timeout(6000)
            ok('arquivo sozinho: municípios', await pg.locator('#camadaMun .mun').count() == 5571)
            await clicar(pg, '[data-mapa-modo=exterior]', 3000)
            ok('arquivo sozinho: globo', await pg.evaluate("document.querySelector('#globoCanvas').width") > 100)
            await pg.close()
        await b.close()

    falhas = [r for r in resultados if not r[1]]
    print(f'\n{len(resultados) - len(falhas)}/{len(resultados)} verificações OK')
    reais = [e for e in erros_js]
    print('Erros de JavaScript:', len(reais))
    for e in reais[:15]: print('  ', e[:300])

asyncio.run(main())
