const preview = document.querySelector('#preview');
const controls = document.querySelector('#controls');
const status = document.querySelector('#status');
const selectionName = document.querySelector('#selection-name');
const selectionSelector = document.querySelector('#selection-selector');
const editButton = document.querySelector('#toggle-edit');

const allowedProperties = ['font-size','font-family','font-weight','color','line-height','letter-spacing','text-align','margin-top','margin-bottom'];
const inputs = {
  'font-size': document.querySelector('#font-size'), 'font-family': document.querySelector('#font-family'),
  'font-weight': document.querySelector('#font-weight'), color: document.querySelector('#color'),
  'line-height': document.querySelector('#line-height'), 'letter-spacing': document.querySelector('#letter-spacing'),
  'margin-top': document.querySelector('#margin-top'), 'margin-bottom': document.querySelector('#margin-bottom')
};
let state = { version: 1, changes: {} };
let baseDocument = null;
let selected = null;
let selector = '';
let dirty = false;

const editableSelector = 'h1,h2,h3,h4,p,span,b,strong,small,figcaption,a,button,blockquote,li,em';
const markDirty = () => { dirty = true; status.textContent = '有未保存修改'; status.style.color = '#ed6c32'; };
const rgbToHex = (value) => {
  const parts = value.match(/[\d.]+/g); if (!parts) return '#171815';
  return `#${parts.slice(0,3).map((part) => Math.round(Number(part)).toString(16).padStart(2,'0')).join('')}`;
};
const numeric = (value, fallback = 0) => Number.parseFloat(value) || fallback;

function uniqueSelector(element) {
  const parts = [];
  let node = element;
  while (node && node.nodeType === 1 && node.tagName.toLowerCase() !== 'html') {
    if (node.id) { parts.unshift(`#${CSS.escape(node.id)}`); break; }
    let part = node.tagName.toLowerCase();
    const siblings = node.parentElement ? [...node.parentElement.children].filter((item) => item.tagName === node.tagName) : [];
    if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(node) + 1})`;
    parts.unshift(part); node = node.parentElement;
  }
  return parts.join(' > ');
}

function currentChange() {
  state.changes[selector] ||= { styles: {} };
  return state.changes[selector];
}

function syncControls() {
  const style = preview.contentWindow.getComputedStyle(selected);
  inputs['font-size'].value = Math.round(numeric(style.fontSize, 16));
  inputs['font-family'].value = [...inputs['font-family'].options].some((option) => option.value === style.fontFamily) ? style.fontFamily : '';
  inputs['font-weight'].value = String(Math.min(700, Math.max(300, Math.round(numeric(style.fontWeight, 400) / 100) * 100)));
  inputs.color.value = rgbToHex(style.color);
  inputs['line-height'].value = style.lineHeight === 'normal' ? 1.2 : (numeric(style.lineHeight) / numeric(style.fontSize, 16)).toFixed(2);
  inputs['letter-spacing'].value = style.letterSpacing === 'normal' ? 0 : numeric(style.letterSpacing);
  inputs['margin-top'].value = Math.round(numeric(style.marginTop));
  inputs['margin-bottom'].value = Math.round(numeric(style.marginBottom));
  document.querySelectorAll('#text-align button').forEach((button) => button.classList.toggle('active', button.dataset.value === style.textAlign));
}

function selectElement(element) {
  if (selected) { selected.classList.remove('visual-editor-selected'); selected.contentEditable = 'false'; }
  selected = element; selector = uniqueSelector(element); selected.classList.add('visual-editor-selected');
  selectionName.textContent = `${element.tagName.toLowerCase()} · ${(element.textContent || '').trim().slice(0, 42) || '无文字'}`;
  selectionSelector.textContent = selector; controls.disabled = false; editButton.disabled = false; editButton.classList.remove('active');
  syncControls();
}

function setStyle(property, value) {
  if (!selected) return;
  selected.style.setProperty(property, value); currentChange().styles[property] = value; markDirty();
}

function installEditorHooks() {
  const doc = preview.contentDocument;
  const style = doc.createElement('style');
  style.textContent = '.visual-editor-selected{outline:3px solid #ed6c32!important;outline-offset:3px!important;cursor:text!important}.visual-editor-selected[contenteditable=true]{box-shadow:0 0 0 7px rgba(237,108,50,.18)!important}';
  doc.head.appendChild(style);
  doc.addEventListener('click', (event) => {
    const target = event.target.closest(editableSelector);
    if (!target) return;
    event.preventDefault(); event.stopPropagation(); selectElement(target);
  }, true);
  doc.addEventListener('dblclick', (event) => {
    const target = event.target.closest(editableSelector); if (!target) return;
    selectElement(target); selected.contentEditable = 'true'; selected.focus(); editButton.classList.add('active');
  }, true);
  doc.addEventListener('input', () => {
    if (!selected || selected.contentEditable !== 'true') return;
    currentChange().html = selected.innerHTML; markDirty();
  }, true);
}

preview.addEventListener('load', async () => {
  selected = null; selector = ''; controls.disabled = true; editButton.disabled = true;
  await new Promise((resolve) => setTimeout(resolve, 250)); installEditorHooks();
});

Object.entries(inputs).forEach(([property, input]) => input.addEventListener('input', () => {
  let value = input.value;
  if (['font-size','letter-spacing','margin-top','margin-bottom'].includes(property)) value += 'px';
  if (property === 'line-height') value = String(input.value);
  setStyle(property, value);
}));
document.querySelectorAll('#text-align button').forEach((button) => button.addEventListener('click', () => {
  document.querySelectorAll('#text-align button').forEach((item) => item.classList.remove('active')); button.classList.add('active'); setStyle('text-align', button.dataset.value);
}));

editButton.addEventListener('click', () => {
  if (!selected) return; const active = selected.contentEditable !== 'true';
  selected.contentEditable = active ? 'true' : 'false'; editButton.classList.toggle('active', active); editButton.textContent = active ? '完成文字编辑' : '编辑文字';
  if (active) selected.focus(); else { currentChange().html = selected.innerHTML; markDirty(); }
});

document.querySelectorAll('[data-width]').forEach((button) => button.addEventListener('click', () => {
  document.querySelectorAll('[data-width]').forEach((item) => item.classList.remove('active')); button.classList.add('active');
  preview.style.width = button.dataset.width; document.querySelector('#preview-size').textContent = `${button.textContent} · ${button.dataset.width}`;
}));

document.querySelector('#open-page').addEventListener('click', () => window.open('./', '_blank'));
document.querySelector('#save').addEventListener('click', async () => {
  if (selected?.contentEditable === 'true') currentChange().html = selected.innerHTML;
  status.textContent = '正在保存…';
  const response = await fetch('/api/editor-state', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(state) });
  if (!response.ok) { status.textContent = '保存失败'; status.style.color = '#ff6b6b'; return; }
  dirty = false; status.textContent = '已保存到主页'; status.style.color = '#8fd6a2';
});

document.querySelector('#reset-current').addEventListener('click', () => {
  if (!selected) return;
  const original = baseDocument?.querySelector(selector);
  if (original) selected.innerHTML = original.innerHTML;
  allowedProperties.forEach((property) => selected.style.removeProperty(property));
  delete state.changes[selector]; syncControls(); markDirty();
});
document.querySelector('#reset-all').addEventListener('click', () => {
  Object.keys(state.changes).forEach((key) => {
    const element = preview.contentDocument.querySelector(key); const original = baseDocument?.querySelector(key); if (!element) return;
    if (original) element.innerHTML = original.innerHTML; allowedProperties.forEach((property) => element.style.removeProperty(property));
  });
  state = { version: 1, changes: {} }; selected = null; controls.disabled = true; editButton.disabled = true; selectionName.textContent = '请在右侧点击文字'; selectionSelector.textContent = '—'; markDirty();
});

window.addEventListener('keydown', (event) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); document.querySelector('#save').click(); } });
window.addEventListener('beforeunload', (event) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });

(async () => {
  try {
    state = await fetch(`/static/editor-state.json?v=${Date.now()}`, { cache: 'no-store' }).then((response) => response.json());
    const html = await fetch(`/index.html?v=${Date.now()}`, { cache: 'no-store' }).then((response) => response.text());
    baseDocument = new DOMParser().parseFromString(html, 'text/html');
  } catch { status.textContent = '无法读取编辑状态'; }
})();
