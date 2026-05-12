// 极简模态对话框

export function modal({ title, body, confirmText = '确定', cancelText = '取消', danger = false, onConfirm }) {
  return new Promise((resolve) => {
    const host = document.getElementById('modal-host') || document.body;
    const wrap = document.createElement('div');
    wrap.className = 'iecsp-modal';
    wrap.innerHTML = `
      <div class="iecsp-modal__panel" role="dialog" aria-modal="true">
        <div class="iecsp-modal__head">
          <strong>${title || ''}</strong>
          <button class="iecsp-btn is-ghost sm" data-act="close" aria-label="关闭">✕</button>
        </div>
        <div class="iecsp-modal__body"></div>
        <div class="iecsp-modal__foot">
          <button class="iecsp-btn" data-act="cancel">${cancelText}</button>
          <button class="iecsp-btn ${danger ? 'is-danger' : 'is-primary'}" data-act="confirm">${confirmText}</button>
        </div>
      </div>`;
    const bodyEl = wrap.querySelector('.iecsp-modal__body');
    if (typeof body === 'string') bodyEl.innerHTML = body;
    else if (body instanceof Node) bodyEl.appendChild(body);
    host.appendChild(wrap);

    const close = (ret) => { wrap.remove(); resolve(ret); };
    wrap.addEventListener('click', async (e) => {
      const t = e.target.closest('[data-act]');
      if (!t) { if (e.target === wrap) close(false); return; }
      const act = t.getAttribute('data-act');
      if (act === 'close' || act === 'cancel') return close(false);
      if (act === 'confirm') {
        if (onConfirm) {
          try {
            const r = await onConfirm(wrap);
            if (r === false) return;
          } catch (err) { return; }
        }
        close(true);
      }
    });
    wrap.querySelector('[data-act="close"]').focus();
  });
}
