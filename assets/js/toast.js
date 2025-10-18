// toast.js - wrapper for showToast that creates toasts in #toast-container
function showToast(message, isError=false, timeout=2200) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const el = document.createElement('div');
    el.className = `max-w-sm px-4 py-2 rounded shadow text-sm ${isError ? 'bg-red-600 text-white' : 'bg-gray-800 text-white'}`;
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => {
      el.classList.add('hide');
      setTimeout(() => el.remove(), 350);
    }, timeout);
  }
  