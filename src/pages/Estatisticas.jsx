import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTodosJogos } from '../lib/jogos.js'
import { campanha, estatisticasJogadores } from '../lib/estatisticas.js'
import { temporadaAtual } from '../lib/temporadas.js'
import { useCollection } from '../lib/useCollection.js'
import SeletorTemporada from '../components/SeletorTemporada.jsx'

const COLUNAS = [
  { campo: 'jogos', curto: 'J', longo: 'Jogos' },
  { campo: 'gols', curto: 'G', longo: 'Gols' },
  { campo: 'assist', curto: 'A', longo: 'Assistências' },
  { campo: 'ga', curto: 'G+A', longo: 'Participações em gol' },
  { campo: 'melhores', curto: 'MC', longo: 'Melhor em campo' },
]

export default function Estatisticas() {
  const [temporada, setTemporada] = useState(temporadaAtual())
  const [ordem, setOrdem] = useState('gols')
  const [convidados, setConvidados] = useState(true)
  const { jogos, carregando } = useTodosJogos()
  const { dados: jogadores } = useCollection('jogadores')

  const doPeriodo = useMemo(() => (temporada === 'todas' ? jogos : jogos.filter((j) => j.temporada === temporada)), [jogos, temporada])
  const c = campanha(doPeriodo)
  const linhas = useMemo(() => {
    const stats = estatisticasJogadores(doPeriodo)
    return jogadores
      .filter((j) => stats[j.id]?.jogos && (convidados || j.tipo !== 'convidado'))
      .map((j) => ({ ...j, ...stats[j.id], id: j.id }))
      .sort((a, b) => b[ordem] - a[ordem] || b.jogos - a.jogos || a.nome.localeCompare(b.nome, 'pt-BR'))
  }, [doPeriodo, jogadores, ordem, convidados])

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-5xl font-extrabold">Números</h1>
        <SeletorTemporada valor={temporada} onChange={setTemporada} comTodas />
      </div>

      <dl className="mt-5 grid grid-cols-3 gap-px overflow-hidden rounded-lg border-2 border-preto bg-preto text-center sm:grid-cols-6">
        {[
          ['Jogos', c.jogos], ['Vitórias', c.V], ['Empates', c.E], ['Derrotas', c.D],
          ['Saldo', c.saldo > 0 ? `+${c.saldo}` : c.saldo], ['Aproveit.', `${c.aproveitamento}%`],
        ].map(([r, v]) => (
          <div key={r} className="bg-papel py-2">
            <dd className="font-display text-3xl font-bold tabular-nums">{v}</dd>
            <dt className="text-xs text-texto-suave sm:text-sm">{r}</dt>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-sm text-texto-suave">
        {c.gf} gols feitos ({c.mediaGf.toFixed(2).replace('.', ',')} por jogo) e {c.gs} sofridos ({c.mediaGs.toFixed(2).replace('.', ',')} por jogo).
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-3xl font-bold">Jogadores</h2>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={convidados} onChange={(e) => setConvidados(e.target.checked)} />
          Incluir convidados
        </label>
      </div>
      <p className="text-sm text-texto-suave">Toque no título de uma coluna para ordenar, ou no nome para ver os detalhes do jogador.</p>

      {carregando ? (
        <p className="mt-4 text-texto-suave">Carregando…</p>
      ) : linhas.length === 0 ? (
        <p className="mt-4 text-texto-suave">Nenhuma súmula lançada nesse período.</p>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-lg border border-linha">
          <table className="w-full text-left">
            <thead className="bg-preto text-papel">
              <tr>
                <th className="px-3 py-2 font-display text-lg">#</th>
                <th className="px-3 py-2 font-display text-lg">Jogador</th>
                {COLUNAS.map((col) => (
                  <th key={col.campo} className="px-1 py-1 text-center">
                    <button onClick={() => setOrdem(col.campo)} title={col.longo} aria-label={`Ordenar por ${col.longo}`}
                      className={`w-full rounded px-2 py-1 font-display text-lg ${ordem === col.campo ? 'bg-sangue' : 'hover:bg-papel/15'}`}>
                      {col.curto}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-linha">
              {linhas.map((l, i) => (
                <tr key={l.id}>
                  <td className="px-3 py-2 text-texto-suave tabular-nums">{i + 1}</td>
                  <td className="px-3 py-2">
                    <Link to={`/elenco/${l.id}`} className="font-semibold underline decoration-linha decoration-2 underline-offset-4 hover:decoration-sangue">{l.nome}</Link>
                    {l.tipo === 'convidado' && <span className="ml-1 text-xs text-texto-suave">convidado</span>}
                  </td>
                  {COLUNAS.map((col) => (
                    <td key={col.campo} className={`px-2 py-2 text-center tabular-nums ${ordem === col.campo ? 'font-bold' : ''}`}>{l[col.campo]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-2 text-xs text-texto-suave">J = jogos, G = gols, A = assistências, G+A = participações em gol, MC = melhor em campo.</p>
    </div>
  )
}
