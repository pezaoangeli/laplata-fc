import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CORES_RESULTADO, formatarData, resultado, useTodosJogos } from '../lib/jogos.js'
import { retrospecto } from '../lib/estatisticas.js'
import { useCollection } from '../lib/useCollection.js'

export default function AdversariosPublico() {
  const { jogos, carregando } = useTodosJogos()
  const { dados: adversarios } = useCollection('adversarios')
  const [aberto, setAberto] = useState(null)

  const lista = useMemo(() => {
    const r = retrospecto(jogos)
    return adversarios
      .filter((a) => r[a.id])
      .map((a) => ({ ...a, ...r[a.id], id: a.id }))
      .sort((a, b) => b.J - a.J || a.nome.localeCompare(b.nome, 'pt-BR'))
  }, [jogos, adversarios])

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-display text-5xl font-extrabold">Adversários</h1>
      <p className="text-texto-suave">Retrospecto contra cada time, somando todas as temporadas. Toque no time para ver os jogos.</p>
      {carregando ? <p className="mt-6 text-texto-suave">Carregando…</p> : (
        <ul className="mt-5 divide-y divide-linha rounded-lg border border-linha">
          {lista.map((a) => (
            <li key={a.id}>
              <button onClick={() => setAberto(aberto === a.id ? null : a.id)} aria-expanded={aberto === a.id}
                className="flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-cimento">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{a.nome}</span>
                  <span className="block text-sm text-texto-suave">
                    {a.cidade ? `${a.cidade}, ` : ''}{a.J} {a.J > 1 ? 'jogos' : 'jogo'}, gols {a.gf} x {a.gs}
                  </span>
                </span>
                <span className="flex gap-1 font-display text-lg font-bold tabular-nums">
                  <span className="rounded bg-liberado px-2 text-papel">{a.V}V</span>
                  <span className="rounded bg-texto-suave px-2 text-papel">{a.E}E</span>
                  <span className="rounded bg-sangue px-2 text-papel">{a.D}D</span>
                </span>
                <span aria-hidden="true" className={`text-xl text-texto-suave transition-transform ${aberto === a.id ? 'rotate-90' : ''}`}>›</span>
              </button>
              {aberto === a.id && (
                <ul className="bg-cimento px-3 py-2">
                  {[...a.jogos].reverse().map((j) => {
                    const res = resultado(j.placar)
                    return (
                      <li key={j.id}>
                        <Link to={`/jogos/${j.id}`} className="flex items-center gap-3 py-1.5 hover:underline">
                          <span className="flex-1">{formatarData(j.data, { diaSemana: false })} de {j.temporada}, {j.mando === 'casa' ? 'em casa' : 'fora'}</span>
                          <span className="font-display text-lg font-bold tabular-nums">{j.placar.nos} x {j.placar.eles}</span>
                          <span className={`${CORES_RESULTADO[res]} inline-flex h-6 w-6 items-center justify-center rounded text-sm font-bold`}>{res}</span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </li>
          ))}
          {lista.length === 0 && <li className="px-3 py-3 text-texto-suave">Nenhum jogo com súmula ainda.</li>}
        </ul>
      )}
    </div>
  )
}
