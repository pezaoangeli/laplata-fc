import { doc, increment, setDoc } from 'firebase/firestore'
import { db } from '../firebase.js'

const hoje = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// De onde veio: ?origem=... no link tem prioridade; senão, pelo site anterior
function origem() {
  const param = new URLSearchParams(window.location.search).get('origem')
  if (param) return param.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 20) || 'direto'
  const ref = document.referrer
  try { if (!ref || new URL(ref).host === window.location.host) return 'direto' } catch { return 'direto' }
  if (/instagram/.test(ref)) return 'instagram'
  if (/facebook|fb\./.test(ref)) return 'facebook'
  if (/google\./.test(ref)) return 'google'
  return 'outros'
}

// Conta uma visita por sessão do navegador (navegar entre páginas não conta de novo). Só no site publicado.
// Tira o ?origem=... da barra de endereço depois de ler, para o link ficar limpo
function limparEndereco() {
  const url = new URL(window.location.href)
  if (!url.searchParams.has('origem')) return
  url.searchParams.delete('origem')
  window.history.replaceState(null, '', url.pathname + (url.search || '') + url.hash)
}

export function registrarVisita() {
  if (!import.meta.env.PROD) return limparEndereco()
  try {
    if (sessionStorage.getItem('visitaContada')) return limparEndereco()
    sessionStorage.setItem('visitaContada', '1')
  } catch { /* navegador sem sessionStorage: conta mesmo assim */ }
  const o = origem()
  limparEndereco()
  setDoc(doc(db, 'visitas', hoje()), { total: increment(1), origens: { [o]: increment(1) } }, { merge: true }).catch(() => {})
}
