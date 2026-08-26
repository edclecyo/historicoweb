const crypto = require("node:crypto");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { FieldValue, getFirestore } = require("firebase-admin/firestore");

initializeApp();

const region = "us-east4";
const db = getFirestore();
const systemRef = db.collection("sistema").doc("historico-online");
const historiesRef = systemRef.collection("historicos");
const sessionsRef = systemRef.collection("sessions");
const sessionTtlMs = 1000 * 60 * 60 * 12;

function cleanJson(value) {
  return JSON.parse(JSON.stringify(value ?? null));
}

function normalizeText(value) {
  return String(value ?? "").trim().toLocaleUpperCase("pt-BR");
}

function hashValue(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function createToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function publicSession(session, token) {
  return cleanJson({
    role: session.role,
    nome: session.nome,
    adminUserId: session.adminUserId,
    schoolId: session.schoolId,
    accessId: session.accessId,
    sessionToken: token,
  });
}

function requirePayload(value, message) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpsError("invalid-argument", message);
  }
  return cleanJson(value);
}

function cleanId(value) {
  const id = String(value ?? "").trim();
  if (!id || /[\/\\]/.test(id)) {
    throw new HttpsError("invalid-argument", "Registro inválido.");
  }
  return id;
}

async function readPayload() {
  const snapshot = await systemRef.get();
  return snapshot.exists ? cleanJson(snapshot.get("payload") ?? null) : null;
}

async function writePayload(payload) {
  await systemRef.set({ payload: cleanJson(payload), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
}

async function readHistories() {
  const snapshot = await historiesRef.get();
  return snapshot.docs
    .filter((item) => item.id.startsWith("historico-"))
    .map((item) => item.get("payload"))
    .filter(Boolean)
    .map(cleanJson);
}

async function issueSession(session) {
  const token = createToken();
  const tokenHash = hashValue(token);
  const now = Date.now();
  await sessionsRef.doc(tokenHash).set({
    ...cleanJson(session),
    tokenHash,
    createdAt: now,
    expiresAt: now + sessionTtlMs,
  });
  return publicSession(session, token);
}

async function requireSession(request) {
  const token = String(request.data?.sessionToken ?? "").trim();
  if (!token) {
    throw new HttpsError("unauthenticated", "Entre no sistema.");
  }
  const snapshot = await sessionsRef.doc(hashValue(token)).get();
  const session = snapshot.exists ? snapshot.data() : null;
  if (!session || (session.expiresAt && session.expiresAt < Date.now())) {
    throw new HttpsError("unauthenticated", "Entre novamente no sistema.");
  }
  return cleanJson(session);
}

function isPrivileged(session) {
  return session.role === "owner" || session.role === "manager";
}

function cleanSchoolForDirectory(account, currentSchoolId) {
  if (!account || typeof account !== "object") return account;
  if (account.id === currentSchoolId) return account;
  return {
    id: account.id,
    usuario: "",
    senha: "",
    tipo: account.tipo,
    ativo: account.ativo,
    escola: account.escola,
    createdAt: account.createdAt,
    mustChangePassword: false,
    accessos: [],
  };
}

function viewForSession(payload, histories, session) {
  const data = payload ?? { escolas: [], folders: [], historicos: [], transferencias: [], admin: null, adminUsers: [] };
  if (isPrivileged(session)) {
    return { payload: { ...data, historicos: histories ?? data.historicos ?? [] }, histories: histories ?? [] };
  }
  if (session.role !== "school" || !session.schoolId) {
    throw new HttpsError("permission-denied", "Acesso não autorizado.");
  }
  const schoolId = session.schoolId;
  const ownHistories = (histories ?? data.historicos ?? []).filter((record) => record?.schoolId === schoolId);
  const filtered = {
    ...data,
    escola: (data.escolas ?? []).find((school) => school.id === schoolId)?.escola ?? data.escola,
    escolas: (data.escolas ?? []).map((school) => cleanSchoolForDirectory(school, schoolId)),
    folders: (data.folders ?? []).filter((folder) => folder.schoolId === schoolId),
    historicos: ownHistories,
    transferencias: (data.transferencias ?? []).filter((request) =>
      request.fromSchoolId === schoolId || request.toSchoolId === schoolId,
    ),
    admin: null,
    adminUsers: [],
  };
  return { payload: filtered, histories: ownHistories };
}

function mergeSchoolPayload(existing, incoming, session) {
  const schoolId = session.schoolId;
  const current = existing ?? { escolas: [], folders: [], historicos: [], transferencias: [], admin: null, adminUsers: [] };
  const patch = incoming ?? {};
  const incomingSchool = (patch.escolas ?? []).find((school) => school.id === schoolId);
  const ownIncomingTransfers = (patch.transferencias ?? []).filter((request) =>
    request.fromSchoolId === schoolId || request.toSchoolId === schoolId,
  );
  const ownTransferIds = new Set(ownIncomingTransfers.map((request) => request.id));
  const unrelatedTransfers = (current.transferencias ?? []).filter((request) =>
    request.fromSchoolId !== schoolId && request.toSchoolId !== schoolId && !ownTransferIds.has(request.id),
  );
  return {
    ...current,
    escola: incomingSchool?.escola ?? current.escola,
    escolas: (current.escolas ?? []).map((school) => school.id === schoolId ? { ...school, ...(incomingSchool ?? {}) } : school),
    folders: [
      ...(current.folders ?? []).filter((folder) => folder.schoolId !== schoolId),
      ...(patch.folders ?? []).filter((folder) => folder.schoolId === schoolId),
    ],
    historicos: [
      ...(current.historicos ?? []).filter((record) => record.schoolId !== schoolId),
      ...(patch.historicos ?? []).filter((record) => record.schoolId === schoolId),
    ],
    transferencias: [...unrelatedTransfers, ...ownIncomingTransfers],
    admin: current.admin ?? null,
    adminUsers: current.adminUsers ?? [],
  };
}

function findRestrictedAccess(payload, credentials) {
  const usuario = normalizeText(credentials?.usuario);
  const senha = String(credentials?.senha ?? "").trim();
  if (!usuario || !senha) return null;
  if (payload?.admin?.usuario === usuario && payload?.admin?.senha === senha) {
    return { role: "owner", nome: usuario };
  }
  const adminUser = (payload?.adminUsers ?? []).find((user) =>
    user.ativo !== false && user.usuario === usuario && user.senha === senha,
  );
  if (!adminUser) return null;
  return { role: "manager", nome: adminUser.nome || adminUser.usuario, adminUserId: adminUser.id };
}

function findSchoolAccess(payload, credentials) {
  const usuario = normalizeText(credentials?.usuario);
  const senha = String(credentials?.senha ?? "").trim();
  const tipo = String(credentials?.tipo ?? "");
  if (!usuario || !senha || !["municipal", "estadual"].includes(tipo)) return null;
  for (const school of payload?.escolas ?? []) {
    if (school.ativo === false || school.tipo !== tipo) continue;
    const accessos = school.accessos?.length
      ? school.accessos
      : [{ id: `${school.id}-principal`, usuario: school.usuario, senha: school.senha, mustChangePassword: school.mustChangePassword }];
    const access = accessos.find((item) => item.usuario === usuario && item.senha === senha);
    if (access) {
      return { role: "school", nome: access.usuario, schoolId: school.id, accessId: access.id };
    }
  }
  return null;
}

exports.getSetupStatus = onCall({ region }, async () => {
  const payload = await readPayload();
  return { hasAdmin: Boolean(payload?.admin?.usuario) };
});

exports.createOwner = onCall({ region }, async (request) => {
  const payload = await readPayload();
  if (payload?.admin?.usuario) {
    throw new HttpsError("already-exists", "Acesso restrito já foi criado.");
  }
  const usuario = normalizeText(request.data?.usuario);
  const senha = String(request.data?.senha ?? "").trim();
  if (!usuario || senha.length < 6) {
    throw new HttpsError("invalid-argument", "Informe usuário e senha com pelo menos 6 caracteres.");
  }
  const nextPayload = {
    escola: payload?.escola,
    escolas: payload?.escolas ?? [],
    folders: payload?.folders ?? [],
    historicos: payload?.historicos ?? [],
    transferencias: payload?.transferencias ?? [],
    admin: { usuario, senha },
    adminUsers: payload?.adminUsers ?? [],
  };
  await writePayload(nextPayload);
  const session = await issueSession({ role: "owner", nome: usuario });
  const histories = await readHistories();
  return { session, payload: { ...nextPayload, historicos: histories }, histories };
});

exports.loginRestricted = onCall({ region }, async (request) => {
  const payload = await readPayload();
  const access = findRestrictedAccess(payload, request.data);
  if (!access) {
    throw new HttpsError("permission-denied", "Usuário ou senha incorretos.");
  }
  const session = await issueSession(access);
  const histories = await readHistories();
  return { session, payload: { ...payload, historicos: histories }, histories };
});

exports.loginSchool = onCall({ region }, async (request) => {
  const payload = await readPayload();
  const access = findSchoolAccess(payload, request.data);
  if (!access) {
    throw new HttpsError("permission-denied", "Usuário, senha ou rede da escola incorretos.");
  }
  const session = await issueSession(access);
  const histories = await readHistories();
  const scoped = viewForSession(payload, histories, access);
  return { session, ...scoped };
});

exports.logoutSession = onCall({ region }, async (request) => {
  const token = String(request.data?.sessionToken ?? "").trim();
  if (token) await sessionsRef.doc(hashValue(token)).delete();
  return { ok: true };
});

exports.loadSystemState = onCall({ region }, async (request) => {
  const session = await requireSession(request);
  const payload = await readPayload();
  const histories = await readHistories();
  return { payload: viewForSession(payload, histories, session).payload };
});

exports.saveSystemState = onCall({ region }, async (request) => {
  const session = await requireSession(request);
  const payload = requirePayload(request.data?.payload, "Dados inválidos.");
  if (isPrivileged(session)) {
    await writePayload(payload);
    return { ok: true };
  }
  if (session.role !== "school" || !session.schoolId) {
    throw new HttpsError("permission-denied", "Acesso não autorizado.");
  }
  const current = await readPayload();
  await writePayload(mergeSchoolPayload(current, payload, session));
  return { ok: true };
});

exports.loadHistories = onCall({ region }, async (request) => {
  const session = await requireSession(request);
  const payload = await readPayload();
  const histories = await readHistories();
  return { histories: viewForSession(payload, histories, session).histories };
});

exports.saveHistory = onCall({ region }, async (request) => {
  const session = await requireSession(request);
  const id = cleanId(request.data?.id);
  const payload = requirePayload(request.data?.payload, "Histórico inválido.");
  if (!isPrivileged(session) && payload.schoolId !== session.schoolId) {
    throw new HttpsError("permission-denied", "Histórico de outra escola.");
  }
  await historiesRef.doc(`historico-${id}`).set({ payload, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  return { ok: true };
});

exports.saveHistories = onCall({ region }, async (request) => {
  const session = await requireSession(request);
  const histories = request.data?.histories;
  if (!Array.isArray(histories)) {
    throw new HttpsError("invalid-argument", "Históricos inválidos.");
  }
  const batch = db.batch();
  for (const history of histories) {
    const payload = requirePayload(history, "Histórico inválido.");
    const id = cleanId(payload.id);
    if (!isPrivileged(session) && payload.schoolId !== session.schoolId) {
      throw new HttpsError("permission-denied", "Histórico de outra escola.");
    }
    batch.set(historiesRef.doc(`historico-${id}`), { payload, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  }
  await batch.commit();
  return { ok: true };
});

exports.deleteHistory = onCall({ region }, async (request) => {
  const session = await requireSession(request);
  const id = cleanId(request.data?.id);
  if (!isPrivileged(session)) {
    const snapshot = await historiesRef.doc(`historico-${id}`).get();
    const payload = snapshot.exists ? snapshot.get("payload") : null;
    if (payload?.schoolId !== session.schoolId) {
      throw new HttpsError("permission-denied", "Histórico de outra escola.");
    }
  }
  await historiesRef.doc(`historico-${id}`).delete();
  return { ok: true };
});
