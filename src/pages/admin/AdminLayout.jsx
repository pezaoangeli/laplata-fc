import { NavLink, Outlet } from 'react-router-dom'

const abas = [
  { to: 'jogos', rotulo: 'Jogos' },
  { to: 'agenda', rotulo: 'Agenda' },
  { to: 'jogadores', rotulo: 'Jogadores' },
  { to: 'adversarios', rotulo: 'Adversários' },
  { to: 'locais', rotulo: 'Campos' },
  { to: 'premiacoes', rotulo: 'Premiações' },
  { to: 'importar', rotulo: 'Importar dados' },
  { to: 'backup', rotulo: 'Backup' },
]

export default function AdminLayout() {
  return (
    <div className="min-h-full bg-cimento">
      <div className="border-b border-linha bg-papel">
        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4">
          {abas.map((a) => (
            <NavLink key={a.to} to={a.to}
              className={({ isActive }) =>
                `whitespace-nowrap border-b-4 px-3 py-3 font-display text-lg font-semibold ${
                  isActive ? 'border-sangue text-preto' : 'border-transparent text-texto-suave hover:text-preto'
                }`}>
              {a.rotulo}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </div>
    </div>
  )
}
