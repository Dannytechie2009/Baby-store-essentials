// assets/js/script.js
import { PRODUCTS_API } from './config.js';

const toastContainer = () => document.getElementById('toast-container');

export function showToast(msg, isError=false, t=2500){
  const container = toastContainer();
  if (!container) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.style.background = isError ? '#e55353' : '#111';
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(()=>{ el.style.opacity=0; setTimeout(()=>el.remove(),300); }, t);
}

// Smooth page fade in/out
document.addEventListener('DOMContentLoaded', () => {
  document.body.style.opacity = 0;
  document.body.style.transition = 'opacity 0.45s ease';
  requestAnimationFrame(()=> document.body.style.opacity = 1);

  // intercept links for smooth leave
  document.querySelectorAll('a[href]').forEach(a=>{
    const href = a.getAttribute('href');
    if (!href || href.startsWith('#') || a.target === '_blank') return;
    a.addEventListener('click', (e)=>{
      e.preventDefault();
      document.body.style.opacity = 0;
      setTimeout(()=> window.location.href = href, 300);
    });
  });

  // set active nav link
  const path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.floating-nav .nav-link').forEach(a=>{
    if (a.getAttribute('href') === path || (path === '' && a.getAttribute('href').includes('index'))) a.classList.add('active');
  });
});
