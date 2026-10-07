import { Link, NavLink, Outlet } from 'react-router-dom'
import Escudo from './Escudo.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'

const linkClasse = ({ isActive }) =>
  `px-3 py-2 font-display text-lg font-semibold tracking-wide ${
    isActive ? 'text-papel underline decoration-sangue decoration-4 underline-offset-8' : 'text-papel/75 hover:text-papel'
  }`

export default function Layout() {
  const { user, isAdmin, sair } = useAuth()

  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-preto">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2">
          <Link to="/" className="flex items-center gap-2">
            <Escudo className="h-11 w-11" />
            <span className="font-display text-2xl font-extrabold uppercase text-papel">La Plata</span>
          </Link>
          <nav className="ml-auto flex items-center">
            <NavLink to="/" end className={linkClasse}>Início</NavLink>
            {isAdmin && <NavLink to="/admin" className={linkClasse}>Painel</NavLink>}
            {user ? (
              <button onClick={sair} className="px-3 py-2 font-display text-lg font-semibold text-papel/75 hover:text-papel">
                Sair
              </button>
            ) : (
              <NavLink to="/entrar" className={linkClasse}>Entrar</NavLink>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-linha px-4 py-6 text-center text-sm text-texto-suave">
        La Plata Futebol Clube, Sapiranga-RS. Desde 2022.
      </footer>
    </div>
  )
}
