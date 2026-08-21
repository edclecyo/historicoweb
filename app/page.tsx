"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";

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

type SchoolAccount = {
  id: string;
  usuario: string;
  senha: string;
  tipo: SchoolKind;
  escola: School;
  createdAt: string;
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

type AppData = {
  escola: School;
  escolas: SchoolAccount[];
  folders: Folder[];
  historicos: HistoryRecord[];
};

type AuthRole = "owner" | "school";

type AuthSession = {
  role: AuthRole;
  nome: string;
  schoolId?: string;
};

type AdminCredentials = {
  usuario: string;
  senha: string;
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
  logo: "/model-assets/image1.jpeg",
  carimboEscola: "",
  diretor: "",
  registroDiretor: "",
  assinaturaDiretor: "",
  secretario: "",
  registroSecretario: "",
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

function safeFileName(value: string) {
  return (upper(value).trim() || "HISTORICOS")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLocaleLowerCase("pt-BR");
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
      credenciamento: school.credenciamento,
      autorizacao: school.autorizacao,
      reconhecimento: school.reconhecimento,
      parecer: school.parecer,
      validade: school.validade,
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

function createSchoolAccount(input?: Partial<SchoolAccount> & { escola?: Partial<School> }): SchoolAccount {
  const escola = { ...defaultSchool, ...(input?.escola ?? {}) };
  const usuario = input && "usuario" in input
    ? input.usuario ?? ""
    : safeFileName(escola.nome || "ESCOLA").replace(/-/g, "");
  return {
    id: input?.id || crypto.randomUUID(),
    usuario: uppercaseInput(usuario),
    senha: input?.senha || "123456",
    tipo: input?.tipo || "municipal",
    escola,
    createdAt: input?.createdAt || new Date().toISOString(),
  };
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
    return { escola: defaultSchool, escolas: [], folders: [], historicos: [] };
  }
  const saved = window.localStorage.getItem(storageKey);
  if (saved) {
    try {
      const parsed = JSON.parse(saved) as AppData;
      if (parsed.historicos?.length || parsed.escolas?.length) {
        const migratedSchool = createSchoolAccount({
          id: migratedSchoolId,
          usuario: "ESCOLA",
          escola: { ...defaultSchool, ...parsed.escola, logo: parsed.escola?.logo || defaultSchool.logo },
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
        };
      }
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }
  return { escola: defaultSchool, escolas: [], folders: [], historicos: [] };
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
    if (parsed?.role === "owner" || parsed?.role === "school") return parsed?.nome ? parsed : null;
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
    return;
  }
  window.localStorage.setItem(authStorageKey, JSON.stringify(session));
}

function App() {
  const [data, setData] = useState<AppData>({ escola: defaultSchool, escolas: [], folders: [], historicos: [] });
  const [auth, setAuth] = useState<AuthSession | null>(null);
  const [adminCredentials, setAdminCredentials] = useState<AdminCredentials | null>(null);
  const [activeId, setActiveId] = useState("");
  const [activeFolderId, setActiveFolderId] = useState("");
  const [folderDraft, setFolderDraft] = useState("");
  const [folderYearDraft, setFolderYearDraft] = useState(String(new Date().getFullYear()));
  const [folderTeachingDraft, setFolderTeachingDraft] = useState("ENSINO FUNDAMENTAL");
  const [view, setView] = useState<"historicos" | "editor" | "escola" | "turmas" | "alunos" | "novo">("historicos");
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
  const currentSchool = currentSchoolAccount?.escola ?? defaultSchool;
  const schoolFolders = currentSchoolAccount
    ? data.folders.filter((folder) => folder.schoolId === currentSchoolAccount.id)
    : [];
  const schoolRecords = currentSchoolAccount
    ? data.historicos.filter((record) => record.schoolId === currentSchoolAccount.id)
    : [];
  const active = schoolRecords.find((item) => item.id === activeId) ?? schoolRecords[0];
  const yearOptions = Array.from(new Set(schoolFolders.map((folder) => folder.anoLetivo).filter(Boolean))).sort().reverse();

  useEffect(() => {
    const initialData = loadInitialData();
    setData(initialData);
    setAdminCredentials(loadAdminCredentials());
    const session = loadAuthSession();
    setAuth(session);
    const firstRecord = session?.role === "school"
      ? initialData.historicos.find((record) => record.schoolId === session.schoolId)
      : null;
    setActiveId(firstRecord?.id ?? "");
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (auth?.role !== "school") return;
    if (!currentSchoolAccount) {
      logout();
      return;
    }
    if (!activeId && schoolRecords[0]) setActiveId(schoolRecords[0].id);
    if (!schoolFolders.length && view !== "escola") setView("historicos");
  }, [auth, currentSchoolAccount, activeId, schoolRecords, schoolFolders.length, view]);

  useEffect(() => {
    if (!isReady) return;
    setSaveState("Salvando...");
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      window.localStorage.setItem(storageKey, JSON.stringify(data));
      setSaveState("Salvo");
    }, 380);
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

  const createAdminAccess = (credentials: AdminCredentials) => {
    const clean = {
      usuario: uppercaseInput(credentials.usuario.trim()),
      senha: credentials.senha.trim(),
    };
    if (!clean.usuario || !clean.senha) {
      window.alert("Informe usuario e senha do administrador.");
      return;
    }
    window.localStorage.setItem(adminStorageKey, JSON.stringify(clean));
    setAdminCredentials(clean);
    const session = { role: "owner" as const, nome: clean.usuario };
    setAuth(session);
    storeAuthSession(session);
  };

  const loginAdmin = (credentials: AdminCredentials) => {
    if (!adminCredentials) return createAdminAccess(credentials);
    const usuario = uppercaseInput(credentials.usuario.trim());
    const senha = credentials.senha.trim();
    if (usuario !== adminCredentials.usuario || senha !== adminCredentials.senha) {
      window.alert("Usuario ou senha do administrador incorretos.");
      return;
    }
    const session = { role: "owner" as const, nome: usuario };
    setAuth(session);
    storeAuthSession(session);
  };

  const loginSchool = (credentials: AdminCredentials) => {
    const usuario = uppercaseInput(credentials.usuario.trim());
    const senha = credentials.senha.trim();
    const school = data.escolas.find((account) => account.usuario === usuario && account.senha === senha);
    if (!school) {
      window.alert("Usuario ou senha da escola incorretos.");
      return;
    }
    const session = { role: "school" as const, nome: school.usuario, schoolId: school.id };
    setAuth(session);
    setActiveFolderId("");
    setActiveId(data.historicos.find((record) => record.schoolId === school.id)?.id ?? "");
    setView("historicos");
    storeAuthSession(session);
  };

  const logout = () => {
    setAuth(null);
    storeAuthSession(null);
    setView("historicos");
  };

  const createSchoolAccountFromAdmin = (account: SchoolAccount) => {
    const clean = createSchoolAccount({
      ...account,
      usuario: uppercaseInput(account.usuario.trim()),
      senha: account.senha.trim(),
      escola: {
        ...account.escola,
        nome: uppercaseInput(account.escola.nome.trim()),
      },
    });
    if (!clean.usuario || !clean.senha || !clean.escola.nome) {
      window.alert("Informe nome da escola, usuario e senha.");
      return;
    }
    const duplicated = data.escolas.some((school) => school.usuario === clean.usuario);
    if (duplicated) {
      window.alert("Ja existe uma escola com esse usuario.");
      return;
    }
    setData((current) => ({ ...current, escolas: [...current.escolas, clean] }));
    setSaveState("Escola cadastrada");
  };

  const updateSchoolAccountFromAdmin = (id: string, patch: Partial<SchoolAccount> & { escola?: Partial<School> }) => {
    setData((current) => ({
      ...current,
      escolas: current.escolas.map((account) =>
        account.id === id
          ? {
              ...account,
              ...patch,
              usuario: patch.usuario ? uppercaseInput(patch.usuario) : account.usuario,
              escola: patch.escola ? { ...account.escola, ...patch.escola } : account.escola,
            }
          : account,
      ),
    }));
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
    const folder = data.folders.find((item) => item.id === folderId);
    setData((current) => ({
      ...current,
      historicos: current.historicos.map((record) =>
        record.id === id ? { ...record, folderId, anoLetivo: folder?.anoLetivo || "", updatedAt: new Date().toISOString() } : record,
      ),
    }));
  };

  const createNew = (force = false) => {
    if (!currentSchoolAccount) return;
    const folder = schoolFolders.find((item) => item.id === activeFolderId);
    if (!folder) {
      window.alert("Crie ou selecione primeiro o ano letivo e a turma da escola.");
      setView("historicos");
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
  };

  const printRecord = (id: string) => {
    setPrintBatch(null);
    setActiveId(id);
    setView("editor");
    setPage(1);
    window.setTimeout(() => window.print(), 80);
  };

  const savePdfForRecord = (id: string) => {
    setData((current) => ({
      ...current,
      historicos: current.historicos.map((record) =>
        record.id === id ? { ...record, status: "Emitido", updatedAt: new Date().toISOString() } : record,
      ),
    }));
    setPrintBatch(null);
    setActiveId(id);
    setView("editor");
    setPage(1);
    setSaveState("Abrindo PDF...");
    window.setTimeout(() => {
      window.print();
      setSaveState("Salvo");
    }, 120);
  };

  const recordsForActiveFolder = () => activeFolderId
    ? schoolRecords.filter((record) => record.folderId === activeFolderId)
    : schoolRecords;

  const printFolderUnified = () => {
    const recordsToPrint = recordsForActiveFolder();
    if (!recordsToPrint.length) return;
    setPrintBatch(recordsToPrint);
    window.setTimeout(() => window.print(), 120);
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
      window.alert("Este navegador nao permite abrir pasta do PC. Use Chrome ou Edge atualizado.");
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
        window.alert("Nao encontrei historicos JSON nessa pasta.");
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

  if (!auth) {
    return (
      <LoginScreen
        hasAdmin={Boolean(adminCredentials)}
        onCreateAdmin={createAdminAccess}
        onLoginAdmin={loginAdmin}
        onLoginSchool={loginSchool}
      />
    );
  }

  if (auth.role === "owner") {
    return (
      <OwnerDashboard
        schools={data.escolas}
        saveState={saveState}
        onCreateSchool={createSchoolAccountFromAdmin}
        onUpdateSchool={updateSchoolAccountFromAdmin}
        onLogout={logout}
      />
    );
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">H</span>
          <div>
            <strong>Historico Online</strong>
            <small>Login da escola</small>
          </div>
        </div>
        <button className={view === "historicos" ? "nav active" : "nav"} onClick={() => setView("historicos")}>
          <span>[ ]</span> Historicos
        </button>
        <button className={view === "alunos" ? "nav active" : "nav"} onClick={() => setView("alunos")}>
          <span>@</span> Alunos
        </button>
        <button className={view === "novo" || view === "editor" ? "nav active" : "nav"} onClick={() => setView("novo")}>
          <span>+</span> Novo Historico
        </button>
        <button className={view === "turmas" ? "nav active" : "nav"} onClick={() => setView("turmas")}>
          <span>+</span> Criar Turma
        </button>
        <div className="sidebar-rule" />
        <button
          className={view === "escola" ? "nav active" : "nav"}
          onClick={() => {
            setView("escola");
          }}
        >
          <span>*</span> Dados da Escola
        </button>
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
              view === "novo" ? "Criar Historico" :
              "Historico Escolar"
            }</p>
            <h1>Historico Online</h1>
            <div className="school-chip">
              {currentSchool.logo && <img src={currentSchool.logo} alt="" />}
              <span>{upper(currentSchool.nome)}</span>
            </div>
          </div>
          <div className="actions">
            <span className="save-state">{saveState === "Salvo" ? "OK Salvo" : saveState}</span>
            {view === "editor" && active && (
              <label className="topbar-folder">
                <span>Pasta</span>
                <select value={active.folderId} onChange={(event) => moveRecordToFolder(active.id, event.target.value)}>
                  <option value="">Sem pasta</option>
                  {schoolFolders.map((folder) => <option key={folder.id} value={folder.id}>{folder.anoLetivo} - {folder.nome}</option>)}
                </select>
              </label>
            )}
            {view === "editor" && active && (
              <>
                <button onClick={() => { setPrintBatch(null); window.print(); }}>Imprimir</button>
                <button className="primary" onClick={() => savePdfForRecord(active.id)}>Salvar PDF no PC</button>
              </>
            )}
          </div>
        </header>

        {view === "historicos" && (
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

        {view === "novo" && (
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

        {view === "turmas" && (
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

        {view === "alunos" && (
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

        {view === "escola" && <SchoolSettings school={currentSchool} updateSchool={updateSchool} />}

        {view === "editor" && active && (
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
                setStep={setStep}
                savePdfForRecord={savePdfForRecord}
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
  onLoginSchool: (credentials: AdminCredentials) => void;
}) {
  const [adminUser, setAdminUser] = useState("ADMIN");
  const [adminPassword, setAdminPassword] = useState("");
  const [schoolUser, setSchoolUser] = useState("");
  const [schoolPassword, setSchoolPassword] = useState("");

  return (
    <main className="login-shell">
      <section className="login-card">
        <div className="login-brand">
          <span className="brand-mark">H</span>
          <div>
            <p>Sistema</p>
            <h1>Historico Online</h1>
          </div>
        </div>

        <div className="login-grid">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              onLoginSchool({ usuario: schoolUser, senha: schoolPassword });
            }}
          >
            <h2>Login da escola</h2>
            <label>
              <span>Usuario da escola</span>
              <input value={schoolUser} onChange={(event) => setSchoolUser(uppercaseInput(event.target.value))} placeholder="ESCOLA001" />
            </label>
            <label>
              <span>Senha</span>
              <input type="password" value={schoolPassword} onChange={(event) => setSchoolPassword(event.target.value)} />
            </label>
            <button className="primary" type="submit">Entrar na escola</button>
          </form>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              const credentials = { usuario: adminUser, senha: adminPassword };
              if (hasAdmin) onLoginAdmin(credentials);
              else onCreateAdmin(credentials);
            }}
          >
            <h2>{hasAdmin ? "Login do dono" : "Criar dono do sistema"}</h2>
            <label>
              <span>Usuario do dono</span>
              <input value={adminUser} onChange={(event) => setAdminUser(uppercaseInput(event.target.value))} />
            </label>
            <label>
              <span>Senha</span>
              <input type="password" value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} />
            </label>
            <button type="submit">{hasAdmin ? "Entrar como dono" : "Criar dono"}</button>
          </form>
        </div>
      </section>
    </main>
  );
}

function OwnerDashboard({
  schools,
  saveState,
  onCreateSchool,
  onUpdateSchool,
  onLogout,
}: {
  schools: SchoolAccount[];
  saveState: string;
  onCreateSchool: (account: SchoolAccount) => void;
  onUpdateSchool: (id: string, patch: Partial<SchoolAccount> & { escola?: Partial<School> }) => void;
  onLogout: () => void;
}) {
  const [draft, setDraft] = useState(() => createSchoolAccount({
    usuario: "",
    senha: "",
    tipo: "municipal",
    escola: { ...defaultSchool, nome: "", logo: "" },
  }));

  const updateDraftSchool = (patch: Partial<School>) => {
    setDraft((current) => ({ ...current, escola: { ...current.escola, ...patch } }));
  };

  return (
    <main className="app-shell admin-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">H</span>
          <div>
            <strong>Historico Online</strong>
            <small>Dono do sistema</small>
          </div>
        </div>
        <button className="nav active"><span>*</span> Escolas</button>
        <div className="firebase-note">
          <strong>ADMINISTRADOR</strong>
          <span>Cria e controla as contas das escolas.</span>
          <button type="button" onClick={onLogout}>Sair</button>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p>Painel central</p>
            <h1>Historico Online</h1>
          </div>
          <span className="save-state">{saveState === "Salvo" ? "OK Salvo" : saveState}</span>
        </header>

        <section className="settings-screen">
          <div className="panel-heading">
            <h2>Cadastrar escola</h2>
            <p>Crie o usuario e senha que a escola vai usar para entrar no sistema.</p>
          </div>
          <div className="settings-grid">
            <label className="wide">
              <span>Nome da escola</span>
              <input value={draft.escola.nome} onChange={(event) => updateDraftSchool({ nome: uppercaseInput(event.target.value) })} />
            </label>
            <label>
              <span>Codigo INEP / Censo</span>
              <input value={draft.escola.codigo} onChange={(event) => updateDraftSchool({ codigo: uppercaseInput(event.target.value) })} />
            </label>
            <label>
              <span>Usuario da escola</span>
              <input value={draft.usuario} onChange={(event) => setDraft((current) => ({ ...current, usuario: uppercaseInput(event.target.value) }))} />
            </label>
            <label>
              <span>Senha da escola</span>
              <input type="password" value={draft.senha} onChange={(event) => setDraft((current) => ({ ...current, senha: event.target.value }))} />
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
                senha: "",
                tipo: "municipal",
                escola: { ...defaultSchool, nome: "", logo: "" },
              }));
            }}
          >
            Criar conta da escola
          </button>
        </section>

        <section className="list-screen admin-list">
          <div className="panel-heading">
            <h2>Escolas cadastradas</h2>
          </div>
          <table className="records-table">
            <thead>
              <tr>
                <th>Escola</th>
                <th>Censo</th>
                <th>Usuario</th>
                <th>Rede</th>
                <th>Senha</th>
              </tr>
            </thead>
            <tbody>
              {schools.map((account) => (
                <tr key={account.id}>
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
                    <input value={account.usuario} onChange={(event) => onUpdateSchool(account.id, { usuario: uppercaseInput(event.target.value) })} />
                  </td>
                  <td>
                    <select value={account.tipo} onChange={(event) => onUpdateSchool(account.id, { tipo: event.target.value as SchoolKind })}>
                      <option value="municipal">Municipal</option>
                      <option value="estadual">Estadual</option>
                    </select>
                  </td>
                  <td>
                    <input type="password" value={account.senha} onChange={(event) => onUpdateSchool(account.id, { senha: event.target.value })} />
                  </td>
                </tr>
              ))}
              {!schools.length && (
                <tr>
                  <td colSpan={5}>Nenhuma escola cadastrada ainda.</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
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
          <p>Antes de criar o historico, cadastre uma turma e ano letivo.</p>
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
        <p>Escolha a turma e depois escolha se vai digitar ou criar por imagem.</p>
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
          <span>Abre o formulario normal para preencher aluno, notas, carga horaria, estudos e certificado.</span>
        </button>
        <button className="create-mode-card" disabled={!selectedFolder} onClick={() => setMode("image")}>
          <strong>Criar por imagem</strong>
          <span>Anexa frente e verso do historico e cria o registro dentro da turma escolhida.</span>
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
  const [status, setStatus] = useState("transferidos");
  const yearsList = Array.from(new Set(records.map((record) => transferYearFor(record)).filter(Boolean))).sort().reverse();
  const filteredRecords = records.filter((record) => {
    const folder = folders.find((item) => item.id === record.folderId);
    const transferYear = transferYearFor(record);
    const matchesQuery = !query || record.aluno.nome.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR"));
    const matchesYear = !year || transferYear === year || record.anoLetivo === year;
    const matchesFolder = !folderId || record.folderId === folderId;
    const matchesStatus = status === "todos" || (status === "transferidos" ? isTransferredRecord(record) : record.status === "Emitido");
    return matchesQuery && matchesYear && matchesFolder && matchesStatus;
  });

  return (
    <section className="list-screen">
      <div className="panel-heading">
        <h2>Alunos</h2>
        <p>Arquivo de pesquisa dos historicos feitos e alunos transferidos.</p>
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
            <option value="transferidos">Transferidos</option>
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
              <td className="row-actions">
                <button onClick={() => edit(record.id)}>Abrir</button>
                <button onClick={() => savePdfForRecord(record.id)}>Salvar PDF</button>
              </td>
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
    setDraft((current) => current ? {
      ...current,
      notas: {
        ...current.notas,
        [componentId]: {
          ...(current.notas[componentId] ?? {}),
          [year]: uppercaseInput(value),
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
            <Field label="Naturalidade - cidade" value={draft.aluno.naturalidadeCidade} onChange={(value) => updateDraftStudent({ naturalidadeCidade: value })} />
            <Field label="Naturalidade - estado" value={draft.aluno.naturalidadeEstado} onChange={(value) => updateDraftStudent({ naturalidadeEstado: value })} />
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
                      <td key={year}><input value={draft.notas[component.id]?.[year] ?? ""} onChange={(event) => updateDraftNote(component.id, year, event.target.value)} /></td>
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
                  <td className="row-actions">
                    <button onClick={() => edit(record.id)}>Editar</button>
                    <button onClick={() => edit(record.id)}>Visualizar</button>
                    <button onClick={() => savePdfForRecord(record.id)}>Salvar PDF</button>
                    <button onClick={() => printRecord(record.id)}>Imprimir</button>
                    <button onClick={() => deleteRecord(record.id)}>Excluir</button>
                  </td>
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

function SchoolSettings({ school, updateSchool }: { school: School; updateSchool: (patch: Partial<School>) => void }) {
  const uploadSchoolImage = async (key: "logo" | "carimboEscola" | "assinaturaDiretor" | "assinaturaSecretario", file?: File) => {
    const image = await imageFileToTransparentPng(file);
    if (!image) return;
    updateSchool({ [key]: image });
  };
  const makeSchoolImageTransparent = async (key: "logo" | "carimboEscola" | "assinaturaDiretor" | "assinaturaSecretario", value: string) => {
    updateSchool({ [key]: await removeLightBackground(value) });
  };
  const fields: Array<[keyof School, string]> = [
    ["estado", "Estado"],
    ["municipio", "Municipio"],
    ["nome", "Nome do estabelecimento"],
    ["mantenedora", "Entidade mantenedora"],
    ["codigo", "Codigo INEP / Censo"],
    ["credenciamento", "Credenciamento"],
    ["autorizacao", "Autorizacao"],
    ["reconhecimento", "Reconhecimento"],
    ["parecer", "Parecer"],
    ["validade", "Validade"],
    ["diretor", "Nome do diretor"],
    ["registroDiretor", "Registro do diretor"],
    ["secretario", "Nome do secretario escolar"],
    ["registroSecretario", "Registro do secretario"],
  ];
  return (
    <section className="settings-screen">
      <div className="panel-heading">
        <h2>Cadastro da Escola</h2>
        <p>Esses dados preenchem automaticamente o cabecalho, dados legais, local e assinaturas.</p>
      </div>
      <div className="settings-grid">
        {fields.map(([key, label]) => (
          <label key={key} className={key === "nome" || key === "mantenedora" ? "wide" : ""}>
            <span>{label}</span>
            <input value={school[key]} onChange={(event) => updateSchool({ [key]: uppercaseInput(event.target.value) })} />
          </label>
        ))}
        <label className="wide signature-upload">
          <span>Brasao/logomarca</span>
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
      <button className="primary">Salvar dados da escola</button>
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
  setStep,
  savePdfForRecord,
}: {
  record: HistoryRecord;
  school: School;
  step: number;
  updateActive: (updater: (record: HistoryRecord) => HistoryRecord) => void;
  updateSchool: (patch: Partial<School>) => void;
  setStep: (step: number) => void;
  savePdfForRecord: (id: string) => void;
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
            <Field label="Naturalidade - cidade" value={record.aluno.naturalidadeCidade} onChange={(value) => updateStudent({ naturalidadeCidade: value })} />
            <Field label="Naturalidade - estado" value={record.aluno.naturalidadeEstado} onChange={(value) => updateStudent({ naturalidadeEstado: value })} />
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
          <div className="inline-actions">
            <button onClick={() => updateActive((item) => ({ ...item, dadosLegais: { credenciamento: school.credenciamento, autorizacao: school.autorizacao, reconhecimento: school.reconhecimento, parecer: school.parecer, validade: school.validade } }))}>
              Usar dados da escola
            </button>
          </div>
          <div className="form-grid">
            <Field label="Credenciamento" value={record.dadosLegais.credenciamento} onChange={(value) => updateLegal({ credenciamento: value })} wide />
            <Field label="Autorizacao" value={record.dadosLegais.autorizacao} onChange={(value) => updateLegal({ autorizacao: value })} />
            <Field label="Reconhecimento" value={record.dadosLegais.reconhecimento} onChange={(value) => updateLegal({ reconhecimento: value })} />
            <Field label="Parecer" value={record.dadosLegais.parecer} onChange={(value) => updateLegal({ parecer: value })} />
            <Field label="Validade" value={record.dadosLegais.validade} onChange={(value) => updateLegal({ validade: value })} />
          </div>
        </>
      )}

      {step === 2 && <NotesForm record={record} updateActive={updateActive} />}
      {step === 3 && <WorkloadForm record={record} updateActive={updateActive} />}
      {step === 4 && <StudiesForm record={record} updateActive={updateActive} />}
      {step === 5 && <CertificateForm record={record} school={school} updateActive={updateActive} updateSchool={updateSchool} />}
      {step === 6 && (
        <Conference
          record={record}
          updateActive={updateActive}
          setStep={setStep}
          savePdfForRecord={savePdfForRecord}
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

function NotesForm({ record, updateActive }: { record: HistoryRecord; updateActive: (updater: (record: HistoryRecord) => HistoryRecord) => void }) {
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
                  const disabled = year < component.inicio || year > component.fim;
                  return (
                    <td key={year}>
                      <input
                        className={noteBoldFor(record, year) ? "is-bold" : ""}
                        data-row={rowIndex}
                        data-col={colIndex}
                        disabled={disabled}
                        value={disabled ? "-" : record.notas[component.id]?.[year] ?? ""}
                        onChange={(event) => updateActive((item) => ({
                          ...item,
                          notas: { ...item.notas, [component.id]: { ...(item.notas[component.id] ?? {}), [year]: uppercaseInput(event.target.value) } },
                        }))}
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
            <select value={record.resultados[year] ?? ""} onChange={(event) => updateActive((item) => ({ ...item, resultados: { ...item.resultados, [year]: uppercaseInput(event.target.value) } }))}>
              <option value="">Em branco</option>
              <option>APROVADO</option>
              <option>REPROVADO</option>
              <option>CURSANDO</option>
              <option>TRANSFERIDO</option>
              <option>PROGRESSAO</option>
              <option>NAO INFORMADO</option>
            </select>
          </label>
        ))}
      </div>
    </>
  );
}

function WorkloadForm({ record, updateActive }: { record: HistoryRecord; updateActive: (updater: (record: HistoryRecord) => HistoryRecord) => void }) {
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
                  <input value={record.estudos[year - 1]?.ano ?? ""} onChange={(event) => setSchoolYear(year, uppercaseInput(event.target.value))} />
                </td>
              ))}
            </tr>
            {(["oferta", "frequencia", "percentual"] as const).map((field) => (
              <tr key={field}>
                <td>{field === "oferta" ? "Oferta anual" : field === "frequencia" ? "Frequencia anual" : "% Frequencia"}</td>
                {years.map((year) => (
                  <td key={year}><input value={record.cargaHoraria[year]?.[field] ?? ""} onChange={(event) => setValue(year, field, uppercaseInput(event.target.value))} /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function StudiesForm({ record, updateActive }: { record: HistoryRecord; updateActive: (updater: (record: HistoryRecord) => HistoryRecord) => void }) {
  const updateStudy = (index: number, patch: Partial<StudyRow>) => {
    updateActive((item) => ({ ...item, estudos: item.estudos.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row) }));
  };
  const applyNext = (index: number) => {
    updateActive((item) => {
      const source = item.estudos[index];
      return {
        ...item,
        estudos: item.estudos.map((row, rowIndex) => rowIndex > index ? { ...row, escola: source.escola, cidade: source.cidade, estado: source.estado } : row),
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
              <input type="checkbox" checked={study.ativo} onChange={(event) => updateStudy(index, { ativo: event.target.checked })} />
              <span>Tem</span>
            </label>
            <strong>{study.serie}</strong>
            <input disabled={!study.ativo} value={study.ativo ? study.ano : "-"} onChange={(event) => updateStudy(index, { ano: uppercaseInput(event.target.value) })} placeholder="Ano" />
            <input disabled={!study.ativo} value={study.ativo ? study.escola : "-"} onChange={(event) => updateStudy(index, { escola: uppercaseInput(event.target.value) })} placeholder="Estabelecimento" />
            <input disabled={!study.ativo} value={study.ativo ? study.cidade : "-"} onChange={(event) => updateStudy(index, { cidade: uppercaseInput(event.target.value) })} placeholder="Cidade" />
            <input disabled={!study.ativo} value={study.ativo ? study.estado : "-"} onChange={(event) => updateStudy(index, { estado: uppercaseInput(event.target.value) })} placeholder="UF" />
            <button disabled={!study.ativo} onClick={() => applyNext(index)}>Usar nos proximos</button>
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
        <Field label="Municipio" value={record.localData.municipio} onChange={(value) => updateActive((item) => ({ ...item, localData: { ...item.localData, municipio: value } }))} />
        <Field label="Estado" value={record.localData.estado} onChange={(value) => updateActive((item) => ({ ...item, localData: { ...item.localData, estado: value } }))} />
        <Field label="Data de emissao" type="date" value={record.localData.data} onChange={(value) => updateActive((item) => ({ ...item, localData: { ...item.localData, data: value } }))} />
      </div>
    </>
  );
}

function Conference({
  record,
  updateActive,
  setStep,
  savePdfForRecord,
}: {
  record: HistoryRecord;
  updateActive: (updater: (record: HistoryRecord) => HistoryRecord) => void;
  setStep: (step: number) => void;
  savePdfForRecord: (id: string) => void;
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
      <div className="inline-actions">
        <button onClick={() => updateActive((item) => ({ ...item, status: "Conferido" }))}>Marcar como conferido</button>
        <button className="primary" onClick={() => savePdfForRecord(record.id)}>Finalizar e salvar PDF</button>
      </div>
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
  return (
    <div className="current-doc-header">
      <div className="header-logo-box">
        <img src={school.logo} alt="" />
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

      <h1>HISTÓRICO ESCOLAR</h1>

      <section className="student-block">
        <div className="student-name-box">
          <div className="center-label">ALUNO</div>
          <div className="filled-line big">{upper(record.aluno.nome)}</div>
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
        <span>ENSINO FUNDAMENTAL</span>
        <span>CREDENCIAMENTO/<br />AUTORIZAÇÃO</span>
        <span>CRE DENCIAMENTO/<br />RECONHECIMENTO</span>
        <span>PARECER: {upper(record.dadosLegais.parecer || school.parecer)}<br />VALIDADE: {upper(school.validade)}</span>
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
          {!showDirectorStamp && <span>{school.registroDiretor}</span>}
          {!showDirectorStamp && <small>DIRETOR (A) - Reg. Nº</small>}
        </div>
        <div className={showSecretaryStamp ? "signature-line has-stamp" : "signature-line"}>
          {showSecretaryStamp && <img className="signature-stamp" src={school.assinaturaSecretario} alt="" />}
          {!showSecretaryStamp && <span>{school.registroSecretario}</span>}
          {!showSecretaryStamp && <small>SECRETÁRIO (A) – REG. Nº</small>}
        </div>
      </section>

      <section className="current-certificate">
        <h2>CERTIFICADO</h2>
        <p>
          Certificamos que: <strong className="cert-fill cert-name">{certificateName}</strong>
        </p>
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
