import { ehJogo, resultado } from './jogos.js'

export const realizados = (jogos) => jogos.filter((j) => ehJogo(j) && j.status === 'realizado' && j.placar)

// Números de cada jogador a partir das súmulas
export function estatisticasJogadores(jogos) {
  const t = {}
  const get = (id) =>
    (t[id] ||= { id, jogos: 0, gols: 0, assist: 0, ga: 0, melhores: 0, uniforme: 0, agua: 0, ultimoUniforme: null, ultimaAgua: null })
  for (const j of realizados(jogos)) {
    const s = j.sumula
    if (!s) continue
    ;(s.presentes || []).forEach((id) => get(id).jogos++)
    Object.entries(s.gols || {}).forEach(([id, n]) => (get(id).gols += n))
    Object.entries(s.assistencias || {}).forEach(([id, n]) => (get(id).assist += n))
    ;(s.melhores || []).forEach((id) => get(id).melhores++)
    ;(s.uniforme || []).forEach((id) => {
      const x = get(id); x.uniforme++
      if (!x.ultimoUniforme || j.data > x.ultimoUniforme) x.ultimoUniforme = j.data
    })
    ;(s.agua || []).forEach((id) => {
      const x = get(id); x.agua++
      if (!x.ultimaAgua || j.data > x.ultimaAgua) x.ultimaAgua = j.data
    })
  }
  Object.values(t).forEach((x) => (x.ga = x.gols + x.assist))
  return t
}

export function campanha(jogos) {
  const r = realizados(jogos)
  const c = { jogos: r.length, V: 0, E: 0, D: 0, gf: 0, gs: 0 }
  r.forEach((j) => { c[resultado(j.placar)]++; c.gf += j.placar.nos; c.gs += j.placar.eles })
  c.saldo = c.gf - c.gs
  c.aproveitamento = c.jogos ? Math.round(((c.V * 3 + c.E) / (c.jogos * 3)) * 100) : 0
  c.mediaGf = c.jogos ? c.gf / c.jogos : 0
  c.mediaGs = c.jogos ? c.gs / c.jogos : 0
  return c
}

// Quem tem o maior valor no campo (empates incluídos). Vazio se ninguém pontuou.
export function lideres(lista, campo) {
  const max = Math.max(0, ...lista.map((x) => x[campo] || 0))
  return max > 0 ? lista.filter((x) => x[campo] === max) : []
}

// Rodízio: quem fez menos vezes vem primeiro; empate = quem fez há mais tempo (ou nunca)
export function filaRodizio(fixosAtivos, stats, campo, campoUltimo) {
  return fixosAtivos
    .map((j) => ({ ...j, vezes: stats[j.id]?.[campo] || 0, ultima: stats[j.id]?.[campoUltimo] || null }))
    .sort((a, b) =>
      a.vezes - b.vezes ||
      (a.ultima || '').localeCompare(b.ultima || '') ||
      a.nome.localeCompare(b.nome, 'pt-BR'))
}

// Retrospecto contra cada adversário
export function retrospecto(jogos) {
  const t = {}
  for (const j of realizados(jogos)) {
    if (!j.adversarioId) continue
    const x = (t[j.adversarioId] ||= { id: j.adversarioId, jogos: [], J: 0, V: 0, E: 0, D: 0, gf: 0, gs: 0 })
    x.jogos.push(j); x.J++; x[resultado(j.placar)]++; x.gf += j.placar.nos; x.gs += j.placar.eles
  }
  return t
}
