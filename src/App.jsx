import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import AdminRoute from './components/AdminRoute.jsx'
import Inicio from './pages/Inicio.jsx'
import Login from './pages/Login.jsx'
import AdminLayout from './pages/admin/AdminLayout.jsx'
import Jogadores from './pages/admin/Jogadores.jsx'
import Adversarios from './pages/admin/Adversarios.jsx'
import Locais from './pages/admin/Locais.jsx'
import Importar from './pages/admin/Importar.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Inicio />} />
        <Route path="entrar" element={<Login />} />
        <Route
          path="admin"
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route index element={<Navigate to="jogadores" replace />} />
          <Route path="jogadores" element={<Jogadores />} />
          <Route path="adversarios" element={<Adversarios />} />
          <Route path="locais" element={<Locais />} />
          <Route path="importar" element={<Importar />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
