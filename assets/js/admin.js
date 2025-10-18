// assets/js/admin.js
import { CLOUDINARY_CLOUD, CLOUDINARY_UPLOAD_PRESET, PRODUCTS_API } from './config.js';
import { showToast } from './script.js';

const PRODUCTS_KEY_FALLBACK = 'kme_products_remote_fallback';

function getFallback(){ return JSON.parse(localStorage.getItem(PRODUCTS_KEY_FALLBACK) || '[]'); }
function saveFallback(list){ localStorage.setItem(PRODUCTS_KEY_FALLBACK, JSON.stringify(list)); }

function renderList(list){
  const container = document.getElementById('products-list');
  container.innerHTML = list.map(p=> `
    <div class="product-card card">
      <img src="${p.imageUrl||'assets/images/placeholder.png'}" alt="${p.name}" />
      <div><strong>${p.name}</strong></div>
      <div class="muted">₦${(p.price).toLocaleString()}</div>
      <div>${p.description||''}</div>
      <div style="margin-top:8px"><button class="btn btn-ghost edit" data-id="${p.id}">Edit</button> <button class="btn btn-ghost delete" data-id="${p.id}">Delete</button></div>
    </div>
  `).join('');
  container.querySelectorAll('.delete').forEach(b => b.addEventListener('click', async (e)=> {
    const id = b.dataset.id;
    if (PRODUCTS_API){
      try {
        const res = await fetch(`${PRODUCTS_API}/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('delete failed');
        showToast('Deleted product');
        loadProducts();
      } catch (err) {
        showToast('Could not delete remotely', true);
      }
    } else {
      // fallback local
      let list = getFallback().filter(x=> String(x.id)!==String(id));
      saveFallback(list);
      renderList(list);
      showToast('Deleted (local fallback)');
    }
  }));
}

async function loadProducts(){
  if (PRODUCTS_API){
    try {
      const res = await fetch(PRODUCTS_API);
      if (!res.ok) throw new Error('api err');
      const data = await res.json();
      renderList(data);
      return;
    } catch (err){
      showToast('Products API unreachable, using fallback', true);
    }
  }
  renderList(getFallback());
}

async function uploadFileToCloudinary(file){
  if (!CLOUDINARY_CLOUD || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error('Cloudinary not configured');
  }
  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`;
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  const res = await fetch(url, { method: 'POST', body: fd });
  if (!res.ok) throw new Error('Cloudinary upload failed');
  const data = await res.json();
  return data.secure_url;
}

document.addEventListener('DOMContentLoaded', ()=> {
  const form = document.getElementById('product-form');
  const fileInput = document.getElementById('product-image-file');
  const urlInput = document.getElementById('product-image-url');
  const preview = document.getElementById('img-preview');

  fileInput.addEventListener('change', ()=> {
    const f = fileInput.files[0];
    if (f) preview.src = URL.createObjectURL(f);
  });
  urlInput.addEventListener('input', ()=> {
    if (urlInput.value) preview.src = urlInput.value;
  });

  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const name = document.getElementById('product-name').value.trim();
    const desc = document.getElementById('product-desc').value.trim();
    const price = Number(document.getElementById('product-price').value);
    if (!name || isNaN(price)){ showToast('Name and valid price required', true); return; }

    // handle image: prefer file -> remote url
    let imageUrl = document.getElementById('product-image-url').value.trim();
    if (!imageUrl && fileInput.files[0]){
      try {
        showToast('Uploading image...');
        imageUrl = await uploadFileToCloudinary(fileInput.files[0]);
        showToast('Image uploaded');
      } catch (err){
        showToast('Upload failed; check Cloudinary settings', true);
        if (!PRODUCTS_API){
          // fallback: store local blob via FileReader base64 (only if no remote)
          const reader = new FileReader();
          reader.onload = ()=> {
            imageUrl = reader.result;
            submitProduct();
          };
          reader.readAsDataURL(fileInput.files[0]);
          return;
        } else return;
      }
    }
    await submitProduct({ name, description: desc, price, imageUrl });
    form.reset();
    preview.src = 'assets/images/placeholder.png';
    loadProducts();
  });

  async function submitProduct(prod){
    if (PRODUCTS_API){
      try {
        const res = await fetch(PRODUCTS_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(prod)
        });
        if (!res.ok) throw new Error('API create failed');
        showToast('Product saved remotely');
        loadProducts();
        return;
      } catch (err){
        showToast('Could not save product remotely', true);
      }
    }
    // fallback: local
    const list = getFallback();
    prod.id = list.length ? Math.max(...list.map(p=>p.id)) + 1 : 1;
    prod.createdAt = new Date().toISOString();
    list.unshift(prod);
    saveFallback(list);
    showToast('Saved product (local fallback)');
  }

  // initial load
  loadProducts();
});
