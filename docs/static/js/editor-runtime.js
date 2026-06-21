(async () => {
  try {
    const response = await fetch(`static/editor-state.json?v=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) return;
    const state = await response.json();
    Object.entries(state.changes || {}).forEach(([selector, change]) => {
      const element = document.querySelector(selector);
      if (!element) return;
      if (typeof change.html === 'string') element.innerHTML = change.html;
      Object.entries(change.styles || {}).forEach(([property, value]) => {
        element.style.setProperty(property, value);
      });
    });
    window.__visualEditorStateApplied = true;
  } catch (error) {
    console.warn('Visual editor state could not be applied.', error);
  }
})();
