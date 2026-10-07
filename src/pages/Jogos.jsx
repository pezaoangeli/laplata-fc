import { useState } from 'react'
import { Link } from 'react-router-dom'
import { agruparPorMes, hojeISO, porId, resultado, useJogos } from '../lib/jogos.js'
import { temporadaAtual } from '../lib/temporadas.js'
import { useCollection } from '../lib/useCollection.js'
import LinhaJogo from '../components/LinhaJogo.jsx'
import SeletorTemporada from '../components/SeletorTemporada.jsx'

export default function Jogos() {
  const [temporada, setTemporada] = useState(temporadaAtual())
  const { jogos, carregando } = useJogos(temporada)
  const adversarios = porId(useCollection('adversarios').dados)
  const locais = porId(useCollection('locais').dados)

  const realizados = jogos.filter((j) => j.status === 'realizado' && j.placar)
  const conta = (r) => realizados.filter((j) => resultado(j.placar) === r).length
  const gf = realizados.reduce((s, j) => s + j.placar.nos, 0)
  const gs = realizados.reduce((s, j) => s + j.placar.eles, 0)
  const proximo = jogos.find((j) => j.status === 'agendado' && j.data >= hojeISO())

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-5xl font-extrabold">Jogos</h1>
        <SeletorTemporada valor={temporada} onChange={setTemporada} />
      </div>

      {realizados.length > 0 && (
        <dl className="mt-5 grid grid-cols-5 overflow-hidden rounded-lg border-2 border-preto text-center">
          {[
            ['Vitórias', conta('V')], ['Empates', conta('E')], ['Derrotas', conta('D')],
            ['Gols pró', gf], ['Gols contra', gs],
          ].map(([r, v], i) => (
            <div key={r} className={`py-2 ${i < 3 ? 'border-r border-linha' : i === 3 ? 'border-r border-linha' : ''}`}>
              <dd className="font-display text-3xl font-bold tabular-nums">{v}</dd>
              <dt className="text-xs text-texto-suave sm:text-sm">{r}</dt>
            </div>
          ))}
        </dl>
      )}

      {carregando ? (
        <p className="mt-8 text-texto-suave">Carregando…</p>
      ) : jogos.length === 0 ? (
        <p className="mt-8 text-texto-suave">Nenhum jogo cadastrado em {temporada}.</p>
      ) : (
        agruparPorMes(jogos).map((g) => (
          <section key={g.mes} className="mt-8">
            <h2 className="font-display text-2xl font-bold">{g.mes}</h2>
            <ul className="mt-2 divide-y divide-linha rounded-lg border border-linha">
              {g.jogos.map((j) => {
                const linha = (
                  <LinhaJogo jogo={j} adversario={adversarios[j.adversarioId]} local={locais[j.localId]} destaque={j.id === proximo?.id} />
                )
                return (
                  <li key={j.id}>
                    {j.status === 'realizado' ? (
                      <Link to={`/jogos/${j.id}`} className="block hover:bg-cimento">{linha}</Link>
                    ) : linha}
                  </li>
                )
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  )
}
