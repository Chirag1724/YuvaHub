import { initializeApp, setLogLevel } from 'firebase/app';
setLogLevel('error');
import { 
  initializeAuth,
  browserLocalPersistence,
  browserPopupRedirectResolver,
  GoogleAuthProvider, 
  GithubAuthProvider,
  OAuthProvider, 
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = initializeAuth(app, {
  persistence: browserLocalPersistence,
  popupRedirectResolver: browserPopupRedirectResolver
});

export const db = getFirestore(app);

export const googleProvider = new GoogleAuthProvider();
export const githubProvider = new GithubAuthProvider();
export const appleProvider = new OAuthProvider('apple.com');

// Use signInWithPopup first, fall back to signInWithRedirect if domain is unauthorized
export const signInWithGoogle = async () => {
  try {
    return await signInWithPopup(auth, googleProvider);
  } catch (error: any) {
    if (error?.code === 'auth/unauthorized-domain' || error?.code === 'auth/popup-blocked') {
      console.log('Popup auth failed, falling back to redirect...');
      return signInWithRedirect(auth, googleProvider);
    }
    throw error;
  }
};
export const signInWithGithub = async () => {
  try {
    return await signInWithPopup(auth, githubProvider);
  } catch (error: any) {
    if (error?.code === 'auth/unauthorized-domain' || error?.code === 'auth/popup-blocked') {
      console.log('Popup auth failed, falling back to redirect...');
      return signInWithRedirect(auth, githubProvider);
    }
    throw error;
  }
};
export const signInWithApple = async () => {
  try {
    return await signInWithPopup(auth, appleProvider);
  } catch (error: any) {
    if (error?.code === 'auth/unauthorized-domain' || error?.code === 'auth/popup-blocked') {
      return signInWithRedirect(auth, appleProvider);
    }
    throw error;
  }
};
export const logout = () => signOut(auth);

// Handle redirect result when user returns from Google sign-in
getRedirectResult(auth).catch((error) => {
  console.warn('Redirect auth result error:', error);
});

export { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail,
  updateProfile
};
