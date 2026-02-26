import { useAppContext } from '../context/AppContext'

export function ConfigPanel() {
  const { state, dispatch } = useAppContext()
  const { config } = state
  const set = (key: string, value: string | number) => dispatch({ type: 'SET_CONFIG', payload: { [key]: value } })

  return (
    <div className='card space-y-4'>
      <h2 className='text-sm font-semibold text-slate-300 uppercase tracking-wider'>
        Konfiguracja
      </h2>
      <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
        <div>
          <label className='label'>Rok podatkowy</label>
          <input type='number' className='input' min={2019} max={2030}
            value={config.targetYear}
            onChange={e => set('targetYear', parseInt(e.target.value))} />
        </div>
        <div>
          <label className='label'>
            Nadwyżka kosztów z lat poprzednich (PLN)
            <span className='ml-1 text-slate-500 font-normal'>art. 22 ust. 16 updof</span>
          </label>
          <input type='number' className='input' min={0} step={0.01}
            value={config.carriedCosts}
            onChange={e => set('carriedCosts', parseFloat(e.target.value) || 0)} />
        </div>
        <div>
          <label className='label'>Separator CSV</label>
          <select className='input' value={config.csvSeparator}
            onChange={e => set('csvSeparator', e.target.value)}>
            <option value=';'>Średnik ( ; )</option>
            <option value=','>Przecinek ( , )</option>
            <option value='\t'>Tabulator</option>
          </select>
        </div>
        <div>
          <label className='label'>
            Dodatkowe stablecoiny
            <span className='ml-1 text-slate-500 font-normal'>(oddzielone przecinkiem)</span>
          </label>
          <input type='text' className='input' placeholder='np. EURC,USDD'
            value={config.extraStablecoins}
            onChange={e => set('extraStablecoins', e.target.value)} />
        </div>
      </div>
    </div>
  )
}
