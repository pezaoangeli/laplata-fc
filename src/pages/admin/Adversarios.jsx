import { useMemo, useState } from 'react'
import { collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { db } from '../../firebase.js'
import { useCollection } from '../../lib/useCollection.js'
import { MOTIVOS, SITUACOES } from '../../lib/constantes.js'
import SituacaoBadge from '../../components/SituacaoBadge.jsx'

const vazio = { nome: '', cidade: '', situacao: 'liberado', motivos: [], observacao: '' }

export default function Adversarios() {
  const { dados: publicos, carregando } = useCollection('adversarios')
  const { dados: privados } = useCollection('adversariosPrivado')
  const [filtro, setFiltro] = useState('todos')
  const [busca, setBusca] = useState('')
  const [form, setForm] = useState(null)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  // Junta os dados públicos (nome, cidade) com o controle interno (situação, motivos, observação)
  const adversarios = useMemo(() => {
    const porId = Object.fromEntries(privados.map((p) => [p.id, p]))
    return publicos.map((a) => ({
      ...a,
      situacao: porId[a.id]?.situacao || 'liberado',
      motivos: porId[a.id]?.motivos || [],
      observacao: porId[a.id]?.observacao || '',
    }))
  }, [publicos, privados])

  const contagem = (s) => adversarios.filter((a) => a.situacao === s).length
  const visiveis = adversarios.filter(
    (a) =>
      (filtro === 'todos' || a.situacao === filtro) &&
      `${a.nome} ${a.cidade || ''}`.toLowerCase().includes(busca.toLowerCase())
  )

  async function salvar(e) {
    e.preventDefault()
    const nome = form.nome.trim()
    if (!nome) return setErro('Preencha o nome do time.')
    if (adversarios.some((a) => a.id !== form.id && a.nome.toLowerCase() === nome.toLowerCase()))
      return setErro('Já existe um adversário com esse nome.')
    if (form.situacao !== 'liberado' && form.motivos.length === 0)
      return setErro('Marque pelo menos um motivo.')

    setSalvando(true)
    setErro('')
    try {
      const id = form.id || doc(collection(db, 'adversarios')).id
      const lote = writeBatch(db)
      lote.set(doc(db, 'adversarios', id), { nome, cidade: form.cidade.trim(), atualizadoEm: serverTimestamp() }, { merge: true })
      lote.set(doc(db, 'adversariosPrivado', id), {
        situacao: form.situacao,
        motivos: form.situacao === 'liberado' ? [] : form.motivos,
        observacao: form.observacao.trim(),
        atualizadoEm: serverTimestamp(),
      })
      await lote.commit()
      setForm(null)
    } catch {
      setErro('Não foi possível salvar. Confira sua conexão e tente de novo.')
    } finally {
      setSalvando(false)
    }
  }

  async function excluir(a) {
    if (!window.confirm(`Excluir ${a.nome} e todo o controle interno dele?`)) return
    const lote = writeBatch(db)
    lote.delete(doc(db, 'adversarios', a.id))
    lote.delete(doc(db, 'adversariosPrivado', a.id))
    await lote.commit()
  }

  const alternarMotivo = (m) =>
    setForm((f) => ({ ...f, motivos: f.motivos.includes(m) ? f.motivos.filter((x) => x !== m) : [...f.motivos, m] }))

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl font-bold">Adversários</h1>
          <p className="text-texto-suave">Situação, motivos e observações só aparecem para admins.</p>
        </div>
        {!form && (
          <button onClick={() => { setForm(vazio); setErro('') }}
            className="rounded-md bg-sangue px-4 py-2 font-display text-lg font-bold text-papel hover:bg-sangue-escuro">
            Adicionar adversário
          </button>
        )}
      </div>

      {form && (
        <form onSubmit={salvar} className="mt-5 grid gap-4 rounded-lg border-2 border-preto bg-papel p-4 sm:grid-cols-2">
          <h2 className="font-display text-2xl font-bold sm:col-span-2">{form.id ? `Editar ${form.nome}` : 'Novo adversário'}</h2>
          <div>
            <label className="rotulo" htmlFor="nome">Nome do time</label>
            <input id="nome" className="campo" autoFocus value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </div>
          <div>
            <label className="rotulo" htmlFor="cidade">Cidade</label>
            <input id="cidade" className="campo" value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} />
          </div>

          <div className="rounded-md bg-cimento p-3 sm:col-span-2">
            <p className="font-display text-xl font-bold">Controle interno</p>
            <fieldset className="mt-2">
              <legend className="rotulo">Situação</legend>
              <div className="flex flex-wrap gap-2">
                {Object.entries(SITUACOES).map(([valor, s]) => (
                  <label key={valor}
                    className={`flex cursor-pointer items-center gap-2 rounded-md border-2 px-3 py-1.5 ${
                      form.situacao === valor ? 'border-preto bg-papel' : 'border-transparent'
                    }`}>
                    <input type="radio" name="situacao" checked={form.situacao === valor}
                      onChange={() => setForm({ ...form, situacao: valor })} />
                    {s.rotulo}
                  </label>
                ))}
              </div>
            </fieldset>

            {form.situacao !== 'liberado' && (
              <fieldset className="mt-3">
                <legend className="rotulo">Motivos</legend>
                <div className="grid gap-1 sm:grid-cols-2">
                  {Object.entries(MOTIVOS).map(([valor, rotulo]) => (
                    <label key={valor} className="flex items-center gap-2">
                      <input type="checkbox" checked={form.motivos.includes(valor)} onChange={() => alternarMotivo(valor)} />
                      {rotulo}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            <div className="mt-3">
              <label className="rotulo" htmlFor="obs">Observação</label>
              <textarea id="obs" rows={3} className="campo" placeholder="O que aconteceu, quando, com quem falar…"
                value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} />
            </div>
          </div>

          {erro && <p className="font-semibold text-sangue-escuro sm:col-span-2" role="alert">{erro}</p>}
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" disabled={salvando}
              className="rounded-md bg-preto px-4 py-2 font-display text-lg font-bold text-papel disabled:opacity-60">
              {salvando ? 'Salvando…' : 'Salvar adversário'}
            </button>
            <button type="button" onClick={() => setForm(null)} className="px-4 py-2 font-semibold text-texto-suave">Cancelar</button>
          </div>
        </form>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {[['todos', `Todos (${adversarios.length})`],
          ['liberado', `Liberados (${contagem('liberado')})`],
          ['cautela', `Com cautela (${contagem('cautela')})`],
          ['nao_marcar', `Não marcar (${contagem('nao_marcar')})`]].map(([v, r]) => (
          <button key={v} onClick={() => setFiltro(v)}
            className={`rounded-full px-3 py-1 text-sm font-semibold ${filtro === v ? 'bg-preto text-papel' : 'bg-papel text-preto'}`}>
            {r}
          </button>
        ))}
        <input type="search" placeholder="Buscar time ou cidade" className="campo ml-auto max-w-xs"
          value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar adversário" />
      </div>

      {carregando ? (
        <p className="mt-6 text-texto-suave">Carregando…</p>
      ) : (
        <ul className="mt-4 divide-y divide-linha rounded-lg bg-papel">
          {visiveis.map((a) => (
            <li key={a.id} className="flex items-start gap-3 px-3 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{a.nome}</p>
                  <SituacaoBadge situacao={a.situacao} />
                </div>
                <p className="text-sm text-texto-suave">{a.cidade || 'Cidade não informada'}</p>
                {a.motivos.length > 0 && (
                  <p className="mt-1 text-sm">{a.motivos.map((m) => MOTIVOS[m]).join(', ')}</p>
                )}
                {a.observacao && <p className="mt-1 text-sm italic text-texto-suave">{a.observacao}</p>}
              </div>
              <button onClick={() => { setForm({ ...vazio, ...a }); setErro('') }} className="rounded px-2 py-1 text-sm font-semibold hover:bg-cimento">Editar</button>
              <button onClick={() => excluir(a)} className="rounded px-2 py-1 text-sm font-semibold text-sangue-escuro hover:bg-cimento">Excluir</button>
            </li>
          ))}
          {visiveis.length === 0 && <li className="px-3 py-3 text-texto-suave">Nenhum adversário nesse filtro.</li>}
        </ul>
      )}
    </div>
  )
}
