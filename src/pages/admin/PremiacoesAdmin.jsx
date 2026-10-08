import { useEffect, useState } from 'react'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../../firebase.js'
import { usePremiacoesManuais } from '../../lib/premiacoes.js'
import { temporadaAtual } from '../../lib/temporadas.js'
import { useCollection } from '../../lib/useCollection.js'
import SeletorTemporada from '../../components/SeletorTemporada.jsx'

const vazio = { titulo: '', jogadores: [], detalhe: '' }

export default function PremiacoesAdmin() {
  const [temporada, setTemporada] = useState(temporadaAtual())
  const salvos = usePremiacoesManuais(temporada)
  const { dados: jogadores } = useCollection('jogadores')
  const [lista, setLista] = useState([])
  const [alterado, setAlterado] = useState(false)
  const [estado, setEstado] = useState('')

  useEffect(() => { setLista(salvos); setAlterado(false) }, [salvos])

  const mudar = (i, campo, valor) => {
    setLista((l) => l.map((p, k) => (k === i ? { ...p, [campo]: valor } : p)))
    setAlterado(true)
  }

  async function salvar() {
    setEstado('salvando')
    try {
      const limpos = lista.filter((p) => p.titulo.trim()).map((p) => ({ ...p, titulo: p.titulo.trim(), detalhe: p.detalhe.trim() }))
      await setDoc(doc(db, 'premiacoes', String(temporada)), { manuais: limpos, atualizadoEm: serverTimestamp() })
      setEstado('salvo')
    } catch {
      setEstado('erro')
    }
  }

  const fixos = jogadores.filter((j) => j.tipo !== 'convidado')
  const convidados = jogadores.filter((j) => j.tipo === 'convidado')

  return (
    <div className="max-w-2xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-4xl font-bold">Premiações extras</h1>
        <SeletorTemporada valor={temporada} onChange={setTemporada} />
      </div>
      <p className="mt-1 text-texto-suave">
        Artilheiro, assistências, participações em gol, melhor em campo e presença são calculados sozinhos.
        Aqui entram os prêmios que dependem de votação ou de um momento específico, como Melhor do Ano ou o gol 500.
      </p>

      <ul className="mt-5 space-y-4">
        {lista.map((p, i) => (
          <li key={i} className="rounded-lg border-2 border-preto bg-papel p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="rotulo" htmlFor={`t${i}`}>Prêmio</label>
                <input id={`t${i}`} className="campo" placeholder="Ex.: Melhor do Ano" value={p.titulo} onChange={(e) => mudar(i, 'titulo', e.target.value)} />
              </div>
              <div>
                <label className="rotulo" htmlFor={`d${i}`}>Detalhe (opcional)</label>
                <input id={`d${i}`} className="campo" placeholder="Ex.: contra o Mafu, 10/out" value={p.detalhe} onChange={(e) => mudar(i, 'detalhe', e.target.value)} />
              </div>
            </div>
            <label className="rotulo mt-3" htmlFor={`j${i}`}>Quem ganhou</label>
            <select id={`j${i}`} className="campo" value=""
              onChange={(e) => e.target.value && !p.jogadores.includes(e.target.value) && mudar(i, 'jogadores', [...p.jogadores, e.target.value])}>
              <option value="">Adicionar jogador…</option>
              <optgroup label="Fixos">{fixos.map((j) => <option key={j.id} value={j.id}>{j.nome}</option>)}</optgroup>
              <optgroup label="Convidados">{convidados.map((j) => <option key={j.id} value={j.id}>{j.nome}</option>)}</optgroup>
            </select>
            <div className="mt-2 flex flex-wrap gap-2">
              {p.jogadores.map((id) => (
                <button key={id} type="button" onClick={() => mudar(i, 'jogadores', p.jogadores.filter((x) => x !== id))}
                  className="rounded-full bg-preto px-3 py-1 text-sm font-semibold text-papel" aria-label={`Remover ${jogadores.find((j) => j.id === id)?.nome}`}>
                  {jogadores.find((j) => j.id === id)?.nome || '?'} ×
                </button>
              ))}
            </div>
            <button type="button" onClick={() => { setLista((l) => l.filter((_, k) => k !== i)); setAlterado(true) }}
              className="mt-3 text-sm font-semibold text-sangue-escuro">Remover este prêmio</button>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => { setLista((l) => [...l, vazio]); setAlterado(true) }}
          className="rounded-md border-2 border-preto bg-papel px-4 py-2 font-display text-lg font-bold">Adicionar prêmio</button>
        <button type="button" onClick={salvar} disabled={!alterado || estado === 'salvando'}
          className="rounded-md bg-sangue px-4 py-2 font-display text-lg font-bold text-papel disabled:opacity-50">
          {estado === 'salvando' ? 'Salvando…' : 'Salvar premiações'}
        </button>
        {estado === 'salvo' && !alterado && <span role="status">Premiações salvas.</span>}
        {estado === 'erro' && <span className="font-semibold text-sangue-escuro" role="alert">Não foi possível salvar. Tente de novo.</span>}
      </div>
    </div>
  )
}
