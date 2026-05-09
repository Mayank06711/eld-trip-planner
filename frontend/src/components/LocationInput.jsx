import { useState, useRef, useEffect } from 'react'
import { geocode } from '../services/api'

export default function LocationInput({ label, value, onChange, placeholder }) {
  const [query, setQuery] = useState(value?.name || '')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(!!value?.lat)  // true if a location was picked
  const debounceRef = useRef(null)
  const wrapperRef = useRef(null)
  const skipSearchRef = useRef(false)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (skipSearchRef.current) { skipSearchRef.current = false; return }

    if (query.length < 3) {
      setResults([])
      setOpen(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const data = await geocode(query)
        const items = data?.results || []
        setResults(items)
        setOpen(items.length > 0)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 350)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = (result) => {
    skipSearchRef.current = true
    setQuery(result.name)
    setSelected(true)
    onChange({ name: result.name, lat: result.lat, lng: result.lng })
    setOpen(false)
    setResults([])
  }

  const handleInputChange = (e) => {
    const val = e.target.value
    setQuery(val)
    setSelected(false)
    onChange(null)  // clear selection — user must re-pick
  }

  const showError = query.length >= 3 && !selected && !open && !loading

  return (
    <div ref={wrapperRef} className="relative">
      <label className="block text-sm font-medium text-text-secondary mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => results.length > 0 && !selected && setOpen(true)}
          placeholder={placeholder}
          className={`w-full h-10 pl-9 pr-8 rounded-md border text-text-primary text-sm focus:outline-none focus:ring-2 placeholder:text-text-muted ${
            selected
              ? 'border-success/40 bg-success/5 focus:ring-success/30'
              : 'border-border bg-white focus:ring-accent/40 focus:border-accent'
          }`}
        />
        {/* Icon: pin if selected, search if not */}
        {selected ? (
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        )}
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-3.5 h-3.5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Dropdown */}
      {open && results.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-border rounded-lg shadow-xl max-h-52 overflow-auto">
          {results.map((r, i) => (
            <li
              key={i}
              onClick={() => handleSelect(r)}
              className="px-3 py-2.5 text-sm text-text-primary hover:bg-accent/5 cursor-pointer border-b border-border/50 last:border-b-0 flex items-center gap-2"
            >
              <svg className="w-3.5 h-3.5 text-accent shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="truncate">{r.name}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Hint when typed but not selected */}
      {showError && (
        <p className="text-[11px] text-warning mt-1">Select a location from the dropdown</p>
      )}
    </div>
  )
}
