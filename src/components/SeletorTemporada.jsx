import { listaTemporadas } from '../lib/temporadas.js'

export default function SeletorTemporada({ valor, onChange }) {
  return (
    <label className="flex items-center gap-2">
      <span className="text-sm font-semibold">Temporada</span>
      <select className="campo w-auto" value={valor} onChange={(e) => onChange(Number(e.target.value))}>
        {listaTemporadas().map((a) => <option key={a} value={a}>{a}</option>)}
      </select>
    </label>
  )
}
