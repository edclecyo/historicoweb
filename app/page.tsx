"use client";

import { Fragment, useEffect, useId, useMemo, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import {
  changeCloudPassword,
  createCloudOwner,
  deleteCloudHistory,
  firebaseEnabled,
  loadCloudActivity,
  loadCloudHistories,
  loadCloudSetupStatus,
  loadCloudState,
  deleteCloudActivity,
  loginCloudAdmin,
  loginCloudSchool,
  logoutCloudSession,
  pingCloudActivity,
  recordCloudActivity,
  saveCloudHistories,
  saveCloudHistory,
  saveCloudState,
  setCloudSessionToken,
  updateCloudProfile,
  recoverCloudSchoolPassword,
  type CloudActiveUser,
  type CloudActivity,
} from "./firebase";

type Area =
  | "Linguagens e Codigos"
  | "Cultura e Sociedade"
  | "Ciencias Naturais e Matematica"
  | "Parte Diversificada";

type ComponentRow = {
  id: string;
  area: Area;
  nome: string;
  inicio: number;
  fim: number;
  avaliativo: boolean;
};

type School = {
  estado: string;
  municipio: string;
  nome: string;
  mantenedora: string;
  codigo: string;
  credenciamento: string;
  autorizacao: string;
  reconhecimento: string;
  parecer: string;
  validade: string;
  logoSistema: string;
  logo: string;
  marcaDagua: string;
  carimboEscola: string;
  diretor: string;
  registroDiretor: string;
  assinaturaDiretor: string;
  secretario: string;
  registroSecretario: string;
  assinaturaSecretario: string;
};

type SchoolImageKey = "logoSistema" | "logo" | "marcaDagua" | "carimboEscola" | "assinaturaDiretor" | "assinaturaSecretario";

const schoolImageKeys: SchoolImageKey[] = [
  "logoSistema",
  "logo",
  "marcaDagua",
  "carimboEscola",
  "assinaturaDiretor",
  "assinaturaSecretario",
];

type SchoolKind = "municipal" | "estadual" | "privada";
type SchoolAccessLevel = "principal" | "secundario";

const schoolKindOptions: Array<{ value: SchoolKind; label: string }> = [
  { value: "municipal", label: "Municipal" },
  { value: "estadual", label: "Estadual" },
  { value: "privada", label: "Privada" },
];

type IbgeState = {
  id: number;
  sigla: string;
  nome: string;
};

type IbgeCity = {
  id: number;
  nome: string;
};

type SchoolDirectoryItem = {
  nome: string;
  municipio: string;
  estado: string;
  codigo?: string;
  rede?: string;
};

type SchoolAccess = {
  id: string;
  usuario: string;
  email: string;
  cpf: string;
  senha: string;
  nivel: SchoolAccessLevel;
  mustChangePassword: boolean;
  createdAt: string;
};

type SchoolAccount = {
  id: string;
  usuario: string;
  senha: string;
  tipo: SchoolKind;
  ativo: boolean;
  escola: School;
  createdAt: string;
  mustChangePassword: boolean;
  accessos: SchoolAccess[];
};

type Student = {
  nome: string;
  idAluno: string;
  nascimento: string;
  nacionalidade: string;
  naturalidadeCidade: string;
  naturalidadeEstado: string;
  identidade: string;
  pai: string;
  paiNaoDeclarado: boolean;
  mae: string;
};

type SchoolLegal = Pick<
  School,
  "credenciamento" | "autorizacao" | "reconhecimento" | "parecer" | "validade"
>;

type StudyRow = {
  serie: string;
  ativo: boolean;
  ano: string;
  escola: string;
  cidade: string;
  estado: string;
};

type WorkloadRow = {
  oferta: string;
  frequencia: string;
  percentual: string;
  manualPercentual: boolean;
};

type Certificate = {
  preencher: boolean;
  etapa: string;
  anoConclusao: string;
  prosseguimento: string;
  complemento: string;
  texto: string;
  editado: boolean;
};

type Folder = {
  id: string;
  schoolId: string;
  anoLetivo: string;
  nome: string;
  tipoEnsino: string;
};

type HistoryRecord = {
  id: string;
  schoolId: string;
  codigo: string;
  folderId: string;
  anoLetivo: string;
  status: "Rascunho" | "Em preenchimento" | "Conferido" | "Emitido";
  updatedAt: string;
  aluno: Student;
  dadosLegais: SchoolLegal;
  matriz: ComponentRow[];
  modeloCores: HistoryModelColors;
  notas: Record<string, Record<number, string>>;
  notasNegritoAnos: Record<number, boolean>;
  resultados: Record<number, string>;
  cargaHoraria: Record<number, WorkloadRow>;
  estudos: StudyRow[];
  certificado: Certificate;
  usarCarimboEscola: boolean;
  usarAssinaturaDiretor: boolean;
  usarAssinaturaSecretario: boolean;
  usarQrCode: boolean;
  observacoes: string[];
  fotosHistorico?: {
    frente: string;
    verso: string;
    texto?: string;
  };
  localData: {
    municipio: string;
    estado: string;
    data: string;
  };
};

type TransferRequest = {
  id: string;
  fromSchoolId: string;
  toSchoolId: string;
  studentName: string;
  studentBirth: string;
  message: string;
  status: "Solicitado" | "Em preparação" | "Enviado" | "Recebido";
  historyId?: string;
  receivedHistoryId?: string;
  hiddenForSchoolIds?: string[];
  createdAt: string;
  updatedAt: string;
};

type AppData = {
  escola: School;
  escolas: SchoolAccount[];
  folders: Folder[];
  historicos: HistoryRecord[];
  transferencias: TransferRequest[];
  admin?: AdminCredentials | null;
  adminUsers?: AdminUser[];
  modelos?: Record<string, HistoryModel>;
};

type HistoryModel = {
  matriz: ComponentRow[];
  cores: HistoryModelColors;
  template?: HistoryRecord;
  updatedAt?: string;
};

type HistoryModelColors = {
  destaque: string;
  apoio: string;
  borda: string;
};

type AuthRole = "owner" | "manager" | "school";

type AuthSession = {
  role: AuthRole;
  nome: string;
  adminUserId?: string;
  schoolId?: string;
  accessId?: string;
  accessLevel?: SchoolAccessLevel;
  sessionToken?: string;
};

type SaveNotice = {
  message: string;
  type: "success" | "error";
};

type AdminCredentials = {
  nome?: string;
  usuario: string;
  email?: string;
  cpf?: string;
  senha: string;
  mustChangePassword?: boolean;
};

type SchoolLoginCredentials = AdminCredentials & {
  tipo: SchoolKind;
};

type AdminUser = {
  id: string;
  nome: string;
  usuario: string;
  email: string;
  cpf: string;
  senha: string;
  crede: string;
  nivel: "gestao";
  ativo: boolean;
  mustChangePassword: boolean;
  createdAt: string;
};

type PhotoHistoryPayload = {
  frente: string;
  verso: string;
  texto: string;
  palavras?: OcrWord[];
  record?: HistoryRecord;
};

type OcrWord = {
  text: string;
  left: number;
  top: number;
  width: number;
  height: number;
  page: number;
};

type OcrRow = {
  page: number;
  top: number;
  height: number;
  words: OcrWord[];
  text: string;
};

type YearColumn = {
  year: number;
  page: number;
  center: number;
};

type PositionedValue = {
  value: string;
  center: number;
};

type HistoryQrValue =
  | { kind: "id"; id: string; codigo?: string }
  | { kind: "record"; record: HistoryRecord };

type FileWriterLike = {
  write: (content: string) => Promise<void>;
  close: () => Promise<void>;
};

type FileHandleLike = {
  kind: "file";
  name: string;
  getFile: () => Promise<File>;
  createWritable: () => Promise<FileWriterLike>;
};

type DirectoryHandleLike = {
  kind: "directory";
  name: string;
  getFileHandle: (name: string, options?: { create?: boolean }) => Promise<FileHandleLike>;
  getDirectoryHandle: (name: string, options?: { create?: boolean }) => Promise<DirectoryHandleLike>;
  entries: () => AsyncIterableIterator<[string, FileHandleLike | DirectoryHandleLike]>;
};

type DirectoryPickerWindow = Window & typeof globalThis & {
  showDirectoryPicker?: (options?: { mode?: "read" | "readwrite" }) => Promise<DirectoryHandleLike>;
};

const years = [1, 2, 3, 4, 5, 6, 7, 8, 9];

const steps = [
  "Aluno",
  "Dados escolares",
  "Notas",
  "Carga horaria",
  "Estudos",
  "Certificado",
  "Conferencia",
];

const defaultSchool: School = {
  estado: "Ceara",
  municipio: "Brejo Santo",
  nome: "E.E.F.T.I PROFESSORA MARIA HERACLIDES LUCENA MIRANDA",
  mantenedora: "Prefeitura Municipal de Brejo Santo - Ceara",
  codigo: "",
  credenciamento: "Credenciamento / Parecer: 0077/2024",
  autorizacao: "Ensino Fundamental autorizado",
  reconhecimento: "Reconhecimento vigente",
  parecer: "0077/2024",
  validade: "31/12/2028",
  logoSistema: "",
  logo: "/model-assets/image1.jpeg",
  marcaDagua: "/model-assets/image2.png",
  carimboEscola: "",
  diretor: "",
  registroDiretor: "",
  assinaturaDiretor: "",
  secretario: "",
  registroSecretario: "",
  assinaturaSecretario: "",
};

const emptySchool: School = {
  estado: "", municipio: "", nome: "", mantenedora: "", codigo: "", credenciamento: "",
  autorizacao: "", reconhecimento: "", parecer: "", validade: "", logoSistema: "", logo: "", marcaDagua: "", carimboEscola: "",
  diretor: "", registroDiretor: "", assinaturaDiretor: "", secretario: "", registroSecretario: "",
  assinaturaSecretario: "",
};

const matrixSeed: ComponentRow[] = [
  { id: "portugues", area: "Linguagens e Codigos", nome: "Lingua Portuguesa", inicio: 1, fim: 9, avaliativo: true },
  { id: "portugues-ii", area: "Linguagens e Codigos", nome: "Portugues II", inicio: 1, fim: 9, avaliativo: true },
  { id: "arte", area: "Linguagens e Codigos", nome: "Arte Educacao", inicio: 1, fim: 9, avaliativo: true },
  { id: "educacao-fisica", area: "Linguagens e Codigos", nome: "Educacao Fisica", inicio: 1, fim: 9, avaliativo: true },
  { id: "ingles", area: "Linguagens e Codigos", nome: "L. Est. Moderna (Ingles)", inicio: 1, fim: 9, avaliativo: true },
  { id: "historia", area: "Cultura e Sociedade", nome: "Historia", inicio: 1, fim: 9, avaliativo: true },
  { id: "geografia", area: "Cultura e Sociedade", nome: "Geografia", inicio: 1, fim: 9, avaliativo: true },
  { id: "religioso", area: "Cultura e Sociedade", nome: "Ensino Religioso", inicio: 1, fim: 9, avaliativo: true },
  { id: "ciencias", area: "Ciencias Naturais e Matematica", nome: "Ciencias Naturais", inicio: 1, fim: 9, avaliativo: true },
  { id: "matematica", area: "Ciencias Naturais e Matematica", nome: "Matematica", inicio: 1, fim: 9, avaliativo: true },
  { id: "matematica-ii", area: "Ciencias Naturais e Matematica", nome: "Matematica II", inicio: 1, fim: 9, avaliativo: true },
  { id: "atividades-artisticas", area: "Parte Diversificada", nome: "Atividades Artisticas, Educacao Corporal e Saude", inicio: 1, fim: 9, avaliativo: true },
  { id: "caerer", area: "Parte Diversificada", nome: "CAER - Consciencia Ambiental e Educacao para as Relacoes Etnico-Raciais", inicio: 1, fim: 9, avaliativo: true },
  { id: "circulo-leitura", area: "Parte Diversificada", nome: "Circulo de Leitura", inicio: 1, fim: 9, avaliativo: true },
  { id: "cultura-digital", area: "Parte Diversificada", nome: "Cultura Digital - Tecnologia e Sociedade", inicio: 1, fim: 9, avaliativo: true },
  { id: "matematica-conectada", area: "Parte Diversificada", nome: "Matematica Conectada", inicio: 1, fim: 9, avaliativo: true },
  { id: "oficina-textos", area: "Parte Diversificada", nome: "Oficina de Textos", inicio: 1, fim: 9, avaliativo: true },
  { id: "oficina-narrativas", area: "Parte Diversificada", nome: "Oficina de Narrativas e Expressoes", inicio: 1, fim: 9, avaliativo: true },
  { id: "portugues-conectado", area: "Parte Diversificada", nome: "Portugues Conectado", inicio: 1, fim: 9, avaliativo: true },
  { id: "projeto-caminhar", area: "Parte Diversificada", nome: "Projeto Caminhar", inicio: 1, fim: 9, avaliativo: true },
  { id: "valorizacao-cultural", area: "Parte Diversificada", nome: "Valorizacao Cultural, Historica e Geografica Brejo Santo", inicio: 1, fim: 9, avaliativo: true },
  { id: "estudo-orientado", area: "Parte Diversificada", nome: "Estudo Orientado", inicio: 1, fim: 9, avaliativo: false },
];

const areaOptions: Area[] = [
  "Linguagens e Codigos",
  "Cultura e Sociedade",
  "Ciencias Naturais e Matematica",
  "Parte Diversificada",
];

const defaultModelColors: HistoryModelColors = {
  destaque: "#d9d9d9",
  apoio: "#eef6f0",
  borda: "#000000",
};

const emptyStudent: Student = {
  nome: "",
  idAluno: "",
  nascimento: "",
  nacionalidade: "BRASILEIRA",
  naturalidadeCidade: defaultSchool.municipio,
  naturalidadeEstado: defaultSchool.estado,
  identidade: "-",
  pai: "",
  paiNaoDeclarado: false,
  mae: "",
};

const noFatherMark = "=/=/=/=/=/=/=/=/=/=/=/=";

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function studentDefaultsForSchool(school: School) {
  return {
    ...emptyStudent,
    nacionalidade: "BRASILEIRA",
    naturalidadeCidade: school.municipio || defaultSchool.municipio,
    naturalidadeEstado: school.estado || defaultSchool.estado,
  };
}

function isSchoolProfileReady(school: School) {
  return Boolean(
    school.nome.trim() &&
    school.codigo.trim() &&
    school.municipio.trim() &&
    school.estado.trim(),
  );
}

function formatDate(value: string) {
  if (!value) return "";
  const [year, month, day] = value.includes("-") ? value.split("-") : value.split("/").reverse();
  if (!year || !month || !day) return value;
  return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
}

function formatActivityTime(value: string | number) {
  const date = typeof value === "number" ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function initialsFor(value: string) {
  const parts = upper(value).split(/\s+/).filter(Boolean);
  if (!parts.length) return "U";
  return `${parts[0]?.[0] ?? ""}${parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : ""}` || "U";
}

function upper(value: string) {
  return value ? value.toLocaleUpperCase("pt-BR") : "";
}

function plain(value: string) {
  return upper(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[|_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactPlain(value: string) {
  return plain(value).replace(/[^A-Z0-9]/g, "");
}

function printCell(value: string | number | null | undefined) {
  const text = upper(String(value ?? "").trim());
  return text || "-";
}

function uppercaseInput(value: string) {
  return value.toLocaleUpperCase("pt-BR");
}

function digitsOnly(value: string) {
  return String(value ?? "").replace(/\D/g, "");
}

function formatCpf(value: string) {
  const digits = digitsOnly(value).slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function normalizeEmail(value: string) {
  return String(value ?? "").trim().toLocaleLowerCase("pt-BR");
}

function normalizeSchoolKind(value?: string): SchoolKind {
  return value === "estadual" || value === "privada" ? value : "municipal";
}

function schoolKindLabel(value?: string) {
  const kind = normalizeSchoolKind(value);
  return schoolKindOptions.find((option) => option.value === kind)?.label ?? "Municipal";
}

function normalizeNoteInput(value: string) {
  return uppercaseInput(value)
    .replace(/\./g, ",")
    .replace(/\s+/g, " ")
    .trim();
}

function isAllowedNoteTyping(value: string) {
  const text = normalizeNoteInput(value);
  if (!text || text === "-") return true;
  if (/[^0-9,]/.test(text)) return true;
  return /^(?:10(?:,0?)?|[0-9](?:,[0-9]?)?)$/.test(text);
}

function isValidNoteValue(value: string) {
  const text = normalizeNoteInput(value);
  if (!text || text === "-") return true;
  if (/[^0-9,]/.test(text)) return true;
  return /^(?:10(?:,0)?|[0-9](?:,[0-9])?)$/.test(text);
}

function formatNoteValue(value: string) {
  const text = normalizeNoteInput(value);
  if (!text || text === "-") return text;
  if (/[^0-9,]/.test(text)) return text;
  if (!isValidNoteValue(text)) return "";
  const [integer, decimal = "0"] = text.split(",");
  return `${integer},${decimal || "0"}`;
}

function safeFileName(value: string) {
  return (upper(value).trim() || "HISTORICOS")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLocaleLowerCase("pt-BR");
}

function safeUpperFileName(value: string) {
  return (upper(value).trim() || "HISTORICOS")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function safePdfTitle(value: string) {
  return (upper(value).trim() || "HISTORICO")
    .replace(/[<>:"/\\|?*\u0000-\u001f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function printWithTitle(title: string) {
  const previousTitle = document.title;
  document.title = safePdfTitle(title);
  window.print();
  window.setTimeout(() => {
    document.title = previousTitle;
  }, 600);
}

const ibgeBaseUrl = "https://servicodados.ibge.gov.br/api/v1/localidades";
const inepSchoolDirectoryUrl = "https://services3.arcgis.com/ba17q0p2zHwzRK3B/ArcGIS/rest/services/inep_escolas_fmt_250609_geocode/FeatureServer/1/query";
const brazilStateFallback: IbgeState[] = [
  { id: 12, sigla: "AC", nome: "Acre" },
  { id: 27, sigla: "AL", nome: "Alagoas" },
  { id: 16, sigla: "AP", nome: "Amapa" },
  { id: 13, sigla: "AM", nome: "Amazonas" },
  { id: 29, sigla: "BA", nome: "Bahia" },
  { id: 23, sigla: "CE", nome: "Ceara" },
  { id: 53, sigla: "DF", nome: "Distrito Federal" },
  { id: 32, sigla: "ES", nome: "Espirito Santo" },
  { id: 52, sigla: "GO", nome: "Goias" },
  { id: 21, sigla: "MA", nome: "Maranhao" },
  { id: 51, sigla: "MT", nome: "Mato Grosso" },
  { id: 50, sigla: "MS", nome: "Mato Grosso do Sul" },
  { id: 31, sigla: "MG", nome: "Minas Gerais" },
  { id: 15, sigla: "PA", nome: "Para" },
  { id: 25, sigla: "PB", nome: "Paraiba" },
  { id: 41, sigla: "PR", nome: "Parana" },
  { id: 26, sigla: "PE", nome: "Pernambuco" },
  { id: 22, sigla: "PI", nome: "Piaui" },
  { id: 33, sigla: "RJ", nome: "Rio de Janeiro" },
  { id: 24, sigla: "RN", nome: "Rio Grande do Norte" },
  { id: 43, sigla: "RS", nome: "Rio Grande do Sul" },
  { id: 11, sigla: "RO", nome: "Rondonia" },
  { id: 14, sigla: "RR", nome: "Roraima" },
  { id: 42, sigla: "SC", nome: "Santa Catarina" },
  { id: 35, sigla: "SP", nome: "Sao Paulo" },
  { id: 28, sigla: "SE", nome: "Sergipe" },
  { id: 17, sigla: "TO", nome: "Tocantins" },
];
let cachedStates: IbgeState[] | null = null;
const cachedCities = new Map<string, IbgeCity[]>();
const cachedSchoolDirectory = new Map<string, SchoolDirectoryItem[]>();
const seedSchoolDirectory: SchoolDirectoryItem[] = [
  "Afonso Tavares de Luna",
  "Ana Furtado da Gloria Escola Municipal",
  "Antonia Lucena de Melo Escola",
  "Antonio Gomes de Santana",
  "Antonio Marcelino de Sousa",
  "Antonio Miguel de Sousa Escola Municipal",
  "Antonio Ne",
  "Apolonia Escola Municipal Sta",
  "Assoc Benef e Assist Pe Pedro Inacio Ribeiro",
  "Balduino Nunes Barreto Escola Municipal",
  "Bartolomeu Madeiro",
  "Bertini Moreira Leite Salviano Escola de Ensino Fundamental",
  "Cassiano Inacio Bezerra",
  "Catequista Maria Alacoque",
  "Centro de Educacao Infantil Professora Maria Ieda Macedo",
  "Centro de Estudos Profissionalizantes - Cep",
  "Centro Educacional Jean Piaget",
  "Centro Educacional Lua de Cristal",
  "Centro Educacional Maranata",
  "Centro Educacional Monteiro Lobato",
  "Centro Educacional Professora Sabina Gomes de Sousa",
  "Centro Educacional Quero Aprender",
  "Centro Educacional Sonho Meu",
  "Centro Tecnico Integrado de Saude",
  "Cicera Martins de Lucena Escola Isol Profa",
  "Cicero Escola Municipal de Pe",
  "Clotildes Moreira Tavares",
  "Colegio Padre Viana",
  "Dr Valdemar Napoleao de Araujo",
  "Educandario Aurelio Buarque",
  "Eeep Balbina Viana Arrais",
  "Eefm Jose Matias Sampaio",
  "Elias Felinto de Lucena",
  "Emilia Ferreiro Centro Educacional",
  "Enoque Belem de Figueiredo Escola Municipal",
  "Enoque Penha Centro de Educacao Infantil",
  "Escola de Ensino Especial",
  "Familia Sagrada",
  "Fca Furtado de Lima Escola Isol",
  "Fonte do Saber-centro de Educacao Infantil",
  "Fonte do Sol Nascente Escola de Ensino Infantil",
  "Francisca Alves Tavares",
  "Francisco de Assis Lucena Escola de Ensino Fundamental",
  "Francisco Leite de Moura",
  "Francisco Ricaom Basilio Lucena",
  "Historiador Padre Antonio Gomes de Araujo",
  "Instituto Educacional Casinha da Crianca Joao Paulo Ii",
  "Instituto Educacional Joao Xxiii",
  "Irma Lucia Centro de Educacao Infantil",
  "Joao Cardoso Ltda Educandario",
  "Joao Frutuoso Cavalcante Escola Municipal",
  "Joao Goncalves de Sousa",
  "Joao Landim da Cruz",
  "Joao Matias de Sousa Escola de Ensino Fundamental",
  "Joao Tavares de Luna",
  "Joao Tavares Moreira Escola Mef",
  "Joaquim de Oliveira Santos Escola Municipal",
  "Joaquim Furtado de Lucena",
  "Joaquim Gomes Basilio",
  "Joaquim Tavares de Luna",
  "Jonas Alves da Costa",
  "Jose Amaro Pinheiro Centro de Ed Infantil",
  "Jose Cardoso Ferreira",
  "Jose Denguinho de Santana Cent Educacional Infantil",
  "Jose Francisco Nogueira",
  "Jose Inacio de Lucena Escola de Ensino Fundamental",
  "Jose Lino Ferreira Escola de Ensino Fundamental",
  "Jose Marcos Escola Municipal",
  "Jose Moreira Tavares",
  "Jose Pereira de Lima Escola de Ensino Fundamental",
  "Josefa Edileuma B Pereira Escola Isolada",
  "Juca Lino",
  "Juvino Ferreira",
  "Lauro Martins Cardoso Escola Municipal",
  "Liceu Professor Jose Teles de Carvalho",
  "Lions Clube de Brejo Santo",
  "Lucia Alves da Silva Escola Isolada",
  "Luzia Leite Basilio Escola de Ensino Fundamental",
  "Major Firmino Inacio de Sousa",
  "Manoel do Nascimento- Centro de Educacao Infantil",
  "Manoel Inacio de Lucena Coronel",
  "Manoel Reginaldo Bezerra Escola de Ensino Fundamental",
  "Maria Benvinda Quental Lucena",
  "Maria Heraclides Lucena Miranda Professora Escola de Ensino Basico",
  "Maria Jose Clube das Maes",
  "Maria Leite de Araujo",
  "Maria Martins de Sousa",
  "Maria Salome Monteiro Centro de Ed Inf Professora",
  "Maria Sonete Andrade Escola de Ensino Fundamental",
  "Mestre Ze Luis Silva Ramos",
  "Morro Dourado",
  "Nezinho Saturnino",
  "Nobilino Alves de Araujo",
  "Nossa Senhora do Santissimo Sacramento",
  "Odilia Estelita da Costa",
  "Olimpio Pereira de Lima Escola de Ensino Fundamental",
  "Padre Pedro Inacio Ribeiro",
  "Paraiso da Crianca Centro de Educacao Infantil",
  "Paulo Freire Escola de 1 Grau",
  "Pedro Geronimo da Silva Escola Municipal",
  "Pedro Martins Cardoso de Morais Escola Municipal",
  "Pedro Vicente de Sousa Escola Municipal",
  "Pequeno Principe - Centro Educacional Infantil",
  "Pergentino Martins de Morais Escola de Ens Fundamental",
  "Pierre Vigne Centro Educacional",
  "Primeiros Passos Instituto Educacional",
  "Professor Joao Teles de Carvalho",
  "Professor Pedro Gomes da Silva Basilio",
  "Professora Maria Leoneide Leandro Lima Creche Proinfancia",
  "Professora Rosa Roberto",
  "Professora Sabina Gomes de Sousa",
  "Raimundo Goncalves Centro de Ed Inf Vereador",
  "Raimundo Moreira Luna Escola de Ensino Fundamental",
  "Refugio Alegria Centro de Educacao Infantil",
  "Regina Leite dos Santos Escola Isol",
  "Romao dos Anjos Monteiro Vasconcelos",
  "Sonho Infantil- Centro de Educacao Infantil",
  "Teresinha Martins Cardoso Centro de Ed Inf",
  "Vida Centro de Educacao Infantil",
  "Vovo do Carme",
  "Vovo Joaquina Centro de Educacao Infantil",
  "Washington Gomes Furtado Escola Municipal",
].map((nome) => ({
  nome: uppercaseInput(nome),
  municipio: "BREJO SANTO",
  estado: "CE",
}));

function findStateCode(states: IbgeState[], value: string) {
  const normalized = compactPlain(value);
  return states.find((state) => compactPlain(state.sigla) === normalized || compactPlain(state.nome) === normalized)?.sigla ?? value;
}

function useBrazilLocations(selectedState: string) {
  const [states, setStates] = useState<IbgeState[]>(cachedStates ?? brazilStateFallback);
  const [cities, setCities] = useState<IbgeCity[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);

  useEffect(() => {
    if (cachedStates) return;
    let cancelled = false;
    fetch(`${ibgeBaseUrl}/estados?orderBy=nome`)
      .then((response) => response.ok ? response.json() as Promise<IbgeState[]> : [])
      .then((items) => {
        if (cancelled) return;
        const nextItems = items.length ? items : brazilStateFallback;
        cachedStates = nextItems;
        setStates(nextItems);
      })
      .catch((error) => console.error("Nao foi possivel carregar os estados.", error));
    return () => { cancelled = true; };
  }, []);

  const stateCode = useMemo(() => findStateCode(states, selectedState), [states, selectedState]);

  useEffect(() => {
    const code = stateCode.trim().toLocaleUpperCase("pt-BR");
    if (!code || code.length !== 2) {
      setCities([]);
      return;
    }
    const saved = cachedCities.get(code);
    if (saved) {
      setCities(saved);
      setLoadingCities(false);
      return;
    }
    let cancelled = false;
    setLoadingCities(true);
    fetch(`${ibgeBaseUrl}/estados/${code}/municipios?orderBy=nome`)
      .then((response) => response.ok ? response.json() as Promise<IbgeCity[]> : [])
      .then((items) => {
        if (cancelled) return;
        cachedCities.set(code, items);
        setCities(items);
        setLoadingCities(false);
      })
      .catch((error) => {
        if (!cancelled) setLoadingCities(false);
        console.error("Nao foi possivel carregar os municipios.", error);
      });
    return () => { cancelled = true; };
  }, [stateCode]);

  return { states, cities, stateCode, loadingCities };
}

function schoolDirectoryKey(municipio: string, estado: string) {
  return `${compactPlain(estado)}|${compactPlain(municipio)}`;
}

function cleanSqlText(value: string) {
  return plain(value).replace(/'/g, "''");
}

function readDirectoryText(attributes: Record<string, unknown>, names: string[]) {
  for (const name of names) {
    const value = attributes[name];
    if (typeof value === "string" || typeof value === "number") return uppercaseInput(String(value));
  }
  return "";
}

function parseSchoolDirectoryFeatures(payload: unknown): SchoolDirectoryItem[] {
  const features = typeof payload === "object" && payload && "features" in payload
    ? (payload as { features?: unknown }).features
    : [];
  if (!Array.isArray(features)) return [];
  return features
    .map((feature) => {
      const attributes = typeof feature === "object" && feature && "attributes" in feature
        ? (feature as { attributes?: unknown }).attributes
        : null;
      if (!attributes || typeof attributes !== "object") return null;
      const attrs = attributes as Record<string, unknown>;
      const nome = readDirectoryText(attrs, ["Escola", "escola", "NO_ENTIDADE", "nome"]);
      if (!nome) return null;
      return {
        nome,
        codigo: readDirectoryText(attrs, ["Código_INEP", "Codigo_INEP", "CO_ENTIDADE", "codigo"]),
        estado: readDirectoryText(attrs, ["UF", "SG_UF", "estado"]),
        municipio: readDirectoryText(attrs, ["Município", "Municipio", "NO_MUNICIPIO", "municipio"]),
        rede: readDirectoryText(attrs, ["Dependência_Administrativa", "Dependencia_Administrativa", "TP_DEPENDENCIA", "rede"]),
      };
    })
    .filter((item): item is SchoolDirectoryItem => Boolean(item));
}

function uniqueSchoolDirectory(items: SchoolDirectoryItem[]) {
  const byKey = new Map<string, SchoolDirectoryItem>();
  for (const item of items) {
    const key = `${compactPlain(item.estado)}|${compactPlain(item.municipio)}|${compactPlain(item.nome)}`;
    if (!byKey.has(key)) byKey.set(key, item);
  }
  return Array.from(byKey.values()).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

function localSchoolDirectory(schools: SchoolAccount[], histories: HistoryRecord[]) {
  const items: SchoolDirectoryItem[] = [...seedSchoolDirectory];
  for (const account of schools) {
    if (!account.escola.nome.trim()) continue;
    items.push({
      nome: uppercaseInput(account.escola.nome),
      municipio: uppercaseInput(account.escola.municipio),
      estado: uppercaseInput(account.escola.estado),
      codigo: account.escola.codigo,
      rede: upper(schoolKindLabel(account.tipo)),
    });
  }
  for (const record of histories) {
    for (const study of record.estudos) {
      if (!study.escola.trim() || study.escola.trim() === "-") continue;
      items.push({
        nome: uppercaseInput(study.escola),
        municipio: uppercaseInput(study.cidade),
        estado: uppercaseInput(study.estado),
      });
    }
  }
  return uniqueSchoolDirectory(items);
}

function filterLocalSchoolDirectory(items: SchoolDirectoryItem[], municipio: string, estado: string) {
  const cityKey = compactPlain(municipio);
  const stateKey = compactPlain(estado);
  if (!cityKey && !stateKey) return items;
  return items.filter((item) => {
    const itemCity = compactPlain(item.municipio);
    const itemState = compactPlain(item.estado);
    return (!cityKey || itemCity === cityKey) && (!stateKey || itemState === stateKey);
  });
}

function useSchoolDirectory(municipio: string, estado: string, fallback: SchoolDirectoryItem[]) {
  const [officialSchools, setOfficialSchools] = useState<SchoolDirectoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const state = upper(estado).slice(0, 2);
  const city = uppercaseInput(municipio);
  const localSchools = useMemo(() => filterLocalSchoolDirectory(fallback, city, state), [fallback, city, state]);

  useEffect(() => {
    if (!city || state.length !== 2) {
      setOfficialSchools([]);
      setLoading(false);
      return;
    }
    const key = schoolDirectoryKey(city, state);
    const saved = cachedSchoolDirectory.get(key);
    if (saved) {
      setOfficialSchools(saved);
      setLoading(false);
      return;
    }
    const params = new URLSearchParams({
      where: `UPPER(UF)='${cleanSqlText(state)}' AND UPPER(Município)='${cleanSqlText(city)}'`,
      outFields: "Escola,Código_INEP,UF,Município,Dependência_Administrativa",
      returnGeometry: "false",
      orderByFields: "Escola ASC",
      resultRecordCount: "2000",
      f: "json",
    });
    let cancelled = false;
    setLoading(true);
    fetch(`${inepSchoolDirectoryUrl}?${params.toString()}`)
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        if (cancelled) return;
        const items = uniqueSchoolDirectory(parseSchoolDirectoryFeatures(payload));
        cachedSchoolDirectory.set(key, items);
        setOfficialSchools(items);
        setLoading(false);
      })
      .catch((error) => {
        if (!cancelled) setLoading(false);
        console.error("Nao foi possivel carregar escolas.", error);
      });
    return () => { cancelled = true; };
  }, [city, state]);

  return { schools: uniqueSchoolDirectory([...officialSchools, ...localSchools]), loading };
}

function crc32(bytes: Uint8Array) {
  let crc = -1;
  for (const byte of bytes) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function zipDateTime(date = new Date()) {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = Math.max(1980, date.getFullYear()) - 1980;
  return { time, date: (year << 9) | (month << 5) | day };
}

function writeUint16(target: Uint8Array, offset: number, value: number) {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >>> 8) & 0xff;
}

function writeUint32(target: Uint8Array, offset: number, value: number) {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >>> 8) & 0xff;
  target[offset + 2] = (value >>> 16) & 0xff;
  target[offset + 3] = (value >>> 24) & 0xff;
}

function concatBytes(parts: Uint8Array[]) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function createZip(files: Array<{ path: string; content: string }>) {
  const encoder = new TextEncoder();
  const now = zipDateTime();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const name = encoder.encode(file.path);
    const data = encoder.encode(file.content);
    const crc = crc32(data);
    const local = new Uint8Array(30 + name.length);
    writeUint32(local, 0, 0x04034b50);
    writeUint16(local, 4, 20);
    writeUint16(local, 6, 0x0800);
    writeUint16(local, 8, 0);
    writeUint16(local, 10, now.time);
    writeUint16(local, 12, now.date);
    writeUint32(local, 14, crc);
    writeUint32(local, 18, data.length);
    writeUint32(local, 22, data.length);
    writeUint16(local, 26, name.length);
    local.set(name, 30);
    localParts.push(local, data);

    const central = new Uint8Array(46 + name.length);
    writeUint32(central, 0, 0x02014b50);
    writeUint16(central, 4, 20);
    writeUint16(central, 6, 20);
    writeUint16(central, 8, 0x0800);
    writeUint16(central, 10, 0);
    writeUint16(central, 12, now.time);
    writeUint16(central, 14, now.date);
    writeUint32(central, 16, crc);
    writeUint32(central, 20, data.length);
    writeUint32(central, 24, data.length);
    writeUint16(central, 28, name.length);
    writeUint32(central, 42, offset);
    central.set(name, 46);
    centralParts.push(central);
    offset += local.length + data.length;
  }

  const centralDirectory = concatBytes(centralParts);
  const end = new Uint8Array(22);
  writeUint32(end, 0, 0x06054b50);
  writeUint16(end, 8, files.length);
  writeUint16(end, 10, files.length);
  writeUint32(end, 12, centralDirectory.length);
  writeUint32(end, 16, offset);
  return concatBytes([...localParts, centralDirectory, end]);
}

async function writeTextFile(directory: DirectoryHandleLike, path: string[], content: string) {
  let current = directory;
  for (const segment of path.slice(0, -1)) {
    current = await current.getDirectoryHandle(segment, { create: true });
  }
  const file = await current.getFileHandle(path[path.length - 1], { create: true });
  const writable = await file.createWritable();
  await writable.write(content);
  await writable.close();
}

async function readJsonFile(directory: DirectoryHandleLike, fileName: string) {
  try {
    const handle = await directory.getFileHandle(fileName);
    const file = await handle.getFile();
    return JSON.parse(await file.text());
  } catch {
    return null;
  }
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function removeLightBackground(dataUrl: string) {
  return new Promise<string>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const maxSide = 720;
      const sourceWidth = image.naturalWidth || image.width || 1;
      const sourceHeight = image.naturalHeight || image.height || 1;
      const scale = Math.min(1, maxSide / Math.max(sourceWidth, sourceHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(sourceWidth * scale));
      canvas.height = Math.max(1, Math.round(sourceHeight * scale));
      const context = canvas.getContext("2d");
      if (!context) {
        resolve(dataUrl);
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
      const data = pixels.data;
      for (let index = 0; index < data.length; index += 4) {
        const red = data[index];
        const green = data[index + 1];
        const blue = data[index + 2];
        const alpha = data[index + 3];
        const light = Math.min(red, green, blue);
        const spread = Math.max(red, green, blue) - light;
        if (alpha < 8 || (light > 245 && spread < 28)) {
          data[index + 3] = 0;
        } else if (light > 225 && spread < 36) {
          data[index + 3] = Math.round(alpha * ((245 - light) / 20));
        }
      }
      context.putImageData(pixels, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    image.onerror = () => reject(new Error("Imagem invalida"));
    image.src = dataUrl;
  });
}

async function imageFileToTransparentPng(file?: File) {
  if (!file) return "";
  if (!file.type.startsWith("image/")) {
    window.alert("Escolha um arquivo de imagem.");
    return "";
  }
  return removeLightBackground(await fileToDataUrl(file));
}

function prepareImageForOcr(dataUrl: string) {
  return new Promise<string>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const maxWidth = 2200;
      const sourceWidth = image.naturalWidth || image.width;
      const sourceHeight = image.naturalHeight || image.height;
      const maxPixels = 2200 * 3000;
      const widthScale = maxWidth / sourceWidth;
      const pixelScale = Math.sqrt(maxPixels / Math.max(1, sourceWidth * sourceHeight));
      const scale = Math.min(1, widthScale, pixelScale);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(sourceWidth * scale));
      canvas.height = Math.max(1, Math.round(sourceHeight * scale));
      const context = canvas.getContext("2d");
      if (!context) {
        resolve(dataUrl);
        return;
      }
      context.imageSmoothingEnabled = true;
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
      const data = pixels.data;
      for (let index = 0; index < data.length; index += 4) {
        const gray = data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;
        const contrast = Math.max(0, Math.min(255, (gray - 128) * 1.45 + 128));
        data[index] = contrast;
        data[index + 1] = contrast;
        data[index + 2] = contrast;
      }
      context.putImageData(pixels, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    image.onerror = () => reject(new Error("Imagem invalida"));
    image.src = dataUrl;
  });
}

async function imageFileToOcrPng(file?: File) {
  if (!file) return "";
  if (!file.type.startsWith("image/")) {
    window.alert("Escolha um arquivo de imagem.");
    return "";
  }
  return prepareImageForOcr(await fileToDataUrl(file));
}

function parseTsvWords(tsv: string | null | undefined, page: number): OcrWord[] {
  if (!tsv) return [];
  const rows = tsv.split(/\r?\n/).filter(Boolean);
  const header = rows.shift()?.split("\t") ?? [];
  const indexOf = (name: string) => header.indexOf(name);
  const indexes = {
    level: indexOf("level"),
    left: indexOf("left"),
    top: indexOf("top"),
    width: indexOf("width"),
    height: indexOf("height"),
    conf: indexOf("conf"),
    text: indexOf("text"),
  };
  return rows.flatMap((row) => {
    const cells = row.split("\t");
    const text = plain(cells[indexes.text] || "");
    const conf = Number(cells[indexes.conf] || "-1");
    if (cells[indexes.level] !== "5" || !text || conf < 15) return [];
    return [{
      text,
      left: Number(cells[indexes.left] || 0),
      top: Number(cells[indexes.top] || 0),
      width: Number(cells[indexes.width] || 0),
      height: Number(cells[indexes.height] || 0),
      page,
    }];
  });
}

function wordsFromBlocks(blocks: import("tesseract.js").Block[] | null | undefined, page: number): OcrWord[] {
  if (!blocks?.length) return [];
  return blocks.flatMap((block) => block.paragraphs.flatMap((paragraph) => paragraph.lines.flatMap((line) => line.words.flatMap((word) => {
    const text = plain(word.text);
    if (!text || word.confidence < 15) return [];
    return [{
      text,
      left: word.bbox.x0,
      top: word.bbox.y0,
      width: word.bbox.x1 - word.bbox.x0,
      height: word.bbox.y1 - word.bbox.y0,
      page,
    }];
  }))));
}

function recognizedScore(text: string, words: OcrWord[]) {
  const normalized = plain(text);
  const labels = [
    "NOME",
    "ALUNO",
    "NASCIMENTO",
    "NATURALIDADE",
    "NACIONALIDADE",
    "PAI",
    "MAE",
    "PORTUGUES",
    "MATEMATICA",
    "CARGA HORARIA",
    "FREQUENCIA",
    "RESULTADO",
  ];
  const labelScore = labels.filter((label) => normalized.includes(label)).length * 50;
  const dateScore = (normalized.match(/\b\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}\b/g) ?? []).length * 30;
  const noteScore = (normalized.match(/\b(?:10(?:[,.]0)?|[0-9][,.][0-9])\b/g) ?? []).length * 12;
  const workloadScore = (normalized.match(/\b[1-2]?\d{3}\b/g) ?? []).length * 6;
  return labelScore + dateScore + noteScore + workloadScore + words.length + normalized.length / 20;
}

async function recognizeWithMode(
  worker: Awaited<ReturnType<typeof import("tesseract.js").createWorker>>,
  image: string,
  page: number,
  mode: string,
) {
  await worker.setParameters({
    preserve_interword_spaces: "1",
    tessedit_pageseg_mode: mode as import("tesseract.js").PSM,
    user_defined_dpi: "300",
  });
  const result = await worker.recognize(image, {}, { text: true, tsv: true });
  const words = parseTsvWords(result.data.tsv, page);
  return {
    text: result.data.text || "",
    words,
    score: recognizedScore(result.data.text || "", words),
  };
}

async function recognizeHistoryImages(sources: Array<{ image: string; page: number }>) {
  const tesseract: typeof import("tesseract.js") = await import("tesseract.js");
  let worker: Awaited<ReturnType<typeof import("tesseract.js").createWorker>> | null = null;
  try {
    worker = await tesseract.createWorker("por+eng");
  } catch {
    worker = await tesseract.createWorker("eng");
  }
  try {
    const results = [];
    for (const source of sources) {
      try {
        let best = await recognizeWithMode(worker, source.image, source.page, "6");
        if (best.score < 260) {
          const tableMode = await recognizeWithMode(worker, source.image, source.page, "4");
          if (tableMode.score > best.score) best = tableMode;
        }
        if (best.score < 260) {
          const sparseMode = await recognizeWithMode(worker, source.image, source.page, "11");
          if (sparseMode.score > best.score) best = sparseMode;
        }
        results.push(best);
        await new Promise((resolve) => window.setTimeout(resolve, 120));
      } catch {
        // Mantem a tela aberta e permite conferir/preencher manualmente.
      }
    }
    return {
      text: results.map((result) => result.text.trim()).filter(Boolean).join("\n"),
      words: results.flatMap((result) => result.words),
    };
  } finally {
    await worker?.terminate();
  }
}

async function readHistoryTextFromImages(front?: string, back?: string) {
  const sources = [
    front ? { image: front, page: 1 } : null,
    back ? { image: back, page: 2 } : null,
  ].filter((item): item is { image: string; page: number } => Boolean(item));
  if (!sources.length) return { text: "", words: [] };
  return recognizeHistoryImages(sources);
}

type BrowserBarcodeDetector = {
  detect: (source: CanvasImageSource) => Promise<Array<{ rawValue?: string }>>;
};

function qrDetectorClass() {
  return (window as unknown as {
    BarcodeDetector?: new (options: { formats: string[] }) => BrowserBarcodeDetector;
  }).BarcodeDetector;
}

function imageElementFromDataUrl(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Imagem invalida"));
    image.src = dataUrl;
  });
}

async function readQrFromImage(dataUrl: string) {
  const Detector = qrDetectorClass();
  const image = await imageElementFromDataUrl(dataUrl);
  if (Detector) {
    const detector = new Detector({ formats: ["qr_code"] });
    const codes = await detector.detect(image);
    const nativeValue = codes.map((code) => code.rawValue || "").find(Boolean);
    if (nativeValue) return nativeValue;
  }
  const canvas = document.createElement("canvas");
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return "";
  context.drawImage(image, 0, 0, width, height);
  const pixels = context.getImageData(0, 0, width, height);
  const jsQrModule = await import("jsqr");
  const jsQr = jsQrModule.default;
  const code = jsQr(pixels.data, pixels.width, pixels.height);
  return code?.data || "";
}

async function readQrFromImages(front?: string, back?: string) {
  for (const image of [front, back]) {
    if (!image) continue;
    const value = await readQrFromImage(image).catch(() => "");
    if (value) return value;
  }
  return "";
}

function parseHistoryQrValue(text: string): HistoryQrValue | null {
  const trimmed = text.trim();
  try {
    const url = new URL(trimmed);
    const id = url.searchParams.get("h") || url.searchParams.get("q") || url.searchParams.get("historicoQr") || url.searchParams.get("historico") || url.searchParams.get("id");
    if (id) return { kind: "id", id, codigo: url.searchParams.get("c") || url.searchParams.get("codigo") || undefined };
  } catch {
    // Nao e URL; tenta os outros formatos.
  }
  const idMatch = trimmed.match(/^HE-ID:([A-Z0-9-]+)(?:\|(.+))?$/i);
  if (idMatch) return { kind: "id", id: idMatch[1], codigo: idMatch[2] };

  const candidates = [trimmed];
  try {
    const url = new URL(trimmed);
    ["historico", "he", "data"].forEach((key) => {
      const value = url.searchParams.get(key);
      if (value) candidates.push(value);
    });
  } catch {
    // Nao e URL; tenta o texto direto.
  }
  if (/^he:/i.test(trimmed)) candidates.push(trimmed.slice(3));
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      const source = parsed?.historico ?? parsed?.record ?? parsed;
      if (source?.aluno && source?.matriz) return { kind: "record", record: source };
    } catch {
      try {
        const parsed = JSON.parse(atob(candidate));
        const source = parsed?.historico ?? parsed?.record ?? parsed;
        if (source?.aluno && source?.matriz) return { kind: "record", record: source };
      } catch {
        // Tenta o proximo formato.
      }
    }
  }
  return null;
}

function historyFromSharedText(text: string, base: HistoryRecord, records: HistoryRecord[] = []) {
  const parsed = parseHistoryQrValue(text);
  if (!parsed) return null;
  const source = parsed.kind === "id"
    ? records.find((record) => record.id === parsed.id || record.codigo === parsed.codigo)
    : parsed.record;
  if (!source) return null;
  return normalizeHistory({
    ...source,
    id: base.id,
    schoolId: base.schoolId,
    folderId: base.folderId,
    anoLetivo: base.anoLetivo,
    codigo: base.codigo,
  } as HistoryRecord, base.schoolId, []);
}

function historyQrText(record: HistoryRecord) {
  const params = new URLSearchParams({ h: record.id, c: record.codigo });
  if (typeof window !== "undefined") return `${window.location.origin}/?${params.toString()}`;
  return `HE-ID:${record.id}|${record.codigo}`;
}

function HistoryQrCode({ record }: { record: HistoryRecord }) {
  const [qr, setQr] = useState("");

  useEffect(() => {
    let cancelled = false;
    const makeQr = async () => {
      try {
        const qrcode = await import("qrcode");
        const value = await qrcode.toDataURL(historyQrText(record), {
          errorCorrectionLevel: "Q",
          margin: 2,
          width: 260,
          color: {
            dark: "#000000",
            light: "#ffffff",
          },
        });
        if (!cancelled) setQr(value);
      } catch {
        if (!cancelled) setQr("");
      }
    };
    void makeQr();
    return () => { cancelled = true; };
  }, [record.id, record.codigo]);

  if (!qr) return null;
  return (
    <div className="history-qr">
      <img src={qr} alt="" />
      <span>{record.codigo}</span>
    </div>
  );
}

async function recordsFromComputerFolder(directory: DirectoryHandleLike, fallbackName: string) {
  const bundle = await readJsonFile(directory, "dados-da-pasta.json");
  if (bundle?.historicos?.length) {
    return {
      folderName: bundle.pasta?.nome || fallbackName,
      records: bundle.historicos.map(normalizeHistory),
    };
  }

  let source = directory;
  try {
    source = await directory.getDirectoryHandle("alunos");
  } catch {
    source = directory;
  }

  const records: HistoryRecord[] = [];
  for await (const [, handle] of source.entries()) {
    if (handle.kind !== "file" || !handle.name.toLocaleLowerCase("pt-BR").endsWith(".json")) continue;
    try {
      const file = await handle.getFile();
      const parsed = JSON.parse(await file.text());
      const record = parsed?.historico ?? parsed;
      if (record?.aluno && record?.matriz) records.push(normalizeHistory(record));
    } catch {
      // Ignora arquivos que nao sejam historicos validos.
    }
  }

  return { folderName: fallbackName, records };
}

function createBlankNotes(rows = matrixSeed) {
  return rows.reduce<Record<string, Record<number, string>>>((acc, component) => {
    acc[component.id] = {};
    return acc;
  }, {});
}

function createBlankNoteBoldYears() {
  return years.reduce<Record<number, boolean>>((acc, year) => {
    acc[year] = false;
    return acc;
  }, {});
}

function createHistory(school: School, schoolId = "", folder?: Folder | null, modelRows = matrixSeed): HistoryRecord {
  const carga = years.reduce<Record<number, WorkloadRow>>((acc, year) => {
    acc[year] = {
      oferta: "",
      frequencia: "",
      percentual: "",
      manualPercentual: false,
    };
    return acc;
  }, {});

  const estudos = years.map((year) => ({
    serie: `${year}o ANO`,
    ativo: true,
    ano: "",
    escola: "",
    cidade: "",
    estado: "",
  }));

  const record: HistoryRecord = {
    id: crypto.randomUUID(),
    schoolId,
    codigo: `HE-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`,
    folderId: folder?.id ?? "",
    anoLetivo: folder?.anoLetivo ?? "",
    status: "Em preenchimento",
    updatedAt: new Date().toISOString(),
    aluno: studentDefaultsForSchool(school),
    dadosLegais: {
      credenciamento: school.credenciamento || defaultSchool.credenciamento,
      autorizacao: school.autorizacao || defaultSchool.autorizacao,
      reconhecimento: school.reconhecimento || defaultSchool.reconhecimento,
      parecer: school.parecer || defaultSchool.parecer,
      validade: school.validade || defaultSchool.validade,
    },
    matriz: cloneMatrix(modelRows),
    modeloCores: normalizeModelColors(),
    notas: createBlankNotes(modelRows),
    notasNegritoAnos: createBlankNoteBoldYears(),
    resultados: years.reduce<Record<number, string>>((acc, year) => {
      acc[year] = "";
      return acc;
    }, {}),
    cargaHoraria: carga,
    estudos,
    certificado: {
      preencher: false,
      etapa: "",
      anoConclusao: "",
      prosseguimento: "",
      complemento: "",
      texto: "",
      editado: false,
    },
    usarCarimboEscola: false,
    usarAssinaturaDiretor: false,
    usarAssinaturaSecretario: false,
    usarQrCode: true,
    observacoes: [""],
    localData: {
      municipio: school.municipio || defaultSchool.municipio,
      estado: school.estado || defaultSchool.estado,
      data: todayIsoDate(),
    },
  };
  return record;
}

function createHistoryFromModel(school: School, schoolId = "", folder?: Folder | null, model?: HistoryModel): HistoryRecord {
  const cleanModel = normalizeModel(model);
  const base = createHistory(school, schoolId, folder, cleanModel.matriz);
  if (!cleanModel.template) return { ...base, modeloCores: cleanModel.cores };

  const template = normalizeModelTemplate(cleanModel.template, schoolId);
  return {
    ...base,
    dadosLegais: { ...template.dadosLegais },
    matriz: cloneMatrix(template.matriz),
    modeloCores: cleanModel.cores,
    notas: normalizeNotesForMatrix(template.notas, template.matriz),
    notasNegritoAnos: { ...template.notasNegritoAnos },
    resultados: { ...template.resultados },
    cargaHoraria: cloneRecord(template.cargaHoraria),
    estudos: template.estudos.map((row) => ({ ...row })),
    certificado: { ...template.certificado },
    usarCarimboEscola: template.usarCarimboEscola,
    usarAssinaturaDiretor: template.usarAssinaturaDiretor,
    usarAssinaturaSecretario: template.usarAssinaturaSecretario,
    usarQrCode: template.usarQrCode !== false,
    observacoes: [...template.observacoes],
    localData: {
      ...template.localData,
      municipio: template.localData.municipio || school.municipio || defaultSchool.municipio,
      estado: template.localData.estado || school.estado || defaultSchool.estado,
      data: todayIsoDate(),
    },
    aluno: studentDefaultsForSchool(school),
  };
}

function findFirstDate(text: string) {
  const match = text.match(/\b(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})\b/);
  if (!match) return "";
  const day = match[1].padStart(2, "0");
  const month = match[2].padStart(2, "0");
  const year = match[3].length === 2 ? `20${match[3]}` : match[3];
  return `${year}-${month}-${day}`;
}

function cleanOcrField(value: string) {
  return plain(value)
    .replace(/^(?:NOME\s+(?:DO\s+)?ALUNO|NOME\s+DO\s+PAI|NOME\s+DA\s+MAE|NOME|ALUNO|DATA\s+DE\s+NASCIMENTO|NASCIMENTO|NASC|NACIONALIDADE|NATURALIDADE|IDENTIDADE|RG|PAI|MAE|FILIA[CÇ][AÃ]O|SEXO|CPF)\s*[:.\-]*/i, "")
    .replace(/\s+(?:NOME\s+(?:DO\s+)?ALUNO|NOME\s+DO\s+PAI|NOME\s+DA\s+MAE|DATA\s+DE\s+NASCIMENTO|NASCIMENTO|NASC|NACIONALIDADE|NATURALIDADE|IDENTIDADE|RG|CPF|SEXO|FILIA[CÇ][AÃ]O|PAI|MAE|PORTUGUES|MATEMATICA|HISTORIA|GEOGRAFIA|CIENCIAS|RESULTADO|CARGA|CARGA\s+HORARIA|FREQUENCIA)\b.*$/i, "")
    .replace(/\s+(?:DATA\s+DE\s+NASCIMENTO|NASCIMENTO|NASC|NACIONALIDADE|NATURALIDADE|IDENTIDADE|RG|CPF|SEXO|FILIA[CÇ][AÃ]O|NOME\s+DO\s+PAI|NOME\s+DA\s+MAE|PAI|MAE)\b.*$/i, "")
    .replace(/^[^A-Z0-9]+|[^A-Z0-9]+$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function findLineFieldValue(lines: string[], labels: string[]) {
  const normalizedLines = lines.map(plain);
  for (const line of normalizedLines) {
    for (const label of labels) {
      const normalizedLabel = plain(label);
      const match = line.match(new RegExp(`^${normalizedLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*[:.\\-]?\\s*(.+)$`));
      if (!match) continue;
      const value = cleanOcrField(match[1]);
      if (value.length >= 2) return value;
    }
  }
  return "";
}

function findLabeledValue(lines: string[], labels: string[]) {
  const normalizedLines = lines.map(plain);
  for (let lineIndex = 0; lineIndex < normalizedLines.length; lineIndex += 1) {
    const normalized = normalizedLines[lineIndex];
    for (const label of labels) {
      const escapedLabel = plain(label).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const match = normalized.match(new RegExp(`(?:^|\\s)${escapedLabel}(?:\\s*[:.\\-]?\\s*)`));
      if (!match || match.index === undefined) continue;
      const value = cleanOcrField(normalized.slice(match.index + match[0].length));
      if (value.length >= 3) return value;
      const next = cleanOcrField(normalizedLines[lineIndex + 1] || "");
      if (next.length >= 3 && !/ESCOLA|HISTORICO|CERTIFICADO|ENSINO|MUNICIPIO|ESTADO/.test(next)) return next;
    }
  }
  return "";
}

function findFieldValue(rawText: string, labels: string[], stopLabels: string[] = []) {
  const normalized = plain(rawText).replace(/\n/g, " ");
  for (const label of labels) {
    const normalizedLabel = plain(label);
    const escapedLabel = normalizedLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = normalized.match(new RegExp(`(?:^|\\s)${escapedLabel}(?:\\s*[:.\\-]?\\s*)`));
    if (!match || match.index === undefined) continue;
    const start = match.index + match[0].length;
    const stopIndexes = stopLabels
      .map((stop) => {
        const normalizedStop = plain(stop);
        const escapedStop = normalizedStop.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const stopMatch = normalized.slice(start).match(new RegExp(`(?:^|\\s)${escapedStop}(?:\\s*[:.\\-]?\\s*)`));
        return stopMatch?.index === undefined ? -1 : start + stopMatch.index;
      })
      .filter((stopIndex) => stopIndex > start)
      .sort((a, b) => a - b);
    const end = stopIndexes[0] ?? normalized.length;
    const value = cleanOcrField(normalized.slice(start, end));
    if (value.length >= 2) return value;
  }
  return "";
}

function findBirthDate(rawText: string) {
  const birthField = findFieldValue(rawText, ["DATA DE NASCIMENTO", "NASCIMENTO", "NASC"], ["NACIONALIDADE", "NATURALIDADE", "IDENTIDADE", "RG", "PAI", "MAE"]);
  return findFirstDate(birthField) || findFirstDate(rawText);
}

function valuesFromLine(line: string, maxNumber = 100) {
  return Array.from(line.matchAll(/\b(?:APROVADO|REPROVADO|TRANSFERIDO|CURSANDO|PROGRESSAO|PROG|[0-9]{1,4}(?:[,.][0-9])?%?)\b/g))
    .map((match) => match[0].replace(".", ","))
    .filter((value) => {
      const numeric = Number(value.replace("%", "").replace(",", "."));
      return Number.isNaN(numeric) || (numeric <= maxNumber && numeric >= 0);
    })
    .slice(0, 9);
}

function valuesAroundLine(lines: string[], startIndex: number, maxNumber = 100) {
  return valuesFromLine(lines.slice(startIndex, startIndex + 4).join(" "), maxNumber);
}

function noteValuesFromText(text: string) {
  return Array.from(
    plain(text)
      .replace(/\b[1-9]\s*(?:O|º|°)?\s*ANO\b/g, " ")
      .replace(/\b[1-9]\s*(?:A|ª)?\s*SERIE\b/g, " ")
      .replace(/\b(?:19|20)\d{2}\b/g, " ")
      .matchAll(/\b(?:10(?:[,.]0)?|[0-9](?:[,.][0-9])?)\b/g),
  ).map((match) => match[0].replace(".", ",")).slice(0, 9);
}

function workloadValuesFromText(text: string, maxNumber = 2000) {
  return valuesFromLine(
    plain(text)
      .replace(/\b[1-9]\s*(?:O|º|°)?\s*ANO\b/g, " ")
      .replace(/\b[1-9]\s*(?:A|ª)?\s*SERIE\b/g, " "),
    maxNumber,
  );
}

function yearValuePairsFromText(text: string, maxNumber = 100) {
  const normalized = plain(text);
  const valuePattern = maxNumber <= 100
    ? "(APROVADO|REPROVADO|TRANSFERIDO|CURSANDO|PROGRESSAO|PROG|10(?:[,.]0)?|[0-9](?:[,.][0-9])?)"
    : "([0-9]{1,4}(?:[,.][0-9])?%?)";
  const pairs = Array.from(normalized.matchAll(new RegExp(`\\b([1-9])\\s*(?:O|º|°|A|ª)?\\s*(?:ANO|SERIE)?\\D{0,28}?${valuePattern}\\b`, "g")))
    .map((match) => {
      const year = Number(match[1]);
      const value = (match[2] || match[3] || "").replace(".", ",");
      const numeric = Number(value.replace("%", "").replace(",", "."));
      if (!year || year < 1 || year > 9) return null;
      if (!Number.isNaN(numeric) && (numeric < 0 || numeric > maxNumber)) return null;
      return { year, value: value === "PROG" ? "PROGRESSAO" : value };
    })
    .filter((item): item is { year: number; value: string } => Boolean(item?.value));
  return Array.from(new Map(pairs.map((item) => [item.year, item])).values());
}

function explicitSchoolYearFromText(text: string) {
  const normalized = plain(text);
  const match = normalized.match(/\b([1-9])\s*(?:O|º|°)?\s*ANO\b/) || normalized.match(/\b([1-9])\s*(?:A|ª)?\s*SERIE\b/);
  return match ? Number(match[1]) : null;
}

function ocrYearFromWord(text: string) {
  const compact = compactPlain(text);
  const match = compact.match(/^([1-9])(?:O|ANO|SERIE)?$/);
  return match ? Number(match[1]) : null;
}

function textAfterFirstLabel(text: string, labels: string[]) {
  const normalized = plain(text);
  let bestIndex = -1;
  let bestEnd = 0;
  labels.forEach((label) => {
    const index = normalized.indexOf(plain(label));
    if (index >= 0 && (bestIndex < 0 || index < bestIndex)) {
      bestIndex = index;
      bestEnd = index + plain(label).length;
    }
  });
  return bestIndex >= 0 ? normalized.slice(bestEnd) : normalized;
}

function labelsForComponent(component: ComponentRow) {
  const fromModel = plain(component.nome).split(/\s+/).filter((token) => token.length > 2);
  return Array.from(new Set([...(componentAliases[component.id] ?? []), component.nome, plain(component.nome), ...fromModel]));
}

function rowMatchesComponent(rowText: string, component: ComponentRow) {
  const text = plain(rowText);
  if (!rowHasLabel(text, labelsForComponent(component))) return false;
  if (component.id === "portugues" && /\bPORTUGUES\s*(?:II|2)\b/.test(text)) return false;
  if (component.id === "matematica" && /\bMATEMATICA\s*(?:II|2)\b/.test(text)) return false;
  return true;
}

function cleanOcrPerson(value: string) {
  return cleanOcrField(value)
    .replace(/\b(?:BRASILEIR[OA]|NATURAL|SOLTEIR[OA]|MASCULINO|FEMININO|ENSINO|FUNDAMENTAL|HISTORICO|ESCOLAR)\b/g, " ")
    .replace(/\b\d{1,4}(?:[,.]\d)?\b/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function cleanStudentId(value: string) {
  return cleanOcrField(value)
    .replace(/\b(?:ID|ALUNO|NUMERO|N|NO|DO|DA|CENSO|INEP|CODIGO|MATRICULA)\b/g, " ")
    .replace(/[^A-Z0-9./-]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function splitNaturalidade(value: string, fallbackCity: string, fallbackState: string) {
  const cleaned = cleanOcrField(value)
    .replace(/\b(?:NOME DO|NOME DA|PAI|MAE|DATA DE NASCIMENTO|NASCIMENTO|NACIONALIDADE|IDENTIDADE|RG|CPF)\b.*$/g, "")
    .trim();
  const ufMatch = cleaned.match(/\b(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\b/);
  const state = ufMatch?.[1] || fallbackState;
  const city = cleaned
    .replace(/\b(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\b/g, "")
    .split(/[-/]/)[0]
    .replace(/\s{2,}/g, " ")
    .trim();
  return [city || fallbackCity, state] as const;
}

const componentAliases: Record<string, string[]> = {
  portugues: ["PORTUGUES", "LINGUA PORTUGUESA", "L PORTUGUESA", "LING PORTUGUESA", "LP"],
  "portugues-ii": ["PORTUGUES II", "PORTUGUES 2", "LINGUA PORTUGUESA II"],
  arte: ["ARTE", "ARTES", "ARTE EDUCACAO", "EDUCACAO ARTISTICA"],
  "educacao-fisica": ["EDUCACAO FISICA", "ED FISICA", "EDUC FISICA"],
  ingles: ["INGLES", "L EST MODERNA", "LINGUA INGLESA", "LINGUA ESTRANGEIRA"],
  historia: ["HISTORIA", "HIST"],
  geografia: ["GEOGRAFIA", "GEOG"],
  religioso: ["RELIGIOSO", "ENSINO RELIGIOSO"],
  ciencias: ["CIENCIAS", "CIENCIAS NATURAIS"],
  matematica: ["MATEMATICA", "MAT"],
  "matematica-ii": ["MATEMATICA II", "MATEMATICA 2", "MAT II"],
  "atividades-artisticas": ["ATIVIDADES ARTISTICAS", "EDUCACAO CORPORAL", "SAUDE"],
  caerer: ["CAER", "CONSCIENCIA AMBIENTAL", "ETNICO"],
  "circulo-leitura": ["CIRCULO DE LEITURA", "LEITURA"],
  "cultura-digital": ["CULTURA DIGITAL", "TECNOLOGIA"],
  "matematica-conectada": ["MATEMATICA CONECTADA"],
  "oficina-textos": ["OFICINA DE TEXTOS"],
  "oficina-narrativas": ["OFICINA DE NARRATIVAS", "NARRATIVAS"],
  "portugues-conectado": ["PORTUGUES CONECTADO"],
  "projeto-caminhar": ["PROJETO CAMINHAR"],
  "valorizacao-cultural": ["VALORIZACAO CULTURAL", "HISTORICA E GEOGRAFICA"],
  "estudo-orientado": ["ESTUDO ORIENTADO"],
};

function bestLineForComponent(lines: string[], component: ComponentRow) {
  const index = lines.findIndex((line) => rowMatchesComponent(line, component));
  return index >= 0 ? lines[index] : "";
}

function bestLineIndexForComponent(lines: string[], component: ComponentRow) {
  const line = bestLineForComponent(lines, component);
  return line ? lines.indexOf(line) : -1;
}

function resultWordsFromText(text: string) {
  return Array.from(text.matchAll(/\b(APROVADO|REPROVADO|TRANSFERIDO|CURSANDO|PROGRESSAO|PROG)\b/g))
    .map((match) => match[1] === "PROG" ? "PROGRESSAO" : match[1])
    .slice(0, 9);
}

function cleanStudySource(value: string) {
  return plain(value)
    .replace(/\b(?:ESTABELECIMENTO|ENSINO|ESCOLA|ORIGEM|ESTUDOS|REALIZADOS|MUNICIPIO|CIDADE|ESTADO|UF|ANO|SERIE|RESULTADO|APROVADO|REPROVADO|CURSANDO|TRANSFERIDO|PROGRESSAO)\b/g, " ")
    .replace(/\b(?:19|20)\d{2}\b/g, " ")
    .replace(/\b(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\b/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function findDirectorySchoolInText(text: string, directory: SchoolDirectoryItem[] = []) {
  const normalized = plain(text);
  return directory
    .map((school) => ({ school, name: plain(school.nome) }))
    .filter((item) => item.name.length >= 8 && normalized.includes(item.name))
    .sort((a, b) => b.name.length - a.name.length)[0]?.school ?? null;
}

function fillStudiesFromText(record: HistoryRecord, normalizedLines: string[], directory: SchoolDirectoryItem[] = []) {
  const estudos = record.estudos.map((study) => ({ ...study }));
  normalizedLines.forEach((line, lineIndex) => {
    const context = [line, normalizedLines[lineIndex + 1] || ""].join(" ");
    const seriesYear = explicitSchoolYearFromText(context);
    if (!seriesYear || seriesYear < 1 || seriesYear > 9) return;
    const study = estudos[seriesYear - 1];
    const yearMatch = context.match(/\b(?:19|20)\d{2}\b/);
    const stateMatch = context.match(/\b(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\b/);
    const directorySchool = findDirectorySchoolInText(context, directory);
    const labels = [`${seriesYear} ANO`, `${seriesYear}O ANO`, `${seriesYear} SERIE`, `${seriesYear}A SERIE`];
    const escola = directorySchool?.nome || cleanStudySource(textAfterFirstLabel(context, labels));
    estudos[seriesYear - 1] = {
      ...study,
      ativo: true,
      ano: study.ano || yearMatch?.[0] || "",
      escola: study.escola || escola,
      cidade: study.cidade || directorySchool?.municipio || "",
      estado: study.estado || directorySchool?.estado || stateMatch?.[1] || "",
    };
  });
  return estudos;
}

function wordRows(words: OcrWord[]) {
  const rows: OcrRow[] = [];
  const sorted = [...words].sort((a, b) => a.page - b.page || a.top - b.top || a.left - b.left);
  for (const word of sorted) {
    const middle = word.top + word.height / 2;
    const row = rows.find((item) => item.page === word.page && Math.abs((item.top + item.height / 2) - middle) <= Math.max(10, word.height * 0.7));
    if (row) {
      row.words.push(word);
      row.top = Math.min(row.top, word.top);
      row.height = Math.max(row.height, word.height);
    } else {
      rows.push({ page: word.page, top: word.top, height: word.height, words: [word], text: "" });
    }
  }
  return rows.map((row) => {
    const ordered = row.words.sort((a, b) => a.left - b.left);
    return { ...row, words: ordered, text: ordered.map((word) => word.text).join(" ") };
  });
}

function rowHasLabel(rowText: string, labels: string[]) {
  const text = plain(rowText);
  const compact = compactPlain(rowText);
  return labels.some((label) => {
    const normalizedLabel = plain(label);
    const labelCompact = compactPlain(label);
    const labelWords = normalizedLabel.split(/\s+/).filter((word) => word.length > 1 && !/^(DO|DA|DE|DOS|DAS|A|O|E)$/.test(word));
    if (!normalizedLabel) return false;
    if (normalizedLabel.length <= 4) return new RegExp(`(^|\\s)${normalizedLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|$)`).test(text);
    return text.includes(normalizedLabel)
      || Boolean(labelCompact.length > 4 && compact.includes(labelCompact))
      || Boolean(labelWords.length && labelWords.every((word) => new RegExp(`(^|\\s)${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|$)`).test(text)));
  });
}

function labelBoundsInRow(rowWords: OcrWord[], labels: string[]) {
  const normalizedWords = rowWords.map((word) => compactPlain(word.text));
  for (const label of labels) {
    const labelParts = plain(label).split(/\s+/)
      .map((part) => part.replace(/[^A-Z0-9]/g, ""))
      .filter((part) => part.length > 1 && !/^(DO|DA|DE|DOS|DAS|A|O|E)$/.test(part));
    if (!labelParts.length) continue;
    for (let start = 0; start < normalizedWords.length; start += 1) {
      const slice = normalizedWords.slice(start, start + labelParts.length).join("");
      const target = labelParts.join("");
      const matched = target.length <= 4
        ? slice === target
        : slice === target || slice.includes(target) || target.includes(slice);
      if (matched) {
        const firstWord = rowWords[start];
        const lastWord = rowWords[Math.min(start + labelParts.length - 1, rowWords.length - 1)];
        return { start: firstWord.left, end: lastWord.left + lastWord.width };
      }
    }
    let lastLabelWordIndex = -1;
    for (let index = rowWords.length - 1; index >= 0; index -= 1) {
      const compact = compactPlain(rowWords[index].text);
      if (labelParts.some((part) => compact === part || (part.length > 4 && compact.includes(part)) || (compact.length > 4 && part.includes(compact)))) {
        lastLabelWordIndex = index;
        break;
      }
    }
    if (lastLabelWordIndex >= 0) {
      const labelWords = rowWords.filter((word) => labelParts.some((part) => {
        const compact = compactPlain(word.text);
        return compact === part || (part.length > 4 && compact.includes(part)) || (compact.length > 4 && part.includes(compact));
      }));
      const start = Math.min(...labelWords.map((word) => word.left));
      const lastWord = rowWords[lastLabelWordIndex];
      return { start, end: lastWord.left + lastWord.width };
    }
  }
  return null;
}

function valueRightOfLabel(words: OcrWord[], labels: string[], stopLabels: string[] = []) {
  const rows = wordRows(words);
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    if (!rowHasLabel(row.text, labels)) continue;
    const bounds = labelBoundsInRow(row.words, labels);
    const stopBounds = stopLabels
      .map((label) => labelBoundsInRow(row.words, [label]))
      .filter((item): item is { start: number; end: number } => Boolean(item))
      .filter((item) => !bounds || item.start > bounds.end)
      .sort((a, b) => a.start - b.start)[0];
    const startX = bounds?.end ?? row.words[0]?.left ?? 0;
    const endX = stopBounds?.start ?? Infinity;
    const value = cleanOcrField(row.words
      .filter((word) => word.left > startX + 8 && word.left < endX - 4)
      .map((word) => word.text)
      .join(" "));
    if (value.length >= 3) return value;
    const below = rows
      .slice(index + 1, index + 4)
      .filter((nextRow) => nextRow.page === row.page)
      .flatMap((nextRow) => nextRow.words.filter((word) => {
        const center = word.left + word.width / 2;
        return center >= (bounds?.start ?? row.words[0]?.left ?? 0) && center < endX;
      }))
      .map((word) => word.text)
      .join(" ");
    const next = cleanOcrField(below || rows[index + 1]?.text || "");
    if (next.length >= 3 && !/ESCOLA|HISTORICO|CERTIFICADO|ENSINO|MUNICIPIO|ESTADO/.test(next)) return next;
  }
  return "";
}

function valuesFromWordRow(rowText: string, maxNumber = 100) {
  return valuesFromLine(rowText, maxNumber)
    .slice(0, 9);
}

function valuesAfterLabelInRow(row: ReturnType<typeof wordRows>[number], labels: string[], maxNumber = 100) {
  const bounds = labelBoundsInRow(row.words, labels);
  const text = row.words
    .filter((word) => !bounds || word.left + word.width / 2 > bounds.end + 4)
    .map((word) => word.text)
    .join(" ");
  return (maxNumber <= 100 ? noteValuesFromText(text) : workloadValuesFromText(text, maxNumber)).slice(0, 9);
}

function positionedValuesAfterLabel(row: OcrRow, labels: string[], maxNumber = 100): PositionedValue[] {
  const bounds = labelBoundsInRow(row.words, labels);
  return row.words
    .filter((word) => !bounds || word.left + word.width / 2 > bounds.end + 4)
    .flatMap((word) => (maxNumber <= 100 ? noteValuesFromText(word.text) : workloadValuesFromText(word.text, maxNumber)).map((value) => ({
      value,
      center: word.left + word.width / 2,
    })))
    .slice(0, 9);
}

function detectYearColumns(rows: OcrRow[]): YearColumn[] {
  const candidates = rows
    .map((row) => {
      const columns: YearColumn[] = [];
      row.words.forEach((word, index) => {
        const current = compactPlain(word.text);
        const next = compactPlain(row.words[index + 1]?.text || "");
        const previous = compactPlain(row.words[index - 1]?.text || "");
        const year = ocrYearFromWord(current);
        if (year && year >= 1 && year <= 9 && (next.startsWith("ANO") || previous.startsWith("ANO"))) {
          columns.push({ year, page: row.page, center: word.left + word.width / 2 });
        }
      });
      return columns;
    })
    .filter((columns) => columns.length >= 3)
    .sort((a, b) => b.length - a.length)[0];

  if (!candidates?.length) return [];
  const seen = new Set<number>();
  return candidates
    .sort((a, b) => a.center - b.center)
    .filter((column) => {
      if (seen.has(column.year)) return false;
      seen.add(column.year);
      return true;
    })
    .slice(0, 9);
}

function detectLooseYearColumns(rows: OcrRow[]): YearColumn[] {
  const candidates = rows
    .map((row) => row.words
      .map((word) => ({ year: ocrYearFromWord(word.text), page: row.page, center: word.left + word.width / 2 }))
      .filter((item): item is YearColumn => Boolean(item.year && item.year >= 1 && item.year <= 9)))
    .filter((columns) => columns.length >= 4)
    .sort((a, b) => b.length - a.length)[0];
  if (!candidates?.length) return [];
  const seen = new Set<number>();
  return candidates
    .sort((a, b) => a.center - b.center)
    .filter((column) => {
      if (seen.has(column.year)) return false;
      seen.add(column.year);
      return true;
    })
    .slice(0, 9);
}

function nearestYearForValue(value: PositionedValue, columns: YearColumn[], page: number) {
  const samePage = columns.filter((column) => column.page === page);
  if (!samePage.length) return null;
  return samePage.reduce((closest, column) => (
    Math.abs(column.center - value.center) < Math.abs(closest.center - value.center) ? column : closest
  )).year;
}

function assignComponentValues(
  notes: Record<string, Record<number, string>>,
  component: ComponentRow,
  values: string[],
) {
  if (!values.length) return;
  const activeYears = years.filter((year) => year >= component.inicio && year <= component.fim);
  const mappedYears = values.length >= years.length ? years : activeYears;
  notes[component.id] = { ...(notes[component.id] ?? {}) };
  values.slice(0, mappedYears.length).forEach((value, index) => {
    const year = mappedYears[index];
    if (year >= component.inicio && year <= component.fim) notes[component.id][year] = value;
  });
}

function assignPositionedComponentValues(
  notes: Record<string, Record<number, string>>,
  component: ComponentRow,
  values: PositionedValue[],
  row: OcrRow,
  columns: YearColumn[],
) {
  if (!values.length) return false;
  if (!columns.length) {
    assignComponentValues(notes, component, values.map((item) => item.value));
    return true;
  }
  notes[component.id] = { ...(notes[component.id] ?? {}) };
  let assigned = false;
  values.forEach((item) => {
    const year = nearestYearForValue(item, columns, row.page);
    if (year && year >= component.inicio && year <= component.fim) {
      notes[component.id][year] = item.value;
      assigned = true;
    }
  });
  return assigned;
}

function fillTableFromWords(record: HistoryRecord, words: OcrWord[]) {
  const rows = wordRows(words);
  const columns = detectYearColumns(rows);
  const fallbackColumns = columns.length ? columns : detectLooseYearColumns(rows);
  const notas = { ...record.notas };
  const cargaHoraria = { ...record.cargaHoraria };
  const resultados = { ...record.resultados };

  for (const component of record.matriz) {
    const rowIndex = rows.findIndex((item) => rowMatchesComponent(item.text, component));
    const row = rowIndex >= 0 ? rows[rowIndex] : null;
    if (!row) continue;
    const sameRowValues = positionedValuesAfterLabel(row, tokens);
    const nextRowValues = !sameRowValues.length && rows[rowIndex + 1]
      ? positionedValuesAfterLabel(rows[rowIndex + 1], [])
      : [];
    const sourceRow = sameRowValues.length ? row : rows[rowIndex + 1];
    const assigned = sourceRow
      ? assignPositionedComponentValues(notas, component, sameRowValues.length ? sameRowValues : nextRowValues, sourceRow, fallbackColumns)
      : false;
    if (!assigned) assignComponentValues(notas, component, (sameRowValues.length ? sameRowValues : nextRowValues).map((item) => item.value));
  }

  const workloadMap: Array<[keyof WorkloadRow, string[]]> = [
    ["oferta", ["OFERTA", "CARGA HORARIA", "CH"]],
    ["frequencia", ["FREQUENCIA ANUAL", "FREQUENCIA"]],
    ["percentual", ["% FREQUENCIA", "PERCENTUAL", "%"]],
  ];
  for (const [key, labels] of workloadMap) {
    const row = rows.find((item) => rowHasLabel(item.text, labels));
    if (!row) continue;
    const maxNumber = key === "percentual" ? 100 : 2000;
    const rowIndex = rows.indexOf(row);
    const positioned = positionedValuesAfterLabel(row, labels, maxNumber);
    const nextPositioned = !positioned.length && rows[rowIndex + 1]
      ? positionedValuesAfterLabel(rows[rowIndex + 1], [], maxNumber)
      : [];
    const sourceValues = positioned.length ? positioned : nextPositioned;
    const sourceRow = positioned.length ? row : rows[rowIndex + 1];
    if (fallbackColumns.length && sourceRow) {
      sourceValues.forEach((item) => {
        const year = nearestYearForValue(item, fallbackColumns, sourceRow.page);
        if (year) cargaHoraria[year] = { ...cargaHoraria[year], [key]: item.value };
      });
      return;
    }
    sourceValues.forEach((item, index) => {
      cargaHoraria[index + 1] = { ...cargaHoraria[index + 1], [key]: item.value };
    });
  }

  const resultRow = rows.find((item) => rowHasLabel(item.text, ["RESULTADO", "SITUACAO"]) || /APROVADO|REPROVADO|TRANSFERIDO|CURSANDO/.test(plain(item.text)));
  if (resultRow) {
    resultWordsFromText(plain(resultRow.text)).forEach((value, index) => {
      resultados[index + 1] = value;
    });
  }

  return { notas, cargaHoraria, resultados };
}

function fillTableFromText(
  record: HistoryRecord,
  normalizedLines: string[],
  baseNotes: Record<string, Record<number, string>>,
  baseWorkload: Record<number, WorkloadRow>,
  baseResults: Record<number, string>,
) {
  const notas = { ...baseNotes };
  const cargaHoraria = { ...baseWorkload };
  const resultados = { ...baseResults };

  normalizedLines.forEach((line, lineIndex) => {
    const context = [line, normalizedLines[lineIndex + 1] || ""].join(" ");
    const explicitYear = explicitSchoolYearFromText(context);

    for (const component of record.matriz) {
      const labels = labelsForComponent(component);
      notas[component.id] = { ...(notas[component.id] ?? {}) };
      if (!rowMatchesComponent(context, component)) continue;
      const sourceText = textAfterFirstLabel(context, labels);
      const pairs = yearValuePairsFromText(sourceText);
      const values = noteValuesFromText(sourceText);
      if (pairs.length) {
        pairs.forEach(({ year, value }) => {
          if (year >= component.inicio && year <= component.fim) notas[component.id][year] = value;
        });
      } else if (explicitYear && explicitYear >= component.inicio && explicitYear <= component.fim && values[0]) {
        notas[component.id][explicitYear] = values[0];
      } else {
        assignComponentValues(notas, component, values);
      }
      break;
    }

    const workloadMap: Array<[keyof WorkloadRow, string[], number]> = [
      ["oferta", ["OFERTA ANUAL", "OFERTA", "CARGA HORARIA"], 2000],
      ["frequencia", ["FREQUENCIA ANUAL", "FREQUENCIA"], 2000],
      ["percentual", ["% FREQUENCIA", "PERCENTUAL", "%"], 100],
    ];
    workloadMap.forEach(([key, labels, maxNumber]) => {
      if (!rowHasLabel(context, labels)) return;
      const sourceText = textAfterFirstLabel(context, labels);
      const pairs = yearValuePairsFromText(sourceText, maxNumber);
      const values = workloadValuesFromText(sourceText, maxNumber);
      if (pairs.length) {
        pairs.forEach(({ year, value }) => {
          cargaHoraria[year] = { ...cargaHoraria[year], [key]: value };
        });
        return;
      }
      if (!values.length) return;
      if (explicitYear) {
        cargaHoraria[explicitYear] = { ...cargaHoraria[explicitYear], [key]: values[0] };
        return;
      }
      values.forEach((value, index) => {
        const year = index + 1;
        cargaHoraria[year] = { ...cargaHoraria[year], [key]: value };
      });
    });

    if (/RESULTADO|SITUA[CÇ][AÃ]O|APROVADO|REPROVADO|TRANSFERIDO|CURSANDO/.test(line)) {
      const values = resultWordsFromText(context);
      if (explicitYear && values[0]) {
        resultados[explicitYear] = values[0];
      } else {
        values.forEach((value, index) => {
          resultados[index + 1] = value;
        });
      }
    }
  });

  return { notas, cargaHoraria, resultados };
}

function applyOcrTextToHistory(record: HistoryRecord, rawText: string, words: OcrWord[] = [], schoolDirectory: SchoolDirectoryItem[] = []): HistoryRecord {
  const lines = rawText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const normalizedLines = lines.map(plain);
  const normalizedText = normalizedLines.join("\n");
  const studentName = cleanOcrPerson(
    valueRightOfLabel(words, ["NOME DO ALUNO", "NOME DO A ALUNO A", "ALUNO", "NOME"], ["ID DO ALUNO", "ID ALUNO", "NUMERO DO ALUNO", "MATRICULA", "DATA DE NASCIMENTO", "NASCIMENTO", "NACIONALIDADE", "NATURALIDADE", "IDENTIDADE", "RG"]) ||
    findLineFieldValue(lines, ["NOME DO ALUNO", "NOME DO(A) ALUNO(A)", "ALUNO"]) ||
    findFieldValue(rawText, ["NOME DO ALUNO", "NOME DO A ALUNO A", "NOME DO(A) ALUNO(A)", "ALUNO"], ["ID DO ALUNO", "ID ALUNO", "NUMERO DO ALUNO", "MATRICULA", "DATA DE NASCIMENTO", "NASCIMENTO", "NACIONALIDADE", "NATURALIDADE", "IDENTIDADE", "RG", "FILIAÇÃO", "FILIACAO", "PAI", "MAE"]) ||
    findLabeledValue(lines, ["NOME DO ALUNO", "NOME DO(A) ALUNO(A)", "ALUNO", "NOME"]),
  );
  const studentId = cleanStudentId(
    valueRightOfLabel(words, ["ID DO ALUNO", "ID ALUNO", "NUMERO DO ALUNO", "NUMERO DO ALUNO NO CENSO", "MATRICULA", "CODIGO DO ALUNO"], ["NOME DO ALUNO", "ALUNO", "DATA DE NASCIMENTO", "NASCIMENTO", "NACIONALIDADE", "NATURALIDADE"]) ||
    findLineFieldValue(lines, ["ID DO ALUNO", "ID ALUNO", "NUMERO DO ALUNO", "NUMERO DO ALUNO NO CENSO", "MATRICULA", "CODIGO DO ALUNO"]) ||
    findFieldValue(rawText, ["ID DO ALUNO", "ID ALUNO", "NUMERO DO ALUNO", "NUMERO DO ALUNO NO CENSO", "MATRICULA", "CODIGO DO ALUNO"], ["NOME DO ALUNO", "ALUNO", "DATA DE NASCIMENTO", "NASCIMENTO", "NACIONALIDADE", "NATURALIDADE", "IDENTIDADE", "RG", "PAI", "MAE"]) ||
    findLabeledValue(lines, ["ID DO ALUNO", "ID ALUNO", "NUMERO DO ALUNO", "NUMERO DO ALUNO NO CENSO", "MATRICULA", "CODIGO DO ALUNO"]),
  );
  const birthLine = normalizedLines.find((line) => line.includes("NASC")) || normalizedText;
  const birthDate = findFirstDate(valueRightOfLabel(words, ["DATA DE NASCIMENTO", "NASCIMENTO", "NASC"], ["NACIONALIDADE", "NATURALIDADE", "IDENTIDADE", "RG"]) || birthLine || "") || findBirthDate(rawText);
  const naturalidade = valueRightOfLabel(words, ["NATURALIDADE", "NATURAL DE"], ["IDENTIDADE", "RG", "NOME DO PAI", "PAI", "NOME DA MAE", "MAE"]) || findLineFieldValue(lines, ["NATURALIDADE", "NATURAL DE"]) || findFieldValue(rawText, ["NATURALIDADE", "NATURAL DE"], ["IDENTIDADE", "RG", "NACIONALIDADE", "NOME DO PAI", "NOME DA MAE", "FILIAÇÃO", "FILIACAO", "PAI", "MAE"]) || findLabeledValue(lines, ["NATURALIDADE", "NATURAL DE"]);
  const nacionalidade = valueRightOfLabel(words, ["NACIONALIDADE"], ["NATURALIDADE", "NATURAL DE", "IDENTIDADE", "RG"]) || findLineFieldValue(lines, ["NACIONALIDADE"]) || findFieldValue(rawText, ["NACIONALIDADE"], ["NATURALIDADE", "NATURAL DE", "IDENTIDADE", "RG", "PAI", "MAE"]) || findLabeledValue(lines, ["NACIONALIDADE"]);
  const identidade = valueRightOfLabel(words, ["IDENTIDADE", "RG"], ["NOME DO PAI", "PAI", "NOME DA MAE", "MAE"]) || findLineFieldValue(lines, ["IDENTIDADE", "RG"]) || findFieldValue(rawText, ["IDENTIDADE", "RG"], ["NOME DO PAI", "NOME DA MAE", "PAI", "MAE", "FILIAÇÃO", "FILIACAO"]) || findLabeledValue(lines, ["IDENTIDADE", "RG"]);
  const father = cleanOcrPerson(valueRightOfLabel(words, ["NOME DO PAI", "PAI"], ["NOME DA MAE", "MAE", "DATA DE NASCIMENTO", "NASCIMENTO"]) || findLineFieldValue(lines, ["NOME DO PAI", "PAI"]) || findFieldValue(rawText, ["NOME DO PAI", "PAI"], ["NOME DA MAE", "MAE", "DATA DE NASCIMENTO", "NASCIMENTO", "NACIONALIDADE", "NATURALIDADE"]) || findLabeledValue(lines, ["NOME DO PAI", "PAI"]));
  const mother = cleanOcrPerson(valueRightOfLabel(words, ["NOME DA MAE", "MAE"], ["DATA DE NASCIMENTO", "NASCIMENTO", "NACIONALIDADE", "NATURALIDADE"]) || findLineFieldValue(lines, ["NOME DA MAE", "MAE"]) || findFieldValue(rawText, ["NOME DA MAE", "MAE"], ["DATA DE NASCIMENTO", "NASCIMENTO", "NACIONALIDADE", "NATURALIDADE", "IDENTIDADE", "RG"]) || findLabeledValue(lines, ["NOME DA MAE", "MAE"]));

  let notas = { ...record.notas };
  let resultados = { ...record.resultados };
  let cargaHoraria = { ...record.cargaHoraria };
  if (words.length) {
    const table = fillTableFromWords(record, words);
    notas = table.notas;
    resultados = table.resultados;
    cargaHoraria = table.cargaHoraria;
  }
  for (const component of record.matriz) {
    const lineIndex = bestLineIndexForComponent(normalizedLines, component);
    if (lineIndex < 0) continue;
    const labels = labelsForComponent(component);
    const context = normalizedLines.slice(lineIndex, lineIndex + 2).join(" ");
    const sourceText = textAfterFirstLabel(context, labels);
    const pairs = yearValuePairsFromText(sourceText);
    const values = noteValuesFromText(sourceText);
    if (!pairs.length && !values.length) continue;
    const explicitYear = explicitSchoolYearFromText(context);
    if (pairs.length) {
      notas[component.id] = { ...(notas[component.id] ?? {}) };
      pairs.forEach(({ year, value }) => {
        if (year >= component.inicio && year <= component.fim) notas[component.id][year] = value;
      });
    } else if (explicitYear && explicitYear >= component.inicio && explicitYear <= component.fim) {
      notas[component.id] = { ...(notas[component.id] ?? {}), [explicitYear]: values[0] };
    } else {
      assignComponentValues(notas, component, values);
    }
  }

  const textTable = fillTableFromText(record, normalizedLines, notas, cargaHoraria, resultados);
  notas = textTable.notas;
  resultados = textTable.resultados;
  cargaHoraria = textTable.cargaHoraria;

  const resultLineIndex = normalizedLines.findIndex((line) => /RESULTADO|SITUA[CÇ][AÃ]O|APROVADO|REPROVADO|TRANSFERIDO|CURSANDO/.test(line));
  const resultSource = resultLineIndex >= 0 ? normalizedLines.slice(resultLineIndex, resultLineIndex + 4).join(" ") : normalizedText;
  resultWordsFromText(resultSource).forEach((value, index) => {
    resultados[index + 1] = value;
  });

  const ofertaLine = normalizedLines.find((line) => line.includes("OFERTA") || line.includes("CARGA HORARIA"));
  const frequenciaLine = normalizedLines.find((line) => line.includes("FREQUENCIA") && !line.includes("%"));
  const percentualLine = normalizedLines.find((line) => line.includes("%"));
  const workloadRows: Array<[keyof WorkloadRow, string | undefined]> = [
    ["oferta", ofertaLine],
    ["frequencia", frequenciaLine],
    ["percentual", percentualLine],
  ];
  workloadRows.forEach(([key, line]) => {
    if (!line) return;
    const lineIndex = normalizedLines.indexOf(line);
    const maxNumber = key === "percentual" ? 100 : 2000;
    const context = lineIndex >= 0 ? normalizedLines.slice(lineIndex, lineIndex + 2).join(" ") : line;
    const values = workloadValuesFromText(context, maxNumber);
    const explicitYear = explicitSchoolYearFromText(context);
    if (explicitYear && values[0]) {
      cargaHoraria[explicitYear] = { ...cargaHoraria[explicitYear], [key]: values[0] };
      return;
    }
    values.forEach((value, index) => {
      const year = index + 1;
      cargaHoraria[year] = { ...cargaHoraria[year], [key]: value };
    });
  });

  const birthYear = birthDate ? birthDate.slice(0, 4) : "";
  const schoolYears = Array.from(new Set(Array.from(normalizedText.matchAll(/\b(?:19|20)\d{2}\b/g)).map((match) => match[0])))
    .filter((year) => year !== birthYear)
    .slice(0, 9);
  const filledStudies = fillStudiesFromText(record, normalizedLines, schoolDirectory);
  const estudos = filledStudies.map((study, index) => ({
    ...study,
    ano: study.ano || schoolYears[index] || "",
  }));

  const [naturalidadeCidade, naturalidadeEstado] = naturalidade
    ? splitNaturalidade(naturalidade, record.aluno.naturalidadeCidade, record.aluno.naturalidadeEstado)
    : [record.aluno.naturalidadeCidade, record.aluno.naturalidadeEstado];

  return {
    ...record,
    aluno: {
      ...record.aluno,
      nome: studentName || record.aluno.nome,
      idAluno: studentId || record.aluno.idAluno,
      nascimento: birthDate || record.aluno.nascimento,
      nacionalidade: nacionalidade || record.aluno.nacionalidade,
      naturalidadeCidade: naturalidadeCidade || record.aluno.naturalidadeCidade,
      naturalidadeEstado: naturalidadeEstado || record.aluno.naturalidadeEstado,
      identidade: identidade || record.aluno.identidade || "-",
      pai: father || record.aluno.pai,
      mae: mother || record.aluno.mae,
    },
    notas,
    resultados,
    cargaHoraria,
    estudos,
  };
}

function calculatePercent(oferta: string, frequencia: string) {
  const offer = Number(oferta.replace(",", "."));
  const freq = Number(frequencia.replace(",", "."));
  if (!offer || Number.isNaN(offer) || Number.isNaN(freq)) return "";
  const result = (freq / offer) * 100;
  return `${Number.isInteger(result) ? result.toFixed(0) : result.toFixed(1).replace(".", ",")}%`;
}

const storageKey = "historico-escolar-online:v1";
const authStorageKey = "historico-escolar-online:auth:v1";
const adminStorageKey = "historico-escolar-online:admin:v1";
const migratedSchoolId = "escola-principal";

const credeOptions = [
  "CREDE 1 - MARACANAU",
  "CREDE 2 - ITAPIPOCA",
  "CREDE 3 - ACARAU",
  "CREDE 4 - CAMOCIM",
  "CREDE 5 - TIANGUA",
  "CREDE 6 - SOBRAL",
  "CREDE 7 - CANINDE",
  "CREDE 8 - BATURITE",
  "CREDE 9 - HORIZONTE",
  "CREDE 10 - RUSSAS",
  "CREDE 11 - JAGUARIBE",
  "CREDE 12 - QUIXADA",
  "CREDE 13 - CRATEUS",
  "CREDE 14 - SENADOR POMPEU",
  "CREDE 15 - TAUA",
  "CREDE 16 - IGUATU",
  "CREDE 17 - ICO",
  "CREDE 18 - CRATO",
  "CREDE 19 - JUAZEIRO DO NORTE",
  "CREDE 20 - BREJO SANTO",
];

const ptAlphabetical = new Intl.Collator("pt-BR", { sensitivity: "base", numeric: true });

function compareText(a: string, b: string) {
  return ptAlphabetical.compare(upper(a), upper(b));
}

function compareFolders(a: Folder, b: Folder) {
  return compareText(a.nome, b.nome) || compareText(a.anoLetivo, b.anoLetivo);
}

function compareStudentRecords(a: HistoryRecord, b: HistoryRecord) {
  return compareText(a.aluno.nome || a.codigo, b.aluno.nome || b.codigo)
    || compareText(a.anoLetivo, b.anoLetivo)
    || compareText(a.codigo, b.codigo);
}

function cloneMatrix(rows = matrixSeed) {
  return rows.map((component) => ({ ...component }));
}

function cloneRecord<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeMatrixRows(rows?: ComponentRow[] | null): ComponentRow[] {
  const source = rows?.length ? rows : matrixSeed;
  return source.map((component, index) => {
    const inicio = Math.min(9, Math.max(1, Number(component.inicio) || 1));
    const fim = Math.min(9, Math.max(inicio, Number(component.fim) || 9));
    return {
      id: component.id || `disciplina-${index + 1}`,
      area: component.area || "Parte Diversificada",
      nome: uppercaseInput(component.nome || ""),
      inicio,
      fim,
      avaliativo: component.avaliativo ?? true,
    };
  });
}

function normalizeNotesForMatrix(notes: HistoryRecord["notas"] | undefined, rows: ComponentRow[]) {
  return rows.reduce<HistoryRecord["notas"]>((acc, component) => {
    acc[component.id] = years.reduce<Record<number, string>>((row, year) => {
      row[year] = normalizeNoteInput(notes?.[component.id]?.[year] ?? "");
      return row;
    }, {});
    return acc;
  }, {});
}

function normalizeHexColor(value: string | undefined, fallback: string) {
  const color = String(value ?? "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color.toLocaleLowerCase("pt-BR") : fallback;
}

function normalizeModelColors(input?: Partial<HistoryModelColors> | null): HistoryModelColors {
  return {
    destaque: normalizeHexColor(input?.destaque, defaultModelColors.destaque),
    apoio: normalizeHexColor(input?.apoio, defaultModelColors.apoio),
    borda: normalizeHexColor(input?.borda, defaultModelColors.borda),
  };
}

function normalizeModelTemplate(record: HistoryRecord, fallbackSchoolId = record.schoolId || ""): HistoryRecord {
  const normalized = normalizeHistory(record, fallbackSchoolId, []);
  const modeloCores = normalizeModelColors(record.modeloCores ?? normalized.modeloCores);
  const matriz = normalizeMatrixRows(record.matriz?.length ? record.matriz : normalized.matriz);
  const template: HistoryRecord = {
    ...normalized,
    id: "modelo-historico",
    schoolId: fallbackSchoolId,
    codigo: "MODELO",
    folderId: "",
    anoLetivo: "",
    status: "Em preenchimento",
    updatedAt: record.updatedAt || new Date().toISOString(),
    modeloCores,
    matriz,
    notas: normalizeNotesForMatrix(record.notas, matriz),
    notasNegritoAnos: { ...normalized.notasNegritoAnos },
    resultados: { ...normalized.resultados },
    cargaHoraria: cloneRecord(normalized.cargaHoraria),
    estudos: normalized.estudos.map((row) => ({ ...row })),
    certificado: { ...normalized.certificado },
    observacoes: normalized.observacoes.length ? [...normalized.observacoes] : [""],
    localData: { ...normalized.localData },
    aluno: {
      ...normalized.aluno,
      nome: "",
      idAluno: "",
      nascimento: "",
      identidade: "-",
      pai: "",
      paiNaoDeclarado: false,
      mae: "",
    },
    fotosHistorico: undefined,
  };
  return template;
}

function normalizeModel(input?: Partial<HistoryModel> | null): HistoryModel {
  const matriz = normalizeMatrixRows(input?.matriz);
  const cores = normalizeModelColors(input?.cores ?? input?.template?.modeloCores);
  return {
    matriz,
    cores,
    template: input?.template ? { ...normalizeModelTemplate(input.template, input.template.schoolId), modeloCores: cores } : undefined,
    updatedAt: input?.updatedAt,
  };
}

function modelForSchool(data: AppData, schoolId?: string | null) {
  if (!schoolId) return normalizeModel();
  return normalizeModel(data.modelos?.[schoolId]);
}

function createAdminUser(input?: Partial<AdminUser>): AdminUser {
  return {
    id: input?.id || crypto.randomUUID(),
    nome: uppercaseInput(input?.nome?.trim() || ""),
    usuario: uppercaseInput(input?.usuario?.trim() || ""),
    email: normalizeEmail(input?.email || ""),
    cpf: formatCpf(input?.cpf || ""),
    senha: input?.senha?.trim() || "123456",
    crede: uppercaseInput(input?.crede?.trim() || "CREDE 20 - BREJO SANTO"),
    nivel: "gestao",
    ativo: input?.ativo ?? true,
    mustChangePassword: input?.mustChangePassword ?? !input?.id,
    createdAt: input?.createdAt || new Date().toISOString(),
  };
}

function normalizeSchoolAccessLevel(value?: string, fallback: SchoolAccessLevel = "secundario"): SchoolAccessLevel {
  return value === "principal" ? "principal" : value === "secundario" ? "secundario" : fallback;
}

function createSchoolAccess(input?: Partial<SchoolAccess>, fallbackLevel: SchoolAccessLevel = "secundario"): SchoolAccess {
  return {
    id: input?.id || crypto.randomUUID(),
    usuario: uppercaseInput(input?.usuario?.trim() || ""),
    email: normalizeEmail(input?.email || ""),
    cpf: formatCpf(input?.cpf || ""),
    senha: input?.senha?.trim() || "123456",
    nivel: normalizeSchoolAccessLevel(input?.nivel, fallbackLevel),
    mustChangePassword: input?.mustChangePassword ?? !input?.id,
    createdAt: input?.createdAt || new Date().toISOString(),
  };
}

function createSchoolAccount(input?: Partial<SchoolAccount> & { escola?: Partial<School> }): SchoolAccount {
  const escola = { ...(input?.id ? defaultSchool : emptySchool), ...(input?.escola ?? {}) };
  const usuario = input && "usuario" in input
    ? input.usuario ?? ""
    : safeFileName(escola.nome || "ESCOLA").replace(/-/g, "");
  const mainAccess = createSchoolAccess({
    id: input?.accessos?.[0]?.id || `${input?.id || "nova-escola"}-principal`,
    usuario,
    senha: input?.senha || "123456",
    nivel: input?.accessos?.[0]?.nivel || "principal",
    mustChangePassword: input?.mustChangePassword ?? !input?.id,
    createdAt: input?.createdAt,
  }, "principal");
  const accessos = input?.accessos?.length
    ? input.accessos.map((access, index) => createSchoolAccess({
        ...access,
        usuario: access.usuario || (index === 0 ? usuario : ""),
        senha: access.senha || (index === 0 ? input?.senha : "123456"),
      }, index === 0 ? "principal" : "secundario"))
    : [mainAccess];
  const primaryAccess = accessos[0] ?? mainAccess;
  return {
    id: input?.id || crypto.randomUUID(),
    usuario: primaryAccess.usuario,
    senha: primaryAccess.senha,
    tipo: normalizeSchoolKind(input?.tipo),
    ativo: input?.ativo ?? true,
    escola,
    createdAt: input?.createdAt || new Date().toISOString(),
    mustChangePassword: primaryAccess.mustChangePassword,
    accessos,
  };
}

function hasDuplicatedSchoolAccess(accounts: SchoolAccount[]) {
  const seen = new Set<string>();
  return accounts.some((account) => account.accessos.some((access) => {
    if (!access.usuario) return false;
    const key = `${account.tipo}:${access.usuario}`;
    if (seen.has(key)) return true;
    seen.add(key);
    return false;
  }));
}

function hasDuplicatedAdminAccess(admin: AdminCredentials | null | undefined, users: AdminUser[]) {
  const seen = new Set<string>();
  if (admin?.usuario) seen.add(admin.usuario);
  return users.some((user) => {
    if (!user.usuario) return false;
    if (seen.has(user.usuario)) return true;
    seen.add(user.usuario);
    return false;
  });
}

function normalizeFolder(folder: Partial<Folder>, schoolId: string): Folder {
  return {
    id: folder.id || crypto.randomUUID(),
    schoolId: folder.schoolId || schoolId,
    anoLetivo: uppercaseInput(folder.anoLetivo || String(new Date().getFullYear())),
    nome: uppercaseInput(folder.nome || "TURMA"),
    tipoEnsino: uppercaseInput(folder.tipoEnsino || "ENSINO FUNDAMENTAL"),
  };
}

function normalizeHistory(record: HistoryRecord, fallbackSchoolId = migratedSchoolId, folders: Folder[] = []): HistoryRecord {
  const demoStudent =
    record.aluno?.nome === "Caik Aiko Silva dos Santos" &&
    record.aluno?.nascimento === "2011-09-29" &&
    record.aluno?.pai === "Amanda Ribeiro da Silva" &&
    record.aluno?.mae === "Cicero dos Santos";
  const blank = demoStudent
    ? {
        ...createHistory(defaultSchool, fallbackSchoolId, folders.find((folder) => folder.id === record.folderId)),
        id: record.id,
        codigo: record.codigo,
        status: record.status,
        updatedAt: record.updatedAt,
      }
    : null;

  const source = blank ?? record;
  const seedIds = new Set(matrixSeed.map((component) => component.id));
  const savedExtraComponents = source.matriz?.filter((component) => !seedIds.has(component.id)) ?? [];
  const resultados = years.reduce<Record<number, string>>((acc, year) => {
    acc[year] = uppercaseInput(source.resultados?.[year] || "");
    return acc;
  }, {});
  const notasNegritoAnos = years.reduce<Record<number, boolean>>((acc, year) => {
    acc[year] = Boolean(source.notasNegritoAnos?.[year]);
    return acc;
  }, {});
  const certificado = {
    ...source.certificado,
    preencher: Boolean(source.certificado?.preencher),
    texto: source.certificado?.editado ? source.certificado.texto : "",
    editado: Boolean(source.certificado?.editado),
  };
  const observacoes = source.observacoes?.length ? source.observacoes : [""];
  const estudos = years.map((year, index) => {
    const saved = source.estudos?.[index];
    return {
      serie: saved?.serie || `${year}o ANO`,
      ativo: saved?.ativo ?? true,
      ano: uppercaseInput(saved?.ano || ""),
      escola: uppercaseInput(saved?.escola || ""),
      cidade: uppercaseInput(saved?.cidade || ""),
      estado: uppercaseInput(saved?.estado || ""),
    };
  });
  const modeloCores = normalizeModelColors(source.modeloCores);

  return {
    ...source,
    schoolId: source.schoolId || fallbackSchoolId,
    folderId: record.folderId ?? "",
    anoLetivo: source.anoLetivo || folders.find((folder) => folder.id === record.folderId)?.anoLetivo || "",
    aluno: {
      ...studentDefaultsForSchool(defaultSchool),
      ...source.aluno,
      idAluno: uppercaseInput(source.aluno?.idAluno || ""),
      nacionalidade: uppercaseInput(source.aluno?.nacionalidade || "BRASILEIRA"),
      naturalidadeCidade: uppercaseInput(source.aluno?.naturalidadeCidade || defaultSchool.municipio),
      naturalidadeEstado: uppercaseInput(source.aluno?.naturalidadeEstado || defaultSchool.estado),
      identidade: uppercaseInput(source.aluno?.identidade || "-"),
      pai: source.aluno?.paiNaoDeclarado ? "" : uppercaseInput(source.aluno?.pai || ""),
      paiNaoDeclarado: Boolean(source.aluno?.paiNaoDeclarado),
      mae: uppercaseInput(source.aluno?.mae || ""),
    },
    modeloCores,
    notasNegritoAnos,
    resultados,
    certificado,
    usarCarimboEscola: Boolean(source.usarCarimboEscola),
    usarAssinaturaDiretor: Boolean(source.usarAssinaturaDiretor),
    usarAssinaturaSecretario: Boolean(source.usarAssinaturaSecretario),
    usarQrCode: source.usarQrCode !== false,
    observacoes,
    estudos,
    localData: {
      municipio: uppercaseInput(source.localData?.municipio || defaultSchool.municipio),
      estado: uppercaseInput(source.localData?.estado || defaultSchool.estado),
      data: source.localData?.data || todayIsoDate(),
    },
    matriz: [
      ...matrixSeed.map((component) => {
        const saved = record.matriz?.find((row) => row.id === component.id);
        return {
          ...component,
          ...saved,
          nome: uppercaseInput(saved?.nome || component.nome),
          area: saved?.area || component.area,
        };
      }),
      ...savedExtraComponents.map((component) => ({
        ...component,
        area: component.area || "Parte Diversificada",
        inicio: component.inicio || 1,
        fim: component.fim || 9,
        avaliativo: component.avaliativo ?? true,
      })),
    ],
  };
}

function loadInitialData(): AppData {
  if (typeof window === "undefined") {
    return { escola: defaultSchool, escolas: [], folders: [], historicos: [], transferencias: [], admin: null, adminUsers: [], modelos: {} };
  }
  const saved = window.localStorage.getItem(storageKey);
  if (saved) {
    try {
      const parsed = JSON.parse(saved) as AppData;
      if (parsed.historicos?.length || parsed.escolas?.length) {
        const migratedSchool = createSchoolAccount({
          id: migratedSchoolId,
          usuario: "ESCOLA",
          escola: {
            ...defaultSchool,
            ...parsed.escola,
            logoSistema: parsed.escola?.logoSistema || "",
            logo: parsed.escola?.logo || defaultSchool.logo,
          },
        });
        const escolas = parsed.escolas?.length
          ? parsed.escolas.map((account) => createSchoolAccount(account))
          : [migratedSchool];
        const firstSchoolId = escolas[0]?.id || migratedSchoolId;
        const folders = (parsed.folders ?? []).map((folder) => normalizeFolder(folder, firstSchoolId));
        return {
          escola: escolas[0]?.escola ?? defaultSchool,
          escolas,
          folders,
          historicos: (parsed.historicos ?? []).map((record) => normalizeHistory(record, firstSchoolId, folders)),
          transferencias: parsed.transferencias ?? [],
          admin: parsed.admin ?? null,
          adminUsers: (parsed.adminUsers ?? []).map(createAdminUser),
          modelos: Object.fromEntries(Object.entries(parsed.modelos ?? {}).map(([schoolId, model]) => [schoolId, normalizeModel(model)])),
        };
      }
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }
  return { escola: defaultSchool, escolas: [], folders: [], historicos: [], transferencias: [], admin: null, adminUsers: [], modelos: {} };
}

function loadAdminCredentials() {
  if (typeof window === "undefined") return null;
  const saved = window.localStorage.getItem(adminStorageKey);
  if (!saved) return null;
  try {
    const parsed = JSON.parse(saved) as AdminCredentials;
    return parsed.usuario && parsed.senha ? {
      ...parsed,
      nome: uppercaseInput(parsed.nome || parsed.usuario),
      usuario: uppercaseInput(parsed.usuario),
      email: normalizeEmail(parsed.email || ""),
      cpf: formatCpf(parsed.cpf || ""),
      mustChangePassword: Boolean(parsed.mustChangePassword),
    } : null;
  } catch {
    window.localStorage.removeItem(adminStorageKey);
    return null;
  }
}

function loadAuthSession() {
  if (typeof window === "undefined") return null;
  const saved = window.localStorage.getItem(authStorageKey);
  if (!saved) return null;
  try {
    const parsed = JSON.parse(saved) as AuthSession;
    if (parsed?.role === "owner" || parsed?.role === "manager" || parsed?.role === "school") return parsed?.nome ? parsed : null;
    return null;
  } catch {
    window.localStorage.removeItem(authStorageKey);
    return null;
  }
}

function storeAuthSession(session: AuthSession | null) {
  if (typeof window === "undefined") return;
  if (!session) {
    window.localStorage.removeItem(authStorageKey);
    setCloudSessionToken(null);
    return;
  }
  setCloudSessionToken(session.sessionToken ?? null);
  window.localStorage.setItem(authStorageKey, JSON.stringify(session));
}

function normalizeLoadedData(cloudData: AppData, cloudHistories: HistoryRecord[] = []): AppData {
  const combinedHistories = [...(cloudData.historicos ?? []), ...cloudHistories];
  const escolas = (cloudData.escolas ?? []).map((account) => createSchoolAccount(account));
  const firstSchoolId = escolas[0]?.id || migratedSchoolId;
  const folders = (cloudData.folders ?? []).map((folder) => normalizeFolder(folder, firstSchoolId));
  return {
    ...cloudData,
    escola: cloudData.escola ?? escolas[0]?.escola ?? defaultSchool,
    escolas,
    folders,
    transferencias: cloudData.transferencias ?? [],
    historicos: Array.from(new Map(combinedHistories.map((record) => [record.id, normalizeHistory(record, record.schoolId || firstSchoolId, folders)])).values()),
    admin: cloudData.admin ?? null,
    adminUsers: (cloudData.adminUsers ?? []).map(createAdminUser),
    modelos: Object.fromEntries(Object.entries(cloudData.modelos ?? {}).map(([schoolId, model]) => [schoolId, normalizeModel(model)])),
  };
}

function cloudReadyData(data: AppData): AppData {
  return {
    ...data,
    historicos: data.historicos.map((record) => {
      const { fotosHistorico: _photos, ...cleanRecord } = record;
      return cleanRecord;
    }),
  };
}

function cloudReadySystemData(data: AppData): AppData {
  return {
    ...cloudReadyData(data),
    historicos: [],
  };
}

function cloudReadyHistory(record: HistoryRecord) {
  const { fotosHistorico: _photos, ...cleanRecord } = record;
  return cleanRecord;
}

function saveFailureState(error: unknown) {
  const code = typeof error === "object" && error && "code" in error
    ? String((error as { code?: unknown }).code)
    : "";
  if (code === "permission-denied") return "Não foi possível salvar";
  return "Salvo";
}

function SaveToast({ notice, onClose }: { notice: SaveNotice | null; onClose: () => void }) {
  if (!notice) return null;
  return (
    <div className={`save-toast ${notice.type}`} role="status" aria-live="polite">
      <span>{notice.type === "success" ? "OK" : "!"}</span>
      <strong>{notice.message}</strong>
      <button type="button" onClick={onClose} aria-label="Fechar aviso">×</button>
    </div>
  );
}

function App() {
  const [data, setData] = useState<AppData>({ escola: defaultSchool, escolas: [], folders: [], historicos: [], transferencias: [], admin: null, adminUsers: [], modelos: {} });
  const [auth, setAuth] = useState<AuthSession | null>(null);
  const [adminCredentials, setAdminCredentials] = useState<AdminCredentials | null>(null);
  const [cloudHasAdmin, setCloudHasAdmin] = useState(false);
  const [activeId, setActiveId] = useState("");
  const [activeFolderId, setActiveFolderId] = useState("");
  const [folderDraft, setFolderDraft] = useState("");
  const [folderYearDraft, setFolderYearDraft] = useState(String(new Date().getFullYear()));
  const [folderTeachingDraft, setFolderTeachingDraft] = useState("ENSINO FUNDAMENTAL");
  const [view, setView] = useState<"historicos" | "editor" | "escola" | "turmas" | "alunos" | "novo" | "transferencias" | "modelo">("historicos");
  const [yearFilter, setYearFilter] = useState("");
  const [step, setStep] = useState(0);
  const [query, setQuery] = useState("");
  const [zoom, setZoom] = useState(0.36);
  const [page, setPage] = useState<1 | 2>(1);
  const [previewCollapsed, setPreviewCollapsed] = useState(false);
  const [saveState, setSaveState] = useState("Salvo");
  const [saveNotice, setSaveNotice] = useState<SaveNotice | null>(null);
  const [duplicate, setDuplicate] = useState<HistoryRecord | null>(null);
  const [printBatch, setPrintBatch] = useState<HistoryRecord[] | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [activity, setActivity] = useState<{ activeUsers: CloudActiveUser[]; activities: CloudActivity[] }>({ activeUsers: [], activities: [] });
  const saveTimer = useRef<number | null>(null);
  const noticeTimer = useRef<number | null>(null);
  const qrHandledRef = useRef("");
  const dataRef = useRef(data);

  const currentSchoolAccount = auth?.role === "school"
    ? data.escolas.find((school) => school.id === auth.schoolId)
    : null;
  const currentAdminUser = auth?.role === "manager"
    ? (data.adminUsers ?? []).find((user) => user.id === auth.adminUserId)
    : null;
  const currentSchoolAccesses = currentSchoolAccount?.accessos?.length
    ? currentSchoolAccount.accessos
    : currentSchoolAccount
      ? [createSchoolAccess({ usuario: currentSchoolAccount.usuario, senha: currentSchoolAccount.senha, nivel: "principal", mustChangePassword: currentSchoolAccount.mustChangePassword }, "principal")]
      : [];
  const currentSchoolAccess = currentSchoolAccesses.find((access) => access.id === auth?.accessId)
    ?? currentSchoolAccesses.find((access) => access.usuario === auth?.nome)
    ?? currentSchoolAccesses[0];
  const canEditHistoryModel = currentSchoolAccess?.nivel === "principal" || auth?.accessLevel === "principal";
  const currentSchool = currentSchoolAccount?.escola ?? defaultSchool;
  const currentModel = useMemo(() => modelForSchool(data, currentSchoolAccount?.id), [data.modelos, currentSchoolAccount?.id]);
  const schoolProfileReady = currentSchoolAccount ? isSchoolProfileReady(currentSchool) : false;
  const schoolFolders = currentSchoolAccount
    ? data.folders.filter((folder) => folder.schoolId === currentSchoolAccount.id).sort(compareFolders)
    : [];
  const schoolRecords = currentSchoolAccount
    ? data.historicos.filter((record) => record.schoolId === currentSchoolAccount.id).sort(compareStudentRecords)
    : [];
  const active = schoolRecords.find((item) => item.id === activeId) ?? schoolRecords[0];
  const yearOptions = Array.from(new Set(schoolFolders.map((folder) => folder.anoLetivo).filter(Boolean))).sort().reverse();
  const schoolTransfers = currentSchoolAccount
    ? data.transferencias.filter((request) => (request.fromSchoolId === currentSchoolAccount.id || request.toSchoolId === currentSchoolAccount.id) && !request.hiddenForSchoolIds?.includes(currentSchoolAccount.id))
    : [];
  const incomingTransfers = currentSchoolAccount
    ? data.transferencias.filter((request) => request.fromSchoolId === currentSchoolAccount.id && request.status !== "Enviado")
    : [];
  const receivedTransferNotices = currentSchoolAccount
    ? data.transferencias.filter((request) => request.toSchoolId === currentSchoolAccount.id && request.status === "Enviado" && !request.hiddenForSchoolIds?.includes(currentSchoolAccount.id))
    : [];
  const schoolDirectory = useMemo(() => localSchoolDirectory(data.escolas, data.historicos), [data.escolas, data.historicos]);
  const presenceLabel = (() => {
    if (!auth) return "";
    if (auth.role === "owner" || auth.role === "manager") {
      if (view === "escola") return "Editando cadastro de escola";
      return "No painel restrito";
    }
    if (view === "editor") return "Editando histórico";
    if (view === "modelo") return "Editando modelo do histórico";
    if (view === "novo") return "Criando histórico";
    if (view === "turmas") return "Criando ou consultando turmas";
    if (view === "alunos") return "Consultando alunos";
    if (view === "transferencias") return "Consultando transferências";
    if (view === "escola") return "Editando cadastro da escola";
    return "Consultando históricos";
  })();
  const presenceTarget = auth?.role === "school" && view === "editor" && active
    ? upper(active.aluno.nome) || active.codigo
    : "";
  const showSaveNotice = (message: string, type: SaveNotice["type"] = "success") => {
    setSaveNotice({ message, type });
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setSaveNotice(null), type === "error" ? 5200 : 3400);
  };
  const screenWithNotice = (content: ReactNode) => (
    <>
      {content}
      <SaveToast notice={saveNotice} onClose={() => setSaveNotice(null)} />
    </>
  );

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const refreshActivity = async () => {
    if (!firebaseEnabled || !auth || (auth.role !== "owner" && auth.role !== "manager")) return;
    const nextActivity = await loadCloudActivity();
    setActivity(nextActivity);
  };

  const recordAction = (tipo: string, descricao: string, details: { schoolId?: string; schoolName?: string; targetId?: string; targetName?: string } = {}) => {
    if (!firebaseEnabled || !auth) return;
    if (auth.role === "owner") return;
    if (["LOGIN", "SAIDA", "SENHA"].includes(tipo)) return;
    void recordCloudActivity({
      tipo,
      descricao,
      schoolId: details.schoolId || auth.schoolId || "",
      schoolName: details.schoolName || currentSchoolAccount?.escola.nome || "",
      targetId: details.targetId || "",
      targetName: details.targetName || "",
    }).then(() => {
      if (auth.role === "owner" || auth.role === "manager") void refreshActivity();
    });
  };

  const deleteActivity = async (id?: string) => {
    if (!firebaseEnabled || !auth || (auth.role !== "owner" && auth.role !== "manager")) return;
    if (!id && !window.confirm("Apagar todas as ações recentes?")) return;
    const deleted = await deleteCloudActivity(id ? { id } : { all: true });
    if (!deleted) {
      window.alert("Não foi possível apagar agora.");
      return;
    }
    setActivity((current) => ({
      ...current,
      activities: id ? current.activities.filter((item) => item.id !== id) : [],
    }));
    showSaveNotice(id ? "Ação apagada" : "Ações apagadas");
  };

  useEffect(() => {
    let cancelled = false;
    const initializeData = async () => {
      const localData = loadInitialData();
      let initialData = localData;
      const session = loadAuthSession();
      let activeSession = session;
      setCloudSessionToken(session?.sessionToken ?? null);
      if (firebaseEnabled) {
        try {
          if (session?.sessionToken) {
            const cloudData = await loadCloudState<AppData>();
            const cloudHistories = await loadCloudHistories<HistoryRecord>();
            if (cloudData) {
              initialData = normalizeLoadedData(cloudData, cloudHistories);
            } else {
              activeSession = null;
              storeAuthSession(null);
            }
          } else {
            const setup = await loadCloudSetupStatus();
            setCloudHasAdmin(setup.hasAdmin);
          }
        } catch (error) {
          console.error("Nao foi possivel carregar os dados.", error);
          if (session?.sessionToken) {
            activeSession = null;
            storeAuthSession(null);
          } else {
            setCloudHasAdmin(true);
          }
        }
      }
      if (cancelled) return;
      dataRef.current = initialData;
      setData(initialData);
      setAdminCredentials(initialData.admin ?? loadAdminCredentials());
      setAuth(activeSession);
      const firstRecord = activeSession?.role === "school"
        ? initialData.historicos.find((record) => record.schoolId === activeSession.schoolId)
        : null;
      setActiveId(firstRecord?.id ?? "");
      setIsReady(true);
    };
    void initializeData();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (auth?.role !== "school") return;
    if (!currentSchoolAccount) {
      logout();
      return;
    }
    if (!schoolProfileReady) {
      if (view !== "escola") setView("escola");
      return;
    }
    if (view === "modelo" && !canEditHistoryModel) {
      setView("historicos");
      return;
    }
    if (!activeId && schoolRecords[0]) setActiveId(schoolRecords[0].id);
    if (!schoolFolders.length && !["escola", "turmas", "novo", "modelo"].includes(view)) setView("historicos");
  }, [auth, currentSchoolAccount, schoolProfileReady, canEditHistoryModel, activeId, schoolRecords, schoolFolders.length, view]);

  useEffect(() => {
    if (!isReady || auth?.role !== "school" || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const qrId = params.get("h") || params.get("q") || params.get("historicoQr") || params.get("historico") || params.get("id");
    const qrCode = params.get("c") || params.get("codigo") || "";
    if (!qrId || qrHandledRef.current === qrId) return;
    if (!schoolRecords.length) return;
    const found = schoolRecords.find((record) => record.id === qrId || record.codigo === qrCode);
    if (!found) {
      setSaveState("QR nao encontrado nesta escola");
      return;
    }
    qrHandledRef.current = qrId;
    setActiveId(found.id);
    setView("editor");
    setStep(6);
    setPage(1);
    setSaveState("Historico aberto pelo QR");
    window.history.replaceState(null, "", window.location.pathname);
  }, [isReady, auth?.role, schoolRecords]);

  useEffect(() => {
    if (!isReady) return;
    setSaveState("Salvando...");
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      window.localStorage.setItem(storageKey, JSON.stringify(data));
      if (!firebaseEnabled) {
        setSaveState("Salvo");
        return;
      }
      if (!auth?.sessionToken) {
        setSaveState("Salvo");
        return;
      }
      void saveCloudState(cloudReadySystemData(data))
        .then((stateSaved) => {
          if (!stateSaved) throw new Error("Falha ao salvar dados.");
          return saveCloudHistories(data.historicos.map(cloudReadyHistory));
        })
        .then((historiesSaved) => {
          if (!historiesSaved) throw new Error("Falha ao salvar históricos.");
          setSaveState("Salvo");
        })
        .catch((error) => {
          console.error("Falha ao salvar.", error);
          setSaveState(saveFailureState(error));
        });
    }, 700);
  }, [data, isReady, auth?.sessionToken]);

  useEffect(() => {
    if (!isReady || !auth || !firebaseEnabled) return;
    const sendPresence = () => {
      void pingCloudActivity({
        currentView: view,
        actionLabel: presenceLabel,
        targetId: view === "editor" ? active?.id : "",
        targetName: presenceTarget,
        schoolName: currentSchoolAccount?.escola.nome || "",
      });
    };
    sendPresence();
    const timer = window.setInterval(sendPresence, 35000);
    return () => window.clearInterval(timer);
  }, [isReady, auth, view, presenceLabel, presenceTarget, active?.id, currentSchoolAccount?.escola.nome]);

  useEffect(() => {
    if (!isReady || !auth || (auth.role !== "owner" && auth.role !== "manager") || !firebaseEnabled) return;
    void refreshActivity();
    const timer = window.setInterval(() => void refreshActivity(), 25000);
    return () => window.clearInterval(timer);
  }, [isReady, auth]);

  useEffect(() => {
    const clearPrintBatch = () => setPrintBatch(null);
    window.addEventListener("afterprint", clearPrintBatch);
    return () => window.removeEventListener("afterprint", clearPrintBatch);
  }, []);

  const filtered = data.historicos.filter((record) => {
    const needle = query.toLocaleLowerCase("pt-BR");
    const inSchool = auth?.role === "school" && record.schoolId === auth.schoolId;
    const inFolder = !activeFolderId || record.folderId === activeFolderId;
    const inYear = !yearFilter || record.anoLetivo === yearFilter;
    return (
      inSchool &&
      inFolder &&
      inYear &&
      (record.aluno.nome.toLocaleLowerCase("pt-BR").includes(needle) ||
        formatDate(record.aluno.nascimento).includes(needle) ||
        record.codigo.toLocaleLowerCase("pt-BR").includes(needle))
    );
  }).sort(compareStudentRecords);

  const updateSchool = (patch: Partial<School>) => {
    if (auth?.role !== "school" || !auth.schoolId) {
      window.alert("Entre com o login da escola para alterar os dados cadastrais.");
      return;
    }
    const shouldSaveImageNow = Object.entries(patch).some(([key, value]) =>
      schoolImageKeys.includes(key as SchoolImageKey) &&
      typeof value === "string" &&
      (value === "" || value.startsWith("data:image/"))
    );
    setData((current) => {
      const nextData = {
        ...current,
        escolas: current.escolas.map((account) =>
          account.id === auth.schoolId ? { ...account, escola: { ...account.escola, ...patch } } : account,
        ),
      };
      dataRef.current = nextData;
      if (shouldSaveImageNow) {
        window.setTimeout(() => void persistData(nextData, "Imagem da escola salva", { saveHistories: false }), 0);
      }
      return nextData;
    });
  };

  const applyCloudLogin = (payload: AppData, session: AuthSession, histories?: HistoryRecord[]) => {
    const nextData = normalizeLoadedData(payload, histories ?? []);
    setData(nextData);
    setAdminCredentials(nextData.admin ?? null);
    setAuth(session);
    storeAuthSession(session);
    setCloudHasAdmin(Boolean(nextData.admin?.usuario));
    const firstRecord = session.role === "school"
      ? nextData.historicos.find((record) => record.schoolId === session.schoolId)
      : null;
    setActiveFolderId("");
    setActiveId(firstRecord?.id ?? "");
    setView("historicos");
  };

  const createAdminAccess = async (credentials: AdminCredentials) => {
    const clean = {
      nome: uppercaseInput((credentials.nome || credentials.usuario).trim()),
      usuario: uppercaseInput(credentials.usuario.trim()),
      email: normalizeEmail(credentials.email || ""),
      cpf: formatCpf(credentials.cpf || ""),
      senha: credentials.senha.trim(),
      mustChangePassword: false,
    };
    if (!clean.usuario || !clean.senha) {
      window.alert("Informe usuario e senha.");
      return;
    }
    if (firebaseEnabled) {
      try {
        const result = await createCloudOwner<AppData>(clean);
        applyCloudLogin(result.payload, result.session, result.histories as HistoryRecord[] | undefined);
        return;
      } catch (error) {
        console.error("Falha ao criar acesso restrito.", error);
        const code = String((error as { code?: string })?.code ?? "");
        if (code.includes("already-exists")) {
          setCloudHasAdmin(true);
          try {
            const result = await loginCloudAdmin<AppData>(clean);
            applyCloudLogin(result.payload, result.session, result.histories as HistoryRecord[] | undefined);
          } catch {
            window.alert("O acesso restrito já existe. Entre com o usuário e a senha cadastrados.");
          }
          return;
        }
        window.alert("Não foi possível acessar o banco agora. Tente novamente em instantes.");
        return;
      }
    }
    window.localStorage.setItem(adminStorageKey, JSON.stringify(clean));
    setAdminCredentials(clean);
    const nextData = { ...data, admin: clean };
    setData(nextData);
    void persistData(nextData, "Acesso restrito salvo");
    const session = { role: "owner" as const, nome: clean.usuario };
    setAuth(session);
    storeAuthSession(session);
  };

  const loginAdmin = async (credentials: AdminCredentials) => {
    if (!adminCredentials && !cloudHasAdmin) return createAdminAccess(credentials);
    const usuario = uppercaseInput(credentials.usuario.trim());
    const senha = credentials.senha.trim();
    if (firebaseEnabled) {
      try {
        const result = await loginCloudAdmin<AppData>({ usuario, senha });
        applyCloudLogin(result.payload, result.session, result.histories as HistoryRecord[] | undefined);
        return;
      } catch (error) {
        console.error("Falha no login restrito.", error);
        window.alert("Usuario ou senha incorretos.");
        return;
      }
    }
    if (usuario === adminCredentials.usuario && senha === adminCredentials.senha) {
      const session = { role: "owner" as const, nome: adminCredentials.nome || usuario };
      setAuth(session);
      storeAuthSession(session);
      return;
    }
    const adminUser = (data.adminUsers ?? []).find((user) => user.ativo && user.usuario === usuario && user.senha === senha);
    if (!adminUser) {
      window.alert("Usuario ou senha incorretos.");
      return;
    }
    const session = { role: "manager" as const, nome: adminUser.nome || adminUser.usuario, adminUserId: adminUser.id };
    setAuth(session);
    storeAuthSession(session);
  };

  const recoverSchoolPassword = async (input: { usuario: string; email: string; cpf: string; tipo: SchoolKind }) => {
    const usuario = uppercaseInput(input.usuario.trim());
    const email = normalizeEmail(input.email);
    const cpf = formatCpf(input.cpf);
    if (!usuario || !email || digitsOnly(cpf).length !== 11) {
      window.alert("Informe Login, E-mail e CPF cadastrados.");
      return false;
    }
    if (firebaseEnabled) {
      try {
        const recovered = await recoverCloudSchoolPassword({ usuario, email, cpf, tipo: input.tipo });
        if (!recovered) throw new Error("Falha ao recuperar senha.");
      } catch (error) {
        console.error("Falha ao recuperar senha.", error);
        window.alert("Não encontramos um acesso ativo da escola com esses dados.");
        return false;
      }
      showSaveNotice("Senha provisória liberada com sucesso");
      return true;
    }
    const foundSchool = data.escolas.find((account) =>
      account.ativo !== false &&
      account.tipo === input.tipo &&
      account.accessos.some((access) =>
        access.usuario === usuario &&
        normalizeEmail(access.email) === email &&
        digitsOnly(access.cpf) === digitsOnly(cpf)
      )
    );
    const foundAccess = foundSchool?.accessos.find((access) =>
      access.usuario === usuario &&
      normalizeEmail(access.email) === email &&
      digitsOnly(access.cpf) === digitsOnly(cpf)
    );
    if (!foundSchool || !foundAccess) {
      window.alert("Não encontramos um acesso ativo da escola com esses dados.");
      return false;
    }
    const nextData = {
      ...data,
      escolas: data.escolas.map((account) => {
        if (account.id !== foundSchool.id) return account;
        const accessos = account.accessos.map((access) =>
          access.id === foundAccess.id ? { ...access, senha: "123456", mustChangePassword: true } : access,
        );
        const primaryAccess = accessos[0] ?? createSchoolAccess({ usuario: account.usuario, senha: account.senha }, "principal");
        return { ...account, accessos, senha: primaryAccess.senha, mustChangePassword: primaryAccess.mustChangePassword };
      }),
    };
    setData(nextData);
    void persistData(nextData, "Senha provisória liberada");
    showSaveNotice("Senha provisória liberada com sucesso");
    return true;
  };

  const changeAdminPassword = async (currentPassword: string, nextPassword: string, confirmation: string) => {
    if (!adminCredentials) {
      window.alert("Acesso restrito nao localizado.");
      return false;
    }
    if (!firebaseEnabled && currentPassword.trim() !== adminCredentials.senha) {
      window.alert("Senha atual incorreta.");
      return false;
    }
    const cleanPassword = nextPassword.trim();
    if (cleanPassword.length < 6) {
      window.alert("A nova senha precisa ter pelo menos 6 caracteres.");
      return false;
    }
    if (cleanPassword !== confirmation.trim()) {
      window.alert("As senhas nao conferem.");
      return false;
    }
    if (cleanPassword === adminCredentials.senha) {
      window.alert("Informe uma senha diferente da atual.");
      return false;
    }
    if (firebaseEnabled) {
      try {
        const changed = await changeCloudPassword({ currentPassword, nextPassword: cleanPassword });
        if (!changed) throw new Error("Falha ao alterar senha.");
      } catch (error) {
        console.error("Falha ao alterar senha.", error);
        window.alert("Senha atual incorreta ou não foi possível alterar agora.");
        return false;
      }
    }
    const nextAdmin = { ...adminCredentials, senha: cleanPassword, mustChangePassword: false };
    window.localStorage.setItem(adminStorageKey, JSON.stringify(nextAdmin));
    setAdminCredentials(nextAdmin);
    const nextData = { ...data, admin: nextAdmin };
    setData(nextData);
    void persistData(nextData, "Senha alterada");
    return true;
  };

  const changeRestrictedFirstPassword = async (password: string) => {
    if (!auth || (auth.role !== "owner" && auth.role !== "manager")) return;
    const cleanPassword = password.trim();
    if (cleanPassword.length < 6 || cleanPassword === "123456") {
      window.alert("Crie uma senha com pelo menos 6 caracteres e diferente da senha provisoria.");
      return;
    }
    if (firebaseEnabled) {
      try {
        const changed = await changeCloudPassword({ nextPassword: cleanPassword, firstAccess: true });
        if (!changed) throw new Error("Falha ao alterar senha.");
      } catch (error) {
        console.error("Falha ao alterar senha.", error);
        window.alert("Não foi possível alterar a senha agora.");
        return;
      }
    }
    if (auth.role === "owner") {
      const nextAdmin = { ...(adminCredentials ?? { usuario: auth.nome, senha: "" }), senha: cleanPassword, mustChangePassword: false };
      window.localStorage.setItem(adminStorageKey, JSON.stringify(nextAdmin));
      setAdminCredentials(nextAdmin);
      const nextData = { ...data, admin: nextAdmin };
      setData(nextData);
      void persistData(nextData, "Senha alterada");
      return;
    }
    if (!auth.adminUserId) return;
    const nextData = {
      ...data,
      adminUsers: (data.adminUsers ?? []).map((user) => user.id === auth.adminUserId
        ? { ...user, senha: cleanPassword, mustChangePassword: false }
        : user),
    };
    setData(nextData);
    void persistData(nextData, "Senha alterada");
  };

  const changeRestrictedOwnPassword = async (currentPassword: string, nextPassword: string, confirmation: string) => {
    if (auth?.role === "owner") return changeAdminPassword(currentPassword, nextPassword, confirmation);
    if (auth?.role !== "manager" || !auth.adminUserId) {
      window.alert("Acesso restrito nao localizado.");
      return false;
    }
    const user = (data.adminUsers ?? []).find((item) => item.id === auth.adminUserId);
    if (!user) {
      window.alert("Acesso restrito nao localizado.");
      return false;
    }
    if (!firebaseEnabled && currentPassword.trim() !== user.senha) {
      window.alert("Senha atual incorreta.");
      return false;
    }
    const cleanPassword = nextPassword.trim();
    if (cleanPassword.length < 6) {
      window.alert("A nova senha precisa ter pelo menos 6 caracteres.");
      return false;
    }
    if (cleanPassword !== confirmation.trim()) {
      window.alert("As senhas nao conferem.");
      return false;
    }
    if (cleanPassword === user.senha) {
      window.alert("Informe uma senha diferente da atual.");
      return false;
    }
    if (firebaseEnabled) {
      try {
        const changed = await changeCloudPassword({ currentPassword, nextPassword: cleanPassword });
        if (!changed) throw new Error("Falha ao alterar senha.");
      } catch (error) {
        console.error("Falha ao alterar senha.", error);
        window.alert("Senha atual incorreta ou não foi possível alterar agora.");
        return false;
      }
    }
    const nextData = {
      ...data,
      adminUsers: (data.adminUsers ?? []).map((item) => item.id === auth.adminUserId
        ? { ...item, senha: cleanPassword, mustChangePassword: false }
        : item),
    };
    setData(nextData);
    void persistData(nextData, "Senha alterada");
    return true;
  };

  const updateRestrictedProfile = async (profile: { nome: string; email: string; cpf: string }) => {
    if (!auth || (auth.role !== "owner" && auth.role !== "manager")) return false;
    const cleanName = uppercaseInput(profile.nome.trim());
    const cleanEmail = normalizeEmail(profile.email);
    const cleanCpf = formatCpf(profile.cpf);
    if (!cleanName) {
      window.alert("Informe o nome que deve aparecer no sistema.");
      return false;
    }
    if (cleanEmail && digitsOnly(cleanCpf).length !== 11) {
      window.alert("Informe um CPF valido para recuperação de senha.");
      return false;
    }
    if (firebaseEnabled) {
      try {
        const cloudName = await updateCloudProfile({ nome: cleanName, email: cleanEmail, cpf: cleanCpf });
        if (!cloudName) throw new Error("Falha ao atualizar perfil.");
      } catch (error) {
        console.error("Falha ao atualizar perfil.", error);
        window.alert("Não foi possível atualizar o perfil agora.");
        return false;
      }
    }
    const nextAuth = { ...auth, nome: cleanName };
    setAuth(nextAuth);
    storeAuthSession(nextAuth);
    if (auth.role === "owner") {
      const nextAdmin = { ...(adminCredentials ?? { usuario: auth.nome, senha: "" }), nome: cleanName, email: cleanEmail, cpf: cleanCpf };
      setAdminCredentials(nextAdmin);
      const nextData = { ...data, admin: nextAdmin };
      setData(nextData);
      void persistData(nextData, "Perfil atualizado");
      return true;
    }
    const nextData = {
      ...data,
      adminUsers: (data.adminUsers ?? []).map((item) => item.id === auth.adminUserId ? { ...item, nome: cleanName, email: cleanEmail, cpf: cleanCpf } : item),
    };
    setData(nextData);
    void persistData(nextData, "Perfil atualizado");
    return true;
  };

  const createRestrictedAccess = (input: AdminUser) => {
    if (auth?.role !== "owner") return;
    const clean = createAdminUser({ ...input, mustChangePassword: true });
    if (!clean.nome || !clean.usuario || !clean.email || digitsOnly(clean.cpf).length !== 11 || !clean.senha) {
      window.alert("Informe nome, usuario, e-mail, CPF e senha.");
      return false;
    }
    const nextUsers = [...(data.adminUsers ?? []), clean];
    if (hasDuplicatedAdminAccess(adminCredentials, nextUsers)) {
      window.alert("Ja existe esse usuario no acesso restrito.");
      return false;
    }
    const nextData = { ...data, adminUsers: nextUsers };
    setData(nextData);
    void persistData(nextData, "Acesso criado");
    recordAction("ACESSO", `Criou o acesso restrito de ${upper(clean.nome || clean.usuario)}.`, { targetId: clean.id, targetName: clean.nome || clean.usuario });
    return true;
  };

  const updateRestrictedAccess = (id: string, patch: Partial<AdminUser>) => {
    if (auth?.role !== "owner") return;
    const nextUsers = (data.adminUsers ?? []).map((user) => user.id === id ? createAdminUser({ ...user, ...patch, id: user.id, createdAt: user.createdAt }) : user);
    if (hasDuplicatedAdminAccess(adminCredentials, nextUsers)) {
      window.alert("Ja existe esse usuario no acesso restrito.");
      return;
    }
    const nextData = { ...data, adminUsers: nextUsers };
    setData(nextData);
    void persistData(nextData, "Acesso atualizado");
    if (patch.ativo !== undefined || patch.senha !== undefined) {
      const user = nextUsers.find((item) => item.id === id);
      const description = patch.senha !== undefined
        ? `Redefiniu a senha de ${upper(user?.nome || user?.usuario || "")}.`
        : `${patch.ativo === false ? "Bloqueou" : "Liberou"} o acesso de ${upper(user?.nome || user?.usuario || "")}.`;
      recordAction("ACESSO", description, { targetId: id, targetName: user?.nome || user?.usuario || "" });
    }
  };

  const deleteRestrictedAccess = (id: string) => {
    if (auth?.role !== "owner") return;
    const user = (data.adminUsers ?? []).find((item) => item.id === id);
    const name = user?.nome || user?.usuario || "este acesso";
    if (!window.confirm(`Excluir o acesso de ${name}?`)) return;
    const nextData = { ...data, adminUsers: (data.adminUsers ?? []).filter((item) => item.id !== id) };
    setData(nextData);
    void persistData(nextData, "Acesso excluido");
    recordAction("ACESSO", `Excluiu o acesso restrito de ${upper(name)}.`, { targetId: id, targetName: name });
  };

  const loginSchool = async (credentials: SchoolLoginCredentials) => {
    const usuario = uppercaseInput(credentials.usuario.trim());
    const senha = credentials.senha.trim();
    if (firebaseEnabled) {
      try {
        const result = await loginCloudSchool<AppData>({ usuario, senha, tipo: credentials.tipo });
        applyCloudLogin(result.payload, result.session, result.histories as HistoryRecord[] | undefined);
        return;
      } catch (error) {
        console.error("Falha no login da escola.", error);
        window.alert("Usuario, senha ou rede da escola incorretos.");
        return;
      }
    }
    const school = data.escolas.find((account) => {
      if (account.ativo === false) return false;
      if (account.tipo !== credentials.tipo) return false;
      const accessos = account.accessos?.length
        ? account.accessos
        : [createSchoolAccess({ usuario: account.usuario, senha: account.senha, nivel: "principal", mustChangePassword: account.mustChangePassword }, "principal")];
      return accessos.some((access) => access.usuario === usuario && access.senha === senha);
    });
    if (!school) {
      window.alert("Usuario, senha ou rede da escola incorretos.");
      return;
    }
    const schoolAccesses = school.accessos?.length
      ? school.accessos
      : [createSchoolAccess({ usuario: school.usuario, senha: school.senha, nivel: "principal", mustChangePassword: school.mustChangePassword }, "principal")];
    const access = schoolAccesses.find((item) => item.usuario === usuario && item.senha === senha)
      ?? schoolAccesses[0]
      ?? createSchoolAccess({ usuario: school.usuario, senha: school.senha, nivel: "principal", mustChangePassword: school.mustChangePassword }, "principal");
    const session = { role: "school" as const, nome: access.usuario, schoolId: school.id, accessId: access.id, accessLevel: access.nivel };
    setAuth(session);
    setActiveFolderId("");
    setActiveId(data.historicos.find((record) => record.schoolId === school.id)?.id ?? "");
    setView("historicos");
    storeAuthSession(session);
  };

  const logout = () => {
    void logoutCloudSession();
    setAuth(null);
    storeAuthSession(null);
    setView("historicos");
  };

  const requireSchoolProfile = () => {
    if (schoolProfileReady) return true;
    setView("escola");
    window.alert("Conclua o cadastro da escola.");
    return false;
  };

  const createSchoolAccountFromAdmin = (account: SchoolAccount) => {
    const createdId = account.id || crypto.randomUUID();
    const primaryInput = account.accessos[0];
    const clean = createSchoolAccount({
      ...account,
      id: createdId,
      usuario: uppercaseInput(account.usuario.trim()),
      senha: account.senha.trim(),
      accessos: [
        createSchoolAccess({
          id: `${createdId}-principal`,
          usuario: account.usuario,
          email: primaryInput?.email || "",
          cpf: primaryInput?.cpf || "",
          senha: account.senha,
          nivel: "principal",
          mustChangePassword: true,
        }, "principal"),
      ],
      escola: {
        ...account.escola,
        nome: uppercaseInput(account.escola.nome.trim()),
      },
    });
    if (!clean.usuario || !clean.senha || !clean.escola.nome) {
      window.alert("Informe nome da escola, cidade, estado, usuario e senha.");
      return;
    }
    if (!clean.accessos[0]?.email || digitsOnly(clean.accessos[0]?.cpf || "").length !== 11) {
      window.alert("Informe e-mail e CPF do acesso da escola.");
      return;
    }
    if (!clean.escola.municipio || !clean.escola.estado) {
      window.alert("Informe cidade e estado da escola.");
      return;
    }
    const nextSchools = [...data.escolas, clean];
    if (hasDuplicatedSchoolAccess(nextSchools)) {
      window.alert("Ja existe esse usuario nessa rede.");
      return;
    }
    setData((current) => ({ ...current, escolas: nextSchools }));
    setSaveState("Escola cadastrada");
    showSaveNotice("Escola cadastrada com sucesso");
    recordAction("ESCOLA", `Cadastrou a escola ${upper(clean.escola.nome)}.`, { schoolId: clean.id, schoolName: clean.escola.nome, targetId: clean.id, targetName: clean.escola.nome });
  };

  const updateSchoolAccountFromAdmin = (id: string, patch: Partial<SchoolAccount> & { escola?: Partial<School> }) => {
    const before = data.escolas.find((account) => account.id === id);
    const nextSchools = data.escolas.map((account) => {
      if (account.id !== id) return account;
      const patchedAccessos = patch.accessos
        ? patch.accessos.map((access, index) => createSchoolAccess(access, index === 0 ? "principal" : "secundario")).filter((access) => access.usuario)
        : account.accessos;
      const accessos = patchedAccessos.length ? patchedAccessos : account.accessos;
      const primaryAccess = accessos[0] ?? createSchoolAccess({ usuario: account.usuario, senha: account.senha, nivel: "principal", mustChangePassword: account.mustChangePassword }, "principal");
      return {
        ...account,
        ...patch,
        usuario: primaryAccess.usuario,
        senha: primaryAccess.senha,
        mustChangePassword: primaryAccess.mustChangePassword,
        accessos,
        escola: patch.escola ? { ...account.escola, ...patch.escola } : account.escola,
      };
    });
    if (hasDuplicatedSchoolAccess(nextSchools)) {
      window.alert("Ja existe esse usuario nessa rede.");
      return;
    }
    setData((current) => ({ ...current, escolas: nextSchools }));
    setSaveState("Escola atualizada");
    showSaveNotice("Escola atualizada com sucesso");
    if (before) {
      const after = nextSchools.find((account) => account.id === id);
      const changedStatus = patch.ativo !== undefined && patch.ativo !== before.ativo;
      const changedAccess = Boolean(patch.accessos);
      if (!changedStatus && !changedAccess) return;
      const description = changedStatus
        ? `${patch.ativo === false ? "Bloqueou" : "Liberou"} a escola ${upper(after?.escola.nome || before.escola.nome)}.`
        : `Alterou acessos da escola ${upper(after?.escola.nome || before.escola.nome)}.`;
      recordAction("ESCOLA", description, { schoolId: id, schoolName: after?.escola.nome || before.escola.nome, targetId: id, targetName: after?.escola.nome || before.escola.nome });
    }
  };

  const changeFirstPassword = async (password: string) => {
    if (auth?.role !== "school" || !auth.schoolId) return;
    const cleanPassword = password.trim();
    if (cleanPassword.length < 6 || cleanPassword === "123456") {
      window.alert("Crie uma senha com pelo menos 6 caracteres e diferente da senha provisoria.");
      return;
    }
    if (firebaseEnabled) {
      try {
        const changed = await changeCloudPassword({ nextPassword: cleanPassword, firstAccess: true });
        if (!changed) throw new Error("Falha ao alterar senha.");
      } catch (error) {
        console.error("Falha ao alterar senha.", error);
        window.alert("Não foi possível alterar a senha agora.");
        return;
      }
    }
    setData((current) => ({
      ...current,
      escolas: current.escolas.map((account) => {
        if (account.id !== auth.schoolId) return account;
        const accessos = account.accessos.map((access) => access.id === auth.accessId
          ? { ...access, senha: cleanPassword, mustChangePassword: false }
          : access);
        const primaryAccess = accessos[0];
        return {
          ...account,
          senha: primaryAccess?.senha ?? account.senha,
          usuario: primaryAccess?.usuario ?? account.usuario,
          mustChangePassword: primaryAccess?.mustChangePassword ?? false,
          accessos,
        };
      }),
    }));
    setSaveState("Senha alterada");
    showSaveNotice("Senha alterada com sucesso");
  };

  const updateHistoryModel = (model: HistoryModel) => {
    if (auth?.role !== "school" || !auth.schoolId) {
      window.alert("Entre com o login da escola para alterar o modelo.");
      return;
    }
    if (!canEditHistoryModel) {
      window.alert("Somente o acesso principal da escola pode alterar o modelo do histórico.");
      return;
    }
    const clean = normalizeModel({ ...model, updatedAt: new Date().toISOString() });
    const nextData = {
      ...data,
      modelos: {
        ...(data.modelos ?? {}),
        [auth.schoolId]: clean,
      },
    };
    setData(nextData);
    void persistData(nextData, "Modelo salvo");
    recordAction("MODELO", "Alterou o modelo do histórico.", { targetName: "MODELO DO HISTÓRICO" });
  };

  const persistData = async (nextData = dataRef.current, successMessage = "Dados salvos", options: { saveHistories?: boolean } = {}) => {
    window.localStorage.setItem(storageKey, JSON.stringify(nextData));
    if (!firebaseEnabled) {
      setSaveState(successMessage);
      showSaveNotice(`${successMessage} com sucesso`);
      return true;
    }
    try {
      const stateSaved = await saveCloudState(cloudReadySystemData(nextData));
      const historiesSaved = options.saveHistories === false ? true : await saveCloudHistories(nextData.historicos.map(cloudReadyHistory));
      if (!stateSaved || !historiesSaved) throw new Error("Falha ao salvar no banco.");
      setSaveState(successMessage);
      showSaveNotice(`${successMessage} com sucesso`);
      return true;
    }
    catch (error) {
      console.error("Falha ao salvar.", error);
      const message = saveFailureState(error);
      setSaveState(message);
      showSaveNotice(message, "error");
      return false;
    }
  };

  const finishHistory = async (id: string, generatePdf = false) => {
    const now = new Date().toISOString();
    const nextData = {
      ...data,
      historicos: data.historicos.map((item) => item.id === id ? { ...item, status: "Emitido" as const, updatedAt: now } : item),
      transferencias: data.transferencias.map((request) => request.historyId === id ? { ...request, status: "Enviado" as const, updatedAt: now } : request),
    };
    setData(nextData);
    const history = nextData.historicos.find((item) => item.id === id);
    let saved = await persistData(nextData, "Histórico salvo");
    if (saved && history) {
      try {
        const { fotosHistorico: _photos, ...cloudHistory } = history;
        const historySaved = await saveCloudHistory(id, cloudHistory);
        if (!historySaved) throw new Error("Falha ao salvar o histórico.");
        setSaveState("Histórico salvo");
      } catch (error) {
        console.error("Falha ao salvar o histórico.", error);
        setSaveState("Não foi possível salvar o histórico");
        showSaveNotice("Não foi possível salvar o histórico", "error");
        saved = false;
      }
    }
    if (saved && generatePdf) savePdfForRecord(id);
    if (saved && !generatePdf) {
      if (history) recordAction("HISTORICO", `Salvou o histórico de ${upper(history.aluno.nome) || history.codigo}.`, { targetId: history.id, targetName: history.aluno.nome || history.codigo });
      setView("historicos");
    }
  };

  const sendExistingHistory = async (requestId: string, historyId: string) => {
    if (!requireSchoolProfile()) return;
    const history = schoolRecords.find((item) => item.id === historyId);
    if (!history) return;
    const now = new Date().toISOString();
    const nextData = {
      ...data,
      transferencias: data.transferencias.map((request) => request.id === requestId ? { ...request, historyId, status: "Enviado" as const, updatedAt: now } : request),
    };
    setData(nextData);
    await saveCloudHistory(history.id, history);
    await persistData(nextData, "Histórico enviado");
  };

  const receiveTransferHistory = async (requestId: string, folderId: string) => {
    if (!requireSchoolProfile()) return;
    if (!currentSchoolAccount || !folderId) return;
    const request = data.transferencias.find((item) => item.id === requestId && item.toSchoolId === currentSchoolAccount.id);
    const source = data.historicos.find((item) => item.id === request?.historyId);
    const folder = schoolFolders.find((item) => item.id === folderId);
    if (!request || !source || !folder) {
      window.alert("Não foi possível localizar o histórico enviado.");
      return;
    }
    const received: HistoryRecord = { ...source, id: crypto.randomUUID(), schoolId: currentSchoolAccount.id, folderId, anoLetivo: folder.anoLetivo, updatedAt: new Date().toISOString() };
    const nextData = {
      ...data,
      historicos: [received, ...data.historicos],
      transferencias: data.transferencias.map((item) => item.id === requestId ? { ...item, status: "Recebido" as const, receivedHistoryId: received.id, updatedAt: new Date().toISOString() } : item),
    };
    setData(nextData);
    await saveCloudHistory(received.id, received);
    await persistData(nextData, "Histórico recebido");
    setActiveFolderId(folderId);
    setView("historicos");
    recordAction("TRANSFERENCIA", `Recebeu o histórico de ${upper(received.aluno.nome) || received.codigo}.`, { targetId: received.id, targetName: received.aluno.nome || received.codigo });
  };

  const hideTransferMessage = async (requestId: string) => {
    if (!currentSchoolAccount) return;
    const nextData = {
      ...data,
      transferencias: data.transferencias.map((request) => request.id === requestId
        ? { ...request, hiddenForSchoolIds: [...new Set([...(request.hiddenForSchoolIds ?? []), currentSchoolAccount.id])] }
        : request),
    };
    setData(nextData);
    await persistData(nextData, "Mensagem removida");
  };

  const requestTransfer = async (input: Pick<TransferRequest, "fromSchoolId" | "studentName" | "studentBirth" | "message">) => {
    if (!requireSchoolProfile()) return;
    if (!currentSchoolAccount || input.fromSchoolId === currentSchoolAccount.id) return;
    const now = new Date().toISOString();
    const request: TransferRequest = {
      id: crypto.randomUUID(),
      fromSchoolId: input.fromSchoolId,
      toSchoolId: currentSchoolAccount.id,
      studentName: uppercaseInput(input.studentName),
      studentBirth: input.studentBirth,
      message: input.message.trim() || `O aluno ${uppercaseInput(input.studentName)} foi transferido para nossa escola. Solicitamos o histórico escolar.`,
      status: "Solicitado",
      createdAt: now,
      updatedAt: now,
    };
    const nextData = { ...data, transferencias: [request, ...data.transferencias] };
    setData(nextData);
    await persistData(nextData, "Solicitação enviada");
  };

  const prepareTransferHistory = async (requestId: string) => {
    if (!requireSchoolProfile()) return;
    if (!currentSchoolAccount) return;
    const request = data.transferencias.find((item) => item.id === requestId && item.fromSchoolId === currentSchoolAccount.id);
    if (!request) return;
    let folder = schoolFolders.find((item) => item.nome === "TRANSFERÊNCIAS");
    const folders = [...data.folders];
    if (!folder) {
      folder = { id: crypto.randomUUID(), schoolId: currentSchoolAccount.id, anoLetivo: String(new Date().getFullYear()), nome: "TRANSFERÊNCIAS", tipoEnsino: "ENSINO FUNDAMENTAL" };
      folders.push(folder);
    }
    const history = createHistoryFromModel(currentSchool, currentSchoolAccount.id, folder, currentModel);
    history.aluno.nome = request.studentName;
    history.aluno.nascimento = request.studentBirth;
    const now = new Date().toISOString();
    const nextData = {
      ...data,
      folders,
      historicos: [history, ...data.historicos],
      transferencias: data.transferencias.map((item) => item.id === requestId ? { ...item, status: "Em preparação" as const, historyId: history.id, updatedAt: now } : item),
    };
    setData(nextData);
    await persistData(nextData, "Preparação iniciada");
    setActiveFolderId(folder.id);
    setActiveId(history.id);
    setStep(0);
    setView("editor");
  };

  const updateActive = (updater: (record: HistoryRecord) => HistoryRecord) => {
    setData((current) => ({
      ...current,
      historicos: current.historicos.map((record) =>
        record.id === active?.id ? { ...updater(record), updatedAt: new Date().toISOString() } : record,
      ),
    }));
  };

  const createFolder = (afterCreate: "stay" | "open" = "stay") => {
    if (!requireSchoolProfile()) return;
    if (!currentSchoolAccount) return;
    const nome = folderDraft.trim();
    const anoLetivo = folderYearDraft.trim();
    if (!nome || !anoLetivo) return;
    const existing = schoolFolders.find((folder) => upper(folder.nome) === upper(nome) && folder.anoLetivo === anoLetivo);
    if (existing) {
      setActiveFolderId(existing.id);
      setFolderDraft("");
      if (afterCreate === "open") setView("historicos");
      return;
    }
    const folder: Folder = {
      id: crypto.randomUUID(),
      schoolId: currentSchoolAccount.id,
      anoLetivo: uppercaseInput(anoLetivo),
      nome: uppercaseInput(nome),
      tipoEnsino: uppercaseInput(folderTeachingDraft),
    };
    setData((current) => ({ ...current, folders: [...current.folders, folder] }));
    setActiveFolderId(folder.id);
    setYearFilter(folder.anoLetivo);
    setFolderDraft("");
    if (afterCreate === "open") setView("historicos");
    setSaveState("Turma criada");
    showSaveNotice("Turma criada com sucesso");
    recordAction("TURMA", `Criou a turma ${folder.nome} - ${folder.anoLetivo}.`, { targetId: folder.id, targetName: `${folder.nome} - ${folder.anoLetivo}` });
  };

  const moveRecordToFolder = (id: string, folderId: string) => {
    if (!requireSchoolProfile()) return;
    const folder = data.folders.find((item) => item.id === folderId);
    setData((current) => ({
      ...current,
      historicos: current.historicos.map((record) =>
        record.id === id ? { ...record, folderId, anoLetivo: folder?.anoLetivo || "", updatedAt: new Date().toISOString() } : record,
      ),
    }));
    setSaveState("Histórico movido");
    showSaveNotice("Histórico movido com sucesso");
  };

  const createNew = (force = false) => {
    if (!requireSchoolProfile()) return;
    if (!currentSchoolAccount) return;
    const folder = schoolFolders.find((item) => item.id === activeFolderId);
    if (!folder) {
      window.alert("Crie ou selecione primeiro o ano letivo e a turma da escola.");
      setView("turmas");
      return;
    }
    const candidate = schoolRecords.find(
      (record) =>
        record.id !== active?.id &&
        record.aluno.nome &&
        active?.aluno.nome &&
        upper(record.aluno.nome) === upper(active.aluno.nome) &&
        record.aluno.nascimento === active.aluno.nascimento,
    );
    if (candidate && !force) {
      setDuplicate(candidate);
      return;
    }
    const next = createHistoryFromModel(currentSchool, currentSchoolAccount.id, folder, currentModel);
    setData((current) => ({ ...current, historicos: [next, ...current.historicos] }));
    setActiveId(next.id);
    setDuplicate(null);
    setView("editor");
    setStep(0);
    setSaveState("Histórico criado");
    showSaveNotice("Histórico criado com sucesso");
    recordAction("HISTORICO", `Criou um histórico em ${folder.nome} - ${folder.anoLetivo}.`, { targetId: next.id, targetName: next.codigo });
  };

  const createHistoryFromPhotos = (photos: PhotoHistoryPayload) => {
    if (!requireSchoolProfile()) return;
    if (!currentSchoolAccount) return;
    const folder = schoolFolders.find((item) => item.id === activeFolderId);
    if (!folder) {
      window.alert("Selecione primeiro a turma e o ano letivo.");
      return;
    }
    const blank = createHistoryFromModel(currentSchool, currentSchoolAccount.id, folder, currentModel);
    const recognized = photos.record ?? applyOcrTextToHistory(blank, photos.texto, photos.palavras ?? [], schoolDirectory);
    const next = {
      ...blank,
      aluno: recognized.aluno,
      notas: recognized.notas,
      resultados: recognized.resultados,
      cargaHoraria: recognized.cargaHoraria,
      estudos: recognized.estudos,
      certificado: recognized.certificado,
      localData: recognized.localData,
    };
    setData((current) => ({ ...current, historicos: [next, ...current.historicos] }));
    setActiveId(next.id);
    setView("editor");
    setStep(6);
    setPage(1);
    setSaveState("Histórico criado");
    showSaveNotice("Histórico criado com sucesso");
    recordAction("HISTORICO", `Criou histórico por imagem para ${upper(next.aluno.nome) || next.codigo}.`, { targetId: next.id, targetName: next.aluno.nome || next.codigo });
  };

  const deleteRecord = (id: string) => {
    const removed = data.historicos.find((record) => record.id === id);
    setData((current) => {
      const next = current.historicos.filter((record) => record.id !== id);
      if (activeId === id) setActiveId(next.find((record) => record.schoolId === auth?.schoolId)?.id ?? "");
      return { ...current, historicos: next };
    });
    void deleteCloudHistory(id).catch((error) => console.error("Falha ao remover o histórico.", error));
    setSaveState("Histórico excluído");
    showSaveNotice("Histórico excluído com sucesso");
    if (removed) recordAction("HISTORICO", `Excluiu o histórico de ${upper(removed.aluno.nome) || removed.codigo}.`, { targetId: removed.id, targetName: removed.aluno.nome || removed.codigo });
  };

  const printRecord = (id: string) => {
    const record = data.historicos.find((item) => item.id === id);
    setPrintBatch(null);
    setActiveId(id);
    setView("editor");
    setPage(1);
    window.setTimeout(() => printWithTitle(upper(record?.aluno.nome || record?.codigo || "HISTORICO")), 80);
  };

  const savePdfForRecord = (id: string) => {
    const record = data.historicos.find((item) => item.id === id);
    const pdfTitle = upper(record?.aluno.nome || record?.codigo || "HISTORICO");
    setData((current) => ({
      ...current,
      historicos: current.historicos.map((record) =>
        record.id === id ? { ...record, status: "Emitido", updatedAt: new Date().toISOString() } : record,
      ),
    }));
    if (active?.id === id && view === "editor") {
      printWithTitle(pdfTitle);
      setSaveState("PDF aberto");
      showSaveNotice("PDF pronto para salvar");
      return;
    }
    setPrintBatch(null);
    setActiveId(id);
    setView("editor");
    setPage(1);
    setSaveState("Abrindo PDF...");
    window.setTimeout(() => {
      printWithTitle(pdfTitle);
      setSaveState("Salvo");
      showSaveNotice("PDF pronto para salvar");
    }, 120);
  };

  const recordsForActiveFolder = () => activeFolderId
    ? schoolRecords.filter((record) => record.folderId === activeFolderId)
    : schoolRecords;

  const printFolderUnified = () => {
    const recordsToPrint = recordsForActiveFolder();
    if (!recordsToPrint.length) return;
    const folder = schoolFolders.find((item) => item.id === activeFolderId);
    setPrintBatch(recordsToPrint);
    window.setTimeout(() => printWithTitle(upper(folder ? `${folder.anoLetivo} ${folder.nome}` : "TODOS OS HISTORICOS")), 120);
  };

  const downloadFolderData = () => {
    const folder = schoolFolders.find((item) => item.id === activeFolderId) ?? null;
    const recordsToExport = recordsForActiveFolder();
    const payload = {
      exportedAt: new Date().toISOString(),
      escola: currentSchool,
      pasta: folder ? { id: folder.id, nome: `${folder.anoLetivo} - ${folder.nome}` } : { id: "", nome: "TODAS" },
      historicos: recordsToExport,
    };
    const folderName = safeUpperFileName(folder ? `${folder.anoLetivo}-${folder.nome}` : "TODOS OS HISTORICOS");
    const files = [
      { path: `${folderName}/DADOS-DA-PASTA.json`, content: JSON.stringify(payload, null, 2) },
      ...recordsToExport.map((record) => ({
        path: `${folderName}/ALUNOS/${safeUpperFileName(record.aluno.nome || record.codigo)}.json`,
        content: JSON.stringify(record, null, 2),
      })),
    ];
    const blob = new Blob([createZip(files)], { type: "application/zip" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${folderName}.zip`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setSaveState("Pasta baixada");
    showSaveNotice("Pasta baixada com sucesso");
  };

  const payloadForRecord = (record: HistoryRecord) => JSON.stringify({
    exportedAt: new Date().toISOString(),
    escola: currentSchool,
    historico: record,
  }, null, 2);

  const saveFolderToComputer = async () => {
    const folder = schoolFolders.find((item) => item.id === activeFolderId) ?? null;
    const recordsToExport = recordsForActiveFolder();
    if (!recordsToExport.length) return;
    const folderName = safeUpperFileName(folder ? `${folder.anoLetivo}-${folder.nome}` : "TODOS OS HISTORICOS");
    const payload = {
      exportedAt: new Date().toISOString(),
      escola: currentSchool,
      pasta: folder ? { id: folder.id, nome: `${folder.anoLetivo} - ${folder.nome}` } : { id: "", nome: "TODAS" },
      historicos: recordsToExport,
    };
    const picker = (window as DirectoryPickerWindow).showDirectoryPicker;

    try {
      if (!picker) {
        downloadFolderData();
        return;
      }
      const directory = await picker.call(window, { mode: "readwrite" });
      await writeTextFile(directory, [folderName, "DADOS-DA-PASTA.json"], JSON.stringify(payload, null, 2));
      for (const record of recordsToExport) {
        await writeTextFile(
          directory,
          [folderName, "ALUNOS", `${safeUpperFileName(record.aluno.nome || record.codigo)}.json`],
          payloadForRecord(record),
        );
      }
      setSaveState(`Pasta salva: ${folderName}`);
      showSaveNotice("Pasta salva com sucesso");
    } catch {
      setSaveState("Salvo");
    }
  };

  const importFolderFromComputer = async () => {
    const picker = (window as DirectoryPickerWindow).showDirectoryPicker;
    if (!picker) {
      window.alert("Este navegador nao permite escolher uma pasta. Use a opcao de baixar.");
      return;
    }

    try {
      const directory = await picker.call(window, { mode: "read" });
      const imports: Array<{ folderName: string; records: HistoryRecord[] }> = [];
      const root = await recordsFromComputerFolder(directory, directory.name || "PASTA DO PC");
      if (root.records.length) {
        imports.push(root);
      } else {
        for await (const [, handle] of directory.entries()) {
          if (handle.kind !== "directory") continue;
          const current = await recordsFromComputerFolder(handle, handle.name);
          if (current.records.length) imports.push(current);
        }
      }

      if (!imports.length) {
        window.alert("Nao encontrei historicos nessa pasta.");
        return;
      }

      setData((current) => {
        const folders = [...current.folders];
        const byId = new Map(current.historicos.map((record) => [record.id, record]));
        for (const imported of imports) {
          const folderName = upper(imported.folderName);
          let folder = folders.find((item) => item.schoolId === auth?.schoolId && upper(item.nome) === folderName);
          if (!folder) {
            folder = {
              id: crypto.randomUUID(),
              schoolId: auth?.schoolId || "",
              anoLetivo: String(new Date().getFullYear()),
              nome: imported.folderName,
              tipoEnsino: "ENSINO FUNDAMENTAL",
            };
            folders.push(folder);
          }
          for (const record of imported.records) {
            byId.set(record.id, { ...record, schoolId: auth?.schoolId || "", folderId: folder.id, anoLetivo: folder.anoLetivo, updatedAt: new Date().toISOString() });
          }
        }
        return { ...current, folders, historicos: Array.from(byId.values()) };
      });
      setView("historicos");
      setSaveState("Pasta importada");
      showSaveNotice("Pasta importada com sucesso");
    } catch {
      setSaveState("Salvo");
    }
  };

  if (!isReady) {
    return (
      <main className="login-page">
        <section className="login-card">
          <p className="eyebrow">Históricos Escolares</p>
          <h1>Historico Online</h1>
          <p>Carregando acesso...</p>
        </section>
      </main>
    );
  }

  if (!auth) {
    return (
      <LoginScreen
        hasAdmin={Boolean(adminCredentials) || cloudHasAdmin}
        onCreateAdmin={createAdminAccess}
        onLoginAdmin={loginAdmin}
        onLoginSchool={loginSchool}
        onRecoverSchoolPassword={recoverSchoolPassword}
      />
    );
  }

  if (auth.role === "owner" && adminCredentials?.mustChangePassword) {
    return screenWithNotice(<FirstAccessPassword schoolName={adminCredentials.nome || adminCredentials.usuario || auth.nome} onSave={changeRestrictedFirstPassword} onLogout={logout} />);
  }

  if (currentAdminUser?.mustChangePassword) {
    return screenWithNotice(<FirstAccessPassword schoolName={currentAdminUser.nome || currentAdminUser.usuario} onSave={changeRestrictedFirstPassword} onLogout={logout} />);
  }

  if (auth.role === "owner" || auth.role === "manager") {
    return screenWithNotice(
      <OwnerDashboard
        schools={data.escolas}
        folders={data.folders}
        histories={data.historicos}
        adminUsers={data.adminUsers ?? []}
        activity={activity}
        onDeleteActivity={deleteActivity}
        schoolDirectory={schoolDirectory}
        accessRole={auth.role}
        accessName={auth.nome}
        accessLoginName={auth.role === "owner" ? adminCredentials?.usuario || "ADMIN" : currentAdminUser?.usuario || auth.nome}
        accessEmail={auth.role === "owner" ? adminCredentials?.email || "" : currentAdminUser?.email || ""}
        accessCpf={auth.role === "owner" ? adminCredentials?.cpf || "" : currentAdminUser?.cpf || ""}
        saveState={saveState}
        onCreateSchool={createSchoolAccountFromAdmin}
        onUpdateSchool={updateSchoolAccountFromAdmin}
        onChangeOwnPassword={changeRestrictedOwnPassword}
        onUpdateProfile={updateRestrictedProfile}
        onCreateRestrictedAccess={createRestrictedAccess}
        onUpdateRestrictedAccess={updateRestrictedAccess}
        onDeleteRestrictedAccess={deleteRestrictedAccess}
        onLogout={logout}
      />
    );
  }

  if (currentSchoolAccess?.mustChangePassword) {
    return screenWithNotice(<FirstAccessPassword schoolName={currentSchool.nome} onSave={changeFirstPassword} onLogout={logout} />);
  }

  return screenWithNotice(
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          {currentSchool.logoSistema ? <img className="brand-logo" src={currentSchool.logoSistema} alt="" /> : <span className="brand-mark">HE</span>}
          <div>
            <strong>Histórico Escolar</strong>
            <small>Gestão educacional</small>
          </div>
        </div>
        {schoolProfileReady && (
          <>
            <button className={view === "historicos" ? "nav active" : "nav"} onClick={() => setView("historicos")}>
              <span className="nav-icon">▦</span> Históricos
            </button>
            <button className={view === "alunos" ? "nav active" : "nav"} onClick={() => setView("alunos")}>
              <span className="nav-icon">◎</span> Alunos
            </button>
            <button className={view === "transferencias" ? "nav active" : "nav"} onClick={() => setView("transferencias")}>
              <span className="nav-icon">⇄</span> Transferências
              {incomingTransfers.length > 0 && <span className="nav-badge">{incomingTransfers.length}</span>}
            </button>
            <button className={view === "turmas" ? "nav active" : "nav"} onClick={() => setView("turmas")}>
              <span className="nav-icon">◇</span> Turmas
            </button>
            {canEditHistoryModel && (
              <button className={view === "modelo" ? "nav active" : "nav"} onClick={() => setView("modelo")}>
                <span className="nav-icon">≡</span> Modelo do histórico
              </button>
            )}
          </>
        )}
        <div className="sidebar-rule" />
        <button
          className={view === "escola" ? "nav active" : "nav"}
          onClick={() => {
            setView("escola");
          }}
        >
          <span className="nav-icon">⌂</span> Dados da escola
        </button>
        {schoolProfileReady && (
          <>
            <div className="sidebar-rule" />
            <div className="folder-panel">
              <strong>Pastas / Turmas</strong>
              <button className={!activeFolderId ? "folder-link active" : "folder-link"} onClick={() => { setActiveFolderId(""); setView("historicos"); }}>
                Todas
              </button>
              {schoolFolders.map((folder) => (
                <button key={folder.id} className={activeFolderId === folder.id ? "folder-link active" : "folder-link"} onClick={() => { setActiveFolderId(folder.id); setView("historicos"); }}>
                  {folder.anoLetivo} - {folder.nome}
                </button>
              ))}
            </div>
          </>
        )}
        <div className="firebase-note">
          <div className="session-card">
            <span className="session-avatar">{initialsFor(auth.nome)}</span>
            <div>
              <small>Usuário conectado</small>
              <strong>{upper(auth.nome)}</strong>
              <em>{currentSchoolAccess?.nivel === "principal" ? "Acesso principal" : "Acesso secundário"}</em>
            </div>
          </div>
          <span className="session-school">{upper(currentSchool.nome)}<br />Escola {schoolKindLabel(currentSchoolAccount?.tipo).toLocaleLowerCase("pt-BR")}</span>
          <button type="button" onClick={logout}>Sair</button>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p>{
              view === "historicos" ? "Historicos Escolares" :
              view === "escola" ? "Cadastro da Escola" :
              view === "turmas" ? "Turmas e Ano Letivo" :
              view === "alunos" ? "Arquivo de Alunos" :
              view === "transferencias" ? "Transferências entre Escolas" :
              view === "modelo" ? "Modelo do Histórico" :
              view === "novo" ? "Criar Historico" :
              "Historico Escolar"
            }</p>
            <h1>Historico Online</h1>
            <div className="school-chip">
              {currentSchool.logoSistema && <img src={currentSchool.logoSistema} alt="" />}
              <span>{upper(currentSchool.nome)}</span>
            </div>
          </div>
          <div className="actions">
            <span className="save-state">{saveState === "Salvo" ? "OK Salvo" : saveState}</span>
            {schoolProfileReady && view === "editor" && active && (
              <label className="topbar-folder">
                <span>Pasta</span>
                <select value={active.folderId} onChange={(event) => moveRecordToFolder(active.id, event.target.value)}>
                  <option value="">Sem pasta</option>
                  {schoolFolders.map((folder) => <option key={folder.id} value={folder.id}>{folder.anoLetivo} - {folder.nome}</option>)}
                </select>
              </label>
            )}
            {schoolProfileReady && view === "editor" && active && (
              <button className="primary" onClick={() => savePdfForRecord(active.id)}>Gerar PDF</button>
            )}
          </div>
        </header>

        {schoolProfileReady && incomingTransfers.length > 0 && view !== "transferencias" && (
          <button className="transfer-alert-card" type="button" onClick={() => setView("transferencias")}>
            <span className="transfer-alert-icon">!</span>
            <span><strong>{data.escolas.find((school) => school.id === incomingTransfers[0].toSchoolId)?.escola.nome || "Outra escola"}</strong> solicitou o histórico de <strong>{incomingTransfers[0].studentName}</strong>.</span>
            <span className="transfer-alert-action">Ver solicitação →</span>
          </button>
        )}
        {schoolProfileReady && receivedTransferNotices.length > 0 && view !== "transferencias" && (
          <button className="transfer-alert-card received" type="button" onClick={() => setView("transferencias")}>
            <span className="transfer-alert-icon">✓</span>
            <span><strong>{data.escolas.find((school) => school.id === receivedTransferNotices[0].fromSchoolId)?.escola.nome || "Escola de origem"}</strong> enviou o histórico de <strong>{receivedTransferNotices[0].studentName}</strong>.</span>
            <span className="transfer-alert-action">Receber histórico →</span>
          </button>
        )}

        {schoolProfileReady && view === "historicos" && (
          <HistoryList
            query={query}
            setQuery={setQuery}
            folders={schoolFolders}
            activeFolderId={activeFolderId}
            setActiveFolderId={setActiveFolderId}
            yearFilter={yearFilter}
            setYearFilter={setYearFilter}
            yearOptions={yearOptions}
            activeFolderName={(() => {
              const folder = schoolFolders.find((item) => item.id === activeFolderId);
              return folder ? `${folder.anoLetivo} - ${folder.nome}` : "";
            })()}
            records={filtered}
            createNew={() => setView("novo")}
            edit={(id) => {
              setActiveId(id);
              setView("editor");
            }}
            moveRecordToFolder={moveRecordToFolder}
            printRecord={printRecord}
            savePdfForRecord={savePdfForRecord}
            deleteRecord={deleteRecord}
            downloadFolderData={downloadFolderData}
            saveFolderToComputer={saveFolderToComputer}
            importFolderFromComputer={importFolderFromComputer}
            printFolderUnified={printFolderUnified}
          />
        )}

        {schoolProfileReady && view === "novo" && (
          <NewHistoryScreen
            school={currentSchool}
            schoolId={currentSchoolAccount?.id ?? ""}
            folders={schoolFolders}
            model={currentModel}
            schoolDirectory={schoolDirectory}
            records={schoolRecords}
            activeFolderId={activeFolderId}
            setActiveFolderId={setActiveFolderId}
            createByTyping={() => createNew(true)}
            createFromPhotos={createHistoryFromPhotos}
            openClasses={() => setView("turmas")}
          />
        )}

        {schoolProfileReady && view === "turmas" && (
          <ClassroomScreen
            folders={schoolFolders}
            folderDraft={folderDraft}
            folderYearDraft={folderYearDraft}
            folderTeachingDraft={folderTeachingDraft}
            setFolderDraft={setFolderDraft}
            setFolderYearDraft={setFolderYearDraft}
            setFolderTeachingDraft={setFolderTeachingDraft}
            createFolder={createFolder}
            selectFolder={(id) => {
              const folder = schoolFolders.find((item) => item.id === id);
              setActiveFolderId(id);
              setYearFilter(folder?.anoLetivo ?? "");
              setView("historicos");
            }}
          />
        )}

        {schoolProfileReady && canEditHistoryModel && view === "modelo" && (
          <HistoryModelEditor
            school={currentSchool}
            schoolId={currentSchoolAccount?.id ?? ""}
            schoolDirectory={schoolDirectory}
            model={currentModel}
            onSave={updateHistoryModel}
          />
        )}

        {schoolProfileReady && view === "alunos" && (
          <StudentsArchive
            records={schoolRecords}
            folders={schoolFolders}
            edit={(id) => {
              setActiveId(id);
              setView("editor");
            }}
            savePdfForRecord={savePdfForRecord}
          />
        )}

        {schoolProfileReady && view === "transferencias" && currentSchoolAccount && (
          <TransfersScreen
            currentSchool={currentSchoolAccount}
            schools={data.escolas}
            requests={schoolTransfers}
            folders={schoolFolders}
            histories={schoolRecords}
            requestTransfer={requestTransfer}
            prepareHistory={(id) => void prepareTransferHistory(id)}
            sendExisting={(requestId, historyId) => void sendExistingHistory(requestId, historyId)}
            receiveHistory={(requestId, folderId) => void receiveTransferHistory(requestId, folderId)}
            deleteMessage={(id) => void hideTransferMessage(id)}
            openHistory={(id) => { setActiveId(id); setView("editor"); }}
          />
        )}

        {view === "escola" && <SchoolSettings school={currentSchool} schoolDirectory={schoolDirectory} updateSchool={updateSchool} onSave={() => void persistData(undefined, "Dados da escola salvos")} />}

        {schoolProfileReady && view === "editor" && active && (
          <div className={previewCollapsed ? "editor-grid preview-collapsed" : "editor-grid"}>
            <section className="form-pane">
              <Progress step={step} setStep={setStep} />
              {duplicate && (
                <div className="duplicate-alert">
                  <strong>Possivel historico ja cadastrado</strong>
                  <span>{upper(duplicate.aluno.nome)} - {formatDate(duplicate.aluno.nascimento)}</span>
                  <div>
                    <button onClick={() => { setActiveId(duplicate.id); setDuplicate(null); }}>Abrir historico existente</button>
                    <button onClick={() => createNew(true)}>Criar mesmo assim</button>
                  </div>
                </div>
              )}
              <StepForm
                record={active}
                school={currentSchool}
                step={step}
                updateActive={updateActive}
                schoolDirectory={schoolDirectory}
                setStep={setStep}
                finishHistory={finishHistory}
              />
            </section>

            <section className={previewCollapsed ? "preview-pane is-collapsed" : "preview-pane"}>
              <div className="preview-toolbar">
                {!previewCollapsed && (
                  <>
                    <div className="segmented">
                      <button className={page === 1 ? "selected" : ""} onClick={() => setPage(1)}>Pagina 1</button>
                      <button className={page === 2 ? "selected" : ""} onClick={() => setPage(2)}>Pagina 2</button>
                    </div>
                    <div className="zoom-control">
                      <button onClick={() => setZoom((z) => Math.max(0.28, z - 0.08))}>-</button>
                      <span>{Math.round(zoom * 100)}%</span>
                      <button onClick={() => setZoom((z) => Math.min(0.9, z + 0.08))}>+</button>
                    </div>
                  </>
                )}
                <button className="preview-toggle" type="button" onClick={() => setPreviewCollapsed((value) => !value)}>
                  {previewCollapsed ? "Mostrar previa" : "Minimizar"}
                </button>
              </div>
              {!previewCollapsed && (
                <div className="paper-stage">
                  <div className="paper-scale" style={{ width: `${794 * zoom}px`, minHeight: `${1123 * zoom}px`, transform: `scale(${zoom})` }}>
                    {page === 1 ? <DocumentPageOne record={active} school={currentSchool} /> : <DocumentPageTwo record={active} school={currentSchool} />}
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
        {(active || printBatch?.length) && (
          <section className="print-only" aria-hidden="true">
            {(printBatch?.length ? printBatch : active ? [active] : []).map((record) => (
              <Fragment key={`print-${record.id}`}>
                <DocumentPageOne record={record} school={currentSchool} />
                <DocumentPageTwo record={record} school={currentSchool} />
              </Fragment>
            ))}
          </section>
        )}
      </section>
    </main>
  );
}

function LoginScreen({
  hasAdmin,
  onCreateAdmin,
  onLoginAdmin,
  onLoginSchool,
  onRecoverSchoolPassword,
}: {
  hasAdmin: boolean;
  onCreateAdmin: (credentials: AdminCredentials) => void;
  onLoginAdmin: (credentials: AdminCredentials) => void;
  onLoginSchool: (credentials: SchoolLoginCredentials) => void;
  onRecoverSchoolPassword: (input: { usuario: string; email: string; cpf: string; tipo: SchoolKind }) => boolean | Promise<boolean>;
}) {
  const [adminUser, setAdminUser] = useState("ADMIN");
  const [adminPassword, setAdminPassword] = useState("");
  const [schoolUser, setSchoolUser] = useState("");
  const [schoolPassword, setSchoolPassword] = useState("");
  const [schoolKind, setSchoolKind] = useState<SchoolKind>("municipal");
  const [recoverMode, setRecoverMode] = useState(false);
  const [recoverDraft, setRecoverDraft] = useState({ usuario: "", email: "", cpf: "" });
  const [recoverMessage, setRecoverMessage] = useState("");

  return (
    <main className="login-shell">
      <section className="login-card">
        <div className="login-brand">
          <span className="brand-mark">HE</span>
          <div>
            <p>Sistema escolar</p>
            <h1>Historico Online</h1>
          </div>
        </div>

        <div className="login-grid">
          {!recoverMode ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                onLoginSchool({ usuario: schoolUser, senha: schoolPassword, tipo: schoolKind });
              }}
            >
              <div className="login-heading"><span>Login</span><h2>Acesso da escola</h2></div>
              <div className="school-kind login-school-kind">
                <span>Rede da escola</span>
                {schoolKindOptions.map((option) => (
                  <label key={option.value}>
                    <input type="checkbox" checked={schoolKind === option.value} onChange={() => setSchoolKind(option.value)} />
                    {option.label}
                  </label>
                ))}
              </div>
              <label>
                <span>Usuario da escola</span>
                <input value={schoolUser} onChange={(event) => setSchoolUser(uppercaseInput(event.target.value))} placeholder="ESCOLA001" />
              </label>
              <label>
                <span>Senha</span>
                <input type="password" value={schoolPassword} onChange={(event) => setSchoolPassword(event.target.value)} />
              </label>
              <button className="primary login-submit" type="submit">Entrar <span>→</span></button>
              <button className="forgot-password-button" type="button" onClick={() => { setRecoverMode(true); setRecoverMessage(""); }}>
                Esqueci minha senha
              </button>
            </form>
          ) : (
            <form
              className="recovery-form"
              onSubmit={async (event) => {
                event.preventDefault();
                const recovered = await onRecoverSchoolPassword({ ...recoverDraft, tipo: schoolKind });
                if (!recovered) return;
                setRecoverMessage("Senha provisória liberada. Entre com a senha 123456 e cadastre uma nova senha.");
                setSchoolUser(uppercaseInput(recoverDraft.usuario));
                setSchoolPassword("");
              }}
            >
              <div className="login-heading"><span>Recuperação</span><h2>Esqueci minha senha</h2></div>
              <div className="school-kind login-school-kind">
                <span>Rede da escola</span>
                {schoolKindOptions.map((option) => (
                  <label key={option.value}>
                    <input type="checkbox" checked={schoolKind === option.value} onChange={() => setSchoolKind(option.value)} />
                    {option.label}
                  </label>
                ))}
              </div>
              <div className="recovery-attention">
                <strong>ATENÇÃO:</strong>
                <span>Para liberar uma nova senha, informe o Login, o E-mail e o CPF utilizados no cadastro do acesso da escola.</span>
              </div>
              <label>
                <span>Login</span>
                <input value={recoverDraft.usuario} onChange={(event) => setRecoverDraft((current) => ({ ...current, usuario: uppercaseInput(event.target.value) }))} />
              </label>
              <label>
                <span>E-mail</span>
                <input type="email" value={recoverDraft.email} onChange={(event) => setRecoverDraft((current) => ({ ...current, email: normalizeEmail(event.target.value) }))} />
              </label>
              <label>
                <span>CPF</span>
                <input inputMode="numeric" value={recoverDraft.cpf} onChange={(event) => setRecoverDraft((current) => ({ ...current, cpf: formatCpf(event.target.value) }))} />
              </label>
              <p className="recovery-help">Caso não consiga recuperar, procure o responsável pelo sistema.</p>
              {recoverMessage && <p className="recovery-success">{recoverMessage}</p>}
              <button className="primary login-submit" type="submit">Liberar senha <span>→</span></button>
              <button className="forgot-password-button" type="button" onClick={() => setRecoverMode(false)}>Voltar ao login</button>
            </form>
          )}

          <form
            onSubmit={(event) => {
              event.preventDefault();
              const credentials = { usuario: adminUser, senha: adminPassword };
              if (hasAdmin) onLoginAdmin(credentials);
              else onCreateAdmin(credentials);
            }}
          >
            <div className="login-heading"><span>Restrito</span><h2>Acesso restrito</h2></div>
            <label>
              <span>Usuario</span>
              <input value={adminUser} onChange={(event) => setAdminUser(uppercaseInput(event.target.value))} />
            </label>
            <label>
              <span>Senha</span>
              <input type="password" value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} />
            </label>
            <button className="login-submit secondary" type="submit">Entrar <span>→</span></button>
          </form>
        </div>
      </section>
    </main>
  );
}

function FirstAccessPassword({ schoolName, onSave, onLogout }: { schoolName: string; onSave: (password: string) => void | Promise<void>; onLogout: () => void }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  return (
    <main className="login-shell first-access-shell">
      <section className="first-access-card">
        <div className="security-badge">✓</div>
        <span className="eyebrow">Primeiro acesso</span>
        <h1>Definir senha</h1>
        <p>{upper(schoolName)}</p>
        <div className="security-notice">Senha provisória: <strong>123456</strong></div>
        <form onSubmit={(event) => { event.preventDefault(); if (password !== confirmation) { window.alert("As senhas nao conferem."); return; } void onSave(password); }}>
          <label><span>Nova senha</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" /></label>
          <label><span>Confirmar nova senha</span><input type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" /></label>
          <button className="primary" type="submit">Salvar senha e continuar</button>
          <button type="button" onClick={onLogout}>Voltar ao login</button>
        </form>
      </section>
    </main>
  );
}

function OwnerDashboard({
  schools,
  folders,
  histories,
  adminUsers,
  activity,
  onDeleteActivity,
  schoolDirectory,
  accessRole,
  accessName,
  accessLoginName,
  accessEmail,
  accessCpf,
  saveState,
  onCreateSchool,
  onUpdateSchool,
  onChangeOwnPassword,
  onUpdateProfile,
  onCreateRestrictedAccess,
  onUpdateRestrictedAccess,
  onDeleteRestrictedAccess,
  onLogout,
}: {
  schools: SchoolAccount[];
  folders: Folder[];
  histories: HistoryRecord[];
  adminUsers: AdminUser[];
  activity: { activeUsers: CloudActiveUser[]; activities: CloudActivity[] };
  onDeleteActivity: (id?: string) => void | Promise<void>;
  schoolDirectory: SchoolDirectoryItem[];
  accessRole: "owner" | "manager";
  accessName: string;
  accessLoginName: string;
  accessEmail: string;
  accessCpf: string;
  saveState: string;
  onCreateSchool: (account: SchoolAccount) => void;
  onUpdateSchool: (id: string, patch: Partial<SchoolAccount> & { escola?: Partial<School> }) => void;
  onChangeOwnPassword: (currentPassword: string, nextPassword: string, confirmation: string) => boolean | Promise<boolean>;
  onUpdateProfile: (profile: { nome: string; email: string; cpf: string }) => boolean | Promise<boolean>;
  onCreateRestrictedAccess: (input: AdminUser) => boolean | void;
  onUpdateRestrictedAccess: (id: string, patch: Partial<AdminUser>) => void;
  onDeleteRestrictedAccess: (id: string) => void;
  onLogout: () => void;
}) {
  const [adminView, setAdminView] = useState<"overview" | "schools" | "access" | "activity" | "profile" | "password">("overview");
  const [draft, setDraft] = useState(() => createSchoolAccount({
    usuario: "",
    senha: "123456",
    tipo: "municipal",
    escola: { ...emptySchool },
  }));
  const [accessDrafts, setAccessDrafts] = useState<Record<string, Partial<SchoolAccess>>>({});
  const [passwordDraft, setPasswordDraft] = useState({ atual: "", nova: "", confirmar: "" });
  const [profileDraft, setProfileDraft] = useState(() => ({
    nome: upper(accessName),
    email: normalizeEmail(accessEmail),
    cpf: formatCpf(accessCpf),
  }));
  const [restrictedDraft, setRestrictedDraft] = useState(() => createAdminUser({ senha: "123456" }));
  const [schoolSearch, setSchoolSearch] = useState("");
  const canManageRestricted = accessRole === "owner";
  const activeSchools = schools.filter((account) => account.ativo !== false);
  const inactiveSchools = schools.filter((account) => account.ativo === false);
  const completedSchools = schools.filter((account) => isSchoolProfileReady(account.escola));
  const municipalCount = schools.filter((account) => account.tipo === "municipal").length;
  const estadualCount = schools.filter((account) => account.tipo === "estadual").length;
  const privateCount = schools.filter((account) => account.tipo === "privada").length;
  const accessCount = schools.reduce((total, account) => total + account.accessos.length, 0);
  const activeManagers = adminUsers.filter((user) => user.ativo).length;
  const onlineUsers = activity.activeUsers;
  const recentActivities = activity.activities;
  const schoolNeedle = schoolSearch.trim().toLocaleLowerCase("pt-BR");
  const filteredSchools = schools.filter((account) => {
    if (!schoolNeedle) return true;
    const searchable = [
      account.escola.nome,
      account.escola.codigo,
      account.escola.municipio,
      account.escola.estado,
      schoolKindLabel(account.tipo),
      account.ativo === false ? "inativa bloqueada" : "ativa liberada",
      ...account.accessos.map((access) => access.usuario),
    ].join(" ").toLocaleLowerCase("pt-BR");
    return searchable.includes(schoolNeedle);
  });

  useEffect(() => {
    setProfileDraft({ nome: upper(accessName), email: normalizeEmail(accessEmail), cpf: formatCpf(accessCpf) });
  }, [accessName, accessEmail, accessCpf]);

  const updateDraftSchool = (patch: Partial<School>) => {
    setDraft((current) => ({ ...current, escola: { ...current.escola, ...patch } }));
  };

  const updateDraftPrimaryAccess = (patch: Partial<SchoolAccess>) => {
    setDraft((current) => {
      const primary = current.accessos[0] ?? createSchoolAccess({ usuario: current.usuario, senha: current.senha }, "principal");
      const nextPrimary = createSchoolAccess({ ...primary, ...patch, id: primary.id, nivel: "principal", createdAt: primary.createdAt }, "principal");
      const accessos = [nextPrimary, ...current.accessos.slice(1)];
      return { ...current, usuario: nextPrimary.usuario, senha: nextPrimary.senha, accessos };
    });
  };

  const updateAccess = (account: SchoolAccount, accessId: string, patch: Partial<SchoolAccess>) => {
    onUpdateSchool(account.id, {
      accessos: account.accessos.map((access) => access.id === accessId ? { ...access, ...patch } : access),
    });
  };

  const addAccess = (account: SchoolAccount) => {
    const draftAccess = accessDrafts[account.id] ?? {};
    const clean = createSchoolAccess({
      ...draftAccess,
      usuario: uppercaseInput((draftAccess.usuario || "").trim()),
      senha: "123456",
      nivel: "secundario",
      mustChangePassword: true,
    }, "secundario");
    if (!clean.usuario || !clean.email || digitsOnly(clean.cpf).length !== 11) {
      window.alert("Informe usuario, e-mail e CPF do acesso.");
      return;
    }
    onUpdateSchool(account.id, {
      accessos: [...account.accessos, clean],
    });
    setAccessDrafts((current) => ({ ...current, [account.id]: {} }));
  };

  const removeAccess = (account: SchoolAccount, accessId: string) => {
    if (account.accessos.length <= 1) {
      window.alert("A escola precisa ter pelo menos um acesso.");
      return;
    }
    onUpdateSchool(account.id, {
      accessos: account.accessos.filter((access) => access.id !== accessId),
    });
  };

  return (
    <main className="app-shell admin-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">HE</span>
          <div>
            <strong>Historico Online</strong>
            <small>Painel restrito</small>
          </div>
        </div>
        <button className={adminView === "overview" ? "nav active" : "nav"} onClick={() => setAdminView("overview")}><span className="nav-icon">◎</span> Visão geral</button>
        <button className={adminView === "schools" ? "nav active" : "nav"} onClick={() => setAdminView("schools")}><span className="nav-icon">⌂</span> Escolas</button>
        <button className={adminView === "activity" ? "nav active" : "nav"} onClick={() => setAdminView("activity")}><span className="nav-icon">●</span> Atividade</button>
        {canManageRestricted && (
          <button className={adminView === "access" ? "nav active" : "nav"} onClick={() => setAdminView("access")}><span className="nav-icon">◈</span> Acessos</button>
        )}
        <button className={adminView === "profile" ? "nav active" : "nav"} onClick={() => setAdminView("profile")}><span className="nav-icon">◉</span> Editar perfil</button>
        <div className="firebase-note">
          <div className="session-card">
            <span className="session-avatar">{initialsFor(accessName)}</span>
            <div>
              <small>Usuário conectado</small>
              <strong>{upper(accessName)}</strong>
              <em>{canManageRestricted ? "Controle principal" : "Gestão educacional"}</em>
            </div>
          </div>
          <button type="button" onClick={() => setAdminView("password")}>Minha senha</button>
          <button type="button" onClick={onLogout}>Sair</button>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p>Painel restrito</p>
            <h1>{adminView === "overview" ? "Visão geral" : adminView === "access" ? "Acessos do sistema" : adminView === "activity" ? "Atividade do sistema" : adminView === "profile" ? "Editar perfil" : adminView === "password" ? "Minha senha" : "Gestão de escolas"}</h1>
          </div>
          <span className="save-state">{saveState === "Salvo" ? "OK Salvo" : saveState}</span>
        </header>

        {adminView === "overview" && (
          <section className="overview-screen">
            <div className="overview-cards">
              <article><span>Escolas cadastradas</span><strong>{schools.length}</strong></article>
              <article><span>Municipais</span><strong>{municipalCount}</strong></article>
              <article><span>Estaduais</span><strong>{estadualCount}</strong></article>
              <article><span>Privadas</span><strong>{privateCount}</strong></article>
              <article><span>Acessos das escolas</span><strong>{accessCount}</strong></article>
              <article><span>Escolas ativas</span><strong>{activeSchools.length}</strong></article>
              <article><span>Escolas inativas</span><strong>{inactiveSchools.length}</strong></article>
              <article><span>Cadastros completos</span><strong>{completedSchools.length}</strong></article>
              <article><span>Responsáveis</span><strong>{adminUsers.length}</strong></article>
              <article><span>Responsáveis ativos</span><strong>{activeManagers}</strong></article>
              <article><span>Online agora</span><strong>{onlineUsers.length}</strong></article>
            </div>
            <section className="list-screen admin-list">
              <div className="panel-heading">
                <h2>Escolas usando o sistema</h2>
              </div>
              <label className="admin-search">
                <span>Pesquisar escola</span>
                <input value={schoolSearch} onChange={(event) => setSchoolSearch(uppercaseInput(event.target.value))} placeholder="Nome, INEP, cidade, rede ou usuario" />
              </label>
              <table className="records-table">
                <thead>
                  <tr>
                    <th>Situação</th>
                    <th>Escola</th>
                    <th>Rede</th>
                    <th>INEP</th>
                    <th>Localidade</th>
                    <th>Turmas</th>
                    <th>Históricos</th>
                    <th>Acessos</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSchools.map((account) => {
                    const schoolFolders = folders.filter((folder) => folder.schoolId === account.id);
                    const schoolHistories = histories.filter((record) => record.schoolId === account.id);
                    return (
                      <tr key={account.id}>
                        <td><span className={account.ativo === false ? "status-pill inactive" : "status-pill active"}><i />{account.ativo === false ? "Inativa" : "Ativa"}</span></td>
                        <td>{upper(account.escola.nome) || "-"}</td>
                        <td>{schoolKindLabel(account.tipo)}</td>
                        <td>{upper(account.escola.codigo) || "-"}</td>
                        <td>{[account.escola.municipio, account.escola.estado].filter(Boolean).map(upper).join(" - ") || "-"}</td>
                        <td>{schoolFolders.length}</td>
                        <td>{schoolHistories.length}</td>
                        <td>{account.accessos.length}</td>
                      </tr>
                    );
                  })}
                  {!filteredSchools.length && (
                    <tr>
                      <td colSpan={8}>Nenhuma escola encontrada.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>
            <section className="list-screen admin-list">
              <div className="panel-heading">
                <h2>Responsáveis cadastrados</h2>
              </div>
              <table className="records-table">
                <thead>
                  <tr>
                    <th>Situação</th>
                    <th>Nome</th>
                    <th>Usuario</th>
                    <th>E-mail</th>
                    <th>CPF</th>
                    <th>CREDE</th>
                  </tr>
                </thead>
                <tbody>
                  {adminUsers.map((user) => (
                    <tr key={user.id}>
                      <td><span className={user.ativo ? "status-pill active" : "status-pill inactive"}><i />{user.ativo ? "Ativo" : "Bloqueado"}</span></td>
                      <td>{upper(user.nome) || "-"}</td>
                      <td>{upper(user.usuario) || "-"}</td>
                      <td>{normalizeEmail(user.email) || "-"}</td>
                      <td>{formatCpf(user.cpf) || "-"}</td>
                      <td>{upper(user.crede) || "-"}</td>
                    </tr>
                  ))}
                  {!adminUsers.length && (
                    <tr>
                      <td colSpan={6}>Nenhum responsável cadastrado ainda.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>
          </section>
        )}

        {adminView === "activity" && (
          <section className="activity-screen">
            <section className="list-screen admin-list">
              <div className="panel-heading">
                <h2>Online agora</h2>
              </div>
              <div className="online-grid">
                {onlineUsers.map((user) => (
                  <article className="online-card" key={user.id}>
                    <span className="live-dot" />
                    <div>
                      <strong>{upper(user.usuario) || "USUÁRIO"}</strong>
                      <small>{user.perfil === "school" ? upper(user.schoolName) || "ESCOLA" : user.perfil === "owner" ? "ADMINISTRADOR" : "RESPONSÁVEL"}</small>
                      <p>{user.actionLabel || "Online agora"}{user.targetName ? ` - ${upper(user.targetName)}` : ""}</p>
                    </div>
                  </article>
                ))}
                {!onlineUsers.length && <p className="empty-state">Nenhum usuário online agora.</p>}
              </div>
            </section>

            <section className="list-screen admin-list">
              <div className="panel-heading activity-heading">
                <h2>Ações recentes</h2>
                <button type="button" className="reset-password danger" disabled={!recentActivities.length} onClick={() => void onDeleteActivity()}>
                  Limpar ações
                </button>
              </div>
              <table className="records-table activity-table">
                <thead>
                  <tr>
                    <th>Quando</th>
                    <th>Usuário</th>
                    <th>Escola</th>
                    <th>Ação</th>
                    <th>Registro</th>
                    <th>Apagar</th>
                  </tr>
                </thead>
                <tbody>
                  {recentActivities.map((item) => (
                    <tr key={item.id}>
                      <td>{formatActivityTime(item.createdAt)}</td>
                      <td><strong>{upper(item.usuario) || "-"}</strong><small>{item.perfil === "school" ? "Escola" : item.perfil === "owner" ? "Administrador" : "Responsável"}</small></td>
                      <td>{upper(item.schoolName) || "-"}</td>
                      <td>{item.descricao}</td>
                      <td>{upper(item.targetName) || upper(item.tipo) || "-"}</td>
                      <td>
                        <button type="button" className="icon-delete-action" onClick={() => void onDeleteActivity(item.id)} aria-label="Apagar ação">
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!recentActivities.length && (
                    <tr>
                      <td colSpan={6}>Nenhuma ação registrada ainda.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>
          </section>
        )}

        {adminView === "profile" && (
        <section className="settings-screen admin-security">
          <div className="panel-heading">
            <h2>Editar perfil</h2>
          </div>
          <form
            className="settings-grid"
            onSubmit={(event) => {
              event.preventDefault();
              void Promise.resolve(onUpdateProfile(profileDraft)).then((changed) => {
                if (changed) {
                  setProfileDraft((current) => ({
                    nome: upper(current.nome),
                    email: normalizeEmail(current.email),
                    cpf: formatCpf(current.cpf),
                  }));
                }
              });
            }}
          >
            <label>
              <span>Nome exibido no sistema</span>
              <input value={profileDraft.nome} onChange={(event) => setProfileDraft((current) => ({ ...current, nome: uppercaseInput(event.target.value) }))} />
            </label>
            <label>
              <span>Usuário de login</span>
              <input value={upper(accessLoginName)} readOnly />
            </label>
            <button className="primary" type="submit">Salvar perfil</button>
          </form>
        </section>
        )}

        {adminView === "password" && (
        <section className="settings-screen admin-security">
          <div className="panel-heading">
            <h2>Minha senha</h2>
          </div>
          <form
            className="settings-grid"
            onSubmit={(event) => {
              event.preventDefault();
              void Promise.resolve(onChangeOwnPassword(passwordDraft.atual, passwordDraft.nova, passwordDraft.confirmar)).then((changed) => {
                if (changed) setPasswordDraft({ atual: "", nova: "", confirmar: "" });
              });
            }}
          >
            <label>
              <span>Senha atual</span>
              <input type="password" value={passwordDraft.atual} onChange={(event) => setPasswordDraft((current) => ({ ...current, atual: event.target.value }))} autoComplete="current-password" />
            </label>
            <label>
              <span>Nova senha</span>
              <input type="password" value={passwordDraft.nova} onChange={(event) => setPasswordDraft((current) => ({ ...current, nova: event.target.value }))} autoComplete="new-password" />
            </label>
            <label>
              <span>Confirmar nova senha</span>
              <input type="password" value={passwordDraft.confirmar} onChange={(event) => setPasswordDraft((current) => ({ ...current, confirmar: event.target.value }))} autoComplete="new-password" />
            </label>
            <button className="primary" type="submit">Alterar senha</button>
          </form>
        </section>
        )}

        {canManageRestricted && adminView === "access" && (
        <section className="settings-screen admin-security">
          <div className="panel-heading">
            <h2>Responsáveis da educação</h2>
          </div>
          <form
            className="settings-grid"
            onSubmit={(event) => {
              event.preventDefault();
              const created = onCreateRestrictedAccess(restrictedDraft);
              if (created) setRestrictedDraft(createAdminUser({ senha: "123456" }));
            }}
          >
            <label>
              <span>Nome</span>
              <input value={restrictedDraft.nome} onChange={(event) => setRestrictedDraft((current) => ({ ...current, nome: uppercaseInput(event.target.value) }))} />
            </label>
            <label>
              <span>Usuario</span>
              <input value={restrictedDraft.usuario} onChange={(event) => setRestrictedDraft((current) => ({ ...current, usuario: uppercaseInput(event.target.value) }))} />
            </label>
            <label>
              <span>E-mail</span>
              <input type="email" value={restrictedDraft.email} onChange={(event) => setRestrictedDraft((current) => ({ ...current, email: normalizeEmail(event.target.value) }))} />
            </label>
            <label>
              <span>CPF</span>
              <input inputMode="numeric" value={restrictedDraft.cpf} onChange={(event) => setRestrictedDraft((current) => ({ ...current, cpf: formatCpf(event.target.value) }))} />
            </label>
            <label>
              <span>CREDE</span>
              <select value={restrictedDraft.crede} onChange={(event) => setRestrictedDraft((current) => ({ ...current, crede: event.target.value }))}>
                {credeOptions.map((crede) => <option key={crede} value={crede}>{crede}</option>)}
              </select>
            </label>
            <label>
              <span>Senha provisória</span>
              <input value={restrictedDraft.senha} onChange={(event) => setRestrictedDraft((current) => ({ ...current, senha: event.target.value }))} />
            </label>
            <button className="primary" type="submit">Criar acesso</button>
          </form>
          <table className="records-table restricted-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Usuario</th>
                <th>E-mail</th>
                <th>CPF</th>
                <th>CREDE</th>
                <th>Situação</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {adminUsers.map((user) => (
                <tr key={user.id}>
                  <td><input value={user.nome} onChange={(event) => onUpdateRestrictedAccess(user.id, { nome: uppercaseInput(event.target.value) })} /></td>
                  <td><input value={user.usuario} onChange={(event) => onUpdateRestrictedAccess(user.id, { usuario: uppercaseInput(event.target.value) })} /></td>
                  <td><input type="email" value={user.email} onChange={(event) => onUpdateRestrictedAccess(user.id, { email: normalizeEmail(event.target.value) })} /></td>
                  <td><input inputMode="numeric" value={user.cpf} onChange={(event) => onUpdateRestrictedAccess(user.id, { cpf: formatCpf(event.target.value) })} /></td>
                  <td>
                    <select value={user.crede} onChange={(event) => onUpdateRestrictedAccess(user.id, { crede: event.target.value })}>
                      {credeOptions.map((crede) => <option key={crede} value={crede}>{crede}</option>)}
                    </select>
                  </td>
                  <td>
                    <label className="status-toggle">
                      <input type="checkbox" checked={user.ativo} onChange={(event) => onUpdateRestrictedAccess(user.id, { ativo: event.target.checked })} />
                      {user.ativo ? "Ativo" : "Bloqueado"}
                    </label>
                  </td>
                  <td>
                    <div className="restricted-actions">
                      <button type="button" className="reset-password" onClick={() => onUpdateRestrictedAccess(user.id, { senha: "123456", mustChangePassword: true })}>Redefinir senha</button>
                      <button type="button" className="reset-password danger" onClick={() => onDeleteRestrictedAccess(user.id)}>Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!adminUsers.length && (
                <tr>
                  <td colSpan={7}>Nenhum responsável cadastrado ainda.</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
        )}

        {adminView === "schools" && (
        <>
        <section className="settings-screen">
          <div className="panel-heading">
            <h2>Cadastrar escola</h2>
          </div>
          <div className="settings-grid">
            <label className="wide">
              <span>Nome da escola</span>
              <SchoolNameInput
                value={draft.escola.nome}
                onChange={(value) => updateDraftSchool({ nome: value })}
                municipio={draft.escola.municipio}
                estado={draft.escola.estado}
                schoolDirectory={schoolDirectory}
              />
            </label>
            <label>
              <span>Codigo INEP</span>
              <input value={draft.escola.codigo} onChange={(event) => updateDraftSchool({ codigo: uppercaseInput(event.target.value) })} />
            </label>
            <LocationFields
              estado={draft.escola.estado}
              municipio={draft.escola.municipio}
              onChange={(patch) => updateDraftSchool(patch)}
            />
            <label className="wide">
              <span>Entidade mantenedora</span>
              <input value={draft.escola.mantenedora} onChange={(event) => updateDraftSchool({ mantenedora: uppercaseInput(event.target.value) })} />
            </label>
            <label>
              <span>Usuario da escola</span>
              <input value={draft.usuario} onChange={(event) => updateDraftPrimaryAccess({ usuario: uppercaseInput(event.target.value) })} />
            </label>
            <label>
              <span>E-mail do acesso</span>
              <input type="email" value={draft.accessos[0]?.email || ""} onChange={(event) => updateDraftPrimaryAccess({ email: normalizeEmail(event.target.value) })} />
            </label>
            <label>
              <span>CPF do acesso</span>
              <input inputMode="numeric" value={draft.accessos[0]?.cpf || ""} onChange={(event) => updateDraftPrimaryAccess({ cpf: formatCpf(event.target.value) })} />
            </label>
            <label>
              <span>Senha provisória</span>
              <input value="123456" readOnly aria-label="Senha provisoria padrao" />
            </label>
            <div className="school-kind">
              <span>Rede da escola</span>
              {schoolKindOptions.map((option) => (
                <label key={option.value}>
                  <input type="checkbox" checked={draft.tipo === option.value} onChange={() => setDraft((current) => ({ ...current, tipo: option.value }))} />
                  {option.label}
                </label>
              ))}
            </div>
          </div>
          <button
            className="primary"
            onClick={() => {
              onCreateSchool(draft);
              setDraft(createSchoolAccount({
                usuario: "",
                senha: "123456",
                tipo: "municipal",
                escola: { ...emptySchool },
              }));
            }}
          >
            Cadastrar escola
          </button>
        </section>

        <section className="list-screen admin-list">
          <div className="panel-heading">
            <h2>Escolas cadastradas</h2>
          </div>
          <label className="admin-search">
            <span>Pesquisar escola</span>
            <input value={schoolSearch} onChange={(event) => setSchoolSearch(uppercaseInput(event.target.value))} placeholder="Nome, INEP, cidade, rede ou usuario" />
          </label>
          <table className="records-table">
            <thead>
              <tr>
                <th>Situação</th>
                <th>Escola</th>
                <th>INEP</th>
                <th>Rede</th>
                <th>Acessos</th>
              </tr>
            </thead>
            <tbody>
              {filteredSchools.map((account) => (
                <tr key={account.id}>
                  <td>
                    <label className="status-toggle school-status-toggle">
                      <input type="checkbox" checked={account.ativo !== false} onChange={(event) => onUpdateSchool(account.id, { ativo: event.target.checked })} />
                      <span className={account.ativo === false ? "status-pill inactive" : "status-pill active"}><i />{account.ativo === false ? "Inativa" : "Ativa"}</span>
                    </label>
                  </td>
                  <td>
                    <input
                      value={account.escola.nome}
                      onChange={(event) => onUpdateSchool(account.id, { escola: { nome: uppercaseInput(event.target.value) } })}
                    />
                  </td>
                  <td>
                    <input value={account.escola.codigo} onChange={(event) => onUpdateSchool(account.id, { escola: { codigo: uppercaseInput(event.target.value) } })} />
                  </td>
                  <td>
                    <select value={account.tipo} onChange={(event) => onUpdateSchool(account.id, { tipo: event.target.value as SchoolKind })}>
                      {schoolKindOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <div className="access-list">
                      {account.accessos.map((access, index) => (
                        <div className="access-row" key={access.id}>
                          <input
                            value={access.usuario}
                            aria-label={`Usuario ${index + 1}`}
                            onChange={(event) => updateAccess(account, access.id, { usuario: uppercaseInput(event.target.value) })}
                          />
                          <input
                            type="email"
                            value={access.email}
                            aria-label={`E-mail do usuario ${index + 1}`}
                            placeholder="E-MAIL"
                            onChange={(event) => updateAccess(account, access.id, { email: normalizeEmail(event.target.value) })}
                          />
                          <input
                            inputMode="numeric"
                            value={access.cpf}
                            aria-label={`CPF do usuario ${index + 1}`}
                            placeholder="CPF"
                            onChange={(event) => updateAccess(account, access.id, { cpf: formatCpf(event.target.value) })}
                          />
                          <select
                            value={access.nivel}
                            aria-label={`Nivel do usuario ${index + 1}`}
                            onChange={(event) => updateAccess(account, access.id, { nivel: event.target.value as SchoolAccessLevel })}
                          >
                            <option value="principal">Principal</option>
                            <option value="secundario">Secundário</option>
                          </select>
                          <button
                            type="button"
                            className="reset-password"
                            onClick={() => updateAccess(account, access.id, { senha: "123456", mustChangePassword: true })}
                          >
                            Redefinir
                          </button>
                          <button type="button" className="reset-password danger" onClick={() => removeAccess(account, access.id)}>Remover</button>
                        </div>
                      ))}
                      <div className="access-row add-access-row">
                        <input
                          value={accessDrafts[account.id]?.usuario || ""}
                          placeholder="NOVO USUARIO"
                          onChange={(event) => setAccessDrafts((current) => ({ ...current, [account.id]: { ...(current[account.id] ?? {}), usuario: uppercaseInput(event.target.value) } }))}
                        />
                        <input
                          type="email"
                          value={accessDrafts[account.id]?.email || ""}
                          placeholder="E-MAIL"
                          onChange={(event) => setAccessDrafts((current) => ({ ...current, [account.id]: { ...(current[account.id] ?? {}), email: normalizeEmail(event.target.value) } }))}
                        />
                        <input
                          inputMode="numeric"
                          value={accessDrafts[account.id]?.cpf || ""}
                          placeholder="CPF"
                          onChange={(event) => setAccessDrafts((current) => ({ ...current, [account.id]: { ...(current[account.id] ?? {}), cpf: formatCpf(event.target.value) } }))}
                        />
                        <span className="access-level-label">Secundário</span>
                        <button type="button" className="reset-password" onClick={() => addAccess(account)}>Adicionar</button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
              {!filteredSchools.length && (
                <tr>
                  <td colSpan={5}>Nenhuma escola encontrada.</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
        </>
        )}
      </section>
    </main>
  );
}

function folderTitle(folder?: Folder) {
  if (!folder) return "SEM TURMA";
  return `${folder.anoLetivo} - ${folder.nome}`;
}

function transferYearFor(record: HistoryRecord) {
  const transferredYear = years.find((year) => upper(record.resultados[year] || "").includes("TRANSFER"));
  if (transferredYear) return schoolYearFor(record, transferredYear) || record.anoLetivo || "";
  return record.anoLetivo || "";
}

function isTransferredRecord(record: HistoryRecord) {
  return years.some((year) => upper(record.resultados[year] || "").includes("TRANSFER"));
}

function lastAttendedYear(record: HistoryRecord) {
  return years.find((year) => {
    const result = upper(record.resultados[year] || "");
    return result.includes("CURSANDO") || result.includes("TRANSFERIDO");
  }) ?? 9;
}

function NewHistoryScreen({
  school,
  schoolId,
  folders,
  model,
  schoolDirectory,
  records,
  activeFolderId,
  setActiveFolderId,
  createByTyping,
  createFromPhotos,
  openClasses,
}: {
  school: School;
  schoolId: string;
  folders: Folder[];
  model: HistoryModel;
  schoolDirectory: SchoolDirectoryItem[];
  records: HistoryRecord[];
  activeFolderId: string;
  setActiveFolderId: (value: string) => void;
  createByTyping: () => void;
  createFromPhotos: (photos: PhotoHistoryPayload) => void;
  openClasses: () => void;
}) {
  const [mode, setMode] = useState<"choice" | "image">("choice");
  const selectedFolder = folders.find((folder) => folder.id === activeFolderId);

  if (!folders.length) {
    return (
      <section className="settings-screen">
        <div className="panel-heading">
          <h2>Criar historico</h2>
        </div>
        <button className="primary" onClick={openClasses}>Criar turma</button>
      </section>
    );
  }

  if (mode === "image") {
    return (
      <PhotoHistoryImport
        school={school}
        schoolId={schoolId}
        folders={folders}
        model={model}
        schoolDirectory={schoolDirectory}
        records={records}
        activeFolderId={activeFolderId}
        setActiveFolderId={setActiveFolderId}
        createFromPhotos={createFromPhotos}
        backToChoice={() => setMode("choice")}
      />
    );
  }

  return (
    <section className="settings-screen">
      <div className="panel-heading">
        <h2>Criar historico</h2>
      </div>
      <label className="wide">
        <span>Turma / ano letivo</span>
        <select value={activeFolderId} onChange={(event) => setActiveFolderId(event.target.value)}>
          <option value="">Selecione</option>
          {folders.map((folder) => <option key={folder.id} value={folder.id}>{folderTitle(folder)} - {folder.tipoEnsino}</option>)}
        </select>
      </label>
      <div className="create-mode-grid">
        <button className="create-mode-card" disabled={!selectedFolder} onClick={createByTyping}>
          <strong>Digitar historico</strong>
          <span>Preenchimento manual</span>
        </button>
        <button className="create-mode-card" disabled={!selectedFolder} onClick={() => setMode("image")}>
          <strong>Criar por imagem</strong>
          <span>Digitalizar historico</span>
        </button>
      </div>
    </section>
  );
}

function HistoryModelEditor({
  school,
  schoolId,
  schoolDirectory,
  model,
  onSave,
}: {
  school: School;
  schoolId: string;
  schoolDirectory: SchoolDirectoryItem[];
  model: HistoryModel;
  onSave: (model: HistoryModel) => void;
}) {
  const buildDraft = () => {
    const cleanModel = normalizeModel(model);
    const base = createHistoryFromModel(school, schoolId, null, cleanModel);
    return normalizeModelTemplate({
      ...base,
      ...(cleanModel.template ?? {}),
      schoolId,
      folderId: "",
      anoLetivo: "",
      codigo: "MODELO",
      id: "modelo-historico",
      status: "Em preenchimento",
    }, schoolId);
  };
  const [draft, setDraft] = useState<HistoryRecord>(() => buildDraft());
  const [modelStep, setModelStep] = useState(0);
  const [modelPage, setModelPage] = useState(1);
  const [modelZoom, setModelZoom] = useState(0.36);

  useEffect(() => {
    setDraft(buildDraft());
  }, [model, schoolId]);

  const updateDraft = (updater: (record: HistoryRecord) => HistoryRecord) => {
    setDraft((current) => ({ ...updater(current), updatedAt: new Date().toISOString() }));
  };

  const updateModelColor = (key: keyof HistoryModelColors, value: string) => {
    updateDraft((current) => ({
      ...current,
      modeloCores: {
        ...normalizeModelColors(current.modeloCores),
        [key]: normalizeHexColor(value, normalizeModelColors(current.modeloCores)[key]),
      },
    }));
  };

  const save = async () => {
    const clean = normalizeModelTemplate(draft, schoolId);
    onSave({
      matriz: cloneMatrix(clean.matriz),
      cores: normalizeModelColors(clean.modeloCores),
      template: clean,
      updatedAt: new Date().toISOString(),
    });
  };

  const restoreDefault = () => {
    if (!window.confirm("Voltar o modelo para o padrão inicial?")) return;
    setDraft(normalizeModelTemplate(createHistory(school, schoolId, null, matrixSeed), schoolId));
    setModelStep(0);
    setModelPage(1);
  };
  const modelColors = normalizeModelColors(draft.modeloCores);

  return (
    <section className="model-full-editor">
      <div className="model-editor-header">
        <div className="panel-heading">
          <h2>Modelo do histórico</h2>
          <p>Altere aqui o padrão usado nos próximos históricos da escola.</p>
        </div>
        <div className="model-header-actions">
          <button className="primary" type="button" onClick={() => void save()}>Salvar modelo</button>
          <button type="button" onClick={restoreDefault}>Voltar padrão</button>
        </div>
      </div>

      <div className="editor-grid">
        <section className="form-pane">
          <Progress step={modelStep} setStep={setModelStep} />
          <StepForm
            record={draft}
            school={school}
            step={modelStep}
            updateActive={updateDraft}
            schoolDirectory={schoolDirectory}
            setStep={setModelStep}
            finishHistory={async () => save()}
            mode="model"
          />
          <section className="model-color-panel">
            <div className="panel-heading">
              <h2>Cores da tabela</h2>
              <p>Essas cores ficam salvas somente no modelo desta escola.</p>
            </div>
            <div className="model-color-grid">
              <label>
                <span>Cor principal</span>
                <input type="color" value={modelColors.destaque} onChange={(event) => updateModelColor("destaque", event.target.value)} />
              </label>
              <label>
                <span>Cor dos anos</span>
                <input type="color" value={modelColors.apoio} onChange={(event) => updateModelColor("apoio", event.target.value)} />
              </label>
              <label>
                <span>Cor das linhas</span>
                <input type="color" value={modelColors.borda} onChange={(event) => updateModelColor("borda", event.target.value)} />
              </label>
            </div>
            <button type="button" onClick={() => updateDraft((current) => ({ ...current, modeloCores: normalizeModelColors() }))}>
              Voltar cores padrão
            </button>
          </section>
        </section>

        <section className="preview-pane">
          <div className="preview-toolbar">
            <div className="segmented">
              <button className={modelPage === 1 ? "selected" : ""} onClick={() => setModelPage(1)}>Pagina 1</button>
              <button className={modelPage === 2 ? "selected" : ""} onClick={() => setModelPage(2)}>Pagina 2</button>
            </div>
            <div className="zoom-control">
              <button onClick={() => setModelZoom((z) => Math.max(0.32, z - 0.08))}>-</button>
              <span>{Math.round(modelZoom * 100)}%</span>
              <button onClick={() => setModelZoom((z) => Math.min(0.9, z + 0.08))}>+</button>
            </div>
          </div>
          <div className="paper-stage">
            <div className="paper-scale" style={{ width: `${794 * modelZoom}px`, minHeight: `${1123 * modelZoom}px`, transform: `scale(${modelZoom})` }}>
              {modelPage === 1 ? <DocumentPageOne record={draft} school={school} /> : <DocumentPageTwo record={draft} school={school} />}
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}

function ClassroomScreen({
  folders,
  folderDraft,
  folderYearDraft,
  folderTeachingDraft,
  setFolderDraft,
  setFolderYearDraft,
  setFolderTeachingDraft,
  createFolder,
  selectFolder,
}: {
  folders: Folder[];
  folderDraft: string;
  folderYearDraft: string;
  folderTeachingDraft: string;
  setFolderDraft: (value: string) => void;
  setFolderYearDraft: (value: string) => void;
  setFolderTeachingDraft: (value: string) => void;
  createFolder: (afterCreate?: "stay" | "open") => void;
  selectFolder: (id: string) => void;
}) {
  return (
    <section className="settings-screen">
      <div className="panel-heading">
        <h2>Criar turma</h2>
        <p>Cadastro organizado por ano letivo, turma e tipo de ensino.</p>
      </div>
      <div className="settings-grid class-create-grid">
        <label>
          <span>Ano letivo</span>
          <input value={folderYearDraft} onChange={(event) => setFolderYearDraft(uppercaseInput(event.target.value))} placeholder="2026" />
        </label>
        <label>
          <span>Nome da turma</span>
          <input value={folderDraft} onChange={(event) => setFolderDraft(uppercaseInput(event.target.value))} placeholder="6 ANO A" />
        </label>
        <label>
          <span>Tipo de ensino</span>
          <select value={folderTeachingDraft} onChange={(event) => setFolderTeachingDraft(uppercaseInput(event.target.value))}>
            <option>ENSINO FUNDAMENTAL</option>
            <option>ENSINO FUNDAMENTAL - ANOS INICIAIS</option>
            <option>ENSINO FUNDAMENTAL - ANOS FINAIS</option>
            <option>EJA</option>
            <option>EDUCACAO INFANTIL</option>
            <option>ENSINO MEDIO</option>
          </select>
        </label>
      </div>
      <div className="class-create-actions">
        <button className="primary" onClick={() => createFolder("stay")}>Criar turma</button>
        <button className="secondary" onClick={() => createFolder("open")}>Criar e abrir turma</button>
      </div>

      <div className="class-cards">
        {folders.map((folder) => (
          <button key={folder.id} className="class-card" onClick={() => selectFolder(folder.id)}>
            <strong>{folder.nome}</strong>
            <span>{folder.anoLetivo}</span>
            <small>{folder.tipoEnsino}</small>
          </button>
        ))}
        {!folders.length && <p className="empty-state">Nenhuma turma criada ainda.</p>}
      </div>
    </section>
  );
}

function StudentsArchive({
  records,
  folders,
  edit,
  savePdfForRecord,
}: {
  records: HistoryRecord[];
  folders: Folder[];
  edit: (id: string) => void;
  savePdfForRecord: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [year, setYear] = useState("");
  const [folderId, setFolderId] = useState("");
  const [status, setStatus] = useState("todos");
  const yearsList = Array.from(new Set(records.map((record) => transferYearFor(record)).filter(Boolean))).sort().reverse();
  const filteredRecords = records.filter((record) => {
    const folder = folders.find((item) => item.id === record.folderId);
    const transferYear = transferYearFor(record);
    const matchesQuery = !query || record.aluno.nome.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR"));
    const matchesYear = !year || transferYear === year || record.anoLetivo === year;
    const matchesFolder = !folderId || record.folderId === folderId;
    const matchesStatus = status === "todos" || record.status === "Emitido";
    return matchesQuery && matchesYear && matchesFolder && matchesStatus;
  }).sort(compareStudentRecords);

  return (
    <section className="list-screen">
      <div className="panel-heading">
        <h2>Alunos</h2>
        <p>Lista automática dos alunos que possuem histórico cadastrado.</p>
      </div>
      <div className="archive-filters">
        <label>
          <span>Pesquisar aluno</span>
          <input value={query} onChange={(event) => setQuery(uppercaseInput(event.target.value))} placeholder="ANA MARIA" />
        </label>
        <label>
          <span>Ano</span>
          <select value={year} onChange={(event) => setYear(event.target.value)}>
            <option value="">Todos</option>
            {yearsList.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label>
          <span>Turma</span>
          <select value={folderId} onChange={(event) => setFolderId(event.target.value)}>
            <option value="">Todas</option>
            {folders.map((folder) => <option key={folder.id} value={folder.id}>{folderTitle(folder)}</option>)}
          </select>
        </label>
        <label>
          <span>Arquivo</span>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="emitidos">Historicos feitos</option>
            <option value="todos">Todos</option>
          </select>
        </label>
      </div>
      <table className="records-table">
        <thead>
          <tr>
            <th>Aluno</th>
            <th>Turma</th>
            <th>Ano transferencia</th>
            <th>Situacao</th>
            <th>Acoes</th>
          </tr>
        </thead>
        <tbody>
          {filteredRecords.map((record) => (
            <tr key={record.id}>
              <td><strong>{upper(record.aluno.nome) || "SEM NOME"}</strong><small>{formatDate(record.aluno.nascimento)}</small></td>
              <td>{folderTitle(folders.find((folder) => folder.id === record.folderId))}</td>
              <td>{transferYearFor(record) || "-"}</td>
              <td><span className="status">{isTransferredRecord(record) ? "TRANSFERIDO" : record.status}</span></td>
              <td><ActionMenu actions={[{ label: "Abrir histórico", run: () => edit(record.id) }, { label: "Salvar PDF", run: () => savePdfForRecord(record.id) }]} /></td>
            </tr>
          ))}
          {!filteredRecords.length && (
            <tr>
              <td colSpan={5}>Nenhum aluno encontrado.</td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}

function PhotoHistoryImport({
  school,
  schoolId,
  folders,
  model,
  schoolDirectory,
  records,
  activeFolderId,
  setActiveFolderId,
  createFromPhotos,
  backToChoice,
}: {
  school: School;
  schoolId: string;
  folders: Folder[];
  model: HistoryModel;
  schoolDirectory: SchoolDirectoryItem[];
  records: HistoryRecord[];
  activeFolderId: string;
  setActiveFolderId: (value: string) => void;
  createFromPhotos: (photos: PhotoHistoryPayload) => void;
  backToChoice: () => void;
}) {
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [ocrState, setOcrState] = useState("");
  const [isReading, setIsReading] = useState(false);
  const [rawText, setRawText] = useState("");
  const [ocrWords, setOcrWords] = useState<OcrWord[]>([]);
  const [draft, setDraft] = useState<HistoryRecord | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraState, setCameraState] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const selectedFolder = folders.find((folder) => folder.id === activeFolderId) ?? null;
  const createBlankDraft = () => createHistoryFromModel(school, schoolId, selectedFolder, model);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOpen(false);
  };

  useEffect(() => () => stopCamera(), []);

  const readPhoto = async (side: "front" | "back", file?: File) => {
    const image = await imageFileToOcrPng(file);
    if (!image) return;
    if (side === "front") setFront(image);
    else setBack(image);
  };

  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraState("Camera indisponivel neste navegador.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1600 },
          height: { ideal: 2200 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOpen(true);
      setCameraState("Camera pronta para capturar.");
    } catch {
      setCameraState("Nao foi possivel abrir a camera.");
    }
  };

  const capturePhoto = async (side: "front" | "back") => {
    const video = videoRef.current;
    if (!video?.videoWidth || !video.videoHeight) {
      setCameraState("Aguarde a camera carregar.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const image = await prepareImageForOcr(canvas.toDataURL("image/png"));
    if (side === "front") setFront(image);
    else setBack(image);
    setCameraState(side === "front" ? "Frente capturada." : "Verso capturado.");
  };

  const fillFromQr = async () => {
    if (!front && !back) return;
    try {
      setIsReading(true);
      setOcrState("Lendo QR code...");
      const qrText = await readQrFromImages(front, back);
      if (!qrText) {
        setOcrState("Nenhum QR code encontrado na imagem.");
        return;
      }
      const base = createBlankDraft();
      const shared = historyFromSharedText(qrText, base, records);
      setRawText(qrText);
      setOcrWords([]);
      if (!shared) {
        setDraft(null);
        setOcrState("QR code lido, mas nao pertence a um historico do sistema.");
        return;
      }
      setDraft(shared);
      setOcrState("QR code lido. Confira antes de aplicar no modelo.");
    } catch {
      setOcrState("Nao foi possivel ler o QR code nesta imagem.");
    } finally {
      setIsReading(false);
    }
  };

  const fillFromImages = async () => {
    if (!front && !back) return;
    try {
      setIsReading(true);
      setOcrState(front && back ? "Lendo frente e verso..." : "Lendo imagem...");
      const result = await readHistoryTextFromImages(front, back);
      setRawText(result.text);
      setOcrWords(result.words);
      const recognized = applyOcrTextToHistory(createBlankDraft(), result.text, result.words, schoolDirectory);
      setDraft(recognized);
      setOcrState(result.text.trim() || result.words.length
        ? "Leitura feita. Confira os dados antes de aplicar no modelo."
        : "Imagem aberta. Confira e preencha os campos em branco.");
    } catch (error) {
      console.error("Falha na leitura automatica do historico.", error);
      setRawText("");
      setOcrWords([]);
      setDraft(createBlankDraft());
      setOcrState("Nao foi possivel ler tudo. Confira e preencha os campos em branco.");
    } finally {
      setIsReading(false);
    }
  };

  const updateDraftStudent = (patch: Partial<Student>) => {
    setDraft((current) => current ? { ...current, aluno: { ...current.aluno, ...patch } } : current);
  };

  const updateDraftNote = (componentId: string, year: number, value: string) => {
    if (!isAllowedNoteTyping(value)) return;
    const note = normalizeNoteInput(value);
    setDraft((current) => current ? {
      ...current,
      notas: {
        ...current.notas,
        [componentId]: {
          ...(current.notas[componentId] ?? {}),
          [year]: note,
        },
      },
    } : current);
  };
  const finishDraftNote = (componentId: string, year: number, value: string) => {
    const note = formatNoteValue(value);
    setDraft((current) => current ? {
      ...current,
      notas: {
        ...current.notas,
        [componentId]: {
          ...(current.notas[componentId] ?? {}),
          [year]: note,
        },
      },
    } : current);
  };

  const updateDraftResult = (year: number, value: string) => {
    setDraft((current) => current ? { ...current, resultados: { ...current.resultados, [year]: uppercaseInput(value) } } : current);
  };

  const updateDraftWorkload = (year: number, key: keyof WorkloadRow, value: string) => {
    setDraft((current) => current ? {
      ...current,
      cargaHoraria: {
        ...current.cargaHoraria,
        [year]: { ...current.cargaHoraria[year], [key]: uppercaseInput(value) },
      },
    } : current);
  };

  const updateDraftStudyYear = (year: number, value: string) => {
    setDraft((current) => current ? {
      ...current,
      estudos: current.estudos.map((study, index) => index === year - 1 ? { ...study, ano: uppercaseInput(value) } : study),
    } : current);
  };

  const updateDraftStudy = (index: number, patch: Partial<StudyRow>) => {
    setDraft((current) => current ? {
      ...current,
      estudos: current.estudos.map((study, studyIndex) => studyIndex === index ? { ...study, ...patch } : study),
    } : current);
  };

  return (
    <section className="settings-screen photo-import">
      <div className="panel-heading photo-import-heading">
        <div>
          <span className="eyebrow">Criar historico por imagem</span>
          <h2>Leitura por QR Code</h2>
          <p>Importe o QR Code do historico gerado pelo sistema.</p>
        </div>
        <strong>QR</strong>
      </div>
      <div className="qr-import-shell">
        <div className="qr-import-main">
          <label className="wide">
            <span>Turma / ano</span>
            <select value={activeFolderId} onChange={(event) => setActiveFolderId(event.target.value)}>
              <option value="">Selecione</option>
              {folders.map((folder) => <option key={folder.id} value={folder.id}>{folderTitle(folder)} - {folder.tipoEnsino}</option>)}
            </select>
          </label>
          <div className="photo-drop-grid">
            <label className="photo-drop">
              <span>Frente</span>
              <input type="file" accept="image/*" capture="environment" onChange={(event) => readPhoto("front", event.target.files?.[0])} />
              {front ? <img src={front} alt="" /> : <strong>Selecionar imagem</strong>}
            </label>
            <label className="photo-drop">
              <span>Verso</span>
              <small>Opcional</small>
              <input type="file" accept="image/*" capture="environment" onChange={(event) => readPhoto("back", event.target.files?.[0])} />
              {back ? <img src={back} alt="" /> : <strong>Selecionar imagem</strong>}
            </label>
          </div>
        </div>
        <div className="qr-import-side">
          <div className="camera-panel">
            <div className="camera-actions">
              <button type="button" onClick={startCamera}>Abrir camera</button>
              <button type="button" disabled={!cameraOpen} onClick={() => void capturePhoto("front")}>Capturar frente</button>
              <button type="button" disabled={!cameraOpen} onClick={() => void capturePhoto("back")}>Capturar verso</button>
              <button type="button" disabled={!cameraOpen} onClick={stopCamera}>Fechar</button>
            </div>
            {cameraOpen && (
              <div className="camera-preview">
                <video ref={videoRef} playsInline muted />
              </div>
            )}
            {cameraState && <span className="save-state">{cameraState}</span>}
          </div>
          <div className="qr-import-action">
            <button onClick={backToChoice}>Voltar</button>
            <button
              className="primary"
              disabled={!activeFolderId || (!front && !back) || isReading}
              onClick={fillFromQr}
            >
              {isReading ? "Lendo QR Code" : "Ler QR Code"}
            </button>
            <button
              className="secondary"
              disabled={!activeFolderId || (!front && !back) || isReading}
              onClick={fillFromImages}
            >
              Ler imagem de outro modelo
            </button>
          </div>
          {ocrState && <span className="qr-status">{ocrState}</span>}
        </div>
      </div>
      {draft && (
        <section className="ocr-review">
          <div className="panel-heading">
            <h2>Conferir QR Code</h2>
            <p>Confira os dados antes de aplicar no modelo.</p>
          </div>
          <div className="form-grid">
            <Field label="Nome completo" value={draft.aluno.nome} onChange={(value) => updateDraftStudent({ nome: value })} wide />
            <Field label="ID do aluno" value={draft.aluno.idAluno} onChange={(value) => updateDraftStudent({ idAluno: value })} />
            <Field label="Data de nascimento" type="date" value={draft.aluno.nascimento} onChange={(value) => updateDraftStudent({ nascimento: value })} />
            <Field label="Nacionalidade" value={draft.aluno.nacionalidade} onChange={(value) => updateDraftStudent({ nacionalidade: value })} />
            <LocationFields
              cityLabel="Naturalidade - cidade"
              stateLabel="Naturalidade - estado"
              municipio={draft.aluno.naturalidadeCidade}
              estado={draft.aluno.naturalidadeEstado}
              onChange={(patch) => updateDraftStudent({
                naturalidadeCidade: patch.municipio ?? draft.aluno.naturalidadeCidade,
                naturalidadeEstado: patch.estado ?? draft.aluno.naturalidadeEstado,
              })}
            />
            <Field label="Nome do pai" value={draft.aluno.pai} onChange={(value) => updateDraftStudent({ pai: value })} />
            <Field label="Nome da mae" value={draft.aluno.mae} onChange={(value) => updateDraftStudent({ mae: value })} />
          </div>
          <div className="ocr-studies-table">
            <table>
              <thead>
                <tr>
                  <th>Ano</th>
                  <th>Ano letivo</th>
                  <th>Estabelecimento</th>
                  <th>Cidade</th>
                  <th>UF</th>
                </tr>
              </thead>
              <tbody>
                {draft.estudos.map((study, index) => (
                  <tr key={study.serie}>
                    <td>{study.serie}</td>
                    <td><input value={study.ano} onChange={(event) => updateDraftStudy(index, { ano: uppercaseInput(event.target.value) })} /></td>
                    <td>
                      <SchoolNameInput
                        value={study.escola}
                        onChange={(value) => updateDraftStudy(index, { escola: value })}
                        municipio={study.cidade}
                        estado={study.estado}
                        schoolDirectory={schoolDirectory}
                        placeholder="Estabelecimento"
                        compact
                      />
                    </td>
                    <td><input value={study.cidade} onChange={(event) => updateDraftStudy(index, { cidade: uppercaseInput(event.target.value) })} /></td>
                    <td><input value={study.estado} onChange={(event) => updateDraftStudy(index, { estado: uppercaseInput(event.target.value) })} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="ocr-mini-table">
            <table>
              <thead>
                <tr>
                  <th>Campo</th>
                  {years.map((year) => <th key={year}>{year}o</th>)}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Ano letivo</td>
                  {years.map((year) => (
                    <td key={year}><input value={draft.estudos[year - 1]?.ano ?? ""} onChange={(event) => updateDraftStudyYear(year, event.target.value)} /></td>
                  ))}
                </tr>
                {draft.matriz.filter((component) => component.avaliativo).map((component) => (
                  <tr key={component.id}>
                    <td>{component.nome}</td>
                    {years.map((year) => (
                      <td key={year}><input inputMode="text" title="Use nota, letras ou símbolos" value={draft.notas[component.id]?.[year] ?? ""} onChange={(event) => updateDraftNote(component.id, year, event.target.value)} onBlur={(event) => finishDraftNote(component.id, year, event.target.value)} /></td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <td>Resultado</td>
                  {years.map((year) => (
                    <td key={year}><input value={draft.resultados[year] ?? ""} onChange={(event) => updateDraftResult(year, event.target.value)} /></td>
                  ))}
                </tr>
                {(["oferta", "frequencia", "percentual"] as const).map((key) => (
                  <tr key={key}>
                    <td>{key === "oferta" ? "Carga horaria" : key === "frequencia" ? "Frequencia" : "% Frequencia"}</td>
                    {years.map((year) => (
                      <td key={year}><input value={draft.cargaHoraria[year]?.[key] ?? ""} onChange={(event) => updateDraftWorkload(year, key, event.target.value)} /></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="inline-actions">
            <button className="primary" onClick={() => createFromPhotos({ frente: front, verso: back, texto: rawText, palavras: ocrWords, record: draft })}>
              Aplicar no nosso modelo
            </button>
          </div>
        </section>
      )}
    </section>
  );
}

function HistoryList({
  query,
  setQuery,
  folders,
  activeFolderId,
  setActiveFolderId,
  yearFilter,
  setYearFilter,
  yearOptions,
  activeFolderName,
  records,
  createNew,
  edit,
  moveRecordToFolder,
  printRecord,
  savePdfForRecord,
  deleteRecord,
  downloadFolderData,
  saveFolderToComputer,
  importFolderFromComputer,
  printFolderUnified,
}: {
  query: string;
  setQuery: (value: string) => void;
  folders: Folder[];
  activeFolderId: string;
  setActiveFolderId: (value: string) => void;
  yearFilter: string;
  setYearFilter: (value: string) => void;
  yearOptions: string[];
  activeFolderName: string;
  records: HistoryRecord[];
  createNew: () => void;
  edit: (id: string) => void;
  moveRecordToFolder: (id: string, folderId: string) => void;
  printRecord: (id: string) => void;
  savePdfForRecord: (id: string) => void;
  deleteRecord: (id: string) => void;
  downloadFolderData: () => void;
  saveFolderToComputer: () => void;
  importFolderFromComputer: () => void;
  printFolderUnified: () => void;
}) {
  return (
    <section className="list-screen">
      <div className="list-toolbar">
        <label>
          <span>{activeFolderName ? `Buscar aluno em ${activeFolderName}` : "Buscar aluno"}</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nome, data ou codigo..." />
        </label>
        <label className="toolbar-filter">
          <span>Ano letivo</span>
          <select value={yearFilter} onChange={(event) => { setYearFilter(event.target.value); setActiveFolderId(""); }}>
            <option value="">Todos</option>
            {yearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
        </label>
        <label className="toolbar-filter">
          <span>Turma</span>
          <select value={activeFolderId} onChange={(event) => setActiveFolderId(event.target.value)}>
            <option value="">Todas</option>
            {folders
              .filter((folder) => !yearFilter || folder.anoLetivo === yearFilter)
              .map((folder) => <option key={folder.id} value={folder.id}>{folder.nome}</option>)}
          </select>
        </label>
        <button disabled={!records.length} onClick={printFolderUnified}>
          PDF unico da pasta
        </button>
        <button disabled={!records.length} onClick={downloadFolderData}>
          {activeFolderName ? "Baixar pasta" : "Baixar tudo"}
        </button>
        <button disabled={!records.length} onClick={saveFolderToComputer}>
          Salvar pasta no PC
        </button>
        <button onClick={importFolderFromComputer}>
          Abrir pasta do PC
        </button>
        <button className="primary" onClick={() => createNew()}>+ Novo Historico</button>
      </div>
      <table className="records-table">
        <thead>
          <tr>
            <th>Aluno</th>
            <th>Data nascimento</th>
            <th>Ano/Turma</th>
            <th>Tipo de ensino</th>
            <th>Ultima alteracao</th>
            <th>Situacao</th>
            <th>Acoes</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            (() => {
              const folder = folders.find((item) => item.id === record.folderId);
              return (
                <tr key={record.id}>
                  <td><strong>{upper(record.aluno.nome) || "SEM NOME"}</strong><small>{record.codigo}</small></td>
                  <td>{formatDate(record.aluno.nascimento)}</td>
                  <td>
                    <select value={record.folderId} onChange={(event) => moveRecordToFolder(record.id, event.target.value)}>
                      <option value="">Sem turma</option>
                      {folders.map((item) => <option key={item.id} value={item.id}>{item.anoLetivo} - {item.nome}</option>)}
                    </select>
                  </td>
                  <td>{folder?.tipoEnsino || "-"}</td>
                  <td>{new Date(record.updatedAt).toLocaleString("pt-BR")}</td>
                  <td><span className="status">{isTransferredRecord(record) ? "TRANSFERIDO" : record.status}</span></td>
                  <td><ActionMenu actions={[
                    { label: "Editar histórico", run: () => edit(record.id) },
                    { label: "Visualizar", run: () => edit(record.id) },
                    { label: "Salvar PDF", run: () => savePdfForRecord(record.id) },
                    { label: "Imprimir", run: () => printRecord(record.id) },
                    { label: "Excluir", run: () => deleteRecord(record.id), danger: true },
                  ]} /></td>
                </tr>
              );
            })()
          ))}
          {!records.length && (
            <tr>
              <td colSpan={7}>Nenhum historico encontrado.</td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}

function ActionMenu({ actions }: { actions: Array<{ label: string; run: () => void; danger?: boolean }> }) {
  return (
    <details className="action-menu">
      <summary aria-label="Abrir acoes">•••</summary>
      <div className="action-menu-popover">
        {actions.map((action) => (
          <button key={action.label} type="button" className={action.danger ? "danger" : ""} onClick={(event) => {
            action.run();
            event.currentTarget.closest("details")?.removeAttribute("open");
          }}>{action.label}</button>
        ))}
      </div>
    </details>
  );
}

function TransfersScreen({
  currentSchool,
  schools,
  requests,
  folders,
  histories,
  requestTransfer,
  prepareHistory,
  sendExisting,
  receiveHistory,
  deleteMessage,
  openHistory,
}: {
  currentSchool: SchoolAccount;
  schools: SchoolAccount[];
  requests: TransferRequest[];
  folders: Folder[];
  histories: HistoryRecord[];
  requestTransfer: (input: Pick<TransferRequest, "fromSchoolId" | "studentName" | "studentBirth" | "message">) => Promise<void>;
  prepareHistory: (id: string) => void;
  sendExisting: (requestId: string, historyId: string) => void;
  receiveHistory: (requestId: string, folderId: string) => void;
  deleteMessage: (id: string) => void;
  openHistory: (id: string) => void;
}) {
  const availableSchools = schools.filter((school) => school.id !== currentSchool.id);
  const [fromSchoolId, setFromSchoolId] = useState(availableSchools[0]?.id ?? "");
  const [studentName, setStudentName] = useState("");
  const [studentBirth, setStudentBirth] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<Record<string, string>>({});
  const [selectedFolder, setSelectedFolder] = useState<Record<string, string>>({});

  const schoolName = (id: string) => schools.find((school) => school.id === id)?.escola.nome || "ESCOLA";
  const incoming = requests.filter((request) => request.fromSchoolId === currentSchool.id);
  const outgoing = requests.filter((request) => request.toSchoolId === currentSchool.id);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!fromSchoolId || !studentName.trim()) return;
    setSending(true);
    await requestTransfer({ fromSchoolId, studentName, studentBirth, message });
    setStudentName("");
    setStudentBirth("");
    setMessage("");
    setSending(false);
  };

  return (
    <section className="transfers-screen">
      <div className="transfer-intro">
        <div><span className="eyebrow">Comunicação escolar</span><h2>Solicitação de histórico</h2><p>Peça o histórico à escola de origem e acompanhe o atendimento.</p></div>
        <span className="transfer-count">{requests.length} solicitações</span>
      </div>

      <form className="transfer-form" onSubmit={submit}>
        <div className="panel-heading"><h3>Nova solicitação</h3><p>Informe de qual escola o aluno veio.</p></div>
        <div className="form-grid">
          <label className="wide"><span>Escola de origem</span><select value={fromSchoolId} onChange={(event) => setFromSchoolId(event.target.value)} required><option value="">Selecione a escola</option>{availableSchools.map((school) => <option key={school.id} value={school.id}>{upper(school.escola.nome || school.usuario)}</option>)}</select></label>
          <Field label="Nome completo do aluno" value={studentName} onChange={setStudentName} wide />
          <Field label="Data de nascimento" type="date" value={studentBirth} onChange={setStudentBirth} />
          <label className="wide"><span>Mensagem para a escola</span><textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Escreva uma mensagem para a escola de origem." /></label>
        </div>
        <button className="primary" type="submit" disabled={sending || !availableSchools.length}>{sending ? "Enviando..." : "Enviar solicitação"}</button>
        {!availableSchools.length && <small className="field-help">Cadastre outra escola antes de enviar uma solicitação.</small>}
      </form>

      <div className="transfer-columns">
        <section className="transfer-list">
          <div className="panel-heading"><h3>Pedidos recebidos</h3><p>Históricos que sua escola precisa providenciar.</p></div>
          {incoming.map((request) => {
            const matching = histories.filter((history) => upper(history.aluno.nome) === upper(request.studentName));
            return <article className={`transfer-card ${request.status === "Solicitado" ? "attention" : ""}`} key={request.id}>
              <div className="transfer-card-head"><span className={`transfer-status status-${safeFileName(request.status)}`}>{request.status}</span><time>{new Date(request.createdAt).toLocaleDateString("pt-BR")}</time></div>
              <h4>{request.studentName}</h4><p><strong>{schoolName(request.toSchoolId)}</strong> solicitou o histórico deste aluno.</p>{request.message && <blockquote>{request.message}</blockquote>}
              {request.status === "Solicitado" && matching.length > 0 && <div className="transfer-send-existing"><select value={selectedHistory[request.id] ?? matching[0].id} onChange={(event) => setSelectedHistory((current) => ({ ...current, [request.id]: event.target.value }))}>{matching.map((history) => <option key={history.id} value={history.id}>{history.aluno.nome} — {history.anoLetivo || history.codigo}</option>)}</select><button className="primary" onClick={() => sendExisting(request.id, selectedHistory[request.id] ?? matching[0].id)}>Enviar histórico já pronto</button></div>}
              <div className="transfer-card-actions">{request.status === "Solicitado" && <button onClick={() => prepareHistory(request.id)}>Preparar novo histórico</button>}{request.historyId && <button onClick={() => openHistory(request.historyId!)}>{request.status === "Enviado" || request.status === "Recebido" ? "Ver histórico enviado" : "Continuar preenchimento"}</button>}<button className="danger" onClick={() => deleteMessage(request.id)}>Apagar mensagem</button></div>
            </article>;
          })}
          {!incoming.length && <div className="empty-transfer">Nenhum pedido recebido.</div>}
        </section>
        <section className="transfer-list">
          <div className="panel-heading"><h3>Pedidos enviados</h3><p>Acompanhe e receba os históricos solicitados.</p></div>
          {outgoing.map((request) => <article className={`transfer-card ${request.status === "Enviado" ? "attention" : ""}`} key={request.id}>
            <div className="transfer-card-head"><span className={`transfer-status status-${safeFileName(request.status)}`}>{request.status}</span><time>{new Date(request.createdAt).toLocaleDateString("pt-BR")}</time></div>
            <h4>{request.studentName}</h4><p>Solicitado para <strong>{schoolName(request.fromSchoolId)}</strong>.</p>
            <small>{request.status === "Solicitado" ? "Aguardando a escola de origem iniciar o atendimento." : request.status === "Em preparação" ? "A escola de origem está preparando o histórico." : request.status === "Enviado" ? "Histórico recebido. Escolha uma turma para arquivar." : "Histórico arquivado na escola."}</small>
            {request.status === "Enviado" && <div className="transfer-receive"><select value={selectedFolder[request.id] ?? ""} onChange={(event) => setSelectedFolder((current) => ({ ...current, [request.id]: event.target.value }))}><option value="">Escolha a turma</option>{folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.anoLetivo} — {folder.nome}</option>)}</select><button className="primary" disabled={!selectedFolder[request.id]} onClick={() => receiveHistory(request.id, selectedFolder[request.id])}>Receber e arquivar</button></div>}
            {request.status === "Recebido" && request.receivedHistoryId && <button onClick={() => openHistory(request.receivedHistoryId!)}>Abrir histórico recebido</button>}
            <button className="danger" onClick={() => deleteMessage(request.id)}>Apagar mensagem</button>
          </article>)}
          {!outgoing.length && <div className="empty-transfer">Nenhum pedido enviado.</div>}
        </section>
      </div>
    </section>
  );
}

type MediaAssetCardProps = {
  title: string;
  description: string;
  value: string;
  onUpload: (file?: File) => void | Promise<void>;
  onUrlChange?: (value: string) => void;
  onRemoveBackground: () => void | Promise<void>;
  onClear: () => void;
  compact?: boolean;
  toggle?: {
    label: string;
    checked: boolean;
    disabled?: boolean;
    onChange: (checked: boolean) => void;
  };
};

function MediaAssetCard({
  title,
  description,
  value,
  onUpload,
  onUrlChange,
  onRemoveBackground,
  onClear,
  compact = false,
  toggle,
}: MediaAssetCardProps) {
  const inputId = useId();
  return (
    <article className={compact ? "media-card compact" : "media-card"}>
      <div className="media-card-head">
        <div>
          <strong>{title}</strong>
          <span>{description}</span>
        </div>
        <small className={value ? "media-status ready" : "media-status"}>{value ? "Pronto" : "Vazio"}</small>
      </div>
      <div className={value ? "media-preview has-image" : "media-preview"}>
        {value ? <img src={value} alt="" /> : <span>Sem imagem</span>}
      </div>
      {onUrlChange && (
        <input value={value} onChange={(event) => onUrlChange(event.target.value)} placeholder="Colar link da imagem" />
      )}
      {toggle && (
        <label className="media-toggle">
          <input
            type="checkbox"
            checked={toggle.checked}
            disabled={toggle.disabled}
            onChange={(event) => toggle.onChange(event.target.checked)}
          />
          <span>{toggle.label}</span>
        </label>
      )}
      <div className="media-actions">
        <input id={inputId} className="media-file-input" type="file" accept="image/*" onChange={(event) => void onUpload(event.target.files?.[0])} />
        <label className="media-upload-button" htmlFor={inputId}>Escolher imagem</label>
        <button type="button" disabled={!value} onClick={() => void onRemoveBackground()}>Remover fundo</button>
        <button type="button" className="danger" disabled={!value} onClick={onClear}>Limpar</button>
      </div>
    </article>
  );
}

function SchoolSettings({ school, schoolDirectory, updateSchool, onSave }: { school: School; schoolDirectory: SchoolDirectoryItem[]; updateSchool: (patch: Partial<School>) => void; onSave: () => void }) {
  const uploadSchoolImage = async (key: SchoolImageKey, file?: File) => {
    const image = await imageFileToTransparentPng(file);
    if (!image) return;
    updateSchool({ [key]: image });
  };
  const makeSchoolImageTransparent = async (key: SchoolImageKey, value: string) => {
    updateSchool({ [key]: await removeLightBackground(value) });
  };
  const mediaItems: Array<{ key: SchoolImageKey; title: string; description: string; url?: boolean }> = [
    { key: "logoSistema", title: "Logo do sistema", description: "Aparece no painel da escola.", url: true },
    { key: "logo", title: "Logo do histórico", description: "Aparece no cabeçalho da folha.", url: true },
    { key: "marcaDagua", title: "Marca d'água", description: "Fica ao fundo das páginas do histórico.", url: true },
    { key: "carimboEscola", title: "Carimbo da escola", description: "Entra no quadro superior quando marcado." },
    { key: "assinaturaDiretor", title: "Diretora", description: "Carimbo ou assinatura da direção." },
    { key: "assinaturaSecretario", title: "Secretaria", description: "Carimbo ou assinatura da secretaria." },
  ];
  const fields: Array<[keyof School, string]> = [
    ["nome", "Nome do estabelecimento"],
    ["mantenedora", "Entidade mantenedora"],
    ["codigo", "Codigo INEP"],
    ["parecer", "Parecer"],
    ["validade", "Validade"],
  ];
  return (
    <section className="settings-screen">
      <div className="panel-heading">
        <h2>Cadastro da Escola</h2>
        <p>Esses dados preenchem automaticamente o cabecalho, dados legais, local e assinaturas.</p>
      </div>
      <div className="settings-grid">
        <LocationFields
          estado={school.estado}
          municipio={school.municipio}
          onChange={(patch) => updateSchool(patch)}
        />
        {fields.map(([key, label]) => (
          <label key={key} className={key === "nome" || key === "mantenedora" ? "wide" : ""}>
            <span>{label}</span>
            {key === "nome" ? (
              <SchoolNameInput
                value={school.nome}
                onChange={(value) => updateSchool({ nome: value })}
                municipio={school.municipio}
                estado={school.estado}
                schoolDirectory={schoolDirectory}
                placeholder="Nome do estabelecimento"
              />
            ) : (
              <input value={school[key]} onChange={(event) => updateSchool({ [key]: uppercaseInput(event.target.value) })} />
            )}
          </label>
        ))}
        <section className="school-media-panel wide">
          <div className="media-panel-heading">
            <div>
              <h3>Imagens da escola</h3>
              <p>Logo, marca d'água e carimbos usados nos históricos.</p>
            </div>
            <span>{mediaItems.filter((item) => school[item.key]).length}/{mediaItems.length}</span>
          </div>
          <div className="media-grid">
            {mediaItems.map((item) => (
              <MediaAssetCard
                key={item.key}
                title={item.title}
                description={item.description}
                value={school[item.key]}
                onUrlChange={item.url ? (value) => updateSchool({ [item.key]: value }) : undefined}
                onUpload={(file) => uploadSchoolImage(item.key, file)}
                onRemoveBackground={() => makeSchoolImageTransparent(item.key, school[item.key])}
                onClear={() => updateSchool({ [item.key]: "" })}
              />
            ))}
          </div>
        </section>
      </div>
      <div className="settings-savebar">
        <button className="primary" type="button" onClick={onSave}>Salvar dados da escola</button>
      </div>
    </section>
  );
}

function Progress({ step, setStep }: { step: number; setStep: (step: number) => void }) {
  return (
    <div className="progress">
      {steps.map((label, index) => (
        <button key={label} className={index === step ? "current" : index < step ? "done" : ""} onClick={() => setStep(index)}>
          <span>{index < step ? "OK" : index + 1}</span>
          {label}
        </button>
      ))}
    </div>
  );
}

function StepForm({
  record,
  school,
  step,
  updateActive,
  schoolDirectory,
  setStep,
  finishHistory,
  mode = "history",
}: {
  record: HistoryRecord;
  school: School;
  step: number;
  updateActive: (updater: (record: HistoryRecord) => HistoryRecord) => void;
  schoolDirectory: SchoolDirectoryItem[];
  setStep: (step: number) => void;
  finishHistory: (id: string, generatePdf?: boolean) => Promise<void>;
  mode?: "history" | "model";
}) {
  const updateStudent = (patch: Partial<Student>) => updateActive((item) => ({ ...item, aluno: { ...item.aluno, ...patch } }));
  const updateLegal = (patch: Partial<SchoolLegal>) => updateActive((item) => ({ ...item, dadosLegais: { ...item.dadosLegais, ...patch } }));

  return (
    <section className="step-card">
      <div className="step-scroll">
        {step === 0 && (
          <>
            <h2>Identificacao do Aluno</h2>
            <div className="form-grid">
              <Field label="Nome completo" value={record.aluno.nome} onChange={(value) => updateStudent({ nome: value })} wide />
              <Field label="ID do aluno" value={record.aluno.idAluno} onChange={(value) => updateStudent({ idAluno: value })} />
              <Field label="Data de nascimento" type="date" value={record.aluno.nascimento} onChange={(value) => updateStudent({ nascimento: value })} />
              <Field label="Nacionalidade" value={record.aluno.nacionalidade} onChange={(value) => updateStudent({ nacionalidade: value })} />
              <LocationFields
                cityLabel="Naturalidade - cidade"
                stateLabel="Naturalidade - estado"
                municipio={record.aluno.naturalidadeCidade}
                estado={record.aluno.naturalidadeEstado}
                onChange={(patch) => updateStudent({
                  naturalidadeCidade: patch.municipio ?? record.aluno.naturalidadeCidade,
                  naturalidadeEstado: patch.estado ?? record.aluno.naturalidadeEstado,
                })}
              />
              <label className="checkbox-line wide">
                <input
                  type="checkbox"
                  checked={record.aluno.paiNaoDeclarado}
                  onChange={(event) => updateStudent({ paiNaoDeclarado: event.target.checked, pai: event.target.checked ? "" : record.aluno.pai })}
                />
                Nao consta pai no registro
              </label>
              <Field label="Nome do pai" value={record.aluno.pai} onChange={(value) => updateStudent({ pai: value })} disabled={record.aluno.paiNaoDeclarado} />
              <Field label="Nome da mae" value={record.aluno.mae} onChange={(value) => updateStudent({ mae: value })} />
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h2>Dados do Ensino Fundamental</h2>
            <div className="form-grid">
              <Field label="Parecer" value={record.dadosLegais.parecer} onChange={(value) => updateLegal({ parecer: value })} />
              <Field label="Validade" value={record.dadosLegais.validade} onChange={(value) => updateLegal({ validade: value })} />
            </div>
          </>
        )}

        {step === 2 && <NotesForm record={record} school={school} updateActive={updateActive} />}
        {step === 3 && <WorkloadForm record={record} updateActive={updateActive} />}
        {step === 4 && <StudiesForm record={record} schoolDirectory={schoolDirectory} updateActive={updateActive} />}
        {step === 5 && <CertificateForm record={record} school={school} updateActive={updateActive} />}
        {step === 6 && (
          <Conference
            record={record}
            setStep={setStep}
            finishHistory={finishHistory}
            mode={mode}
          />
        )}
      </div>

      <div className="step-actions">
        <button disabled={step === 0} onClick={() => setStep(Math.max(0, step - 1))}>Voltar</button>
        <button className="primary" disabled={step === steps.length - 1} onClick={() => setStep(Math.min(steps.length - 1, step + 1))}>Continuar</button>
      </div>
    </section>
  );
}

function Field({ label, value, onChange, type = "text", wide = false, disabled = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; wide?: boolean; disabled?: boolean }) {
  return (
    <label className={wide ? "wide" : ""}>
      <span>{label}</span>
      <input disabled={disabled} type={type} value={value} onChange={(event) => onChange(type === "text" ? uppercaseInput(event.target.value) : event.target.value)} />
    </label>
  );
}

function SchoolNameInput({
  value,
  onChange,
  municipio,
  estado,
  schoolDirectory,
  placeholder = "Nome da escola",
  disabled = false,
  compact = false,
}: {
  value: string;
  onChange: (value: string) => void;
  municipio: string;
  estado: string;
  schoolDirectory: SchoolDirectoryItem[];
  placeholder?: string;
  disabled?: boolean;
  compact?: boolean;
}) {
  const { schools, loading } = useSchoolDirectory(municipio, estado, schoolDirectory);
  const listId = useId();

  if (disabled) {
    return <input disabled value="-" aria-label={placeholder} />;
  }

  return (
    <span className={compact ? "school-name-input compact" : "school-name-input"}>
      <input
        list={listId}
        title={value}
        value={value}
        onChange={(event) => onChange(uppercaseInput(event.target.value))}
        placeholder={loading ? "Buscando escolas..." : placeholder}
        aria-label={placeholder}
      />
      <datalist id={listId}>
        {schools.map((item) => (
          <option key={`${item.estado}-${item.municipio}-${item.codigo || item.nome}`} value={item.nome}>
            {[item.codigo, item.rede].filter(Boolean).join(" - ")}
          </option>
        ))}
      </datalist>
    </span>
  );
}

function LocationFields({
  municipio,
  estado,
  onChange,
  cityLabel = "Municipio",
  stateLabel = "Estado",
}: {
  municipio: string;
  estado: string;
  onChange: (patch: { municipio?: string; estado?: string }) => void;
  cityLabel?: string;
  stateLabel?: string;
}) {
  const { states, cities, stateCode, loadingCities } = useBrazilLocations(estado);
  const selectedState = stateCode.length === 2 ? stateCode : "";
  const selectedCity = uppercaseInput(municipio);
  const cityExists = cities.some((city) => uppercaseInput(city.nome) === selectedCity);

  return (
    <>
      <label>
        <span>{stateLabel}</span>
        <select
          value={selectedState}
          onChange={(event) => onChange({ estado: event.target.value, municipio: "" })}
        >
          <option value="">{states.length ? "Selecione" : "Carregando..."}</option>
          {states.map((state) => (
            <option key={state.id} value={state.sigla}>{state.sigla} - {uppercaseInput(state.nome)}</option>
          ))}
        </select>
      </label>
      <label>
        <span>{cityLabel}</span>
        {selectedState && !loadingCities && !cities.length ? (
          <input value={selectedCity} onChange={(event) => onChange({ municipio: uppercaseInput(event.target.value) })} />
        ) : (
          <select
            value={cityExists ? selectedCity : ""}
            disabled={!selectedState || loadingCities}
            onChange={(event) => onChange({ municipio: event.target.value })}
          >
            <option value="">{loadingCities ? "Carregando..." : selectedState ? "Selecione" : "Escolha o estado"}</option>
            {!cityExists && selectedCity && <option value={selectedCity}>{selectedCity}</option>}
            {cities.map((city) => {
              const name = uppercaseInput(city.nome);
              return <option key={city.id} value={name}>{name}</option>;
            })}
          </select>
        )}
      </label>
    </>
  );
}

function StudyLocationFields({
  cidade,
  estado,
  disabled,
  onChange,
}: {
  cidade: string;
  estado: string;
  disabled: boolean;
  onChange: (patch: Partial<Pick<StudyRow, "cidade" | "estado">>) => void;
}) {
  const { states, cities, stateCode, loadingCities } = useBrazilLocations(estado);
  const selectedState = stateCode.length === 2 ? stateCode : "";
  const selectedCity = uppercaseInput(cidade);
  const cityExists = cities.some((city) => uppercaseInput(city.nome) === selectedCity);

  if (disabled) {
    return (
      <>
        <input disabled value="-" aria-label="Cidade" />
        <input disabled value="-" aria-label="UF" />
      </>
    );
  }

  return (
    <>
      {selectedState && !loadingCities && !cities.length ? (
        <input
          title={selectedCity}
          value={selectedCity}
          onChange={(event) => onChange({ cidade: uppercaseInput(event.target.value) })}
          placeholder="Cidade"
          aria-label="Cidade"
        />
      ) : (
        <select
          title={selectedCity}
          value={selectedCity}
          disabled={!selectedState || loadingCities}
          onChange={(event) => onChange({ cidade: event.target.value })}
          aria-label="Cidade"
        >
          <option value="">{loadingCities ? "Carregando..." : selectedState ? "Cidade" : "Escolha a UF"}</option>
          {!cityExists && selectedCity && <option value={selectedCity}>{selectedCity}</option>}
          {cities.map((city) => {
            const name = uppercaseInput(city.nome);
            return <option key={city.id} value={name}>{name}</option>;
          })}
        </select>
      )}
      <select
        title={selectedState || upper(estado)}
        value={selectedState}
        onChange={(event) => onChange({ estado: event.target.value, cidade: "" })}
        aria-label="UF"
      >
        <option value="">UF</option>
        {states.map((state) => (
          <option key={state.id} value={state.sigla}>{state.sigla}</option>
        ))}
      </select>
    </>
  );
}

function NotesForm({ record, school, updateActive }: { record: HistoryRecord; school: School; updateActive: (updater: (record: HistoryRecord) => HistoryRecord) => void }) {
  const tableRef = useRef<HTMLDivElement>(null);
  const [newComponent, setNewComponent] = useState({ nome: "", area: "Parte Diversificada" as Area, inicio: 1, fim: 9, avaliativo: true });

  const moveFocus = (current: HTMLInputElement, rowDelta: number, colDelta: number) => {
    const row = Number(current.dataset.row);
    const col = Number(current.dataset.col);
    const next = tableRef.current?.querySelector<HTMLInputElement>(`input[data-row="${row + rowDelta}"][data-col="${col + colDelta}"]`);
    next?.focus();
    next?.select();
  };

  const toggleNoteBoldYear = (year: number) => {
    updateActive((item) => ({
      ...item,
      notasNegritoAnos: {
        ...item.notasNegritoAnos,
        [year]: !item.notasNegritoAnos[year],
      },
    }));
  };
  const updateNote = (componentId: string, year: number, value: string) => {
    if (!isAllowedNoteTyping(value)) return;
    const note = normalizeNoteInput(value);
    updateActive((item) => ({
      ...item,
      notas: { ...item.notas, [componentId]: { ...(item.notas[componentId] ?? {}), [year]: note } },
    }));
  };
  const finishNote = (componentId: string, year: number, value: string) => {
    const note = formatNoteValue(value);
    updateActive((item) => ({
      ...item,
      notas: { ...item.notas, [componentId]: { ...(item.notas[componentId] ?? {}), [year]: note } },
    }));
  };

  return (
    <>
      <h2>Notas e Componentes Curriculares</h2>
      <div className="notes-bold-years">
        <span>Notas em negrito</span>
        {years.map((year) => (
          <button
            key={year}
            type="button"
            className={noteBoldFor(record, year) ? "active" : ""}
            onClick={() => toggleNoteBoldYear(year)}
          >
            {year}o
          </button>
        ))}
      </div>
      <div className="matrix-editor notes-matrix-editor" ref={tableRef}>
        <table>
          <thead>
            <tr>
              <th>Componente curricular</th>
              {years.map((year) => <th key={year}>{year}o</th>)}
              <th />
            </tr>
          </thead>
          <tbody>
            {record.matriz.map((component, rowIndex) => (
              <tr key={component.id}>
                <td>
                  <input className="component-name" value={component.nome} onChange={(event) => updateActive((item) => ({ ...item, matriz: item.matriz.map((row) => row.id === component.id ? { ...row, nome: uppercaseInput(event.target.value) } : row) }))} />
                  <small>{component.area} - {component.avaliativo ? "Avaliativo" : "Nao avaliativo"}</small>
                </td>
                {years.map((year, colIndex) => {
                  const disabled = year < component.inicio || year > component.fim || year > lastAttendedYear(record);
                  return (
                    <td key={year}>
                      <input
                        className={noteBoldFor(record, year) ? "is-bold" : ""}
                        data-row={rowIndex}
                        data-col={colIndex}
                        disabled={disabled}
                        inputMode="text"
                        title="Use nota, letras ou símbolos"
                        value={disabled ? "-" : record.notas[component.id]?.[year] ?? ""}
                        onChange={(event) => updateNote(component.id, year, event.target.value)}
                        onBlur={(event) => finishNote(component.id, year, event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") moveFocus(event.currentTarget, 0, 1);
                          if (event.key === "ArrowRight") moveFocus(event.currentTarget, 0, 1);
                          if (event.key === "ArrowLeft") moveFocus(event.currentTarget, 0, -1);
                          if (event.key === "ArrowDown") moveFocus(event.currentTarget, 1, 0);
                          if (event.key === "ArrowUp") moveFocus(event.currentTarget, -1, 0);
                        }}
                      />
                    </td>
                  );
                })}
                <td><button onClick={() => updateActive((item) => ({ ...item, matriz: item.matriz.filter((row) => row.id !== component.id) }))}>Excluir</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="add-component">
        <input placeholder="Novo componente curricular" value={newComponent.nome} onChange={(event) => setNewComponent((item) => ({ ...item, nome: uppercaseInput(event.target.value) }))} />
        <select value={newComponent.area} onChange={(event) => setNewComponent((item) => ({ ...item, area: event.target.value as Area }))}>
          <option>Linguagens e Codigos</option>
          <option>Cultura e Sociedade</option>
          <option>Ciencias Naturais e Matematica</option>
          <option>Parte Diversificada</option>
        </select>
        <input type="number" min="1" max="9" value={newComponent.inicio} onChange={(event) => setNewComponent((item) => ({ ...item, inicio: Number(event.target.value) }))} />
        <input type="number" min="1" max="9" value={newComponent.fim} onChange={(event) => setNewComponent((item) => ({ ...item, fim: Number(event.target.value) }))} />
        <label className="checkbox-line"><input type="checkbox" checked={newComponent.avaliativo} onChange={(event) => setNewComponent((item) => ({ ...item, avaliativo: event.target.checked }))} /> Avaliativo</label>
        <button
          onClick={() => {
            if (!newComponent.nome.trim()) return;
            const id = newComponent.nome.toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]+/g, "-") + "-" + Date.now();
            updateActive((item) => ({ ...item, matriz: [...item.matriz, { ...newComponent, id }] }));
            setNewComponent({ nome: "", area: "Parte Diversificada", inicio: 1, fim: 9, avaliativo: true });
          }}
        >
          + Adicionar componente curricular
        </button>
      </div>

      <h3>Resultado Final</h3>
      <div className="result-grid">
        {years.map((year) => (
          <label key={year}>
            <span>{year}o Ano</span>
            <select value={record.resultados[year] ?? ""} onChange={(event) => {
              const value = uppercaseInput(event.target.value);
              updateActive((item) => {
                const terminal = value === "CURSANDO" || value === "TRANSFERIDO";
                const resultados = { ...item.resultados, [year]: value };
                const cargaHoraria = { ...item.cargaHoraria };
                const notas = Object.fromEntries(Object.entries(item.notas).map(([id, row]) => [id, { ...row }]));
                const estudos = item.estudos.map((study, index) => {
                  const schoolYear = index + 1;
                  if (terminal && schoolYear > year) return { ...study, ativo: false, ano: "-", escola: "-", cidade: "-", estado: "-" };
                  if (terminal && schoolYear === year) return { ...study, ativo: true, ano: item.anoLetivo, escola: upper(school.nome), cidade: upper(school.municipio), estado: upper(school.estado) };
                  return study;
                });
                if (terminal) {
                  years.filter((nextYear) => nextYear > year).forEach((nextYear) => {
                    resultados[nextYear] = "-";
                    cargaHoraria[nextYear] = { oferta: "-", frequencia: "-", percentual: "-", manualPercentual: true };
                    Object.values(notas).forEach((row) => { row[nextYear] = "-"; });
                  });
                }
                return { ...item, resultados, cargaHoraria, notas, estudos };
              });
            }}>
              <option value="">Em branco</option>
              <option>APROVADO</option>
              <option>REPROVADO</option>
              <option>CURSANDO</option>
              <option>TRANSFERIDO</option>
              <option>PROGRESSAO</option>
              <option>NAO INFORMADO</option>
              <option value="-">-</option>
            </select>
          </label>
        ))}
      </div>
    </>
  );
}

function WorkloadForm({ record, updateActive }: { record: HistoryRecord; updateActive: (updater: (record: HistoryRecord) => HistoryRecord) => void }) {
  const finalYear = lastAttendedYear(record);
  const setSchoolYear = (year: number, value: string) => {
    updateActive((item) => ({
      ...item,
      estudos: item.estudos.map((study, index) => index === year - 1 ? { ...study, ano: value } : study),
    }));
  };
  const setValue = (year: number, key: keyof WorkloadRow, value: string) => {
    updateActive((item) => {
      const row = { ...item.cargaHoraria[year], [key]: value };
      if ((key === "oferta" || key === "frequencia") && !row.manualPercentual) {
        row.percentual = calculatePercent(row.oferta, row.frequencia);
      }
      if (key === "percentual") row.manualPercentual = true;
      return { ...item, cargaHoraria: { ...item.cargaHoraria, [year]: row } };
    });
  };
  return (
    <>
      <h2>Carga Horaria e Frequencia</h2>
      <div className="matrix-editor compact">
        <table>
          <thead><tr><th>Campo</th>{years.map((year) => <th key={year}>{year}o Ano</th>)}</tr></thead>
          <tbody>
            <tr>
              <td>Ano letivo</td>
              {years.map((year) => (
                <td key={`ano-letivo-${year}`}>
                  <input disabled={year > finalYear} value={year > finalYear ? "-" : record.estudos[year - 1]?.ano ?? ""} onChange={(event) => setSchoolYear(year, uppercaseInput(event.target.value))} />
                </td>
              ))}
            </tr>
            {(["oferta", "frequencia", "percentual"] as const).map((field) => (
              <tr key={field}>
                <td>{field === "oferta" ? "Oferta anual" : field === "frequencia" ? "Frequencia anual" : "% Frequencia"}</td>
                {years.map((year) => (
                  <td key={year}><input disabled={year > finalYear} value={year > finalYear ? "-" : record.cargaHoraria[year]?.[field] ?? ""} onChange={(event) => setValue(year, field, uppercaseInput(event.target.value))} /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function StudiesForm({ record, schoolDirectory, updateActive }: { record: HistoryRecord; schoolDirectory: SchoolDirectoryItem[]; updateActive: (updater: (record: HistoryRecord) => HistoryRecord) => void }) {
  const updateStudy = (index: number, patch: Partial<StudyRow>) => {
    updateActive((item) => ({ ...item, estudos: item.estudos.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row) }));
  };
  const applyNext = (index: number) => {
    updateActive((item) => {
      const source = item.estudos[index];
      const nextIndex = index + 1;
      return {
        ...item,
        estudos: item.estudos.map((row, rowIndex) => {
          if (rowIndex !== nextIndex) return row;
          return { ...row, ativo: true, escola: source.escola, cidade: source.cidade, estado: source.estado };
        }),
      };
    });
  };
  return (
    <>
      <h2>Escola de Origem / Estudos Realizados</h2>
      <div className="studies-list">
        {record.estudos.map((study, index) => (
          <div className="study-row" key={study.serie}>
            <label className="study-active">
              <input type="checkbox" aria-label={`${study.serie} possui estudos realizados`} checked={study.ativo} onChange={(event) => updateStudy(index, { ativo: event.target.checked })} />
            </label>
            <strong>{study.serie}</strong>
            <input title={study.ano} disabled={!study.ativo} value={study.ativo ? study.ano : "-"} onChange={(event) => updateStudy(index, { ano: uppercaseInput(event.target.value) })} placeholder="Ano" />
            <SchoolNameInput
              value={study.ativo ? study.escola : "-"}
              disabled={!study.ativo}
              onChange={(value) => updateStudy(index, { escola: value })}
              municipio={study.cidade}
              estado={study.estado}
              schoolDirectory={schoolDirectory}
              placeholder="Estabelecimento"
              compact
            />
            <StudyLocationFields
              cidade={study.cidade}
              estado={study.estado}
              disabled={!study.ativo}
              onChange={(patch) => updateStudy(index, patch)}
            />
            {index < record.estudos.length - 1 && (
              <button type="button" disabled={!study.ativo} onClick={() => applyNext(index)}>Usar no proximo</button>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

function CertificateForm({
  record,
  school,
  updateActive,
}: {
  record: HistoryRecord;
  school: School;
  updateActive: (updater: (record: HistoryRecord) => HistoryRecord) => void;
}) {
  const updateCertificate = (patch: Partial<Certificate>) => {
    updateActive((item) => ({ ...item, certificado: { ...item.certificado, ...patch } }));
  };
  return (
    <>
      <h2>Certificado e Observacoes</h2>
      <label className="checkbox-line certificate-toggle">
        <input
          type="checkbox"
          checked={record.certificado.preencher}
          onChange={(event) => updateCertificate({ preencher: event.target.checked })}
        />
        <span>Preencher certificado neste historico</span>
      </label>
      <div className="form-grid">
        <Field label="Etapa concluida" value={record.certificado.etapa} onChange={(value) => updateCertificate({ etapa: value })} disabled={!record.certificado.preencher} />
        <Field label="Ano de conclusao" value={record.certificado.anoConclusao} onChange={(value) => updateCertificate({ anoConclusao: value })} disabled={!record.certificado.preencher} />
        <Field label="Prosseguimento dos estudos" value={record.certificado.prosseguimento} onChange={(value) => updateCertificate({ prosseguimento: value })} disabled={!record.certificado.preencher} />
      </div>
      <section className="stamp-choice-panel">
        <h3>Carimbos do documento</h3>
        <div className="stamp-choice-list">
          <label className="checkbox-line certificate-toggle">
            <input
              type="checkbox"
              checked={record.usarCarimboEscola}
              disabled={!school.carimboEscola}
              onChange={(event) => updateActive((item) => ({ ...item, usarCarimboEscola: event.target.checked }))}
            />
            <span>Usar carimbo da escola no cabeçalho</span>
            <small>{school.carimboEscola ? "Cadastrado em Dados da escola" : "Cadastre primeiro em Dados da escola"}</small>
          </label>
          <label className="checkbox-line certificate-toggle">
            <input
              type="checkbox"
              checked={record.usarAssinaturaDiretor}
              disabled={!school.assinaturaDiretor}
              onChange={(event) => updateActive((item) => ({ ...item, usarAssinaturaDiretor: event.target.checked }))}
            />
            <span>Usar carimbo/assinatura da diretora</span>
            <small>{school.assinaturaDiretor ? "Cadastrado em Dados da escola" : "Cadastre primeiro em Dados da escola"}</small>
          </label>
          <label className="checkbox-line certificate-toggle">
            <input
              type="checkbox"
              checked={record.usarAssinaturaSecretario}
              disabled={!school.assinaturaSecretario}
              onChange={(event) => updateActive((item) => ({ ...item, usarAssinaturaSecretario: event.target.checked }))}
            />
            <span>Usar carimbo/assinatura da secretaria</span>
            <small>{school.assinaturaSecretario ? "Cadastrado em Dados da escola" : "Cadastre primeiro em Dados da escola"}</small>
          </label>
          <label className="checkbox-line certificate-toggle">
            <input
              type="checkbox"
              checked={record.usarQrCode}
              onChange={(event) => updateActive((item) => ({ ...item, usarQrCode: event.target.checked }))}
            />
            <span>Usar QR Code neste histórico</span>
            <small>Marque somente quando o documento puder sair com código de leitura.</small>
          </label>
        </div>
      </section>
      <div className="observations-editor">
        {record.observacoes.map((obs, index) => (
          <label key={index}>
            <span>Observacao {index + 1}</span>
            <textarea value={obs} onChange={(event) => updateActive((item) => ({ ...item, observacoes: item.observacoes.map((row, rowIndex) => rowIndex === index ? uppercaseInput(event.target.value) : row) }))} />
          </label>
        ))}
        <button onClick={() => updateActive((item) => ({ ...item, observacoes: [...item.observacoes, ""] }))}>+ Adicionar observacao</button>
      </div>
      <h3>Local e data</h3>
      <div className="form-grid">
        <LocationFields
          estado={record.localData.estado}
          municipio={record.localData.municipio}
          onChange={(patch) => updateActive((item) => ({ ...item, localData: { ...item.localData, ...patch } }))}
        />
        <Field label="Data de emissao" type="date" value={record.localData.data} onChange={(value) => updateActive((item) => ({ ...item, localData: { ...item.localData, data: value } }))} />
      </div>
    </>
  );
}

function Conference({
  record,
  setStep,
  finishHistory,
  mode = "history",
}: {
  record: HistoryRecord;
  setStep: (step: number) => void;
  finishHistory: (id: string, generatePdf?: boolean) => Promise<void>;
  mode?: "history" | "model";
}) {
  const issues = useMemo(() => {
    if (mode === "model") return [];
    const list: Array<{ label: string; step: number }> = [];
    if (!record.aluno.nome) list.push({ label: "Nome do aluno nao informado", step: 0 });
    if (!record.aluno.nascimento) list.push({ label: "Data de nascimento nao informada", step: 0 });
    if (!record.aluno.paiNaoDeclarado && !record.aluno.pai && !record.aluno.mae) list.push({ label: "Filiacao nao preenchida", step: 0 });
    if (!record.dadosLegais.parecer) list.push({ label: "Parecer nao informado", step: 1 });
    record.matriz.forEach((component) => {
      years.forEach((year) => {
        if (year >= component.inicio && year <= component.fim && component.avaliativo && !record.notas[component.id]?.[year] && year <= 8) {
          list.push({ label: `${component.nome} - ${year}o Ano`, step: 2 });
        }
      });
    });
    years.forEach((year) => {
      if (!record.cargaHoraria[year]?.oferta && year <= 8) list.push({ label: `Oferta anual do ${year}o ano nao informada`, step: 3 });
      if (!record.resultados[year] || record.resultados[year] === "Nao informado") list.push({ label: `Resultado final do ${year}o ano nao informado`, step: 2 });
    });
    return list.slice(0, 12);
  }, [record, mode]);

  return (
    <>
      <h2>{mode === "model" ? "Conferir Modelo" : "Conferir Historico"}</h2>
      <div className="conference">
        <p className="ok">OK Dados da escola carregados</p>
        <p className="ok">OK Previa montada automaticamente</p>
        <p className="ok">OK Calculo de frequencia aplicado</p>
        {issues.length === 0 ? (
          <p className="ok">{mode === "model" ? "OK Modelo pronto para salvar" : "OK Historico pronto para emissao"}</p>
        ) : (
          issues.map((issue) => (
            <button key={issue.label} className="warning" onClick={() => setStep(issue.step)}>
              Atencao: {issue.label}
            </button>
          ))
        )}
      </div>
      <div className="inline-actions"><button className="primary" onClick={() => void finishHistory(record.id)}>{mode === "model" ? "Salvar modelo" : "Salvar histórico"}</button></div>
    </>
  );
}

const matrixGroups: Array<{ area: Area; areaLabel: string; rows: string[] }> = [
  {
    area: "Linguagens e Codigos",
    areaLabel: "LINGUAGENS E CODIGOS",
    rows: ["portugues", "portugues-ii", "arte", "educacao-fisica", "ingles"],
  },
  {
    area: "Cultura e Sociedade",
    areaLabel: "CULTURA E SOCIEDADE",
    rows: ["historia", "geografia", "religioso"],
  },
  {
    area: "Ciencias Naturais e Matematica",
    areaLabel: "CIENCIAS NATURAIS E MATEMATICA",
    rows: ["ciencias", "matematica", "matematica-ii"],
  },
];

const diversifiedRows = [
  "atividades-artisticas",
  "caerer",
  "circulo-leitura",
  "cultura-digital",
  "matematica-conectada",
  "oficina-textos",
  "oficina-narrativas",
  "portugues-conectado",
  "projeto-caminhar",
  "valorizacao-cultural",
  "estudo-orientado",
];

function noteFor(record: HistoryRecord, id: string, year: number) {
  return record.notas[id]?.[year] ?? "";
}

function noteBoldFor(record: HistoryRecord, year: number) {
  return Boolean(record.notasNegritoAnos?.[year]);
}

function schoolYearFor(record: HistoryRecord, year: number) {
  const study = record.estudos[year - 1];
  return study?.ativo ? study.ano || "" : "";
}

function formatLocalData(record: HistoryRecord, school?: School) {
  const municipio = record.localData.municipio || school?.municipio || defaultSchool.municipio;
  const estado = record.localData.estado || school?.estado || defaultSchool.estado;
  const location =
    municipio && estado
      ? `${municipio}- ${estado}`
      : municipio || estado;
  const date = formatDate(record.localData.data || todayIsoDate());
  if (location && date) return `${location}, ${date}`;
  return location || date;
}

function studyValue(study: StudyRow, key: "ano" | "escola" | "cidade" | "estado") {
  if (!study.ativo) return "-";
  return printCell(study[key]);
}

const printYearLabels = years.map((year) => `${year}° ANO`);

function Watermark({ school }: { school: School }) {
  return <img className="watermark-image" src={school.marcaDagua || defaultSchool.marcaDagua} alt="" />;
}

function DocumentHeader({ school, useSchoolStamp }: { school: School; useSchoolStamp: boolean }) {
  const historyLogo = school.logo || defaultSchool.logo;
  return (
    <div className="current-doc-header">
      <div className="header-logo-box">
        <img src={historyLogo} alt="" />
      </div>
      <div className="school-title-box">
        <h2>ESTADO DO CEARÁ</h2>
        <p>MUNICÍPIO</p>
        <strong>{upper(school.municipio || "BREJO SANTO")} - CEARÁ</strong>
        <p>ESTABELECIMENTO DE ENSINO</p>
        <strong>{upper(school.nome)}</strong>
        <p>ENTIDADE MANTENEDORA</p>
        <strong>{upper(school.mantenedora)}</strong>
      </div>
      <div className="header-empty-box">
        {useSchoolStamp && school.carimboEscola && <img src={school.carimboEscola} alt="" />}
      </div>
    </div>
  );
}

function DocumentPageOne({ record, school }: { record: HistoryRecord; school: School }) {
  const naturalidade = [
    record.aluno.naturalidadeCidade || school.municipio,
    record.aluno.naturalidadeEstado || school.estado,
  ].filter(Boolean).join(" - ");
  const nacionalidade = record.aluno.nacionalidade || "BRASILEIRA";
  const fatherName = record.aluno.paiNaoDeclarado ? noFatherMark : upper(record.aluno.pai);
  const extraComponents = record.matriz.filter((component) => !matrixSeed.some((seed) => seed.id === component.id));
  const extraRows = [...extraComponents, ...Array.from({ length: Math.max(0, 6 - extraComponents.length) }, (_, index) => ({
    id: `blank-extra-${index}`,
    area: "Parte Diversificada" as Area,
    nome: "",
    inicio: 1,
    fim: 9,
    avaliativo: true,
  }))];
  const matrixRowTotal = 3 + matrixGroups.reduce((total, group) => total + group.rows.length, 0) + 1 + diversifiedRows.length + extraRows.length + 1;
  const matrixBaseHeight = 628;
  const matrixRowHeight = Math.min(19, Math.max(12.2, matrixBaseHeight / matrixRowTotal));
  const compactRatio = matrixRowHeight / 19;
  const modeloCores = normalizeModelColors(record.modeloCores);
  const pageOneStyle = {
    "--matrix-row-height": `${matrixRowHeight}px`,
    "--matrix-font-size": `${Math.max(6.7, 8.8 * compactRatio)}px`,
    "--matrix-note-size": `${Math.max(7, 10 * compactRatio)}px`,
    "--matrix-head-size": `${Math.max(8.2, 11 * compactRatio)}px`,
    "--matrix-section-size": `${Math.max(9.5, 14 * compactRatio)}px`,
    "--matrix-area-size": `${Math.max(5.9, 6.7 * compactRatio)}px`,
    "--matrix-diversified-size": `${Math.max(6.5, 8.4 * compactRatio)}px`,
    "--matrix-main-fill": modeloCores.destaque,
    "--matrix-sub-fill": modeloCores.apoio,
    "--matrix-border-color": modeloCores.borda,
  } as CSSProperties;

  return (
    <article className="paper document-page vector-page page-one current-model" style={pageOneStyle}>
      <Watermark school={school} />
      <DocumentHeader school={school} useSchoolStamp={record.usarCarimboEscola} />

      <div className="document-title-box"><h1>HISTÓRICO ESCOLAR</h1></div>

      <section className="student-block">
        <div className="student-name-box">
          <div className="center-label">ALUNO</div>
          <div className="filled-line big student-full-name">{upper(record.aluno.nome)}</div>
        </div>
        <div className="doc-grid four labels">
          <span>DATA DE NASCIMENTO</span>
          <span>NACIONALIDADE</span>
          <span>NATURALIDADE</span>
          <span>IDENTIDADE</span>
        </div>
        <div className="doc-grid four boxed values">
          <span>{formatDate(record.aluno.nascimento)}</span>
          <span>{upper(nacionalidade)}</span>
          <span>{upper(naturalidade)}</span>
          <span>{printCell(record.aluno.identidade || "-")}</span>
        </div>
        <div className="family-box">
          <div className="center-label">FILIAÇÃO</div>
          <p><strong>PAI:</strong> {fatherName}</p>
          <p><strong>MÃE:</strong> {upper(record.aluno.mae)}</p>
        </div>
      </section>

      <div className="legal-strip">
        <span className="legal-stage">ENSINO FUNDAMENTAL</span>
        <span className="legal-authorization">CREDENCIAMENTO/<br />AUTORIZAÇÃO</span>
        <span className="legal-check" aria-hidden="true" />
        <span className="legal-recognition">CRE DENCIAMENTO/<br />RECONHECIMENTO</span>
        <span className="legal-validity">PARECER: {upper(record.dadosLegais.parecer || school.parecer)}<br />VALIDADE: {upper(record.dadosLegais.validade || school.validade)}</span>
      </div>

      <table className="doc-table current-matrix">
        <colgroup>
          <col className="base-col" />
          <col className="area-col" />
          <col className="component-col" />
          {years.map((year) => <col key={year} className="year-col" />)}
        </colgroup>
        <tbody>
          <tr>
            <td rowSpan={14} className="vertical-cell">BASE NACIONAL COMUM 9.394/96</td>
            <td colSpan={2} className="matrix-head">ÁREAS DE ENSINO<br />COMPONENTES CURRICULARES</td>
            <td colSpan={9} className="matrix-head">ANO/PERÍODO LETIVO</td>
          </tr>
          <tr>
            <td colSpan={2} className="matrix-subhead" />
            {years.map((year) => <td key={`letivo-${year}`} className="matrix-subhead">{printCell(schoolYearFor(record, year))}</td>)}
          </tr>
          <tr>
            <td colSpan={2} className="matrix-subhead" />
            {printYearLabels.map((label) => <td key={label} className="matrix-subhead">{label}</td>)}
          </tr>
          {matrixGroups.map((group) => (
            <Fragment key={group.area}>
              {group.rows.map((componentId, rowIndex) => {
                const component = record.matriz.find((item) => item.id === componentId);
                return (
                  <tr key={componentId}>
                    {rowIndex === 0 ? <td rowSpan={group.rows.length} className="area-cell">{group.areaLabel}</td> : null}
                    <td className="component-cell">{upper(component?.nome || "")}</td>
                    {years.map((year) => (
                      <td key={`${componentId}-${year}`} className={noteBoldFor(record, year) ? "note-value is-bold" : "note-value"}>{printCell(noteFor(record, componentId, year))}</td>
                    ))}
                  </tr>
                );
              })}
            </Fragment>
          ))}
          <tr className="section-row">
            <td colSpan={12}>PARTE DIVERSIFICADA</td>
          </tr>
          {diversifiedRows.map((componentId) => {
            const component = record.matriz.find((item) => item.id === componentId);
            return (
              <tr key={componentId}>
                <td colSpan={3} className="component-cell diversified-name">{upper(component?.nome || "")}</td>
                {years.map((year) => (
                  <td key={`${componentId}-${year}`} className={noteBoldFor(record, year) ? "note-value is-bold" : "note-value"}>{printCell(noteFor(record, componentId, year))}</td>
                ))}
              </tr>
            );
          })}
          {extraRows.map((component) => (
            <tr key={component.id}>
              <td colSpan={3} className="component-cell diversified-name">{upper(component.nome)}</td>
              {years.map((year) => (
                <td key={`${component.id}-${year}`} className={noteBoldFor(record, year) ? "note-value is-bold" : "note-value"}>{printCell(component.nome ? noteFor(record, component.id, year) : "")}</td>
              ))}
            </tr>
          ))}
          <tr className="result-final">
            <td colSpan={3}>RESULTADO FINAL</td>
            {years.map((year) => <td key={`result-${year}`}>{printCell(record.resultados[year])}</td>)}
          </tr>
        </tbody>
      </table>
    </article>
  );
}

function DocumentPageTwo({ record, school }: { record: HistoryRecord; school: School }) {
  const certificateEnabled = record.certificado.preencher;
  const certificateName = certificateEnabled ? printCell(record.aluno.nome) : "";
  const certificateStage = certificateEnabled ? printCell(record.certificado.etapa) : "";
  const certificateYear = certificateEnabled ? printCell(record.certificado.anoConclusao) : "";
  const certificateNext = certificateEnabled ? printCell(record.certificado.prosseguimento) : "";
  const showDirectorStamp = record.usarAssinaturaDiretor && Boolean(school.assinaturaDiretor);
  const showSecretaryStamp = record.usarAssinaturaSecretario && Boolean(school.assinaturaSecretario);

  return (
    <article className="paper document-page vector-page page-two current-model">
      <Watermark school={school} />

      <table className="doc-table workload-table">
        <colgroup>
          <col className="workload-side" />
          <col className="workload-label" />
          {years.map((year) => <col key={year} className="year-col" />)}
        </colgroup>
        <tbody>
          <tr>
            <td rowSpan={4} className="vertical-cell">CARGA<br />HORÁRIA</td>
            <td />
            {years.map((year) => <td key={`workload-year-${year}`} className="workload-year">{printCell(schoolYearFor(record, year))}</td>)}
          </tr>
          <tr>
            <td>OFERTA ANUAL</td>
            {years.map((year) => <td key={`oferta-${year}`}>{printCell(record.cargaHoraria[year]?.oferta)}</td>)}
          </tr>
          <tr>
            <td>FREQUÊNCIA ANUAL</td>
            {years.map((year) => <td key={`freq-${year}`}>{printCell(record.cargaHoraria[year]?.frequencia)}</td>)}
          </tr>
          <tr>
            <td>% FREQUÊNCIA</td>
            {years.map((year) => <td key={`percent-${year}`}>{printCell(record.cargaHoraria[year]?.percentual)}</td>)}
          </tr>
        </tbody>
      </table>

      <h2 className="origin-title">ESCOLA DE ORIGEM</h2>

      <table className="doc-table current-studies">
        <colgroup>
          <col className="study-side" />
          <col className="study-series" />
          <col className="study-year-col" />
          <col className="study-school" />
          <col className="study-city" />
          <col className="study-state" />
        </colgroup>
        <tbody>
          <tr>
            <td rowSpan={10} className="vertical-cell">ESTUDOS<br />REALIZADOS</td>
            <td className="study-head">SÉRIE/ANO</td>
            <td className="study-head">ANO</td>
            <td className="study-head">ESTABELECIMENTO DE ENSINO</td>
            <td className="study-head">CIDADE</td>
            <td className="study-head">ESTADO</td>
          </tr>
          {record.estudos.map((study, index) => (
            <tr key={study.serie}>
              <td>{printYearLabels[index]}</td>
              <td>{studyValue(study, "ano")}</td>
              <td>{studyValue(study, "escola")}</td>
              <td>{studyValue(study, "cidade")}</td>
              <td>{studyValue(study, "estado")}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <table className="current-observations">
        <tbody>
          <tr>
            <td className="observation-id-cell">ID: {upper(record.aluno.idAluno)}</td>
            <th className="observation-title-cell">OBSERVAÇÕES:</th>
          </tr>
          <tr>
            <td className="observation-content-cell" colSpan={2}>
          {record.observacoes.filter(Boolean).map((obs, index) => (
            <p key={`obs-${index}`}>{upper(obs)}</p>
          ))}
            </td>
          </tr>
        </tbody>
      </table>

      <section className="current-signatures">
        <p>{upper(formatLocalData(record, school))}</p>
        <p className="local-label">LOCAL E DATA</p>
        <div className={showDirectorStamp ? "signature-line has-stamp" : "signature-line"}>
          {showDirectorStamp && <img className="signature-stamp" src={school.assinaturaDiretor} alt="" />}
          {!showDirectorStamp && <small>DIRETOR (A) - Reg. Nº</small>}
        </div>
        <div className={showSecretaryStamp ? "signature-line has-stamp" : "signature-line"}>
          {showSecretaryStamp && <img className="signature-stamp" src={school.assinaturaSecretario} alt="" />}
          {!showSecretaryStamp && <small>SECRETÁRIO (A) – REG. Nº</small>}
        </div>
      </section>

      {record.usarQrCode && <HistoryQrCode record={record} />}

      <section className="current-certificate">
        <h2>CERTIFICADO</h2>
        <p className="cert-intro">Certificamos que: <strong className="cert-fill cert-name">{certificateName}</strong></p>
        <p>
          Concluiu o (a) <strong className="cert-fill cert-stage">{certificateStage}</strong> do Ensino Fundamental, no ano de <strong className="cert-fill cert-year">{certificateYear}</strong>, de acordo com a lei vigente, tendo obtidos resultados constante neste histórico escolar, dando-lhe o direito de prosseguimento de estudos no <strong className="cert-fill cert-next">{certificateNext}</strong>.
        </p>
        <p>LEGENDA: As (Aprendizagem satisfatória) ANS (Aprendizagem não satisfatória)</p>
        <p>IDA (Informação de desempenho da aprendizagem).</p>
        <p className="law-line">Lei nº 9.394/96, Art.24</p>
      </section>
    </article>
  );
}

export default App;
