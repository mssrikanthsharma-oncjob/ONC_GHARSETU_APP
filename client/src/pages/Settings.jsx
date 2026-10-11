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

      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-md p-4 sm:p-8 mt-8">
        <form onSubmit={handleSave} className="space-y-6">
          {/* Company Information */}
          <div>
            <h2 className="text-lg font-semibold text-[#1e3a5f] mb-4 border-b border-gray-100 pb-2">
              Company Information
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                <input
                  type="text"
                  value={formData.company_name}
                  onChange={e => setField('company_name', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Address</label>
                <textarea
                  rows={3}
                  value={formData.company_address}
                  onChange={e => setField('company_address', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] transition-all resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Phone</label>
                <input
                  type="text"
                  value={formData.company_phone}
                  onChange={e => setField('company_phone', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] transition-all"
                />
              </div>
            </div>
          </div>

          {/* Brokerage Defaults */}
          <div>
            <h2 className="text-lg font-semibold text-[#1e3a5f] mb-4 border-b border-gray-100 pb-2">
              Brokerage Defaults
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Default Buyer Brokerage (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={formData.default_buyer_brokerage_pct}
                    onChange={e => setField('default_buyer_brokerage_pct', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Default Seller Brokerage (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={formData.default_seller_brokerage_pct}
                    onChange={e => setField('default_seller_brokerage_pct', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Currency Symbol</label>
                <input
                  type="text"
                  maxLength={3}
                  value={formData.currency_symbol}
                  onChange={e => setField('currency_symbol', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] transition-all"
                />
              </div>
            </div>
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
              className="bg-[#1e3a5f] text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-[#16305a] transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
