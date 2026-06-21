const critiqueCopy = {
  score: '<span class="score-number">8.2</span><span class="score-unit">/ 10</span><p>Illustrative output—not a benchmark result. A score says <em>how much</em>, not <em>why</em>.</p>',
  describe: '<p><strong>Muted cityscape framed by a dark arch.</strong></p><p>The model names what is visible, but stops before judgment.</p>',
  reason: '<p><strong>The arch creates a natural vignette.</strong></p><p>It directs attention, builds depth, and balances the central landmark.</p>'
};

document.querySelectorAll('[data-critique]').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('[data-critique]').forEach((item) => item.classList.remove('is-active'));
    button.classList.add('is-active');
    document.querySelector('#critique-content').innerHTML = critiqueCopy[button.dataset.critique];
  });
});

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));

const navLinks = [...document.querySelectorAll('nav [data-nav]')];
const navSections = [...document.querySelectorAll('[data-nav-section]')];
let navTicking = false;

function updateActiveNavigation() {
  const marker = Math.min(180, window.innerHeight * 0.28);
  const active = navSections.find((section) => {
    const rect = section.getBoundingClientRect();
    return rect.top <= marker && rect.bottom > marker;
  });
  navLinks.forEach((link) => {
    const isActive = active && link.dataset.nav === active.id;
    link.classList.toggle('is-active', Boolean(isActive));
    if (isActive) link.setAttribute('aria-current', 'true');
    else link.removeAttribute('aria-current');
  });
  navTicking = false;
}

window.addEventListener('scroll', () => {
  if (navTicking) return;
  navTicking = true;
  window.requestAnimationFrame(updateActiveNavigation);
}, { passive: true });
window.addEventListener('resize', updateActiveNavigation);
updateActiveNavigation();

const copyButton = document.querySelector('#copy-title');
copyButton.addEventListener('click', async () => {
  await navigator.clipboard.writeText(copyButton.dataset.copy);
  copyButton.textContent = 'Copied';
  setTimeout(() => { copyButton.textContent = 'Copy title'; }, 1500);
});
