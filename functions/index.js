const crypto = require("node:crypto");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { FieldValue, getFirestore } = require("firebase-admin/firestore");

initializeApp();

const region = "us-east4";
const passwordMask = "******";
const sessionTtlMs = 1000 * 60 * 60 * 12;
const db = getFirestore();
const systemRef = db.collection("sistema").doc("historico-online");
const configRef = systemRef.collection("config").doc("principal");
const usersRef = systemRef.collection("usuarios");
const schoolsRef = systemRef.collection("escolas");
const schoolAccessesRef = systemRef.collection("acessos-escolas");
const foldersRef = systemRef.collection("turmas");
const modelsRef = systemRef.collection("modelos");
const transfersRef = systemRef.collection("transferencias");
const historiesRef = systemRef.collection("historicos");
const sessionsRef = systemRef.collection("sessions");
const activityRef = systemRef.collection("atividades");

function cleanJson(value) {
  return JSON.parse(JSON.stringify(value ?? null));
}

function normalizeText(value) {
  return String(value ?? "").trim().toLocaleUpperCase("pt-BR");
}

function normalizeEmail(value) {
  return String(value ?? "").trim().toLocaleLowerCase("pt-BR");
}

function digitsOnly(value) {
  return String(value ?? "").replace(/\D/g, "");
}

function cleanId(value) {
  const id = String(value ?? "").trim();
  if (!id || /[\/\\]/.test(id)) throw new HttpsError("invalid-argument", "Registro inválido.");
  return id;
}

function hashValue(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function createToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function passwordIsHidden(value) {
  const text = String(value ?? "").trim();
  return !text || text === passwordMask || /^[*•]+$/.test(text);
}

function createPasswordFields(password, existing = {}) {
  if (passwordIsHidden(password)) {
    return existing.passwordHash && existing.passwordSalt
      ? { passwordHash: existing.passwordHash, passwordSalt: existing.passwordSalt }
      : {};
  }
  const passwordSalt = createToken();
  return { passwordSalt, passwordHash: hashValue(`${passwordSalt}:${String(password).trim()}`) };
}

function verifyPassword(password, credential) {
  const cleanPassword = String(password ?? "").trim();
  if (!cleanPassword || !credential) return false;
  if (credential.passwordHash && credential.passwordSalt) {
    return hashValue(`${credential.passwordSalt}:${cleanPassword}`) === credential.passwordHash;
  }
  return credential.senha === cleanPassword;
}

function stripPasswordFields(value) {
  const copy = { ...cleanJson(value) };
  delete copy.senha;
  delete copy.passwordHash;
  delete copy.passwordSalt;
  delete copy.tokenHash;
  return copy;
}

function requirePayload(value, message) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpsError("invalid-argument", message);
  }
  return cleanJson(value);
}

async function readCollection(ref) {
  const snapshot = await ref.get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...cleanJson(doc.data()) }));
}

async function readLegacyPayload() {
  const snapshot = await systemRef.get();
  return snapshot.exists ? cleanJson(snapshot.get("payload") ?? null) : null;
}

function accessDocId(schoolId, accessId) {
  return cleanId(`${schoolId}__${accessId}`);
}

function normalizedSchoolAccesses(accessos, fallbackAccess) {
  const list = (Array.isArray(accessos) && accessos.length ? accessos : [fallbackAccess]).map((access, index) => ({
    ...access,
    nivel: access?.nivel === "principal" ? "principal" : access?.nivel === "secundario" ? "secundario" : index === 0 ? "principal" : "secundario",
  }));
  if (!list.some((access) => access.nivel === "principal")) {
    list[0] = { ...list[0], nivel: "principal" };
  }
  return list;
}

async function ensureSeparatedDatabase() {
  const config = await configRef.get();
  if (config.exists && config.get("databaseModel") === "separated-v2") return;

  const [legacyPayload, users, schools] = await Promise.all([
    readLegacyPayload(),
    usersRef.limit(1).get(),
    schoolsRef.limit(1).get(),
  ]);

  if (!legacyPayload) {
    if (!users.empty || !schools.empty) {
      await configRef.set({ databaseModel: "separated-v2", updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    }
    return;
  }

  await saveFullPayload(legacyPayload, { skipMigrationCheck: true });
  const legacyHistories = await readCollection(historiesRef);
  const batch = db.batch();
  for (const history of [...(legacyPayload.historicos ?? []), ...legacyHistories.map((item) => item.payload ?? item)]) {
    if (!history?.id) continue;
    batch.set(historiesRef.doc(`historico-${cleanId(history.id)}`), { payload: cleanJson(history), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  }
  batch.set(configRef, { databaseModel: "separated-v2", migratedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  batch.set(systemRef, { databaseModel: "separated-v2", payload: FieldValue.delete(), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  await batch.commit();
}

async function readHistories() {
  await ensureSeparatedDatabase();
  const snapshot = await historiesRef.get();
  return snapshot.docs
    .filter((item) => item.id.startsWith("historico-"))
    .map((item) => item.get("payload"))
    .filter(Boolean)
    .map(cleanJson);
}

async function readData() {
  await ensureSeparatedDatabase();
  const [configSnapshot, userDocs, schoolDocs, accessDocs, folderDocs, modelDocs, transferDocs, histories] = await Promise.all([
    configRef.get(),
    readCollection(usersRef),
    readCollection(schoolsRef),
    readCollection(schoolAccessesRef),
    readCollection(foldersRef),
    readCollection(modelsRef),
    readCollection(transfersRef),
    readHistories(),
  ]);

  const owner = userDocs.find((user) => user.role === "owner" || user.id === "owner");
  const managers = userDocs.filter((user) => user.role === "manager");
  const accessBySchool = new Map();
  for (const access of accessDocs) {
    const schoolId = access.schoolId;
    if (!schoolId) continue;
    const list = accessBySchool.get(schoolId) ?? [];
    list.push({
      ...stripPasswordFields(access),
      id: access.accessId || access.id,
      usuario: access.usuario || "",
      email: access.email || "",
      cpf: access.cpf || "",
      senha: passwordMask,
      nivel: access.nivel || "",
      mustChangePassword: access.mustChangePassword ?? false,
      createdAt: access.createdAt || new Date().toISOString(),
    });
    accessBySchool.set(schoolId, list);
  }

  const escolas = schoolDocs.map((school) => {
    const accessos = (accessBySchool.get(school.id) ?? [])
      .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))
      .map((access, index) => ({ ...access, nivel: access.nivel === "principal" ? "principal" : access.nivel === "secundario" ? "secundario" : index === 0 ? "principal" : "secundario" }));
    const primaryAccess = accessos[0];
    return {
      ...stripPasswordFields(school),
      id: school.id,
      usuario: primaryAccess?.usuario || school.usuario || "",
      senha: passwordMask,
      tipo: school.tipo || "municipal",
      ativo: school.ativo ?? true,
      escola: school.escola ?? {},
      createdAt: school.createdAt || new Date().toISOString(),
      mustChangePassword: primaryAccess?.mustChangePassword ?? false,
      accessos,
    };
  });

  return {
    escola: configSnapshot.exists ? (configSnapshot.get("escola") ?? escolas[0]?.escola) : escolas[0]?.escola,
    escolas,
    folders: folderDocs.map(stripPasswordFields),
    modelos: Object.fromEntries(modelDocs.map((model) => [model.schoolId || model.id, stripPasswordFields(model)])),
    historicos: histories,
    transferencias: transferDocs.map(stripPasswordFields),
    admin: owner ? {
      usuario: owner.usuario || "",
      nome: owner.nome || owner.usuario || "",
      email: owner.email || "",
      cpf: owner.cpf || "",
      senha: passwordMask,
      mustChangePassword: owner.mustChangePassword ?? false,
    } : null,
    adminUsers: managers.map((user) => ({
      ...stripPasswordFields(user),
      id: user.id,
      nome: user.nome || user.usuario || "",
      usuario: user.usuario || "",
      email: user.email || "",
      cpf: user.cpf || "",
      senha: passwordMask,
      crede: user.crede || "CREDE 20 - BREJO SANTO",
      nivel: "gestao",
      ativo: user.ativo ?? true,
      mustChangePassword: user.mustChangePassword ?? false,
      createdAt: user.createdAt || new Date().toISOString(),
    })),
  };
}

async function saveFullPayload(payload, options = {}) {
  if (!options.skipMigrationCheck) await ensureSeparatedDatabase();
  const data = requirePayload(payload, "Dados inválidos.");
  const now = FieldValue.serverTimestamp();
  const [existingUsers, existingAccesses, currentUsers, currentSchools, currentAccesses, currentFolders, currentModels, currentTransfers] = await Promise.all([
    readCollection(usersRef),
    readCollection(schoolAccessesRef),
    readCollection(usersRef),
    readCollection(schoolsRef),
    readCollection(schoolAccessesRef),
    readCollection(foldersRef),
    readCollection(modelsRef),
    readCollection(transfersRef),
  ]);
  const existingUsersById = new Map(existingUsers.map((item) => [item.id, item]));
  const existingAccessesByKey = new Map(existingAccesses.map((item) => [`${item.schoolId}:${item.accessId || item.id}`, item]));
  const writes = [];
  const keepUserIds = new Set(["owner"]);
  const keepSchoolIds = new Set();
  const keepAccessIds = new Set();
  const keepFolderIds = new Set();
  const keepModelIds = new Set();
  const keepTransferIds = new Set();

  if (data.admin?.usuario) {
    const owner = existingUsersById.get("owner") ?? {};
    writes.push(usersRef.doc("owner").set({
      role: "owner",
      usuario: normalizeText(data.admin.usuario),
      nome: normalizeText(data.admin.nome || data.admin.usuario),
      email: normalizeEmail(data.admin.email),
      cpf: digitsOnly(data.admin.cpf),
      ativo: true,
      mustChangePassword: data.admin.mustChangePassword ?? false,
      createdAt: owner.createdAt || new Date().toISOString(),
      updatedAt: now,
      ...createPasswordFields(data.admin.senha, owner),
    }, { merge: true }));
  }

  for (const user of data.adminUsers ?? []) {
    const id = cleanId(user.id);
    keepUserIds.add(id);
    const existing = existingUsersById.get(id) ?? {};
    writes.push(usersRef.doc(id).set({
      role: "manager",
      nome: normalizeText(user.nome),
      usuario: normalizeText(user.usuario),
      email: normalizeEmail(user.email),
      cpf: digitsOnly(user.cpf),
      crede: normalizeText(user.crede || "CREDE 20 - BREJO SANTO"),
      nivel: "gestao",
      ativo: user.ativo ?? true,
      mustChangePassword: user.mustChangePassword ?? false,
      createdAt: user.createdAt || existing.createdAt || new Date().toISOString(),
      updatedAt: now,
      ...createPasswordFields(user.senha, existing),
    }, { merge: true }));
  }

  for (const school of data.escolas ?? []) {
    const schoolId = cleanId(school.id);
    keepSchoolIds.add(schoolId);
    const accessos = normalizedSchoolAccesses(school.accessos, { id: `${schoolId}-principal`, usuario: school.usuario, senha: school.senha, nivel: "principal", mustChangePassword: school.mustChangePassword });
    writes.push(schoolsRef.doc(schoolId).set({
      id: schoolId,
      tipo: school.tipo || "municipal",
      ativo: school.ativo ?? true,
      escola: cleanJson(school.escola ?? {}),
      createdAt: school.createdAt || new Date().toISOString(),
      updatedAt: now,
    }, { merge: true }));
    for (const access of accessos) {
      const accessId = cleanId(access.id || `${schoolId}-principal`);
      const docId = accessDocId(schoolId, accessId);
      keepAccessIds.add(docId);
      const existing = existingAccessesByKey.get(`${schoolId}:${accessId}`) ?? {};
      writes.push(schoolAccessesRef.doc(docId).set({
        schoolId,
        accessId,
        usuario: normalizeText(access.usuario || school.usuario),
        email: normalizeEmail(access.email),
        cpf: digitsOnly(access.cpf),
        tipo: school.tipo || "municipal",
        nivel: access.nivel,
        ativo: school.ativo ?? true,
        mustChangePassword: access.mustChangePassword ?? false,
        createdAt: access.createdAt || existing.createdAt || new Date().toISOString(),
        updatedAt: now,
        ...createPasswordFields(access.senha || school.senha, existing),
      }, { merge: true }));
    }
  }

  for (const folder of data.folders ?? []) {
    const id = cleanId(folder.id);
    keepFolderIds.add(id);
    writes.push(foldersRef.doc(id).set({ ...cleanJson(folder), updatedAt: now }, { merge: true }));
  }

  for (const [schoolId, model] of Object.entries(data.modelos ?? {})) {
    const id = cleanId(schoolId);
    keepModelIds.add(id);
    writes.push(modelsRef.doc(id).set({
      ...cleanJson(model),
      schoolId: id,
      updatedAt: now,
    }, { merge: true }));
  }

  for (const transfer of data.transferencias ?? []) {
    const id = cleanId(transfer.id);
    keepTransferIds.add(id);
    writes.push(transfersRef.doc(id).set({ ...cleanJson(transfer), updatedAt: now }, { merge: true }));
  }

  for (const history of data.historicos ?? []) {
    if (!history?.id) continue;
    writes.push(historiesRef.doc(`historico-${cleanId(history.id)}`).set({ payload: cleanJson(history), updatedAt: now }, { merge: true }));
  }

  for (const item of currentUsers) {
    if (item.role === "owner" || keepUserIds.has(item.id)) continue;
    writes.push(usersRef.doc(item.id).delete());
  }
  for (const item of currentSchools) {
    if (!keepSchoolIds.has(item.id)) writes.push(schoolsRef.doc(item.id).delete());
  }
  for (const item of currentAccesses) {
    if (!keepAccessIds.has(item.id)) writes.push(schoolAccessesRef.doc(item.id).delete());
  }
  for (const item of currentFolders) {
    if (!keepFolderIds.has(item.id)) writes.push(foldersRef.doc(item.id).delete());
  }
  for (const item of currentModels) {
    if (!keepModelIds.has(item.id)) writes.push(modelsRef.doc(item.id).delete());
  }
  for (const item of currentTransfers) {
    if (!keepTransferIds.has(item.id)) writes.push(transfersRef.doc(item.id).delete());
  }

  writes.push(configRef.set({
    databaseModel: "separated-v2",
    escola: cleanJson(data.escola ?? data.escolas?.[0]?.escola ?? null),
    updatedAt: now,
  }, { merge: true }));
  writes.push(systemRef.set({ databaseModel: "separated-v2", payload: FieldValue.delete(), updatedAt: now }, { merge: true }));
  await Promise.all(writes);
}

async function saveSchoolPayload(payload, session) {
  await ensureSeparatedDatabase();
  const schoolId = session.schoolId;
  const incoming = requirePayload(payload, "Dados inválidos.");
  const incomingSchool = (incoming.escolas ?? []).find((school) => school.id === schoolId);
  if (incomingSchool) {
    await schoolsRef.doc(schoolId).set({
      id: schoolId,
      tipo: incomingSchool.tipo || "municipal",
      ativo: incomingSchool.ativo ?? true,
      escola: cleanJson(incomingSchool.escola ?? {}),
      createdAt: incomingSchool.createdAt || new Date().toISOString(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  }

  const currentTransfers = await readCollection(transfersRef);
  const incomingTransfers = (incoming.transferencias ?? []).filter((request) =>
    request.fromSchoolId === schoolId || request.toSchoolId === schoolId,
  );
  const keepIncomingTransferIds = new Set(incomingTransfers.map((item) => item.id));
  await Promise.all([
    ...(incoming.folders ?? []).filter((folder) => folder.schoolId === schoolId).map((folder) =>
      foldersRef.doc(cleanId(folder.id)).set({ ...cleanJson(folder), updatedAt: FieldValue.serverTimestamp() }, { merge: true }),
    ),
    incoming.modelos?.[schoolId] && session.accessLevel === "principal"
      ? modelsRef.doc(schoolId).set({ ...cleanJson(incoming.modelos[schoolId]), schoolId, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
      : Promise.resolve(),
    ...incomingTransfers.map((transfer) =>
      transfersRef.doc(cleanId(transfer.id)).set({ ...cleanJson(transfer), updatedAt: FieldValue.serverTimestamp() }, { merge: true }),
    ),
    ...currentTransfers
      .filter((transfer) => (transfer.fromSchoolId === schoolId || transfer.toSchoolId === schoolId) && !keepIncomingTransferIds.has(transfer.id))
      .map((transfer) => transfersRef.doc(cleanId(transfer.id)).delete()),
  ]);
}

async function issueSession(session) {
  const token = createToken();
  const tokenHash = hashValue(token);
  const now = Date.now();
  await sessionsRef.doc(tokenHash).set({
    ...cleanJson(session),
    tokenHash,
    createdAt: now,
    lastSeen: now,
    expiresAt: now + sessionTtlMs,
  });
  return cleanJson({ ...session, sessionToken: token });
}

async function requireSession(request) {
  const token = String(request.data?.sessionToken ?? "").trim();
  if (!token) throw new HttpsError("unauthenticated", "Entre no sistema.");
  const snapshot = await sessionsRef.doc(hashValue(token)).get();
  const session = snapshot.exists ? snapshot.data() : null;
  if (!session || (session.expiresAt && session.expiresAt < Date.now())) {
    throw new HttpsError("unauthenticated", "Entre novamente no sistema.");
  }
  await sessionsRef.doc(hashValue(token)).set({
    lastSeen: Date.now(),
    expiresAt: Date.now() + sessionTtlMs,
  }, { merge: true });
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
    senha: passwordMask,
    tipo: account.tipo,
    ativo: account.ativo,
    escola: account.escola,
    createdAt: account.createdAt,
    mustChangePassword: false,
    accessos: [],
  };
}

function roleLabel(session) {
  if (session.role === "owner") return "Administrador";
  if (session.role === "manager") return "Responsável";
  return "Escola";
}

async function schoolNameForId(schoolId) {
  if (!schoolId) return "";
  const snapshot = await schoolsRef.doc(String(schoolId)).get();
  return snapshot.exists ? normalizeText(snapshot.get("escola.nome") || "") : "";
}

async function writeActivity(session, input) {
  if (session.role === "owner") return;
  const clean = cleanJson(input ?? {});
  const tipo = normalizeText(clean.tipo || "ACAO");
  if (["LOGIN", "SAIDA", "SENHA"].includes(tipo)) return;
  const schoolId = clean.schoolId || session.schoolId || "";
  const schoolName = clean.schoolName || await schoolNameForId(schoolId);
  const createdAt = Date.now();
  await activityRef.add({
    tipo,
    descricao: String(clean.descricao || "Ação registrada.").trim(),
    usuario: normalizeText(session.nome || ""),
    perfil: session.role,
    perfilNome: roleLabel(session),
    schoolId,
    schoolName,
    targetId: clean.targetId || "",
    targetName: normalizeText(clean.targetName || ""),
    createdAt,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

function cleanActivityDoc(doc) {
  const data = cleanJson(doc.data());
  return {
    id: doc.id,
    tipo: data.tipo || "",
    descricao: data.descricao || "",
    usuario: data.usuario || "",
    perfil: data.perfil || "school",
    perfilNome: data.perfilNome || "",
    schoolId: data.schoolId || "",
    schoolName: data.schoolName || "",
    targetId: data.targetId || "",
    targetName: data.targetName || "",
    createdAt: data.createdAt || "",
  };
}

async function readActiveUsers() {
  const cutoff = Date.now() - 1000 * 60 * 4;
  const [sessionSnapshot, schools] = await Promise.all([sessionsRef.get(), readCollection(schoolsRef)]);
  return sessionSnapshot.docs
    .map((doc) => ({ id: doc.id, ...cleanJson(doc.data()) }))
    .filter((session) => session.role !== "owner" && session.lastSeen && session.lastSeen >= cutoff && (!session.expiresAt || session.expiresAt >= Date.now()))
    .map((session) => {
      const school = schools.find((item) => item.id === session.schoolId);
      return {
        id: session.id,
        usuario: normalizeText(session.nome || ""),
        perfil: session.role || "school",
        perfilNome: roleLabel(session),
        schoolId: session.schoolId || "",
        schoolName: session.schoolName || normalizeText(school?.escola?.nome || ""),
        currentView: session.currentView || "",
        actionLabel: session.actionLabel || "Online agora",
        targetName: normalizeText(session.targetName || ""),
        lastSeen: session.lastSeen,
      };
    })
    .sort((a, b) => Number(b.lastSeen || 0) - Number(a.lastSeen || 0));
}

function viewForSession(data, session) {
  if (isPrivileged(session)) return { payload: data, histories: data.historicos ?? [] };
  if (session.role !== "school" || !session.schoolId) {
    throw new HttpsError("permission-denied", "Acesso não autorizado.");
  }
  const schoolId = session.schoolId;
  const ownHistories = (data.historicos ?? []).filter((record) => record?.schoolId === schoolId);
  const filtered = {
    ...data,
    escola: (data.escolas ?? []).find((school) => school.id === schoolId)?.escola ?? data.escola,
    escolas: (data.escolas ?? []).map((school) => cleanSchoolForDirectory(school, schoolId)),
    folders: (data.folders ?? []).filter((folder) => folder.schoolId === schoolId),
    modelos: data.modelos?.[schoolId] ? { [schoolId]: data.modelos[schoolId] } : {},
    historicos: ownHistories,
    transferencias: (data.transferencias ?? []).filter((request) =>
      request.fromSchoolId === schoolId || request.toSchoolId === schoolId,
    ),
    admin: null,
    adminUsers: [],
  };
  return { payload: filtered, histories: ownHistories };
}

async function findRestrictedAccess(credentials) {
  await ensureSeparatedDatabase();
  const usuario = normalizeText(credentials?.usuario);
  const senha = String(credentials?.senha ?? "").trim();
  if (!usuario || !senha) return null;
  const users = await readCollection(usersRef);
  const owner = users.find((user) => (user.role === "owner" || user.id === "owner") && user.usuario === usuario);
  if (owner && verifyPassword(senha, owner)) return { role: "owner", nome: owner.nome || usuario };
  const manager = users.find((user) =>
    user.role === "manager" && user.ativo !== false && user.usuario === usuario && verifyPassword(senha, user),
  );
  if (!manager) return null;
  return { role: "manager", nome: manager.nome || manager.usuario, adminUserId: manager.id };
}

async function findSchoolAccess(credentials) {
  await ensureSeparatedDatabase();
  const usuario = normalizeText(credentials?.usuario);
  const senha = String(credentials?.senha ?? "").trim();
  const tipo = String(credentials?.tipo ?? "");
  if (!usuario || !senha || !["municipal", "estadual", "privada"].includes(tipo)) return null;
  const [schools, accesses] = await Promise.all([readCollection(schoolsRef), readCollection(schoolAccessesRef)]);
  const normalizedAccesses = accesses
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))
    .map((access, index, list) => {
      const sameSchoolBefore = list.slice(0, index).some((item) => item.schoolId === access.schoolId);
      const fallbackLevel = sameSchoolBefore ? "secundario" : "principal";
      return { ...access, nivel: access.nivel === "principal" ? "principal" : access.nivel === "secundario" ? "secundario" : fallbackLevel };
    });
  for (const access of normalizedAccesses) {
    if (access.usuario !== usuario || access.tipo !== tipo || access.ativo === false || !verifyPassword(senha, access)) continue;
    const school = schools.find((item) => item.id === access.schoolId && item.ativo !== false && item.tipo === tipo);
    if (!school) continue;
    return { role: "school", nome: access.usuario, schoolId: school.id, accessId: access.accessId || access.id, accessLevel: access.nivel === "principal" ? "principal" : "secundario" };
  }
  return null;
}

function patchOwnVisiblePassword(data, session, password) {
  if (session.role === "owner" && data.admin) return { ...data, admin: { ...data.admin, senha: password } };
  if (session.role === "manager") {
    return {
      ...data,
      adminUsers: (data.adminUsers ?? []).map((user) => user.id === session.adminUserId ? { ...user, senha: password } : user),
    };
  }
  if (session.role === "school") {
    return {
      ...data,
      escolas: (data.escolas ?? []).map((school) => {
        if (school.id !== session.schoolId) return school;
        const accessos = (school.accessos ?? []).map((access) =>
          access.id === session.accessId ? { ...access, senha: password } : access,
        );
        const primary = accessos[0] ?? {};
        return { ...school, accessos, senha: primary.senha ?? school.senha };
      }),
    };
  }
  return data;
}

exports.getSetupStatus = onCall({ region }, async () => {
  await ensureSeparatedDatabase();
  const users = await readCollection(usersRef);
  return { hasAdmin: users.some((user) => user.role === "owner" || user.id === "owner") };
});

exports.createOwner = onCall({ region }, async (request) => {
  await ensureSeparatedDatabase();
  const users = await readCollection(usersRef);
  if (users.some((user) => user.role === "owner" || user.id === "owner")) {
    throw new HttpsError("already-exists", "Acesso restrito já foi criado.");
  }
  const usuario = normalizeText(request.data?.usuario);
  const email = normalizeEmail(request.data?.email);
  const cpf = digitsOnly(request.data?.cpf);
  const senha = String(request.data?.senha ?? "").trim();
  if (!usuario || senha.length < 6) {
    throw new HttpsError("invalid-argument", "Informe usuário e senha com pelo menos 6 caracteres.");
  }
  const nome = normalizeText(request.data?.nome || usuario);
  await usersRef.doc("owner").set({
    role: "owner",
    nome,
    usuario,
    email,
    cpf,
    ativo: true,
    mustChangePassword: false,
    createdAt: new Date().toISOString(),
    updatedAt: FieldValue.serverTimestamp(),
    ...createPasswordFields(senha),
  }, { merge: true });
  const session = await issueSession({ role: "owner", nome });
  const data = patchOwnVisiblePassword(await readData(), session, senha);
  return { session, payload: data, histories: data.historicos ?? [] };
});

exports.loginRestricted = onCall({ region }, async (request) => {
  const senha = String(request.data?.senha ?? "").trim();
  const access = await findRestrictedAccess(request.data);
  if (!access) throw new HttpsError("permission-denied", "Usuário ou senha incorretos.");
  const session = await issueSession(access);
  const data = patchOwnVisiblePassword(await readData(), session, senha);
  return { session, payload: data, histories: data.historicos ?? [] };
});

exports.recoverSchoolPassword = onCall({ region }, async (request) => {
  await ensureSeparatedDatabase();
  const usuario = normalizeText(request.data?.usuario);
  const email = normalizeEmail(request.data?.email);
  const cpf = digitsOnly(request.data?.cpf);
  const tipo = String(request.data?.tipo ?? "");
  if (!usuario || !email || cpf.length !== 11 || !["municipal", "estadual", "privada"].includes(tipo)) {
    throw new HttpsError("invalid-argument", "Informe rede, Login, E-mail e CPF.");
  }
  const [schools, accesses] = await Promise.all([
    readCollection(schoolsRef),
    readCollection(schoolAccessesRef),
  ]);
  const found = accesses.find((access) => {
    const school = schools.find((item) => item.id === access.schoolId);
    return access.ativo !== false &&
      school?.ativo !== false &&
      access.tipo === tipo &&
      access.usuario === usuario &&
      normalizeEmail(access.email) === email &&
      digitsOnly(access.cpf) === cpf;
  });
  if (!found) {
    throw new HttpsError("permission-denied", "Dados não encontrados.");
  }
  const accessId = cleanId(found.accessId || found.id);
  await schoolAccessesRef.doc(accessDocId(found.schoolId, accessId)).set({
    ...createPasswordFields("123456"),
    mustChangePassword: true,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  return { ok: true };
});

exports.loginSchool = onCall({ region }, async (request) => {
  const senha = String(request.data?.senha ?? "").trim();
  const access = await findSchoolAccess(request.data);
  if (!access) throw new HttpsError("permission-denied", "Usuário, senha ou rede da escola incorretos.");
  const session = await issueSession(access);
  const data = patchOwnVisiblePassword(await readData(), session, senha);
  return { session, ...viewForSession(data, access) };
});

exports.logoutSession = onCall({ region }, async (request) => {
  const token = String(request.data?.sessionToken ?? "").trim();
  if (token) {
    const ref = sessionsRef.doc(hashValue(token));
    await ref.delete();
  }
  return { ok: true };
});

exports.changePassword = onCall({ region }, async (request) => {
  const session = await requireSession(request);
  const currentPassword = String(request.data?.currentPassword ?? "").trim();
  const nextPassword = String(request.data?.nextPassword ?? "").trim();
  const firstAccess = Boolean(request.data?.firstAccess);
  if (nextPassword.length < 6 || nextPassword === "123456") {
    throw new HttpsError("invalid-argument", "Crie uma senha com pelo menos 6 caracteres e diferente da senha provisória.");
  }
  if (session.role === "owner" || session.role === "manager") {
    const docId = session.role === "owner" ? "owner" : cleanId(session.adminUserId);
    const ref = usersRef.doc(docId);
    const snapshot = await ref.get();
    const credential = snapshot.exists ? snapshot.data() : null;
    if (!credential || (!firstAccess && !verifyPassword(currentPassword, credential))) {
      throw new HttpsError("permission-denied", "Senha atual incorreta.");
    }
    await ref.set({
      ...createPasswordFields(nextPassword),
      mustChangePassword: false,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    return { ok: true };
  }
  if (session.role === "school") {
    const accessId = cleanId(session.accessId || `${session.schoolId}-principal`);
    const ref = schoolAccessesRef.doc(accessDocId(session.schoolId, accessId));
    const snapshot = await ref.get();
    const credential = snapshot.exists ? snapshot.data() : null;
    if (!credential || (!firstAccess && !verifyPassword(currentPassword, credential))) {
      throw new HttpsError("permission-denied", "Senha atual incorreta.");
    }
    await ref.set({
      ...createPasswordFields(nextPassword),
      mustChangePassword: false,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    return { ok: true };
  }
  throw new HttpsError("permission-denied", "Acesso não autorizado.");
});

exports.updateProfile = onCall({ region }, async (request) => {
  const session = await requireSession(request);
  if (session.role !== "owner" && session.role !== "manager") {
    throw new HttpsError("permission-denied", "Acesso não autorizado.");
  }
  const nome = normalizeText(request.data?.nome);
  const email = normalizeEmail(request.data?.email);
  const cpf = digitsOnly(request.data?.cpf);
  if (!nome) throw new HttpsError("invalid-argument", "Informe o nome.");
  if (email && cpf.length !== 11) throw new HttpsError("invalid-argument", "Informe um CPF válido.");
  const docId = session.role === "owner" ? "owner" : cleanId(session.adminUserId);
  await usersRef.doc(docId).set({ nome, email, cpf, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  const token = String(request.data?.sessionToken ?? "").trim();
  if (token) await sessionsRef.doc(hashValue(token)).set({ nome }, { merge: true });
  return { ok: true, nome };
});

exports.loadSystemState = onCall({ region }, async (request) => {
  const session = await requireSession(request);
  const data = await readData();
  return { payload: viewForSession(data, session).payload };
});

exports.pingActivity = onCall({ region }, async (request) => {
  const session = await requireSession(request);
  const token = String(request.data?.sessionToken ?? "").trim();
  const schoolName = request.data?.schoolName || await schoolNameForId(session.schoolId);
  const patch = {
    currentView: String(request.data?.currentView ?? "").slice(0, 80),
    actionLabel: String(request.data?.actionLabel ?? "Online agora").slice(0, 120),
    targetId: String(request.data?.targetId ?? "").slice(0, 120),
    targetName: normalizeText(request.data?.targetName || ""),
    schoolName: normalizeText(schoolName),
    lastSeen: Date.now(),
  };
  if (token) await sessionsRef.doc(hashValue(token)).set(patch, { merge: true });
  return { ok: true };
});

exports.recordActivity = onCall({ region }, async (request) => {
  const session = await requireSession(request);
  const activity = requirePayload(request.data?.activity, "Ação inválida.");
  await writeActivity(session, activity);
  return { ok: true };
});

exports.loadActivity = onCall({ region }, async (request) => {
  const session = await requireSession(request);
  if (!isPrivileged(session)) throw new HttpsError("permission-denied", "Acesso não autorizado.");
  const [activeUsers, activitySnapshot] = await Promise.all([
    readActiveUsers(),
    activityRef.orderBy("createdAt", "desc").limit(160).get(),
  ]);
  const hiddenTypes = new Set(["LOGIN", "SAIDA", "SENHA"]);
  return {
    activeUsers,
    activities: activitySnapshot.docs.map(cleanActivityDoc).filter((item) => item.perfil !== "owner" && !hiddenTypes.has(item.tipo)).slice(0, 80),
  };
});

exports.deleteActivity = onCall({ region }, async (request) => {
  const session = await requireSession(request);
  if (!isPrivileged(session)) throw new HttpsError("permission-denied", "Acesso não autorizado.");
  if (request.data?.all) {
    const snapshot = await activityRef.limit(450).get();
    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    return { ok: true };
  }
  const id = cleanId(request.data?.id);
  await activityRef.doc(id).delete();
  return { ok: true };
});

exports.saveSystemState = onCall({ region }, async (request) => {
  const session = await requireSession(request);
  const payload = requirePayload(request.data?.payload, "Dados inválidos.");
  if (isPrivileged(session)) {
    await saveFullPayload(payload);
    return { ok: true };
  }
  if (session.role !== "school" || !session.schoolId) throw new HttpsError("permission-denied", "Acesso não autorizado.");
  await saveSchoolPayload(payload, session);
  return { ok: true };
});

exports.loadHistories = onCall({ region }, async (request) => {
  const session = await requireSession(request);
  const data = await readData();
  return { histories: viewForSession(data, session).histories };
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
  if (!Array.isArray(histories)) throw new HttpsError("invalid-argument", "Históricos inválidos.");
  await Promise.all(histories.map((history) => {
    const payload = requirePayload(history, "Histórico inválido.");
    const id = cleanId(payload.id);
    if (!isPrivileged(session) && payload.schoolId !== session.schoolId) {
      throw new HttpsError("permission-denied", "Histórico de outra escola.");
    }
    return historiesRef.doc(`historico-${id}`).set({ payload, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  }));
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
