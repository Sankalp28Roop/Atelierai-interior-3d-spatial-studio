import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
  signInAnonymously,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  getDocs,
  deleteDoc,
  getDocFromServer,
  Firestore,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App singleton
const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth
export const auth = getAuth(app);

// Initialize Firestore targeting the provisioned database ID
export const db: Firestore = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Test Firestore Connection on Boot
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or network restricted.');
      return false;
    }
    // Permission denied on test/connection is normal and expected under strict zero-trust rules
    return true;
  }
}

// User Profile Interface
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: string; // 'Interior Designer' | 'Architect' | 'Homeowner' | 'Studio Client'
  createdAt: string;
  updatedAt?: string;
}

// User Saved Design Interface
export interface UserDesignRecord {
  id: string;
  userId: string;
  prompt: string;
  type: '2D' | '3D';
  mediaUrl: string;
  title: string;
  source?: string;
  styleName?: string;
  dimensions?: string;
  createdAt: string;
}

/**
 * Sign up a new user with email, password, and custom display name / persona role
 */
export async function signUpWithEmail(
  email: string,
  pass: string,
  displayName: string,
  role: string = 'Interior Designer'
): Promise<UserProfile> {
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), pass);
  const user = credential.user;

  // Update Auth Profile
  await updateProfile(user, { displayName: displayName.trim() });

  // Save profile document in Firestore
  const profile: UserProfile = {
    uid: user.uid,
    email: user.email || email.trim(),
    displayName: displayName.trim() || 'Designer',
    role: role || 'Interior Designer',
    createdAt: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, 'users', user.uid), profile);
  } catch (err) {
    console.warn('Could not write user profile to Firestore:', err);
  }

  return profile;
}

/**
 * Sign in an existing user with email and password
 */
export async function signInWithEmail(email: string, pass: string): Promise<User> {
  const credential = await signInWithEmailAndPassword(auth, email.trim(), pass);
  return credential.user;
}

/**
 * Sign in using Google OAuth Popup
 */
export async function signInWithGoogle(): Promise<User> {
  const credential = await signInWithPopup(auth, googleProvider);
  const user = credential.user;

  // Ensure user profile document exists
  try {
    const userDocRef = doc(db, 'users', user.uid);
    const existing = await getDoc(userDocRef);
    if (!existing.exists()) {
      const profile: UserProfile = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || 'Google User',
        role: 'Interior Designer',
        createdAt: new Date().toISOString(),
      };
      await setDoc(userDocRef, profile);
    }
  } catch (err) {
    console.warn('Could not sync Google user profile:', err);
  }

  return user;
}

/**
 * Sign in as an anonymous guest with a designated preview persona
 */
export async function signInAsGuest(role: string = 'Studio Explorer'): Promise<User> {
  const credential = await signInAnonymously(auth);
  const user = credential.user;

  const guestName = `Guest ${role.replace(/\s+/g, '')}`;
  try {
    await updateProfile(user, { displayName: guestName });
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: `${user.uid.slice(0, 8)}@atelier-guest.local`,
      displayName: guestName,
      role: role,
      createdAt: new Date().toISOString(),
    });
  } catch (e) {
    console.warn('Guest profile creation skipped:', e);
  }

  return user;
}

/**
 * Sign out current user
 */
export async function logOut(): Promise<void> {
  await signOut(auth);
}

/**
 * Fetch user profile from Firestore
 */
export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const snapshot = await getDoc(doc(db, 'users', uid));
    if (snapshot.exists()) {
      return snapshot.data() as UserProfile;
    }
  } catch (err) {
    console.warn('Failed to fetch user profile:', err);
  }
  return null;
}

/**
 * Save a generated 2D scene or 3D furniture design to the user's private collection
 */
export async function saveDesignToFirestore(
  userId: string,
  design: Omit<UserDesignRecord, 'userId'>
): Promise<void> {
  if (!userId) return;
  const designRef = doc(db, 'users', userId, 'designs', design.id);
  const record: UserDesignRecord = {
    ...design,
    userId,
  };
  await setDoc(designRef, record);
}

/**
 * Fetch all saved designs for a user
 */
export async function fetchUserDesigns(userId: string): Promise<UserDesignRecord[]> {
  if (!userId) return [];
  try {
    const q = collection(db, 'users', userId, 'designs');
    const snapshot = await getDocs(q);
    const list: UserDesignRecord[] = [];
    snapshot.forEach((d) => list.push(d.data() as UserDesignRecord));
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.warn('Failed to load user designs:', err);
    return [];
  }
}

/**
 * Delete a saved design
 */
export async function deleteDesignFromFirestore(userId: string, designId: string): Promise<void> {
  if (!userId || !designId) return;
  await deleteDoc(doc(db, 'users', userId, 'designs', designId));
}
