import CliError from "./Error.mjs"
import theme from "./theme.mjs"

const errorHandler = (error)=>{
    const isKnown = error instanceof CliError && error.isKnown;
    if(isKnown){
        const {message,type} = error;
        if(type==="warn") console.log(theme.warning(`404ping: ${message}`));
        if(type==="error") console.log(theme.error(`404ping: ${message}`));
        process.exit(0);
    }

    const message = error?.message||"something went wrong!";
    const stack = error?.stack;
    console.log(theme.error(`404ping: ${message}\r\n\tstack:${stack}`));
    process.exit(1);
}

export default errorHandler;