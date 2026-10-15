import { resultado } from './jogos.js'
import { estatisticasJogadores, realizados } from './estatisticas.js'

const top = (lista, chave, n = 5) => [...lista].sort((a, b) => chave(b) - chave(a)).filter((x) => chave(x) > 0).slice(0, n)

// Maior sequência de jogos seguidos que satisfazem "cond"
function maiorSequencia(jogos, cond) {
  let melhor = [], atual = []
  for (const j of jogos) {
    if (cond(j)) { atual.push(j); if (atual.length > melhor.length) melhor = [...atual] } else atual = []
  }
  return melhor
}

export function calcularRecordes(jogos) {
  const r = realizados(jogos) // já ordenados por data, só jogos contra adversários com placar
  const saldo = (j) => j.placar.nos - j.placar.eles
  const total = (j) => j.placar.nos + j.placar.eles

  const goleadas = [...r].filter((j) => saldo(j) > 0).sort((a, b) => saldo(b) - saldo(a) || b.placar.nos - a.placar.nos).slice(0, 3)
  const derrotas = [...r].filter((j) => saldo(j) < 0).sort((a, b) => saldo(a) - saldo(b) || b.placar.eles - a.placar.eles).slice(0, 3)
  const maisGols = [...r].sort((a, b) => total(b) - total(a) || b.placar.nos - a.placar.nos).slice(0, 3)

  const invicta = maiorSequencia(r, (j) => resultado(j.placar) !== 'D')
  const vitorias = maiorSequencia(r, (j) => resultado(j.placar) === 'V')
  const marcando = maiorSequencia(r, (j) => j.placar.nos > 0)

  // Atuações: mais gols de um jogador num jogo
  const atuacoes = []
  for (const j of r) for (const [id, g] of Object.entries(j.sumula?.gols || {})) atuacoes.push({ id, gols: g, jogo: j })
  atuacoes.sort((a, b) => b.gols - a.gols || a.jogo.data.localeCompare(b.jogo.data))
  const hatTricks = atuacoes.filter((a) => a.gols >= 3)

  const stats = Object.values(estatisticasJogadores(jogos))
  const rankings = {
    gols: top(stats, (s) => s.gols),
    jogos: top(stats, (s) => s.jogos),
    assist: top(stats, (s) => s.assist),
    melhores: top(stats, (s) => s.melhores),
  }

  // Temporadas
  const anos = [...new Set(r.map((j) => j.temporada))].sort((a, b) => b - a)
  const temporadas = anos.map((ano) => {
    const js = r.filter((j) => j.temporada === ano)
    const c = { ano, J: js.length, V: 0, E: 0, D: 0, gf: 0, gs: 0 }
    js.forEach((j) => { c[resultado(j.placar)]++; c.gf += j.placar.nos; c.gs += j.placar.eles })
    c.aproveitamento = Math.round(((c.V * 3 + c.E) / (c.J * 3)) * 100)
    const s = Object.values(estatisticasJogadores(js))
    const maxG = Math.max(0, ...s.map((x) => x.gols))
    c.artilheiros = maxG ? s.filter((x) => x.gols === maxG).map((x) => x.id) : []
    c.golsArtilheiro = maxG
    return c
  })

  // Adversários
  const porAdv = {}
  for (const j of r) {
    if (!j.adversarioId) continue
    const x = (porAdv[j.adversarioId] ||= { id: j.adversarioId, J: 0, V: 0, E: 0, D: 0 })
    x.J++; x[resultado(j.placar)]++
  }
  const advs = Object.values(porAdv)
  const adversarios = {
    maisEnfrentado: top(advs, (a) => a.J, 1)[0],
    fregues: top(advs, (a) => a.V, 1)[0],
    carrasco: top(advs, (a) => a.D, 1)[0],
  }

  return {
    totalJogos: r.length, totalGols: r.reduce((s, j) => s + j.placar.nos, 0),
    goleadas, derrotas, maisGols, invicta, vitorias, marcando, atuacoes: atuacoes.slice(0, 5), hatTricks, rankings, temporadas, adversarios,
  }
}
