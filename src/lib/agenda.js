import { ehJogo, formatarData, ordenarJogos } from './jogos.js'

const DIA = 864e5
export const semanasEntre = (a, b) => Math.round(Math.abs(new Date(`${a}T12:00:00`) - new Date(`${b}T12:00:00`)) / (7 * DIA))

export const ESTADOS = {
  completo: { rotulo: 'Completo', cor: 'bg-liberado text-papel' },
  falta_casa: { rotulo: 'Falta o jogo em casa', cor: 'bg-cautela text-papel' },
  falta_fora: { rotulo: 'Falta o jogo fora', cor: 'bg-cautela text-papel' },
  mando_repetido: { rotulo: 'Dois jogos com o mesmo mando', cor: 'bg-bloqueado text-papel' },
  mais: { rotulo: 'Mais de 2 jogos', cor: 'bg-bloqueado text-papel' },
  nenhum: { rotulo: 'Nenhum jogo marcado', cor: 'bg-cimento text-texto-suave' },
}

function estadoDoTime(casa, fora) {
  const total = casa + fora
  if (total === 0) return 'nenhum'
  if (total > 2) return 'mais'
  if (total === 2) return casa === 1 ? 'completo' : 'mando_repetido'
  return casa ? 'falta_fora' : 'falta_casa'
}

// Junta jogos da temporada, adversários e controle interno numa visão para montar a agenda
export function analisarAgenda({ jogos, adversarios, privados }) {
  const ativos = ordenarJogos(jogos).filter((j) => j.status !== 'cancelado')
  const partidas = ativos.filter(ehJogo)
  const livres = partidas.filter((j) => !j.adversarioId && j.status === 'agendado')
  const marcados = partidas.filter((j) => j.adversarioId)

  const porTime = {}
  marcados.forEach((j) => {
    const x = (porTime[j.adversarioId] ||= { casa: [], fora: [] })
    x[j.mando === 'casa' ? 'casa' : 'fora'].push(j)
  })

  const times = adversarios.map((a) => {
    const p = porTime[a.id] || { casa: [], fora: [] }
    const priv = privados[a.id] || {}
    return {
      ...a,
      situacao: priv.situacao || 'liberado',
      motivos: priv.motivos || [],
      contatoNome: priv.contatoNome || '',
      contatoTelefone: priv.contatoTelefone || '',
      casa: p.casa,
      fora: p.fora,
      total: p.casa.length + p.fora.length,
      estado: estadoDoTime(p.casa.length, p.fora.length),
    }
  })

  // Sequências de 4 ou mais sábados seguidos fora (contando também as datas livres, que já têm mando)
  const sequenciasFora = []
  let atual = []
  for (const j of partidas) {
    if (j.mando === 'fora') atual.push(j)
    else { if (atual.length >= 4) sequenciasFora.push(atual); atual = [] }
  }
  if (atual.length >= 4) sequenciasFora.push(atual)

  return {
    partidas, livres, marcados, times, sequenciasFora,
    casa: marcados.filter((j) => j.mando === 'casa').length,
    fora: marcados.filter((j) => j.mando !== 'casa').length,
  }
}

const precisaDoMando = (t, mando) => t.total < 2 && t[mando === 'casa' ? 'casa' : 'fora'].length === 0

const distanciaAteOutro = (t, data) => {
  const outros = [...t.casa, ...t.fora]
  return outros.length ? Math.min(...outros.map((o) => semanasEntre(o.data, data))) : null
}

// Times que encaixam numa data livre: primeiro quem já tem 1 jogo, depois quem tem nenhum.
// Entre eles, liberados antes de "com cautela" e quem fica mais longe do outro jogo.
export function sugestoesParaData(livre, times) {
  return times
    .filter((t) => !['nao_marcar', 'parado'].includes(t.situacao) && precisaDoMando(t, livre.mando))
    .map((t) => ({ ...t, distancia: distanciaAteOutro(t, livre.data) }))
    .sort((a, b) =>
      (b.total === 1) - (a.total === 1) ||
      (a.situacao === 'cautela') - (b.situacao === 'cautela') ||
      (b.distancia ?? -1) - (a.distancia ?? -1) ||
      a.nome.localeCompare(b.nome, 'pt-BR'))
}

// Datas livres que servem para um time (mando que falta), mais distantes do outro jogo primeiro
export function datasParaTime(time, livres) {
  return livres
    .filter((l) => precisaDoMando(time, l.mando))
    .map((l) => ({ ...l, distancia: distanciaAteOutro(time, l.data) }))
    .sort((a, b) => (b.distancia ?? 0) - (a.distancia ?? 0) || a.data.localeCompare(b.data))
}

export function textoWhatsApp(livres, temporada) {
  const linha = (mando) => livres
    .filter((l) => (mando === 'casa' ? l.mando === 'casa' : l.mando !== 'casa'))
    .map((l) => `${formatarData(l.data, { diaSemana: false })}${l.horario ? ` (${l.horario.replace(':00', 'h')})` : ''}`)
    .join(', ')
  const casa = linha('casa'), fora = linha('fora')
  const linhas = [`La Plata F.C. - datas livres ${temporada}`, '']
  if (casa) linhas.push(`Em casa: ${casa}`)
  if (fora) linhas.push(`Fora: ${fora}`)
  linhas.push('', 'Jogos aos sábados. Interessados, chamar no privado.')
  return linhas.join('\n')
}
