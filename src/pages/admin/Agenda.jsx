import { useMemo, useState } from 'react'
import { collection, doc, serverTimestamp, updateDoc, writeBatch } from 'firebase/firestore'
import { db } from '../../firebase.js'
import { formatarData, nomeMes, porId, tipoJogo, useJogos } from '../../lib/jogos.js'
import { ESTADOS, analisarAgenda, datasParaTime, sugestoesParaData, textoWhatsApp } from '../../lib/agenda.js'
import { MOTIVOS } from '../../lib/constantes.js'
import { temporadaAtual } from '../../lib/temporadas.js'
import { useCollection } from '../../lib/useCollection.js'
import SeletorTemporada from '../../components/SeletorTemporada.jsx'
import SituacaoBadge from '../../components/SituacaoBadge.jsx'

const curto = (iso) => formatarData(iso, { diaSemana: false })

export default function Agenda() {
  const [temporada, setTemporada] = useState(temporadaAtual() + 1)
  const { jogos, carregando } = useJogos(temporada)
  const { dados: listaAdv } = useCollection('adversarios')
  const { dados: listaPriv } = useCollection('adversariosPrivado')
  const { dados: listaLocais } = useCollection('locais')
  const locais = porId(listaLocais)
  const [selecionada, setSelecionada] = useState(null) // id do jogo/data
  const [filtroTimes, setFiltroTimes] = useState('pendentes')
  const [timeAberto, setTimeAberto] = useState(null)
  const [copiado, setCopiado] = useState(false)

  const a = useMemo(() => analisarAgenda({ jogos, adversarios: listaAdv, privados: porId(listaPriv) }), [jogos, listaAdv, listaPriv])
  const adversarios = porId(a.times)
  const arenaId = listaLocais.find((l) => l.nome.toLowerCase() === 'arena')?.id || null
  const jogoSel = jogos.find((j) => j.id === selecionada)

  async function marcar(livre, time) {
    await updateDoc(doc(db, 'jogos', livre.id), {
      adversarioId: time.id,
      localId: livre.localId || (livre.mando === 'casa' ? arenaId : null),
      atualizadoEm: serverTimestamp(),
    })
  }
  const desmarcar = (j) => updateDoc(doc(db, 'jogos', j.id), { adversarioId: null, atualizadoEm: serverTimestamp() })
  const trocarMando = (j) => updateDoc(doc(db, 'jogos', j.id), { mando: j.mando === 'casa' ? 'fora' : 'casa', atualizadoEm: serverTimestamp() })

  const alertas = [
    ...a.times.filter((t) => t.total && t.situacao === 'nao_marcar').map((t) => `${t.nome} está marcado, mas consta como "não marcar" (${t.motivos.map((m) => MOTIVOS[m]).join(', ') || 'sem motivo'}).`),
    ...a.times.filter((t) => t.estado === 'mando_repetido').map((t) => `${t.nome} tem os dois jogos ${t.casa.length ? 'em casa' : 'fora'}: ${[...t.casa, ...t.fora].map((j) => curto(j.data)).join(' e ')}.`),
    ...a.times.filter((t) => t.estado === 'mais').map((t) => `${t.nome} tem ${t.total} jogos marcados.`),
    ...a.sequenciasFora.map((s) => `${s.length} sábados seguidos fora, de ${curto(s[0].data)} a ${curto(s.at(-1).data)}.`),
  ]

  const timesFiltrados = a.times
    .filter((t) => (filtroTimes === 'pendentes' ? ['falta_casa', 'falta_fora', 'mando_repetido', 'mais'].includes(t.estado)
      : filtroTimes === 'completos' ? t.estado === 'completo'
      : filtroTimes === 'sem' ? t.estado === 'nenhum' && t.situacao !== 'nao_marcar'
      : true))
    .sort((x, y) => y.total - x.total || x.nome.localeCompare(y.nome, 'pt-BR'))

  const texto = textoWhatsApp(a.livres, temporada)

  if (carregando) return <p className="text-texto-suave">Carregando…</p>

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl font-bold">Agenda {temporada}</h1>
          <p className="text-texto-suave">Monte a temporada: meta de 2 jogos por time, um em casa e outro fora.</p>
        </div>
        <SeletorTemporada valor={temporada} onChange={(v) => { setTemporada(v); setSelecionada(null) }} />
      </div>

      {jogos.length === 0 ? <CriarSabados temporada={temporada} /> : (
        <>
          {/* Resumo */}
          <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ['Jogos marcados', a.marcados.length, `${a.casa} em casa, ${a.fora} fora`],
              ['Datas livres', a.livres.length, `${a.livres.filter((l) => l.mando === 'casa').length} em casa, ${a.livres.filter((l) => l.mando !== 'casa').length} fora`],
              ['Times completos', a.times.filter((t) => t.estado === 'completo').length, 'com 1 em casa e 1 fora'],
              ['Times pendentes', a.times.filter((t) => ['falta_casa', 'falta_fora', 'mando_repetido', 'mais'].includes(t.estado)).length, 'com algo a resolver'],
            ].map(([r, v, d]) => (
              <div key={r} className="rounded-lg bg-papel px-3 py-2">
                <dt className="text-sm text-texto-suave">{r}</dt>
                <dd className="font-display text-3xl font-bold tabular-nums">{v}</dd>
                <dd className="text-xs text-texto-suave">{d}</dd>
              </div>
            ))}
          </dl>

          {alertas.length > 0 && (
            <div className="mt-4 rounded-md border-l-4 border-cautela bg-cautela/10 p-3" role="alert">
              <p className="font-semibold">Pontos de atenção</p>
              <ul className="mt-1 list-disc pl-5 text-sm">{alertas.map((t) => <li key={t}>{t}</li>)}</ul>
            </div>
          )}

          {/* Calendário */}
          <section className="mt-6">
            <h2 className="font-display text-2xl font-bold">Calendário</h2>
            <p className="text-sm text-texto-suave">Toque numa data livre para ver quais times encaixam nela.</p>
            <Legenda />
            <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {agruparMeses(jogos).map(({ mes, itens }) => (
                <div key={mes} className="rounded-lg bg-papel p-3">
                  <p className="font-display text-xl font-bold">{mes}</p>
                  <ul className="mt-1 space-y-1">
                    {itens.map((j) => (
                      <li key={j.id}>
                        <button onClick={() => setSelecionada(j.id === selecionada ? null : j.id)}
                          aria-pressed={j.id === selecionada}
                          className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm ${estiloData(j)} ${j.id === selecionada ? 'ring-2 ring-preto' : ''}`}>
                          <span className="w-12 shrink-0 font-display text-base font-bold">{curto(j.data)}</span>
                          <span className="w-4 shrink-0 text-xs font-bold" title={j.mando === 'casa' ? 'Em casa' : 'Fora'}>{tipoJogo(j) === 'evento' ? '' : j.mando === 'casa' ? 'C' : 'F'}</span>
                          <span className="truncate">{rotuloData(j, adversarios)}</span>
                        </button>
                        {j.id === selecionada && jogoSel && (
                          <PainelData jogo={jogoSel} times={a.times} adversarios={adversarios} locais={locais}
                            onMarcar={marcar} onDesmarcar={desmarcar} onTrocarMando={trocarMando} />
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          {/* Times */}
          <section className="mt-8">
            <h2 className="font-display text-2xl font-bold">Adversários</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {[['pendentes', 'Pendentes'], ['completos', 'Completos'], ['sem', 'Sem jogo marcado'], ['todos', 'Todos']].map(([v, r]) => (
                <button key={v} onClick={() => setFiltroTimes(v)}
                  className={`rounded-full px-3 py-1 text-sm font-semibold ${filtroTimes === v ? 'bg-preto text-papel' : 'bg-papel'}`}>{r}</button>
              ))}
            </div>
            <ul className="mt-3 divide-y divide-linha rounded-lg bg-papel">
              {timesFiltrados.map((t) => {
                const opcoes = timeAberto === t.id ? datasParaTime(t, a.livres) : []
                return (
                  <li key={t.id} className="px-3 py-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{t.nome}</span>
                      {t.cidade && <span className="text-sm text-texto-suave">{t.cidade}</span>}
                      {t.situacao !== 'liberado' && <SituacaoBadge situacao={t.situacao} />}
                      <span className={`ml-auto rounded px-2 py-0.5 text-xs font-semibold ${ESTADOS[t.estado].cor}`}>{ESTADOS[t.estado].rotulo}</span>
                    </div>
                    {t.total > 0 && (
                      <p className="mt-0.5 text-sm text-texto-suave">
                        {[...t.casa.map((j) => `${curto(j.data)} em casa`), ...t.fora.map((j) => `${curto(j.data)} fora`)].join(', ')}
                      </p>
                    )}
                    {t.situacao !== 'nao_marcar' && t.total < 2 && (
                      <button onClick={() => setTimeAberto(timeAberto === t.id ? null : t.id)} aria-expanded={timeAberto === t.id}
                        className="mt-1 text-sm font-semibold text-sangue-escuro">
                        {timeAberto === t.id ? 'Fechar datas' : 'Ver datas livres que servem ›'}
                      </button>
                    )}
                    {timeAberto === t.id && (
                      <ul className="mt-2 space-y-1">
                        {opcoes.map((l) => (
                          <li key={l.id} className="flex items-center gap-3 rounded bg-cimento px-2 py-1.5 text-sm">
                            <span className="font-display text-base font-bold">{formatarData(l.data)}</span>
                            <span>{l.mando === 'casa' ? 'em casa' : 'fora'}</span>
                            {l.distancia != null && <span className="text-texto-suave">{l.distancia} semanas do outro jogo</span>}
                            <button onClick={() => marcar(l, t)} className="ml-auto rounded bg-preto px-2 py-1 font-semibold text-papel">Marcar</button>
                          </li>
                        ))}
                        {opcoes.length === 0 && <li className="text-sm text-texto-suave">Nenhuma data livre com o mando que falta.</li>}
                      </ul>
                    )}
                  </li>
                )
              })}
              {timesFiltrados.length === 0 && <li className="px-3 py-3 text-texto-suave">Nenhum time nesse filtro.</li>}
            </ul>
          </section>

          {/* WhatsApp */}
          <section className="mt-8">
            <h2 className="font-display text-2xl font-bold">Datas livres para o WhatsApp</h2>
            <textarea readOnly rows={7} className="campo mt-2 font-mono text-sm" value={texto} aria-label="Texto das datas livres" />
            <button onClick={async () => { await navigator.clipboard.writeText(texto); setCopiado(true); setTimeout(() => setCopiado(false), 2000) }}
              className="mt-2 rounded-md bg-sangue px-4 py-2 font-display text-lg font-bold text-papel">
              {copiado ? 'Copiado' : 'Copiar texto'}
            </button>
          </section>
        </>
      )}
    </div>
  )
}

function agruparMeses(jogos) {
  const g = []
  for (const j of jogos) {
    const mes = nomeMes(j.data)
    if (!g.length || g.at(-1).mes !== mes) g.push({ mes, itens: [] })
    g.at(-1).itens.push(j)
  }
  return g
}

function estiloData(j) {
  if (j.status === 'cancelado') return 'text-texto-suave line-through'
  if (tipoJogo(j) !== 'jogo') return 'bg-sangue text-papel'
  if (!j.adversarioId) return j.mando === 'casa' ? 'border-2 border-dashed border-liberado text-liberado' : 'border-2 border-dashed border-texto-suave text-texto-suave'
  return 'bg-cimento hover:bg-linha'
}

function rotuloData(j, adversarios) {
  if (j.status === 'cancelado') return 'Cancelado'
  if (tipoJogo(j) !== 'jogo') return j.titulo || 'Evento'
  return adversarios[j.adversarioId]?.nome || 'Livre'
}

function Legenda() {
  return (
    <div className="mt-2 flex flex-wrap gap-3 text-xs">
      <span className="rounded border-2 border-dashed border-liberado px-2 py-0.5 text-liberado">Livre em casa</span>
      <span className="rounded border-2 border-dashed border-texto-suave px-2 py-0.5 text-texto-suave">Livre fora</span>
      <span className="rounded bg-papel px-2 py-0.5">Marcado</span>
      <span className="rounded bg-sangue px-2 py-0.5 text-papel">Evento ou jogo interno</span>
      <span>C = casa, F = fora</span>
    </div>
  )
}

function PainelData({ jogo, times, adversarios, locais, onMarcar, onDesmarcar, onTrocarMando }) {
  const [outro, setOutro] = useState('')
  if (tipoJogo(jogo) !== 'jogo' || jogo.status === 'cancelado') {
    return <p className="mx-1 mb-2 mt-1 rounded bg-cimento p-2 text-sm">Para mudar esta data, use a aba Jogos.</p>
  }
  const local = locais[jogo.localId]
  if (jogo.adversarioId) {
    const t = adversarios[jogo.adversarioId]
    return (
      <div className="mx-1 mb-2 mt-1 rounded border border-linha bg-papel p-2 text-sm">
        <p><strong>{t?.nome}</strong>, {jogo.mando === 'casa' ? 'em casa' : 'fora'}{local ? `, ${local.nome}` : ''}{jogo.horario ? `, ${jogo.horario.replace(':00', 'h')}` : ''}</p>
        {t?.situacao !== 'liberado' && <p className="mt-1"><SituacaoBadge situacao={t?.situacao} /></p>}
        <button onClick={() => onDesmarcar(jogo)} className="mt-2 font-semibold text-sangue-escuro">Desmarcar (volta a ser data livre)</button>
      </div>
    )
  }
  const sugestoes = sugestoesParaData(jogo, times)
  const principais = sugestoes.filter((s) => s.total === 1)
  const semJogo = sugestoes.filter((s) => s.total === 0)
  return (
    <div className="mx-1 mb-2 mt-1 rounded border border-linha bg-papel p-2 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span>Data livre {jogo.mando === 'casa' ? 'em casa' : 'fora'}.</span>
        <button onClick={() => onTrocarMando(jogo)} className="font-semibold underline">Mudar para {jogo.mando === 'casa' ? 'fora' : 'casa'}</button>
      </div>
      <p className="mt-2 font-semibold">Faltam este mando</p>
      <ListaSugestoes itens={principais} onEscolher={(t) => onMarcar(jogo, t)} vazio="Nenhum time precisa desse mando." />
      {semJogo.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer font-semibold">Times sem jogo marcado ({semJogo.length})</summary>
          <ListaSugestoes itens={semJogo} onEscolher={(t) => onMarcar(jogo, t)} />
        </details>
      )}
      <div className="mt-2 flex gap-2">
        <select className="campo py-1 text-sm" value={outro} onChange={(e) => setOutro(e.target.value)} aria-label="Escolher outro time">
          <option value="">Outro time…</option>
          {times.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
        </select>
        <button disabled={!outro} onClick={() => onMarcar(jogo, adversarios[outro])} className="rounded bg-preto px-3 font-semibold text-papel disabled:opacity-40">Marcar</button>
      </div>
    </div>
  )
}

function ListaSugestoes({ itens, onEscolher, vazio }) {
  if (!itens.length) return vazio ? <p className="text-texto-suave">{vazio}</p> : null
  return (
    <ul className="mt-1 space-y-1">
      {itens.map((t) => (
        <li key={t.id} className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate">
            {t.nome}
            {t.distancia != null && <span className="text-texto-suave">, {t.distancia} sem. do outro jogo</span>}
            {t.situacao === 'cautela' && <span className="ml-1 font-semibold text-cautela">(cautela)</span>}
          </span>
          <button onClick={() => onEscolher(t)} className="rounded bg-preto px-2 py-0.5 font-semibold text-papel">Marcar</button>
        </li>
      ))}
    </ul>
  )
}

// Cria todos os sábados entre duas datas como datas livres (para começar uma temporada do zero)
function CriarSabados({ temporada }) {
  const [inicio, setInicio] = useState(`${temporada}-02-01`)
  const [fim, setFim] = useState(`${temporada}-12-15`)
  const [estado, setEstado] = useState('')

  async function criar() {
    setEstado('criando')
    const lote = writeBatch(db)
    const d = new Date(`${inicio}T12:00:00`)
    while (d.getDay() !== 6) d.setDate(d.getDate() + 1)
    let casa = true, n = 0
    for (; d <= new Date(`${fim}T12:00:00`); d.setDate(d.getDate() + 7)) {
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      lote.set(doc(collection(db, 'jogos')), {
        data: iso, temporada: d.getFullYear(), horario: casa ? '14:00' : '', mando: casa ? 'casa' : 'fora',
        tipo: 'jogo', titulo: '', status: 'agendado', adversarioId: null, localId: null, placar: null, sumula: null,
        criadoEm: serverTimestamp(), atualizadoEm: serverTimestamp(),
      })
      casa = !casa; n++
    }
    await lote.commit()
    setEstado(`${n} sábados criados.`)
  }

  return (
    <div className="mt-6 max-w-lg rounded-lg border-2 border-preto bg-papel p-4">
      <p className="font-display text-2xl font-bold">Nenhuma data em {temporada}</p>
      <p className="mt-1 text-sm text-texto-suave">
        Crie todos os sábados do período como datas livres, alternando casa e fora. Depois dá para mudar o mando de cada data no calendário.
        Se a agenda já existe numa planilha, use Importar dados.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div><label className="rotulo" htmlFor="ini">Primeiro dia</label><input id="ini" type="date" className="campo" value={inicio} onChange={(e) => setInicio(e.target.value)} /></div>
        <div><label className="rotulo" htmlFor="fim">Último dia</label><input id="fim" type="date" className="campo" value={fim} onChange={(e) => setFim(e.target.value)} /></div>
      </div>
      <button onClick={criar} disabled={estado === 'criando'} className="mt-3 rounded-md bg-sangue px-4 py-2 font-display text-lg font-bold text-papel disabled:opacity-60">
        {estado === 'criando' ? 'Criando…' : 'Criar sábados'}
      </button>
      {estado && estado !== 'criando' && <p className="mt-2" role="status">{estado}</p>}
    </div>
  )
}
