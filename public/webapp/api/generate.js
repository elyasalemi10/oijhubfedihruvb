import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { address, date, contactName, company, phoneNumber, email, products } = req.body || {}
    
    if (!address) {
      return res.status(400).json({ error: 'Address is required' })
    }
    
    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: 'At least one product is required' })
    }

    const PizZip = (await import('pizzip')).default
    const Docxtemplater = (await import('docxtemplater')).default
    const ImageModule = (await import('docxtemplater-image-module-free')).default
    const fs = await import('fs')
    const path = await import('path')

    // Load template
    const templateName = 'product-selection.docx'
    let templatePath = path.join(__dirname, 'templates', templateName)
    
    if (!fs.existsSync(templatePath)) {
      templatePath = path.join(process.cwd(), 'public', templateName)
      if (!fs.existsSync(templatePath)) {
        return res.status(500).json({ error: 'Template file not found' })
      }
    }
    
    const content = fs.readFileSync(templatePath, 'binary')
    
    let zip
    try {
      zip = new PizZip(content)
    } catch (err) {
      return res.status(500).json({ error: 'Template file is corrupted', details: err.message })
    }

    // Format date
    const formattedDate = date ? new Date(date).toLocaleDateString('en-AU', {
      year: 'numeric', month: 'long', day: 'numeric'
    }) : new Date().toLocaleDateString('en-AU', {
      year: 'numeric', month: 'long', day: 'numeric'
    })

    // Image module config - 1.375 inches = 132px at 96dpi
    const hasImages = products.some(p => p.image)
    const imageModule = new ImageModule({
      centered: false,
      getImage: (tagValue) => tagValue ? Buffer.from(tagValue, 'base64') : Buffer.alloc(0),
      getSize: () => [132, 132],
    })

    // Create docxtemplater
    let doc
    try {
      const options = {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: { start: '{{', end: '}}' }
      }
      if (hasImages) options.modules = [imageModule]
      doc = new Docxtemplater(zip, options)
    } catch (err) {
      return res.status(500).json({ error: 'Template structure invalid', details: err.message })
    }

    // Group products by category
    const categoryOrder = ['Kitchen', 'Bathroom', 'Bedroom', 'Living Room', 'Laundry', 'Balcony', 'Other']
    const productsByCategory = {}
    
    for (const p of products) {
      const cat = p.category || 'Other'
      if (!productsByCategory[cat]) productsByCategory[cat] = []
      productsByCategory[cat].push({
        code: p.code || '',
        description: p.description || '',
        'manufacturer-description': p.manufacturerDescription || '',
        'product-details': p.productDetails || '',
        'area-description': p.areaDescription || '',
        quantity: p.quantity || '',
        price: p.price || '',
        notes: p.notes || '',
        image: p.image || '',
      })
    }

    const categoriesData = categoryOrder
      .filter(cat => productsByCategory[cat]?.length > 0)
      .map(cat => ({
        'category-name': cat.toUpperCase(),
        products: productsByCategory[cat]
      }))

    // Set data
    doc.setData({
      address,
      date: formattedDate,
      'contact-name': contactName || '',
      company: company || '',
      'phone-number': phoneNumber || '',
      email: email || '',
      categories: categoriesData,
    })

    // Render
    try {
      doc.render()
    } catch (err) {
      if (err.properties?.errors) {
        return res.status(500).json({ 
          error: 'Template rendering failed', 
          details: err.properties.errors.map(e => `${e.name}: ${e.message}`).join('; ')
        })
      }
      return res.status(500).json({ error: 'Render failed', details: err.message })
    }

    // Generate output
    const buf = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' })

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    res.setHeader('Content-Disposition', `attachment; filename="Product_Selection_${address.replace(/\s+/g, '_')}.docx"`)
    
    return res.status(200).send(buf)
  } catch (e) {
    console.error('Generate error:', e)
    return res.status(500).json({ error: 'Failed to generate document', details: e.message })
  }
}
