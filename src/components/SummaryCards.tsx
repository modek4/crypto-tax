import { TrendingUp, TrendingDown, Receipt, AlertCircle, Download } from 'lucide-react'
import { useAppContext } from '../context/AppContext'
import { usePIT38 } from '../hooks/usePIT38'

//* Formatowanie liczb do formatu PLN z dwoma miejscami po przecinku
function fmt(n: number) {
  return n.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

//* Komponent karty statystycznej z ikoną, etykietą, wartością i opcjonalnym podtytułem oraz akcentem kolorystycznym
function StatCard({ icon, label, value, sub, accent }: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
  accent?: 'green' | 'red' | 'blue' | 'purple'
}) {
  const colors: Record<string, string> = {
    green: 'dark:border-emerald-700/40 dark:bg-emerald-900/10 border-emerald-700 bg-emerald-500/30',
    red:   'dark:border-red-700/40 dark:bg-red-900/10 border-red-700 bg-red-500/30',
    blue:  'dark:border-blue-700/40 dark:bg-blue-900/10 border-blue-700 bg-blue-500/30',
    purple: 'dark:border-purple-700/40 dark:bg-purple-900/10 border-purple-700 bg-purple-500/30',
  }
  return (
    <div className={`card flex flex-col gap-2 border ${accent ? colors[accent] : ''}`}>
      <div className='flex items-center gap-2 dark:text-slate-400 text-slate-800 text-xs font-medium uppercase tracking-wider'>
        {icon}{label}
      </div>
      <p className='text-2xl font-bold dark:text-slate-100 tabular-nums'>{value} <span className='text-sm font-normal dark:text-slate-400 text-slate-600'>PLN</span></p>
      {sub && <p className='text-xs text-slate-500'>{sub}</p>}
    </div>
  )
}

//* Główny komponent wyświetlający karty z podsumowaniem oraz tabelę statystyk i przycisk do pobrania Excela
export function SummaryCards() {
  const { state: { result, config } } = useAppContext()
  const { downloadExcel } = usePIT38()
  if (!result) return null

  return (
    <div className='space-y-5'>
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
        <StatCard
          icon={<TrendingUp className='w-4 h-4 dark:text-emerald-400 text-emerald-600' />}
          label={`Pole 34 — Przychody`}
          value={fmt(result.totalRevenue)}
          sub={`Sprzedaż: ${fmt(result.totalRevenueSale)} | Earn: ${fmt(result.totalRevenueEarn)}`}
          accent='green'
        />
        <StatCard
          icon={<TrendingDown className='w-4 h-4 dark:text-red-400 text-red-600' />}
          label={`Pole 35 — Koszty`}
          value={fmt(result.totalCosts)}
          sub={`Bieżące: ${fmt(result.totalCostsCurrent)} | Poprz.: ${fmt(result.totalCostsCarried)}`}
          accent='red'
        />
        <StatCard
          icon={<Receipt className='w-4 h-4 dark:text-blue-400 text-blue-600' />}
          label='Podatek 19%'
          value={result.taxPLN.toLocaleString('pl-PL')}
          sub={`Podstawa: ${result.basePLN.toLocaleString('pl-PL')} PLN`}
          accent='blue'
        />
        <StatCard
          icon={<AlertCircle className='w-4 h-4 dark:text-purple-400 text-purple-600' />}
          label='Nadwyżka na następny rok'
          value={fmt(result.surplusToCosts)}
          sub='art. 22 ust. 16 updof'
          accent='purple'
        />
      </div>
      <div className='card'>
        <h3 className='text-sm font-semibold dark:text-slate-300 text-slate-800 mb-3 uppercase tracking-wider'>
          Podsumowanie transakcji — rok {config.targetYear}
        </h3>
        <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3'>
          {[
            ['Przychody', result.revenues.length, 'badge-green'],
            ['Koszty', result.costs.length, 'badge-red'],
            ['Earn/Staking', result.incomes.length, 'badge-blue'],
            ['Do weryfikacji', result.warnings.length, 'badge-yellow'],
            ['Neutralne', result.ignored.length, 'badge-gray'],
          ].map(([label, count, cls]) => (
            <div key={label as string} className='flex flex-col items-center gap-1 p-3 dark:bg-neutral-800/60 bg-neutral-400/20 rounded-lg'>
              <span className={cls as string}>{count as number}</span>
              <span className='text-xs dark:text-slate-400'>{label as string}</span>
            </div>
          ))}
        </div>
      </div>
      <button className='btn-primary w-full justify-center py-3 text-base' onClick={downloadExcel}>
        <Download className='w-5 h-5' />
        Pobierz Excel — Binance_PIT38_{config.targetYear}.xlsx
      </button>
      <p className='text-xs dark:text-red-600 text-red-500 text-center'>
        To narzędzie pomocnicze. Zawsze zweryfikuj wynik z doradcą podatkowym przed złożeniem PIT-38.
      </p>
    </div>
  )
}
