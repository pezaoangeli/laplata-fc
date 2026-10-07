import { useState } from 'react'
import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../../firebase.js'
import { useCollection } from '../../lib/useCollection.js'
import { useRolarAte } from '../../lib/useRolarAte.js'
import { POSICOES } from '../../lib/constantes.js'

const vazio = { nome: '', posicao: '', tipo: 'fixo', ativo: true }

export default function Jogadores() {
  const { dados: jogadores, carregando } = useCollection('jogadores')
  const [form, setForm] = useState(null) // null = formulário fechado
  const formRef = useRolarAte(form ? form.id || 'novo' : null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const fixos = jogadores.filter((j) => j.tipo !== 'convidado')
  const convidados = jogadores.filter((j) => j.tipo === 'convidado')

  async function salvar(e) {
    e.preventDefault()
    const nome = form.nome.trim()
    if (!nome) return setErro('Preencha o nome.')
    const repetido = jogadores.some((j) => j.id !== form.id && j.nome.toLowerCase() === nome.toLowerCase())
    if (repetido) return setErro('Já existe um jogador com esse nome.')

    setSalvando(true)
    setErro('')
    const dados = { nome, posicao: form.posicao, tipo: form.tipo, ativo: form.ativo, atualizadoEm: serverTimestamp() }
    try {
      if (form.id) await updateDoc(doc(db, 'jogadores', form.id), dados)
      else await addDoc(collection(db, 'jogadores'), { ...dados, criadoEm: serverTimestamp() })
      setForm(null)
    } catch {
      setErro('Não foi possível salvar. Confira sua conexão e tente de novo.')
    } finally {
      setSalvando(false)
    }
  }

  async function excluir(j) {
    const ok = window.confirm(
      `Excluir ${j.nome}?\n\nSe ele só parou de jogar, prefira desmarcar "Ativo": assim o histórico dele continua nas estatísticas.`
    )
    if (ok) await deleteDoc(doc(db, 'jogadores', j.id))
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl font-bold">Jogadores</h1>
          <p className="text-texto-suave">{fixos.length} fixos e {convidados.length} convidados</p>
        </div>
        {!form && (
          <button onClick={() => { setForm(vazio); setErro('') }}
            className="rounded-md bg-sangue px-4 py-2 font-display text-lg font-bold text-papel hover:bg-sangue-escuro">
            Adicionar jogador
          </button>
        )}
      </div>

      {form && (
        <form ref={formRef} onSubmit={salvar} className="scroll-mt-4 mt-5 grid gap-4 rounded-lg border-2 border-preto bg-papel p-4 sm:grid-cols-2">
          <h2 className="font-display text-2xl font-bold sm:col-span-2">{form.id ? `Editar ${form.nome}` : 'Novo jogador'}</h2>
          <div>
            <label className="rotulo" htmlFor="nome">Nome ou apelido</label>
            <input id="nome" className="campo" value={form.nome} autoFocus
              onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </div>
          <div>
            <label className="rotulo" htmlFor="posicao">Posição</label>
            <select id="posicao" className="campo" value={form.posicao}
              onChange={(e) => setForm({ ...form, posicao: e.target.value })}>
              <option value="">Não informada</option>
              {POSICOES.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          <fieldset>
            <legend className="rotulo">Tipo</legend>
            <div className="flex gap-4">
              {[['fixo', 'Fixo'], ['convidado', 'Convidado']].map(([v, r]) => (
                <label key={v} className="flex items-center gap-2">
                  <input type="radio" name="tipo" checked={form.tipo === v} onChange={() => setForm({ ...form, tipo: v })} />
                  {r}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="flex items-center gap-2 self-end">
            <input type="checkbox" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} />
            Ativo (ainda joga no time)
          </label>
          {erro && <p className="font-semibold text-sangue-escuro sm:col-span-2" role="alert">{erro}</p>}
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" disabled={salvando}
              className="rounded-md bg-preto px-4 py-2 font-display text-lg font-bold text-papel disabled:opacity-60">
              {salvando ? 'Salvando…' : 'Salvar jogador'}
            </button>
            <button type="button" onClick={() => setForm(null)} className="rounded-md px-4 py-2 font-semibold text-texto-suave">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {carregando ? (
        <p className="mt-6 text-texto-suave">Carregando…</p>
      ) : jogadores.length === 0 ? (
        <p className="mt-6 text-texto-suave">
          Nenhum jogador cadastrado. Use "Importar dados" para trazer o elenco da planilha, ou adicione um por um.
        </p>
      ) : (
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <Lista titulo="Fixos" itens={fixos} onEditar={(j) => { setForm({ ...vazio, ...j }); setErro('') }} onExcluir={excluir} />
          <Lista titulo="Convidados" itens={convidados} onEditar={(j) => { setForm({ ...vazio, ...j }); setErro('') }} onExcluir={excluir} />
        </div>
      )}
    </div>
  )
}

function Lista({ titulo, itens, onEditar, onExcluir }) {
  return (
    <section>
      <h2 className="font-display text-2xl font-bold">{titulo}</h2>
      <ul className="mt-2 divide-y divide-linha rounded-lg bg-papel">
        {itens.map((j) => (
          <li key={j.id} className={`flex items-center gap-3 px-3 py-2 ${j.ativo === false ? 'opacity-50' : ''}`}>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{j.nome}</p>
              <p className="text-sm text-texto-suave">
                {j.posicao || 'Posição não informada'}{j.ativo === false ? ', inativo' : ''}
              </p>
            </div>
            <button onClick={() => onEditar(j)} className="rounded px-2 py-1 text-sm font-semibold hover:bg-cimento">Editar</button>
            <button onClick={() => onExcluir(j)} className="rounded px-2 py-1 text-sm font-semibold text-sangue-escuro hover:bg-cimento">Excluir</button>
          </li>
        ))}
        {itens.length === 0 && <li className="px-3 py-2 text-texto-suave">Ninguém aqui ainda.</li>}
      </ul>
    </section>
  )
}
