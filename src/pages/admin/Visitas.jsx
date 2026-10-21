import { useEffect, useMemo, useState } from 'react'
import { collection, documentId, onSnapshot, orderBy, query, where } from 'firebase/firestore'
import { db } from '../../firebase.js'

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const diasAtras = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return iso(d) }
const ROTULOS = { direto: 'Direto (sem origem)', instagram: 'Instagram', whatsapp: 'WhatsApp', qrcode: 'QR code', facebook: 'Facebook', google: 'Google', outros: 'Outros sites' }

export default function Visitas() {
  const [dias, setDias] = useState(null)
  const [periodo, setPeriodo] = useState(30)
  const [copiado, setCopiado] = useState(false)

  useEffect(() => onSnapshot(
    query(collection(db, 'visitas'), where(documentId(), '>=', diasAtras(364)), orderBy(documentId())),
    (s) => setDias(s.docs.map((d) => ({ dia: d.id, ...d.data() }))),
    () => setDias([])
  ), [])

  const r = useMemo(() => {
    if (!dias) return null
    const porDia = Object.fromEntries(dias.map((d) => [d.dia, d]))
    const soma = (n) => dias.filter((d) => d.dia >= diasAtras(n - 1)).reduce((s, d) => s + (d.total || 0), 0)
    const serie = Array.from({ length: periodo }, (_, i) => {
      const dia = diasAtras(periodo - 1 - i)
      return { dia, total: porDia[dia]?.total || 0 }
    })
    const origens = {}
    dias.filter((d) => d.dia >= diasAtras(periodo - 1)).forEach((d) =>
      Object.entries(d.origens || {}).forEach(([o, n]) => (origens[o] = (origens[o] || 0) + n)))
    return { hoje: porDia[diasAtras(0)]?.total || 0, d7: soma(7), d30: soma(30), ano: soma(365), serie, origens, max: Math.max(1, ...serie.map((s) => s.total)) }
  }, [dias, periodo])

  const host = window.location.host

  if (!r) return <p className="text-texto-suave">Carregando…</p>
  const totalOrigens = Object.values(r.origens).reduce((s, v) => s + v, 0)

  return (
    <div>
      <h1 className="font-display text-4xl font-bold">Visitas</h1>
      <p className="text-texto-suave">
        Cada pessoa conta uma vez por sessão: navegar entre as páginas não soma de novo. Acessos pelo npm run dev no seu computador não contam.
      </p>

      <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[['Hoje', r.hoje], ['Últimos 7 dias', r.d7], ['Últimos 30 dias', r.d30], ['Último ano', r.ano]].map(([t, v]) => (
          <div key={t} className="rounded-lg bg-papel px-4 py-3">
            <dt className="text-sm text-texto-suave">{t}</dt>
            <dd className="font-display text-4xl font-bold tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>

      <section className="mt-6 rounded-lg bg-papel p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-2xl font-bold">Por dia</h2>
          <div className="flex gap-2">
            {[30, 90].map((n) => (
              <button key={n} onClick={() => setPeriodo(n)}
                className={`rounded-full px-3 py-1 text-sm font-semibold ${periodo === n ? 'bg-preto text-papel' : 'bg-cimento'}`}>{n} dias</button>
            ))}
          </div>
        </div>
        <div className="mt-3 overflow-x-auto">
          <div className="flex items-end gap-px" style={{ height: 140, minWidth: periodo * 8 }}>
            {r.serie.map((s) => (
              <div key={s.dia} className="flex-1 rounded-t bg-sangue" title={`${s.dia.split('-').reverse().join('/')}: ${s.total}`}
                style={{ height: `${(s.total / r.max) * 100}%`, minHeight: s.total ? 2 : 0 }} />
            ))}
          </div>
        </div>
        <p className="mt-1 text-xs text-texto-suave">Passe o mouse (ou toque) numa barra para ver o dia.</p>
      </section>

      <section className="mt-6 rounded-lg bg-papel p-4">
        <h2 className="font-display text-2xl font-bold">De onde vieram ({periodo} dias)</h2>
        <ul className="mt-3 space-y-3">
          {Object.entries(r.origens).sort((a, b) => b[1] - a[1]).map(([o, n]) => (
            <li key={o}>
              <div className="flex justify-between text-sm"><span>{ROTULOS[o] || o}</span><span className="font-semibold tabular-nums">{n}</span></div>
              <div className="mt-1 h-2 rounded bg-cimento"><div className="h-2 rounded bg-preto" style={{ width: `${(n / (totalOrigens || 1)) * 100}%` }} /></div>
            </li>
          ))}
          {!totalOrigens && <li className="text-texto-suave">Nenhuma visita no período.</li>}
        </ul>
      </section>

      <section className="mt-6 rounded-lg border-2 border-preto bg-papel p-4">
        <h2 className="font-display text-2xl font-bold">Links de divulgação</h2>
        <p className="mt-1 text-sm">
          Use estes endereços curtos para saber quantas visitas vieram de cada lugar. Eles levam para a página inicial,
          e o visitante não vê nenhuma marcação no endereço.
        </p>
        <ul className="mt-3 space-y-2">
          {[['Bio do Instagram', 'insta'], ['Grupo do WhatsApp', 'zap'], ['QR code (cartaz, camiseta)', 'qr']].map(([rotulo, caminho]) => {
            const link = `${host}/${caminho}`
            return (
              <li key={caminho} className="flex flex-wrap items-center gap-2">
                <span className="w-56 text-sm font-semibold">{rotulo}</span>
                <code className="rounded bg-cimento px-2 py-1 text-sm">{link}</code>
                <button onClick={async () => { await navigator.clipboard.writeText(`https://${link}`); setCopiado(caminho); setTimeout(() => setCopiado(false), 2000) }}
                  className="rounded-md bg-sangue px-3 py-1 text-sm font-bold text-papel">{copiado === caminho ? 'Copiado' : 'Copiar'}</button>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
