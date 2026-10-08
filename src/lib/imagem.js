// Gera imagens 1080x1350 (formato retrato do feed do Instagram) direto no navegador.
import { formatarData, resultado } from './jogos.js'

const L = 1080, A = 1350
const VERMELHO = '#D7141A', PRETO = '#000000', BRANCO = '#FFFFFF'
const DISPLAY = '"Barlow Condensed", "Arial Narrow", sans-serif'
const TEXTO = '"Barlow", Arial, sans-serif'

async function preparar() {
  await Promise.all([
    document.fonts.load(`800 120px ${DISPLAY}`),
    document.fonts.load(`700 60px ${DISPLAY}`),
    document.fonts.load(`600 40px ${TEXTO}`),
    document.fonts.load(`500 40px ${TEXTO}`),
  ]).catch(() => {})
  const escudo = await new Promise((res) => {
    const i = new Image()
    i.onload = () => res(i)
    i.onerror = () => res(null)
    i.src = '/escudo.png'
  })
  const canvas = document.createElement('canvas')
  canvas.width = L
  canvas.height = A
  return { canvas, ctx: canvas.getContext('2d'), escudo }
}

// Reduz a fonte até o texto caber na largura
function fonteQueCabe(ctx, texto, larguraMax, peso, tamanho, familia) {
  let t = tamanho
  do {
    ctx.font = `${peso} ${t}px ${familia}`
    if (ctx.measureText(texto).width <= larguraMax) break
    t -= 2
  } while (t > 16)
  return t
}

function texto(ctx, t, x, y, { peso = 700, tamanho = 48, familia = DISPLAY, cor = PRETO, alinhar = 'center', max = L - 120 } = {}) {
  fonteQueCabe(ctx, t, max, peso, tamanho, familia)
  ctx.fillStyle = cor
  ctx.textAlign = alinhar
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(t, x, y)
}

// Quebra um texto em linhas que caibam na largura
function linhas(ctx, t, larguraMax) {
  const palavras = t.split(' ')
  const out = []
  let atual = ''
  for (const p of palavras) {
    const teste = atual ? `${atual} ${p}` : p
    if (ctx.measureText(teste).width > larguraMax && atual) { out.push(atual); atual = p } else atual = teste
  }
  if (atual) out.push(atual)
  return out
}

function fundoDividido(ctx) {
  ctx.fillStyle = BRANCO; ctx.fillRect(0, 0, L / 2, A)
  ctx.fillStyle = VERMELHO; ctx.fillRect(L / 2, 0, L / 2, A)
}

function desenharEscudo(ctx, escudo, cx, cy, r) {
  ctx.beginPath(); ctx.arc(cx, cy, r + 10, 0, Math.PI * 2); ctx.fillStyle = PRETO; ctx.fill()
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = BRANCO; ctx.fill()
  if (escudo) {
    // Recorta em círculo para o fundo do PNG não vazar
    ctx.save()
    ctx.beginPath(); ctx.arc(cx, cy, r - 4, 0, Math.PI * 2); ctx.clip()
    const lado = r * 1.75
    ctx.drawImage(escudo, cx - lado / 2, cy - lado / 2, lado, lado)
    ctx.restore()
  } else {
    texto(ctx, 'LP', cx, cy + r * 0.3, { tamanho: r, cor: VERMELHO, peso: 800 })
  }
}

function rodape(ctx, t) {
  ctx.fillStyle = PRETO; ctx.fillRect(0, A - 90, L, 90)
  texto(ctx, t, 60, A - 34, { tamanho: 34, peso: 600, cor: BRANCO, alinhar: 'left', familia: TEXTO, max: L - 480 })
  texto(ctx, '@laplatasapiranga', L - 60, A - 34, { tamanho: 34, peso: 600, cor: BRANCO, alinhar: 'right', familia: TEXTO, max: 400 })
}

function painelBranco(ctx, y, h) {
  ctx.fillStyle = BRANCO
  ctx.strokeStyle = PRETO
  ctx.lineWidth = 6
  ctx.beginPath()
  ctx.roundRect(60, y, L - 120, h, 18)
  ctx.fill(); ctx.stroke()
}

const RES_PALAVRA = { V: 'VITÓRIA', E: 'EMPATE', D: 'DERROTA' }
const RES_COR = { V: '#1F7A3A', E: '#5C5C58', D: VERMELHO }

export async function imagemResultado({ jogo, adversario, local, nomes }) {
  const { canvas, ctx, escudo } = await preparar()
  fundoDividido(ctx)
  desenharEscudo(ctx, escudo, L / 2, 175, 120)

  // Nomes dos times sobre cada metade
  texto(ctx, 'LA PLATA', L / 4, 400, { tamanho: 76, peso: 800, cor: PRETO, max: L / 2 - 80 })
  texto(ctx, (adversario?.nome || 'Adversário').toUpperCase(), (L * 3) / 4, 400, { tamanho: 76, peso: 800, cor: BRANCO, max: L / 2 - 80 })

  // Faixa do placar
  ctx.fillStyle = PRETO; ctx.fillRect(0, 430, L, 230)
  texto(ctx, `${jogo.placar.nos}  x  ${jogo.placar.eles}`, L / 2, 615, { tamanho: 200, peso: 800, cor: BRANCO })

  const res = resultado(jogo.placar)
  ctx.font = `800 44px ${DISPLAY}`
  const w = ctx.measureText(RES_PALAVRA[res]).width + 60
  ctx.fillStyle = RES_COR[res]; ctx.strokeStyle = BRANCO; ctx.lineWidth = 6
  ctx.beginPath(); ctx.roundRect(L / 2 - w / 2, 635, w, 66, 10); ctx.fill(); ctx.stroke()
  texto(ctx, RES_PALAVRA[res], L / 2, 684, { tamanho: 44, peso: 800, cor: BRANCO })

  // Detalhes da súmula
  const s = jogo.sumula || {}
  const lista = (mapa = {}) =>
    Object.entries(mapa).sort((a, b) => b[1] - a[1])
      .map(([id, n]) => `${nomes[id] || '?'}${n > 1 ? ` (${n})` : ''}`).join(', ')
  const blocos = [
    ['Gols', lista(s.gols)],
    ['Assistências', lista(s.assistencias)],
    [(s.melhores || []).length > 1 ? 'Melhores em campo' : 'Melhor em campo', (s.melhores || []).map((id) => nomes[id]).join(', ')],
  ].filter(([, v]) => v)

  if (blocos.length) {
    // Calcula o espaço antes de desenhar; se não couber, diminui as letras
    const topo = 750, limite = 1240
    let escala = 1, layout, fim
    do {
      const tl = 38 * escala, tv = 40 * escala, entre = 48 * escala
      ctx.font = `600 ${tv}px ${TEXTO}`
      let y = topo + 65 * escala
      layout = blocos.map(([rotulo, valor]) => {
        const ls = linhas(ctx, valor, L - 200).slice(0, 3)
        const item = { rotulo, ls, y, tl, tv, entre }
        y += 50 * escala + (ls.length - 1) * entre + 72 * escala
        return item
      })
      const u = layout.at(-1)
      fim = u.y + 50 * escala + (u.ls.length - 1) * entre + 32 * escala
      escala -= 0.06
    } while (fim > limite && escala > 0.6)

    painelBranco(ctx, topo, fim - topo)
    for (const { rotulo, ls, y, tl, tv, entre } of layout) {
      texto(ctx, rotulo, 100, y, { tamanho: tl, peso: 700, cor: VERMELHO, alinhar: 'left' })
      ls.forEach((l, i) => texto(ctx, l, 100, y + tl * 1.3 + i * entre, { tamanho: tv, peso: 600, familia: TEXTO, alinhar: 'left', max: L - 200 }))
    }
  }

  rodape(ctx, `${formatarData(jogo.data)}${local ? `, ${local.nome}` : ''}`)
  return canvas
}

// premios: [{ titulo, nomes: ['Fulano'], valor: '7 gols' }]
export async function imagemPremiacoes({ temporada, premios }) {
  const { canvas, ctx, escudo } = await preparar()
  fundoDividido(ctx)
  desenharEscudo(ctx, escudo, L / 2, 150, 95)
  texto(ctx, 'PREMIAÇÕES', L / 4 + 20, 330, { tamanho: 92, peso: 800, cor: PRETO, max: L / 2 - 60 })
  texto(ctx, String(temporada), (L * 3) / 4 - 20, 330, { tamanho: 92, peso: 800, cor: BRANCO, max: L / 2 - 60 })

  const itens = premios.slice(0, 8)
  const topo = 380, base = A - 130
  painelBranco(ctx, topo, base - topo)
  const passo = (base - topo - 40) / Math.max(itens.length, 1)
  itens.forEach((p, i) => {
    const y = topo + 40 + i * passo
    texto(ctx, p.titulo, 100, y + 34, { tamanho: 34, peso: 700, cor: VERMELHO, alinhar: 'left', max: 600 })
    if (p.valor) texto(ctx, p.valor, L - 100, y + 34, { tamanho: 34, peso: 600, familia: TEXTO, cor: '#5C5C58', alinhar: 'right', max: 300 })
    texto(ctx, p.nomes.join(', ') || '—', 100, y + Math.min(passo - 14, 92), { tamanho: Math.min(56, passo * 0.5), peso: 800, alinhar: 'left', max: L - 200 })
    if (i < itens.length - 1) {
      ctx.strokeStyle = '#DCDCD8'; ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(100, y + passo - 4); ctx.lineTo(L - 100, y + passo - 4); ctx.stroke()
    }
  })
  rodape(ctx, `La Plata F.C., temporada ${temporada}`)
  return canvas
}
