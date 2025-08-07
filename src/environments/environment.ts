// frontend/src/environments/environment.ts
export const environment = {
  production: false,
  apiKeys: 'AIzaSyDanBliCzAuCZrsq67FeKEs3vqAilUD_is',
  apiMapKey: 'AIzaSyCU0ArzZlZ3n0pLq4o9MJy29LPT5DBMk4Y',

  
  backendLink: window._env_?.backendCoreUrl,
  backendUserLink: window._env_?.backendUserUrl,
  backendChatLink: window._env_?.backendChatUrl,
  backendUbsLink: window._env_?.backendUbsUrl,
  frontendLink: window._env_?.frontendUrl,
  socket: window._env_?.socketUrl,
  chatSocket: window._env_?.chatSocketUrl,



  firebaseConfig: {
    apiKey: 'AIzaSyDSVxahTHqdffRX2upKIMXCCjEBUYoHX8E',
    authDomain: 'greencity-9bdb7.firebaseapp.com',
    databaseURL: 'https://greencity-9bdb7.firebaseio.com',
    projectId: 'greencity-9bdb7',
    storageBucket: 'greencity-9bdb7.appspot.com',
    messagingSenderId: '3763960182',
    appId: '1:3763960182:web:44462764adbc05beb72257',
    measurementId: 'G-CCHRKQ4R0S'
  },
  ubsAdmin: {
    backendUbsAdminLink: 'http://ubs-service/ubs'
  },
  googleClientId: '509138864931-6emuq5cv1rvqf33ivppod9jp8n24pjst.apps.googleusercontent.com',
  agmCoreModuleApiKey: 'AIzaSyC7q2v0VgRy60dAoItfv3IJhfJQEEoeqCI'
};
