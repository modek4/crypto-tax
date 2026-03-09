import { useState } from 'react'
import type { ProcessedRow } from '../types/pit38'
import { useAppContext } from '../context/AppContext'

//* Stałe definujące zakładki i ich etykiety
const TABS = [
  { key: 'revenues', label: '📈 Przychody (Pole 34)' },
  { key: 'incomes',  label: '💰 Earn/Staking' },
  { key: 'costs',    label: '📉 Koszty (Pole 35)' },
  { key: 'warnings', label: '⚠️ Do weryfikacji' },
  { key: 'ignored',  label: '✅ Neutralne' },
] as const

//* Formatowanie liczb do formatu PLN z dwoma miejscami po przecinku
function fmt(n: number) {
  return n.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

//* Tabela wyświetlająca listę transakcji dla danej kategorii
function Table({ rows }: { rows: ProcessedRow[] }) {
  const [page, setPage] = useState(0)
  const PER_PAGE = 50
  const totalPages = Math.ceil(rows.length / PER_PAGE)
  const visible = rows.slice(page * PER_PAGE, (page + 1) * PER_PAGE)
  //* Pusto
  if (rows.length === 0) return <p className='dark:text-slate-500 text-slate-400 text-sm py-4 text-center'>Brak wierszy w tej kategorii.</p>
  //* Pełno
  return (
    <div className='space-y-3'>
      <div className='overflow-x-auto rounded-lg border dark:border-neutral-800 border-neutral-400'>
        <table className='w-full text-xs text-left'>
          <thead>
            <tr className='dark:bg-neutral-800 dark:text-slate-400 bg-neutral-300 text-slate-700 uppercase text-xs'>
              {['Data','Operacja','Moneta','Ilość','PLN','Kurs NBP','Typ / Powód'].map(h => (
                <th key={h} className='px-3 py-2 font-medium whitespace-nowrap'>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((r, i) => (
              <tr key={i} className='border-t dark:border-neutral-800/60 dark:hover:bg-neutral-800/30 border-neutral-300'>
                <td className='px-3 py-2 dark:text-slate-400 whitespace-nowrap font-mono'>{r.operationDate.slice(0,10)}</td>
                <td className='px-3 py-2 dark:text-slate-300 max-w-32 truncate' title={r.operationName}>{r.operationName}</td>
                <td className='px-3 py-2 font-medium dark:text-slate-200'>{r.coinName}</td>
                <td className='px-3 py-2 font-mono dark:text-slate-300 text-right'>{r.coinAmount}</td>
                <td className={`px-3 py-2 font-mono font-medium text-right whitespace-nowrap
                  ${r.category === 'revenue' || r.category === 'income' ? 'dark:text-emerald-400 text-emerald-600' :
                    r.category === 'cost' ? 'dark:text-red-400 text-red-600' : 'dark:text-slate-400 text-slate-600'}`}>
                  {r.pricePLN > 0 ? fmt(r.pricePLN) : '—'}
                </td>
                <td className='px-3 py-2 font-mono dark:text-slate-500 text-right'>
                  {r.shareNBP ? r.shareNBP.toFixed(4) : '—'}
                </td>
                <td className='px-3 py-2 dark:text-slate-400 max-w-48 truncate' title={r.extendedCategory + (r.additionalWarning ? ' | ' + r.additionalWarning : '') + (r.additionalReason ? ' | ' + r.additionalReason : '')}>
                  {r.extendedCategory}
                  {r.additionalWarning && <span className='ml-1 badge-yellow'>{r.additionalWarning.slice(0,30)}…</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className='flex items-center justify-between text-xs text-slate-500'>
          <span>{rows.length.toLocaleString('pl-PL')} wierszy</span>
          <div className='flex gap-2'>
            <button className='btn-ghost py-1 px-2 text-xs' disabled={page === 0}
              onClick={() => setPage(p => p - 1)}>&lt; Poprz.</button>
            <span className='px-2 py-1'>{page + 1} / {totalPages}</span>
            <button className='btn-ghost py-1 px-2 text-xs' disabled={page >= totalPages - 1}
              onClick={() => setPage(p => p + 1)}>Nast. &gt;</button>
          </div>
        </div>
      )}
    </div>
  )
}

//* Główny komponent z zakładkami i tabelą transakcji
export function TransactionTabs() {
  const { state: { result } } = useAppContext()
  const [active, setActive] = useState<typeof TABS[number]['key']>('revenues')
  if (!result) return null
  //* Liczniki wierszy dla każdej kategorii do wyświetlenia na zakładkach
  const counts: Record<string, number> = {
    revenues: result.revenues.length,
    incomes:  result.incomes.length,
    costs:    result.costs.length,
    warnings: result.warnings.length,
    ignored:  result.ignored.length,
  }
  //* Dane do tabeli dla każdej kategorii
  const data: Record<string, ProcessedRow[]> = {
    revenues: result.revenues,
    incomes:  result.incomes,
    costs:    result.costs,
    warnings: result.warnings,
    ignored:  result.ignored,
  }

  return (
    <div className='card space-y-4'>
      <div className='flex flex-wrap gap-1 border-b dark:border-neutral-800 border-neutral-300 pb-3'>
        {TABS.map(tab => (
          <button key={tab.key}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium ${
              active === tab.key
                ? 'dark:bg-purple-600 dark:text-white bg-purple-200 text-neutral-900'
                : 'dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-neutral-800 hover:bg-neutral-200 hover:text-neutral-900 text-slate-600'
            }`}
            onClick={() => setActive(tab.key)}
          >
            {tab.label}
            {counts[tab.key] > 0 && (
              <span className='ml-1.5 text-xs opacity-70'>({counts[tab.key]})</span>
            )}
          </button>
        ))}
      </div>
      <Table rows={data[active]} />
    </div>
  )
}
