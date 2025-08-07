import { AppModule } from './app/app.module';
import 'hammerjs';
import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}

// 🔴 Addd window.environment 
// Это позволяет проверять environment в консоли браузера
(window as any).environment = environment;

// 🔴 Проверяем, загрузился ли config.js
if (!window._env_) {
  console.error('❌ attemtion: config.js do not load');
   
}

platformBrowserDynamic()
  .bootstrapModule(AppModule)
  .catch((err) => console.error(err));
