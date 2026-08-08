const themeScript = `(() => {
  const cookie = document.cookie.split('; ').find((part) => part.startsWith('ww-theme='));
  const stored = localStorage.getItem('ww-theme');
  const preference = (cookie ? decodeURIComponent(cookie.split('=')[1]) : stored) || 'SYSTEM';
  localStorage.setItem('ww-theme', preference);
  const dark = preference === 'DARK' || (preference === 'SYSTEM' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
  document.documentElement.dataset.themePreference = preference;
  if (preference === 'SYSTEM') {
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => document.documentElement.classList.toggle('dark', event.matches));
  }
})();`;

export function ThemeBootstrap() {
  return <script dangerouslySetInnerHTML={{ __html: themeScript }} />;
}
