import { requireAdmin } from "@/lib/auth";
import Script from "next/script";

export default async function ProductSelectionPage() {
  await requireAdmin();

  return (
    <>
      <Script src="https://cdn.tailwindcss.com" />
      <Script src="https://cdn.jsdelivr.net/npm/chart.js" />
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js" />
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.29/jspdf.plugin.autotable.min.js" />
      
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
        rel="stylesheet"
      />

      <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
    </>
  );
}

const htmlContent = `
<style>
  body { font-family: 'Inter', sans-serif; background-color: #f1f5f9; }
  
  .chart-container {
    position: relative;
    width: 100%;
    max-width: 180px;
    margin: 0 auto;
    height: 180px;
  }

  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

  .nav-item.active { background-color: #ffffff; color: #2563eb; border-left: 4px solid #2563eb; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
  .nav-item { border-left: 4px solid transparent; }
  
  .gallery-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
    gap: 8px;
  }
</style>

<div class="text-slate-800 h-screen flex flex-col overflow-hidden">
  <!-- Top Bar -->
  <header class="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 shadow-sm z-20 shrink-0">
    <div class="flex items-center gap-3">
      <div id="company-logo-header" class="w-10 h-10 bg-slate-100 rounded flex items-center justify-center overflow-hidden">
        <i class="fa-solid fa-building text-slate-400"></i>
      </div>
      <div>
        <h1 class="font-bold text-lg text-slate-800 leading-tight">Selection Specifier</h1>
        <p class="text-xs text-slate-500">Job: <span id="header-job-ref">New Job</span></p>
      </div>
    </div>

    <div class="flex items-center gap-3">
      <input type="file" id="import-file" class="hidden" accept=".json">
      <button onclick="document.getElementById('import-file').click()" class="text-sm font-medium text-slate-600 hover:text-blue-600 px-3 py-2 transition">
        <i class="fa-solid fa-upload mr-1"></i> Load
      </button>
      <button onclick="exportProjectJSON()" class="text-sm font-medium text-slate-600 hover:text-blue-600 px-3 py-2 transition">
        <i class="fa-solid fa-download mr-1"></i> Save File
      </button>
      <div class="h-6 w-px bg-slate-300 mx-1"></div>
      <button onclick="openModal('settings-modal')" class="text-slate-600 hover:text-blue-600 px-2 transition" title="Company Settings">
        <i class="fa-solid fa-cog text-lg"></i>
      </button>
      <button onclick="generatePDF()" class="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded shadow transition flex items-center gap-2">
        <i class="fa-solid fa-file-contract"></i> Generate Contract PDF
      </button>
    </div>
  </header>

  <div class="flex flex-1 overflow-hidden">
    <!-- Sidebar -->
    <aside class="w-72 bg-slate-50 border-r border-slate-200 flex flex-col overflow-y-auto shrink-0 z-10">
      <!-- Progress -->
      <div class="p-6 border-b border-slate-200 bg-white">
        <div class="chart-container mb-2">
          <canvas id="progressChart"></canvas>
        </div>
        <div class="text-center">
          <p class="text-xs font-bold text-slate-600 uppercase tracking-wide">Specification Progress</p>
          <p class="text-2xl font-bold text-blue-600" id="progress-percent">0%</p>
        </div>
      </div>

      <!-- Navigation -->
      <div class="p-2 flex-1">
        <div class="flex justify-between items-center px-2 mb-2 mt-2">
          <h3 class="text-xs font-bold text-slate-400 uppercase">Categories</h3>
          <button onclick="addCategory()" class="text-blue-600 hover:bg-blue-50 p-1 rounded transition text-xs">
            <i class="fa-solid fa-plus"></i> Add
          </button>
        </div>
        <nav id="nav-container" class="space-y-1 pb-10"></nav>
      </div>
      
      <!-- Client Access Button -->
      <div class="p-4 bg-slate-100 border-t border-slate-200 sticky bottom-0">
        <button onclick="scrollToBottom()" class="w-full bg-slate-800 text-white py-2 rounded text-sm font-medium hover:bg-slate-700 transition">
          <i class="fa-solid fa-signature mr-2"></i> Client Sign-Off
        </button>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 overflow-y-auto bg-slate-100 p-8 relative" id="main-scroll">
      <!-- Project Header Card -->
      <div class="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <!-- Client Details -->
        <div>
          <h2 class="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4 border-b pb-2">
            <i class="fa-solid fa-user-circle mr-2 text-blue-500"></i>Client Details
          </h2>
          <div class="grid grid-cols-2 gap-4">
            <div class="col-span-2">
              <label class="block text-xs font-semibold text-slate-500 mb-1">Client Name(s)</label>
              <input type="text" id="client-name" class="w-full text-sm border-slate-300 rounded border p-2 bg-slate-50 focus:bg-white transition" placeholder="e.g. John & Jane Smith">
            </div>
            <div class="col-span-2">
              <label class="block text-xs font-semibold text-slate-500 mb-1">Project Address</label>
              <input type="text" id="project-address" class="w-full text-sm border-slate-300 rounded border p-2 bg-slate-50 focus:bg-white transition" placeholder="e.g. 123 Construction Ave, Suburb">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-1">Phone</label>
              <input type="text" id="client-phone" class="w-full text-sm border-slate-300 rounded border p-2 bg-slate-50 focus:bg-white transition" placeholder="(04) ...">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-1">Email</label>
              <input type="email" id="client-email" class="w-full text-sm border-slate-300 rounded border p-2 bg-slate-50 focus:bg-white transition" placeholder="client@email.com">
            </div>
          </div>
        </div>
        
        <!-- Internal/Job Details -->
        <div>
          <h2 class="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4 border-b pb-2">
            <i class="fa-solid fa-clipboard-list mr-2 text-blue-500"></i>Job Details
          </h2>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-1">Job Number</label>
              <input type="text" id="job-number" class="w-full text-sm border-slate-300 rounded border p-2 bg-slate-50 focus:bg-white transition" placeholder="J-2025-001">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-1">Contract Date</label>
              <input type="date" id="job-date" class="w-full text-sm border-slate-300 rounded border p-2 bg-slate-50 focus:bg-white transition">
            </div>
            <div class="col-span-2">
              <label class="block text-xs font-semibold text-slate-500 mb-1">Notes / Version</label>
              <textarea id="job-notes" class="w-full text-sm border-slate-300 rounded border p-2 bg-slate-50 focus:bg-white transition h-20" placeholder="Internal notes..."></textarea>
            </div>
          </div>
        </div>
      </div>

      <!-- Dynamic Section Area -->
      <div id="section-content-area" class="pb-10"></div>

      <!-- Sign Off Section -->
      <div id="sign-off-section" class="mt-12 bg-white rounded-lg shadow-sm border border-slate-200 p-8">
        <div class="text-center mb-8">
          <h2 class="text-2xl font-bold text-slate-800">Client Acceptance</h2>
          <p class="text-slate-500 mt-1">Please review the specifications above before signing.</p>
        </div>

        <div class="max-w-3xl mx-auto bg-slate-50 p-6 rounded border border-slate-200 mb-6 text-sm text-slate-600 h-32 overflow-y-auto">
          <p class="font-bold mb-2">Terms and Conditions of Selection:</p>
          <p class="mb-2">1. The Client confirms that the selections made in this document are final and agrees to the specifications listed.</p>
          <p class="mb-2">2. Any changes requested after the signing of this document may incur a variation fee and potential delays to the project timeline.</p>
          <p class="mb-2">3. All selections are subject to availability. The Builder reserves the right to substitute items of equal value and quality if specified items become unavailable.</p>
          <p>4. It is the Client's responsibility to verify that colours and finishes match their expectations as screen representations may vary.</p>
        </div>

        <div class="max-w-md mx-auto">
          <div class="flex items-start gap-3 mb-6">
            <input type="checkbox" id="terms-check" class="mt-1 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500">
            <label for="terms-check" class="text-sm text-slate-700">I have read and agree to the Terms and Conditions and confirm the specifications listed in this document are correct.</label>
          </div>

          <div class="mb-4">
            <label class="block text-xs font-semibold text-slate-500 mb-1">Full Name (Signature)</label>
            <input type="text" id="sign-name" class="w-full text-lg font-serif border-slate-300 rounded border p-3 bg-white focus:ring-2 ring-blue-500 outline-none" placeholder="Type name to sign...">
          </div>
          
          <button onclick="signDocument()" id="btn-sign" class="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded shadow transition disabled:opacity-50 disabled:cursor-not-allowed">
            <i class="fa-solid fa-pen-nib mr-2"></i> Confirm & Sign Specification
          </button>
          
          <div id="signed-stamp" class="hidden mt-6 border-2 border-green-500 rounded p-4 text-center bg-green-50">
            <div class="text-green-700 font-bold text-lg uppercase tracking-widest">Digitally Signed</div>
            <div id="stamp-name" class="text-slate-800 font-serif text-xl my-1"></div>
            <div id="stamp-date" class="text-slate-500 text-xs"></div>
          </div>
        </div>
      </div>

      <!-- Footer Spacing -->
      <div class="h-20"></div>
    </main>
  </div>

  <!-- Settings Modal -->
  <div id="settings-modal" class="fixed inset-0 bg-black/50 z-50 hidden flex items-center justify-center p-4">
    <div class="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
      <div class="flex justify-between items-center mb-4 border-b pb-2">
        <h3 class="font-bold text-lg">Company Settings</h3>
        <button onclick="closeModal('settings-modal')" class="text-slate-400 hover:text-slate-600"><i class="fa-solid fa-times"></i></button>
      </div>
      
      <div class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-600 mb-1">Company Logo</label>
          <div class="flex items-center gap-4">
            <div id="settings-logo-preview" class="w-16 h-16 bg-slate-100 border border-slate-200 flex items-center justify-center rounded overflow-hidden">
              <span class="text-xs text-slate-400">No Logo</span>
            </div>
            <button onclick="document.getElementById('company-logo-input').click()" class="text-xs bg-white border border-slate-300 hover:bg-slate-50 px-3 py-2 rounded transition">
              Upload PNG/JPG
            </button>
            <input type="file" id="company-logo-input" class="hidden" accept="image/*" onchange="handleLogoUpload(this)">
          </div>
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-600 mb-1">Company Name</label>
          <input type="text" id="settings-company-name" class="w-full text-sm border border-slate-300 rounded p-2">
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-600 mb-1">Company Details (Address/ABN/Contact)</label>
          <textarea id="settings-company-details" class="w-full text-sm border border-slate-300 rounded p-2 h-20" placeholder="123 Builder Lane&#10;ABN: 00 000 000&#10;Phone: ..."></textarea>
        </div>
      </div>

      <div class="mt-6 flex justify-end">
        <button onclick="saveSettings()" class="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">Save Settings</button>
      </div>
    </div>
  </div>

  <!-- Libraries (Hidden) -->
  <datalist id="lib-suppliers">
    <option value="Bunnings Trade">
    <option value="Reece Plumbing">
    <option value="Beaumont Tiles">
    <option value="Harvey Norman Commercial">
    <option value="Winning Appliances">
    <option value="Bradnams Windows">
    <option value="PGH Bricks">
  </datalist>

  <script>
    ${scriptContent}
  </script>
</div>
`;

const scriptContent = `
// --- DATA STRUCTURE ---
let appState = {
  meta: {
    jobNumber: '',
    contractDate: new Date().toISOString().split('T')[0],
    notes: '',
    logo: null,
    companyName: 'My Construction Co.',
    companyDetails: '123 Builder Street\\nMelbourne VIC 3000\\nPh: (03) 9999 9999',
    signature: null
  },
  client: { name: '', address: '', phone: '', email: '' },
  sections: [
    {
      id: 'ext',
      title: 'Exterior',
      subsections: [
        {
          title: 'Roofing',
          items: [
            { name: 'Roof Material', fields: { Manufacturer: '', Profile: '', Colour: '' }, supplier: {name: '', contact: ''}, images: [], datasheet: '', notes: '' },
            { name: 'Fascia & Gutter', fields: { Manufacturer: '', Profile: '', Colour: '' }, supplier: {name: '', contact: ''}, images: [], datasheet: '', notes: '' }
          ]
        },
        {
          title: 'Masonry',
          items: [
            { name: 'Face Bricks', fields: { Manufacturer: '', Product: '', Colour: '', Mortar: '' }, supplier: {name: '', contact: ''}, images: [], datasheet: '', notes: '' }
          ]
        }
      ]
    },
    {
      id: 'int',
      title: 'Internal',
      subsections: [
        {
          title: 'Kitchen',
          items: [
            { name: 'Benchtop', fields: { Material: '', Colour: '', Thickness: '' }, supplier: {name: '', contact: ''}, images: [], datasheet: '', notes: '' },
            { name: 'Cabinetry', fields: { Profile: '', Finish: '', Colour: '' }, supplier: {name: '', contact: ''}, images: [], datasheet: '', notes: '' },
            { name: 'Sink', fields: { Brand: '', Model: '', Finish: '' }, supplier: {name: '', contact: ''}, images: [], datasheet: '', notes: '' }
          ]
        }
      ]
    }
  ]
};

let activeSectionIndex = 0;
let chartInstance = null;

window.addEventListener('DOMContentLoaded', () => {
  initListeners();
  renderAll();
  renderSettings();
});

function initListeners() {
  ['client-name', 'project-address', 'client-phone', 'client-email'].forEach(id => {
    const map = { 'client-name': 'name', 'project-address': 'address', 'client-phone': 'phone', 'client-email': 'email' };
    const el = document.getElementById(id);
    if(el) el.addEventListener('input', (e) => {
      appState.client[map[id]] = e.target.value;
      renderHeaderJob();
    });
  });

  const jobNum = document.getElementById('job-number');
  const jobDate = document.getElementById('job-date');
  const jobNotes = document.getElementById('job-notes');
  const importFile = document.getElementById('import-file');
  
  if(jobNum) jobNum.addEventListener('input', (e) => { appState.meta.jobNumber = e.target.value; renderHeaderJob(); });
  if(jobDate) jobDate.addEventListener('input', (e) => appState.meta.contractDate = e.target.value);
  if(jobNotes) jobNotes.addEventListener('input', (e) => appState.meta.notes = e.target.value);
  if(importFile) importFile.addEventListener('change', handleFileLoad);
}

function renderAll() {
  renderHeaderJob();
  renderNavigation();
  renderMainContent();
  updateChart();
  renderSettings();
}

function renderHeaderJob() {
  const headerJobRef = document.getElementById('header-job-ref');
  if(headerJobRef) headerJobRef.textContent = appState.meta.jobNumber || 'New Job';
  
  const clientName = document.getElementById('client-name');
  const projectAddress = document.getElementById('project-address');
  const clientPhone = document.getElementById('client-phone');
  const clientEmail = document.getElementById('client-email');
  const jobNumber = document.getElementById('job-number');
  const jobDate = document.getElementById('job-date');
  const jobNotes = document.getElementById('job-notes');
  
  if(clientName) clientName.value = appState.client.name;
  if(projectAddress) projectAddress.value = appState.client.address;
  if(clientPhone) clientPhone.value = appState.client.phone;
  if(clientEmail) clientEmail.value = appState.client.email;
  if(jobNumber) jobNumber.value = appState.meta.jobNumber;
  if(jobDate) jobDate.value = appState.meta.contractDate;
  if(jobNotes) jobNotes.value = appState.meta.notes;

  if(appState.meta.signature) {
    const btnSign = document.getElementById('btn-sign');
    const signedStamp = document.getElementById('signed-stamp');
    const stampName = document.getElementById('stamp-name');
    const stampDate = document.getElementById('stamp-date');
    const termsCheck = document.getElementById('terms-check');
    const signName = document.getElementById('sign-name');
    
    if(btnSign) btnSign.classList.add('hidden');
    if(signedStamp) signedStamp.classList.remove('hidden');
    if(stampName) stampName.textContent = appState.meta.signature.name;
    if(stampDate) stampDate.textContent = new Date(appState.meta.signature.date).toLocaleString();
    if(termsCheck) { termsCheck.checked = true; termsCheck.disabled = true; }
    if(signName) { signName.value = appState.meta.signature.name; signName.disabled = true; }
  } else {
    const btnSign = document.getElementById('btn-sign');
    const signedStamp = document.getElementById('signed-stamp');
    const termsCheck = document.getElementById('terms-check');
    const signName = document.getElementById('sign-name');
    
    if(btnSign) btnSign.classList.remove('hidden');
    if(signedStamp) signedStamp.classList.add('hidden');
    if(termsCheck) termsCheck.disabled = false;
    if(signName) signName.disabled = false;
  }
}

function renderNavigation() {
  const container = document.getElementById('nav-container');
  if(!container) return;
  container.innerHTML = '';

  appState.sections.forEach((sec, idx) => {
    const isActive = idx === activeSectionIndex;
    const completed = countCompletedItems(sec);
    const total = countTotalItems(sec);
    
    const div = document.createElement('div');
    div.className = \`nav-item px-4 py-3 cursor-pointer transition flex justify-between items-center group \${isActive ? 'active' : 'hover:bg-slate-100 text-slate-600'}\`;
    div.onclick = () => { activeSectionIndex = idx; renderNavigation(); renderMainContent(); };
    
    div.innerHTML = \`
      <div class="flex items-center gap-3">
        <i class="fa-solid fa-folder\${isActive ? '-open' : ''} text-lg \${isActive ? 'text-blue-500' : 'text-slate-300'}"></i>
        <span class="font-medium text-sm">\${sec.title}</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-xs bg-slate-200 px-1.5 rounded text-slate-500">\${completed}/\${total}</span>
        <button onclick="deleteCategory(\${idx}, event)" class="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 px-1"><i class="fa-solid fa-trash text-xs"></i></button>
      </div>
    \`;
    container.appendChild(div);
  });
}

function renderMainContent() {
  const container = document.getElementById('section-content-area');
  if(!container) return;
  const section = appState.sections[activeSectionIndex];
  
  if(!section) { container.innerHTML = '<div class="p-8 text-center text-slate-400">No category selected</div>'; return; }

  let html = \`
    <div class="flex justify-between items-end mb-6">
      <div>
        <input type="text" value="\${section.title}" onchange="updateCategoryTitle(this.value)" class="text-3xl font-bold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none transition w-full max-w-lg" title="Click to rename category">
        <p class="text-slate-500 text-sm mt-1">Manage specifications for this category.</p>
      </div>
      <button onclick="addSubCategory()" class="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded text-sm font-medium shadow-sm transition">
        <i class="fa-solid fa-folder-plus mr-2 text-blue-500"></i>Add Sub-Category
      </button>
    </div>
  \`;

  section.subsections.forEach((sub, subIdx) => {
    html += \`
      <div class="bg-white rounded-lg shadow-sm border border-slate-200 mb-8 overflow-hidden">
        <div class="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center group">
          <input type="text" value="\${sub.title}" onchange="updateSubTitle(\${subIdx}, this.value)" class="font-bold text-slate-700 bg-transparent border-b border-transparent hover:border-slate-400 focus:border-blue-500 focus:outline-none text-lg">
          <div class="flex gap-2 opacity-100 lg:opacity-0 group-hover:opacity-100 transition">
            <button onclick="addItem(\${subIdx})" class="text-blue-600 hover:bg-blue-100 px-3 py-1 rounded text-xs font-bold uppercase"><i class="fa-solid fa-plus mr-1"></i> Add Item</button>
            <button onclick="deleteSubCategory(\${subIdx})" class="text-red-500 hover:bg-red-100 px-3 py-1 rounded text-xs font-bold uppercase"><i class="fa-solid fa-trash mr-1"></i> Delete Group</button>
          </div>
        </div>
        <div class="p-6 space-y-6">
    \`;

    sub.items.forEach((item, itemIdx) => {
      html += renderItemCard(item, subIdx, itemIdx);
    });

    if(sub.items.length === 0) {
      html += \`<div class="text-center py-8 text-slate-400 text-sm italic cursor-pointer hover:text-blue-500" onclick="addItem(\${subIdx})">+ Click here to add your first item to this group</div>\`;
    }

    html += \`</div></div>\`;
  });

  container.innerHTML = html;
}

function renderItemCard(item, subIdx, itemIdx) {
  let fieldsHtml = '';
  for (const [key, val] of Object.entries(item.fields)) {
    fieldsHtml += \`
      <div>
        <div class="flex justify-between">
          <label class="text-xs font-semibold text-slate-500 mb-1">\${key}</label>
          <button onclick="removeField(\${subIdx}, \${itemIdx}, '\${key}')" class="text-[10px] text-red-300 hover:text-red-500" title="Remove Field"><i class="fa-solid fa-times"></i></button>
        </div>
        <input type="text" value="\${val}" onchange="updateField(\${subIdx}, \${itemIdx}, '\${key}', this.value)" class="w-full text-sm border-slate-200 rounded p-2 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-slate-50 focus:bg-white" placeholder="...">
      </div>
    \`;
  }

  let imagesHtml = item.images.map((img, imgIdx) => \`
    <div class="relative group aspect-square rounded overflow-hidden border border-slate-200">
      <img src="\${img}" class="w-full h-full object-cover">
      <button onclick="removeImage(\${subIdx}, \${itemIdx}, \${imgIdx})" class="absolute top-0 right-0 bg-red-500 text-white p-1 text-xs opacity-0 group-hover:opacity-100 transition"><i class="fa-solid fa-times"></i></button>
    </div>
  \`).join('');

  return \`
    <div class="border border-slate-200 rounded-lg p-4 hover:shadow-md transition bg-white relative">
      <button onclick="deleteItem(\${subIdx}, \${itemIdx})" class="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition"><i class="fa-solid fa-trash"></i></button>
      
      <div class="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div class="xl:col-span-1 space-y-4 border-r border-slate-100 pr-4">
          <div>
            <label class="text-xs font-bold text-slate-400 uppercase">Item Name</label>
            <input type="text" value="\${item.name}" onchange="updateItemName(\${subIdx}, \${itemIdx}, this.value)" class="w-full font-bold text-slate-800 border-b border-slate-200 focus:border-blue-500 outline-none py-1">
          </div>
          <div>
            <label class="text-xs font-bold text-slate-400 uppercase mb-1 block">Supplier Details</label>
            <input type="text" list="lib-suppliers" value="\${item.supplier.name}" onchange="updateSupplier(\${subIdx}, \${itemIdx}, 'name', this.value)" class="w-full text-sm border-slate-200 rounded p-1.5 mb-2" placeholder="Supplier Name">
            <input type="text" value="\${item.supplier.contact}" onchange="updateSupplier(\${subIdx}, \${itemIdx}, 'contact', this.value)" class="w-full text-sm border-slate-200 rounded p-1.5" placeholder="Phone/Email/Contact">
          </div>
          <div class="pt-2">
            <label class="text-xs font-bold text-slate-400 uppercase mb-1 block">Visuals</label>
            <div class="gallery-grid mb-2">
              \${imagesHtml}
              <button onclick="triggerItemImageUpload(\${subIdx}, \${itemIdx})" class="aspect-square border border-dashed border-slate-300 rounded flex flex-col items-center justify-center text-slate-400 hover:text-blue-500 hover:border-blue-400 hover:bg-blue-50 transition">
                <i class="fa-solid fa-camera mb-1"></i>
                <span class="text-[10px]">Add</span>
              </button>
            </div>
            <input type="file" id="img-input-\${subIdx}-\${itemIdx}" class="hidden" accept="image/*" multiple onchange="handleImageUpload(this, \${subIdx}, \${itemIdx})">
          </div>
        </div>

        <div class="xl:col-span-3">
          <div class="flex justify-between items-center mb-2">
            <span class="text-xs font-bold text-slate-400 uppercase">Specifications</span>
            <button onclick="addField(\${subIdx}, \${itemIdx})" class="text-xs text-blue-500 hover:underline">+ Add Custom Field</button>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            \${fieldsHtml}
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
            <div>
              <label class="text-xs font-semibold text-slate-500 mb-1">Datasheet Hyperlink</label>
              <div class="flex gap-2">
                <div class="relative flex-1">
                  <i class="fa-solid fa-link absolute left-2 top-2.5 text-slate-300 text-xs"></i>
                  <input type="text" value="\${item.datasheet}" onchange="updateItemProp(\${subIdx}, \${itemIdx}, 'datasheet', this.value)" class="w-full pl-7 text-sm border-slate-200 rounded p-2 text-blue-600" placeholder="https://...">
                </div>
                \${item.datasheet ? \`<a href="\${item.datasheet}" target="_blank" class="p-2 bg-slate-100 rounded text-slate-500 hover:text-blue-600 border border-slate-200"><i class="fa-solid fa-external-link-alt"></i></a>\` : ''}
              </div>
            </div>
            <div>
              <label class="text-xs font-semibold text-slate-500 mb-1">Notes / Instructions</label>
              <input type="text" value="\${item.notes}" onchange="updateItemProp(\${subIdx}, \${itemIdx}, 'notes', this.value)" class="w-full text-sm border-slate-200 rounded p-2" placeholder="e.g. Install horizontally...">
            </div>
          </div>
        </div>
      </div>
    </div>
  \`;
}

function countCompletedItems(sec) {
  let count = 0;
  sec.subsections.forEach(sub => {
    sub.items.forEach(item => {
      if (Object.values(item.fields).some(v => v !== '')) count++;
    });
  });
  return count;
}

function countTotalItems(sec) {
  return sec.subsections.reduce((acc, sub) => acc + sub.items.length, 0);
}

function updateChart() {
  let completed = 0;
  let total = 0;
  appState.sections.forEach(sec => {
    completed += countCompletedItems(sec);
    total += countTotalItems(sec);
  });

  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  const percentEl = document.getElementById('progress-percent');
  if(percentEl) percentEl.textContent = \`\${percent}%\`;

  if (chartInstance) chartInstance.destroy();
  const canvas = document.getElementById('progressChart');
  if(canvas) {
    const ctx = canvas.getContext('2d');
    chartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Done', 'Pending'],
        datasets: [{ data: [completed, total - completed], backgroundColor: ['#2563eb', '#e2e8f0'], borderWidth: 0 }]
      },
      options: { cutout: '70%', plugins: { legend: { display: false }, tooltip: { enabled: false } } }
    });
  }
}

function addCategory() {
  const name = prompt("New Category Name:", "New Category");
  if(name) {
    appState.sections.push({ id: Date.now(), title: name, subsections: [] });
    renderNavigation();
  }
}

function deleteCategory(idx, e) {
  e.stopPropagation();
  if(confirm("Delete this entire category?")) {
    appState.sections.splice(idx, 1);
    if(activeSectionIndex >= appState.sections.length) activeSectionIndex = Math.max(0, appState.sections.length - 1);
    renderAll();
  }
}

function updateCategoryTitle(val) { appState.sections[activeSectionIndex].title = val; renderNavigation(); }

function addSubCategory() {
  appState.sections[activeSectionIndex].subsections.push({ title: "New Group", items: [] });
  renderMainContent();
  updateChart();
  renderNavigation();
}

function deleteSubCategory(subIdx) {
  if(confirm("Delete this group and all its items?")) {
    appState.sections[activeSectionIndex].subsections.splice(subIdx, 1);
    renderMainContent();
    updateChart();
    renderNavigation();
  }
}

function updateSubTitle(subIdx, val) { appState.sections[activeSectionIndex].subsections[subIdx].title = val; }

function addItem(subIdx) {
  appState.sections[activeSectionIndex].subsections[subIdx].items.push({
    name: 'New Item',
    fields: { Manufacturer: '', Colour: '' },
    supplier: { name: '', contact: '' },
    images: [],
    datasheet: '',
    notes: ''
  });
  renderMainContent();
  updateChart();
  renderNavigation();
}

function deleteItem(subIdx, itemIdx) {
  if(confirm("Remove this item?")) {
    appState.sections[activeSectionIndex].subsections[subIdx].items.splice(itemIdx, 1);
    renderMainContent();
    updateChart();
    renderNavigation();
  }
}

function updateItemName(s, i, v) { appState.sections[activeSectionIndex].subsections[s].items[i].name = v; }
function updateSupplier(s, i, field, v) { appState.sections[activeSectionIndex].subsections[s].items[i].supplier[field] = v; }
function updateItemProp(s, i, prop, v) { appState.sections[activeSectionIndex].subsections[s].items[i][prop] = v; }
function updateField(s, i, key, v) { 
  appState.sections[activeSectionIndex].subsections[s].items[i].fields[key] = v; 
  updateChart(); 
  renderNavigation();
}

function addField(s, i) {
  const name = prompt("Field Name (e.g., Size, Grout):");
  if(name) {
    appState.sections[activeSectionIndex].subsections[s].items[i].fields[name] = "";
    renderMainContent();
  }
}

function removeField(s, i, key) {
  delete appState.sections[activeSectionIndex].subsections[s].items[i].fields[key];
  renderMainContent();
}

function triggerItemImageUpload(s, i) { 
  const input = document.getElementById(\`img-input-\${s}-\${i}\`);
  if(input) input.click();
}

function handleImageUpload(input, s, i) {
  if (input.files) {
    Array.from(input.files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        appState.sections[activeSectionIndex].subsections[s].items[i].images.push(e.target.result);
        if(file === input.files[input.files.length -1]) renderMainContent();
      };
      reader.readAsDataURL(file);
    });
  }
}

function removeImage(s, i, imgIdx) {
  appState.sections[activeSectionIndex].subsections[s].items[i].images.splice(imgIdx, 1);
  renderMainContent();
}

function openModal(id) { 
  const modal = document.getElementById(id);
  if(modal) modal.classList.remove('hidden');
  renderSettings();
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if(modal) modal.classList.add('hidden');
}

function renderSettings() {
  const companyName = document.getElementById('settings-company-name');
  const companyDetails = document.getElementById('settings-company-details');
  
  if(companyName) companyName.value = appState.meta.companyName;
  if(companyDetails) companyDetails.value = appState.meta.companyDetails;
  
  const headerLogoDiv = document.getElementById('company-logo-header');
  const logoPreview = document.getElementById('settings-logo-preview');
  
  if(appState.meta.logo) {
    if(headerLogoDiv) headerLogoDiv.innerHTML = \`<img src="\${appState.meta.logo}" class="w-full h-full object-contain">\`;
    if(logoPreview) logoPreview.innerHTML = \`<img src="\${appState.meta.logo}" class="w-full h-full object-contain">\`;
  } else {
    if(headerLogoDiv) headerLogoDiv.innerHTML = \`<i class="fa-solid fa-building text-slate-400"></i>\`;
    if(logoPreview) logoPreview.innerHTML = \`<span class="text-xs text-slate-400">No Logo</span>\`;
  }
}

function handleLogoUpload(input) {
  if(input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = (e) => {
      appState.meta.logo = e.target.result;
      renderSettings();
    };
    reader.readAsDataURL(input.files[0]);
  }
}

function saveSettings() {
  const companyName = document.getElementById('settings-company-name');
  const companyDetails = document.getElementById('settings-company-details');
  
  if(companyName) appState.meta.companyName = companyName.value;
  if(companyDetails) appState.meta.companyDetails = companyDetails.value;
  closeModal('settings-modal');
}

function scrollToBottom() {
  const mainScroll = document.getElementById('main-scroll');
  if(mainScroll) mainScroll.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  
  const el = document.getElementById('sign-off-section');
  if(el) {
    el.classList.add('ring-4', 'ring-blue-200');
    setTimeout(() => el.classList.remove('ring-4', 'ring-blue-200'), 1000);
  }
}

function signDocument() {
  const signName = document.getElementById('sign-name');
  const termsCheck = document.getElementById('terms-check');
  
  const name = signName ? signName.value : '';
  const checked = termsCheck ? termsCheck.checked : false;
  
  if(!checked) { alert("Please agree to the Terms and Conditions."); return; }
  if(!name) { alert("Please type your full name to sign."); return; }

  appState.meta.signature = {
    name: name,
    date: new Date().toISOString()
  };
  
  renderHeaderJob();
  alert("Document Signed Successfully.");
}

function exportProjectJSON() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appState));
  const dl = document.createElement('a');
  dl.setAttribute("href", dataStr);
  dl.setAttribute("download", \`Spec_\${appState.meta.jobNumber || 'Project'}.json\`);
  dl.click();
}

function handleFileLoad(e) {
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      appState = JSON.parse(ev.target.result);
      activeSectionIndex = 0;
      renderAll();
      alert("Project Loaded.");
    } catch(err) { alert("Invalid File"); }
  };
  reader.readAsText(file);
}

async function generatePDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  let yPos = 20;
  
  if(appState.meta.logo) {
    try {
      doc.addImage(appState.meta.logo, 'PNG', 15, 15, 25, 25, undefined, 'FAST');
    } catch(e) { console.error(e); }
  } else {
    doc.setDrawColor(200);
    doc.rect(15, 15, 25, 25);
    doc.setFontSize(8); doc.text("Logo", 22, 27);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(30);
  doc.text(appState.meta.companyName, 45, 22);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100);
  const splitDetails = doc.splitTextToSize(appState.meta.companyDetails, 80);
  doc.text(splitDetails, 45, 28);

  doc.setFontSize(22);
  doc.setTextColor(37, 99, 235);
  doc.text("SCHEDULE OF FINISHES", 200, 25, { align: 'right' });
  
  yPos = 50;

  doc.setDrawColor(200);
  doc.setFillColor(248, 250, 252);
  doc.rect(14, yPos, 182, 35, 'FD');
  
  doc.setFontSize(10);
  doc.setTextColor(50);
  doc.setFont('helvetica', 'bold');
  doc.text("Client:", 18, yPos + 8);
  doc.text("Project Address:", 18, yPos + 16);
  doc.text("Job Number:", 120, yPos + 8);
  doc.text("Date:", 120, yPos + 16);

  doc.setFont('helvetica', 'normal');
  doc.text(appState.client.name, 50, yPos + 8);
  doc.text(appState.client.address, 50, yPos + 16);
  doc.text(appState.client.phone + " | " + appState.client.email, 50, yPos + 24);
  
  doc.text(appState.meta.jobNumber, 150, yPos + 8);
  doc.text(appState.meta.contractDate, 150, yPos + 16);

  yPos += 45;

  for(const section of appState.sections) {
    if(yPos > 260) { doc.addPage(); yPos = 20; }
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.setFillColor(226, 232, 240);
    doc.rect(14, yPos - 6, 182, 8, 'F');
    doc.text(section.title.toUpperCase(), 16, yPos);
    yPos += 10;

    for(const sub of section.subsections) {
      if(yPos > 260) { doc.addPage(); yPos = 20; }
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(80);
      doc.text(sub.title, 14, yPos);
      yPos += 4;

      const bodyData = sub.items.map(item => {
        let specTxt = "";
        for(const [k, v] of Object.entries(item.fields)) if(v) specTxt += \`\${k}: \${v}\\n\`;
        
        let supTxt = "";
        if(item.supplier.name) supTxt += \`\${item.supplier.name}\\n\`;
        if(item.supplier.contact) supTxt += \`\${item.supplier.contact}\`;
        
        let extra = "";
        if(item.notes) extra += \`Note: \${item.notes}\\n\`;
        
        return [item.name, specTxt, supTxt, extra, ''];
      });

      doc.autoTable({
        startY: yPos,
        head: [['Item', 'Specifications', 'Supplier', 'Notes/Datasheet', 'Visuals']],
        body: bodyData,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246], textColor: 255, fontSize: 9 },
        styles: { fontSize: 8, cellPadding: 3, valign: 'top', lineColor: [220], lineWidth: 0.1 },
        columnStyles: {
          0: { fontStyle: 'bold', width: 30 },
          1: { width: 45 },
          2: { width: 30 },
          3: { width: 35 },
          4: { width: 40, minCellHeight: 25 }
        },
        didDrawCell: (data) => {
          if(data.column.index === 3 && data.section === 'body') {
            const item = sub.items[data.row.index];
            if(item && item.datasheet) {
              const textH = doc.getTextDimensions(data.cell.text).h; 
              const linkY = data.cell.y + textH + 6;
              
              doc.setTextColor(37, 99, 235);
              doc.setFontSize(7);
              doc.textWithLink("VIEW DATASHEET", data.cell.x + 2, linkY, { url: item.datasheet });
              doc.setDrawColor(37, 99, 235);
              doc.line(data.cell.x + 2, linkY + 0.5, data.cell.x + 23, linkY + 0.5);
              doc.setTextColor(50);
            }
          }

          if(data.column.index === 4 && data.section === 'body') {
            const item = sub.items[data.row.index];
            if(item && item.images && item.images.length > 0) {
              const imgSize = 12;
              const gap = 2;
              let xOff = data.cell.x + 2;
              let yOff = data.cell.y + 2;
              
              item.images.slice(0, 3).forEach((img, idx) => {
                if(xOff + imgSize < data.cell.x + data.cell.width) {
                  try {
                    doc.addImage(img, 'JPEG', xOff, yOff, imgSize, imgSize);
                    doc.setDrawColor(200);
                    doc.rect(xOff, yOff, imgSize, imgSize);
                  } catch(e) {}
                  xOff += imgSize + gap;
                }
              });
            }
          }
        }
      });
      
      yPos = doc.lastAutoTable.finalY + 10;
    }
    yPos += 5;
  }

  doc.addPage();
  
  doc.setFontSize(14); doc.setFont('helvetica', 'bold');
  doc.text("CLIENT ACCEPTANCE", 14, 20);
  
  doc.setFontSize(10); doc.setFont('helvetica', 'normal');
  doc.text("Terms and Conditions:", 14, 30);
  
  const terms = [
    "1. The Client confirms that the selections made in this document are final.",
    "2. Changes requested after signing may incur variation fees.",
    "3. Selections are subject to availability; the Builder may substitute for equal value.",
    "4. Screen representations of colours may vary from actual products."
  ];
  let tY = 38;
  terms.forEach(t => {
    doc.text(t, 14, tY);
    tY += 6;
  });

  doc.setDrawColor(100);
  doc.setLineWidth(0.5);
  doc.rect(14, 80, 182, 50);
  
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text("Signed by (Client Name):", 18, 90);
  
  if(appState.meta.signature) {
    doc.setFont('times', 'italic');
    doc.setFontSize(24);
    doc.setTextColor(0, 100, 0);
    doc.text(appState.meta.signature.name, 40, 110);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(\`Digitally Signed: \${new Date(appState.meta.signature.date).toLocaleString()}\`, 130, 125, { align: 'right' });
    doc.text("IP: Digital Verification", 130, 128, { align: 'right' });
  } else {
    doc.line(20, 115, 120, 115);
    doc.text("Signature", 20, 120);
    doc.line(140, 115, 180, 115);
    doc.text("Date", 140, 120);
  }

  const pageCount = doc.internal.getNumberOfPages();
  for(let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(\`\${appState.meta.companyName} | Job: \${appState.meta.jobNumber}\`, 14, 290);
    doc.text(\`Page \${i} of \${pageCount}\`, 200, 290, { align: 'right' });
  }

  doc.save(\`Contract_Specs_\${appState.meta.jobNumber}.pdf\`);
}
`;

