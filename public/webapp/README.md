# Product Selection Generator

A standalone web app for generating product selection documents (.docx).

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Run locally
```bash
npm run dev
```

### 3. Deploy to Vercel
```bash
npx vercel
```

Or connect your GitHub repo to Vercel for automatic deployments.

---

## Features

- Generate Word documents from a template
- Group products by category (Kitchen, Bathroom, etc.)
- Client details (name, company, phone, email)
- Product images support
- No external dependencies or API keys required

---

## Customizing the Template

The template is located at:
- `api/templates/product-selection.docx` (for production/Vercel)
- `public/product-selection.docx` (for local development)

### Template Placeholders

**Header:**
- `{{address}}` - Property address
- `{{date}}` - Document date
- `{{contact-name}}` - Client name
- `{{company}}` - Company name
- `{{phone-number}}` - Phone number
- `{{email}}` - Email address

**Category Loop:**
```
{{#categories}}
  {{category-name}}     ← Shows "KITCHEN", "BATHROOM", etc.
  
  {{#products}}
    {{code}}
    {{description}}
    {{manufacturer-description}}
    {{product-details}}
    {{area-description}}
    {{quantity}}
    {{price}}
    {{notes}}
    {%image}            ← For images (optional)
  {{/products}}{{/categories}}
```

### Image Size
Images are rendered at 1.375 inches (132px at 96dpi).

---

## Project Structure

```
product-selection-standalone/
├── api/
│   ├── generate.js              # API endpoint
│   └── templates/
│       └── product-selection.docx
├── public/
│   └── product-selection.docx   # Template (local dev)
├── src/
│   ├── App.tsx                  # Main React component
│   ├── index.css                # Styles
│   ├── main.tsx                 # Entry point
│   └── vite-env.d.ts
├── index.html
├── package.json
├── tsconfig.json
├── vercel.json
└── vite.config.ts
```

---

## Tech Stack

- **Frontend:** React + TypeScript + Vite
- **Backend:** Vercel Serverless Functions
- **Document Generation:** docxtemplater + pizzip

---

## License

MIT
