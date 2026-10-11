import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer
} from '../api/index.js'
import Modal from '../components/Modal'
import { useToast } from '../components/Toast'
import LoadingSpinner from '../components/LoadingSpinner'

const EMPTY_FORM = {
  name: '',
  phone: '',
  email: '',
  type: 'buyer',
  budget_min: '',
  budget_max: '',
  preferred_locations: [],
  property_type: 'any',
  preferred_bhk: [],
  amenities_wishlist: [],
  notes: '',
  status: 'active'
}

const BHK_OPTIONS = ['1', '2', '3', '4', '4+']

function formatBudget(val) {
  if (!val) return '—'
  return '₹' + Number(val).toLocaleString('en-IN')
}

function typeBadge(type) {
  const map = {
    buyer: 'bg-blue-100 text-blue-700',
    seller: 'bg-purple-100 text-purple-700',
    both: 'bg-green-100 text-green-700'
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[type] || 'bg-gray-100 text-gray-600'}`}>
      {type}
    </span>
  )
}

function statusBadge(status) {
  const map = {
    active: 'bg-green-100 text-green-700',
    inactive: 'bg-gray-100 text-gray-500'
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status] || 'bg-gray-100 text-gray-500'}`}>
      {status}
    </span>
  )
}

function isOverdue(updatedAt) {
  if (!updatedAt) return false
  const diff = Date.now() - new Date(updatedAt).getTime()
  return diff > 30 * 24 * 60 * 60 * 1000
}

function TagInput({ value, onChange, placeholder }) {
  const [inputVal, setInputVal] = useState('')

  function addTag(raw) {
    const tag = raw.trim()
    if (tag && !value.includes(tag)) {
      onChange([...value, tag])
    }
    setInputVal('')
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(inputVal)
    } else if (e.key === 'Backspace' && !inputVal && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  function handleChange(e) {
    const raw = e.target.value
    if (raw.endsWith(',')) {
      addTag(raw.slice(0, -1))
    } else {
      setInputVal(raw)
    }
  }

  function removeTag(tag) {
    onChange(value.filter(t => t !== tag))
  }

  return (
    <div className="border rounded-lg p-2 flex flex-wrap gap-1 min-h-[40px] focus-within:ring-2 focus-within:ring-[#1e3a5f]">
      {value.map(tag => (
        <span
          key={tag}
          className="bg-[#1e3a5f] text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1"
        >
          {tag}
          <button
            type="button"
            onClick={() => removeTag(tag)}
            className="hover:text-red-300 leading-none"
            aria-label={`Remove ${tag}`}
          >
            &times;
          </button>
        </span>
      ))}
      <input
        type="text"
        value={inputVal}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={value.length === 0 ? placeholder : ''}
        className="outline-none text-sm flex-1 min-w-[120px]"
      />
    </div>
  )
}

export default function Customers() {
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({ search: '', type: '', status: '' })
  const [showModal, setShowModal] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [formData, setFormData] = useState(EMPTY_FORM)

  const fetchCustomers = useCallback(async () => {
    setLoading(true)
    try {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== '')
      )
      const data = await getCustomers(params)
      setCustomers(Array.isArray(data) ? data : [])
    } catch (err) {
      showToast('Failed to load customers', 'error')
    } finally {
      setLoading(false)
    }
  }, [filters, showToast])

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  function openAdd() {
    setSelectedCustomer(null)
    setFormData(EMPTY_FORM)
    setShowModal(true)
  }

  function openEdit(c) {
    setSelectedCustomer(c)
    setFormData({
      name: c.name || '',
      phone: c.phone || '',
      email: c.email || '',
      type: c.type || 'buyer',
      budget_min: c.budget_min ?? '',
      budget_max: c.budget_max ?? '',
      preferred_locations: Array.isArray(c.preferred_locations) ? c.preferred_locations : [],
      property_type: c.property_type || 'any',
      preferred_bhk: Array.isArray(c.preferred_bhk) ? c.preferred_bhk : [],
      amenities_wishlist: Array.isArray(c.amenities_wishlist) ? c.amenities_wishlist : [],
      notes: c.notes || '',
      status: c.status || 'active'
    })
    setShowModal(true)
  }

  async function handleDelete(c) {
    if (!window.confirm(`Delete customer "${c.name}"?`)) return
    try {
      await deleteCustomer(c.id)
      showToast('Customer deleted')
      fetchCustomers()
    } catch {
      showToast('Failed to delete customer', 'error')
    }
  }

  async function handleSave(e) {
    e.preventDefault()
    try {
      const payload = {
        ...formData,
        budget_min: formData.budget_min === '' ? null : Number(formData.budget_min),
        budget_max: formData.budget_max === '' ? null : Number(formData.budget_max)
      }
      if (selectedCustomer) {
        await updateCustomer(selectedCustomer.id, payload)
      } else {
        await createCustomer(payload)
      }
      setShowModal(false)
      showToast('Customer saved')
      fetchCustomers()
    } catch {
      showToast('Failed to save customer', 'error')
    }
  }

  function setField(key, value) {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  function toggleBhk(val) {
    setFormData(prev => ({
      ...prev,
      preferred_bhk: prev.preferred_bhk.includes(val)
        ? prev.preferred_bhk.filter(b => b !== val)
        : [...prev.preferred_bhk, val]
    }))
  }

  return (
    <div>
      {loading && <LoadingSpinner fullPage />}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-[#1e3a5f]">Customers</h1>
        <button
          onClick={openAdd}
          className="bg-[#1e3a5f] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#162d4a] transition-colors"
        >
          + Add Customer
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          placeholder="Search name, phone, email…"
          value={filters.search}
          onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
          className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
        />
        <select
          value={filters.type}
          onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
        >
          <option value="">All Types</option>
          <option value="buyer">Buyer</option>
          <option value="seller">Seller</option>
          <option value="both">Both</option>
        </select>
        <select
          value={filters.status}
          onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500 text-xs uppercase tracking-wide">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Budget Range</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Last Updated</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 && !loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                  No customers found.
                </td>
              </tr>
            ) : (
              customers.map(c => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">
                    <span>{c.name}</span>
                    {isOverdue(c.updated_at) && (
                      <span className="ml-2 bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full">
                        ⏰ Follow up
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.phone}</td>
                  <td className="px-4 py-3 text-gray-600">{c.email || '—'}</td>
                  <td className="px-4 py-3">{typeBadge(c.type)}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {c.budget_min || c.budget_max
                      ? `${formatBudget(c.budget_min)} – ${formatBudget(c.budget_max)}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3">{statusBadge(c.status)}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {c.updated_at ? new Date(c.updated_at).toLocaleDateString('en-IN') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => openEdit(c)}
                        className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(c)}
                        className="text-xs px-2 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100"
                      >
                        Delete
                      </button>
                      {(c.type === 'buyer' || c.type === 'both') && (
                        <button
                          onClick={() => navigate(`/matchmaking?buyer_id=${c.id}`)}
                          className="text-xs px-2 py-1 rounded bg-green-50 text-green-700 hover:bg-green-100"
                        >
                          Find Matches
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={showModal}
        title={selectedCustomer ? 'Edit Customer' : 'Add Customer'}
        onClose={() => setShowModal(false)}
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {/* Name & Phone */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="text"
                value={formData.name}
                onChange={e => setField('name', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Phone <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="text"
                value={formData.phone}
                onChange={e => setField('phone', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
              />
            </div>
          </div>

          {/* Email & Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={e => setField('email', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
              <select
                value={formData.type}
                onChange={e => setField('type', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
              >
                <option value="buyer">Buyer</option>
                <option value="seller">Seller</option>
                <option value="both">Both</option>
              </select>
            </div>
          </div>

          {/* Budget */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Budget Min (₹)</label>
              <input
                type="number"
                min="0"
                value={formData.budget_min}
                onChange={e => setField('budget_min', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Budget Max (₹)</label>
              <input
                type="number"
                min="0"
                value={formData.budget_max}
                onChange={e => setField('budget_max', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
              />
            </div>
          </div>

          {/* Preferred Locations */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Preferred Locations <span className="text-gray-400">(press Enter or comma to add)</span>
            </label>
            <TagInput
              value={formData.preferred_locations}
              onChange={v => setField('preferred_locations', v)}
              placeholder="e.g. Baner, Wakad…"
            />
          </div>

          {/* Property Type */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Property Type</label>
            <select
              value={formData.property_type}
              onChange={e => setField('property_type', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
            >
              <option value="any">Any</option>
              <option value="flat">Flat</option>
              <option value="house">House</option>
              <option value="plot">Plot</option>
              <option value="commercial">Commercial</option>
            </select>
          </div>

          {/* Preferred BHK */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Preferred BHK</label>
            <div className="flex gap-3 flex-wrap">
              {BHK_OPTIONS.map(opt => (
                <label key={opt} className="flex items-center gap-1 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.preferred_bhk.includes(opt)}
                    onChange={() => toggleBhk(opt)}
                    className="accent-[#1e3a5f]"
                  />
                  {opt} BHK
                </label>
              ))}
            </div>
          </div>

          {/* Amenities Wishlist */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Amenities Wishlist <span className="text-gray-400">(press Enter or comma to add)</span>
            </label>
            <TagInput
              value={formData.amenities_wishlist}
              onChange={v => setField('amenities_wishlist', v)}
              placeholder="e.g. Gym, Pool, Parking…"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={e => setField('notes', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] resize-none"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
            <select
              value={formData.status}
              onChange={e => setField('status', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
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
              {selectedCustomer ? 'Save Changes' : 'Add Customer'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
