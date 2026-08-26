"use client";

import { Fragment, useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import {
  createCloudOwner,
  deleteCloudHistory,
  firebaseEnabled,
  loadCloudHistories,
  loadCloudSetupStatus,
  loadCloudState,
  loginCloudAdmin,
  loginCloudSchool,
  logoutCloudSession,
  saveCloudHistories,
  saveCloudHistory,
  saveCloudState,
  setCloudSessionToken,
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
  carimboEscola: string;
  diretor: string;
  registroDiretor: string;
  assinaturaDiretor: string;
  secretario: string;
  registroSecretario: string;
  assinaturaSecretario: string;
};

type SchoolKind = "municipal" | "estadual";

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
  senha: string;
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
  notas: Record<string, Record<number, string>>;
  notasNegritoAnos: Record<number, boolean>;
  resultados: Record<number, string>;
  cargaHoraria: Record<number, WorkloadRow>;
  estudos: StudyRow[];
  certificado: Certificate;
  usarCarimboEscola: boolean;
  usarAssinaturaDiretor: boolean;
  usarAssinaturaSecretario: boolean;
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
};

type AuthRole = "owner" | "manager" | "school";

type AuthSession = {
  role: AuthRole;
  nome: string;
  adminUserId?: string;
  schoolId?: string;
  accessId?: string;
  sessionToken?: string;
};

type AdminCredentials = {
  usuario: string;
  senha: string;
};

type SchoolLoginCredentials = AdminCredentials & {
  tipo: SchoolKind;
};

type AdminUser = {
  id: string;
  nome: string;
  usuario: string;
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
  autorizacao: "", reconhecimento: "", parecer: "", validade: "", logoSistema: "", logo: "", carimboEscola: "",
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

const emptyStudent: Student = {
  nome: "",
  nascimento: "",
  nacionalidade: "BRASILEIRA",
  naturalidadeCidade: defaultSchool.municipio,
  naturalidadeEstado: defaultSchool.estado,
  identidade: "",
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

const allowedNoteWords = ["CURSANDO", "TRANSFERIDO", "APROVADO", "REPROVADO", "PROGRESSAO", "NAO INFORMADO"];

function normalizeNoteInput(value: string) {
  return uppercaseInput(value)
    .replace(/\./g, ",")
    .replace(/\s+/g, " ")
    .trim();
}

function isAllowedNoteTyping(value: string) {
  const text = normalizeNoteInput(value);
  if (!text || text === "-") return true;
  if (/^[A-ZÀ-Ú\s-]+$/.test(text)) return allowedNoteWords.some((word) => word.startsWith(plain(text)));
  return /^(?:10(?:,0?)?|[0-9](?:,[0-9]?)?)$/.test(text);
}

function isValidNoteValue(value: string) {
  const text = normalizeNoteInput(value);
  if (!text || text === "-") return true;
  if (allowedNoteWords.includes(plain(text))) return true;
  return /^(?:10(?:,0)?|[0-9](?:,[0-9])?)$/.test(text);
}

function formatNoteValue(value: string) {
  const text = normalizeNoteInput(value);
  if (!text || text === "-") return text;
  if (allowedNoteWords.includes(plain(text))) return text;
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
      rede: account.tipo === "estadual" ? "ESTADUAL" : "MUNICIPAL",
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
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth || image.width;
      canvas.height = image.naturalHeight || image.height;
      const context = canvas.getContext("2d");
      if (!context) {
        resolve(dataUrl);
        return;
      }
      context.drawImage(image, 0, 0);
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
      const scale = Math.max(1, Math.min(3, maxWidth / (image.naturalWidth || image.width)));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round((image.naturalWidth || image.width) * scale);
      canvas.height = Math.round((image.naturalHeight || image.height) * scale);
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
  return fileToDataUrl(file);
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
  const result = await worker.recognize(image, {}, { text: true, blocks: true, tsv: true });
  const blockWords = wordsFromBlocks(result.data.blocks, page);
  const words = blockWords.length ? blockWords : parseTsvWords(result.data.tsv, page);
  return {
    text: result.data.text || "",
    words,
    score: recognizedScore(result.data.text || "", words),
  };
}

async function recognizeHistoryImage(tesseract: typeof import("tesseract.js"), image: string, page: number) {
  const worker = await tesseract.createWorker("por+eng");
  try {
    const enhanced = await prepareImageForOcr(image);
    const attempts = [];
    for (const source of [image, enhanced]) {
      for (const mode of ["6", "11", "3"]) {
        attempts.push(await recognizeWithMode(worker, source, page, mode));
      }
    }
    const orderedAttempts = attempts.sort((a, b) => b.score - a.score);
    const best = orderedAttempts[0] ?? { text: "", words: [], score: 0 };
    const mergedText = Array.from(new Set(orderedAttempts.map((attempt) => attempt.text.trim()).filter(Boolean))).join("\n");
    return {
      text: mergedText || best.text,
      words: best.words,
    };
  } finally {
    await worker.terminate();
  }
}

async function readHistoryTextFromImages(front: string, back: string) {
  const tesseract: typeof import("tesseract.js") = await import("tesseract.js");
  const [frontResult, backResult] = await Promise.all([
    recognizeHistoryImage(tesseract, front, 1),
    recognizeHistoryImage(tesseract, back, 2),
  ]);
  return {
    text: `${frontResult.text}\n${backResult.text}`,
    words: [...frontResult.words, ...backResult.words],
  };
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

function createBlankNotes() {
  return matrixSeed.reduce<Record<string, Record<number, string>>>((acc, component) => {
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

function createHistory(school: School, schoolId = "", folder?: Folder | null): HistoryRecord {
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
    matriz: matrixSeed,
    notas: createBlankNotes(),
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
    observacoes: [""],
    localData: {
      municipio: school.municipio || defaultSchool.municipio,
      estado: school.estado || defaultSchool.estado,
      data: todayIsoDate(),
    },
  };
  return record;
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
    .replace(/\s+(?:DATA\s+DE\s+NASCIMENTO|NASCIMENTO|NASC|NACIONALIDADE|NATURALIDADE|IDENTIDADE|RG|CPF|SEXO|FILIA[CÇ][AÃ]O|NOME\s+DO\s+PAI|NOME\s+DA\s+MAE|PAI|MAE)\b.*$/i, "")
    .replace(/^[^A-Z0-9]+|[^A-Z0-9]+$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function findLabeledValue(lines: string[], labels: string[]) {
  const normalizedLines = lines.map(plain);
  for (let lineIndex = 0; lineIndex < normalizedLines.length; lineIndex += 1) {
    const normalized = normalizedLines[lineIndex];
    for (const label of labels) {
      const index = normalized.indexOf(label);
      if (index < 0) continue;
      const value = cleanOcrField(normalized.slice(index + label.length));
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
    const index = normalized.indexOf(normalizedLabel);
    if (index < 0) continue;
    const start = index + normalizedLabel.length;
    const stopIndexes = stopLabels
      .map((stop) => normalized.indexOf(plain(stop), start))
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

function explicitSchoolYearFromText(text: string) {
  const normalized = plain(text);
  const match = normalized.match(/\b([1-9])\s*(?:O|º|°)?\s*ANO\b/) || normalized.match(/\b([1-9])\s*(?:A|ª)?\s*SERIE\b/);
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

const componentAliases: Record<string, string[]> = {
  portugues: ["PORTUGUES", "LINGUA PORTUGUESA"],
  "portugues-ii": ["PORTUGUES II"],
  arte: ["ARTE"],
  "educacao-fisica": ["EDUCACAO FISICA"],
  ingles: ["INGLES", "L EST MODERNA"],
  historia: ["HISTORIA"],
  geografia: ["GEOGRAFIA"],
  religioso: ["RELIGIOSO"],
  ciencias: ["CIENCIAS"],
  matematica: ["MATEMATICA"],
  "matematica-ii": ["MATEMATICA II"],
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
  const tokens = componentAliases[component.id] ?? plain(component.nome).split(" ").filter((token) => token.length > 4);
  const index = lines.findIndex((line) => tokens.some((token) => line.includes(token)));
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
    return text.includes(normalizedLabel) || Boolean(labelCompact && compact.includes(labelCompact)) || Boolean(labelWords.length && labelWords.every((word) => text.includes(word)));
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
      if (slice === target || slice.includes(target) || target.includes(slice)) {
        const firstWord = rowWords[start];
        const lastWord = rowWords[Math.min(start + labelParts.length - 1, rowWords.length - 1)];
        return { start: firstWord.left, end: lastWord.left + lastWord.width };
      }
    }
    const lastLabelWordIndex = rowWords.findLastIndex((word) => {
      const compact = compactPlain(word.text);
      return labelParts.some((part) => compact.includes(part) || part.includes(compact));
    });
    if (lastLabelWordIndex >= 0) {
      const labelWords = rowWords.filter((word) => labelParts.some((part) => {
        const compact = compactPlain(word.text);
        return compact.includes(part) || part.includes(compact);
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
        const year = Number(current);
        if (year >= 1 && year <= 9 && (next.startsWith("ANO") || previous.startsWith("ANO"))) {
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
  const notas = { ...record.notas };
  const cargaHoraria = { ...record.cargaHoraria };
  const resultados = { ...record.resultados };

  for (const component of record.matriz) {
    const tokens = componentAliases[component.id] ?? plain(component.nome).split(" ").filter((token) => token.length > 4);
    const rowIndex = rows.findIndex((item) => tokens.some((token) => plain(item.text).includes(token)));
    const row = rowIndex >= 0 ? rows[rowIndex] : null;
    if (!row) continue;
    const sameRowValues = positionedValuesAfterLabel(row, tokens);
    const nextRowValues = !sameRowValues.length && rows[rowIndex + 1]
      ? positionedValuesAfterLabel(rows[rowIndex + 1], [])
      : [];
    const sourceRow = sameRowValues.length ? row : rows[rowIndex + 1];
    const assigned = sourceRow
      ? assignPositionedComponentValues(notas, component, sameRowValues.length ? sameRowValues : nextRowValues, sourceRow, columns)
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
    const positioned = positionedValuesAfterLabel(row, labels, maxNumber);
    if (columns.length) {
      positioned.forEach((item) => {
        const year = nearestYearForValue(item, columns, row.page);
        if (year) cargaHoraria[year] = { ...cargaHoraria[year], [key]: item.value };
      });
      return;
    }
    positioned.forEach((item, index) => {
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
      const labels = componentAliases[component.id] ?? [component.nome];
      if (!rowHasLabel(context, labels)) continue;
      const values = noteValuesFromText(textAfterFirstLabel(context, labels));
      if (!values.length) continue;
      notas[component.id] = { ...(notas[component.id] ?? {}) };
      if (explicitYear && explicitYear >= component.inicio && explicitYear <= component.fim) {
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
      const values = workloadValuesFromText(textAfterFirstLabel(context, labels), maxNumber);
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

function applyOcrTextToHistory(record: HistoryRecord, rawText: string, words: OcrWord[] = []): HistoryRecord {
  const lines = rawText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const normalizedLines = lines.map(plain);
  const normalizedText = normalizedLines.join("\n");
  const studentName =
    valueRightOfLabel(words, ["NOME DO ALUNO", "NOME DO A ALUNO A", "ALUNO", "NOME"], ["DATA DE NASCIMENTO", "NASCIMENTO", "NACIONALIDADE", "NATURALIDADE", "IDENTIDADE", "RG"]) ||
    findFieldValue(rawText, ["NOME DO ALUNO", "NOME DO A ALUNO A", "NOME DO(A) ALUNO(A)", "ALUNO"], ["DATA DE NASCIMENTO", "NASCIMENTO", "NACIONALIDADE", "NATURALIDADE", "IDENTIDADE", "RG", "FILIAÇÃO", "FILIACAO", "PAI", "MAE"]) ||
    findLabeledValue(lines, ["NOME DO ALUNO", "NOME DO(A) ALUNO(A)", "ALUNO", "NOME"]);
  const birthLine = normalizedLines.find((line) => line.includes("NASC")) || normalizedText;
  const birthDate = findFirstDate(valueRightOfLabel(words, ["DATA DE NASCIMENTO", "NASCIMENTO", "NASC"], ["NACIONALIDADE", "NATURALIDADE", "IDENTIDADE", "RG"]) || birthLine || "") || findBirthDate(rawText);
  const naturalidade = valueRightOfLabel(words, ["NATURALIDADE", "NATURAL DE"], ["IDENTIDADE", "RG", "NOME DO PAI", "PAI", "NOME DA MAE", "MAE"]) || findFieldValue(rawText, ["NATURALIDADE", "NATURAL DE"], ["IDENTIDADE", "RG", "NACIONALIDADE", "PAI", "MAE"]) || findLabeledValue(lines, ["NATURALIDADE", "NATURAL DE"]);
  const nacionalidade = valueRightOfLabel(words, ["NACIONALIDADE"], ["NATURALIDADE", "NATURAL DE", "IDENTIDADE", "RG"]) || findFieldValue(rawText, ["NACIONALIDADE"], ["NATURALIDADE", "NATURAL DE", "IDENTIDADE", "RG", "PAI", "MAE"]) || findLabeledValue(lines, ["NACIONALIDADE"]);
  const identidade = valueRightOfLabel(words, ["IDENTIDADE", "RG"], ["NOME DO PAI", "PAI", "NOME DA MAE", "MAE"]) || findFieldValue(rawText, ["IDENTIDADE", "RG"], ["NOME DO PAI", "NOME DA MAE", "PAI", "MAE", "FILIAÇÃO", "FILIACAO"]) || findLabeledValue(lines, ["IDENTIDADE", "RG"]);
  const father = valueRightOfLabel(words, ["NOME DO PAI", "PAI"], ["NOME DA MAE", "MAE", "DATA DE NASCIMENTO", "NASCIMENTO"]) || findFieldValue(rawText, ["NOME DO PAI", "PAI"], ["NOME DA MAE", "MAE", "DATA DE NASCIMENTO", "NASCIMENTO", "NACIONALIDADE", "NATURALIDADE"]) || findLabeledValue(lines, ["NOME DO PAI", "PAI"]);
  const mother = valueRightOfLabel(words, ["NOME DA MAE", "MAE"], ["DATA DE NASCIMENTO", "NASCIMENTO", "NACIONALIDADE", "NATURALIDADE"]) || findFieldValue(rawText, ["NOME DA MAE", "MAE"], ["DATA DE NASCIMENTO", "NASCIMENTO", "NACIONALIDADE", "NATURALIDADE", "IDENTIDADE", "RG"]) || findLabeledValue(lines, ["NOME DA MAE", "MAE"]);

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
    const labels = componentAliases[component.id] ?? [component.nome];
    const values = noteValuesFromText(textAfterFirstLabel(normalizedLines.slice(lineIndex, lineIndex + 2).join(" "), labels));
    if (!values.length) continue;
    const explicitYear = explicitSchoolYearFromText(normalizedLines.slice(lineIndex, lineIndex + 2).join(" "));
    if (explicitYear && explicitYear >= component.inicio && explicitYear <= component.fim) {
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
  const estudos = record.estudos.map((study, index) => ({
    ...study,
    ano: study.ano || schoolYears[index] || "",
  }));

  const [naturalidadeCidade, naturalidadeEstado = record.aluno.naturalidadeEstado] = naturalidade
    ? naturalidade.split(/[-/]/).map((part) => part.trim())
    : [record.aluno.naturalidadeCidade, record.aluno.naturalidadeEstado];

  return {
    ...record,
    aluno: {
      ...record.aluno,
      nome: studentName || record.aluno.nome,
      nascimento: birthDate || record.aluno.nascimento,
      nacionalidade: nacionalidade || record.aluno.nacionalidade,
      naturalidadeCidade: naturalidadeCidade || record.aluno.naturalidadeCidade,
      naturalidadeEstado: naturalidadeEstado || record.aluno.naturalidadeEstado,
      identidade: identidade || record.aluno.identidade,
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

function createAdminUser(input?: Partial<AdminUser>): AdminUser {
  return {
    id: input?.id || crypto.randomUUID(),
    nome: uppercaseInput(input?.nome?.trim() || ""),
    usuario: uppercaseInput(input?.usuario?.trim() || ""),
    senha: input?.senha?.trim() || "123456",
    crede: uppercaseInput(input?.crede?.trim() || "CREDE 20 - BREJO SANTO"),
    nivel: "gestao",
    ativo: input?.ativo ?? true,
    mustChangePassword: input?.mustChangePassword ?? !input?.id,
    createdAt: input?.createdAt || new Date().toISOString(),
  };
}

function createSchoolAccess(input?: Partial<SchoolAccess>): SchoolAccess {
  return {
    id: input?.id || crypto.randomUUID(),
    usuario: uppercaseInput(input?.usuario?.trim() || ""),
    senha: input?.senha?.trim() || "123456",
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
    mustChangePassword: input?.mustChangePassword ?? !input?.id,
    createdAt: input?.createdAt,
  });
  const accessos = input?.accessos?.length
    ? input.accessos.map((access, index) => createSchoolAccess({
        ...access,
        usuario: access.usuario || (index === 0 ? usuario : ""),
        senha: access.senha || (index === 0 ? input?.senha : "123456"),
      }))
    : [mainAccess];
  const primaryAccess = accessos[0] ?? mainAccess;
  return {
    id: input?.id || crypto.randomUUID(),
    usuario: primaryAccess.usuario,
    senha: primaryAccess.senha,
    tipo: input?.tipo || "municipal",
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

  return {
    ...source,
    schoolId: source.schoolId || fallbackSchoolId,
    folderId: record.folderId ?? "",
    anoLetivo: source.anoLetivo || folders.find((folder) => folder.id === record.folderId)?.anoLetivo || "",
    aluno: {
      ...studentDefaultsForSchool(defaultSchool),
      ...source.aluno,
      nacionalidade: uppercaseInput(source.aluno?.nacionalidade || "BRASILEIRA"),
      naturalidadeCidade: uppercaseInput(source.aluno?.naturalidadeCidade || defaultSchool.municipio),
      naturalidadeEstado: uppercaseInput(source.aluno?.naturalidadeEstado || defaultSchool.estado),
      pai: source.aluno?.paiNaoDeclarado ? "" : uppercaseInput(source.aluno?.pai || ""),
      paiNaoDeclarado: Boolean(source.aluno?.paiNaoDeclarado),
      mae: uppercaseInput(source.aluno?.mae || ""),
    },
    notasNegritoAnos,
    resultados,
    certificado,
    usarCarimboEscola: Boolean(source.usarCarimboEscola),
    usarAssinaturaDiretor: Boolean(source.usarAssinaturaDiretor),
    usarAssinaturaSecretario: Boolean(source.usarAssinaturaSecretario),
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
        return { ...component, ...saved, nome: component.nome, area: component.area };
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
    return { escola: defaultSchool, escolas: [], folders: [], historicos: [], transferencias: [], admin: null, adminUsers: [] };
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
        };
      }
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }
  return { escola: defaultSchool, escolas: [], folders: [], historicos: [], transferencias: [], admin: null, adminUsers: [] };
}

function loadAdminCredentials() {
  if (typeof window === "undefined") return null;
  const saved = window.localStorage.getItem(adminStorageKey);
  if (!saved) return null;
  try {
    const parsed = JSON.parse(saved) as AdminCredentials;
    return parsed.usuario && parsed.senha ? parsed : null;
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

function App() {
  const [data, setData] = useState<AppData>({ escola: defaultSchool, escolas: [], folders: [], historicos: [], transferencias: [], admin: null, adminUsers: [] });
  const [auth, setAuth] = useState<AuthSession | null>(null);
  const [adminCredentials, setAdminCredentials] = useState<AdminCredentials | null>(null);
  const [cloudHasAdmin, setCloudHasAdmin] = useState(false);
  const [activeId, setActiveId] = useState("");
  const [activeFolderId, setActiveFolderId] = useState("");
  const [folderDraft, setFolderDraft] = useState("");
  const [folderYearDraft, setFolderYearDraft] = useState(String(new Date().getFullYear()));
  const [folderTeachingDraft, setFolderTeachingDraft] = useState("ENSINO FUNDAMENTAL");
  const [view, setView] = useState<"historicos" | "editor" | "escola" | "turmas" | "alunos" | "novo" | "transferencias">("historicos");
  const [yearFilter, setYearFilter] = useState("");
  const [step, setStep] = useState(0);
  const [query, setQuery] = useState("");
  const [zoom, setZoom] = useState(0.42);
  const [page, setPage] = useState<1 | 2>(1);
  const [saveState, setSaveState] = useState("Salvo");
  const [duplicate, setDuplicate] = useState<HistoryRecord | null>(null);
  const [printBatch, setPrintBatch] = useState<HistoryRecord[] | null>(null);
  const [isReady, setIsReady] = useState(false);
  const saveTimer = useRef<number | null>(null);

  const currentSchoolAccount = auth?.role === "school"
    ? data.escolas.find((school) => school.id === auth.schoolId)
    : null;
  const currentAdminUser = auth?.role === "manager"
    ? (data.adminUsers ?? []).find((user) => user.id === auth.adminUserId)
    : null;
  const currentSchoolAccesses = currentSchoolAccount?.accessos?.length
    ? currentSchoolAccount.accessos
    : currentSchoolAccount
      ? [createSchoolAccess({ usuario: currentSchoolAccount.usuario, senha: currentSchoolAccount.senha, mustChangePassword: currentSchoolAccount.mustChangePassword })]
      : [];
  const currentSchoolAccess = currentSchoolAccesses.find((access) => access.id === auth?.accessId)
    ?? currentSchoolAccesses.find((access) => access.usuario === auth?.nome)
    ?? currentSchoolAccesses[0];
  const currentSchool = currentSchoolAccount?.escola ?? defaultSchool;
  const schoolProfileReady = currentSchoolAccount ? isSchoolProfileReady(currentSchool) : false;
  const schoolFolders = currentSchoolAccount
    ? data.folders.filter((folder) => folder.schoolId === currentSchoolAccount.id)
    : [];
  const schoolRecords = currentSchoolAccount
    ? data.historicos.filter((record) => record.schoolId === currentSchoolAccount.id)
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
        }
      }
      if (cancelled) return;
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
    if (!activeId && schoolRecords[0]) setActiveId(schoolRecords[0].id);
    if (!schoolFolders.length && !["escola", "turmas", "novo"].includes(view)) setView("historicos");
  }, [auth, currentSchoolAccount, schoolProfileReady, activeId, schoolRecords, schoolFolders.length, view]);

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
      void saveCloudState(cloudReadyData(data))
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
  }, [data, isReady]);

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
  });

  const updateSchool = (patch: Partial<School>) => {
    if (auth?.role !== "school" || !auth.schoolId) {
      window.alert("Entre com o login da escola para alterar os dados cadastrais.");
      return;
    }
    setData((current) => ({
      ...current,
      escolas: current.escolas.map((account) =>
        account.id === auth.schoolId ? { ...account, escola: { ...account.escola, ...patch } } : account,
      ),
    }));
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
      usuario: uppercaseInput(credentials.usuario.trim()),
      senha: credentials.senha.trim(),
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
        window.alert("Não foi possível criar o acesso restrito agora.");
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
      const session = { role: "owner" as const, nome: usuario };
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

  const changeAdminPassword = (currentPassword: string, nextPassword: string, confirmation: string) => {
    if (!adminCredentials) {
      window.alert("Acesso restrito nao localizado.");
      return false;
    }
    if (currentPassword.trim() !== adminCredentials.senha) {
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
    const nextAdmin = { ...adminCredentials, senha: cleanPassword };
    window.localStorage.setItem(adminStorageKey, JSON.stringify(nextAdmin));
    setAdminCredentials(nextAdmin);
    const nextData = { ...data, admin: nextAdmin };
    setData(nextData);
    void persistData(nextData, "Senha alterada");
    return true;
  };

  const changeManagerFirstPassword = (password: string) => {
    if (auth?.role !== "manager" || !auth.adminUserId) return;
    const cleanPassword = password.trim();
    if (cleanPassword.length < 6 || cleanPassword === "123456") {
      window.alert("Crie uma senha com pelo menos 6 caracteres e diferente da senha provisoria.");
      return;
    }
    const nextData = {
      ...data,
      adminUsers: (data.adminUsers ?? []).map((user) => user.id === auth.adminUserId
        ? { ...user, senha: cleanPassword, mustChangePassword: false }
        : user),
    };
    setData(nextData);
    void persistData(nextData, "Senha alterada");
  };

  const changeRestrictedOwnPassword = (currentPassword: string, nextPassword: string, confirmation: string) => {
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
    if (currentPassword.trim() !== user.senha) {
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

  const createRestrictedAccess = (input: AdminUser) => {
    if (auth?.role !== "owner") return;
    const clean = createAdminUser({ ...input, mustChangePassword: true });
    if (!clean.nome || !clean.usuario || !clean.senha) {
      window.alert("Informe nome, usuario e senha.");
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
  };

  const deleteRestrictedAccess = (id: string) => {
    if (auth?.role !== "owner") return;
    const user = (data.adminUsers ?? []).find((item) => item.id === id);
    const name = user?.nome || user?.usuario || "este acesso";
    if (!window.confirm(`Excluir o acesso de ${name}?`)) return;
    const nextData = { ...data, adminUsers: (data.adminUsers ?? []).filter((item) => item.id !== id) };
    setData(nextData);
    void persistData(nextData, "Acesso excluido");
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
        : [createSchoolAccess({ usuario: account.usuario, senha: account.senha, mustChangePassword: account.mustChangePassword })];
      return accessos.some((access) => access.usuario === usuario && access.senha === senha);
    });
    if (!school) {
      window.alert("Usuario, senha ou rede da escola incorretos.");
      return;
    }
    const schoolAccesses = school.accessos?.length
      ? school.accessos
      : [createSchoolAccess({ usuario: school.usuario, senha: school.senha, mustChangePassword: school.mustChangePassword })];
    const access = schoolAccesses.find((item) => item.usuario === usuario && item.senha === senha)
      ?? schoolAccesses[0]
      ?? createSchoolAccess({ usuario: school.usuario, senha: school.senha, mustChangePassword: school.mustChangePassword });
    const session = { role: "school" as const, nome: access.usuario, schoolId: school.id, accessId: access.id };
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
    const clean = createSchoolAccount({
      ...account,
      id: createdId,
      usuario: uppercaseInput(account.usuario.trim()),
      senha: account.senha.trim(),
      accessos: [
        createSchoolAccess({
          id: `${createdId}-principal`,
          usuario: account.usuario,
          senha: account.senha,
          mustChangePassword: true,
        }),
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
  };

  const updateSchoolAccountFromAdmin = (id: string, patch: Partial<SchoolAccount> & { escola?: Partial<School> }) => {
    const nextSchools = data.escolas.map((account) => {
      if (account.id !== id) return account;
      const patchedAccessos = patch.accessos
        ? patch.accessos.map(createSchoolAccess).filter((access) => access.usuario)
        : account.accessos;
      const accessos = patchedAccessos.length ? patchedAccessos : account.accessos;
      const primaryAccess = accessos[0] ?? createSchoolAccess({ usuario: account.usuario, senha: account.senha, mustChangePassword: account.mustChangePassword });
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
  };

  const changeFirstPassword = (password: string) => {
    if (auth?.role !== "school" || !auth.schoolId) return;
    const cleanPassword = password.trim();
    if (cleanPassword.length < 6 || cleanPassword === "123456") {
      window.alert("Crie uma senha com pelo menos 6 caracteres e diferente da senha provisoria.");
      return;
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
  };

  const persistData = async (nextData = data, successMessage = "Dados salvos") => {
    window.localStorage.setItem(storageKey, JSON.stringify(nextData));
    if (!firebaseEnabled) { setSaveState("Salvo"); return false; }
    try {
      const stateSaved = await saveCloudState(cloudReadyData(nextData));
      const historiesSaved = await saveCloudHistories(nextData.historicos.map(cloudReadyHistory));
      if (!stateSaved || !historiesSaved) throw new Error("Falha ao salvar no banco.");
      setSaveState(successMessage);
      return true;
    }
    catch (error) { console.error("Falha ao salvar.", error); setSaveState(saveFailureState(error)); return false; }
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
    let saved = await persistData(nextData, "Salvando histórico...");
    if (saved && history) {
      try {
        const { fotosHistorico: _photos, ...cloudHistory } = history;
        const historySaved = await saveCloudHistory(id, cloudHistory);
        if (!historySaved) throw new Error("Falha ao salvar o histórico.");
        setSaveState("Histórico salvo");
      } catch (error) {
        console.error("Falha ao salvar o histórico.", error);
        setSaveState("Não foi possível salvar o histórico");
        saved = false;
      }
    }
    if (saved && generatePdf) savePdfForRecord(id);
    if (saved && !generatePdf) {
      window.alert("Histórico salvo com sucesso.");
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
    window.alert("Histórico enviado para a escola solicitante.");
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
    window.alert("Histórico recebido e salvo na turma escolhida.");
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
    const history = createHistory(currentSchool, currentSchoolAccount.id, folder);
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

  const createFolder = () => {
    if (!requireSchoolProfile()) return;
    if (!currentSchoolAccount) return;
    const nome = folderDraft.trim();
    const anoLetivo = folderYearDraft.trim();
    if (!nome || !anoLetivo) return;
    const existing = schoolFolders.find((folder) => upper(folder.nome) === upper(nome) && folder.anoLetivo === anoLetivo);
    if (existing) {
      setActiveFolderId(existing.id);
      setFolderDraft("");
      setView("historicos");
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
    setView("historicos");
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
    const next = createHistory(currentSchool, currentSchoolAccount.id, folder);
    setData((current) => ({ ...current, historicos: [next, ...current.historicos] }));
    setActiveId(next.id);
    setDuplicate(null);
    setView("editor");
    setStep(0);
  };

  const createHistoryFromPhotos = (photos: PhotoHistoryPayload) => {
    if (!requireSchoolProfile()) return;
    if (!currentSchoolAccount) return;
    const folder = schoolFolders.find((item) => item.id === activeFolderId);
    if (!folder) {
      window.alert("Selecione primeiro a turma e o ano letivo.");
      return;
    }
    const blank = createHistory(currentSchool, currentSchoolAccount.id, folder);
    const recognized = photos.record ?? applyOcrTextToHistory(blank, photos.texto, photos.palavras ?? []);
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
  };

  const deleteRecord = (id: string) => {
    setData((current) => {
      const next = current.historicos.filter((record) => record.id !== id);
      if (activeId === id) setActiveId(next.find((record) => record.schoolId === auth?.schoolId)?.id ?? "");
      return { ...current, historicos: next };
    });
    void deleteCloudHistory(id).catch((error) => console.error("Falha ao remover o histórico.", error));
  };

  const printRecord = (id: string) => {
    const record = data.historicos.find((item) => item.id === id);
    setPrintBatch(null);
    setActiveId(id);
    setView("editor");
    setPage(1);
    window.setTimeout(() => printWithTitle(record?.aluno.nome || record?.codigo || "HISTORICO"), 80);
  };

  const savePdfForRecord = (id: string) => {
    const record = data.historicos.find((item) => item.id === id);
    const pdfTitle = record?.aluno.nome || record?.codigo || "HISTORICO";
    setData((current) => ({
      ...current,
      historicos: current.historicos.map((record) =>
        record.id === id ? { ...record, status: "Emitido", updatedAt: new Date().toISOString() } : record,
      ),
    }));
    if (active?.id === id && view === "editor") {
      printWithTitle(pdfTitle);
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
    window.setTimeout(() => printWithTitle(folder ? `${folder.anoLetivo} ${folder.nome}` : "TODOS OS HISTORICOS"), 120);
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
    const folderName = safeFileName(folder ? `${folder.anoLetivo}-${folder.nome}` : "TODOS OS HISTORICOS");
    const files = [
      { path: `${folderName}/dados-da-pasta.json`, content: JSON.stringify(payload, null, 2) },
      ...recordsToExport.map((record) => ({
        path: `${folderName}/alunos/${safeFileName(record.aluno.nome || record.codigo)}.json`,
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
    const folderName = safeFileName(folder ? `${folder.anoLetivo}-${folder.nome}` : "TODOS OS HISTORICOS");
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
      await writeTextFile(directory, [folderName, "dados-da-pasta.json"], JSON.stringify(payload, null, 2));
      for (const record of recordsToExport) {
        await writeTextFile(
          directory,
          [folderName, "alunos", `${safeFileName(record.aluno.nome || record.codigo)}.json`],
          payloadForRecord(record),
        );
      }
      setSaveState(`Pasta salva: ${folderName}`);
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
      />
    );
  }

  if (currentAdminUser?.mustChangePassword) {
    return <FirstAccessPassword schoolName={currentAdminUser.nome || currentAdminUser.usuario} onSave={changeManagerFirstPassword} onLogout={logout} />;
  }

  if (auth.role === "owner" || auth.role === "manager") {
    return (
      <OwnerDashboard
        schools={data.escolas}
        folders={data.folders}
        histories={data.historicos}
        adminUsers={data.adminUsers ?? []}
        schoolDirectory={schoolDirectory}
        accessRole={auth.role}
        accessName={auth.nome}
        saveState={saveState}
        onCreateSchool={createSchoolAccountFromAdmin}
        onUpdateSchool={updateSchoolAccountFromAdmin}
        onChangeOwnPassword={changeRestrictedOwnPassword}
        onCreateRestrictedAccess={createRestrictedAccess}
        onUpdateRestrictedAccess={updateRestrictedAccess}
        onDeleteRestrictedAccess={deleteRestrictedAccess}
        onLogout={logout}
      />
    );
  }

  if (currentSchoolAccess?.mustChangePassword) {
    return <FirstAccessPassword schoolName={currentSchool.nome} onSave={changeFirstPassword} onLogout={logout} />;
  }

  return (
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
          <strong>{auth.nome}</strong>
          <span>{upper(currentSchool.nome)}<br />{currentSchoolAccount?.tipo === "estadual" ? "Escola estadual" : "Escola municipal"}</span>
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

        {view === "escola" && <SchoolSettings school={currentSchool} schoolDirectory={schoolDirectory} updateSchool={updateSchool} onSave={() => void persistData(data, "Dados da escola salvos")} />}

        {schoolProfileReady && view === "editor" && active && (
          <div className="editor-grid">
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
                updateSchool={updateSchool}
                schoolDirectory={schoolDirectory}
                setStep={setStep}
                finishHistory={finishHistory}
              />
            </section>

            <section className="preview-pane">
              <div className="preview-toolbar">
                <div className="segmented">
                  <button className={page === 1 ? "selected" : ""} onClick={() => setPage(1)}>Pagina 1</button>
                  <button className={page === 2 ? "selected" : ""} onClick={() => setPage(2)}>Pagina 2</button>
                </div>
                <div className="zoom-control">
                  <button onClick={() => setZoom((z) => Math.max(0.32, z - 0.08))}>-</button>
                  <span>{Math.round(zoom * 100)}%</span>
                  <button onClick={() => setZoom((z) => Math.min(0.9, z + 0.08))}>+</button>
                </div>
              </div>
              <div className="paper-stage">
                <div className="paper-scale" style={{ width: `${794 * zoom}px`, minHeight: `${1123 * zoom}px`, transform: `scale(${zoom})` }}>
                  {page === 1 ? <DocumentPageOne record={active} school={currentSchool} /> : <DocumentPageTwo record={active} school={currentSchool} />}
                </div>
              </div>
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
}: {
  hasAdmin: boolean;
  onCreateAdmin: (credentials: AdminCredentials) => void;
  onLoginAdmin: (credentials: AdminCredentials) => void;
  onLoginSchool: (credentials: SchoolLoginCredentials) => void;
}) {
  const [adminUser, setAdminUser] = useState("ADMIN");
  const [adminPassword, setAdminPassword] = useState("");
  const [schoolUser, setSchoolUser] = useState("");
  const [schoolPassword, setSchoolPassword] = useState("");
  const [schoolKind, setSchoolKind] = useState<SchoolKind>("municipal");

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
          <form
            onSubmit={(event) => {
              event.preventDefault();
              onLoginSchool({ usuario: schoolUser, senha: schoolPassword, tipo: schoolKind });
            }}
          >
            <div className="login-heading"><span>Login</span><h2>Acesso da escola</h2></div>
            <div className="school-kind login-school-kind">
              <span>Rede da escola</span>
              <label>
                <input type="checkbox" checked={schoolKind === "municipal"} onChange={() => setSchoolKind("municipal")} />
                Municipal
              </label>
              <label>
                <input type="checkbox" checked={schoolKind === "estadual"} onChange={() => setSchoolKind("estadual")} />
                Estadual
              </label>
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
          </form>

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

function FirstAccessPassword({ schoolName, onSave, onLogout }: { schoolName: string; onSave: (password: string) => void; onLogout: () => void }) {
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
        <form onSubmit={(event) => { event.preventDefault(); if (password !== confirmation) { window.alert("As senhas nao conferem."); return; } onSave(password); }}>
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
  schoolDirectory,
  accessRole,
  accessName,
  saveState,
  onCreateSchool,
  onUpdateSchool,
  onChangeOwnPassword,
  onCreateRestrictedAccess,
  onUpdateRestrictedAccess,
  onDeleteRestrictedAccess,
  onLogout,
}: {
  schools: SchoolAccount[];
  folders: Folder[];
  histories: HistoryRecord[];
  adminUsers: AdminUser[];
  schoolDirectory: SchoolDirectoryItem[];
  accessRole: "owner" | "manager";
  accessName: string;
  saveState: string;
  onCreateSchool: (account: SchoolAccount) => void;
  onUpdateSchool: (id: string, patch: Partial<SchoolAccount> & { escola?: Partial<School> }) => void;
  onChangeOwnPassword: (currentPassword: string, nextPassword: string, confirmation: string) => boolean;
  onCreateRestrictedAccess: (input: AdminUser) => boolean | void;
  onUpdateRestrictedAccess: (id: string, patch: Partial<AdminUser>) => void;
  onDeleteRestrictedAccess: (id: string) => void;
  onLogout: () => void;
}) {
  const [adminView, setAdminView] = useState<"overview" | "schools" | "access" | "password">("overview");
  const [draft, setDraft] = useState(() => createSchoolAccount({
    usuario: "",
    senha: "123456",
    tipo: "municipal",
    escola: { ...emptySchool },
  }));
  const [accessDrafts, setAccessDrafts] = useState<Record<string, string>>({});
  const [passwordDraft, setPasswordDraft] = useState({ atual: "", nova: "", confirmar: "" });
  const [restrictedDraft, setRestrictedDraft] = useState(() => createAdminUser({ senha: "123456" }));
  const [schoolSearch, setSchoolSearch] = useState("");
  const canManageRestricted = accessRole === "owner";
  const activeSchools = schools.filter((account) => account.ativo !== false);
  const inactiveSchools = schools.filter((account) => account.ativo === false);
  const completedSchools = schools.filter((account) => isSchoolProfileReady(account.escola));
  const municipalCount = schools.filter((account) => account.tipo === "municipal").length;
  const estadualCount = schools.filter((account) => account.tipo === "estadual").length;
  const accessCount = schools.reduce((total, account) => total + account.accessos.length, 0);
  const activeManagers = adminUsers.filter((user) => user.ativo).length;
  const schoolNeedle = schoolSearch.trim().toLocaleLowerCase("pt-BR");
  const filteredSchools = schools.filter((account) => {
    if (!schoolNeedle) return true;
    const searchable = [
      account.escola.nome,
      account.escola.codigo,
      account.escola.municipio,
      account.escola.estado,
      account.tipo === "estadual" ? "estadual" : "municipal",
      account.ativo === false ? "inativa bloqueada" : "ativa liberada",
      ...account.accessos.map((access) => access.usuario),
    ].join(" ").toLocaleLowerCase("pt-BR");
    return searchable.includes(schoolNeedle);
  });

  const updateDraftSchool = (patch: Partial<School>) => {
    setDraft((current) => ({ ...current, escola: { ...current.escola, ...patch } }));
  };

  const updateAccess = (account: SchoolAccount, accessId: string, patch: Partial<SchoolAccess>) => {
    onUpdateSchool(account.id, {
      accessos: account.accessos.map((access) => access.id === accessId ? { ...access, ...patch } : access),
    });
  };

  const addAccess = (account: SchoolAccount) => {
    const usuario = uppercaseInput((accessDrafts[account.id] || "").trim());
    if (!usuario) {
      window.alert("Informe o usuario do acesso.");
      return;
    }
    onUpdateSchool(account.id, {
      accessos: [...account.accessos, createSchoolAccess({ usuario, senha: "123456", mustChangePassword: true })],
    });
    setAccessDrafts((current) => ({ ...current, [account.id]: "" }));
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
        {canManageRestricted && (
          <button className={adminView === "access" ? "nav active" : "nav"} onClick={() => setAdminView("access")}><span className="nav-icon">◈</span> Acessos</button>
        )}
        <div className="firebase-note">
          <strong>{upper(accessName)}</strong>
          <span>{canManageRestricted ? "Controle principal" : "Gestão educacional"}</span>
          <button type="button" onClick={() => setAdminView("password")}>Minha senha</button>
          <button type="button" onClick={onLogout}>Sair</button>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p>Painel restrito</p>
            <h1>{adminView === "overview" ? "Visão geral" : adminView === "access" ? "Acessos do sistema" : adminView === "password" ? "Minha senha" : "Gestão de escolas"}</h1>
          </div>
          <span className="save-state">{saveState === "Salvo" ? "OK Salvo" : saveState}</span>
        </header>

        {adminView === "overview" && (
          <section className="overview-screen">
            <div className="overview-cards">
              <article><span>Escolas cadastradas</span><strong>{schools.length}</strong></article>
              <article><span>Municipais</span><strong>{municipalCount}</strong></article>
              <article><span>Estaduais</span><strong>{estadualCount}</strong></article>
              <article><span>Acessos das escolas</span><strong>{accessCount}</strong></article>
              <article><span>Escolas ativas</span><strong>{activeSchools.length}</strong></article>
              <article><span>Escolas inativas</span><strong>{inactiveSchools.length}</strong></article>
              <article><span>Cadastros completos</span><strong>{completedSchools.length}</strong></article>
              <article><span>Responsáveis</span><strong>{adminUsers.length}</strong></article>
              <article><span>Responsáveis ativos</span><strong>{activeManagers}</strong></article>
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
                        <td>{account.tipo === "estadual" ? "Estadual" : "Municipal"}</td>
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
                    <th>CREDE</th>
                  </tr>
                </thead>
                <tbody>
                  {adminUsers.map((user) => (
                    <tr key={user.id}>
                      <td><span className={user.ativo ? "status-pill active" : "status-pill inactive"}><i />{user.ativo ? "Ativo" : "Bloqueado"}</span></td>
                      <td>{upper(user.nome) || "-"}</td>
                      <td>{upper(user.usuario) || "-"}</td>
                      <td>{upper(user.crede) || "-"}</td>
                    </tr>
                  ))}
                  {!adminUsers.length && (
                    <tr>
                      <td colSpan={4}>Nenhum responsável cadastrado ainda.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>
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
              const changed = onChangeOwnPassword(passwordDraft.atual, passwordDraft.nova, passwordDraft.confirmar);
              if (changed) setPasswordDraft({ atual: "", nova: "", confirmar: "" });
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
                  <td colSpan={5}>Nenhum responsável cadastrado ainda.</td>
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
              <input value={draft.usuario} onChange={(event) => setDraft((current) => ({ ...current, usuario: uppercaseInput(event.target.value) }))} />
            </label>
            <label>
              <span>Senha provisória</span>
              <input value="123456" readOnly aria-label="Senha provisoria padrao" />
            </label>
            <div className="school-kind">
              <span>Rede da escola</span>
              <label>
                <input type="checkbox" checked={draft.tipo === "municipal"} onChange={() => setDraft((current) => ({ ...current, tipo: "municipal" }))} />
                Municipal
              </label>
              <label>
                <input type="checkbox" checked={draft.tipo === "estadual"} onChange={() => setDraft((current) => ({ ...current, tipo: "estadual" }))} />
                Estadual
              </label>
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
                      <option value="municipal">Municipal</option>
                      <option value="estadual">Estadual</option>
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
                          value={accessDrafts[account.id] || ""}
                          placeholder="NOVO USUARIO"
                          onChange={(event) => setAccessDrafts((current) => ({ ...current, [account.id]: uppercaseInput(event.target.value) }))}
                        />
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
  activeFolderId,
  setActiveFolderId,
  createByTyping,
  createFromPhotos,
  openClasses,
}: {
  school: School;
  schoolId: string;
  folders: Folder[];
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
  createFolder: () => void;
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
      <button className="primary" onClick={createFolder}>Criar turma</button>

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
  });

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
  activeFolderId,
  setActiveFolderId,
  createFromPhotos,
  backToChoice,
}: {
  school: School;
  schoolId: string;
  folders: Folder[];
  activeFolderId: string;
  setActiveFolderId: (value: string) => void;
  createFromPhotos: (photos: PhotoHistoryPayload) => void;
  backToChoice: () => void;
}) {
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [ocrState, setOcrState] = useState("");
  const [rawText, setRawText] = useState("");
  const [ocrWords, setOcrWords] = useState<OcrWord[]>([]);
  const [draft, setDraft] = useState<HistoryRecord | null>(null);
  const selectedFolder = folders.find((folder) => folder.id === activeFolderId) ?? null;
  const createBlankDraft = () => createHistory(school, schoolId, selectedFolder);

  const readPhoto = async (side: "front" | "back", file?: File) => {
    const image = await imageFileToOcrPng(file);
    if (!image) return;
    if (side === "front") setFront(image);
    else setBack(image);
  };

  const fillFromImages = async () => {
    if (!front || !back) return;
    try {
      setOcrState("Lendo frente e verso...");
      const result = await readHistoryTextFromImages(front, back);
      setRawText(result.text);
      setOcrWords(result.words);
      setDraft(applyOcrTextToHistory(createBlankDraft(), result.text, result.words));
      setOcrState("Confira os campos lidos antes de aplicar");
    } catch {
      setOcrState("");
      window.alert("Nao consegui ler a imagem automaticamente. Tente uma foto mais nitida, reta e bem iluminada.");
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

  return (
    <section className="settings-screen photo-import">
      <div className="panel-heading">
        <h2>Foto do historico</h2>
        <p>Envie frente e verso para criar o historico na turma selecionada.</p>
      </div>
      <div className="settings-grid">
        <label className="wide">
          <span>Turma / ano</span>
          <select value={activeFolderId} onChange={(event) => setActiveFolderId(event.target.value)}>
            <option value="">Selecione</option>
            {folders.map((folder) => <option key={folder.id} value={folder.id}>{folderTitle(folder)} - {folder.tipoEnsino}</option>)}
          </select>
        </label>
        <label className="photo-drop">
          <span>Frente</span>
          <input type="file" accept="image/*" capture="environment" onChange={(event) => readPhoto("front", event.target.files?.[0])} />
          {front && <img src={front} alt="" />}
        </label>
        <label className="photo-drop">
          <span>Verso</span>
          <input type="file" accept="image/*" capture="environment" onChange={(event) => readPhoto("back", event.target.files?.[0])} />
          {back && <img src={back} alt="" />}
        </label>
      </div>
      <div className="inline-actions">
        <button onClick={backToChoice}>Voltar</button>
        <button
          className="primary"
          disabled={!activeFolderId || !front || !back}
          onClick={fillFromImages}
        >
          Digitalizar imagem
        </button>
        {ocrState && <span className="save-state">{ocrState}</span>}
      </div>
      {draft && (
        <section className="ocr-review">
          <div className="panel-heading">
            <h2>Conferir digitalizacao</h2>
            <p>Corrija somente o que a leitura pegou errado. Depois aplique no nosso modelo.</p>
          </div>
          <div className="form-grid">
            <Field label="Nome completo" value={draft.aluno.nome} onChange={(value) => updateDraftStudent({ nome: value })} wide />
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
            <Field label="Identidade" value={draft.aluno.identidade} onChange={(value) => updateDraftStudent({ identidade: value })} />
            <Field label="Nome do pai" value={draft.aluno.pai} onChange={(value) => updateDraftStudent({ pai: value })} />
            <Field label="Nome da mae" value={draft.aluno.mae} onChange={(value) => updateDraftStudent({ mae: value })} />
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
                      <td key={year}><input inputMode="decimal" title="Use nota de 0 a 10,0" value={draft.notas[component.id]?.[year] ?? ""} onChange={(event) => updateDraftNote(component.id, year, event.target.value)} onBlur={(event) => finishDraftNote(component.id, year, event.target.value)} /></td>
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
          <label className="wide">
            <span>Texto lido da imagem</span>
            <textarea value={rawText} onChange={(event) => setRawText(event.target.value)} />
          </label>
          <div className="inline-actions">
            <button onClick={() => setDraft(applyOcrTextToHistory(createBlankDraft(), rawText, ocrWords))}>Refazer leitura pelos campos</button>
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

function SchoolSettings({ school, schoolDirectory, updateSchool, onSave }: { school: School; schoolDirectory: SchoolDirectoryItem[]; updateSchool: (patch: Partial<School>) => void; onSave: () => void }) {
  const uploadSchoolImage = async (key: "logoSistema" | "logo" | "carimboEscola" | "assinaturaDiretor" | "assinaturaSecretario", file?: File) => {
    const image = await imageFileToTransparentPng(file);
    if (!image) return;
    updateSchool({ [key]: image });
  };
  const makeSchoolImageTransparent = async (key: "logoSistema" | "logo" | "carimboEscola" | "assinaturaDiretor" | "assinaturaSecretario", value: string) => {
    updateSchool({ [key]: await removeLightBackground(value) });
  };
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
        <label className="wide signature-upload">
          <span>Logomarca do sistema</span>
          <input value={school.logoSistema} onChange={(event) => updateSchool({ logoSistema: event.target.value })} placeholder="URL da imagem ou deixe vazio" />
          <input type="file" accept="image/*" onChange={(event) => uploadSchoolImage("logoSistema", event.target.files?.[0])} />
          {school.logoSistema && (
            <div>
              <img src={school.logoSistema} alt="" />
              <button type="button" onClick={() => makeSchoolImageTransparent("logoSistema", school.logoSistema)}>Remover fundo</button>
              <button type="button" onClick={() => updateSchool({ logoSistema: "" })}>Remover</button>
            </div>
          )}
        </label>
        <label className="wide signature-upload">
          <span>Brasao/logomarca do historico</span>
          <input value={school.logo} onChange={(event) => updateSchool({ logo: event.target.value })} placeholder="URL da imagem ou deixe vazio" />
          <input type="file" accept="image/*" onChange={(event) => uploadSchoolImage("logo", event.target.files?.[0])} />
          {school.logo && (
            <div>
              <img src={school.logo} alt="" />
              <button type="button" onClick={() => makeSchoolImageTransparent("logo", school.logo)}>Remover fundo</button>
              <button type="button" onClick={() => updateSchool({ logo: "" })}>Remover</button>
            </div>
          )}
        </label>
        <label className="wide signature-upload">
          <span>Carimbo da escola no cabeçalho</span>
          <input type="file" accept="image/*" onChange={(event) => uploadSchoolImage("carimboEscola", event.target.files?.[0])} />
          {school.carimboEscola && (
            <div>
              <img src={school.carimboEscola} alt="" />
              <button type="button" onClick={() => makeSchoolImageTransparent("carimboEscola", school.carimboEscola)}>Remover fundo</button>
              <button type="button" onClick={() => updateSchool({ carimboEscola: "" })}>Remover</button>
            </div>
          )}
        </label>
        <label className="wide signature-upload">
          <span>Carimbo/assinatura da diretora</span>
          <input type="file" accept="image/*" onChange={(event) => uploadSchoolImage("assinaturaDiretor", event.target.files?.[0])} />
          {school.assinaturaDiretor && (
            <div>
              <img src={school.assinaturaDiretor} alt="" />
              <button type="button" onClick={() => makeSchoolImageTransparent("assinaturaDiretor", school.assinaturaDiretor)}>Remover fundo</button>
              <button type="button" onClick={() => updateSchool({ assinaturaDiretor: "" })}>Remover</button>
            </div>
          )}
        </label>
        <label className="wide signature-upload">
          <span>Carimbo/assinatura da secretaria</span>
          <input type="file" accept="image/*" onChange={(event) => uploadSchoolImage("assinaturaSecretario", event.target.files?.[0])} />
          {school.assinaturaSecretario && (
            <div>
              <img src={school.assinaturaSecretario} alt="" />
              <button type="button" onClick={() => makeSchoolImageTransparent("assinaturaSecretario", school.assinaturaSecretario)}>Remover fundo</button>
              <button type="button" onClick={() => updateSchool({ assinaturaSecretario: "" })}>Remover</button>
            </div>
          )}
        </label>
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
  updateSchool,
  schoolDirectory,
  setStep,
  finishHistory,
}: {
  record: HistoryRecord;
  school: School;
  step: number;
  updateActive: (updater: (record: HistoryRecord) => HistoryRecord) => void;
  updateSchool: (patch: Partial<School>) => void;
  schoolDirectory: SchoolDirectoryItem[];
  setStep: (step: number) => void;
  finishHistory: (id: string, generatePdf?: boolean) => Promise<void>;
}) {
  const updateStudent = (patch: Partial<Student>) => updateActive((item) => ({ ...item, aluno: { ...item.aluno, ...patch } }));
  const updateLegal = (patch: Partial<SchoolLegal>) => updateActive((item) => ({ ...item, dadosLegais: { ...item.dadosLegais, ...patch } }));

  return (
    <section className="step-card">
      {step === 0 && (
        <>
          <h2>Identificacao do Aluno</h2>
          <div className="form-grid">
            <Field label="Nome completo" value={record.aluno.nome} onChange={(value) => updateStudent({ nome: value })} wide />
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
            <Field label="Identidade" value={record.aluno.identidade} onChange={(value) => updateStudent({ identidade: value })} />
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
      {step === 5 && <CertificateForm record={record} school={school} updateActive={updateActive} updateSchool={updateSchool} />}
      {step === 6 && (
        <Conference
          record={record}
          setStep={setStep}
          finishHistory={finishHistory}
        />
      )}

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
      <div className="matrix-editor" ref={tableRef}>
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
                        inputMode="decimal"
                        title="Use nota de 0 a 10,0"
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
  updateSchool,
}: {
  record: HistoryRecord;
  school: School;
  updateActive: (updater: (record: HistoryRecord) => HistoryRecord) => void;
  updateSchool: (patch: Partial<School>) => void;
}) {
  const updateCertificate = (patch: Partial<Certificate>) => {
    updateActive((item) => ({ ...item, certificado: { ...item.certificado, ...patch } }));
  };
  const uploadSignature = async (key: "assinaturaDiretor" | "assinaturaSecretario", file?: File) => {
    const image = await imageFileToTransparentPng(file);
    if (!image) return;
    updateSchool({ [key]: image });
  };
  const makeSignatureTransparent = async (key: "assinaturaDiretor" | "assinaturaSecretario", value: string) => {
    updateSchool({ [key]: await removeLightBackground(value) });
  };
  return (
    <>
      <h2>Certificado e Observacoes</h2>
      <label className="checkbox-line certificate-toggle">
        <input
          type="checkbox"
          checked={record.usarCarimboEscola}
          disabled={!school.carimboEscola}
          onChange={(event) => updateActive((item) => ({ ...item, usarCarimboEscola: event.target.checked }))}
        />
        <span>Usar carimbo da escola no cabeçalho</span>
      </label>
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
      <h3>Carimbo / assinatura</h3>
      <div className="form-grid">
        <label className="wide signature-upload">
          <span>Carimbo/assinatura da diretora</span>
          <input type="file" accept="image/*" onChange={(event) => uploadSignature("assinaturaDiretor", event.target.files?.[0])} />
          <label className="checkbox-line stamp-toggle">
            <input
              type="checkbox"
              checked={record.usarAssinaturaDiretor}
              disabled={!school.assinaturaDiretor}
              onChange={(event) => updateActive((item) => ({ ...item, usarAssinaturaDiretor: event.target.checked }))}
            />
            Usar carimbo/assinatura da diretora neste historico
          </label>
          {school.assinaturaDiretor && (
            <div>
              <img src={school.assinaturaDiretor} alt="" />
              <button type="button" onClick={() => makeSignatureTransparent("assinaturaDiretor", school.assinaturaDiretor)}>Remover fundo</button>
              <button type="button" onClick={() => updateSchool({ assinaturaDiretor: "" })}>Remover</button>
            </div>
          )}
        </label>
        <label className="wide signature-upload">
          <span>Carimbo/assinatura da secretaria</span>
          <input type="file" accept="image/*" onChange={(event) => uploadSignature("assinaturaSecretario", event.target.files?.[0])} />
          <label className="checkbox-line stamp-toggle">
            <input
              type="checkbox"
              checked={record.usarAssinaturaSecretario}
              disabled={!school.assinaturaSecretario}
              onChange={(event) => updateActive((item) => ({ ...item, usarAssinaturaSecretario: event.target.checked }))}
            />
            Usar carimbo/assinatura da secretaria neste historico
          </label>
          {school.assinaturaSecretario && (
            <div>
              <img src={school.assinaturaSecretario} alt="" />
              <button type="button" onClick={() => makeSignatureTransparent("assinaturaSecretario", school.assinaturaSecretario)}>Remover fundo</button>
              <button type="button" onClick={() => updateSchool({ assinaturaSecretario: "" })}>Remover</button>
            </div>
          )}
        </label>
      </div>
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
}: {
  record: HistoryRecord;
  setStep: (step: number) => void;
  finishHistory: (id: string, generatePdf?: boolean) => Promise<void>;
}) {
  const issues = useMemo(() => {
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
  }, [record]);

  return (
    <>
      <h2>Conferir Historico</h2>
      <div className="conference">
        <p className="ok">OK Dados da escola carregados</p>
        <p className="ok">OK Previa montada automaticamente</p>
        <p className="ok">OK Calculo de frequencia aplicado</p>
        {issues.length === 0 ? (
          <p className="ok">OK Historico pronto para emissao</p>
        ) : (
          issues.map((issue) => (
            <button key={issue.label} className="warning" onClick={() => setStep(issue.step)}>
              Atencao: {issue.label}
            </button>
          ))
        )}
      </div>
      <div className="inline-actions"><button className="primary" onClick={() => void finishHistory(record.id)}>Salvar histórico</button></div>
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

function Watermark() {
  return <img className="watermark-image" src="/model-assets/image2.png" alt="" />;
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

  return (
    <article className="paper document-page vector-page page-one current-model">
      <Watermark />
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
          <span>{upper(record.aluno.identidade)}</span>
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
      <Watermark />

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

      <section className="current-observations">
        <h2>OBSERVAÇÕES:</h2>
        <div>
          {record.observacoes.filter(Boolean).map((obs, index) => (
            <p key={`obs-${index}`}>{upper(obs)}</p>
          ))}
        </div>
      </section>

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
