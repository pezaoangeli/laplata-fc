import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CORES_RESULTADO, formatarData, porId, resultado, useTodosJogos } from '../lib/jogos.js'
import { estatisticasJogadores, realizados } from '../lib/estatisticas.js'
import { useCollection } from '../lib/useCollection.js'

export default function JogadorDetalhe() {
  const { id } = useParams()
  const { jogos, carregando } = useTodosJogos()
  const { dados: jogadores } = useCollection('jogadores')
  const adversarios = porId(useCollection('adversarios').dados)
  const jogador = jogadores.find((j) => j.id === id)

  const { total, porTemporada, partidas } = useMemo(() => {
    const anos = [...new Set(jogos.map((j) => j.temporada))].sort((a, b) => b - a)
    return {
      total: estatisticasJogadores(jogos)[id] || {},
      porTemporada: anos
        .map((a) => ({ ano: a, ...(estatisticasJogadores(jogos.filter((j) => j.temporada === a))[id] || {}) }))
        .filter((x) => x.jogos),
      partidas: realizados(jogos).filter((j) => j.sumula?.presentes?.includes(id)).reverse(),
    }
  }, [jogos, id])

  if (carregando || !jogadores.length) return <p className="p-6 text-texto-suave">Carregando…</p>
  if (!jogador) return <p className="p-6">Jogador não encontrado. <Link to="/elenco" className="underline">Ver elenco</Link></p>

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link to="/elenco" className="text-sm font-semibold text-texto-suave hover:text-preto">Voltar para o elenco</Link>
      <h1 className="mt-2 font-display text-5xl font-extrabold">{jogador.nome}</h1>
      <p className="text-texto-suave">
        {[jogador.posicao, jogador.tipo === 'convidado' ? 'Convidado' : 'Fixo', jogador.ativo === false ? 'inativo' : null].filter(Boolean).join(', ')}
      </p>

      <dl className="mt-5 grid grid-cols-5 gap-px overflow-hidden rounded-lg border-2 border-preto bg-preto text-center">
        {[['Jogos', total.jogos], ['Gols', total.gols], ['Assist.', total.assist], ['G+A', total.ga], ['Melhor', total.melhores]].map(([r, v]) => (
          <div key={r} className="bg-papel py-2">
            <dd className="font-display text-3xl font-bold tabular-nums">{v || 0}</dd>
            <dt className="text-xs text-texto-suave">{r}</dt>
          </div>
        ))}
      </dl>
      <p className="mt-1 text-sm text-texto-suave">Total desde que o site começou a registrar.</p>

      {porTemporada.length > 1 && (
        <section className="mt-6">
          <h2 className="font-display text-2xl font-bold">Por temporada</h2>
          <table className="mt-2 w-full text-center">
            <thead><tr className="text-sm text-texto-suave"><th className="text-left">Ano</th><th>J</th><th>G</th><th>A</th><th>MC</th></tr></thead>
            <tbody>{porTemporada.map((t) => (
              <tr key={t.ano} className="border-t border-linha tabular-nums"><td className="py-1 text-left font-semibold">{t.ano}</td><td>{t.jogos}</td><td>{t.gols}</td><td>{t.assist}</td><td>{t.melhores}</td></tr>
            ))}</tbody>
          </table>
        </section>
      )}

      <section className="mt-6">
        <h2 className="font-display text-2xl font-bold">Jogos ({partidas.length})</h2>
        <ul className="mt-2 divide-y divide-linha rounded-lg border border-linha">
          {partidas.map((j) => {
            const s = j.sumula
            const marcas = [
              s.gols?.[id] && `${s.gols[id]} ${s.gols[id] > 1 ? 'gols' : 'gol'}`,
              s.assistencias?.[id] && `${s.assistencias[id]} assist.`,
              s.melhores?.includes(id) && 'melhor em campo',
            ].filter(Boolean)
            const res = resultado(j.placar)
            return (
              <li key={j.id}>
                <Link to={`/jogos/${j.id}`} className="flex items-center gap-3 px-3 py-2 hover:bg-cimento">
                  <span className="w-16 shrink-0 font-display text-lg font-bold">{formatarData(j.data, { diaSemana: false })}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{adversarios[j.adversarioId]?.nome || 'Adversário'}</span>
                    {marcas.length > 0 && <span className="block text-sm text-texto-suave">{marcas.join(', ')}</span>}
                  </span>
                  <span className="font-display text-xl font-bold tabular-nums">{j.placar.nos} x {j.placar.eles}</span>
                  <span className={`${CORES_RESULTADO[res]} inline-flex h-6 w-6 items-center justify-center rounded text-sm font-bold`}>{res}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
