import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../../firebase.js'
import { formatarData, porId, useJogo } from '../../lib/jogos.js'
import { useCollection } from '../../lib/useCollection.js'

const limparMapa = (m) => Object.fromEntries(Object.entries(m).filter(([, v]) => v > 0))
const soma = (m) => Object.values(m).reduce((s, v) => s + v, 0)
const alternar = (lista, id) => (lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id])

export default function Sumula() {
  const { id } = useParams()
  const navigate = useNavigate()
  const jogo = useJogo(id)
  const { dados: jogadores } = useCollection('jogadores')
  const { dados: listaAdv } = useCollection('adversarios')
  const { dados: listaLocais } = useCollection('locais')
  const locais = porId(listaLocais)

  const [s, setS] = useState(null)
  const [mostrarInativos, setMostrarInativos] = useState(false)
  const [novoConvidado, setNovoConvidado] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  // Carrega a súmula existente uma única vez
  useEffect(() => {
    if (!jogo || s) return
    const su = jogo.sumula || {}
    setS({
      adversarioId: jogo.adversarioId || '',
      nos: jogo.placar?.nos ?? 0,
      eles: jogo.placar?.eles ?? 0,
      presentes: su.presentes || [],
      gols: su.gols || {},
      assistencias: su.assistencias || {},
      melhores: su.melhores || [],
      uniforme: su.uniforme || [],
      agua: su.agua || [],
    })
  }, [jogo, s])

  const lista = useMemo(() => {
    if (!s) return { fixos: [], convidados: [] }
    const visivel = (j) => j.ativo !== false || mostrarInativos || s.presentes.includes(j.id)
    return {
      fixos: jogadores.filter((j) => j.tipo !== 'convidado' && visivel(j)),
      convidados: jogadores.filter((j) => j.tipo === 'convidado' && visivel(j)),
    }
  }, [jogadores, s, mostrarInativos])

  if (jogo === undefined || (jogo && !s)) return <p className="text-texto-suave">Carregando…</p>
  if (jogo === null) return <p>Jogo não encontrado. <Link to="/admin/jogos" className="underline">Voltar</Link></p>

  const golsLancados = soma(s.gols)
  const assistLancadas = soma(s.assistencias)

  function marcarPresenca(jid) {
    setS((v) => {
      if (!v.presentes.includes(jid)) return { ...v, presentes: [...v.presentes, jid] }
      // Desmarcou: tira também gols, assistências e marcações dele
      const { [jid]: _g, ...gols } = v.gols
      const { [jid]: _a, ...assistencias } = v.assistencias
      return {
        ...v, gols, assistencias,
        presentes: v.presentes.filter((x) => x !== jid),
        melhores: v.melhores.filter((x) => x !== jid),
        uniforme: v.uniforme.filter((x) => x !== jid),
        agua: v.agua.filter((x) => x !== jid),
      }
    })
  }

  const mudarContagem = (campo, jid, delta) =>
    setS((v) => ({ ...v, [campo]: { ...v[campo], [jid]: Math.max(0, (v[campo][jid] || 0) + delta) } }))

  async function adicionarConvidado(e) {
    e.preventDefault()
    const nome = novoConvidado.trim()
    if (!nome) return
    const existente = jogadores.find((j) => j.nome.toLowerCase() === nome.toLowerCase())
    if (existente) {
      if (!s.presentes.includes(existente.id)) marcarPresenca(existente.id)
    } else {
      const ref = await addDoc(collection(db, 'jogadores'), {
        nome, tipo: 'convidado', posicao: '', ativo: true, criadoEm: serverTimestamp(), atualizadoEm: serverTimestamp(),
      })
      setS((v) => ({ ...v, presentes: [...v.presentes, ref.id] }))
    }
    setNovoConvidado('')
  }

  async function salvar() {
    setSalvando(true)
    setErro('')
    try {
      await updateDoc(doc(db, 'jogos', id), {
        adversarioId: s.adversarioId || null,
        status: 'realizado',
        placar: { nos: s.nos, eles: s.eles },
        sumula: {
          presentes: s.presentes,
          gols: limparMapa(s.gols),
          assistencias: limparMapa(s.assistencias),
          melhores: s.melhores,
          uniforme: s.uniforme,
          agua: s.agua,
        },
        atualizadoEm: serverTimestamp(),
      })
      navigate('/admin/jogos')
    } catch {
      setErro('Não foi possível salvar a súmula. Confira sua conexão e tente de novo.')
      setSalvando(false)
    }
  }

  async function desfazer() {
    if (!window.confirm('Apagar a súmula e voltar o jogo para "agendado"?')) return
    await updateDoc(doc(db, 'jogos', id), { status: 'agendado', placar: null, sumula: null, atualizadoEm: serverTimestamp() })
    navigate('/admin/jogos')
  }

  return (
    <div className="pb-28">
      <Link to="/admin/jogos" className="text-sm font-semibold text-texto-suave hover:text-preto">Voltar para os jogos</Link>
      <h1 className="mt-2 font-display text-4xl font-bold">Súmula</h1>
      <p className="text-texto-suave">
        {formatarData(jogo.data)}, {jogo.mando === 'casa' ? 'em casa' : 'fora'}
        {locais[jogo.localId] ? `, ${locais[jogo.localId].nome}` : ''}
      </p>

      {/* Adversário e placar */}
      <section className="mt-4 rounded-lg border-2 border-preto bg-papel p-4">
        <label className="rotulo" htmlFor="adv">Adversário (troque aqui se o time mudou)</label>
        <select id="adv" className="campo" value={s.adversarioId} onChange={(e) => setS({ ...s, adversarioId: e.target.value })}>
          <option value="">A definir</option>
          {listaAdv.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
        </select>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Placar rotulo="La Plata" valor={s.nos} onChange={(n) => setS({ ...s, nos: n })} />
          <Placar rotulo={listaAdv.find((a) => a.id === s.adversarioId)?.nome || 'Adversário'} valor={s.eles} onChange={(n) => setS({ ...s, eles: n })} vermelho />
        </div>
      </section>

      {/* Avisos de conferência */}
      <div className="mt-3 space-y-1 text-sm" aria-live="polite">
        {golsLancados !== s.nos && (
          <p className={golsLancados > s.nos ? 'font-semibold text-sangue-escuro' : 'text-cautela'}>
            Gols lançados nos jogadores: {golsLancados}. Placar do La Plata: {s.nos}.
            {golsLancados < s.nos ? ' A diferença conta como gol contra ou sem autor.' : ' Tem gol a mais nos jogadores.'}
          </p>
        )}
        {assistLancadas > golsLancados && (
          <p className="font-semibold text-sangue-escuro">Há mais assistências ({assistLancadas}) do que gols ({golsLancados}).</p>
        )}
      </div>

      {/* Jogadores */}
      <section className="mt-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-2xl font-bold">Quem jogou ({s.presentes.length})</h2>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={mostrarInativos} onChange={(e) => setMostrarInativos(e.target.checked)} />
            Mostrar inativos
          </label>
        </div>
        <p className="text-sm text-texto-suave">Toque no nome para marcar presença. Os números aparecem para quem jogou.</p>

        {[['Fixos', lista.fixos], ['Convidados', lista.convidados]].map(([titulo, itens]) => (
          <div key={titulo} className="mt-3">
            <h3 className="font-display text-xl font-bold">{titulo}</h3>
            <ul className="mt-1 divide-y divide-linha rounded-lg bg-papel">
              {itens.map((j) => (
                <LinhaJogador key={j.id} jogador={j} s={s}
                  onPresenca={() => marcarPresenca(j.id)}
                  onGol={(d) => mudarContagem('gols', j.id, d)}
                  onAssist={(d) => mudarContagem('assistencias', j.id, d)}
                  onMarca={(campo) => setS((v) => ({ ...v, [campo]: alternar(v[campo], j.id) }))} />
              ))}
            </ul>
          </div>
        ))}

        <form onSubmit={adicionarConvidado} className="mt-3 flex gap-2">
          <input className="campo" placeholder="Nome de um convidado novo" value={novoConvidado}
            onChange={(e) => setNovoConvidado(e.target.value)} aria-label="Nome do convidado novo" />
          <button type="submit" className="shrink-0 rounded-md border-2 border-preto px-3 font-semibold">Adicionar</button>
        </form>
      </section>

      {jogo.status === 'realizado' && (
        <button onClick={desfazer} className="mt-6 text-sm font-semibold text-sangue-escuro">Apagar súmula e voltar para agendado</button>
      )}

      {/* Barra fixa de salvar, confortável no celular */}
      <div className="fixed inset-x-0 bottom-0 border-t-2 border-preto bg-papel px-4 py-3">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <p className="flex-1 text-sm">
            <strong className="font-display text-xl">{s.nos} x {s.eles}</strong>, {s.presentes.length} jogadores, {golsLancados} gols lançados
          </p>
          {erro && <p className="text-sm font-semibold text-sangue-escuro" role="alert">{erro}</p>}
          <button onClick={salvar} disabled={salvando}
            className="rounded-md bg-sangue px-5 py-2.5 font-display text-xl font-bold text-papel hover:bg-sangue-escuro disabled:opacity-60">
            {salvando ? 'Salvando…' : 'Salvar súmula'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Placar({ rotulo, valor, onChange, vermelho }) {
  return (
    <div className={`rounded-md p-3 text-center ${vermelho ? 'bg-sangue text-papel' : 'bg-cimento'}`}>
      <p className="truncate font-display text-lg font-bold">{rotulo}</p>
      <div className="mt-1 flex items-center justify-center gap-3">
        <button type="button" onClick={() => onChange(Math.max(0, valor - 1))} aria-label={`Tirar gol de ${rotulo}`}
          className="h-10 w-10 rounded-full border-2 border-current text-2xl font-bold leading-none">−</button>
        <span className="w-12 font-display text-5xl font-extrabold tabular-nums">{valor}</span>
        <button type="button" onClick={() => onChange(valor + 1)} aria-label={`Somar gol para ${rotulo}`}
          className="h-10 w-10 rounded-full border-2 border-current text-2xl font-bold leading-none">+</button>
      </div>
    </div>
  )
}

function Contador({ rotulo, valor, onChange }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-sm font-semibold">{rotulo}</span>
      <button type="button" onClick={() => onChange(-1)} aria-label={`Diminuir ${rotulo}`}
        className="h-8 w-8 rounded-full border border-linha text-lg leading-none">−</button>
      <span className="w-6 text-center font-display text-xl font-bold tabular-nums">{valor}</span>
      <button type="button" onClick={() => onChange(1)} aria-label={`Aumentar ${rotulo}`}
        className="h-8 w-8 rounded-full border border-linha text-lg leading-none">+</button>
    </div>
  )
}

function Marca({ ativo, onClick, children }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={ativo}
      className={`rounded-full px-3 py-1 text-sm font-semibold ${ativo ? 'bg-preto text-papel' : 'border border-linha text-texto-suave'}`}>
      {children}
    </button>
  )
}

function LinhaJogador({ jogador, s, onPresenca, onGol, onAssist, onMarca }) {
  const presente = s.presentes.includes(jogador.id)
  return (
    <li className={presente ? 'bg-sangue/5' : ''}>
      <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5">
        <input type="checkbox" className="h-5 w-5 accent-[#D7141A]" checked={presente} onChange={onPresenca} />
        <span className={`font-semibold ${presente ? '' : 'text-texto-suave'}`}>{jogador.nome}</span>
        {jogador.posicao && <span className="text-sm text-texto-suave">{jogador.posicao}</span>}
      </label>
      {presente && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 pb-3 pl-11">
          <Contador rotulo="Gols" valor={s.gols[jogador.id] || 0} onChange={onGol} />
          <Contador rotulo="Assist." valor={s.assistencias[jogador.id] || 0} onChange={onAssist} />
          <div className="flex flex-wrap gap-1.5">
            {jogador.tipo !== 'convidado' && (
              <>
                <Marca ativo={s.melhores.includes(jogador.id)} onClick={() => onMarca('melhores')}>Melhor em campo</Marca>
                <Marca ativo={s.uniforme.includes(jogador.id)} onClick={() => onMarca('uniforme')}>Uniforme</Marca>
                <Marca ativo={s.agua.includes(jogador.id)} onClick={() => onMarca('agua')}>Água</Marca>
              </>
            )}
          </div>
        </div>
      )}
    </li>
  )
}
