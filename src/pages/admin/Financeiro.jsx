import { useEffect, useMemo, useState } from 'react'
import {
  FieldPath, addDoc, collection, deleteDoc, deleteField, doc, getDoc, onSnapshot, query, serverTimestamp,
  setDoc, updateDoc, where, writeBatch,
} from 'firebase/firestore'
import { db } from '../../firebase.js'
import { CATEGORIAS, MESES_CURTOS, calcular, lerValor, moeda, paraCampo, publicarTransparencia, rotuloCategoria, situacaoCelula, venceu } from '../../lib/financeiro.js'
import { temporadaAtual } from '../../lib/temporadas.js'
import { useCollection } from '../../lib/useCollection.js'
import SeletorTemporada from '../../components/SeletorTemporada.jsx'

const hojeISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function useFinanceiro(ano) {
  const [config, setConfig] = useState({})
  const [mensalidades, setMensalidades] = useState({})
  const [lancamentos, setLancamentos] = useState([])
  const [carregando, setCarregando] = useState(true)
  useEffect(() => {
    setCarregando(true)
    const a = onSnapshot(doc(db, 'financeiro', String(ano)), (d) => setConfig(d.exists() ? d.data() : {}))
    const b = onSnapshot(doc(db, 'mensalidades', String(ano)), (d) => { setMensalidades(d.exists() ? d.data() : {}); setCarregando(false) })
    const c = onSnapshot(query(collection(db, 'lancamentos'), where('temporada', '==', Number(ano))),
      (s) => setLancamentos(s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((x, y) => (y.data || '').localeCompare(x.data || ''))))
    return () => { a(); b(); c() }
  }, [ano])
  return { config, mensalidades, lancamentos, carregando }
}

// Depois de qualquer alteração, atualiza o resumo público (sem nomes)
const salvarEPublicar = async (ano, acao) => { await acao(); await publicarTransparencia(ano) }

const ABAS = [['resumo', 'Resumo'], ['mensalidades', 'Mensalidades'], ['lancamentos', 'Entradas e saídas'], ['config', 'Configuração']]

export default function Financeiro() {
  const [ano, setAno] = useState(temporadaAtual())
  const [aba, setAba] = useState('resumo')
  const dados = useFinanceiro(ano)
  const { dados: jogadores } = useCollection('jogadores')
  const r = useMemo(() => calcular({ ano, ...dados }), [ano, dados])

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl font-bold">Financeiro</h1>
          <p className="text-texto-suave">Só admins veem esta área. A página Transparência mostra apenas totais, sem nomes.</p>
        </div>
        <SeletorTemporada valor={ano} onChange={setAno} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {ABAS.map(([v, rot]) => (
          <button key={v} onClick={() => setAba(v)}
            className={`rounded-full px-4 py-1.5 font-semibold ${aba === v ? 'bg-preto text-papel' : 'bg-papel'}`}>{rot}</button>
        ))}
      </div>
      {dados.carregando ? <p className="mt-6 text-texto-suave">Carregando…</p> : (
        <div className="mt-5">
          {aba === 'resumo' && <Resumo r={r} config={dados.config} jogadores={jogadores} mensalidades={dados.mensalidades} />}
          {aba === 'mensalidades' && <Mensalidades ano={ano} r={r} mensalidades={dados.mensalidades} jogadores={jogadores} />}
          {aba === 'lancamentos' && <Lancamentos ano={ano} lancamentos={dados.lancamentos} mensalidades={dados.mensalidades} jogadores={jogadores} />}
          {aba === 'config' && <Config ano={ano} config={dados.config} r={r} jogadores={jogadores} />}
        </div>
      )}
    </div>
  )
}

function Cartao({ titulo, valor, detalhe, destaque }) {
  return (
    <div className={`rounded-lg px-4 py-3 ${destaque ? 'bg-preto text-papel' : 'bg-papel'}`}>
      <p className={`text-sm ${destaque ? 'text-papel/70' : 'text-texto-suave'}`}>{titulo}</p>
      <p className="font-display text-3xl font-bold tabular-nums">{valor}</p>
      {detalhe && <p className={`text-xs ${destaque ? 'text-papel/70' : 'text-texto-suave'}`}>{detalhe}</p>}
    </div>
  )
}

function Resumo({ r, config, jogadores, mensalidades }) {
  const nomes = Object.fromEntries(jogadores.map((j) => [j.id, j.nome]))
  const devedores = Object.entries(r.porJogador).filter(([, p]) => p.aberto > 0).sort((a, b) => b[1].aberto - a[1].aberto)
  const diferenca = typeof config.saldoBanco === 'number' && !Number.isNaN(config.saldoBanco) ? config.saldoBanco - r.saldoConta : null
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Cartao titulo="Saldo disponível" valor={moeda(r.saldoDisponivel)} detalhe="em conta menos o que falta pagar" destaque />
        <Cartao titulo="Saldo em conta" valor={moeda(r.saldoConta)} detalhe={`inclui ${moeda(r.saldoInicial)} do ano anterior`} />
        <Cartao titulo="A pagar" valor={moeda(r.aPagar)} detalhe={r.aReceber ? `a receber: ${moeda(r.aReceber)}` : 'compromissos pendentes'} />
        <Cartao titulo="Mensalidades em aberto" valor={moeda(r.emAberto)} detalhe={`${r.qtdEmAberto} mensalidades vencidas, ${r.adimplencia}% em dia`} />
      </div>

      {diferenca != null && Math.abs(diferenca) >= 0.01 && (
        <p className="rounded-md border-l-4 border-cautela bg-cautela/10 p-3 text-sm" role="alert">
          O saldo informado do banco ({moeda(config.saldoBanco)}) difere do calculado em {moeda(diferenca)}. Confira se falta lançar algo.
        </p>
      )}
      {diferenca != null && Math.abs(diferenca) < 0.01 && (
        <p className="rounded-md bg-liberado/10 p-3 text-sm font-semibold text-liberado">O saldo calculado bate com o saldo informado do banco.</p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-lg bg-papel p-4">
          <h2 className="font-display text-2xl font-bold">Entradas: {moeda(r.totalEntradas)}</h2>
          <ul className="mt-2 space-y-1">
            {Object.entries(r.entradas).filter(([, v]) => v).map(([c, v]) => (
              <li key={c} className="flex justify-between"><span>{c === 'mensalidades' ? 'Mensalidades' : rotuloCategoria('entrada', c)}</span><span className="tabular-nums">{moeda(v)}</span></li>
            ))}
          </ul>
        </section>
        <section className="rounded-lg bg-papel p-4">
          <h2 className="font-display text-2xl font-bold">Saídas: {moeda(r.totalSaidas)}</h2>
          <ul className="mt-2 space-y-1">
            {Object.entries(r.saidas).filter(([, v]) => v).map(([c, v]) => (
              <li key={c} className="flex justify-between"><span>{rotuloCategoria('saida', c)}</span><span className="tabular-nums">{moeda(v)}</span></li>
            ))}
            {!Object.keys(r.saidas).length && <li className="text-texto-suave">Nenhuma saída paga.</li>}
          </ul>
        </section>
      </div>

      <section className="rounded-lg bg-papel p-4">
        <h2 className="font-display text-2xl font-bold">Mensalidades em atraso</h2>
        <p className="text-sm text-texto-suave">Vencem no dia {r.dia} de cada mês. Esta lista com nomes só aparece aqui.</p>
        <ul className="mt-2 divide-y divide-linha">
          {devedores.map(([id, p]) => (
            <li key={id} className="flex flex-wrap justify-between gap-2 py-1.5">
              <span className="font-semibold">{nomes[id] || mensalidades.jogadores?.[id]?.nome || '?'}</span>
              <span className="text-sm">{moeda(p.aberto)} ({p.mesesAbertos.map((m) => MESES_CURTOS[m - 1]).join(', ')})</span>
            </li>
          ))}
          {!devedores.length && <li className="py-1.5 text-texto-suave">Ninguém em atraso.</li>}
        </ul>
      </section>
    </div>
  )
}

const ESTILO_CELULA = {
  pago: 'bg-liberado text-papel',
  parcial: 'bg-cautela/20 text-preto',
  parcial_atrasado: 'bg-cautela text-papel',
  isento: 'bg-cimento text-texto-suave',
  atrasado: 'border-2 border-sangue text-sangue-escuro',
  futuro: 'border border-dashed border-linha text-texto-suave',
  nao_cobra: 'text-linha',
}

function Mensalidades({ ano, r, mensalidades, jogadores }) {
  const [sel, setSel] = useState(null) // { id, mes }
  const [valor, setValor] = useState('')
  const [dataPag, setDataPag] = useState(hojeISO())
  const [novo, setNovo] = useState('')
  const linhas = Object.entries(mensalidades.jogadores || {}).map(([id, l]) => ({ id, ...l, nome: jogadores.find((j) => j.id === id)?.nome || l.nome || '?' }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  const ref = doc(db, 'mensalidades', String(ano))

  async function garantirDoc() {
    const d = await getDoc(ref)
    if (!d.exists()) await setDoc(ref, { jogadores: {}, atualizadoEm: serverTimestamp() })
  }
  const salvarCelula = (id, mes, celula) => salvarEPublicar(ano, async () => {
    await garantirDoc()
    await updateDoc(ref, new FieldPath('jogadores', id, 'meses', String(mes)), celula ?? deleteField(), 'atualizadoEm', serverTimestamp())
    setSel(null)
  })
  const salvarLinha = (id, campo, v) => salvarEPublicar(ano, async () => {
    await updateDoc(ref, new FieldPath('jogadores', id, campo), v ?? deleteField())
  })
  async function adicionar() {
    if (!novo) return
    await salvarEPublicar(ano, async () => {
      await garantirDoc()
      await updateDoc(ref, new FieldPath('jogadores', novo), { nome: jogadores.find((j) => j.id === novo)?.nome || '', cobrar: true, meses: {} })
    })
    setNovo('')
  }
  async function remover(l) {
    if (!window.confirm(`Tirar ${l.nome} da grade de ${ano}? Os pagamentos registrados dele neste ano também saem.`)) return
    await salvarEPublicar(ano, () => updateDoc(ref, new FieldPath('jogadores', l.id), deleteField()))
  }

  const selLinha = sel && linhas.find((l) => l.id === sel.id)
  const selCel = selLinha?.meses?.[sel.mes]

  return (
    <div>
      <div className="flex flex-wrap gap-2 text-xs">
        {[['pago', 'Pago'], ['parcial', 'Parcial'], ['atrasado', 'Em atraso'], ['isento', 'Isento (DM)'], ['futuro', 'Ainda não venceu']].map(([k, rot]) => (
          <span key={k} className={`rounded px-2 py-0.5 ${ESTILO_CELULA[k]}`}>{rot}</span>
        ))}
      </div>

      <div className="mt-3 overflow-x-auto rounded-lg bg-papel">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-texto-suave">
              <th className="sticky left-0 bg-papel px-2 py-2 text-left">Jogador</th>
              {MESES_CURTOS.map((m) => <th key={m} className="px-1 py-2 font-semibold">{m}</th>)}
              <th className="px-2 py-2 text-right">Pago</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.id} className="border-t border-linha">
                <td className="sticky left-0 bg-papel px-2 py-1.5 font-semibold whitespace-nowrap">
                  {l.nome}{l.cobrar === false && <span className="ml-1 text-xs font-normal text-texto-suave">(sem cobrança)</span>}
                </td>
                {MESES_CURTOS.map((_, i) => {
                  const mes = i + 1
                  const c = l.meses?.[mes]
                  const cobra = l.cobrar !== false && mes >= (l.desde || 1) && mes <= (l.ate || 12)
                  const sit = situacaoCelula({ celula: c, valorPadrao: r.valor, cobra, vencido: venceu(ano, mes, r.dia) })
                  const ativo = sel?.id === l.id && sel?.mes === mes
                  return (
                    <td key={mes} className="px-0.5 py-1">
                      <button onClick={() => { setSel({ id: l.id, mes }); setValor(paraCampo(c?.valor ?? r.valor)); setDataPag(c?.data || hojeISO()) }}
                        aria-label={`${l.nome}, ${MESES_CURTOS[i]}`}
                        className={`h-8 w-11 rounded text-xs font-semibold tabular-nums ${ESTILO_CELULA[sit]} ${ativo ? 'ring-2 ring-preto' : ''}`}>
                        {c?.isento ? 'DM' : c?.valor ? c.valor : sit === 'atrasado' ? '!' : ''}
                      </button>
                    </td>
                  )
                })}
                <td className="px-2 text-right tabular-nums">{moeda(r.porJogador[l.id]?.pago)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selLinha && (
        <div className="mt-3 rounded-lg border-2 border-preto bg-papel p-4">
          <p className="font-display text-xl font-bold">{selLinha.nome}, {MESES_CURTOS[sel.mes - 1]} de {ano}</p>
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <label className="flex items-center gap-1">
              <span className="text-sm">Pago em</span>
              <input type="date" className="campo w-auto py-1.5" value={dataPag} max={hojeISO()} onChange={(e) => setDataPag(e.target.value)} />
            </label>
            <button onClick={() => salvarCelula(sel.id, sel.mes, { valor: r.valor, data: dataPag || hojeISO() })}
              className="rounded-md bg-liberado px-3 py-2 font-semibold text-papel">Pago {moeda(r.valor)}</button>
            <label className="flex items-center gap-1">
              <span className="text-sm">Outro valor</span>
              <input inputMode="decimal" className="campo w-24" value={valor} onChange={(e) => setValor(e.target.value)} />
            </label>
            <button onClick={() => salvarCelula(sel.id, sel.mes, { valor: lerValor(valor) || 0, data: dataPag || hojeISO() })}
              className="rounded-md bg-preto px-3 py-2 font-semibold text-papel">Salvar valor</button>
            <button onClick={() => salvarCelula(sel.id, sel.mes, { isento: true })} className="rounded-md border-2 border-preto px-3 py-2 font-semibold">Isento (DM)</button>
            <button onClick={() => salvarCelula(sel.id, sel.mes, null)} className="px-3 py-2 font-semibold text-sangue-escuro">Limpar</button>
            <button onClick={() => setSel(null)} className="px-3 py-2 text-texto-suave">Fechar</button>
          </div>
          <p className="mt-2 text-sm text-texto-suave">
            {selCel?.data ? `Pagamento registrado com data de ${selCel.data.split('-').reverse().join('/')}. Para corrigir a data, escolha outra e salve de novo.`
              : selCel?.valor ? 'Pagamento sem data (veio da planilha). Escolha a data e salve de novo para registrar.'
              : 'A data já vem com hoje. Se o depósito foi em outro dia, troque antes de salvar.'}
          </p>

          <div className="mt-4 grid gap-3 border-t border-linha pt-3 sm:grid-cols-3">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={selLinha.cobrar !== false} onChange={(e) => salvarLinha(sel.id, 'cobrar', e.target.checked)} />
              Cobrar mensalidade
            </label>
            <label className="flex items-center gap-2 text-sm">Cobra a partir de
              <select className="campo w-auto py-1" value={selLinha.desde || 1} onChange={(e) => salvarLinha(sel.id, 'desde', Number(e.target.value))}>
                {MESES_CURTOS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm">até
              <select className="campo w-auto py-1" value={selLinha.ate || 12} onChange={(e) => salvarLinha(sel.id, 'ate', Number(e.target.value))}>
                {MESES_CURTOS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </label>
          </div>
          <button onClick={() => remover(selLinha)} className="mt-3 text-sm font-semibold text-sangue-escuro">Tirar da grade deste ano</button>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <select className="campo w-auto" value={novo} onChange={(e) => setNovo(e.target.value)} aria-label="Adicionar mensalista">
          <option value="">Adicionar mensalista…</option>
          {jogadores.filter((j) => !mensalidades.jogadores?.[j.id] && j.ativo !== false).map((j) => <option key={j.id} value={j.id}>{j.nome}</option>)}
        </select>
        <button onClick={adicionar} disabled={!novo} className="rounded-md bg-preto px-4 font-semibold text-papel disabled:opacity-40">Adicionar</button>
      </div>
    </div>
  )
}

const vazioLanc = { data: '', tipo: 'saida', categoria: 'campo', descricao: '', valor: '', status: 'pago', forma: 'pix' }

function Lancamentos({ ano, lancamentos, mensalidades, jogadores }) {
  const [form, setForm] = useState(null)
  const [erro, setErro] = useState('')
  const [filtro, setFiltro] = useState('todos')
  const [porPagina, setPorPagina] = useState(10)
  const [pagina, setPagina] = useState(1)

  async function salvar(e) {
    e.preventDefault()
    const valor = lerValor(form.valor)
    if (!form.data || !form.descricao.trim()) return setErro('Preencha data e descrição.')
    if (!valor || Number.isNaN(valor) || valor < 0) return setErro('Valor inválido. Use, por exemplo, 135 ou 1.250,50.')
    if (Number(form.data.slice(0, 4)) !== ano) return setErro(`A data precisa ser de ${ano}. Para outro ano, troque a temporada no topo.`)
    const dados = { ...form, valor, descricao: form.descricao.trim(), temporada: ano, atualizadoEm: serverTimestamp() }
    delete dados.id
    await salvarEPublicar(ano, () => (form.id ? updateDoc(doc(db, 'lancamentos', form.id), dados) : addDoc(collection(db, 'lancamentos'), { ...dados, criadoEm: serverTimestamp() })))
    setForm(null)
  }
  async function excluir(l) {
    if (window.confirm(`Excluir "${l.descricao}"?`)) await salvarEPublicar(ano, () => deleteDoc(doc(db, 'lancamentos', l.id)))
  }
  const marcarPago = (l) => salvarEPublicar(ano, () => updateDoc(doc(db, 'lancamentos', l.id), { status: 'pago', atualizadoEm: serverTimestamp() }))

  // Pagamentos de mensalidade aparecem aqui como entradas, com a data em que foram pagos (só leitura)
  const nomes = Object.fromEntries(jogadores.map((j) => [j.id, j.nome]))
  const pagamentos = []
  for (const [id, linha] of Object.entries(mensalidades.jogadores || {}))
    for (const [m, c] of Object.entries(linha.meses || {}))
      if (c?.valor && !c.isento)
        pagamentos.push({
          id: `m-${id}-${m}`, mensalidade: true, tipo: 'entrada', status: 'pago', valor: c.valor, data: c.data || '',
          descricao: `Mensalidade de ${MESES_CURTOS[m - 1].toLowerCase()}: ${nomes[id] || linha.nome || '?'}`,
        })
  const todos = [...lancamentos, ...pagamentos].sort((a, b) => (b.data || '').localeCompare(a.data || ''))
  const visiveis = todos.filter((l) =>
    filtro === 'todos' ? true
    : filtro === 'mensalidades' ? l.mensalidade
    : filtro === 'pendentes' ? l.status !== 'pago'
    : l.tipo === filtro)
  const semData = pagamentos.filter((p) => !p.data).length
  const totalPaginas = Math.max(1, Math.ceil(visiveis.length / porPagina))
  const paginaAtual = Math.min(pagina, totalPaginas)
  const daPagina = visiveis.slice((paginaAtual - 1) * porPagina, paginaAtual * porPagina)

  return (
    <div>
      <p className="text-sm text-texto-suave">
        Os pagamentos de mensalidade aparecem aqui com a data em que foram pagos, mas são lançados e corrigidos na aba Mensalidades.
        {semData > 0 && ` ${semData} pagamentos vieram da planilha sem data e aparecem no fim da lista.`}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {[['todos', 'Todos'], ['entrada', 'Entradas'], ['mensalidades', 'Mensalidades'], ['saida', 'Saídas'], ['pendentes', 'Pendentes']].map(([v, rot]) => (
          <button key={v} onClick={() => { setFiltro(v); setPagina(1) }} className={`rounded-full px-3 py-1 text-sm font-semibold ${filtro === v ? 'bg-preto text-papel' : 'bg-papel'}`}>{rot}</button>
        ))}
        {!form && (
          <button onClick={() => { setForm({ ...vazioLanc, data: hojeISO() }); setErro('') }}
            className="ml-auto rounded-md bg-sangue px-4 py-2 font-display text-lg font-bold text-papel">Novo lançamento</button>
        )}
      </div>

      {form && (
        <form onSubmit={salvar} className="mt-4 grid gap-3 rounded-lg border-2 border-preto bg-papel p-4 sm:grid-cols-3">
          <fieldset className="sm:col-span-3">
            <div className="flex gap-4">
              {[['entrada', 'Entrada'], ['saida', 'Saída']].map(([v, rot]) => (
                <label key={v} className="flex items-center gap-2 font-semibold">
                  <input type="radio" checked={form.tipo === v} onChange={() => setForm({ ...form, tipo: v, categoria: Object.keys(CATEGORIAS[v])[0] })} />{rot}
                </label>
              ))}
            </div>
          </fieldset>
          <div><label className="rotulo" htmlFor="ld">Data</label><input id="ld" type="date" className="campo" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></div>
          <div>
            <label className="rotulo" htmlFor="lc">Categoria</label>
            <select id="lc" className="campo" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
              {Object.entries(CATEGORIAS[form.tipo]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div><label className="rotulo" htmlFor="lv">Valor (R$)</label><input id="lv" inputMode="decimal" className="campo" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} /></div>
          <div className="sm:col-span-3"><label className="rotulo" htmlFor="lds">Descrição</label><input id="lds" className="campo" placeholder="Ex.: Horários de outubro na Arena" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
          <div>
            <label className="rotulo" htmlFor="ls">Situação</label>
            <select id="ls" className="campo" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="pago">{form.tipo === 'saida' ? 'Pago' : 'Recebido'}</option>
              <option value="pendente">{form.tipo === 'saida' ? 'A pagar' : 'A receber'}</option>
            </select>
          </div>
          <div>
            <label className="rotulo" htmlFor="lf">Forma</label>
            <select id="lf" className="campo" value={form.forma} onChange={(e) => setForm({ ...form, forma: e.target.value })}>
              <option value="pix">Pix ou transferência</option><option value="especie">Dinheiro</option>
            </select>
          </div>
          {erro && <p className="font-semibold text-sangue-escuro sm:col-span-3" role="alert">{erro}</p>}
          <div className="flex gap-2 sm:col-span-3">
            <button type="submit" className="rounded-md bg-preto px-4 py-2 font-display text-lg font-bold text-papel">Salvar</button>
            <button type="button" onClick={() => setForm(null)} className="px-4 py-2 font-semibold text-texto-suave">Cancelar</button>
          </div>
        </form>
      )}

      <ul className="mt-4 divide-y divide-linha rounded-lg bg-papel">
        {daPagina.map((l) => (
          <li key={l.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
            <span className="w-20 shrink-0 font-display text-base font-bold">{l.data ? l.data.split('-').reverse().slice(0, 2).join('/') : <span className="text-sm font-normal text-texto-suave">sem data</span>}</span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{l.descricao}</span>
              <span className="block text-sm text-texto-suave">
                {l.mensalidade ? 'Mensalidades' : rotuloCategoria(l.tipo, l.categoria)}{l.status !== 'pago' ? (l.tipo === 'saida' ? ', a pagar' : ', a receber') : ''}
              </span>
            </span>
            <span className={`font-display text-xl font-bold tabular-nums ${l.tipo === 'saida' ? 'text-sangue-escuro' : 'text-liberado'}`}>
              {l.tipo === 'saida' ? '−' : '+'}{moeda(l.valor)}
            </span>
            {l.mensalidade ? (
              <span className="w-[136px] text-right text-xs text-texto-suave">na aba Mensalidades</span>
            ) : <span className="flex gap-1">
              {l.status !== 'pago' && <button onClick={() => marcarPago(l)} className="rounded bg-liberado px-2 py-1 text-sm font-semibold text-papel">{l.tipo === 'saida' ? 'Paguei' : 'Recebi'}</button>}
              <button onClick={() => { setForm({ ...vazioLanc, ...l, valor: paraCampo(l.valor) }); setErro('') }} className="rounded px-2 py-1 text-sm font-semibold hover:bg-cimento">Editar</button>
              <button onClick={() => excluir(l)} className="rounded px-2 py-1 text-sm font-semibold text-sangue-escuro hover:bg-cimento">Excluir</button>
            </span>}
          </li>
        ))}
        {!visiveis.length && <li className="px-3 py-3 text-texto-suave">Nenhum lançamento.</li>}
      </ul>

      {visiveis.length > 0 && (
        <nav className="mt-3 flex flex-wrap items-center gap-3 text-sm" aria-label="Paginação dos lançamentos">
          <span className="text-texto-suave">
            Mostrando {(paginaAtual - 1) * porPagina + 1} a {Math.min(paginaAtual * porPagina, visiveis.length)} de {visiveis.length}
          </span>
          <label className="flex items-center gap-1">
            <span className="text-texto-suave">Por página</span>
            <select className="campo w-auto py-1" value={porPagina} onChange={(e) => { setPorPagina(Number(e.target.value)); setPagina(1) }}>
              {[10, 20, 50].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <span className="ml-auto flex items-center gap-2">
            <button onClick={() => setPagina(paginaAtual - 1)} disabled={paginaAtual === 1}
              className="rounded-md border-2 border-preto px-3 py-1 font-semibold disabled:opacity-30">‹ Anterior</button>
            <span className="tabular-nums">{paginaAtual} de {totalPaginas}</span>
            <button onClick={() => setPagina(paginaAtual + 1)} disabled={paginaAtual === totalPaginas}
              className="rounded-md border-2 border-preto px-3 py-1 font-semibold disabled:opacity-30">Próxima ›</button>
          </span>
        </nav>
      )}
    </div>
  )
}

function Config({ ano, config, r, jogadores }) {
  const [f, setF] = useState({
    saldoInicial: paraCampo(config.saldoInicial), valorMensalidade: paraCampo(config.valorMensalidade ?? 40),
    diaVencimento: config.diaVencimento ?? 10, saldoBanco: paraCampo(config.saldoBanco),
  })
  const [estado, setEstado] = useState('')

  async function salvar() {
    const v = { saldoInicial: lerValor(f.saldoInicial), valorMensalidade: lerValor(f.valorMensalidade), diaVencimento: lerValor(f.diaVencimento), saldoBanco: lerValor(f.saldoBanco) }
    const invalidos = Object.entries(v).filter(([, x]) => Number.isNaN(x)).map(([k]) => ({
      saldoInicial: 'saldo do ano anterior', valorMensalidade: 'valor da mensalidade', diaVencimento: 'dia de vencimento', saldoBanco: 'saldo do banco',
    }[k]))
    if (invalidos.length) return setEstado(`Não entendi o valor de: ${invalidos.join(', ')}. Use, por exemplo, 3.107,02.`)
    await salvarEPublicar(ano, () => setDoc(doc(db, 'financeiro', String(ano)), {
      saldoInicial: v.saldoInicial || 0, valorMensalidade: v.valorMensalidade || 40,
      diaVencimento: v.diaVencimento || 10, saldoBanco: v.saldoBanco,
      saldoBancoEm: v.saldoBanco != null ? hojeISO() : null, atualizadoEm: serverTimestamp(),
    }, { merge: true }))
    setF({ ...f, saldoBanco: paraCampo(v.saldoBanco), saldoInicial: paraCampo(v.saldoInicial || 0) })
    setEstado('Configuração salva.')
  }

  return (
    <div className="max-w-2xl space-y-6">
      <section className="rounded-lg bg-papel p-4">
        <h2 className="font-display text-2xl font-bold">Configuração de {ano}</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div><label className="rotulo" htmlFor="si">Saldo que veio do ano anterior (R$)</label><input id="si" inputMode="decimal" className="campo" value={f.saldoInicial} onChange={(e) => setF({ ...f, saldoInicial: e.target.value })} /></div>
          <div><label className="rotulo" htmlFor="vm">Valor da mensalidade (R$)</label><input id="vm" inputMode="decimal" className="campo" value={f.valorMensalidade} onChange={(e) => setF({ ...f, valorMensalidade: e.target.value })} /></div>
          <div><label className="rotulo" htmlFor="dv">Vence no dia</label><input id="dv" type="number" min="1" max="28" className="campo" value={f.diaVencimento} onChange={(e) => setF({ ...f, diaVencimento: e.target.value })} /></div>
          <div>
            <label className="rotulo" htmlFor="sb">Saldo atual no banco (R$, opcional)</label>
            <input id="sb" inputMode="decimal" className="campo" value={f.saldoBanco} onChange={(e) => setF({ ...f, saldoBanco: e.target.value })} />
            <p className="mt-1 text-xs text-texto-suave">Para conferir. O resumo avisa se não bater com o calculado ({moeda(r.saldoConta)}).</p>
          </div>
        </div>
        <button onClick={salvar} className="mt-3 rounded-md bg-sangue px-4 py-2 font-display text-lg font-bold text-papel">Salvar</button>
        {estado && <span className="ml-3" role="status">{estado}</span>}
        <p className="mt-3 text-sm text-texto-suave">Ao começar um ano novo, use o "Saldo em conta" do fim do ano anterior como saldo inicial.</p>
      </section>
      <ImportarPlanilha jogadores={jogadores} />
      <section className="rounded-lg bg-papel p-4">
        <h2 className="font-display text-2xl font-bold">Página Transparência</h2>
        <p className="mt-1 text-sm text-texto-suave">Ela se atualiza sozinha a cada alteração. Se precisar, force a atualização aqui.</p>
        <button onClick={async () => { await publicarTransparencia(ano); setEstado('Transparência atualizada.') }}
          className="mt-2 rounded-md border-2 border-preto px-4 py-2 font-semibold">Atualizar agora</button>
      </section>
    </div>
  )
}

// Importação colada (os valores por jogador nunca ficam no código do site)
function ImportarPlanilha({ jogadores }) {
  const [texto, setTexto] = useState('')
  const [estado, setEstado] = useState('')

  async function importar() {
    let d
    try { d = JSON.parse(texto); if (!d.ano || !d.mensalidades) throw new Error() } catch {
      return setEstado('O texto colado não está no formato esperado. Copie de novo, inteiro, o bloco que recebeu.')
    }
    const porNome = Object.fromEntries(jogadores.map((j) => [j.nome.toLowerCase(), j.id]))
    const faltando = Object.keys(d.mensalidades).filter((n) => !porNome[n.toLowerCase()])
    if (faltando.length) return setEstado(`Não encontrei estes jogadores no cadastro: ${faltando.join(', ')}. Confira os nomes.`)
    setEstado('importando')
    try {
      const linhas = {}
      for (const [nome, meses] of Object.entries(d.mensalidades)) {
        const m = {}
        meses.forEach((v, i) => { if (v === 'DM') m[i + 1] = { isento: true }; else if (typeof v === 'number') m[i + 1] = { valor: v } })
        linhas[porNome[nome.toLowerCase()]] = { nome, cobrar: !(d.semCobranca || []).includes(nome), meses: m }
      }
      const lote = writeBatch(db)
      lote.set(doc(db, 'mensalidades', String(d.ano)), { jogadores: linhas, atualizadoEm: serverTimestamp() })
      lote.set(doc(db, 'financeiro', String(d.ano)), {
        saldoInicial: d.saldoInicial || 0, valorMensalidade: d.valorMensalidade || 40, diaVencimento: d.diaVencimento || 10, atualizadoEm: serverTimestamp(),
      }, { merge: true })
      ;(d.lancamentos || []).forEach((l, i) => lote.set(doc(db, 'lancamentos', `imp-${d.ano}-${i + 1}`), {
        ...l, forma: l.forma || 'pix', temporada: d.ano, criadoEm: serverTimestamp(), atualizadoEm: serverTimestamp(),
      }))
      await lote.commit()
      await publicarTransparencia(d.ano)
      setEstado(`Pronto: ${Object.keys(linhas).length} mensalistas e ${(d.lancamentos || []).length} lançamentos de ${d.ano}.`)
      setTexto('')
    } catch {
      setEstado('A importação falhou. Confira se você está logada com uma conta admin.')
    }
  }

  return (
    <section className="rounded-lg bg-papel p-4">
      <h2 className="font-display text-2xl font-bold">Importar da planilha</h2>
      <p className="mt-1 text-sm text-texto-suave">
        Cole o bloco de dados gerado a partir da planilha. Isso substitui a grade de mensalidades do ano e a configuração.
        Lançamentos importados antes são atualizados, sem duplicar.
      </p>
      <textarea rows={5} className="campo mt-2 font-mono text-xs" value={texto} onChange={(e) => { setTexto(e.target.value); setEstado('') }} aria-label="Dados da planilha" />
      <button onClick={importar} disabled={!texto.trim() || estado === 'importando'}
        className="mt-2 rounded-md bg-sangue px-4 py-2 font-display text-lg font-bold text-papel disabled:opacity-50">
        {estado === 'importando' ? 'Importando…' : 'Importar'}
      </button>
      {estado && estado !== 'importando' && <p className="mt-2 text-sm" role="status">{estado}</p>}
    </section>
  )
}
