import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase.js'
import { estatisticasJogadores, lideres } from './estatisticas.js'

export const PREMIOS_AUTOMATICOS = [
  { campo: 'gols', titulo: 'Artilheiro', unidade: ['gol', 'gols'] },
  { campo: 'assist', titulo: 'Rei das assistências', unidade: ['assistência', 'assistências'] },
  { campo: 'ga', titulo: 'Mais participações em gol', unidade: ['participação', 'participações'] },
  { campo: 'melhores', titulo: 'Mais vezes melhor em campo', unidade: ['vez', 'vezes'] },
  { campo: 'jogos', titulo: 'Mais presente', unidade: ['jogo', 'jogos'] },
]

export const valorComUnidade = (n, [um, varios]) => `${n} ${n === 1 ? um : varios}`

// Prêmios calculados das súmulas + prêmios lançados à mão no painel
export function montarPremios({ jogos, jogadores, manuais = [], incluirConvidados = false }) {
  const porId = Object.fromEntries(jogadores.map((j) => [j.id, j]))
  const stats = Object.values(estatisticasJogadores(jogos)).filter(
    (x) => porId[x.id] && (incluirConvidados || porId[x.id].tipo !== 'convidado')
  )
  const auto = PREMIOS_AUTOMATICOS.map((p) => {
    const l = lideres(stats, p.campo)
    return {
      titulo: p.titulo,
      nomes: l.map((x) => porId[x.id].nome),
      valor: l.length ? valorComUnidade(l[0][p.campo], p.unidade) : '',
    }
  })
  const extras = manuais.map((m) => ({
    titulo: m.titulo,
    nomes: (m.jogadores || []).map((id) => porId[id]?.nome).filter(Boolean),
    valor: m.detalhe || '',
  }))
  return [...extras, ...auto]
}

export function usePremiacoesManuais(temporada) {
  const [manuais, setManuais] = useState([])
  useEffect(
    () => onSnapshot(doc(db, 'premiacoes', String(temporada)), (d) => setManuais(d.exists() ? d.data().manuais || [] : []), () => setManuais([])),
    [temporada]
  )
  return manuais
}
