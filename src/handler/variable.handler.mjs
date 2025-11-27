import {setVariable,unSetVar,readFile} from '../utils/fileHandle.mjs';
import theme from '../utils/theme.mjs';
import CliError from '../utils/Error.mjs';

export async function setVariableHandler(argv){
    try{
        const {variables} = argv;
        
        if(!variables || !Array.isArray(variables) || variables.length === 0) {
            throw new CliError({
                isKnown: true,
                message: "No variables specified. Format: key:value or collection.key:value",
                type: "warn",
                category: "validation"
            });
        }
        
        const varObject = {};
        variables.forEach(v => {
            if (typeof v !== 'string' || !v.includes(':')) {
                throw new CliError({
                    isKnown: true,
                    message: `Invalid variable format: "${v}". Must be "key:value" or "collection.key:value"`,
                    type: "warn",
                    category: "validation"
                });
            }
            
            const [key, ...valueParts] = v.split(":").map(s => s.trim());
            const value = valueParts.join(":"); // Rejoin in case value contains colons
            
            if (!key || !value) {
                throw new CliError({
                    isKnown: true,
                    message: `Invalid variable: "${v}". Key and value cannot be empty`,
                    type: "warn",
                    category: "validation"
                });
            }
            
            // Security: Validate variable names
            const [name, _] = key.split(".").map(v => v.trim());
            const c_name = key === name ? "global" : name;
            const key_name = _ || name;
            
            // Validate collection and key names
            if (c_name !== "global" && !/^[a-zA-Z0-9_\-]+$/.test(c_name)) {
                throw new CliError({
                    isKnown: true,
                    message: `Invalid collection name in variable: "${c_name}". Only alphanumeric, underscore, and hyphen allowed`,
                    type: "warn",
                    category: "validation"
                });
            }
            
            if (!/^[a-zA-Z0-9_\-]+$/.test(key_name)) {
                throw new CliError({
                    isKnown: true,
                    message: `Invalid variable name: "${key_name}". Only alphanumeric, underscore, and hyphen allowed`,
                    type: "warn",
                    category: "validation"
                });
            }
            
            if(varObject.hasOwnProperty(c_name)){
                varObject[c_name][key_name] = value;
            }else{
                varObject[c_name] = {};
                varObject[c_name][key_name] = value;
            }
        });
        
        await setVariable(varObject);
        console.log(theme.success(`Variables set successfully`));
    }catch(error){
        if (error instanceof CliError) {
            throw error;
        }
        throw new CliError({
            isKnown: true,
            message: `Failed to set variables: ${error.message}`,
            category: "file",
            originalError: error
        });
    }
}

export async function unSetVariableHandler(argv) {
    try{
        const {variables} = argv;
        
        if(!variables || !Array.isArray(variables) || variables.length === 0) {
            throw new CliError({
                isKnown: true,
                message: "No variables specified to unset",
                type: "warn",
                category: "validation"
            });
        }
        
        const varObjs = [];
        variables.forEach(v => {
            if (typeof v !== 'string') {
                throw new CliError({
                    isKnown: true,
                    message: `Invalid variable name: "${v}"`,
                    type: "warn",
                    category: "validation"
                });
            }
            
            const [a, b] = v.split(".").map(s => s.trim());
            const c_name = b === undefined ? "global" : a;
            const key = b === undefined ? a : b;
            
            // Validate names
            if (c_name !== "global" && !/^[a-zA-Z0-9_\-]+$/.test(c_name)) {
                throw new CliError({
                    isKnown: true,
                    message: `Invalid collection name: "${c_name}"`,
                    type: "warn",
                    category: "validation"
                });
            }
            
            if (!/^[a-zA-Z0-9_\-]+$/.test(key)) {
                throw new CliError({
                    isKnown: true,
                    message: `Invalid variable name: "${key}"`,
                    type: "warn",
                    category: "validation"
                });
            }
            
            varObjs.push({
                c_name: c_name,
                key: key
            });
        });
        
        await unSetVar(varObjs);
        console.log(theme.success(`Variables unset successfully`));
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

export async function listVariableHandler(argv){
    try{
        const content = await readFile();
        let vars;
        try {
            vars = JSON.parse(content);
        } catch (parseError) {
            throw new CliError({
                isKnown: true,
                message: "Variable file contains invalid JSON",
                category: "file",
                originalError: parseError
            });
        }
        
        if (!vars || Object.keys(vars).length === 0 || 
            (vars.global && Object.keys(vars.global).length === 0 && Object.keys(vars).length === 1)) {
            console.log(theme.info("No variables set"));
            return;
        }
        
        console.log(theme.success(content));
    }catch(error){
        if (error instanceof CliError) {
            throw error;
        }
        throw new CliError({
            isKnown: true,
            message: `Failed to list variables: ${error.message}`,
            category: "file",
            originalError: error
        });
    }
}