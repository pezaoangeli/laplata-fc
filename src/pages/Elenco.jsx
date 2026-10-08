import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTodosJogos } from '../lib/jogos.js'
import { estatisticasJogadores } from '../lib/estatisticas.js'
import { temporadaAtual } from '../lib/temporadas.js'
import { useCollection } from '../lib/useCollection.js'

export default function Elenco() {
  const { jogos } = useTodosJogos()
  const { dados: jogadores, carregando } = useCollection('jogadores')
  const ano = temporadaAtual()
  const stats = useMemo(() => estatisticasJogadores(jogos.filter((j) => j.temporada === ano)), [jogos, ano])

  const fixos = jogadores.filter((j) => j.tipo !== 'convidado' && j.ativo !== false)
  const convidados = jogadores.filter((j) => j.tipo === 'convidado' && stats[j.id]?.jogos)

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="font-display text-5xl font-extrabold">Elenco</h1>
      <p className="text-texto-suave">Números da temporada {ano}. Toque no jogador para ver tudo.</p>
      {carregando ? <p className="mt-6 text-texto-suave">Carregando…</p> : (
        <>
          <Grade itens={fixos} stats={stats} />
          {convidados.length > 0 && (
            <>
              <h2 className="mt-10 font-display text-3xl font-bold">Convidados que jogaram em {ano}</h2>
              <Grade itens={convidados} stats={stats} />
            </>
          )}
        </>
      )}
    </div>
  )
}

function Grade({ itens, stats }) {
  return (
    <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {itens.map((j) => {
        const s = stats[j.id] || {}
        return (
          <li key={j.id}>
            <Link to={`/elenco/${j.id}`} className="flex h-full flex-col overflow-hidden rounded-lg border-2 border-preto transition-colors hover:border-sangue hover:bg-cimento">
              <div className="flex items-center justify-between bg-preto px-3 py-2">
                <span className="truncate font-display text-xl font-bold text-papel">{j.nome}</span>
              </div>
              <p className="px-3 pt-1 text-sm text-texto-suave">{j.posicao || '\u00a0'}</p>
              <dl className="mt-auto grid grid-cols-3 px-1 pb-2 text-center">
                {[['Jogos', s.jogos], ['Gols', s.gols], ['Assist.', s.assist]].map(([r, v]) => (
                  <div key={r}>
                    <dd className="font-display text-2xl font-bold tabular-nums">{v || 0}</dd>
                    <dt className="text-xs text-texto-suave">{r}</dt>
                  </div>
                ))}
              </dl>
              <p className="flex items-center justify-between border-t border-linha px-3 py-1.5 text-sm font-semibold text-sangue-escuro">
                Ver detalhes <span aria-hidden="true">›</span>
              </p>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
