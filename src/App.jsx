import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import AdminRoute from './components/AdminRoute.jsx'
import Inicio from './pages/Inicio.jsx'
import Jogos from './pages/Jogos.jsx'
import JogoDetalhe from './pages/JogoDetalhe.jsx'
import Estatisticas from './pages/Estatisticas.jsx'
import Elenco from './pages/Elenco.jsx'
import JogadorDetalhe from './pages/JogadorDetalhe.jsx'
import AdversariosPublico from './pages/AdversariosPublico.jsx'
import Premiacoes from './pages/Premiacoes.jsx'
import Login from './pages/Login.jsx'
import AdminLayout from './pages/admin/AdminLayout.jsx'
import Jogadores from './pages/admin/Jogadores.jsx'
import Adversarios from './pages/admin/Adversarios.jsx'
import Locais from './pages/admin/Locais.jsx'
import Importar from './pages/admin/Importar.jsx'
import JogosAdmin from './pages/admin/JogosAdmin.jsx'
import Sumula from './pages/admin/Sumula.jsx'
import PremiacoesAdmin from './pages/admin/PremiacoesAdmin.jsx'
import Agenda from './pages/admin/Agenda.jsx'
import Backup from './pages/admin/Backup.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Inicio />} />
        <Route path="jogos" element={<Jogos />} />
        <Route path="jogos/:id" element={<JogoDetalhe />} />
        <Route path="numeros" element={<Estatisticas />} />
        <Route path="elenco" element={<Elenco />} />
        <Route path="elenco/:id" element={<JogadorDetalhe />} />
        <Route path="adversarios" element={<AdversariosPublico />} />
        <Route path="premiacoes" element={<AdminRoute><Premiacoes /></AdminRoute>} />
        <Route path="entrar" element={<Login />} />
        <Route
          path="admin"
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route index element={<Navigate to="jogos" replace />} />
          <Route path="jogos" element={<JogosAdmin />} />
          <Route path="jogos/:id/sumula" element={<Sumula />} />
          <Route path="agenda" element={<Agenda />} />
          <Route path="jogadores" element={<Jogadores />} />
          <Route path="adversarios" element={<Adversarios />} />
          <Route path="locais" element={<Locais />} />
          <Route path="premiacoes" element={<PremiacoesAdmin />} />
          <Route path="importar" element={<Importar />} />
          <Route path="backup" element={<Backup />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
