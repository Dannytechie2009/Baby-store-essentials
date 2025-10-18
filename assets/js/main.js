/* admin.js - product manager with safe image upload and resizing */
const PRODUCTS_KEY = 'kme_products';

function generateId() {
  const arr = getProductsSafe();
  return arr.length ? Math.max(...arr.map(p => p.id)) + 1 : 1;
}

/* Convert file to base64 after resizing to maxWidth 800px and quality 0.8 */
function fileToBase64Resized(file, maxWidth=800, quality=0.82) {
  return new Promise((res, rej) => {
    if (!file) return res(null);
    if (file.size > 1_600_000) { // ~1.6MB raw - warn but still accept after resize
      // continue but notify
    }
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, maxWidth / img.width);
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        // try to get jpeg base64
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        res(dataUrl);
      };
      img.onerror = (err) => rej(err);
      img.src = e.target.result;
    };
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
}

async function handleAdminFormSubmit(e) {
  e.preventDefault();
  const idEl = document.getElementById('product-id');
  const name = document.getElementById('product-name').value.trim();
  const desc = document.getElementById('product-desc').value.trim();
  const price = parseFloat(document.getElementById('product-price').value || '0');
  const url = document.getElementById('product-image-url').value.trim();
  const fileInput = document.getElementById('product-image-file');

  if (!name) { showToast('Name is required', true); return; }
  if (isNaN(price) || price < 0) { showToast('Price is invalid', true); return; }

  let imageUrl = url || '';

  if (!imageUrl && fileInput.files && fileInput.files.length > 0) {
    try {
      const file = fileInput.files[0];
      if (file.size > 2_500_000) { // >2.5MB
        if (!confirm('File is large and may exceed storage limits. Continue?')) return;
      }
      imageUrl = await fileToBase64Resized(file);
    } catch (err) {
      console.error(err);
      showToast('Image processing failed', true);
      return;
    }
  }

  const products = getProductsSafe();
  if (idEl.value) {
    const id = Number(idEl.value);
    const idx = products.findIndex(p => p.id === id);
    if (idx !== -1) {
      products[idx] = { ...products[idx], name, description: desc, priceCents: Math.round(price*100), imageUrl: imageUrl || products[idx].imageUrl, createdAt: products[idx].createdAt };
    } else {
      showToast('Product not found for update', true);
      return;
    }
  } else {
    const newProd = {
      id: generateId(),
      name,
      description: desc,
      priceCents: Math.round(price*100),
      imageUrl: imageUrl || '',
      createdAt: new Date().toISOString()
    };
    products.push(newProd);
  }
  saveProducts(products);
  resetAdminForm();
  renderAdminProductsList();
  sanitizeCartAgainstProducts();
  showToast('Saved product');
  document.dispatchEvent(new Event('kme_storage_updated'));
}

function resetAdminForm() {
  const form = document.getElementById('product-form');
  if (form) form.reset();
  const idEl = document.getElementById('product-id');
  if (idEl) idEl.value = '';
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('product-form');
  if (form) form.addEventListener('submit', handleAdminFormSubmit);
  const clear = document.getElementById('clear-form');
  if (clear) clear.addEventListener('click', resetAdminForm);
});
