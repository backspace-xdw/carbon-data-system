// <iecsp-card title="..." hint="..."><slot></slot></iecsp-card>
// 仅用 Light DOM 包装,沿用全局 components.css

class IecspCard extends HTMLElement {
  connectedCallback() {
    if (this._mounted) return;
    this._mounted = true;
    const title = this.getAttribute('title') || '';
    const hint  = this.getAttribute('hint')  || '';
    const inner = this.innerHTML;
    this.innerHTML = `
      <section class="iecsp-card">
        ${(title || hint) ? `<header class="iecsp-card__head">
          <div class="iecsp-card__title">${title}</div>
          ${hint ? `<div class="iecsp-card__hint">${hint}</div>` : ''}
        </header>` : ''}
        <div class="iecsp-card__body">${inner}</div>
      </section>`;
  }
}
customElements.define('iecsp-card', IecspCard);
