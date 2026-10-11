import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { findMatches, getCustomers, createDeal } from '../api/index.js'
import Modal from '../components/Modal'
import LoadingSpinner from '../components/LoadingSpinner'
import { useToast } from '../components/Toast'

function formatPrice(val) {
  if (!val) return '—'
  return '₹' + Number(val).toLocaleString('en-IN')
}

function scoreBadge(percentage) {
  let cls = 'bg-red-500'
  if (percentage >= 80) cls = 'bg-green-500'
  else if (percentage >= 50) cls = 'bg-yellow-500'
  else if (percentage >= 20) cls = 'bg-orange-500'
  return (
    <span className={`${cls} text-white text-xs font-bold px-2 py-1 rounded-full`}>
      {percentage}%
    </span>
  )
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

export default function Matchmaking() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { showToast } = useToast()

  const [buyers, setBuyers] = useState([])
  const [allCustomers, setAllCustomers] = useState([])
  const [selectedBuyerId, setSelectedBuyerId] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showDealModal, setShowDealModal] = useState(false)
  const [selectedMatch, setSelectedMatch] = useState(null)
  const [dealForm, setDealForm] = useState({})
  const [expandedCards, setExpandedCards] = useState({})

  // Load buyers on mount
  useEffect(() => {
    getCustomers()
      .then(data => {
        const all = Array.isArray(data) ? data : []
        setAllCustomers(all)
        setBuyers(all.filter(c => c.type === 'buyer' || c.type === 'both'))
      })
      .catch(() => showToast('Failed to load customers', 'error'))
  }, [showToast])

  // Handle buyer_id URL param
  useEffect(() => {
    const urlBuyerId = searchParams.get('buyer_id')
    if (urlBuyerId) {
      setSelectedBuyerId(urlBuyerId)
    }
  }, [searchParams])

  // Auto-trigger search when buyer_id from URL and buyers loaded
  const urlBuyerId = searchParams.get('buyer_id')
  useEffect(() => {
    if (urlBuyerId && buyers.length > 0) {
      runSearch(urlBuyerId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlBuyerId, buyers.length])

  const runSearch = useCallback(async (buyerId) => {
    const bid = buyerId || selectedBuyerId
    if (!bid) return
    setLoading(true)
    try {
      const data = await findMatches({ buyer_id: Number(bid) })
      setResults(Array.isArray(data) ? data : [])
    } catch {
      showToast('Matchmaking failed', 'error')
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [selectedBuyerId, showToast])

  function handleFindMatches() {
    if (!selectedBuyerId) {
      showToast('Please select a buyer first', 'error')
      return
    }
    runSearch(selectedBuyerId)
  }

  function toggleCard(idx) {
    setExpandedCards(prev => ({ ...prev, [idx]: !prev[idx] }))
  }

  function openDealModal(match) {
    const buyer = buyers.find(b => String(b.id) === String(selectedBuyerId))
    setSelectedMatch({ ...match, buyerName: buyer?.name || '' })
    setDealForm({
      property_id: match.property.id,
      buyer_customer_id: selectedBuyerId,
      seller_customer_id: '',
      deal_date: todayStr(),
      deal_amount: match.property.price || '',
      brokerage_type: 'both',
      buyer_brokerage_pct: '',
      seller_brokerage_pct: '',
      brokers: [],
      notes: '',
      status: 'negotiation'
    })
    setShowDealModal(true)
  }

  function setDealField(key, value) {
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

  async function handleCreateDeal(e) {
    e.preventDefault()
    const { buyerAmt, sellerAmt, total } = calcBrokerage(
      dealForm.deal_amount,
      dealForm.buyer_brokerage_pct,
      dealForm.seller_brokerage_pct
    )
    const payload = {
      ...dealForm,
      property_id: Number(dealForm.property_id),
      buyer_customer_id: Number(dealForm.buyer_customer_id),
      seller_customer_id: dealForm.seller_customer_id ? Number(dealForm.seller_customer_id) : null,
      deal_amount: Number(dealForm.deal_amount) || null,
      buyer_brokerage_pct: Number(dealForm.buyer_brokerage_pct) || null,
      seller_brokerage_pct: Number(dealForm.seller_brokerage_pct) || null,
      buyer_brokerage_amount: buyerAmt || null,
      seller_brokerage_amount: sellerAmt || null,
      total_brokerage: total || null,
      brokers: dealForm.brokers.map(b => ({
        name: b.name,
        share_pct: Number(b.share_pct) || 0
      })),
      status: 'negotiation'
    }
    try {
      await createDeal(payload)
      showToast('Deal created')
      setShowDealModal(false)
      navigate('/deals')
    } catch {
      showToast('Failed to create deal', 'error')
    }
  }

  const { buyerAmt, sellerAmt, total: totalBrokerage } = calcBrokerage(
    dealForm.deal_amount,
    dealForm.buyer_brokerage_pct,
    dealForm.seller_brokerage_pct
  )
  const sellers = allCustomers.filter(c => c.type === 'seller' || c.type === 'both')

  const showBuyerPct = ['buyer_only', 'both', 'split'].includes(dealForm.brokerage_type)
  const showSellerPct = ['seller_only', 'both', 'split'].includes(dealForm.brokerage_type)

  return (
    <div>
      {loading && <LoadingSpinner fullPage />}

      <h1 className="text-2xl font-bold text-[#1e3a5f] mb-4">Matchmaking</h1>

      <div className="flex gap-6">
        {/* Left panel */}
        <div className="w-1/3">
          <div className="bg-white rounded-xl shadow p-5">
            <h2 className="text-lg font-semibold text-[#1e3a5f] mb-4">Find Matches</h2>

            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-600 mb-1">Select Buyer</label>
              <select
                value={selectedBuyerId}
                onChange={e => setSelectedBuyerId(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
              >
                <option value="">— Select buyer —</option>
                {buyers.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.type})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleFindMatches}
              disabled={loading}
              className="w-full bg-[#1e3a5f] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#162d4a] transition-colors disabled:opacity-50"
            >
              {loading ? 'Searching…' : 'Find Matches'}
            </button>
          </div>
        </div>

        {/* Right panel */}
        <div className="w-2/3">
          {results === null ? (
            <div className="flex items-center justify-center h-48 text-gray-400 bg-white rounded-xl shadow">
              Select a buyer and click Find Matches
            </div>
          ) : results.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-400 bg-white rounded-xl shadow">
              No matches found for this buyer
            </div>
          ) : (
            <div className="space-y-4">
              {results.map((r, idx) => {
                const p = r.property
                return (
                  <div key={p.id} className="bg-white shadow rounded-xl p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-[#1e3a5f] text-base">{p.title}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {[p.locality, p.city].filter(Boolean).join(', ')}
                        </p>
                        <p className="text-lg font-bold text-gray-800 mt-1">{formatPrice(p.price)}</p>
                        <div className="flex gap-2 mt-1 text-xs text-gray-600">
                          {p.bhk && <span>{p.bhk} BHK</span>}
                          {p.area_sqft && <span>· {p.area_sqft} sqft</span>}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {scoreBadge(r.percentage)}
                      </div>
                    </div>

                    {r.insight && (
                      <p className="text-xs text-gray-500 italic mt-2">{r.insight}</p>
                    )}

                    {/* Score Breakdown accordion */}
                    <div className="mt-3 border-t pt-3">
                      <button
                        type="button"
                        onClick={() => toggleCard(idx)}
                        className="text-xs text-[#1e3a5f] font-medium hover:underline focus:outline-none"
                      >
                        {expandedCards[idx] ? '▲ Hide' : '▼ Score Breakdown'}
                      </button>
                      {expandedCards[idx] && r.breakdown && (
                        <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-700">
                          <div className="flex justify-between">
                            <span>Budget</span>
                            <span className="font-medium">{r.breakdown.budget ?? 0}/30</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Location</span>
                            <span className="font-medium">{r.breakdown.location ?? 0}/25</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Type</span>
                            <span className="font-medium">{r.breakdown.property_type ?? 0}/20</span>
                          </div>
                          <div className="flex justify-between">
                            <span>BHK</span>
                            <span className="font-medium">{r.breakdown.bhk ?? 0}/15</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Amenities</span>
                            <span className="font-medium">{r.breakdown.amenities ?? 0}/10</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex justify-end">
                      <button
                        onClick={() => openDealModal(r)}
                        className="bg-[#f0a500] text-white text-xs px-3 py-1.5 rounded-lg hover:bg-[#d4920a] transition-colors"
                      >
                        Create Deal
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Deal Creation Modal */}
      <Modal
        isOpen={showDealModal}
        title="Create Deal"
        onClose={() => setShowDealModal(false)}
        size="xl"
      >
        {selectedMatch && (
          <form onSubmit={handleCreateDeal} className="space-y-4">
            {/* Property (readonly) */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Property</label>
              <input
                readOnly
                type="text"
                value={`${selectedMatch.property.title} — ${formatPrice(selectedMatch.property.price)}`}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-700"
              />
            </div>

            {/* Buyer (readonly) */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Buyer</label>
              <input
                readOnly
                type="text"
                value={selectedMatch.buyerName}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-700"
              />
            </div>

            {/* Seller */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Seller</label>
              <select
                value={dealForm.seller_customer_id}
                onChange={e => setDealField('seller_customer_id', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
              >
                <option value="">— Select seller —</option>
                {sellers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Deal Date & Amount */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Deal Date</label>
                <input
                  type="date"
                  value={dealForm.deal_date}
                  onChange={e => setDealField('deal_date', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Deal Amount (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={dealForm.deal_amount}
                  onChange={e => setDealField('deal_amount', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                />
              </div>
            </div>

            {/* Brokerage Type */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Brokerage Type</label>
              <div className="flex gap-4 flex-wrap">
                {['buyer_only', 'seller_only', 'both', 'split'].map(t => (
                  <label key={t} className="flex items-center gap-1 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="brokerage_type"
                      value={t}
                      checked={dealForm.brokerage_type === t}
                      onChange={() => setDealField('brokerage_type', t)}
                      className="accent-[#1e3a5f]"
                    />
                    {t.replace('_', ' ')}
                  </label>
                ))}
              </div>
            </div>

            {/* Brokerage Percentages */}
            <div className="grid grid-cols-2 gap-4">
              {showBuyerPct && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Buyer Brokerage (%)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={dealForm.buyer_brokerage_pct}
                    onChange={e => setDealField('buyer_brokerage_pct', e.target.value)}
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
                    onChange={e => setDealField('seller_brokerage_pct', e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                  />
                </div>
              )}
            </div>

            {/* Auto-calc brokerage summary */}
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

            {/* Brokers Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-gray-600">Brokers</label>
                <button
                  type="button"
                  onClick={addBroker}
                  className="text-xs px-2 py-1 rounded bg-[#1e3a5f] text-white hover:bg-[#162d4a]"
                >
                  + Add Broker
                </button>
              </div>
              {dealForm.brokers && dealForm.brokers.map((broker, idx) => (
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

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <textarea
                rows={3}
                value={dealForm.notes}
                onChange={e => setDealField('notes', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDealModal(false)}
                className="px-4 py-2 text-sm rounded-lg border hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm rounded-lg bg-[#1e3a5f] text-white hover:bg-[#162d4a]"
              >
                Save Deal
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
