/* products.js - product storage & rendering */
const PRODUCTS_KEY = 'kme_products';

/* Utilities */
function getProductsSafe() {
  return safeParse(PRODUCTS_KEY, []);
}
function saveProducts(list) {
  safeSet(PRODUCTS_KEY, list);
}

/* HTML escape */
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* Product card mark-up */
function productCardHTML(p) {
  return `
  <article class="border rounded-lg p-4 bg-white flex flex-col" data-id="${p.id}">
    <img src="${p.imageUrl || 'assets/placeholder.png'}" alt="${escapeHtml(p.name)}" class="h-40 w-full object-cover rounded mb-3" onerror="this.src='assets/placeholder.png'"/>
    <h3 class="font-semibold text-lg">${escapeHtml(p.name)}</h3>
    <p class="text-sm text-gray-600 mt-1 flex-grow">${escapeHtml(p.description || '')}</p>
    <div class="mt-3 font-bold">$${(p.priceCents/100).toFixed(2)}</div>
    <button data-id="${p.id}" class="mt-4 add-to-cart-btn px-4 py-2 rounded bg-mint text-white">Add to cart</button>
  </article>
  `;
}

/* Render featured on index */
function renderFeatured() {
  const featuredGrid = document.getElementById('featured-grid');
  if (!featuredGrid) return;
  const all = getProductsSafe();
  const featured = all.slice(0, 6);
  featuredGrid.innerHTML = featured.map(productCardHTML).join('');
}

/* Render products page with search & sort */
function renderProductsPage() {
  const grid = document.getElementById('products-grid');
  if (!grid) return;
  const searchInput = document.getElementById('search');
  const sortSelect = document.getElementById('sort');

  function refresh() {
    let items = getProductsSafe().slice();
    // search
    const q = (searchInput?.value || '').trim().toLowerCase();
    if (q) items = items.filter(i => (i.name + ' ' + (i.description||'')).toLowerCase().includes(q));
    // sort
    const s = (sortSelect?.value || 'new');
    if (s === 'low') items.sort((a,b) => a.priceCents - b.priceCents);
    if (s === 'high') items.sort((a,b) => b.priceCents - a.priceCents);
    if (s === 'new') items.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    grid.innerHTML = items.map(productCardHTML).join('') || `<div class="p-6 bg-white rounded">No products found.</div>`;
  }

  searchInput?.addEventListener('input', refresh);
  sortSelect?.addEventListener('change', refresh);
  // re-render on storage update
  document.addEventListener('kme_storage_updated', refresh);
  refresh();
}

/* Initialize if empty — only when key completely missing */
function seedIfMissing() {
  if (localStorage.getItem(PRODUCTS_KEY) === null) {
    const sample = [
      { id: 1, name: "Soft Cotton Onesie", description: "Gentle, breathable onesie for newborns.", priceCents: 1299, imageUrl: "assets/placeholder.png", createdAt: new Date().toISOString() },
      { id: 2, name: "Nursing Pillow", description: "Comfortable support for feeding.", priceCents: 3999, imageUrl: "assets/placeholder.png", createdAt: new Date().toISOString() },
      { id: 3, name: "Newborn Hat Set", description: "Soft hat set to keep baby cozy.", priceCents: 1599, imageUrl: "assets/placeholder.png", createdAt: new Date().toISOString() }
    ];
    saveProducts(sample);
  }
}

/* Ensure delegation for add-to-cart buttons */
function initAddToCartDelegation() {
  document.body.addEventListener('click', (e) => {
    const btn = e.target.closest('.add-to-cart-btn');
    if (btn) {
      const id = Number(btn.getAttribute('data-id'));
      addToCartById(id, 1);
      showToast('Added to cart');
    }
  });
}

/* Admin list renderer used on admin page */
function renderAdminProductsList() {
  const container = document.getElementById('admin-products');
  if (!container) return;
  const products = getProductsSafe().slice().sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  if (products.length === 0) {
    container.innerHTML = '<div class="p-4 bg-white rounded">No products yet.</div>';
    return;
  }
  container.innerHTML = products.map(p => `
    <div class="bg-white p-4 rounded flex items-center gap-4">
      <img src="${p.imageUrl || 'assets/placeholder.png'}" class="h-20 w-20 object-cover rounded" onerror="this.src='assets/placeholder.png'"/>
      <div class="flex-1">
        <div class="font-semibold">${escapeHtml(p.name)}</div>
        <div class="text-sm text-gray-600">$${(p.priceCents/100).toFixed(2)}</div>
      </div>
      <div class="flex gap-2">
        <button class="edit-prod px-3 py-1 border rounded" data-id="${p.id}">Edit</button>
        <button class="delete-prod px-3 py-1 border rounded text-red-500" data-id="${p.id}">Delete</button>
      </div>
    </div>
  `).join('');

  // attach listeners
  container.querySelectorAll('.edit-prod').forEach(btn => {
    btn.onclick = () => {
      const id = Number(btn.getAttribute('data-id'));
      const p = getProductsSafe().find(x => x.id === id);
      if (!p) return;
      document.getElementById('product-id').value = p.id;
      document.getElementById('product-name').value = p.name;
      document.getElementById('product-desc').value = p.description || '';
      document.getElementById('product-price').value = (p.priceCents/100).toFixed(2);
      document.getElementById('product-image-url').value = p.imageUrl || '';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
  });
  container.querySelectorAll('.delete-prod').forEach(btn => {
    btn.onclick = () => {
      if (!confirm('Delete product?')) return;
      const id = Number(btn.getAttribute('data-id'));
      let products = getProductsSafe();
      products = products.filter(x => x.id !== id);
      saveProducts(products);
      renderAdminProductsList();
      // ensure cart doesn't keep deleted product
      sanitizeCartAgainstProducts();
      showToast('Deleted product');
      document.dispatchEvent(new Event('kme_storage_updated'));
    };
  });
}

/* Remove cart items whose product has been deleted */
function sanitizeCartAgainstProducts() {
  const products = getProductsSafe();
  let cart = safeParse('kme_cart', []);
  const productIds = new Set(products.map(p => p.id));
  const cleaned = cart.filter(item => productIds.has(item.id));
  if (cleaned.length !== cart.length) {
    safeSet('kme_cart', cleaned);
    updateCartCountUI();
    document.dispatchEvent(new Event('kme_storage_updated'));
  }
}

/* Initialize on DOM ready */
document.addEventListener('DOMContentLoaded', () => {
  seedIfMissing();
  renderFeatured();
  renderProductsPage();
  renderAdminProductsList();
  initAddToCartDelegation();
  // re-render when storage updated
  document.addEventListener('kme_storage_updated', () => {
    renderFeatured();
    renderProductsPage();
    renderAdminProductsList();
  });
});
