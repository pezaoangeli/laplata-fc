import { Link, NavLink, Outlet } from 'react-router-dom'
import Escudo from './Escudo.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'

const SECOES = [
  { to: '/', rotulo: 'Início', end: true },
  { to: '/jogos', rotulo: 'Jogos' },
  { to: '/numeros', rotulo: 'Números' },
  { to: '/elenco', rotulo: 'Elenco' },
  { to: '/adversarios', rotulo: 'Adversários' },
  { to: '/premiacoes', rotulo: 'Premiações', soAdmin: true },
]

const linkSecao = ({ isActive }) =>
  `whitespace-nowrap px-3 py-2 font-display text-lg font-semibold ${
    isActive ? 'text-papel underline decoration-sangue decoration-4 underline-offset-8' : 'text-papel/70 hover:text-papel'
  }`

export default function Layout() {
  const { user, isAdmin, sair } = useAuth()

  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-preto">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 pt-2">
          <Link to="/" className="flex items-center gap-2">
            <Escudo className="h-11 w-11" />
            <span className="font-display text-2xl font-extrabold uppercase text-papel">La Plata</span>
          </Link>
          <div className="ml-auto flex items-center gap-1 text-sm font-semibold">
            {isAdmin && <NavLink to="/admin" className="rounded bg-sangue px-3 py-1.5 text-papel">Painel</NavLink>}
            {user ? (
              <button onClick={sair} className="px-2 py-1.5 text-papel/70 hover:text-papel">Sair</button>
            ) : (
              <NavLink to="/entrar" className="px-2 py-1.5 text-papel/70 hover:text-papel">Entrar</NavLink>
            )}
          </div>
        </div>
        <nav className="mx-auto flex max-w-5xl overflow-x-auto px-1 pb-1" aria-label="Seções do site">
          {SECOES.filter((s) => !s.soAdmin || isAdmin).map((s) => <NavLink key={s.to} to={s.to} end={s.end} className={linkSecao}>{s.rotulo}</NavLink>)}
        </nav>
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
