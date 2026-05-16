/* ============================================================
   APEX NETWORK — SHARED FUNNEL UTILITIES
   ============================================================ */

// Scroll reveal observer
function initScrollReveal() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

// Store UTM params in sessionStorage
function captureUTMParams() {
  const params = new URLSearchParams(window.location.search);
  const utm = {};
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(key => {
    if (params.get(key)) utm[key] = params.get(key);
  });
  if (Object.keys(utm).length > 0) {
    sessionStorage.setItem('ss_utm', JSON.stringify(utm));
  }
}

// Get stored UTM params
function getUTMParams() {
  try {
    return JSON.parse(sessionStorage.getItem('ss_utm') || '{}');
  } catch {
    return {};
  }
}

// Toast notification
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.style.borderColor = type === 'success' ? 'rgba(74,222,128,0.3)' : 'rgba(239,68,68,0.3)';
  toast.innerHTML = `<div style="display:flex;align-items:center;gap:10px;">
    <span>${type === 'success' ? '✓' : '⚠'}</span>
    <span style="font-size:0.875rem;color:var(--muted);">${message}</span>
  </div>`;

  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 100);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Format currency
function formatCurrency(amount) {
  return '$' + amount.toLocaleString('en-AU');
}

// Client-side lead scoring
function scoreLeadClientSide(data) {
  const { investmentReady, incomeGoal, tier, situation } = data;

  if (investmentReady === 'yes-ready') return 'HOT';
  if (tier === 'launcher' || tier === 'nuke') return 'HOT';
  if (incomeGoal === '10000-20000' || incomeGoal === '20000+') return 'HOT';
  if (investmentReady === 'close-2-4-weeks') return 'WARM';
  if (situation === 'sales' || situation === 'business') return 'WARM';
  if (investmentReady === 'no-capital') return 'COLD';

  return 'WARM';
}

function getRedirectUrl(score) {
  if (score === 'HOT') return '/page4-offer.html';
  if (score === 'WARM') return '/page2-manifesto.html';
  return '/index.html';
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', function() {
  initScrollReveal();
  captureUTMParams();
});
