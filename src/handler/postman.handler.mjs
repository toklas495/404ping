import fs from "fs/promises";
import path from "path";
import CliError from "../utils/Error.mjs";
import theme from "../utils/theme.mjs";
import { createCollection, saveRequestInCollection, readCollectionFile } from "../utils/fileHandle.mjs";

const POSTMAN_SCHEMA = "https://schema.getpostman.com/json/collection/v2.1.0/collection.json";

function sanitizeName(name = "request") {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9_\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "request";
}

function buildUrlFromRequest(requestUrl) {
  if (!requestUrl) return "";
  if (typeof requestUrl === "string") return requestUrl;
  if (requestUrl.raw) return requestUrl.raw;
  const protocol = requestUrl.protocol ? `${requestUrl.protocol}://` : "";
  const host = Array.isArray(requestUrl.host) ? requestUrl.host.join(".") : "";
  const path = Array.isArray(requestUrl.path) ? `/${requestUrl.path.join("/")}` : "";
  const query = Array.isArray(requestUrl.query) && requestUrl.query.length
    ? `?${requestUrl.query.map(q => `${q.key}=${q.value}`).join("&")}`
    : "";
  return `${protocol}${host}${path}${query}`;
}

function toHeaderArray(headers = []) {
  if (!Array.isArray(headers)) return [];
  return headers
    .filter((header) => header && header.key && header.value)
    .map((header) => `${header.key}:${header.value}`);
}

function flattenItems(items = [], prefix = [], bucket = []) {
  items.forEach((item) => {
    if (item.item && Array.isArray(item.item)) {
      flattenItems(item.item, [...prefix, sanitizeName(item.name || "folder")], bucket);
    } else if (item.request) {
      const baseName = sanitizeName([...prefix, item.name || "request"].join("-"));
      bucket.push({ ...item, __sanitizedName: baseName });
    }
  });
  return bucket;
}

function convertTo404Request(item) {
  const url = buildUrlFromRequest(item.request?.url);
  const method = item.request?.method || "GET";
  const header = toHeaderArray(item.request?.header);
  let data;
  if (item.request?.body?.mode === "raw") {
    data = item.request.body.raw;
  }
  return { url, method, header, data };
}

function buildPostmanRequest(name, request) {
  const parsedUrl = new URL(request.url);
  const queryString = parsedUrl.searchParams;
  const query = [];
  queryString.forEach((value, key) => {
    query.push({ key, value });
  });

  return {
    name,
    request: {
      method: request.method,
      header: (request.header || []).map((entry) => {
        const [key, ...rest] = entry.split(":");
        return { key: key.trim(), value: rest.join(":").trim() };
      }),
      url: {
        raw: request.url,
        protocol: parsedUrl.protocol.replace(":", ""),
        host: parsedUrl.hostname.split("."),
        path: parsedUrl.pathname.split("/").filter(Boolean),
        query
      },
      body: request.data ? { mode: "raw", raw: request.data } : undefined
    }
  };
}

export async function importPostmanCollection({ input, collection: collectionName }) {
  if (!input) {
    throw new CliError({
      isKnown: true,
      message: "Import requires a Postman collection file",
      category: "validation"
    });
  }

  const filePath = path.resolve(process.cwd(), input);
  let raw;
  try {
    raw = await fs.readFile(filePath, "utf-8");
  } catch (error) {
    throw new CliError({
      isKnown: true,
      message: `Unable to read Postman collection: ${filePath}`,
      category: "file",
      code: error.code,
      originalError: error
    });
  }

  let json;
  try {
    json = JSON.parse(raw);
  } catch (error) {
    throw new CliError({
      isKnown: true,
      message: "Invalid Postman JSON file",
      category: "validation",
      originalError: error
    });
  }

  const targetName = sanitizeName(collectionName || json.info?.name || "imported");
  const collections = JSON.parse(await readCollectionFile());
  if (!collections[targetName]) {
    await createCollection(targetName);
  }

  const flatItems = flattenItems(json.item || []);
  let counter = 1;
  for (const item of flatItems) {
    const requestData = convertTo404Request(item);
    const requestName = `${item.__sanitizedName || "request"}-${counter++}`;
    await saveRequestInCollection(targetName, requestName, requestData);
  }

  console.log(theme.success(`Imported ${flatItems.length} requests into collection "${targetName}"`));
}

export async function exportPostmanCollection({ collection, output }) {
  if (!collection) {
    throw new CliError({
      isKnown: true,
      message: "Export requires a collection name",
      category: "validation"
    });
  }

  const collections = JSON.parse(await readCollectionFile());
  if (!collections[collection]) {
    throw new CliError({
      isKnown: true,
      message: `Collection "${collection}" not found`,
      category: "validation"
    });
  }

  const requests = collections[collection].requests || {};
  if (!Object.keys(requests).length) {
    throw new CliError({
      isKnown: true,
      message: `Collection "${collection}" is empty`,
      category: "validation"
    });
  }

  const postman = {
    info: {
      name: collection,
      schema: POSTMAN_SCHEMA
    },
    item: []
  };

  for (const [name, filePath] of Object.entries(requests)) {
    const raw = await fs.readFile(filePath, "utf-8");
    const requestData = JSON.parse(raw);
    postman.item.push(buildPostmanRequest(name, requestData));
  }

  const outputPath = path.resolve(process.cwd(), output || `${collection}.postman.json`);
  await fs.writeFile(outputPath, JSON.stringify(postman, null, 2), "utf-8");
  console.log(theme.success(`Exported collection "${collection}" to ${outputPath}`));
}

export default {
  importPostmanCollection,
  exportPostmanCollection
};
