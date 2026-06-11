// Global modal system (iOS-style alert/confirm/prompt)

function formatCurrency(amount) {
  return '₱' + parseFloat(amount || 0).toFixed(2);
}

function iosAlert(message, title = 'Notice') {
  const overlay = document.getElementById('iosModalOverlay');
  const titleEl = document.getElementById('iosModalTitle');
  const msgEl = document.getElementById('iosModalMessage');
  const inputEl = document.getElementById('iosModalInput');
  const buttonsEl = document.getElementById('iosModalButtons');

  titleEl.textContent = title;
  msgEl.textContent = message;
  msgEl.style.display = 'block';
  inputEl.style.display = 'none';
  inputEl.classList.add('hidden');
  buttonsEl.innerHTML = `<button onclick="closeIosModal()" class="flex-1 py-2.5 text-emerald-600 font-semibold text-[17px] active:bg-gray-200/50 transition tracking-tight border-r border-gray-300/50">OK</button>`;

  overlay.classList.remove('hidden');
  void overlay.offsetWidth;
  overlay.classList.remove('opacity-0');
}

function iosConfirm(message, title, callback) {
  const overlay = document.getElementById('iosModalOverlay');
  const titleEl = document.getElementById('iosModalTitle');
  const msgEl = document.getElementById('iosModalMessage');
  const inputEl = document.getElementById('iosModalInput');
  const buttonsEl = document.getElementById('iosModalButtons');

  titleEl.textContent = title;
  msgEl.textContent = message;
  msgEl.style.display = 'block';
  inputEl.style.display = 'none';
  inputEl.classList.add('hidden');
  buttonsEl.innerHTML = `
    <button onclick="closeIosModal()" class="flex-1 py-2.5 border-r border-gray-300/50 text-emerald-600 font-normal text-[17px] active:bg-gray-200/50 transition tracking-tight">Cancel</button>
    <button onclick="closeIosModal(); (${callback.toString()})()" class="flex-1 py-2.5 text-emerald-600 font-semibold text-[17px] active:bg-gray-200/50 transition tracking-tight">Confirm</button>`;

  overlay.classList.remove('hidden');
  void overlay.offsetWidth;
  overlay.classList.remove('opacity-0');
}

function iosPrompt(message, title, callback) {
  const overlay = document.getElementById('iosModalOverlay');
  const titleEl = document.getElementById('iosModalTitle');
  const msgEl = document.getElementById('iosModalMessage');
  const inputEl = document.getElementById('iosModalInput');
  const buttonsEl = document.getElementById('iosModalButtons');

  titleEl.textContent = title;
  msgEl.textContent = message;
  msgEl.style.display = 'block';
  inputEl.style.display = 'block';
  inputEl.classList.remove('hidden');
  inputEl.value = '';
  buttonsEl.innerHTML = `
    <button onclick="closeIosModal()" class="flex-1 py-2.5 border-r border-gray-300/50 text-emerald-600 font-normal text-[17px] active:bg-gray-200/50 transition tracking-tight">Cancel</button>
    <button onclick="const val=document.getElementById('iosModalInput').value;closeIosModal();(${callback.toString()})(val)" class="flex-1 py-2.5 text-emerald-600 font-semibold text-[17px] active:bg-gray-200/50 transition tracking-tight">OK</button>`;

  overlay.classList.remove('hidden');
  void overlay.offsetWidth;
  overlay.classList.remove('opacity-0');
  setTimeout(() => inputEl.focus(), 100);
}

function closeIosModal() {
  const overlay = document.getElementById('iosModalOverlay');
  const card = document.querySelector('#iosModalOverlay > div');
  overlay.classList.add('opacity-0');
  if (card) card.classList.add('scale-95');
  setTimeout(() => {
    overlay.classList.add('hidden');
    if (card) card.classList.remove('scale-95');
  }, 200);
}

// Expose closeIosModal globally (called from inline onclick in modal buttons)
window.closeIosModal = closeIosModal;

export { formatCurrency, iosAlert, iosConfirm, iosPrompt, closeIosModal };
