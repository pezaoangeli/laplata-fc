import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { formatarData, porId, useTodosJogos } from '../lib/jogos.js'
import { calcularRecordes } from '../lib/recordes.js'
import { useCollection } from '../lib/useCollection.js'
import { linkJogador } from '../lib/slug.js'

const dataLonga = (iso) => formatarData(iso, { diaSemana: false, ano: true })

export default function Recordes() {
  const { jogos, carregando } = useTodosJogos()
  const jogadores = porId(useCollection('jogadores').dados)
  const adversarios = porId(useCollection('adversarios').dados)
  const r = useMemo(() => calcularRecordes(jogos), [jogos])
  const nome = (id) => jogadores[id]?.nome || '?'
  const adv = (j) => adversarios[j.adversarioId]?.nome || 'adversário'

  if (carregando) return <p className="p-6 text-texto-suave">Carregando…</p>

  const Jogo = ({ j }) => (
    <Link to={`/jogos/${j.id}`} className="flex items-center justify-between gap-3 py-1.5 hover:underline">
      <span className="min-w-0">
        <span className="block truncate">{adv(j)}</span>
        <span className="block text-sm text-texto-suave">{dataLonga(j.data)}</span>
      </span>
      <span className="shrink-0 whitespace-nowrap font-display text-xl font-bold tabular-nums">{j.placar.nos} x {j.placar.eles}</span>
    </Link>
  )
  const Sequencia = ({ titulo, seq }) => (
    <div className="rounded-lg bg-cimento px-4 py-3">
      <p className="text-sm font-semibold text-sangue-escuro">{titulo}</p>
      <p className="font-display text-4xl font-extrabold">{seq.length} jogos</p>
      {seq.length > 0 && <p className="text-sm text-texto-suave">de {dataLonga(seq[0].data)} a {dataLonga(seq.at(-1).data)}</p>}
    </div>
  )
  const Ranking = ({ titulo, lista, campo, nota }) => (
    <section className="rounded-lg border-2 border-preto">
      <h3 className="bg-preto px-3 py-1.5 font-display text-xl font-bold text-papel">{titulo}</h3>
      <ol className="divide-y divide-linha px-3">
        {lista.map((s, i) => (
          <li key={s.id} className="flex items-center justify-between gap-2 py-1.5">
            <Link to={linkJogador(jogadores[s.id] || { id: s.id })} className="hover:underline"><span className="mr-2 text-texto-suave tabular-nums">{i + 1}.</span>{nome(s.id)}</Link>
            <span className="shrink-0 font-display text-xl font-bold tabular-nums">{s[campo]}</span>
          </li>
        ))}
      </ol>
      {nota && <p className="px-3 pb-2 text-xs text-texto-suave">{nota}</p>}
    </section>
  )

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="font-display text-5xl font-extrabold">Recordes</h1>
      <p className="text-texto-suave">
        Desde {r.temporadas.at(-1)?.ano}: {r.totalJogos} jogos e {r.totalGols} gols marcados. Jogos internos não entram.
      </p>

      <h2 className="mt-8 font-display text-3xl font-bold">Placares</h2>
      <div className="mt-3 grid gap-4 md:grid-cols-3">
        {[['Maiores goleadas', r.goleadas], ['Maiores derrotas', r.derrotas], ['Jogos com mais gols', r.maisGols]].map(([t, l]) => (
          <section key={t} className="rounded-lg border border-linha px-4 py-3">
            <h3 className="font-display text-xl font-bold">{t}</h3>
            <div className="mt-1 divide-y divide-linha">{l.map((j) => <Jogo key={j.id} j={j} />)}</div>
          </section>
        ))}
      </div>

      <h2 className="mt-8 font-display text-3xl font-bold">Sequências</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Sequencia titulo="Maior sequência invicta" seq={r.invicta} />
        <Sequencia titulo="Mais vitórias seguidas" seq={r.vitorias} />
        <Sequencia titulo="Mais jogos seguidos marcando" seq={r.marcando} />
      </div>

      <h2 className="mt-8 font-display text-3xl font-bold">Atuações</h2>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <section className="rounded-lg border border-linha px-4 py-3">
          <h3 className="font-display text-xl font-bold">Mais gols num jogo</h3>
          <ul className="mt-1 divide-y divide-linha">
            {r.atuacoes.map((a) => (
              <li key={a.jogo.id + a.id} className="flex items-center justify-between gap-2 py-1.5">
                <span><strong>{nome(a.id)}</strong> <span className="text-sm text-texto-suave">contra {adv(a.jogo)}, {dataLonga(a.jogo.data)}</span></span>
                <span className="shrink-0 font-display text-xl font-bold tabular-nums">{a.gols}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-lg border border-linha px-4 py-3">
          <h3 className="font-display text-xl font-bold">Hat-tricks ({r.hatTricks.length})</h3>
          <p className="text-sm text-texto-suave">Jogos em que alguém fez 3 gols ou mais.</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {Object.entries(r.hatTricks.reduce((m, a) => ({ ...m, [a.id]: (m[a.id] || 0) + 1 }), {}))
              .sort((a, b) => b[1] - a[1]).map(([id, n]) => (
                <li key={id} className="rounded-full bg-cimento px-3 py-1 text-sm"><strong>{nome(id)}</strong> {n}x</li>
              ))}
          </ul>
        </section>
      </div>

      <h2 className="mt-8 font-display text-3xl font-bold">De todos os tempos</h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Ranking titulo="Artilheiros" lista={r.rankings.gols} campo="gols" />
        <Ranking titulo="Mais jogos" lista={r.rankings.jogos} campo="jogos" />
        <Ranking titulo="Assistências" lista={r.rankings.assist} campo="assist" nota="Registradas a partir de 2023." />
        <Ranking titulo="Melhor em campo" lista={r.rankings.melhores} campo="melhores" />
      </div>

      <h2 className="mt-8 font-display text-3xl font-bold">Adversários</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {[['Mais enfrentado', r.adversarios.maisEnfrentado, (a) => `${a.J} jogos`],
          ['Freguês (mais vitórias contra)', r.adversarios.fregues, (a) => `${a.V} vitórias em ${a.J} jogos`],
          ['Carrasco (mais derrotas contra)', r.adversarios.carrasco, (a) => `${a.D} derrotas em ${a.J} jogos`]].map(([t, a, d]) => (
          <div key={t} className="rounded-lg bg-cimento px-4 py-3">
            <p className="text-sm font-semibold text-sangue-escuro">{t}</p>
            <p className="font-display text-3xl font-extrabold">{a ? adversarios[a.id]?.nome : '—'}</p>
            {a && <p className="text-sm text-texto-suave">{d(a)}</p>}
          </div>
        ))}
      </div>

      <h2 className="mt-8 font-display text-3xl font-bold">Temporadas</h2>
      <div className="mt-3 overflow-x-auto rounded-lg border border-linha">
        <table className="w-full min-w-[560px] text-center">
          <thead className="bg-preto text-papel">
            <tr>{['Ano', 'J', 'V', 'E', 'D', 'Gols', 'Aprov.', 'Artilheiro'].map((h) => <th key={h} className="px-2 py-2 font-display text-lg">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-linha tabular-nums">
            {r.temporadas.map((t) => (
              <tr key={t.ano}>
                <td className="py-2 font-semibold">{t.ano}</td><td>{t.J}</td><td>{t.V}</td><td>{t.E}</td><td>{t.D}</td>
                <td>{t.gf} x {t.gs}</td><td>{t.aproveitamento}%</td>
                <td className="px-2 text-left">{t.artilheiros.map(nome).join(', ')} <span className="text-texto-suave">({t.golsArtilheiro})</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
