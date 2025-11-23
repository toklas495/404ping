import os from 'os';
import path from "path";

function resolveHome(filepath){
    if(filepath.startsWith("~")){
        return path.join(os.homedir(),filepath.slice(1));
    }
    return filepath;
}

export default resolveHome;