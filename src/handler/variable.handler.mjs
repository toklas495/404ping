import {setVariable,unSetVar,readFile} from '../utils/fileHandle.mjs';
import theme from '../utils/theme.mjs';

export  async function setVariableHandler(argv){
    try{
        const {variables} = argv;
        const varObject = {};
        if(variables&&variables.length){
            variables.forEach(v=>{
                const [key,...value] = v.split(":").map(s=>s.trim());
                const [name,_] = key.split(".").map(v=>v.trim());
                const c_name = key===name?"global":name;
                const key_name = _||name;
                if(varObject.hasOwnProperty(c_name)){
                    varObject[c_name][key_name] = value.join(":");
                }else{
                    varObject[c_name] = {};
                    varObject[c_name][key_name] = value.join(":");
                }
            })
            await setVariable(varObject);
        }
    }catch(error){
        throw error;
    }
}

export async function unSetVariableHandler(argv) {
    const varObjs = [];
    try{
        const {variables} = argv;
        if(variables&&variables.length){
            variables.forEach(v=>{
                const [a,b] = v.split(".").map(s=>s.trim());
                varObjs.push({
                    c_name:b==undefined?"global":a,
                    key:b===undefined?a:b
                })
            })
            await unSetVar(variables);
        }
    }catch(error){
        throw error;
    }
}

export async function listVariableHandler(argv){
    try{
        const content = await readFile();
        console.log(theme.success(content));
    }catch(error){
        throw error;
    }
}