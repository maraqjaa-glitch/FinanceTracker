import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import TopHeader from '@/components/layout/TopHeader'
import PortfolioCard from '@/components/portfolios/PortfolioCard'
import PortfolioFormModal from '@/components/portfolios/PortfolioFormModal'
import EmptyState from '@/components/ui/EmptyState'
import { SkeletonList } from '@/components/ui/Skeleton'
import { usePortfolios, usePortfolioValuations } from '@/hooks/usePortfolios'
import { useAllTransactions } from '@/hooks/useTransactions'
import { formatCurrency } from '@/utils/formatCurrency'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import type { InvestmentPortfolio, PortfolioValuation } from '@/types'

// Per-portfolio valuation loader — rendered only when portfolio data is ready
function PortfolioRow({
  portfolio,
  allTxns,
  onClick,
}: {
  portfolio: InvestmentPortfolio & { total_deposited: number }
  allTxns: ReturnType<typeof useAllTransactions>['data']
  onClick: () => void
}) {
  const { data: valuations = [] } = usePortfolioValuations(portfolio.id)
  const latestValuation = valuations.length > 0
    ? [...valuations].sort((a, b) => b.valuation_date.localeCompare(a.valuation_date))[0]
    : undefined

  return (
    <PortfolioCard
      portfolio={portfolio}
      latestValuation={latestValuation}
      onClick={onClick}
    />
  )
}

export default function PortfoliosPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { language } = useUIStore()
  const { profile } = useAuthStore()
  const currency = profile?.preferred_currency ?? 'PLN'

  const [modalOpen, setModalOpen] = useState(false)

  const { data: portfolios = [], isLoading } = usePortfolios()
  const { data: allTxns = [] } = useAllTransactions()

  // Enrich with total_deposited
  const enriched = portfolios.map(p => ({
    ...p,
    total_deposited: allTxns
      .filter(t => t.portfolio_id === p.id && t.type === 'investment')
      .reduce((s, t) => s + t.amount, 0),
  }))

  const totalDeposited = enriched.reduce((s, p) => s + p.total_deposited, 0)

  return (
    <div>
      <TopHeader
        title={t('portfolios.title')}
        right={
          <button
            onClick={() => setModalOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-white"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            <Plus className="w-4 h-4" />
          </button>
        }
      />

      <div className="px-4 py-4 flex flex-col gap-4">

        {/* Summary card */}
        {enriched.length > 0 && (
          <div className="card p-4">
            <p className="text-xs font-semibold mb-3" style={{ color: 'var(--color-text-muted)' }}>
              {t('common.total')} — {enriched.length} {enriched.length === 1 ? 'portfolio' : 'portfolios'}
            </p>
            <div className="flex gap-4">
              <div>
                <p className="text-[10px] mb-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  {t('portfolios.totalDeposited')}
                </p>
                <p className="text-lg font-bold tabular-nums" style={{ color: 'var(--color-text-primary)' }}>
                  {formatCurrency(totalDeposited, currency, language)}
                </p>
              </div>
              <div>
                <p className="text-[10px] mb-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  Portfolios
                </p>
                <div className="flex gap-1 flex-wrap mt-1">
                  {enriched.map(p => (
                    <span
                      key={p.id}
                      className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                      style={{ backgroundColor: `${p.color}20`, color: p.color }}
                    >
                      {p.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Portfolio list */}
        {isLoading ? (
          <SkeletonList count={3} />
        ) : enriched.length === 0 ? (
          <EmptyState
            icon="📈"
            title="No portfolios yet"
            description="Create a portfolio to track your investments and their returns"
            action={
              <button
                onClick={() => setModalOpen(true)}
                className="px-5 h-10 rounded-xl text-sm font-semibold text-white"
                style={{ backgroundColor: 'var(--color-accent)' }}
              >
                {t('portfolios.addPortfolio')}
              </button>
            }
          />
        ) : (
          <div className="flex flex-col gap-3">
            {enriched.map(p => (
              <PortfolioRow
                key={p.id}
                portfolio={p}
                allTxns={allTxns}
                onClick={() => navigate(`/portfolios/${p.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      <PortfolioFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  )
}
