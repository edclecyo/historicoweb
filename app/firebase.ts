import { getApp, getApps, initializeApp } from "firebase/app";
import { collection, deleteDoc, doc, getDoc, getDocs, getFirestore, serverTimestamp, setDoc } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";

type CloudState = Record<string, unknown>;
type CloudSession = {
  role: "owner" | "manager" | "school";
  nome: string;
  adminUserId?: string;
  schoolId?: string;
  accessId?: string;
  sessionToken: string;
};

type CloudSessionResult<T> = {
  session: CloudSession;
  payload: T;
  histories?: unknown[];
};

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

const functionsRegion = "us-east4";
const useBackendFunctions = import.meta.env.VITE_FIREBASE_USE_FUNCTIONS !== "false";
const cloudSessionStorageKey = "historico-escolar-online:cloud-session:v1";
let cloudSessionToken: string | null = null;

export function getCloudSessionToken() {
  if (cloudSessionToken) return cloudSessionToken;
  if (typeof window === "undefined") return null;
  cloudSessionToken = window.localStorage.getItem(cloudSessionStorageKey);
  return cloudSessionToken;
}

export function setCloudSessionToken(token?: string | null) {
  cloudSessionToken = token ?? null;
  if (typeof window === "undefined") return;
  if (cloudSessionToken) {
    window.localStorage.setItem(cloudSessionStorageKey, cloudSessionToken);
  } else {
    window.localStorage.removeItem(cloudSessionStorageKey);
  }
}

function getFirebaseApp() {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

async function getAuthenticatedFirebaseApp() {
  return getFirebaseApp();
}

async function callBackend<T>(name: string, data?: Record<string, unknown>) {
  if (!firebaseEnabled || !useBackendFunctions) return { handled: false as const };
  try {
    const sessionToken = getCloudSessionToken();
    const app = await getAuthenticatedFirebaseApp();
    const callable = httpsCallable(getFunctions(app, functionsRegion), name);
    const result = await callable(sessionToken ? { ...(data ?? {}), sessionToken } : (data ?? {}));
    return { handled: true as const, data: result.data as T };
  } catch (error) {
    console.error("Nao foi possivel acessar o banco.", error);
    return { handled: false as const };
  }
}

async function callRequiredBackend<T>(name: string, data?: Record<string, unknown>) {
  if (!firebaseEnabled || !useBackendFunctions) {
    throw new Error("Banco online indisponivel.");
  }
  const app = await getAuthenticatedFirebaseApp();
  const callable = httpsCallable(getFunctions(app, functionsRegion), name);
  const result = await callable(data ?? {});
  return result.data as T;
}

async function getCloudDocument() {
  if (!firebaseEnabled) return null;
  const app = await getAuthenticatedFirebaseApp();
  return doc(getFirestore(app), "sistema", "historico-online");
}

async function getCloudHistoriesCollection() {
  if (!firebaseEnabled) return null;
  const app = await getAuthenticatedFirebaseApp();
  return collection(getFirestore(app), "sistema", "historico-online", "historicos");
}

export async function loadCloudSetupStatus() {
  return callRequiredBackend<{ hasAdmin: boolean }>("getSetupStatus");
}

export async function createCloudOwner<T extends CloudState>(credentials: { usuario: string; senha: string }) {
  const result = await callRequiredBackend<CloudSessionResult<T>>("createOwner", credentials);
  setCloudSessionToken(result.session.sessionToken);
  return result;
}

export async function loginCloudAdmin<T extends CloudState>(credentials: { usuario: string; senha: string }) {
  const result = await callRequiredBackend<CloudSessionResult<T>>("loginRestricted", credentials);
  setCloudSessionToken(result.session.sessionToken);
  return result;
}

export async function loginCloudSchool<T extends CloudState>(credentials: { usuario: string; senha: string; tipo: string }) {
  const result = await callRequiredBackend<CloudSessionResult<T>>("loginSchool", credentials);
  setCloudSessionToken(result.session.sessionToken);
  return result;
}

export async function logoutCloudSession() {
  const token = getCloudSessionToken();
  setCloudSessionToken(null);
  if (!token || !firebaseEnabled || !useBackendFunctions) return true;
  try {
    await callRequiredBackend<{ ok: boolean }>("logoutSession", { sessionToken: token });
  } catch {
    return false;
  }
  return true;
}

export async function loadCloudState<T extends CloudState>() {
  if (useBackendFunctions && !getCloudSessionToken()) return null;
  const backend = await callBackend<{ payload: T | null }>("loadSystemState");
  if (backend.handled) return backend.data.payload;
  const reference = await getCloudDocument();
  if (!reference) return null;
  const snapshot = await getDoc(reference);
  return snapshot.exists() ? (snapshot.data().payload as T) : null;
}

export async function saveCloudState(data: CloudState) {
  const backend = await callBackend<{ ok: boolean }>("saveSystemState", { payload: data });
  if (backend.handled) return backend.data.ok;
  if (useBackendFunctions) return false;
  const reference = await getCloudDocument();
  if (!reference) return false;
  await setDoc(reference, { payload: data, updatedAt: serverTimestamp() });
  return true;
}

export async function loadCloudHistories<T>() {
  if (useBackendFunctions && !getCloudSessionToken()) return [] as T[];
  const backend = await callBackend<{ histories: T[] }>("loadHistories");
  if (backend.handled) return backend.data.histories;
  if (useBackendFunctions) return [] as T[];
  const reference = await getCloudHistoriesCollection();
  if (!reference) return [] as T[];
  const snapshot = await getDocs(reference);
  return snapshot.docs.filter((item) => item.id.startsWith("historico-")).map((item) => item.data().payload as T);
}

export async function saveCloudHistory(id: string, data: CloudState) {
  const backend = await callBackend<{ ok: boolean }>("saveHistory", { id, payload: data });
  if (backend.handled) return backend.data.ok;
  if (!firebaseEnabled || useBackendFunctions) return false;
  const app = await getAuthenticatedFirebaseApp();
  await setDoc(doc(getFirestore(app), "sistema", "historico-online", "historicos", `historico-${id}`), { payload: data, updatedAt: serverTimestamp() });
  return true;
}

export async function saveCloudHistories<T extends { id: string }>(records: T[]) {
  const backend = await callBackend<{ ok: boolean }>("saveHistories", { histories: records });
  if (backend.handled) return backend.data.ok;
  if (!firebaseEnabled || useBackendFunctions) return false;
  const app = await getAuthenticatedFirebaseApp();
  const db = getFirestore(app);
  await Promise.all(records.map((record) =>
    setDoc(doc(db, "sistema", "historico-online", "historicos", `historico-${record.id}`), {
      payload: record,
      updatedAt: serverTimestamp(),
    }),
  ));
  return true;
}

export async function deleteCloudHistory(id: string) {
  const backend = await callBackend<{ ok: boolean }>("deleteHistory", { id });
  if (backend.handled) return backend.data.ok;
  if (!firebaseEnabled || useBackendFunctions) return false;
  const app = await getAuthenticatedFirebaseApp();
  await deleteDoc(doc(getFirestore(app), "sistema", "historico-online", "historicos", `historico-${id}`));
  return true;
}
