import { useState, useEffect, useCallback } from 'react'
import {
  getDeals,
  getDealStats,
  createDeal,
  updateDeal,
  deleteDeal,
  getCustomers,
  getProperties
} from '../api/index.js'
import Modal from '../components/Modal'
import LoadingSpinner from '../components/LoadingSpinner'
import { useToast } from '../components/Toast'

function formatPrice(val) {
  if (!val && val !== 0) return '—'
  return '₹' + Number(val).toLocaleString('en-IN')
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function calcBrokerage(dealAmount, buyerPct, sellerPct) {
  const amount = Number(dealAmount) || 0
  const bPct = Number(buyerPct) || 0
  const sPct = Number(sellerPct) || 0
  const buyerAmt = (amount * bPct) / 100
  const sellerAmt = (amount * sPct) / 100
  return { buyerAmt, sellerAmt, total: buyerAmt + sellerAmt }
}

function brokerageTypeBadge(type) {
  const map = {
    buyer_only: 'bg-blue-100 text-blue-700',
    seller_only: 'bg-purple-100 text-purple-700',
    both: 'bg-green-100 text-green-700',
    split: 'bg-orange-100 text-orange-700'
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[type] || 'bg-gray-100 text-gray-600'}`}>
      {type ? type.replace('_', ' ') : '—'}
    </span>
  )
}

function statusBadge(status) {
  const map = {
    negotiation: 'bg-yellow-100 text-yellow-700',
    closed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700'
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status] || 'bg-gray-100 text-gray-500'}`}>
      {status || '—'}
    </span>
  )
}

const EMPTY_FORM = {
  property_id: '',
  buyer_customer_id: '',
  seller_customer_id: '',
  deal_date: todayStr(),
  deal_amount: '',
  brokerage_type: 'both',
  buyer_brokerage_pct: '',
  seller_brokerage_pct: '',
  brokers: [],
  notes: '',
  status: 'negotiation'
}

export default function Deals() {
  const { showToast } = useToast()

  const [deals, setDeals] = useState([])
  const [stats, setStats] = useState({})
  const [customers, setCustomers] = useState([])
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({ status: '', month: '' })
  const [showModal, setShowModal] = useState(false)
  const [selectedDeal, setSelectedDeal] = useState(null)
  const [dealForm, setDealForm] = useState(EMPTY_FORM)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== '')
      )
      const [dealsData, statsData, customersData, propertiesData] = await Promise.all([
        getDeals(params),
        getDealStats(),
        getCustomers(),
        getProperties()
      ])
      setDeals(Array.isArray(dealsData) ? dealsData : [])
      setStats(statsData || {})
      setCustomers(Array.isArray(customersData) ? customersData : [])
      setProperties(Array.isArray(propertiesData) ? propertiesData : [])
    } catch {
      showToast('Failed to load data', 'error')
    } finally {
      setLoading(false)
    }
  }, [filters, showToast])

  useEffect(() => {
    loadData()
  }, [loadData])

  function openAdd() {
    setSelectedDeal(null)
    setDealForm({ ...EMPTY_FORM, deal_date: todayStr() })
    setShowModal(true)
  }

  function openEdit(deal) {
    setSelectedDeal(deal)
    setDealForm({
      property_id: deal.property_id ?? '',
      buyer_customer_id: deal.buyer_customer_id ?? '',
      seller_customer_id: deal.seller_customer_id ?? '',
      deal_date: deal.deal_date ? deal.deal_date.slice(0, 10) : todayStr(),
      deal_amount: deal.deal_amount ?? '',
      brokerage_type: deal.brokerage_type || 'both',
      buyer_brokerage_pct: deal.buyer_brokerage_pct ?? '',
      seller_brokerage_pct: deal.seller_brokerage_pct ?? '',
      brokers: Array.isArray(deal.brokers) ? deal.brokers : [],
      notes: deal.notes || '',
      status: deal.status || 'negotiation'
    })
    setShowModal(true)
  }

  async function handleDelete(deal) {
    if (!window.confirm('Delete this deal?')) return
    try {
      await deleteDeal(deal.id)
      showToast('Deal deleted')
      loadData()
    } catch {
      showToast('Failed to delete deal', 'error')
    }
  }

  async function handleSave(e) {
    e.preventDefault()
    const { buyerAmt, sellerAmt, total } = calcBrokerage(
      dealForm.deal_amount,
      dealForm.buyer_brokerage_pct,
      dealForm.seller_brokerage_pct
    )
    const payload = {
      ...dealForm,
      property_id: dealForm.property_id ? Number(dealForm.property_id) : null,
      buyer_customer_id: dealForm.buyer_customer_id ? Number(dealForm.buyer_customer_id) : null,
      seller_customer_id: dealForm.seller_customer_id ? Number(dealForm.seller_customer_id) : null,
      deal_amount: dealForm.deal_amount !== '' ? Number(dealForm.deal_amount) : null,
      buyer_brokerage_pct: dealForm.buyer_brokerage_pct !== '' ? Number(dealForm.buyer_brokerage_pct) : null,
      seller_brokerage_pct: dealForm.seller_brokerage_pct !== '' ? Number(dealForm.seller_brokerage_pct) : null,
      buyer_brokerage_amount: buyerAmt || null,
      seller_brokerage_amount: sellerAmt || null,
      total_brokerage: total || null,
      brokers: dealForm.brokers.map(b => ({
        name: b.name,
        share_pct: Number(b.share_pct) || 0
      }))
    }
    try {
      if (selectedDeal) {
        await updateDeal(selectedDeal.id, payload)
        showToast('Deal updated')
      } else {
        await createDeal(payload)
        showToast('Deal created')
      }
      setShowModal(false)
      loadData()
    } catch {
      showToast('Failed to save deal', 'error')
    }
  }

  function setField(key, value) {
    setDealForm(prev => ({ ...prev, [key]: value }))
  }

  function addBroker() {
    setDealForm(prev => ({
      ...prev,
      brokers: [...prev.brokers, { name: '', share_pct: '' }]
    }))
  }

  function updateBroker(idx, field, value) {
    setDealForm(prev => {
      const brokers = [...prev.brokers]
      brokers[idx] = { ...brokers[idx], [field]: value }
      return { ...prev, brokers }
    })
  }

  function removeBroker(idx) {
    setDealForm(prev => ({
      ...prev,
      brokers: prev.brokers.filter((_, i) => i !== idx)
    }))
  }

  function customerName(id) {
    const c = customers.find(c => String(c.id) === String(id))
    return c ? c.name : '—'
  }

  function propertyTitle(id) {
    const p = properties.find(p => String(p.id) === String(id))
    return p ? p.title : '—'
  }

  const { buyerAmt, sellerAmt, total: totalBrokerage } = calcBrokerage(
    dealForm.deal_amount,
    dealForm.buyer_brokerage_pct,
    dealForm.seller_brokerage_pct
  )

  const showBuyerPct = ['buyer_only', 'both', 'split'].includes(dealForm.brokerage_type)
  const showSellerPct = ['seller_only', 'both', 'split'].includes(dealForm.brokerage_type)

  const topLocality = stats.top_localities?.[0]?.locality || '—'

  return (
    <div className="min-h-screen bg-gray-50">
      {loading && <LoadingSpinner fullPage />}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#1e3a5f]">Deals</h1>
        <button
          onClick={openAdd}
          className="bg-[#1e3a5f] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#16305a] transition-colors shadow-sm"
        >
          + Add Deal
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-[#1e3a5f]/10 rounded-full p-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1e3a5f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
            </div>
            <p className="text-sm text-gray-500">This Month</p>
          </div>
          <p className="text-2xl font-bold text-[#1e3a5f]">{formatPrice(stats.total_brokerage_month)}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-[#1e3a5f]/10 rounded-full p-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1e3a5f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
              </svg>
            </div>
            <p className="text-sm text-gray-500">All Time</p>
          </div>
          <p className="text-2xl font-bold text-[#1e3a5f]">{formatPrice(stats.total_brokerage_alltime)}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-[#1e3a5f]/10 rounded-full p-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1e3a5f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <p className="text-sm text-gray-500">Total Deals</p>
          </div>
          <p className="text-2xl font-bold text-[#1e3a5f]">{stats.deal_count ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-[#1e3a5f]/10 rounded-full p-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1e3a5f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <p className="text-sm text-gray-500">Top Locality</p>
          </div>
          <p className="text-2xl font-bold text-[#1e3a5f]">{topLocality}</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-6 border border-gray-100">
        <div className="flex flex-wrap gap-3 items-center">
          <select
            value={filters.status}
            onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] transition-all"
          >
            <option value="">All Status</option>
            <option value="negotiation">Negotiation</option>
            <option value="closed">Closed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <input
            type="month"
            value={filters.month}
            onChange={e => setFilters(f => ({ ...f, month: e.target.value }))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] transition-all"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#1e3a5f] text-white text-left">
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider">Property</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider">Buyer</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider">Seller</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider">Deal Date</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider">Total Brokerage</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider">Brokerage Type</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {deals.length === 0 && !loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-400">
                    No deals found.
                  </td>
                </tr>
              ) : (
                deals.map((deal, idx) => (
                  <tr key={deal.id} className={`hover:bg-blue-50 transition-colors ${idx % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                    <td className="px-6 py-4 font-medium text-gray-800">
                      {propertyTitle(deal.property_id)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{customerName(deal.buyer_customer_id)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{customerName(deal.seller_customer_id)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {deal.deal_date ? new Date(deal.deal_date).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800 font-medium">{formatPrice(deal.deal_amount)}</td>
                    <td className="px-6 py-4 text-sm font-bold text-[#f0a500]">{formatPrice(deal.total_brokerage)}</td>
                    <td className="px-6 py-4">{brokerageTypeBadge(deal.brokerage_type)}</td>
                    <td className="px-6 py-4">{statusBadge(deal.status)}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEdit(deal)}
                          className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                          aria-label="Edit"
                          title="Edit"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(deal)}
                          className="p-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                          aria-label="Delete"
                          title="Delete"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={showModal}
        title={selectedDeal ? 'Edit Deal' : 'Add Deal'}
        onClose={() => setShowModal(false)}
        size="xl"
      >
        <form onSubmit={handleSave} className="space-y-5">
          {/* Section 1 — Parties */}
          <div>
            <h3 className="text-sm font-semibold text-[#1e3a5f] mb-3 border-b pb-1">Parties</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Property</label>
                <select
                  value={dealForm.property_id}
                  onChange={e => setField('property_id', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                >
                  <option value="">— Select property —</option>
                  {properties.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.title} — {formatPrice(p.price)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Buyer</label>
                <select
                  value={dealForm.buyer_customer_id}
                  onChange={e => setField('buyer_customer_id', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                >
                  <option value="">— Select buyer —</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Seller</label>
                <select
                  value={dealForm.seller_customer_id}
                  onChange={e => setField('seller_customer_id', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                >
                  <option value="">— Select seller —</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Deal Date</label>
                <input
                  type="date"
                  value={dealForm.deal_date}
                  onChange={e => setField('deal_date', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Deal Amount (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={dealForm.deal_amount}
                  onChange={e => setField('deal_amount', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                />
              </div>
            </div>
          </div>

          {/* Section 2 — Brokerage */}
          <div>
            <h3 className="text-sm font-semibold text-[#1e3a5f] mb-3 border-b pb-1">Brokerage</h3>
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">Brokerage Type</label>
              <div className="flex gap-4 flex-wrap">
                {['buyer_only', 'seller_only', 'both', 'split'].map(t => (
                  <label key={t} className="flex items-center gap-1 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="deal_brokerage_type"
                      value={t}
                      checked={dealForm.brokerage_type === t}
                      onChange={() => setField('brokerage_type', t)}
                      className="accent-[#1e3a5f]"
                    />
                    {t.replace('_', ' ')}
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-3">
              {showBuyerPct && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Buyer Brokerage (%)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={dealForm.buyer_brokerage_pct}
                    onChange={e => setField('buyer_brokerage_pct', e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                  />
                </div>
              )}
              {showSellerPct && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Seller Brokerage (%)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={dealForm.seller_brokerage_pct}
                    onChange={e => setField('seller_brokerage_pct', e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                  />
                </div>
              )}
            </div>

            <div className="bg-gray-50 rounded-lg p-3 text-sm grid grid-cols-3 gap-3">
              <div>
                <p className="text-xs text-gray-500">Buyer Amount</p>
                <p className="font-semibold text-gray-800">{formatPrice(buyerAmt)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Seller Amount</p>
                <p className="font-semibold text-gray-800">{formatPrice(sellerAmt)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Brokerage</p>
                <p className="font-semibold text-[#f0a500]">{formatPrice(totalBrokerage)}</p>
              </div>
            </div>
          </div>

          {/* Section 3 — Brokers */}
          <div>
            <div className="flex items-center justify-between mb-2 border-b pb-1">
              <h3 className="text-sm font-semibold text-[#1e3a5f]">Brokers</h3>
              <button
                type="button"
                onClick={addBroker}
                className="text-xs px-2 py-1 rounded bg-[#1e3a5f] text-white hover:bg-[#162d4a]"
              >
                + Add Broker
              </button>
            </div>
            {dealForm.brokers.map((broker, idx) => (
              <div key={idx} className="flex gap-2 items-center mb-2">
                <input
                  type="text"
                  placeholder="Broker name"
                  value={broker.name}
                  onChange={e => updateBroker(idx, 'name', e.target.value)}
                  className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                />
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="Share %"
                  value={broker.share_pct}
                  onChange={e => updateBroker(idx, 'share_pct', e.target.value)}
                  className="w-24 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                />
                <input
                  readOnly
                  type="text"
                  value={formatPrice((totalBrokerage * (Number(broker.share_pct) || 0)) / 100)}
                  className="w-28 border rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-700"
                />
                <button
                  type="button"
                  onClick={() => removeBroker(idx)}
                  className="text-red-500 hover:text-red-700 text-lg leading-none"
                  aria-label="Remove broker"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>

          {/* Section 4 — Notes & Status */}
          <div>
            <h3 className="text-sm font-semibold text-[#1e3a5f] mb-3 border-b pb-1">Other</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                <textarea
                  rows={3}
                  value={dealForm.notes}
                  onChange={e => setField('notes', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                <select
                  value={dealForm.status}
                  onChange={e => setField('status', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                >
                  <option value="negotiation">Negotiation</option>
                  <option value="closed">Closed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 text-sm rounded-lg border hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm rounded-lg bg-[#1e3a5f] text-white hover:bg-[#162d4a]"
            >
              {selectedDeal ? 'Save Changes' : 'Add Deal'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
