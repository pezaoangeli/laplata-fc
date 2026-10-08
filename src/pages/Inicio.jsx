import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import Escudo from '../components/Escudo.jsx'
import { CORES_RESULTADO, formatarData, hojeISO, nomeConfronto, porId, resultado, useTodosJogos } from '../lib/jogos.js'
import { campanha, estatisticasJogadores, filaRodizio, lideres, realizados } from '../lib/estatisticas.js'
import { temporadaAtual } from '../lib/temporadas.js'
import { useCollection } from '../lib/useCollection.js'

export default function Inicio() {
  const ano = temporadaAtual()
  const { jogos } = useTodosJogos()
  const { dados: listaJogadores } = useCollection('jogadores')
  const adversarios = porId(useCollection('adversarios').dados)
  const locais = porId(useCollection('locais').dados)

  const daTemporada = useMemo(() => jogos.filter((j) => j.temporada === ano), [jogos, ano])
  const proximo = jogos.find((j) => j.status === 'agendado' && j.data >= hojeISO())
  const ultimo = realizados(jogos).at(-1)
  const c = campanha(daTemporada)
  const stats = useMemo(() => estatisticasJogadores(daTemporada), [daTemporada])
  const jogadores = porId(listaJogadores)
  const lista = Object.values(stats).filter((s) => jogadores[s.id])
  const destaques = [
    ['Artilharia', lideres(lista, 'gols'), 'gols'],
    ['Assistências', lideres(lista, 'assist'), 'assist'],
    ['Melhor em campo', lideres(lista, 'melhores'), 'melhores'],
  ]
  const fixosAtivos = listaJogadores.filter((j) => j.tipo !== 'convidado' && j.ativo !== false)
  const filaUniforme = filaRodizio(fixosAtivos, stats, 'uniforme', 'ultimoUniforme').slice(0, 3)
  const filaAgua = filaRodizio(fixosAtivos, stats, 'agua', 'ultimaAgua').slice(0, 3)

  return (
    <>
      {/* Topo preto: escudo e nome, sem cruzar a divisão branco/vermelho */}
      <section className="bg-preto text-papel">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-4 py-8 text-center sm:flex-row sm:justify-center sm:gap-8 sm:py-10 sm:text-left">
          <Escudo className="h-32 w-32 shrink-0 rounded-full bg-papel p-2 sm:h-40 sm:w-40" />
          <div>
            <h1 className="font-display text-6xl font-extrabold uppercase leading-[0.85] sm:text-8xl">La Plata</h1>
            <p className="mt-2 font-display text-xl font-bold uppercase tracking-[0.15em] text-[#E3262C] sm:text-2xl">Futebol Clube</p>
            <p className="mt-1 text-sm text-papel/70">Sapiranga-RS, desde 2022</p>
          </div>
        </div>
      </section>
      <div className="grid h-2.5 grid-cols-2" aria-hidden="true">
        <div className="bg-papel" />
        <div className="bg-sangue" />
      </div>

      {/* Próximo jogo, colado no topo */}
      <Link to="/jogos" className="block border-b border-linha hover:bg-cimento">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
          <span className="rounded bg-sangue px-2.5 py-0.5 font-display text-base font-bold uppercase tracking-wide text-papel">Próximo jogo</span>
          {proximo ? (
            <>
              <span className="font-display text-3xl font-extrabold leading-none">{nomeConfronto(proximo, adversarios)}</span>
              <span className="text-texto-suave">
                {formatarData(proximo.data)}{proximo.horario ? `, ${proximo.horario.replace(':00', 'h')}` : ''}, {proximo.mando === 'casa' ? 'em casa' : 'fora'}
                {locais[proximo.localId] ? `, ${locais[proximo.localId].nome}` : ''}
              </span>
            </>
          ) : <span className="text-texto-suave">Nenhum jogo agendado.</span>}
          <span className="ml-auto text-sm font-semibold text-sangue-escuro">Calendário <span aria-hidden="true">›</span></span>
        </div>
      </Link>

      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-8 md:grid-cols-2">
        {/* Último resultado */}
        <section className="overflow-hidden rounded-lg border-2 border-preto md:col-span-2">
          <h2 className="bg-sangue px-4 py-2 font-display text-2xl font-bold text-papel">Último resultado</h2>
          {ultimo ? (
            <Link to={`/jogos/${ultimo.id}`} className="block px-4 py-4 hover:bg-cimento">
              <div className="flex items-center gap-3">
                <p className="font-display text-5xl font-extrabold tabular-nums">{ultimo.placar.nos} x {ultimo.placar.eles}</p>
                <span className={`${CORES_RESULTADO[resultado(ultimo.placar)]} rounded px-2 py-0.5 font-display text-xl font-bold`}>{resultado(ultimo.placar)}</span>
              </div>
              <p className="mt-1 text-lg">contra {adversarios[ultimo.adversarioId]?.nome || 'adversário'}, {formatarData(ultimo.data)}</p>
              <p className="text-sm font-semibold text-sangue-escuro">Ver súmula <span aria-hidden="true">›</span></p>
            </Link>
          ) : <p className="px-4 py-4 text-texto-suave">Nenhum jogo com súmula ainda.</p>}
        </section>

        {/* Campanha */}
        <section className="md:col-span-2">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-3xl font-bold">Campanha {ano}</h2>
            <Link to="/numeros" className="text-sm font-semibold hover:underline">Todos os números</Link>
          </div>
          <dl className="mt-2 grid grid-cols-3 gap-px overflow-hidden rounded-lg border-2 border-preto bg-preto text-center sm:grid-cols-6">
            {[['Jogos', c.jogos], ['Vitórias', c.V], ['Empates', c.E], ['Derrotas', c.D], ['Gols pró', c.gf], ['Gols contra', c.gs]].map(([r, v]) => (
              <div key={r} className="bg-papel py-2">
                <dd className="font-display text-3xl font-bold tabular-nums">{v}</dd>
                <dt className="text-xs text-texto-suave sm:text-sm">{r}</dt>
              </div>
            ))}
          </dl>
        </section>

        {/* Destaques */}
        <section className="md:col-span-2">
          <h2 className="font-display text-3xl font-bold">Destaques da temporada</h2>
          <ul className="mt-2 grid gap-3 sm:grid-cols-3">
            {destaques.map(([titulo, l, campo]) => (
              <li key={titulo} className="rounded-lg bg-cimento px-4 py-3">
                <p className="text-sm font-semibold text-sangue-escuro">{titulo}</p>
                <p className="font-display text-2xl font-bold leading-tight">{l.map((x) => jogadores[x.id].nome).join(', ') || 'Ninguém ainda'}</p>
                {l[0] && <p className="text-texto-suave">{l[0][campo]}</p>}
              </li>
            ))}
          </ul>
        </section>

        {/* Rodízio */}
        <section className="md:col-span-2">
          <h2 className="font-display text-3xl font-bold">Rodízio</h2>
          <p className="text-sm text-texto-suave">Quem fez menos vezes na temporada vem primeiro. Empate: quem fez há mais tempo.</p>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {[['Uniforme', filaUniforme], ['Água', filaAgua]].map(([titulo, fila]) => (
              <div key={titulo} className="rounded-lg border border-linha px-4 py-3">
                <p className="font-display text-xl font-bold">{titulo}</p>
                <ol className="mt-1 space-y-1">
                  {fila.map((j, i) => (
                    <li key={j.id} className="flex justify-between gap-2">
                      <span className={i === 0 ? 'font-bold' : ''}>{i === 0 ? `Próximo: ${j.nome}` : j.nome}</span>
                      <span className="text-sm text-texto-suave">
                        {j.vezes ? `${j.vezes}x, última em ${formatarData(j.ultima, { diaSemana: false })}` : 'ainda não fez'}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  )
}
