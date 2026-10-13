import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase.js'
import { MESES_CURTOS, calcularPublico, moeda, rotuloCategoria } from '../lib/financeiro.js'
import { temporadaAtual } from '../lib/temporadas.js'
import SeletorTemporada from '../components/SeletorTemporada.jsx'

export default function Transparencia() {
  const [ano, setAno] = useState(temporadaAtual())
  const [t, setT] = useState(undefined)
  useEffect(() => onSnapshot(doc(db, 'transparencia', String(ano)), (d) => setT(d.exists() ? d.data() : null), () => setT(null)), [ano])

  const c = t ? calcularPublico(t) : null
  const maiorMes = t ? Math.max(1, ...t.meses.map((m) => Math.max(m.entradas, m.saidas))) : 1
  const linhasCategoria = (obj, tipo) => Object.entries(obj || {}).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])
    .map(([k, v]) => [k === 'mensalidades' ? 'Mensalidades' : rotuloCategoria(tipo, k), v])

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-5xl font-extrabold">Transparência</h1>
          <p className="text-texto-suave">Para onde vai o dinheiro do time. Valores totais, sem nomes.</p>
        </div>
        <SeletorTemporada valor={ano} onChange={setAno} />
      </div>

      {t === undefined ? <p className="mt-6 text-texto-suave">Carregando…</p> : t === null ? (
        <p className="mt-6 text-texto-suave">Ainda não há dados financeiros de {ano}.</p>
      ) : (
        <>
          <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg bg-preto px-4 py-3 text-papel">
              <dt className="text-sm text-papel/70">Saldo disponível</dt>
              <dd className="font-display text-3xl font-bold tabular-nums">{moeda(c.saldoDisponivel)}</dd>
              {t.aPagar > 0 && <dd className="text-xs text-papel/70">já descontados {moeda(t.aPagar)} a pagar</dd>}
            </div>
            <div className="rounded-lg border-2 border-preto px-4 py-3">
              <dt className="text-sm text-texto-suave">Recebido em {ano}</dt>
              <dd className="font-display text-3xl font-bold tabular-nums text-liberado">{moeda(c.totalEntradas)}</dd>
              {t.saldoInicial > 0 && <dd className="text-xs text-texto-suave">mais {moeda(t.saldoInicial)} do ano anterior</dd>}
            </div>
            <div className="rounded-lg border-2 border-preto px-4 py-3">
              <dt className="text-sm text-texto-suave">Gasto em {ano}</dt>
              <dd className="font-display text-3xl font-bold tabular-nums text-sangue-escuro">{moeda(c.totalSaidas)}</dd>
            </div>
            <div className="rounded-lg border-2 border-preto px-4 py-3">
              <dt className="text-sm text-texto-suave">Mensalidades em atraso</dt>
              <dd className="font-display text-3xl font-bold tabular-nums">{moeda(c.emAberto)}</dd>
              <dd className="text-xs text-texto-suave">{c.qtdEmAberto} mensalidades, {c.adimplencia}% em dia</dd>
            </div>
          </dl>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {[['Entradas', linhasCategoria(t.entradas, 'entrada'), c.totalEntradas, 'bg-liberado'],
              ['Saídas', linhasCategoria(t.saidas, 'saida'), c.totalSaidas, 'bg-sangue']].map(([titulo, linhas, total, cor]) => (
              <section key={titulo} className="rounded-lg border border-linha p-4">
                <h2 className="font-display text-2xl font-bold">{titulo} por categoria</h2>
                <ul className="mt-3 space-y-3">
                  {linhas.map(([rot, v]) => (
                    <li key={rot}>
                      <div className="flex justify-between text-sm"><span>{rot}</span><span className="font-semibold tabular-nums">{moeda(v)}</span></div>
                      <div className="mt-1 h-2 rounded bg-cimento"><div className={`h-2 rounded ${cor}`} style={{ width: `${(v / (total || 1)) * 100}%` }} /></div>
                    </li>
                  ))}
                  {!linhas.length && <li className="text-texto-suave">Nada registrado.</li>}
                </ul>
              </section>
            ))}
          </div>

          <section className="mt-6 rounded-lg border border-linha p-4">
            <h2 className="font-display text-2xl font-bold">Mês a mês</h2>
            <div className="mt-2 flex gap-3 text-xs">
              <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-sm bg-liberado" /> Entradas</span>
              <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-sm bg-sangue" /> Saídas</span>
            </div>
            <div className="mt-3 overflow-x-auto">
              <div className="flex min-w-[560px] items-end gap-2" style={{ height: 180 }}>
                {t.meses.map((m) => (
                  <div key={m.mes} className="flex flex-1 flex-col items-center justify-end gap-1" style={{ height: '100%' }}>
                    <div className="flex w-full items-end justify-center gap-0.5" style={{ height: 150 }}>
                      <div className="w-1/2 rounded-t bg-liberado" style={{ height: `${(m.entradas / maiorMes) * 100}%` }} title={`Entradas: ${moeda(m.entradas)}`} />
                      <div className="w-1/2 rounded-t bg-sangue" style={{ height: `${(m.saidas / maiorMes) * 100}%` }} title={`Saídas: ${moeda(m.saidas)}`} />
                    </div>
                    <span className="text-xs text-texto-suave">{MESES_CURTOS[m.mes - 1]}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead><tr className="text-texto-suave"><th className="text-left">Mês</th><th className="text-right">Entradas</th><th className="text-right">Saídas</th><th className="text-right">Resultado</th></tr></thead>
                <tbody>
                  {t.meses.filter((m) => m.entradas || m.saidas).map((m) => (
                    <tr key={m.mes} className="border-t border-linha tabular-nums">
                      <td className="py-1">{MESES_CURTOS[m.mes - 1]}</td>
                      <td className="text-right">{moeda(m.entradas)}</td>
                      <td className="text-right">{moeda(m.saidas)}</td>
                      <td className={`text-right font-semibold ${m.entradas - m.saidas < 0 ? 'text-sangue-escuro' : ''}`}>{moeda(m.entradas - m.saidas)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <p className="mt-4 text-xs text-texto-suave">
            Mensalidades vencem no dia {t.diaVencimento} de cada mês.
            {t.atualizadoEm?.toDate && ` Última atualização em ${t.atualizadoEm.toDate().toLocaleDateString('pt-BR')}.`}
          </p>
        </>
      )}
    </div>
  )
}
