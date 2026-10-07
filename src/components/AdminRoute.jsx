import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'

export default function AdminRoute({ children }) {
  const { user, isAdmin, carregando } = useAuth()

  if (carregando) return <p className="p-6 text-texto-suave">Verificando acesso…</p>
  if (!user) return <Navigate to="/entrar" replace />
  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md p-6">
        <h1 className="font-display text-3xl font-bold">Sem acesso ao painel</h1>
        <p className="mt-2 text-texto-suave">
          Este login ainda não é administrador. Peça para quem cuida do site adicionar seu usuário na lista de admins.
        </p>
      </div>
    )
  }
  return children
}
