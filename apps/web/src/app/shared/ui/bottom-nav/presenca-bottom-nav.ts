import { computed, Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PresencaBottomNav {
  private readonly instancias = signal(0);

  readonly visivel = computed(() => this.instancias() > 0);

  registrar(): () => void {
    this.instancias.update((total) => total + 1);
    return () => this.instancias.update((total) => total - 1);
  }
}
