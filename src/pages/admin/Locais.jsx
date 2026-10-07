import { useState } from 'react'
import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../../firebase.js'
import { useCollection } from '../../lib/useCollection.js'

const vazio = { nome: '', cidade: '' }

export default function Locais() {
  const { dados: locais, carregando } = useCollection('locais')
  const [form, setForm] = useState(null)
  const [erro, setErro] = useState('')

  async function salvar(e) {
    e.preventDefault()
    const nome = form.nome.trim()
    if (!nome) return setErro('Preencha o nome do campo.')
    if (locais.some((l) => l.id !== form.id && l.nome.toLowerCase() === nome.toLowerCase()))
      return setErro('Já existe um campo com esse nome.')
    const dados = { nome, cidade: form.cidade.trim(), atualizadoEm: serverTimestamp() }
    try {
      if (form.id) await updateDoc(doc(db, 'locais', form.id), dados)
      else await addDoc(collection(db, 'locais'), dados)
      setForm(null)
    } catch {
      setErro('Não foi possível salvar. Confira sua conexão e tente de novo.')
    }
  }

  async function excluir(l) {
    if (window.confirm(`Excluir o campo ${l.nome}?`)) await deleteDoc(doc(db, 'locais', l.id))
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl font-bold">Campos</h1>
          <p className="text-texto-suave">Onde os jogos acontecem.</p>
        </div>
        {!form && (
          <button onClick={() => { setForm(vazio); setErro('') }}
            className="rounded-md bg-sangue px-4 py-2 font-display text-lg font-bold text-papel hover:bg-sangue-escuro">
            Adicionar campo
          </button>
        )}
      </div>

      {form && (
        <form onSubmit={salvar} className="mt-5 grid gap-4 rounded-lg border-2 border-preto bg-papel p-4 sm:grid-cols-2">
          <div>
            <label className="rotulo" htmlFor="nome">Nome do campo</label>
            <input id="nome" className="campo" autoFocus value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </div>
          <div>
            <label className="rotulo" htmlFor="cidade">Cidade</label>
            <input id="cidade" className="campo" value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} />
          </div>
          {erro && <p className="font-semibold text-sangue-escuro sm:col-span-2" role="alert">{erro}</p>}
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" className="rounded-md bg-preto px-4 py-2 font-display text-lg font-bold text-papel">Salvar campo</button>
            <button type="button" onClick={() => setForm(null)} className="px-4 py-2 font-semibold text-texto-suave">Cancelar</button>
          </div>
        </form>
      )}

      {carregando ? (
        <p className="mt-6 text-texto-suave">Carregando…</p>
      ) : (
        <ul className="mt-6 divide-y divide-linha rounded-lg bg-papel">
          {locais.map((l) => (
            <li key={l.id} className="flex items-center gap-3 px-3 py-2">
              <div className="flex-1">
                <p className="font-semibold">{l.nome}</p>
                <p className="text-sm text-texto-suave">{l.cidade || 'Cidade não informada'}</p>
              </div>
              <button onClick={() => { setForm({ ...vazio, ...l }); setErro('') }} className="rounded px-2 py-1 text-sm font-semibold hover:bg-cimento">Editar</button>
              <button onClick={() => excluir(l)} className="rounded px-2 py-1 text-sm font-semibold text-sangue-escuro hover:bg-cimento">Excluir</button>
            </li>
          ))}
          {locais.length === 0 && <li className="px-3 py-2 text-texto-suave">Nenhum campo cadastrado.</li>}
        </ul>
      )}
    </div>
  )
}
