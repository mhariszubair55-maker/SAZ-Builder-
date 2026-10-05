import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  User,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  serverTimestamp,
  Firestore,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Initialize Firestore with custom Database ID
export const db: Firestore = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Skill Directive: Test connection to Firestore on initialization
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('[Firebase] Client is offline or database is initializing:', error.message);
    }
  }
}
testConnection();

// Skill Directive: Standardized Firestore Error Handler
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((p) => ({
          providerId: p.providerId,
          email: p.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('[Firestore Error]:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface UserProfileData {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  createdAt: string;
  updatedAt: string;
}

// User Profile Firestore Sync
export async function syncUserProfile(user: User): Promise<UserProfileData> {
  const userRef = doc(db, 'users', user.uid);
  const path = `users/${user.uid}`;
  const now = new Date().toISOString();

  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      const newProfile: UserProfileData = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || user.email?.split('@')[0] || 'Developer',
        photoURL: user.photoURL || `https://api.dicebear.com/7.x/identicon/svg?seed=${user.uid}`,
        createdAt: now,
        updatedAt: now,
      };
      await setDoc(userRef, newProfile);
      return newProfile;
    } else {
      const existing = snap.data() as UserProfileData;
      const updated: UserProfileData = {
        ...existing,
        displayName: user.displayName || existing.displayName,
        photoURL: user.photoURL || existing.photoURL,
        updatedAt: now,
      };
      await updateDoc(userRef, {
        displayName: updated.displayName,
        photoURL: updated.photoURL,
        updatedAt: now,
      });
      return updated;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    throw err;
  }
}

// Auth Actions
export async function loginWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  await syncUserProfile(result.user);
  return result.user;
}

export async function signupWithEmail(email: string, pass: string, name?: string): Promise<User> {
  const result = await createUserWithEmailAndPassword(auth, email, pass);
  if (name && result.user) {
    await updateProfile(result.user, { displayName: name });
  }
  await syncUserProfile(result.user);
  return result.user;
}

export async function loginWithEmail(email: string, pass: string): Promise<User> {
  const result = await signInWithEmailAndPassword(auth, email, pass);
  await syncUserProfile(result.user);
  return result.user;
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

// -------------------------------------------------------------
// FIRESTORE PERSISTENT PROJECTS & FILES STORAGE
// -------------------------------------------------------------

import type { Project, ProjectFile, PromptTurn } from '../types/saz';

/**
 * Saves or updates a project in Firestore under the user's isolated ownership.
 */
export async function saveProjectToFirestore(project: Project, ownerId: string): Promise<void> {
  const projectPath = `projects/${project.id}`;
  try {
    const projectRef = doc(db, 'projects', project.id);
    const dataToSave = {
      ...project,
      ownerId,
      updatedAt: new Date().toISOString(),
    };
    await setDoc(projectRef, dataToSave, { merge: true });

    // Also persist files to /projects/{projectId}/files/{fileId}
    if (Array.isArray(project.files)) {
      for (const file of project.files) {
        const fileDocId = file.path.replace(/[\/\\]/g, '__');
        const fileRef = doc(db, 'projects', project.id, 'files', fileDocId);
        await setDoc(
          fileRef,
          {
            id: fileDocId,
            projectId: project.id,
            ownerId,
            path: file.path,
            language: file.language || 'ts',
            content: file.content || '',
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }
    }

    // Also persist AI conversation turns to /projects/{projectId}/conversations/{turnId}
    if (Array.isArray(project.promptHistory)) {
      for (const turn of project.promptHistory) {
        const turnDocId = turn.id || `turn-${Date.now()}`;
        const turnRef = doc(db, 'projects', project.id, 'conversations', turnDocId);
        await setDoc(
          turnRef,
          {
            id: turnDocId,
            projectId: project.id,
            ownerId,
            prompt: turn.prompt,
            summary: turn.summary || '',
            plan: turn.plan || [],
            timestamp: turn.timestamp || new Date().toISOString(),
          },
          { merge: true }
        );
      }
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, projectPath);
    throw err;
  }
}

/**
 * Deletes a project from Firestore.
 */
export async function deleteProjectFromFirestore(projectId: string, ownerId: string): Promise<void> {
  const projectPath = `projects/${projectId}`;
  try {
    const projectRef = doc(db, 'projects', projectId);
    await deleteDoc(projectRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, projectPath);
    throw err;
  }
}

/**
 * Subscribes to real-time project updates for the authenticated user only.
 */
export function subscribeToUserProjects(
  ownerId: string,
  onProjectsUpdated: (projects: Project[]) => void,
  onError?: (err: Error) => void
): () => void {
  const path = 'projects';
  const q = query(collection(db, 'projects'), where('ownerId', '==', ownerId));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const projects: Project[] = [];
      snapshot.forEach((d) => {
        projects.push(d.data() as Project);
      });
      // Sort by updatedAt descending
      projects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      onProjectsUpdated(projects);
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, path);
      if (onError) onError(err);
    }
  );

  return unsubscribe;
}

