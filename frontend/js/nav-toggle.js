document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('navToggleBtn');
  const navLinks = document.getElementById('navLinksMenu');

  if (toggleBtn && navLinks) {
    toggleBtn.addEventListener('click', () => {
      navLinks.classList.toggle('nav-links-open');
    });

    navLinks.querySelectorAll('a, button').forEach((el) => {
      el.addEventListener('click', () => {
        navLinks.classList.remove('nav-links-open');
      });
    });
  }
});
