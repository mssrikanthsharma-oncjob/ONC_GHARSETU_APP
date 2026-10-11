import { useState, useEffect } from 'react'
import { getSettings, saveSettings } from '../api/index.js'
import LoadingSpinner from '../components/LoadingSpinner'
import { useToast } from '../components/Toast'

const DEFAULT_FORM = {
  company_name: '',
  company_address: '',
  company_phone: '',
  default_buyer_brokerage_pct: 2,
  default_seller_brokerage_pct: 2,
  currency_symbol: '₹'
}

export default function Settings() {
  const { showToast } = useToast()
  const [formData, setFormData] = useState(DEFAULT_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getSettings()
      .then(data => {
        if (data) {
          setFormData(prev => ({ ...prev, ...data }))
        }
      })
      .catch(() => showToast('Failed to load settings', 'error'))
      .finally(() => setLoading(false))
  }, [showToast])

  function setField(key, value) {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await saveSettings(formData)
      showToast('Settings saved')
    } catch {
      showToast('Failed to save settings', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#1e3a5f] mb-4">Settings</h1>

      <div className="max-w-lg mx-auto bg-white rounded-xl shadow p-6 mt-6">
        <form onSubmit={handleSave} className="space-y-4">
          {/* Company Name */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Company Name</label>
            <input
              type="text"
              value={formData.company_name}
              onChange={e => setField('company_name', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
            />
          </div>

          {/* Company Address */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Company Address</label>
            <textarea
              rows={3}
              value={formData.company_address}
              onChange={e => setField('company_address', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] resize-none"
            />
          </div>

          {/* Company Phone */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Company Phone</label>
            <input
              type="text"
              value={formData.company_phone}
              onChange={e => setField('company_phone', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
            />
          </div>

          {/* Default Brokerage Percentages */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Default Buyer Brokerage (%)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={formData.default_buyer_brokerage_pct}
                onChange={e => setField('default_buyer_brokerage_pct', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Default Seller Brokerage (%)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={formData.default_seller_brokerage_pct}
                onChange={e => setField('default_seller_brokerage_pct', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
              />
            </div>
          </div>

          {/* Currency Symbol */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Currency Symbol</label>
            <input
              type="text"
              maxLength={3}
              value={formData.currency_symbol}
              onChange={e => setField('currency_symbol', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
            />
          </div>

          {/* Info box */}
          <div className="bg-blue-50 rounded-lg px-4 py-3 text-sm text-blue-700">
            These defaults are used when creating new deals.
          </div>

          {/* Save */}
          <div className="pt-1">
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-[#1e3a5f] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#162d4a] transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
