import { useState, useEffect, useCallback } from 'react'
import {
  getProperties,
  createProperty,
  updateProperty,
  deleteProperty
} from '../api/index.js'
import Modal from '../components/Modal'
import { useToast } from '../components/Toast'
import LoadingSpinner from '../components/LoadingSpinner'

const EMPTY_FORM = {
  title: '',
  address: '',
  locality: '',
  city: '',
  type: 'flat',
  price: '',
  area_sqft: '',
  bhk: '',
  floor: '',
  total_floors: '',
  age_years: '',
  amenities: [],
  parking: false,
  furnishing: 'unfurnished',
  status: 'available',
  owner_name: '',
  owner_phone: '',
  notes: ''
}

function formatPrice(val) {
  if (!val) return '—'
  return '₹' + Number(val).toLocaleString('en-IN')
}

function statusBadge(status) {
  const map = {
    available: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    sold: 'bg-red-100 text-red-700'
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status] || 'bg-gray-100 text-gray-500'}`}>
      {status}
    </span>
  )
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

export default function Properties() {
  const { showToast } = useToast()

  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState('grid')
  const [filters, setFilters] = useState({
    locality: '',
    type: '',
    status: '',
    min_price: '',
    max_price: ''
  })
  const [showModal, setShowModal] = useState(false)
  const [selectedProperty, setSelectedProperty] = useState(null)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [areaAvgPrice, setAreaAvgPrice] = useState(null)

  const fetchProperties = useCallback(async () => {
    setLoading(true)
    try {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== '')
      )
      const data = await getProperties(params)
      setProperties(Array.isArray(data) ? data : [])
    } catch {
      showToast('Failed to load properties', 'error')
    } finally {
      setLoading(false)
    }
  }, [filters, showToast])

  useEffect(() => {
    fetchProperties()
  }, [fetchProperties])

  // AI price suggestion: compute avg price/sqft when locality + type set in modal
  useEffect(() => {
    if (!showModal) {
      setAreaAvgPrice(null)
      return
    }
    const { locality, type } = formData
    if (!locality || !type) {
      setAreaAvgPrice(null)
      return
    }
    let cancelled = false
    getProperties({ locality, type })
      .then(data => {
        if (cancelled) return
        const valid = (Array.isArray(data) ? data : []).filter(
          p => p.area_sqft && Number(p.area_sqft) > 0 && p.price
        )
        if (valid.length === 0) {
          setAreaAvgPrice(null)
          return
        }
        const avg =
          valid.reduce((sum, p) => sum + Number(p.price) / Number(p.area_sqft), 0) /
          valid.length
        setAreaAvgPrice(Math.round(avg))
      })
      .catch(() => setAreaAvgPrice(null))
    return () => { cancelled = true }
  }, [showModal, formData.locality, formData.type])

  function openAdd() {
    setSelectedProperty(null)
    setFormData(EMPTY_FORM)
    setShowModal(true)
  }

  function openEdit(p) {
    setSelectedProperty(p)
    setFormData({
      title: p.title || '',
      address: p.address || '',
      locality: p.locality || '',
      city: p.city || '',
      type: p.type || 'flat',
      price: p.price ?? '',
      area_sqft: p.area_sqft ?? '',
      bhk: p.bhk ?? '',
      floor: p.floor ?? '',
      total_floors: p.total_floors ?? '',
      age_years: p.age_years ?? '',
      amenities: Array.isArray(p.amenities) ? p.amenities : [],
      parking: p.parking || false,
      furnishing: p.furnishing || 'unfurnished',
      status: p.status || 'available',
      owner_name: p.owner_name || '',
      owner_phone: p.owner_phone || '',
      notes: p.notes || ''
    })
    setShowModal(true)
  }

  async function handleDelete(p) {
    if (!window.confirm(`Delete property "${p.title}"?`)) return
    try {
      await deleteProperty(p.id)
      showToast('Property deleted')
      fetchProperties()
    } catch {
      showToast('Failed to delete property', 'error')
    }
  }

  async function handleSave(e) {
    e.preventDefault()
    try {
      const payload = {
        ...formData,
        price: formData.price === '' ? null : Number(formData.price),
        area_sqft: formData.area_sqft === '' ? null : Number(formData.area_sqft),
        bhk: formData.bhk === '' ? null : Number(formData.bhk),
        floor: formData.floor === '' ? null : Number(formData.floor),
        total_floors: formData.total_floors === '' ? null : Number(formData.total_floors),
        age_years: formData.age_years === '' ? null : Number(formData.age_years)
      }
      if (selectedProperty) {
        await updateProperty(selectedProperty.id, payload)
      } else {
        await createProperty(payload)
      }
      setShowModal(false)
      showToast('Property saved')
      fetchProperties()
    } catch {
      showToast('Failed to save property', 'error')
    }
  }

  function setField(key, value) {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {loading && <LoadingSpinner fullPage />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-2">
        <h1 className="text-2xl font-bold text-[#1e3a5f]">Properties</h1>
        <div className="flex gap-2 items-center flex-wrap">
          {/* Grid / List toggle */}
          <button
            onClick={() => setViewMode('grid')}
            aria-label="Grid view"
            className={`p-2 rounded-lg border ${viewMode === 'grid' ? 'bg-[#1e3a5f] text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <rect x="0" y="0" width="6" height="6" rx="1" />
              <rect x="10" y="0" width="6" height="6" rx="1" />
              <rect x="0" y="10" width="6" height="6" rx="1" />
              <rect x="10" y="10" width="6" height="6" rx="1" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('list')}
            aria-label="List view"
            className={`p-2 rounded-lg border ${viewMode === 'list' ? 'bg-[#1e3a5f] text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <rect x="0" y="1" width="16" height="2" rx="1" />
              <rect x="0" y="7" width="16" height="2" rx="1" />
              <rect x="0" y="13" width="16" height="2" rx="1" />
            </svg>
          </button>
          <button
            onClick={openAdd}
            className="bg-[#1e3a5f] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#16305a] transition-colors shadow-sm"
          >
            + Add Property
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-6 border border-gray-100">
        <div className="flex flex-col sm:flex-row flex-wrap gap-3">
          <input
            type="text"
            placeholder="Locality…"
            value={filters.locality}
            onChange={e => setFilters(f => ({ ...f, locality: e.target.value }))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full sm:w-36 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] transition-all"
          />
          <select
            value={filters.type}
            onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full sm:w-auto focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] transition-all"
          >
            <option value="">All Types</option>
            <option value="flat">Flat</option>
            <option value="house">House</option>
            <option value="plot">Plot</option>
            <option value="commercial">Commercial</option>
          </select>
          <select
            value={filters.status}
            onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full sm:w-auto focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] transition-all"
          >
            <option value="">All Status</option>
            <option value="available">Available</option>
            <option value="pending">Pending</option>
            <option value="sold">Sold</option>
          </select>
          <input
            type="number"
            placeholder="Min price"
            value={filters.min_price}
            onChange={e => setFilters(f => ({ ...f, min_price: e.target.value }))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full sm:w-28 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] transition-all"
          />
          <input
            type="number"
            placeholder="Max price"
            value={filters.max_price}
            onChange={e => setFilters(f => ({ ...f, max_price: e.target.value }))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full sm:w-28 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] transition-all"
          />
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {properties.length === 0 && !loading ? (
            <div className="col-span-3 text-center text-gray-400 py-10">
              No properties found.
            </div>
          ) : (
            properties.map(p => (
              <div key={p.id} className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden flex flex-col">
                {/* Card header gradient */}
                <div className="bg-gradient-to-br from-[#1e3a5f] to-[#2d5a8e] h-32 relative flex items-end p-4">
                  <div className="flex gap-2 flex-wrap">
                    <span className="bg-white/20 text-white text-xs px-2.5 py-0.5 rounded-full font-medium capitalize">
                      {p.type}
                    </span>
                    {p.bhk && (
                      <span className="bg-[#f0a500]/90 text-white text-xs px-2.5 py-0.5 rounded-full font-medium">
                        {p.bhk} BHK
                      </span>
                    )}
                    <div className="absolute top-3 right-3">
                      {statusBadge(p.status)}
                    </div>
                  </div>
                </div>
                {/* Card body */}
                <div className="p-4 flex flex-col gap-2 flex-1">
                  <h3 className="font-semibold text-[#1e3a5f] text-sm leading-tight">{p.title}</h3>
                  <p className="text-xs text-gray-500">{[p.locality, p.city].filter(Boolean).join(', ')}</p>
                  <p className="text-lg font-bold text-[#f0a500]">{formatPrice(p.price)}</p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {p.area_sqft && (
                      <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {p.area_sqft} sqft
                      </span>
                    )}
                    {p.furnishing && (
                      <span className="bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full">
                        {p.furnishing}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 mt-auto pt-2">
                    <button
                      onClick={() => openEdit(p)}
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
                      onClick={() => handleDelete(p)}
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
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#1e3a5f] text-white text-left">
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider">Title</th>
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider hidden sm:table-cell">Location</th>
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider">Price (₹)</th>
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider">BHK</th>
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider hidden sm:table-cell">Area (sqft)</th>
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider hidden lg:table-cell">Furnishing</th>
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {properties.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-400">
                      No properties found.
                    </td>
                  </tr>
                ) : (
                  properties.map((p, idx) => (
                    <tr key={p.id} className={`hover:bg-blue-50 transition-colors ${idx % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                      <td className="px-6 py-4 font-medium text-gray-800">{p.title}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 hidden sm:table-cell">
                        {[p.locality, p.city].filter(Boolean).join(', ')}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-[#f0a500]">{formatPrice(p.price)}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{p.bhk || '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 hidden sm:table-cell">{p.area_sqft || '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 hidden lg:table-cell">{p.furnishing || '—'}</td>
                      <td className="px-6 py-4">{statusBadge(p.status)}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEdit(p)}
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
                            onClick={() => handleDelete(p)}
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
      )}

      {/* Add / Edit Modal */}
      <Modal
        isOpen={showModal}
        title={selectedProperty ? 'Edit Property' : 'Add Property'}
        onClose={() => setShowModal(false)}
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="text"
              value={formData.title}
              onChange={e => setField('title', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Address <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="text"
              value={formData.address}
              onChange={e => setField('address', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
            />
          </div>

          {/* Locality & City */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Locality <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="text"
                value={formData.locality}
                onChange={e => setField('locality', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                City <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="text"
                value={formData.city}
                onChange={e => setField('city', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
              />
            </div>
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Type <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.type}
              onChange={e => setField('type', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
            >
              <option value="flat">Flat</option>
              <option value="house">House</option>
              <option value="plot">Plot</option>
              <option value="commercial">Commercial</option>
            </select>
          </div>

          {/* Price & Area */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Price (₹) <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="number"
                min="0"
                value={formData.price}
                onChange={e => setField('price', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Area (sqft) <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="number"
                min="0"
                value={formData.area_sqft}
                onChange={e => setField('area_sqft', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
              />
            </div>
          </div>

          {/* AI price suggestion */}
          {areaAvgPrice !== null && (
            <p className="text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
              💡 Avg ₹{areaAvgPrice.toLocaleString('en-IN')}/sqft in this area ({formData.locality}, {formData.type})
            </p>
          )}

          {/* BHK & Floor */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">BHK</label>
              <select
                value={formData.bhk}
                onChange={e => setField('bhk', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
              >
                <option value="">—</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Floor</label>
              <input
                type="number"
                min="0"
                value={formData.floor}
                onChange={e => setField('floor', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Total Floors</label>
              <input
                type="number"
                min="0"
                value={formData.total_floors}
                onChange={e => setField('total_floors', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
              />
            </div>
          </div>

          {/* Age */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Age (years)</label>
            <input
              type="number"
              min="0"
              value={formData.age_years}
              onChange={e => setField('age_years', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
            />
          </div>

          {/* Amenities */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Amenities <span className="text-gray-400">(press Enter or comma to add)</span>
            </label>
            <TagInput
              value={formData.amenities}
              onChange={v => setField('amenities', v)}
              placeholder="e.g. Gym, Pool, Lift…"
            />
          </div>

          {/* Parking & Furnishing */}
          <div className="grid grid-cols-2 gap-4 items-center">
            <div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.parking}
                  onChange={e => setField('parking', e.target.checked)}
                  className="accent-[#1e3a5f]"
                />
                Parking available
              </label>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Furnishing</label>
              <select
                value={formData.furnishing}
                onChange={e => setField('furnishing', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
              >
                <option value="unfurnished">Unfurnished</option>
                <option value="semi-furnished">Semi-furnished</option>
                <option value="fully-furnished">Fully-furnished</option>
              </select>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
            <select
              value={formData.status}
              onChange={e => setField('status', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
            >
              <option value="available">Available</option>
              <option value="pending">Pending</option>
              <option value="sold">Sold</option>
            </select>
          </div>

          {/* Owner */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Owner Name <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="text"
                value={formData.owner_name}
                onChange={e => setField('owner_name', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Owner Phone <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="text"
                value={formData.owner_phone}
                onChange={e => setField('owner_phone', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
              />
            </div>
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
              {selectedProperty ? 'Save Changes' : 'Add Property'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
