class CliError extends Error{
    constructor({isKnown=false,message,type="error"}){
        super(message);
        this.isKnown = isKnown;
        this.message = message;
        this.type = type;
        this.stack = Error.captureStackTrace(this,this.constructor);
    }
}

export default CliError;