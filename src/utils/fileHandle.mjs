import fs from "fs/promises";
import { join, dirname, resolve } from "path";
import constant from "../config/constant.mjs"; // adjust according to your structure
import __dirname from "../../approotdir.mjs";
import CliError from "./Error.mjs";
import theme from "./theme.mjs";
import resolveHome from "./resolvePath.mjs";

let VARIABLE_JSON = null;
let COLLECTION_JSON = null;
const FILEPATH = resolveHome(constant.VARIABLE_FILE_PATH);
const COLLECTION_JSON_PATH = resolveHome(constant.COLLECTION_JSON_FILE_PATH);
const COLLECTION_FILES_PATH = resolveHome(constant.COLLECTION_FILES_PATH);
// ~/.config/404ping/vars.json
/**
 * Save or update variables in the JSON file.
 * Merges with existing variables if present.i
 * @param {Object} variables - Key-value pairs to store
 */
export async function ensureFileExists(path=FILEPATH,input="{}"){
  const dir = dirname(path);
  // ~/.config/404ping
  await fs.mkdir(dir,{recursive:true});
  try{
    await fs.access(path)
  }catch(error){
    await fs.writeFile(path,input,"utf-8");
  }
}


function deepMerge(target, source) {
    const result = { ...target };
    
    for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            // If both are objects, merge them
            result[key] = deepMerge(result[key] || {}, source[key]);
        } else {
            // Otherwise just overwrite
            result[key] = source[key];
        }
    }
    
    return result;
}

export async function setVariable(variables) {
  try {
    let existing = {};
    try {
      const content = await fs.readFile(FILEPATH, "utf-8");
      existing = JSON.parse(content);
    } catch (err) {
      if (err.code !== "ENOENT" && !err.message.includes("Unexpected end of JSON input")) {
        throw new CliError({
          isKnown: true,
          message: "Variable file not found",
          code: err.code,
          category: "file",
          type: "warn"
        });
      }
      if (err.message.includes("Unexpected end of JSON input")) {
        throw new CliError({
          isKnown: true,
          message: "Variable file is corrupted. Overwriting with empty file...",
          category: "file",
          type: "warn"
        });
      }
    }
    const mergedVariables = deepMerge(existing,variables);
    await fs.writeFile(FILEPATH, JSON.stringify(mergedVariables, null, 2), "utf-8");

    // Update cached variables
    VARIABLE_JSON = JSON.stringify(mergedVariables);

  } catch (error) {
    throw error;
  }
}

export async function unSetVar(vars=[]){
  try{
    if (!Array.isArray(vars) || vars.length === 0) {
      throw new CliError({
        isKnown: true,
        message: "No variables specified to unset",
        category: "validation",
        type: "warn"
      });
    }
    
    const content = await readFile();
    let cachedVars;
    try {
      cachedVars = JSON.parse(content);
    } catch (parseError) {
      throw new CliError({
        isKnown: true,
        message: "Variable file contains invalid JSON",
        category: "file",
        originalError: parseError
      });
    }
    
    vars.forEach(v => {
      if (cachedVars[v.c_name] && cachedVars[v.c_name].hasOwnProperty(v.key)) {
        delete cachedVars[v.c_name][v.key];
      }
    });
    
    await fs.writeFile(FILEPATH, JSON.stringify(cachedVars, null, 2), "utf-8");
  }catch(error){
    if (error instanceof CliError) {
      throw error;
    }
    throw new CliError({
      isKnown: true,
      message: `Failed to unset variables: ${error.message}`,
      category: "file",
      originalError: error
    });
  }
}

/**
 * Read the variable JSON file (cached after first read)
 * @returns {Promise<string>} JSON string of variables
 */
export async function readFile(path=FILEPATH) {
  if (VARIABLE_JSON) return VARIABLE_JSON;
  try {
    const content = await fs.readFile(path, "utf-8");
    VARIABLE_JSON = content;
    return VARIABLE_JSON;
  } catch (error) {
    if (error.code === "ENOENT") {
      console.log(theme.warning("Warning: variable.json file not found!"));
      return "{\"global\":{}}"; // return empty JSON object string
    }
    throw error;
  }
}

export async function readCollectionFile(path=COLLECTION_JSON_PATH){
  if(COLLECTION_JSON) return COLLECTION_JSON;
  try{
    const content = await fs.readFile(path,"utf-8");
    COLLECTION_JSON = content;
    return COLLECTION_JSON;
  }catch(error){
    if(error.code==="ENOENT"){
      console.log(theme.warning(`Warning: collection.json file not found!`));
      return "{}";
    }
    throw error;
  }
}

/**
 * Replace all {{variable}} placeholders in a string with values from variable file
 * @param {string} input - String containing {{variables}}
 * @returns {Promise<string>} - String with variables replaced
 */
export async function variableParser(input) {
  try {
    if (typeof input !== "string") return input;

    const content = await readFile();
    let cachedVars;
    try {
      cachedVars = JSON.parse(content);
    } catch (parseError) {
      throw new CliError({
        isKnown: true,
        message: "Variable file contains invalid JSON",
        category: "file",
        originalError: parseError
      });
    }

    return input.replace(/{{(.*?)}}/g, (_, key) => {
      const [c,k] = key.split(".").map(v=>v.trim());
      const c_name = k===undefined?"global":c;
      const k_name = k===undefined?c:k;
      if (cachedVars?.[c_name]?.[k_name] !== undefined) {
        return cachedVars[c_name][k_name];
      }
      console.warn(theme.warning(`Warning: variable "{{${key}}}" not found!`));
      return `{{${key}}}`; // leave placeholder if not found
    });
  } catch (error) {
    if (error instanceof CliError) {
      throw error;
    }
    throw new CliError({
      isKnown: true,
      message: `Error parsing variables: ${error?.message}`,
      type: "error",
      category: "validation",
      originalError: error
    });
  }
}



// save collection
/**
 * Create collection with name validation
 */
export async function createCollection(name){
  try{
    // Security: Validate collection name to prevent path traversal
    if (!name || typeof name !== 'string') {
      throw new CliError({
        isKnown: true,
        message: "Collection name is required and must be a string",
        category: "validation"
      });
    }
    
    // Security: Only allow alphanumeric, underscore, and hyphen
    if (!/^[a-zA-Z0-9_\-]+$/.test(name)) {
      throw new CliError({
        isKnown: true,
        message: `Invalid collection name: "${name}". Only alphanumeric characters, underscores, and hyphens are allowed`,
        category: "validation"
      });
    }
    
    let existing = {};
    const content = await readCollectionFile(COLLECTION_JSON_PATH);
    existing = JSON.parse(content);
    
    // Check if collection already exists
    if (existing.hasOwnProperty(name)) {
      throw new CliError({
        isKnown: true,
        message: `Collection "${name}" already exists`,
        category: "validation",
        type: "warn"
      });
    }
    
    const collectionDirPath = join(COLLECTION_FILES_PATH, name);
    
    // Security: Ensure collection path is within allowed directory
    const resolvedCollectionPath = resolve(COLLECTION_FILES_PATH);
    const resolvedNewPath = resolve(collectionDirPath);
    if (!resolvedNewPath.startsWith(resolvedCollectionPath)) {
      throw new CliError({
        isKnown: true,
        message: "Invalid collection path",
        category: "validation",
        code: "EINVAL"
      });
    }
    
    await fs.mkdir(collectionDirPath, {recursive: true});
    existing[name] = {
      path: collectionDirPath,
      requests: {}
    };
    await fs.writeFile(COLLECTION_JSON_PATH, JSON.stringify(existing, null, 2), "utf-8");
    console.log(theme.success("Collection created successfully"));
  }catch(error){
    if (error instanceof CliError) {
      throw error;
    }
    throw new CliError({
      isKnown: true,
      message: `Failed to create collection: ${error.message}`,
      category: "file",
      originalError: error
    });
  }
}

/**
 * Save request in collection with validation
 */
export async function saveRequestInCollection(collection_name, request_name, request_body){
  try{
    // Security: Validate collection and request names
    if (!collection_name || !/^[a-zA-Z0-9_\-]+$/.test(collection_name)) {
      throw new CliError({
        isKnown: true,
        message: `Invalid collection name: "${collection_name}"`,
        category: "validation"
      });
    }
    
    if (!request_name || !/^[a-zA-Z0-9_\-]+$/.test(request_name)) {
      throw new CliError({
        isKnown: true,
        message: `Invalid request name: "${request_name}"`,
        category: "validation"
      });
    }
    
    let existing = {};
    const content = await readCollectionFile(COLLECTION_JSON_PATH);
    existing = JSON.parse(content);
    
    if(!existing.hasOwnProperty(collection_name)) {
      throw new CliError({
        isKnown: true,
        message: `Collection "${collection_name}" does not exist`,
        category: "validation",
        type: "error"
      });
    }
    
    const isExistFile = existing[collection_name]["requests"].hasOwnProperty(request_name);
    const collectionFilePath = isExistFile 
      ? existing[collection_name]["requests"][request_name]
      : join(COLLECTION_FILES_PATH, collection_name, `${request_name}-${Date.now()}.json`);
    
    // Security: Validate file path
    const resolvedCollectionPath = resolve(COLLECTION_FILES_PATH, collection_name);
    const resolvedFilePath = resolve(collectionFilePath);
    if (!resolvedFilePath.startsWith(resolvedCollectionPath)) {
      throw new CliError({
        isKnown: true,
        message: "Invalid request file path",
        category: "validation",
        code: "EINVAL"
      });
    }
    
    await fs.writeFile(collectionFilePath, JSON.stringify(request_body, null, 2), "utf-8");
    existing[collection_name].requests[request_name] = collectionFilePath;
    await fs.writeFile(COLLECTION_JSON_PATH, JSON.stringify(existing, null, 2), "utf-8");
    console.log(theme.success(`Request "${request_name}" saved successfully in collection "${collection_name}"`));
  }catch(error){
    if (error instanceof CliError) {
      throw error;
    }
    throw new CliError({
      isKnown: true,
      message: `Failed to save request: ${error.message}`,
      category: "file",
      originalError: error
    });
  }
}

/**
 * Read request file with validation
 */
export async function readRequestFile(collection_name, request_name){
  try{
    // Security: Validate collection and request names
    if (!collection_name || !/^[a-zA-Z0-9_\-]+$/.test(collection_name)) {
      throw new CliError({
        isKnown: true,
        message: `Invalid collection name: "${collection_name}"`,
        category: "validation"
      });
    }
    
    if (!request_name || !/^[a-zA-Z0-9_\-]+$/.test(request_name)) {
      throw new CliError({
        isKnown: true,
        message: `Invalid request name: "${request_name}"`,
        category: "validation"
      });
    }
    
    const existing = await readCollectionFile(COLLECTION_JSON_PATH);
    const content = JSON.parse(existing);
    
    if(!content.hasOwnProperty(collection_name)) {
      throw new CliError({
        isKnown: true,
        message: `Collection "${collection_name}" not found`,
        category: "file",
        type: "error"
      });
    }
    
    const collection = content[collection_name];
    if(collection?.requests && !collection.requests.hasOwnProperty(request_name)){
      throw new CliError({
        isKnown: true,
        message: `Request "${request_name}" not found in collection "${collection_name}"`,
        category: "file",
        type: 'error'
      });
    }
    
    const request_path = collection.requests[request_name];
    
    // Security: Validate file path
    const resolvedCollectionPath = resolve(COLLECTION_FILES_PATH, collection_name);
    const resolvedFilePath = resolve(request_path);
    if (!resolvedFilePath.startsWith(resolvedCollectionPath)) {
      throw new CliError({
        isKnown: true,
        message: "Invalid request file path",
        category: "validation",
        code: "EINVAL"
      });
    }
    
    const request_raw = await fs.readFile(request_path, {encoding:"utf-8"});
    
    // Validate JSON format
    let request;
    try {
      request = JSON.parse(request_raw);
    } catch (parseError) {
      throw new CliError({
        isKnown: true,
        message: `Invalid JSON in request file: ${request_path}`,
        category: "file",
        code: "EINVAL",
        originalError: parseError
      });
    }
    
    return request;
  }catch(error){
    if (error instanceof CliError) {
      throw error;
    }
    if(error.code==="ENOENT"){
      throw new CliError({
        isKnown: true,
        message: `Request file not found`,
        code: error.code,
        category: "file"
      });
    }
    throw new CliError({
      isKnown: true,
      message: `Failed to read request file: ${error.message}`,
      category: "file",
      originalError: error
    });
  }
}



/**
 * Load file with path traversal protection
 */
export async function loadFile(input){
  //  if not @file -> return as it 
  const filePath = input.slice(1);
  
  // Security: Prevent path traversal attacks
  if (filePath.includes('..') || filePath.includes('~')) {
    throw new CliError({
      isKnown: true,
      message: `Invalid file path: Path traversal detected`,
      code: "EINVAL",
      category: "validation",
      details: { path: filePath }
    });
  }
  
  // Resolve path relative to current working directory
  const resolvePath = resolve(process.cwd(), filePath);
  
  // Security: Ensure resolved path is within current working directory
  const cwd = process.cwd();
  if (!resolvePath.startsWith(cwd)) {
    throw new CliError({
      isKnown: true,
      message: `Invalid file path: Path outside working directory`,
      code: "EINVAL",
      category: "validation",
      details: { path: filePath, resolved: resolvePath }
    });
  }
  
  try{
    const fileData = await fs.readFile(resolvePath, {encoding:"utf-8"});
    // try json parse
    const text = fileData.toString();
    try{
      return JSON.parse(text);
    }catch{
      return text;
    }
  }catch(error){
    if(error.code==="ENOENT"){
      throw new CliError({
        isKnown: true,
        message: `File not found: ${filePath}`,
        code: error.code,
        category: "file",
        details: { path: filePath }
      });
    }
    if(error.code==="EACCES"){
      throw new CliError({
        isKnown: true,
        message: `Permission denied: ${filePath}`,
        code: error.code,
        category: "file",
        details: { path: filePath }
      });
    }
    throw error;
  }
}