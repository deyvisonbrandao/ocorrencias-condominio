import { DOCUMENT } from '@angular/common';
import { inject, InjectionToken } from '@angular/core';

export const ORIGEM_DO_APP = new InjectionToken<string>('ORIGEM_DO_APP', {
  providedIn: 'root',
  factory: () => inject(DOCUMENT).location.origin,
});
