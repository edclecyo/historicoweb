import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { collection, doc, getDoc, getDocs, getFirestore, serverTimestamp, setDoc } from "firebase/firestore";

type CloudState = Record<string, unknown>;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseEnabled = Boolean(
  firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId,
);

async function getCloudDocument() {
  if (!firebaseEnabled) return null;
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  const auth = getAuth(app);
  if (!auth.currentUser) await signInAnonymously(auth);
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error("Nao foi possivel autenticar no Firebase.");
  return doc(getFirestore(app), "usuarios", userId, "historicoEscolar", "principal");
}

async function getCloudUserId() {
  if (!firebaseEnabled) return null;
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  const auth = getAuth(app);
  if (!auth.currentUser) await signInAnonymously(auth);
  return auth.currentUser?.uid ?? null;
}

export async function loadCloudState<T extends CloudState>() {
  const reference = await getCloudDocument();
  if (!reference) return null;
  const snapshot = await getDoc(reference);
  return snapshot.exists() ? (snapshot.data().payload as T) : null;
}

export async function saveCloudState(data: CloudState) {
  const reference = await getCloudDocument();
  if (!reference) return false;
  await setDoc(reference, { payload: data, updatedAt: serverTimestamp() });
  return true;
}

export async function loadCloudHistories<T>() {
  const userId = await getCloudUserId();
  if (!userId) return [] as T[];
  const snapshot = await getDocs(collection(getFirestore(getApp()), "usuarios", userId, "historicoEscolar"));
  return snapshot.docs.filter((item) => item.id.startsWith("historico-")).map((item) => item.data().payload as T);
}

export async function saveCloudHistory(id: string, data: CloudState) {
  const userId = await getCloudUserId();
  if (!userId) return false;
  await setDoc(doc(getFirestore(getApp()), "usuarios", userId, "historicoEscolar", `historico-${id}`), { payload: data, updatedAt: serverTimestamp() });
  return true;
}
