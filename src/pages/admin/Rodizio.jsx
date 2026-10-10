import { useMemo, useState } from 'react'
import { formatarData, useTodosJogos } from '../../lib/jogos.js'
import { estatisticasJogadores, filaRodizio } from '../../lib/estatisticas.js'
import { temporadaAtual } from '../../lib/temporadas.js'
import { useCollection } from '../../lib/useCollection.js'
import SeletorTemporada from '../../components/SeletorTemporada.jsx'

export default function Rodizio() {
  const [temporada, setTemporada] = useState(temporadaAtual())
  const { jogos, carregando } = useTodosJogos()
  const { dados: jogadores } = useCollection('jogadores')

  const stats = useMemo(() => estatisticasJogadores(jogos.filter((j) => j.temporada === temporada)), [jogos, temporada])
  const fixosAtivos = jogadores.filter((j) => j.tipo !== 'convidado' && j.ativo !== false)
  const filas = [
    ['Uniforme', filaRodizio(fixosAtivos, stats, 'uniforme', 'ultimoUniforme')],
    ['Água', filaRodizio(fixosAtivos, stats, 'agua', 'ultimaAgua')],
  ]

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl font-bold">Rodízio</h1>
          <p className="text-texto-suave">
            Quem levou menos vezes na temporada vem primeiro. Empate: quem levou há mais tempo. Só fixos ativos entram.
          </p>
        </div>
        <SeletorTemporada valor={temporada} onChange={setTemporada} />
      </div>
      <p className="mt-2 text-sm text-texto-suave">Os dados vêm das súmulas: marque Uniforme e Água ao lançar cada jogo.</p>

      {carregando ? <p className="mt-6 text-texto-suave">Carregando…</p> : (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {filas.map(([titulo, fila]) => (
            <section key={titulo} className="rounded-lg bg-papel p-4">
              <h2 className="font-display text-2xl font-bold">{titulo}</h2>
              <ol className="mt-2 divide-y divide-linha">
                {fila.map((j, i) => (
                  <li key={j.id} className={`flex items-center justify-between gap-3 py-2 ${i === 0 ? 'font-bold' : ''}`}>
                    <span className="flex items-center gap-2">
                      <span className="w-6 text-right tabular-nums text-texto-suave">{i + 1}</span>
                      {j.nome}
                      {i === 0 && <span className="rounded bg-sangue px-2 py-0.5 text-xs font-semibold text-papel">próximo</span>}
                    </span>
                    <span className="text-sm font-normal text-texto-suave">
                      {j.vezes ? `${j.vezes}x, última em ${formatarData(j.ultima, { diaSemana: false })}` : 'ainda não levou'}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
