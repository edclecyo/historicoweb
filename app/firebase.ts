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
  accessLevel?: "principal" | "secundario";
  sessionToken: string;
};

type CloudSessionResult<T> = {
  session: CloudSession;
  payload: T;
  histories?: unknown[];
};

export type CloudActivity = {
  id: string;
  tipo: string;
  descricao: string;
  usuario: string;
  perfil: "owner" | "manager" | "school";
  schoolId?: string;
  schoolName?: string;
  targetId?: string;
  targetName?: string;
  createdAt: number | string;
};

export type CloudActiveUser = {
  id: string;
  usuario: string;
  perfil: "owner" | "manager" | "school";
  schoolId?: string;
  schoolName?: string;
  currentView?: string;
  actionLabel?: string;
  targetName?: string;
  lastSeen: number;
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
const cloudRequestTimeoutMs = 8000;
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
    const result = await withCloudTimeout(callable(sessionToken ? { ...(data ?? {}), sessionToken } : (data ?? {})));
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
  const result = await withCloudTimeout(callable(data ?? {}));
  return result.data as T;
}

function withCloudTimeout<T>(promise: Promise<T>) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Tempo de resposta excedido.")), cloudRequestTimeoutMs);
    promise
      .then(resolve, reject)
      .finally(() => clearTimeout(timer));
  });
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

export async function createCloudOwner<T extends CloudState>(credentials: { usuario: string; senha: string; nome?: string; email?: string; cpf?: string }) {
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

export async function changeCloudPassword(input: { currentPassword?: string; nextPassword: string; firstAccess?: boolean }) {
  const sessionToken = getCloudSessionToken();
  if (!sessionToken) return false;
  const result = await callRequiredBackend<{ ok: boolean }>("changePassword", { ...input, sessionToken });
  return result.ok;
}

export async function recoverCloudSchoolPassword(input: { usuario: string; email: string; cpf: string; tipo: string }) {
  const result = await callRequiredBackend<{ ok: boolean }>("recoverSchoolPassword", input);
  return result.ok;
}

export async function updateCloudProfile(input: { nome: string; email?: string; cpf?: string }) {
  const sessionToken = getCloudSessionToken();
  if (!sessionToken) return null;
  const result = await callRequiredBackend<{ ok: boolean; nome: string }>("updateProfile", { ...input, sessionToken });
  return result.ok ? result.nome : null;
}

export async function loadCloudActivity() {
  const backend = await callBackend<{ activeUsers: CloudActiveUser[]; activities: CloudActivity[] }>("loadActivity");
  if (backend.handled) return backend.data;
  return { activeUsers: [], activities: [] };
}

export async function pingCloudActivity(input: { currentView?: string; actionLabel?: string; targetId?: string; targetName?: string; schoolName?: string }) {
  if (useBackendFunctions && !getCloudSessionToken()) return false;
  const backend = await callBackend<{ ok: boolean }>("pingActivity", input);
  return backend.handled ? backend.data.ok : false;
}

export async function recordCloudActivity(input: { tipo: string; descricao: string; schoolId?: string; schoolName?: string; targetId?: string; targetName?: string }) {
  if (useBackendFunctions && !getCloudSessionToken()) return false;
  const backend = await callBackend<{ ok: boolean }>("recordActivity", { activity: input });
  return backend.handled ? backend.data.ok : false;
}

export async function deleteCloudActivity(input: { id?: string; all?: boolean }) {
  if (useBackendFunctions && !getCloudSessionToken()) return false;
  const backend = await callBackend<{ ok: boolean }>("deleteActivity", input);
  return backend.handled ? backend.data.ok : false;
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
  if (useBackendFunctions && !getCloudSessionToken()) return false;
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
  if (useBackendFunctions && !getCloudSessionToken()) return false;
  const backend = await callBackend<{ ok: boolean }>("saveHistory", { id, payload: data });
  if (backend.handled) return backend.data.ok;
  if (!firebaseEnabled || useBackendFunctions) return false;
  const app = await getAuthenticatedFirebaseApp();
  await setDoc(doc(getFirestore(app), "sistema", "historico-online", "historicos", `historico-${id}`), { payload: data, updatedAt: serverTimestamp() });
  return true;
}

export async function saveCloudHistories<T extends { id: string }>(records: T[]) {
  if (useBackendFunctions && !getCloudSessionToken()) return false;
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
  if (useBackendFunctions && !getCloudSessionToken()) return false;
  const backend = await callBackend<{ ok: boolean }>("deleteHistory", { id });
  if (backend.handled) return backend.data.ok;
  if (!firebaseEnabled || useBackendFunctions) return false;
  const app = await getAuthenticatedFirebaseApp();
  await deleteDoc(doc(getFirestore(app), "sistema", "historico-online", "historicos", `historico-${id}`));
  return true;
}
