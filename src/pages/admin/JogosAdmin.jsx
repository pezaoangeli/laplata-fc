import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../../firebase.js'
import { agruparPorMes, ehJogo, hojeISO, porId, tipoJogo, useJogos } from '../../lib/jogos.js'
import { temporadaAtual } from '../../lib/temporadas.js'
import { useCollection } from '../../lib/useCollection.js'
import { useRolarAte } from '../../lib/useRolarAte.js'
import { MOTIVOS, SITUACOES } from '../../lib/constantes.js'
import LinhaJogo from '../../components/LinhaJogo.jsx'
import SeletorTemporada from '../../components/SeletorTemporada.jsx'

const vazio = { data: '', horario: '14:00', mando: 'casa', localId: '', adversarioId: '', status: 'agendado', tipo: 'jogo', titulo: '' }

export default function JogosAdmin() {
  const [temporada, setTemporada] = useState(temporadaAtual())
  const { jogos, carregando } = useJogos(temporada)
  const { dados: listaAdv } = useCollection('adversarios')
  const { dados: listaPriv } = useCollection('adversariosPrivado')
  const { dados: listaLocais } = useCollection('locais')
  const adversarios = porId(listaAdv)
  const privados = porId(listaPriv)
  const locais = porId(listaLocais)
  const [form, setForm] = useState(null)
  const formRef = useRolarAte(form ? form.id || 'novo' : null)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  const proximo = jogos.find((j) => j.status === 'agendado' && j.data >= hojeISO())
  const pendentes = jogos.filter((j) => ehJogo(j) && j.status === 'agendado' && j.data < hojeISO()).length
  const alerta = useMemo(() => {
    const p = form?.adversarioId && privados[form.adversarioId]
    return p && p.situacao !== 'liberado' ? p : null
  }, [form?.adversarioId, privados])

  async function salvar(e) {
    e.preventDefault()
    if (!form.data) return setErro('Escolha a data do jogo.')
    if (form.tipo !== 'jogo' && !form.titulo.trim()) return setErro('Dê um nome, como "Grenal" ou "Confraternização".')
    setSalvando(true)
    setErro('')
    const dados = {
      data: form.data,
      temporada: Number(form.data.slice(0, 4)),
      horario: form.horario || '',
      mando: form.mando,
      localId: form.localId || null,
      adversarioId: form.tipo === 'jogo' ? form.adversarioId || null : null,
      tipo: form.tipo,
      titulo: form.tipo === 'jogo' ? '' : form.titulo.trim(),
      status: form.status,
      atualizadoEm: serverTimestamp(),
    }
    try {
      if (form.id) await updateDoc(doc(db, 'jogos', form.id), dados)
      else await addDoc(collection(db, 'jogos'), { ...dados, placar: null, sumula: null, criadoEm: serverTimestamp() })
      setForm(null)
    } catch {
      setErro('Não foi possível salvar. Confira sua conexão e tente de novo.')
    } finally {
      setSalvando(false)
    }
  }

  async function excluir(j) {
    const texto = j.status === 'realizado' ? 'Esse jogo já tem súmula, que também será apagada.' : ''
    if (window.confirm(`Excluir o jogo de ${j.data.split('-').reverse().join('/')}? ${texto}\n\nSe ele só não aconteceu, prefira mudar a situação para "Cancelado".`))
    {
      await deleteDoc(doc(db, 'jogos', j.id))
      setForm(null)
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl font-bold">Jogos</h1>
          {pendentes > 0 && <p className="font-semibold text-cautela">{pendentes} jogo(s) passado(s) aguardando súmula</p>}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SeletorTemporada valor={temporada} onChange={setTemporada} />
          {!form && (
            <button onClick={() => { setForm(vazio); setErro('') }}
              className="rounded-md bg-sangue px-4 py-2 font-display text-lg font-bold text-papel hover:bg-sangue-escuro">
              Adicionar jogo
            </button>
          )}
        </div>
      </div>

      {form && (
        <form ref={formRef} onSubmit={salvar} className="scroll-mt-4 mt-5 grid gap-4 rounded-lg border-2 border-preto bg-papel p-4 sm:grid-cols-3">
          <h2 className="font-display text-2xl font-bold sm:col-span-3">{form.id ? 'Editar jogo' : 'Novo jogo'}</h2>
          <div>
            <label className="rotulo" htmlFor="data">Data</label>
            <input id="data" type="date" className="campo" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
          </div>
          <div>
            <label className="rotulo" htmlFor="hora">Horário</label>
            <input id="hora" type="time" className="campo" value={form.horario} onChange={(e) => setForm({ ...form, horario: e.target.value })} />
          </div>
          <fieldset>
            <legend className="rotulo">Mando</legend>
            <div className="flex gap-4 pt-2">
              {[['casa', 'Em casa'], ['fora', 'Fora']].map(([v, r]) => (
                <label key={v} className="flex items-center gap-2">
                  <input type="radio" name="mando" checked={form.mando === v} onChange={() => setForm({ ...form, mando: v })} />{r}
                </label>
              ))}
            </div>
          </fieldset>
          <div>
            <label className="rotulo" htmlFor="tipo">Tipo</label>
            <select id="tipo" className="campo" value={form.tipo || 'jogo'} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
              <option value="jogo">Jogo contra adversário</option>
              <option value="interno">Jogo interno (ex.: Grenal)</option>
              <option value="evento">Evento (ex.: Confraternização)</option>
            </select>
          </div>
          {form.tipo !== 'jogo' && (
            <div className="sm:col-span-2">
              <label className="rotulo" htmlFor="titulo">Nome</label>
              <input id="titulo" className="campo" value={form.titulo || ''} placeholder={form.tipo === 'interno' ? 'Grenal' : 'Confraternização'}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
            </div>
          )}
          {form.tipo === 'jogo' && <div className="sm:col-span-2">
            <label className="rotulo" htmlFor="adv">Adversário</label>
            <select id="adv" className="campo" value={form.adversarioId || ''} onChange={(e) => setForm({ ...form, adversarioId: e.target.value })}>
              <option value="">A definir</option>
              {listaAdv.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome}{a.cidade ? ` (${a.cidade})` : ''}
                  {privados[a.id]?.situacao && privados[a.id].situacao !== 'liberado' ? ` [${SITUACOES[privados[a.id].situacao].rotulo}]` : ''}
                </option>
              ))}
            </select>
            <p className="mt-1 text-sm text-texto-suave">Time novo? Cadastre antes na aba Adversários.</p>
          </div>}
          <div>
            <label className="rotulo" htmlFor="local">Campo</label>
            <select id="local" className="campo" value={form.localId || ''} onChange={(e) => setForm({ ...form, localId: e.target.value })}>
              <option value="">A definir</option>
              {listaLocais.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
            </select>
          </div>

          {alerta && (
            <div className={`rounded-md border-l-4 p-3 sm:col-span-3 ${alerta.situacao === 'nao_marcar' ? 'border-bloqueado bg-bloqueado/10' : 'border-cautela bg-cautela/10'}`} role="alert">
              <p className="font-semibold">Atenção: esse time está marcado como "{SITUACOES[alerta.situacao].rotulo}".</p>
              <p className="text-sm">Motivo: {(alerta.motivos || []).map((m) => MOTIVOS[m]).join(', ') || 'não informado'}.</p>
              {alerta.observacao && <p className="text-sm italic">{alerta.observacao}</p>}
            </div>
          )}

          <div>
            <label className="rotulo" htmlFor="status">Situação</label>
            <select id="status" className="campo" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="agendado">Agendado</option>
              <option value="cancelado">Cancelado (sem jogo)</option>
              {form.status === 'realizado' && <option value="realizado">Realizado</option>}
            </select>
          </div>

          {erro && <p className="font-semibold text-sangue-escuro sm:col-span-3" role="alert">{erro}</p>}
          <div className="flex gap-2 sm:col-span-3">
            <button type="submit" disabled={salvando} className="rounded-md bg-preto px-4 py-2 font-display text-lg font-bold text-papel disabled:opacity-60">
              {salvando ? 'Salvando…' : 'Salvar jogo'}
            </button>
            <button type="button" onClick={() => setForm(null)} className="px-4 py-2 font-semibold text-texto-suave">Cancelar</button>
            {form.id && (
              <button type="button" onClick={async () => { await excluir(form); }}
                className="ml-auto px-2 py-2 text-sm font-semibold text-sangue-escuro">
                Excluir jogo
              </button>
            )}
          </div>
        </form>
      )}

      {carregando ? (
        <p className="mt-6 text-texto-suave">Carregando…</p>
      ) : jogos.length === 0 ? (
        <p className="mt-6 text-texto-suave">Nenhum jogo em {temporada}. Adicione um jogo ou use "Importar dados".</p>
      ) : (
        agruparPorMes(jogos).map((g) => (
          <section key={g.mes} className="mt-6">
            <h2 className="font-display text-2xl font-bold">{g.mes}</h2>
            <ul className="mt-2 divide-y divide-linha rounded-lg bg-papel">
              {g.jogos.map((j) => (
                <li key={j.id}>
                  <LinhaJogo jogo={j} adversario={adversarios[j.adversarioId]} local={locais[j.localId]} destaque={j.id === proximo?.id}
                    acoes={
                      <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
                        {j.status !== 'cancelado' && ehJogo(j) && (
                          <Link to={`/admin/jogos/${j.id}/sumula`}
                            className="rounded bg-preto px-2 py-1 text-center text-sm font-semibold text-papel">
                            Súmula
                          </Link>
                        )}
                        <button onClick={() => { setForm({ ...vazio, ...j, tipo: tipoJogo(j), titulo: j.titulo || '' }); setErro('') }} className="rounded px-2 py-1 text-sm font-semibold hover:bg-cimento">Editar</button>
                      </div>
                    } />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  )
}
