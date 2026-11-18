import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth } from 'firebase/auth';
// @ts-ignore - RN persistence helper ships without its own types in some SDK versions
import { getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'AIzaSyDmkbZfdH3qrX3TX0NF3yle4dHQH4eW06k',
  authDomain: 'kobo-1ea3a.firebaseapp.com',
  projectId: 'kobo-1ea3a',
  storageBucket: 'kobo-1ea3a.firebasestorage.app',
  messagingSenderId: '821235699413',
  appId: '1:821235699413:web:a3179bb1c09fe586169c5c',
  measurementId: 'G-0HFKRZS8KT',
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  auth = getAuth(app);
}

export { app, auth };