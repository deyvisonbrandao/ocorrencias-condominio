const prototipo = HTMLDialogElement.prototype;
const originais = { showModal: prototipo.showModal, close: prototipo.close };

// O jsdom não implementa showModal()/close(); a simulação cobre só o que os componentes usam.
export function simularDialogoNativo(): void {
  prototipo.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  prototipo.close = function (this: HTMLDialogElement) {
    if (this.hasAttribute('open')) {
      this.removeAttribute('open');
      this.dispatchEvent(new Event('close'));
    }
  };
}

export function restaurarDialogoNativo(): void {
  prototipo.showModal = originais.showModal;
  prototipo.close = originais.close;
}
