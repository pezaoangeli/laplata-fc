import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, where } from 'firebase/firestore'
import { db } from '../firebase.js'

export const MESES_CURTOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export const CATEGORIAS = {
  entrada: {
    rateio_campo: 'Rateio de campo (adversário)',
    suplentes: 'Suplentes e avulsos',
    rendimentos: 'Rendimentos',
    patrocinio: 'Patrocínio',
    outras_entradas: 'Outras entradas',
  },
  saida: {
    campo: 'Aluguel de campo',
    material: 'Material esportivo',
    fardamento: 'Fardamento',
    arbitragem: 'Arbitragem',
    confraternizacao: 'Confraternização',
    outras_saidas: 'Outras despesas',
  },
}
export const rotuloCategoria = (tipo, cat) => CATEGORIAS[tipo]?.[cat] || cat

export const moeda = (v) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
export const arred = (v) => Math.round((v || 0) * 100) / 100

// Mês de uma mensalidade já venceu? Vence no dia "dia" do próprio mês.
export function venceu(ano, mes, dia, hoje = new Date()) {
  const a = hoje.getFullYear(), m = hoje.getMonth() + 1, d = hoje.getDate()
  if (ano !== a) return ano < a
  return mes < m || (mes === m && d > dia)
}

// Situação de uma célula da grade de mensalidades
export function situacaoCelula({ celula, valorPadrao, cobra, vencido }) {
  if (celula?.isento) return 'isento'
  const pago = celula?.valor || 0
  if (!cobra) return pago ? 'pago' : 'nao_cobra'
  if (pago >= valorPadrao) return 'pago'
  if (pago > 0) return vencido ? 'parcial_atrasado' : 'parcial'
  return vencido ? 'atrasado' : 'futuro'
}

const cobraNoMes = (linha, m) => linha.cobrar !== false && m >= (linha.desde || 1) && m <= (linha.ate || 12)

// Calcula tudo a partir dos dados brutos. "porJogador" só é usado no painel.
export function calcular({ ano, config = {}, mensalidades = {}, lancamentos = [], hoje = new Date() }) {
  const valor = config.valorMensalidade || 40
  const dia = config.diaVencimento || 10
  const meses = Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, esperado: 0, recebido: 0, aberto: 0, qtdAberta: 0, entradas: 0, saidas: 0 }))
  const porJogador = {}

  for (const [id, linha] of Object.entries(mensalidades.jogadores || {})) {
    const pj = (porJogador[id] = { pago: 0, aberto: 0, mesesAbertos: [] })
    for (let m = 1; m <= 12; m++) {
      const c = linha.meses?.[m]
      const pago = c?.isento ? 0 : c?.valor || 0
      meses[m - 1].recebido += pago
      pj.pago += pago
      if (c?.isento || !cobraNoMes(linha, m)) continue
      meses[m - 1].esperado += valor
      const falta = Math.max(0, valor - pago)
      if (falta) {
        meses[m - 1].aberto += falta
        meses[m - 1].qtdAberta++
        if (venceu(ano, m, dia, hoje)) { pj.aberto += falta; pj.mesesAbertos.push(m) }
      }
    }
  }

  const entradas = {}, saidas = {}
  let aPagar = 0, aReceber = 0
  for (const l of lancamentos) {
    const v = Number(l.valor) || 0
    if (l.status !== 'pago') { if (l.tipo === 'saida') aPagar += v; else aReceber += v; continue }
    const alvo = l.tipo === 'saida' ? saidas : entradas
    alvo[l.categoria] = (alvo[l.categoria] || 0) + v
    const m = Number((l.data || '').slice(5, 7))
    if (m) meses[m - 1][l.tipo === 'saida' ? 'saidas' : 'entradas'] += v
  }
  const recebidoMensalidades = meses.reduce((s, m) => s + m.recebido, 0)
  meses.forEach((m) => (m.entradas += m.recebido))
  const totalEntradas = recebidoMensalidades + Object.values(entradas).reduce((s, v) => s + v, 0)
  const totalSaidas = Object.values(saidas).reduce((s, v) => s + v, 0)
  const saldoInicial = config.saldoInicial || 0
  const saldoConta = saldoInicial + totalEntradas - totalSaidas

  const vencidos = meses.filter((m) => venceu(ano, m.mes, dia, hoje))
  const esperadoVencido = vencidos.reduce((s, m) => s + m.esperado, 0)
  const emAberto = vencidos.reduce((s, m) => s + m.aberto, 0)

  return {
    valor, dia, saldoInicial, meses, porJogador,
    entradas: { mensalidades: recebidoMensalidades, ...entradas }, saidas,
    totalEntradas, totalSaidas, saldoConta, aPagar, aReceber,
    saldoDisponivel: saldoConta - aPagar,
    emAberto, qtdEmAberto: vencidos.reduce((s, m) => s + m.qtdAberta, 0),
    adimplencia: esperadoVencido ? Math.round((1 - emAberto / esperadoVencido) * 100) : 100,
  }
}

export async function lerFinanceiro(ano) {
  const [cfg, mens, lancs] = await Promise.all([
    getDoc(doc(db, 'financeiro', String(ano))),
    getDoc(doc(db, 'mensalidades', String(ano))),
    getDocs(query(collection(db, 'lancamentos'), where('temporada', '==', Number(ano)))),
  ])
  return {
    config: cfg.exists() ? cfg.data() : {},
    mensalidades: mens.exists() ? mens.data() : {},
    lancamentos: lancs.docs.map((d) => ({ id: d.id, ...d.data() })),
  }
}

// Gera o resumo público (sem nomes). Os atrasos são recalculados na página pela data de hoje.
export async function publicarTransparencia(ano) {
  const dados = await lerFinanceiro(ano)
  const r = calcular({ ano: Number(ano), ...dados })
  await setDoc(doc(db, 'transparencia', String(ano)), {
    ano: Number(ano),
    diaVencimento: r.dia,
    saldoInicial: arred(r.saldoInicial),
    entradas: Object.fromEntries(Object.entries(r.entradas).map(([k, v]) => [k, arred(v)])),
    saidas: Object.fromEntries(Object.entries(r.saidas).map(([k, v]) => [k, arred(v)])),
    aPagar: arred(r.aPagar),
    aReceber: arred(r.aReceber),
    meses: r.meses.map(({ mes, esperado, recebido, aberto, qtdAberta, entradas, saidas }) =>
      ({ mes, esperado: arred(esperado), recebido: arred(recebido), aberto: arred(aberto), qtdAberta, entradas: arred(entradas), saidas: arred(saidas) })),
    atualizadoEm: serverTimestamp(),
  })
}

// Recalcula a parte que depende da data a partir do resumo público
export function calcularPublico(t, hoje = new Date()) {
  const vencidos = (t.meses || []).filter((m) => venceu(t.ano, m.mes, t.diaVencimento || 10, hoje))
  const esperado = vencidos.reduce((s, m) => s + m.esperado, 0)
  const emAberto = vencidos.reduce((s, m) => s + m.aberto, 0)
  const totalEntradas = Object.values(t.entradas || {}).reduce((s, v) => s + v, 0)
  const totalSaidas = Object.values(t.saidas || {}).reduce((s, v) => s + v, 0)
  const saldoConta = (t.saldoInicial || 0) + totalEntradas - totalSaidas
  return {
    totalEntradas, totalSaidas, saldoConta, saldoDisponivel: saldoConta - (t.aPagar || 0),
    emAberto, qtdEmAberto: vencidos.reduce((s, m) => s + m.qtdAberta, 0),
    adimplencia: esperado ? Math.round((1 - emAberto / esperado) * 100) : 100,
  }
}
