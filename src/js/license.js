// License / Premium management
import { iosAlert, iosPrompt } from './utils.js';

let isPremium = false;

function getDeviceID() {
  let id = localStorage.getItem('stashRx_deviceID');
  if (!id) {
    id = Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0').toUpperCase();
    localStorage.setItem('stashRx_deviceID', id);
  }
  return id;
}

async function validateLicenseKey(key) {
  // V1 format: deviceId-YYYYMMDD-16HexChars
  const parts = (key || '').split('-');
  if (parts.length !== 3) return false;
  const [deviceId, dateStr, hexPart] = parts;
  if (deviceId !== getDeviceID()) return false;
  if (!/^\d{8}$/.test(dateStr)) return false;
  if (!/^[0-9a-fA-F]{16}$/.test(hexPart)) return false;
  const expDate = new Date(
    parseInt(dateStr.substring(0, 4)),
    parseInt(dateStr.substring(4, 6)),
    parseInt(dateStr.substring(6, 8))
  );
  if (expDate < new Date()) return false; // expired
  return true;
}

async function checkPremiumStatus() {
  const license = localStorage.getItem('stashRx_license');
  if (license && await validateLicenseKey(license)) {
    isPremium = true;
    console.log('Premium active.');
  } else {
    isPremium = false;
    localStorage.removeItem('stashRx_license');
    console.log('Standard mode.');
  }
  updatePremiumUI();
  return isPremium;
}

function updatePremiumUI() {
  const badge = document.getElementById('manualProBadge');
  if (!badge) return;
  if (isPremium) {
    badge.innerText = 'PRO ACTIVATED';
    badge.className = 'mt-3 bg-gray-900 text-amber-400 text-[10px] uppercase tracking-wider font-bold px-3 py-1.5 rounded-full shadow-sm pointer-events-none';
    badge.onclick = null;
  } else {
    badge.innerText = 'Unlock Premium';
    badge.className = 'mt-3 bg-emerald-100 text-emerald-700 text-[10px] uppercase tracking-wider font-bold px-3 py-1.5 rounded-full shadow-sm active:scale-95 transition';
    badge.onclick = showPremiumModal;
  }
}

async function showPremiumModal() {
  const deviceId = getDeviceID();
  iosPrompt(
    `Device ID: ${deviceId}\nEnter your Premium license key to unlock:`,
    'Unlock Premium',
    async (key) => {
      if (!key) return;
      const valid = await validateLicenseKey(key);
      if (valid) {
        localStorage.setItem('stashRx_license', key);
        isPremium = true;
        updatePremiumUI();
        iosAlert('Premium Activated! All features unlocked.', 'Success');
      } else {
        iosAlert('Invalid or expired license key. Please check and try again.', 'Activation Failed');
      }
    }
  );
}

export { isPremium, getDeviceID, validateLicenseKey, checkPremiumStatus, updatePremiumUI, showPremiumModal };
