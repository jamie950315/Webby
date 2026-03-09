import { Candidate } from '../services/openrouter';
import { translations } from '../i18n';

export function getIframeContent(candidate: Candidate, lang: string) {
  const t = translations[lang] || translations['en'];
  return `
<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    ${candidate.css || ''}
    body { font-family: sans-serif; margin: 0; padding: 0; }
  </style>
</head>
<body>
  ${candidate.html || `<div class="p-4 text-gray-500">${t.generating}</div>`}
  <script>
    try {
      ${candidate.js || ''}
    } catch (e) {
      console.error("User JS Error:", e);
    }

    // Intercept link clicks for demo purposes
    document.addEventListener('click', function(e) {
      const link = e.target.closest('a');
      if (link) {
        e.preventDefault();
        const existingToast = document.getElementById('demo-toast');
        if (existingToast) existingToast.remove();
        
        const toast = document.createElement('div');
        toast.id = 'demo-toast';
        toast.textContent = '${t.demoToast}';
        toast.style.cssText = 'position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: #18181b; color: #fff; padding: 10px 20px; border-radius: 8px; z-index: 9999; font-family: sans-serif; font-size: 14px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); opacity: 0; transition: opacity 0.3s ease; pointer-events: none;';
        document.body.appendChild(toast);
        
        // Trigger reflow
        void toast.offsetWidth;
        toast.style.opacity = '1';
        
        setTimeout(() => {
          toast.style.opacity = '0';
          setTimeout(() => toast.remove(), 300);
        }, 3000);
      }
    });

  </script>
</body>
</html>
  `;
}
