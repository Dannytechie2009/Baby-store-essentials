// assets/js/cart.js
import { WHATSAPP_NUMBER } from './config.js';
import { showToast } from './script.js';

function getCart(){ return JSON.parse(sessionStorage.getItem('kme_cart') || '[]'); }
function saveCart(c){ sessionStorage.setItem('kme_cart', JSON.stringify(c)); updateUI(); }
function updateUI(){
  const cart = getCart();
  const container = document.getElementById('cart-items');
  const totalEl = document.getElementById('cart-total');
  if (!container) return;
  if (cart.length===0){ container.innerHTML = '<div class="card">Your cart is empty</div>'; totalEl.textContent = '₦0.00'; return; }
  container.innerHTML = cart.map(item => `
    <div class="card" data-id="${item.id}">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div><strong>${item.name}</strong><div class="muted">₦${(item.price).toLocaleString()}</div></div>
        <div>
          <button class="qty-dec" data-id="${item.id}">-</button>
          <span style="margin:0 8px">${item.qty}</span>
          <button class="qty-inc" data-id="${item.id}">+</button>
        </div>
      </div>
    </div>
  `).join('');
  const total = cart.reduce((s,i)=> s + (i.qty * (i.price||0)), 0);
  totalEl.textContent = '₦' + total.toLocaleString();
  // bind qty
  container.querySelectorAll('.qty-dec').forEach(b=> b.addEventListener('click', e=> { changeQty(b.dataset.id, -1); }));
  container.querySelectorAll('.qty-inc').forEach(b=> b.addEventListener('click', e=> { changeQty(b.dataset.id, +1); }));
  document.getElementById('whatsapp-checkout')?.addEventListener('click', whatsappCheckout);
}

function changeQty(id, delta){
  const cart = getCart();
  const item = cart.find(i=> String(i.id)===String(id));
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    const idx = cart.findIndex(i=> String(i.id)===String(id));
    cart.splice(idx,1);
  }
  saveCart(cart);
  updateUI();
}

function whatsappCheckout(){
  const cart = getCart();
  if (cart.length===0){ showToast('Cart empty', true); return; }
  let lines = [`Hi! I'd like to place an order:`];
  let total = 0;
  cart.forEach((it, idx) => {
    const line = `${it.qty} x ${it.name} — ₦${(it.price).toLocaleString()}`;
    lines.push(`${idx+1}. ${line}`);
    total += it.qty * it.price;
  });
  lines.push(`Total: ₦${total.toLocaleString()}`);
  // optional: ask for name & address prompt
  const pre = encodeURIComponent(lines.join('\n'));
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${pre}`;
  window.open(url, '_blank');
}

document.addEventListener('DOMContentLoaded', updateUI);
