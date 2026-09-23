function togglePasswordVisibility(inputId, buttonEl) {
  const input = document.getElementById(inputId);
  const isHidden = input.type === 'password';

  input.type = isHidden ? 'text' : 'password';

  buttonEl.innerHTML = isHidden
    ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 3l18 18" stroke="#8C7B8E" stroke-width="2"/><path d="M10.6 5.1A11 11 0 0 1 12 5c7 0 11 7 11 7a13.6 13.6 0 0 1-3.2 3.9M6.5 6.6C3.4 8.5 1 12 1 12s4 7 11 7a10 10 0 0 0 4.2-.9M9.9 9.9a3 3 0 0 0 4.2 4.2" stroke="#8C7B8E" stroke-width="2"/></svg>`
    : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" stroke="#8C7B8E" stroke-width="2"/><circle cx="12" cy="12" r="3" stroke="#8C7B8E" stroke-width="2"/></svg>`;
}
