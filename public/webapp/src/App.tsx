import { useState } from 'react'

const CATEGORIES = ['Kitchen', 'Bathroom', 'Bedroom', 'Living Room', 'Laundry', 'Balcony', 'Other'] as const
type Category = typeof CATEGORIES[number]

interface Product {
  id: string
  category: Category
  code: string
  description: string
  manufacturerDescription: string
  productDetails: string
  areaDescription: string
  quantity: string
  price: string
  notes: string
  image: string | null
  imagePreview: string | null
}

const emptyProduct = (): Product => ({
  id: crypto.randomUUID(),
  category: 'Bathroom',
  code: '',
  description: '',
  manufacturerDescription: '',
  productDetails: '',
  areaDescription: '',
  quantity: '',
  price: '',
  notes: '',
  image: null,
  imagePreview: null,
})

export default function App() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  // Document fields
  const [address, setAddress] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [contactName, setContactName] = useState('')
  const [company, setCompany] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [email, setEmail] = useState('')
  
  // Products
  const [products, setProducts] = useState<Product[]>([emptyProduct()])

  const addProduct = () => {
    if (products.length >= 50) {
      setMessage({ type: 'error', text: 'Maximum 50 products allowed' })
      return
    }
    setProducts([...products, emptyProduct()])
  }

  const removeProduct = (id: string) => {
    if (products.length <= 1) {
      setMessage({ type: 'error', text: 'At least one product required' })
      return
    }
    setProducts(products.filter(p => p.id !== id))
  }

  const updateProduct = (id: string, field: keyof Product, value: string | null) => {
    setProducts(products.map(p => p.id === id ? { ...p, [field]: value } : p))
  }

  const handleImageUpload = (id: string, file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const base64 = e.target?.result as string
      const base64Data = base64.split(',')[1]
      setProducts(products.map(p => p.id === id ? { 
        ...p, 
        image: base64Data,
        imagePreview: base64 
      } : p))
    }
    reader.readAsDataURL(file)
  }

  const generateDocument = async () => {
    if (!address.trim()) {
      setMessage({ type: 'error', text: 'Address is required' })
      return
    }

    const validProducts = products.filter(p => p.code.trim() || p.description.trim())
    if (validProducts.length === 0) {
      setMessage({ type: 'error', text: 'At least one product with code or description required' })
      return
    }

    setLoading(true)
    setMessage(null)
    
    try {
      const payload = {
        address: address.trim(),
        date,
        contactName: contactName.trim(),
        company: company.trim(),
        phoneNumber: phoneNumber.trim(),
        email: email.trim(),
        products: validProducts.map(p => ({
          category: p.category,
          code: p.code,
          description: p.description,
          manufacturerDescription: p.manufacturerDescription,
          productDetails: p.productDetails,
          areaDescription: p.areaDescription,
          quantity: p.quantity,
          price: p.price,
          notes: p.notes,
          image: p.image,
        }))
      }

      const resp = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(err.error || err.details || 'Failed to generate document')
      }

      const blob = await resp.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Product_Selection_${address.replace(/\s+/g, '_')}_${date}.docx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setMessage({ type: 'success', text: 'Document generated successfully!' })
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Unknown error' })
    } finally {
      setLoading(false)
    }
  }

  // Group products by category
  const productsByCategory = CATEGORIES.reduce((acc, cat) => {
    const catProducts = products.filter(p => p.category === cat)
    if (catProducts.length > 0) acc[cat] = catProducts
    return acc
  }, {} as Record<Category, Product[]>)

  return (
    <div className="container">
      <h1>Product Selection Generator</h1>
      <p className="subtitle">Generate product selection documents</p>

      {message && (
        <div className="card" style={{ 
          background: message.type === 'success' ? '#d4edda' : '#f8d7da',
          border: `1px solid ${message.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`,
          color: message.type === 'success' ? '#155724' : '#721c24'
        }}>
          {message.text}
        </div>
      )}

      {/* Document Details */}
      <div className="card">
        <h2 className="card-title">📄 Document Details</h2>
        <div className="grid">
          <div className="field">
            <label>Address *</label>
            <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Property address" />
          </div>
          <div className="field">
            <label>Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Client Details */}
      <div className="card">
        <h2 className="card-title">👤 Client Details</h2>
        <div className="grid">
          <div className="field">
            <label>Contact Name</label>
            <input value={contactName} onChange={e => setContactName(e.target.value)} placeholder="John Smith" />
          </div>
          <div className="field">
            <label>Company</label>
            <input value={company} onChange={e => setCompany(e.target.value)} placeholder="Company name" />
          </div>
          <div className="field">
            <label>Phone</label>
            <input value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} placeholder="0400 000 000" />
          </div>
          <div className="field">
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="client@example.com" />
          </div>
        </div>
      </div>

      {/* Products */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="card-title" style={{ margin: 0 }}>📦 Products ({products.length}/50)</h2>
          <button className="btn-secondary" onClick={addProduct} disabled={products.length >= 50}>+ Add Product</button>
        </div>

        {products.map((product, index) => (
          <div key={product.id} className="product-card">
            <div className="product-header">
              <span className="product-title">Product #{index + 1}</span>
              <button className="btn-danger btn-sm" onClick={() => removeProduct(product.id)}>✕ Remove</button>
            </div>

            <div className="grid grid-3">
              <div className="field">
                <label>Category *</label>
                <select value={product.category} onChange={e => updateProduct(product.id, 'category', e.target.value)}>
                  {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Code</label>
                <input value={product.code} onChange={e => updateProduct(product.id, 'code', e.target.value)} placeholder="Product code" />
              </div>
              <div className="field">
                <label>Description</label>
                <input value={product.description} onChange={e => updateProduct(product.id, 'description', e.target.value)} placeholder="Description" />
              </div>
              <div className="field span-2">
                <label>Manufacturer Description</label>
                <textarea value={product.manufacturerDescription} onChange={e => updateProduct(product.id, 'manufacturerDescription', e.target.value)} placeholder="Manufacturer description" />
              </div>
              <div className="field">
                <label>Product Details</label>
                <input value={product.productDetails} onChange={e => updateProduct(product.id, 'productDetails', e.target.value)} placeholder="Details" />
              </div>
              <div className="field span-2">
                <label>Area Description</label>
                <input value={product.areaDescription} onChange={e => updateProduct(product.id, 'areaDescription', e.target.value)} placeholder="Area where product will be used" />
              </div>
              <div className="field">
                <label>Quantity</label>
                <input value={product.quantity} onChange={e => updateProduct(product.id, 'quantity', e.target.value)} placeholder="Qty" />
              </div>
              <div className="field">
                <label>Price</label>
                <input value={product.price} onChange={e => updateProduct(product.id, 'price', e.target.value)} placeholder="$0.00" />
              </div>
              <div className="field">
                <label>Notes</label>
                <input value={product.notes} onChange={e => updateProduct(product.id, 'notes', e.target.value)} placeholder="Notes" />
              </div>
              <div className="field span-3">
                <label>Image (optional)</label>
                <div className="flex items-center gap-4">
                  <input type="file" accept="image/*" onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) handleImageUpload(product.id, file)
                  }} style={{ maxWidth: '250px' }} />
                  {product.imagePreview ? (
                    <div style={{ position: 'relative' }}>
                      <img src={product.imagePreview} alt="Preview" className="image-preview" />
                      <button 
                        className="btn-danger btn-sm" 
                        style={{ position: 'absolute', top: -8, right: -8, borderRadius: '50%', padding: '2px 6px' }}
                        onClick={() => { updateProduct(product.id, 'image', null); updateProduct(product.id, 'imagePreview', null) }}
                      >✕</button>
                    </div>
                  ) : (
                    <div className="image-placeholder">🖼</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      {Object.keys(productsByCategory).length > 0 && (
        <div className="card summary">
          <h2 className="card-title" style={{ color: '#2e7d32' }}>📋 Products by Category</h2>
          <ul className="summary-list">
            {Object.entries(productsByCategory).map(([cat, prods]) => (
              <li key={cat}><strong>{cat}:</strong> {prods.length} product{prods.length !== 1 ? 's' : ''}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Generate Button */}
      <div className="flex justify-end">
        <button className="btn-primary" onClick={generateDocument} disabled={loading} style={{ padding: '0.75rem 2rem', fontSize: '1rem' }}>
          {loading ? '⏳ Generating...' : '📥 Generate Document'}
        </button>
      </div>
    </div>
  )
}
