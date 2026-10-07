import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'

const MENSAGENS = {
  'auth/popup-closed-by-user': 'A janela do Google foi fechada antes de concluir.',
  'auth/cancelled-popup-request': 'A janela do Google foi fechada antes de concluir.',
  'auth/popup-blocked': 'O navegador bloqueou a janela do Google. Libere pop-ups para este site e tente de novo.',
  'auth/network-request-failed': 'Sem conexão com a internet.',
  'auth/unauthorized-domain': 'Este endereço não está autorizado no Firebase (Authentication > Configurações > Domínios autorizados).',
}

export default function Login() {
  const { user, isAdmin, carregando, entrar, sair } = useAuth()
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  if (!carregando && user && isAdmin) return <Navigate to="/admin" replace />

  async function entrarComGoogle() {
    setErro('')
    setEnviando(true)
    try {
      await entrar()
    } catch (err) {
      setErro(MENSAGENS[err.code] || 'Não foi possível entrar. Tente de novo.')
    } finally {
      setEnviando(false)
    }
  }

  // Logado, mas ainda não é admin: mostra o UID para ser cadastrado na coleção admins
  if (!carregando && user && !isAdmin) {
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <h1 className="font-display text-4xl font-bold">Login sem acesso ao painel</h1>
        <p className="mt-2">
          Você entrou como <strong>{user.email}</strong>, mas esta conta ainda não é admin.
          Envie o código abaixo para quem cuida do site.
        </p>
        <p className="mt-4 break-all rounded-md bg-cimento p-3 font-mono text-sm select-all">{user.uid}</p>
        <button onClick={sair} className="mt-4 font-semibold text-sangue-escuro">Sair e trocar de conta</button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-12">
      <h1 className="font-display text-4xl font-bold">Entrar no painel</h1>
      <p className="mt-1 text-texto-suave">Acesso para quem organiza o time.</p>

      <button onClick={entrarComGoogle} disabled={enviando || carregando}
        className="mt-6 flex w-full items-center justify-center gap-3 rounded-md border-2 border-preto bg-papel py-2.5 font-semibold hover:bg-cimento disabled:opacity-60">
        <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
          <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/>
        </svg>
        {enviando ? 'Entrando…' : 'Entrar com Google'}
      </button>
      {erro && <p className="mt-3 text-sm font-semibold text-sangue-escuro" role="alert">{erro}</p>}
    </div>
  )
}
