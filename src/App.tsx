import { AppProvider } from './context/AppContext'
import { ConfigPanel } from './components/ConfigPanel'
import { FileUpload } from './components/FileUpload'
import { ProgressLog } from './components/ProgressLog'
import { WarningBanner } from './components/WarningBanner'
import { SummaryCards } from './components/SummaryCards'
import { TransactionTabs }from './components/TransactionTabs'

export default function App() {
  return (
    <AppProvider>
      <div className='min-h-screen'>
        <header className='border-b border-neutral-800 bg-neutral-950/80 backdrop-blur sticky top-0 z-10'>
          <div className='max-w-6xl mx-auto px-4 py-3 flex items-center justify-between'>
            <div>
              <h1 className='text-base font-bold text-slate-100'>
                PIT-38 Crypto <span className='text-yellow-500'>Binance</span>
              </h1>
              <p className='text-xs text-slate-500'>
                Rozliczenie kryptowalut dla Urzędu Skarbowego · art. 17 ust. 1f, art. 30b updof
              </p>
            </div>
            <a href='https://www.gov.pl/web/e-urząd-skarbowy/zeznanie-pit-38'
              target='_blank' rel='noreferrer'
              className='text-xs text-slate-500 hover:text-red-500 transition-colors'>
              e-US / PIT-38
            </a>
          </div>
        </header>
        <main className='max-w-6xl mx-auto px-4 py-8 space-y-6'>
          <ConfigPanel />
          <FileUpload />
          <ProgressLog />
          <WarningBanner />
          <SummaryCards />
          <TransactionTabs />
        </main>
        <footer className='border-t border-neutral-800 mt-16'>
          <div className='max-w-6xl mx-auto px-4 py-6 text-center text-xs text-slate-600'>
            <p>Narzędzie pomocnicze. Nie stanowi porady prawnej ani podatkowej.</p>
            <p className='mt-1'>Dane przetwarzane wyłącznie lokalnie w przeglądarce — żadne pliki nie są wysyłane na serwer.</p>
          </div>
        </footer>
      </div>
    </AppProvider>
  )
}
