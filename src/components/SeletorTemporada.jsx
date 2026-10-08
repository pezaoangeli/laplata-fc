import { listaTemporadas } from '../lib/temporadas.js'

// comTodas: adiciona a opção "Todas" (valor 'todas')
export default function SeletorTemporada({ valor, onChange, comTodas = false }) {
  return (
    <label className="flex items-center gap-2">
      <span className="text-sm font-semibold">Temporada</span>
      <select className="campo w-auto" value={valor}
        onChange={(e) => onChange(e.target.value === 'todas' ? 'todas' : Number(e.target.value))}>
        {listaTemporadas().map((a) => <option key={a} value={a}>{a}</option>)}
        {comTodas && <option value="todas">Todas</option>}
      </select>
    </label>
  )
}
