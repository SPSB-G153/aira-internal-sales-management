import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { DocumentType, Sale, SaleDocument } from "@/lib/types";

type LocalDatabase = { sales: Sale[]; documents: SaleDocument[] };
const EMPTY: LocalDatabase = { sales: [], documents: [] };
let queue: Promise<unknown> = Promise.resolve();

export function localDataRoot() {
  if (process.env.AIRA_LOCAL_ONLY !== "1") {
    throw new Error("PDPA local-only mode is required. Open the AIRA app from this computer, not the cloud site.");
  }
  return process.env.AIRA_DATA_ROOT || "C:\\AIRA Sales Management";
}

const databasePath = () => path.join(localDataRoot(), "aira-sales-data.json");

async function ensureRoot() {
  const root = localDataRoot();
  await Promise.all([
    mkdir(root, { recursive: true }),
    mkdir(path.join(root, "Uploads"), { recursive: true }),
    mkdir(path.join(root, "Generated Documents"), { recursive: true }),
    mkdir(path.join(root, "Backups"), { recursive: true }),
  ]);
}

async function readDatabase(): Promise<LocalDatabase> {
  await ensureRoot();
  try {
    const parsed = JSON.parse(await readFile(databasePath(), "utf8")) as Partial<LocalDatabase>;
    return { sales: parsed.sales ?? [], documents: parsed.documents ?? [] };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return structuredClone(EMPTY);
    throw error;
  }
}

async function writeDatabase(database: LocalDatabase) {
  await ensureRoot();
  const target = databasePath();
  const temporary = `${target}.tmp`;
  await writeFile(temporary, JSON.stringify(database, null, 2), "utf8");
  await rename(temporary, target);
}

async function mutate<T>(operation: (database: LocalDatabase) => T | Promise<T>): Promise<T> {
  const running = queue.then(async () => {
    const database = await readDatabase();
    const result = await operation(database);
    await writeDatabase(database);
    return result;
  });
  queue = running.then(() => undefined, () => undefined);
  return running;
}

export async function listLocalSales() { return (await readDatabase()).sales; }
export async function findLocalSale(id: string) {
  const sale = (await readDatabase()).sales.find((item) => item.id === id);
  if (!sale) throw new Error("Sale not found.");
  return sale;
}
export async function saveLocalSale(values: Partial<Sale>, id?: string) {
  return mutate((database) => {
    const now = new Date().toISOString();
    if (id) {
      const index = database.sales.findIndex((item) => item.id === id);
      if (index < 0) throw new Error("Sale not found.");
      database.sales[index] = { ...database.sales[index], ...values, id, team_id: "local" };
      return database.sales[index];
    }
    const sale = { ...values, id: randomUUID(), team_id: "local", user_id: null, created_at: now } as Sale;
    database.sales.push(sale);
    return sale;
  });
}
export async function removeLocalSale(id: string) {
  return mutate((database) => {
    database.sales = database.sales.filter((item) => item.id !== id);
    database.documents = database.documents.filter((item) => item.sale_id !== id);
  });
}

export async function listLocalDocuments(saleId?: string) {
  const documents = (await readDatabase()).documents;
  return saleId ? documents.filter((item) => item.sale_id === saleId) : documents;
}
export async function findLocalDocument(id: string) {
  const document = (await readDatabase()).documents.find((item) => item.id === id);
  if (!document) throw new Error("Document not found.");
  return document;
}
export async function upsertLocalDocument(saleId: string, documentType: DocumentType, content: Record<string, unknown>, existing?: Partial<SaleDocument>) {
  return mutate((database) => {
    const now = new Date().toISOString();
    const index = database.documents.findIndex((item) => item.sale_id === saleId && item.document_type === documentType);
    const document: SaleDocument = {
      id: index >= 0 ? database.documents[index].id : randomUUID(), team_id: "local", user_id: null,
      sale_id: saleId, document_type: documentType, content,
      status: existing?.status ?? (index >= 0 ? database.documents[index].status : "generated"),
      generated_at: existing?.generated_at ?? now,
      created_at: index >= 0 ? database.documents[index].created_at : now,
    };
    if (index >= 0) database.documents[index] = document; else database.documents.push(document);
    return document;
  });
}
export async function reviewLocalDocument(id: string) {
  return mutate((database) => {
    const document = database.documents.find((item) => item.id === id);
    if (!document) throw new Error("Document not found.");
    document.status = "reviewed";
    return document;
  });
}
