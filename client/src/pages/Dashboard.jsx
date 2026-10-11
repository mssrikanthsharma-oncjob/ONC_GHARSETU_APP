import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDashboardStats } from '../api/index'
import LoadingSpinner from '../components/LoadingSpinner'

const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN')

function BarChart({ data }) {
  const [hoveredBar, setHoveredBar] = useState(null)
  const max = Math.max(...data.map(d => d.total), 1)
  if (max === 0 || data.every(d => d.total === 0)) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        No brokerage data yet
      </div>
    )
  }

  const chartX = 60
  const chartW = 520
  const chartY = 10
  const chartH = 170
  const n = data.length
  const barW = (chartW / n) * 0.55
  const guides = [0.25, 0.5, 0.75, 1]

  return (
    <div className="relative overflow-hidden">
      <svg width="100%" height="220" viewBox="0 0 600 220">
        {/* guide lines + y labels */}
        {guides.map((g) => {
          const y = chartY + chartH - g * chartH
          const val = Math.round(max * g)
          return (
            <g key={g}>
              <line x1={chartX} y1={y} x2={chartX + chartW} y2={y} stroke="#e5e7eb" strokeWidth="1" />
              <text x="55" y={y + 4} textAnchor="end" fill="#9ca3af" fontSize="10">
                {val >= 100000 ? `₹${(val / 100000).toFixed(1)}L` : `₹${val}`}
              </text>
            </g>
          )
        })}
        {/* bars + x labels */}
        {data.map((d, i) => {
          const slotW = chartW / n
          const x = chartX + i * slotW + (slotW - barW) / 2
          const barH = Math.max((d.total / max) * chartH, 2)
          const y = chartY + chartH - barH
          const cx = x + barW / 2
          return (
            <g key={d.month}>
              <rect
                x={x} y={y} width={barW} height={barH}
                fill={hoveredBar === i ? '#f0a500' : '#1e3a5f'}
                rx="3"
                onMouseEnter={() => setHoveredBar(i)}
                onMouseLeave={() => setHoveredBar(null)}
                style={{cursor: 'pointer'}}
              />
              <text x={cx} y={210} textAnchor="middle" fill="#6b7280" fontSize="11">
                {d.label}
              </text>
            </g>
          )
        })}
      </svg>
      {hoveredBar !== null && (
        <div
          className="absolute top-2 left-1/2 -translate-x-1/2 bg-white shadow-lg rounded-lg px-3 py-2 text-xs text-gray-700 pointer-events-none z-10 border border-gray-100"
        >
          <div className="font-semibold text-[#1e3a5f]">{data[hoveredBar].label}</div>
          <div className="text-[#f0a500] font-bold">{fmt(data[hoveredBar].total)}</div>
        </div>
      )}
    </div>
  )
}

function KpiCard({ icon, label, value, valueClass = 'text-[#1e3a5f]', bg = 'bg-blue-100' }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-full ${bg} flex items-center justify-center flex-shrink-0`}>
          {icon}
        </div>
        <span className="text-gray-500 text-xs leading-tight">{label}</span>
      </div>
      <div className={`text-2xl font-bold mt-2 ${valueClass}`}>{value}</div>
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    getDashboardStats()
      .then(data => { setStats(data); setLoading(false) })
      .catch(() => { setError(true); setLoading(false) })
  }, [])

  if (loading) return <LoadingSpinner fullPage />
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-50 text-red-600 rounded-xl p-8 text-center max-w-sm">
          <div className="text-2xl mb-2">⚠️</div>
          <p className="font-semibold">Failed to load dashboard data.</p>
          <p className="text-sm mt-1 text-red-400">Check that the server is running.</p>
        </div>
      </div>
    )
  }

  const { kpis, monthly_brokerage, recent_deals, top_localities,
    property_status_breakdown, customer_type_breakdown, followup_needed } = stats

  const today = new Date()
  const dateStr = today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const propTotal = (property_status_breakdown.available + property_status_breakdown.pending + property_status_breakdown.sold) || 1
  const custTotal = (customer_type_breakdown.buyer + customer_type_breakdown.seller + customer_type_breakdown.both) || 1
  const maxLocalDeals = top_localities.length ? Math.max(...top_localities.map(l => l.deal_count), 1) : 1

  const statusBadge = (status) => {
    const map = {
      completed: 'bg-green-100 text-green-700',
      in_progress: 'bg-yellow-100 text-yellow-700',
      cancelled: 'bg-red-100 text-red-700',
    }
    return map[status] || 'bg-gray-100 text-gray-600'
  }

  const statusLabel = (status) => {
    const map = { completed: 'Closed', in_progress: 'In Progress', cancelled: 'Cancelled' }
    return map[status] || status
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-[#1e3a5f]">Dashboard</h1>
        <span className="text-gray-400 text-sm">{dateStr}</span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <KpiCard
          bg="bg-blue-100"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1e3a5f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          }
          label="Deals This Month"
          value={kpis.deals_this_month}
        />
        <KpiCard
          bg="bg-amber-100"
          icon={
            <span className="text-[#f0a500] font-bold text-base">₹</span>
          }
          label="Brokerage This Month"
          value={fmt(kpis.brokerage_this_month)}
          valueClass="text-[#f0a500]"
        />
        <KpiCard
          bg="bg-blue-100"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1e3a5f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          }
          label="All-Time Brokerage"
          value={fmt(kpis.brokerage_all_time)}
        />
        <KpiCard
          bg="bg-indigo-100"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
          }
          label="Total Deals"
          value={kpis.total_deals}
        />
        <KpiCard
          bg="bg-green-100"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          }
          label="Closed Deals"
          value={kpis.deals_closed}
          valueClass="text-green-600"
        />
        <KpiCard
          bg="bg-yellow-100"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          }
          label="In Progress"
          value={kpis.deals_in_negotiation}
          valueClass="text-yellow-600"
        />
      </div>

      {/* Row 2: Bar chart + Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Monthly Brokerage Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-[#1e3a5f] mb-4">Monthly Brokerage – Last 6 Months</h2>
          <BarChart data={monthly_brokerage} />
        </div>

        {/* Property & Customer Breakdown */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <p className="text-sm font-semibold text-gray-700 mb-3">Properties</p>
          {[
            { label: 'Available', value: property_status_breakdown.available, total: propTotal, color: 'bg-green-500' },
            { label: 'Pending', value: property_status_breakdown.pending, total: propTotal, color: 'bg-yellow-500' },
            { label: 'Sold', value: property_status_breakdown.sold, total: propTotal, color: 'bg-red-500' },
          ].map(r => (
            <div key={r.label} className="flex items-center gap-2 mb-2">
              <span className="w-20 text-sm text-gray-600 flex-shrink-0">{r.label}</span>
              <div className="flex-1 h-5 bg-gray-100 rounded-full relative overflow-hidden">
                <div
                  className={`${r.color} h-5 rounded-full transition-all duration-500`}
                  style={{ width: `${Math.round((r.value / r.total) * 100)}%` }}
                />
              </div>
              <span className="text-sm font-medium ml-1 w-6 text-right">{r.value}</span>
            </div>
          ))}
          <hr className="my-4 border-gray-100" />
          <p className="text-sm font-semibold text-gray-700 mb-3">Customers</p>
          {[
            { label: 'Buyer', value: customer_type_breakdown.buyer, total: custTotal, color: 'bg-blue-500' },
            { label: 'Seller', value: customer_type_breakdown.seller, total: custTotal, color: 'bg-purple-500' },
            { label: 'Both', value: customer_type_breakdown.both, total: custTotal, color: 'bg-indigo-500' },
          ].map(r => (
            <div key={r.label} className="flex items-center gap-2 mb-2">
              <span className="w-20 text-sm text-gray-600 flex-shrink-0">{r.label}</span>
              <div className="flex-1 h-5 bg-gray-100 rounded-full relative overflow-hidden">
                <div
                  className={`${r.color} h-5 rounded-full transition-all duration-500`}
                  style={{ width: `${Math.round((r.value / r.total) * 100)}%` }}
                />
              </div>
              <span className="text-sm font-medium ml-1 w-6 text-right">{r.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Row 3: Recent Deals + Follow-Up */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Recent Deals */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-[#1e3a5f]">Recent Deals</h2>
            <button
              onClick={() => navigate('/deals')}
              className="text-[#1e3a5f] text-sm hover:underline"
            >
              View All →
            </button>
          </div>
          {recent_deals.length === 0 ? (
            <div className="text-center text-gray-400 py-8">No deals yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#1e3a5f] text-white">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Property</th>
                    <th className="px-4 py-3 text-left font-medium">Buyer</th>
                    <th className="px-4 py-3 text-left font-medium">Amount</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-left font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recent_deals.map(d => (
                    <tr key={d.id} className="hover:bg-blue-50 border-b border-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800 truncate max-w-[130px]">{d.property_title || '—'}</div>
                        <div className="text-gray-400 text-xs">{d.property_locality || ''}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{d.buyer_name || '—'}</td>
                      <td className="px-4 py-3 text-[#f0a500] font-semibold">{fmt(d.total_brokerage_amount)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${statusBadge(d.status)}`}>
                          {statusLabel(d.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{d.deal_date ? d.deal_date.slice(0, 10) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Follow-Up Alerts */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800">⏰ Follow-Up Needed</h2>
            <span className="bg-yellow-100 text-yellow-700 rounded-full px-2.5 py-0.5 text-xs font-medium">
              {followup_needed.length}
            </span>
          </div>
          {followup_needed.length === 0 ? (
            <div className="text-center text-gray-400 py-8">✅ All customers up to date</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {followup_needed.map(c => {
                const days = Math.floor((Date.now() - new Date(c.updated_at)) / 86400000)
                return (
                  <div key={c.id} className="px-6 py-3 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-800">{c.name}</div>
                      <div className="text-gray-500 text-sm">{c.phone || '—'}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 text-xs capitalize">{c.type}</span>
                      <span className="text-gray-400 text-xs">{days} days ago</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          <div className="px-6 py-3 border-t border-gray-100">
            <button
              onClick={() => navigate('/customers')}
              className="text-[#1e3a5f] text-sm hover:underline"
            >
              View All Customers →
            </button>
          </div>
        </div>
      </div>

      {/* Top Localities */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
        <h2 className="text-lg font-semibold text-[#1e3a5f] mb-4">Top Localities by Deals</h2>
        {top_localities.length === 0 ? (
          <div className="text-gray-400 text-center py-4">No deal data yet</div>
        ) : (
          <div className="space-y-3">
            {top_localities.map((loc, i) => (
              <div key={loc.locality} className="flex items-center gap-3">
                <div className="bg-[#1e3a5f] text-white rounded-full w-6 h-6 flex items-center justify-center text-xs flex-shrink-0">
                  {i + 1}
                </div>
                <span className="w-32 text-sm font-medium text-gray-700 truncate flex-shrink-0">{loc.locality}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-4 relative overflow-hidden">
                  <div
                    className="bg-[#1e3a5f] h-4 rounded-full transition-all duration-500"
                    style={{ width: `${Math.round((loc.deal_count / maxLocalDeals) * 100)}%` }}
                  />
                </div>
                <span className="text-sm text-gray-500 w-16 text-right flex-shrink-0">{loc.deal_count} deal{loc.deal_count !== 1 ? 's' : ''}</span>
                <span className="text-sm font-semibold text-[#f0a500] w-28 text-right flex-shrink-0">{fmt(loc.total_brokerage)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
