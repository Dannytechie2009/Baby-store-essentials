// assets/js/shop.js
import { PRODUCTS_API } from './config.js';
import { showToast } from './script.js';

const PRODUCTS_KEY = 'kme_products_fallback'; // fallback if no remote

async function fetchProducts(){
  if (PRODUCTS_API){
    try {
      const res = await fetch(PRODUCTS_API);
      if (!res.ok) throw new Error('Products API error');
      const data = await res.json();
      return data;
    } catch (err) {
      showToast('Could not reach products API, using fallback', true);
    }
  }
  // fallback to localStorage
  const raw = localStorage.getItem(PRODUCTS_KEY);
  return raw ? JSON.parse(raw) : [];
}

function renderProducts(list){
  const grid = document.getElementById('products-grid') || document.getElementById('featured-grid');
  if (!grid) return;
  if (!list || list.length===0) {
    grid.innerHTML = '<div class="card">No products yet.</div>';
    return;
  }
  grid.innerHTML = list.map(p => `
    <article class="product-card card" data-id="${p.id}">
      <img src="${p.imageUrl||'assets/images/placeholder.png'}" alt="${escapeHtml(p.name)}">
      <h3>${escapeHtml(p.name)}</h3>
      <p class="muted">${escapeHtml(p.description||'')}</p>
      <div><strong>₦${(p.price || p.priceCents? (p.price || p.priceCents/100) : 0).toLocaleString()}</strong></div>
      <div style="margin-top:8px">
        <button class="btn btn-primary add-to-cart" data-id="${p.id}"><i class='bx bx-cart'></i> Add to cart</button>
      </div>
    </article>
  `).join('');
  // bind add-to-cart
  document.querySelectorAll('.add-to-cart').forEach(btn=>{
    btn.addEventListener('click', e=>{
      const id = btn.dataset.id;
      addToCart(id);
      showToast('Added to cart');
    });
  });
}

function escapeHtml(s){ if(!s) return ''; return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

// cart: simple session cart stored client-side (per-user)
function getCart(){ return JSON.parse(sessionStorage.getItem('kme_cart') || '[]'); }
function saveCart(c){ sessionStorage.setItem('kme_cart', JSON.stringify(c)); updateCartCount(); }
function addToCart(id){
  fetchProducts().then(list=>{
    const prod = list.find(p=>String(p.id) === String(id));
    if (!prod) { showToast('Product not found', true); return; }
    const cart = getCart();
    const existing = cart.find(i=>i.id===prod.id);
    if (existing) existing.qty += 1;
    else cart.push({ id: prod.id, name: prod.name, price: prod.price || prod.priceCents/100, qty: 1 });
    saveCart(cart);
  });
}

function updateCartCount(){
  const cart = getCart();
  const count = cart.reduce((s,i)=>s+i.qty,0);
  document.querySelectorAll('#cart-count').forEach(el=>el.textContent = count);
}

// wire search / sort
document.addEventListener('DOMContentLoaded', async ()=>{
  const products = await fetchProducts();
  renderProducts(products.slice(0,9));
  updateCartCount();

  const search = document.getElementById('search');
  const sort = document.getElementById('sort');
  function refresh(){
    let items = products.slice();
    const q = (search?.value || '').toLowerCase();
    if (q) items = items.filter(i => (i.name + ' ' + (i.description||'')).toLowerCase().includes(q));
    const s = sort?.value || 'new';
    if (s==='low') items.sort((a,b)=>(a.price||a.priceCents/100)-(b.price||b.priceCents/100));
    if (s==='high') items.sort((a,b)=>(b.price||b.priceCents/100)-(a.price||a.priceCents/100));
    if (s==='new') items.sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt));
    renderProducts(items);
  }
  search?.addEventListener('input', refresh);
  sort?.addEventListener('change', refresh);
});
