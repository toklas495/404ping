import fs from "fs/promises";
import { join,dirname,resolve } from "path";
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
        throw new CliError({isKnown:true,message:"<variable.json> file not found!",type:"warn"})
      }
      if (err.message.includes("Unexpected end of JSON input")) {
        throw new CliError({isKnown:true,message:"Warning: Variable file is corrupted! Overwriting...",type:"warn"});
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
    const content = await readFile();
    const cachedVars = JSON.parse(content);
    vars.forEach(v=>{
      delete cachedVars[v.c_name][v.key];
    })
    await fs.writeFile(FILEPATH,JSON.stringify(cachedVars,null,2),"utf-8");
  }catch(error){
    throw error;
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
    const cachedVars = JSON.parse(content);

    return input.replace(/{{(.*?)}}/g, (_, key) => {
      const [c,k] = key.split(".").map(v=>v.trim())
      const c_name = k===undefined?"global":c;
      const k_name = k===undefined?c:k;
      if (cachedVars?.[c_name]?.[k_name] !== undefined) return cachedVars[c_name][k_name];
      console.warn(theme.warning(`Warning: variable "{{${key}}}" not found!`));
      return `{{${key}}}`; // leave placeholder if not found
    });
  } catch (error) {
    throw new CliError({isKnown:true,message:`Error parsing variables ${error?.message}`,type:"error"});
  }
}



// save collection
export async function createCollection(name){
  try{
    let existing = {};
    const content = await readCollectionFile(COLLECTION_JSON_PATH);
    existing = JSON.parse(content);
    const collectionDirPath = join(COLLECTION_FILES_PATH,`${name}`);
    const isCollectionExist = await fs.mkdir(collectionDirPath,{recursive:true})
    if(!isCollectionExist) throw new CliError({isKnown:true,message:`<collection-${name}> already exist: ${collectionDirPath}`,type:"error"});
    existing[name] = {
      path:collectionDirPath,
      requests:{}
    }
    await fs.writeFile(COLLECTION_JSON_PATH,JSON.stringify(existing,null,2),"utf-8");
    console.log(theme.success("created successfully..."));
  }catch(error){
    throw error;
  }
}

export async function saveRequestInCollection(collection_name,request_name,request_body){
  try{    
    let existing = {};
    const content = await readCollectionFile(COLLECTION_JSON_PATH);
    existing = JSON.parse(content)
    if(!existing.hasOwnProperty(collection_name)) throw new CliError({isKnown:true,message:`<collection-${collection_name}> does not exist!`});
    const isExistFile = existing[collection_name]["requests"].hasOwnProperty(request_name);
    const collectionFilePath = isExistFile?existing[collection_name]["requests"][request_name]:join(COLLECTION_FILES_PATH,collection_name,`${request_name}-${Date.now()}.json`);
    await fs.writeFile(collectionFilePath,JSON.stringify(request_body,null,2),"utf-8");
    existing[collection_name].requests[request_name] = collectionFilePath;
    await fs.writeFile(COLLECTION_JSON_PATH,JSON.stringify(existing,null,2),"utf-8");
    console.log(theme.success(`> successfully ${request_name} saved in ${collection_name}`))
  }catch(error){
    throw error;
  }
}

export async function readRequestFile(collection_name,request_name){
  try{
    const existing = await readCollectionFile(COLLECTION_JSON_PATH);
    const content = JSON.parse(existing);
    if(!content.hasOwnProperty(collection_name))throw new CliError({isKnown:true,message:"sorry! collection not found...",type:"error"});
    const collection = content[collection_name];
    if(collection?.requests&&!collection.requests.hasOwnProperty(request_name)){
      throw new CliError({isKnown:true,message:"sorry! request not found...",type:'error'});
    }
    const request_path = collection.requests[request_name];
    const request_raw = await fs.readFile(request_path,{encoding:"utf-8"});
    const request = JSON.parse(request_raw);
    return request;
  }catch(error){
    if(error.code==="ENOENT"){
      throw new CliError({isKnown:true,message:"request_file not found!"});
    }
    throw error;
  }
}



export async function loadFile(input){
  //  if not @file -> return as it 
  const filePath = input.slice(1);
  const resolvePath = resolve(process.cwd(),filePath);
  try{
    const fileData = await fs.readFile(resolvePath,{encoding:"utf-8"});
    // try json parse
    const text = fileData.toString();
    try{
      return JSON.parse(text);
    }catch{
      return text;
    }
  }catch(error){
    if(error.code==="ENOENT"){
      throw new CliError({isKnown:true,message:`sorry! ${filePath} not found!`})
    }
    throw error;
  }
}