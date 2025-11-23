import CliError from "../utils/Error.mjs";


const collection_args = (yargs)=>{
    return yargs    
            .positional("action",{
                describle:"create | save | list | show",
                type:'string',
            })
            .positional("name",{
                describe:"collection name",
                type:"string"
            })
            .positional("request",{
                describe:"Request name {used in save}",
                type:"string"
            })
            .option("method",{
                alias:"X",
                default:"GET",
                type:"string",
                describe:"Http method to use. ALLOWED: GET,PUT,POST,DELETE. DEFAULT:GET"
            })
            .option("data",{
                alias:"d",
                type:"string",
                describe:"Request body in json format (use with POST or PUT). EXAMPLE '{\"key\":\"value\"}'"
            })
            .option("header",{
                alias:"H",
                type:"array",
                describe:"Custom header. Use Multiple -H option or an array. Format: 'key:value'. EXAMPLE -H 'Authorization:<Token>'"
            })
            .option("s_header",{
                alias:"i",
                type:"boolean",
                describe:"show response header in output."
            })
            .option("raw",{
                type:"boolean",
                describe:"raw body."
            })
            .option("info",{
                type:"boolean",
                describe:"summary"
            })
            .option("debug",{
                type:"boolean",
                describe:"full_dump"
            })
            .example(
                "404ping collection create myapp",
                "Create a new collection!"
            ).example("404ping collection save myapp login -X POST {{host}}/auth/login -d '{\"key\":\"value\"}'"
                ,"Save a request in collection"
            )
            .check((argv)=>{
                if(argv.action){
                    const allowed = ["save","create","list","show"];
                    if(!allowed.includes(argv.action.toLowerCase())){
                        throw new CliError({isKnown:true,message:"Invalid action.[create|save|show|list]!",type:"warn"});
                    }
                }
                if(argv.action==="save"){
                    if(!argv.name || !argv.request) throw new CliError({isKnown:true,message:"Invalid command. command must contain <collection_name> and <request_name>"})
                }
                const allowed = ["GET","PUT","POST","DELETE"];
                if(argv.method){
                    if(!allowed.includes(argv.method.toUpperCase())){
                        throw new CliError({isKnown:true,message:"Invalid HTTP method!",type:"warn"});
                    }
                }

                // validate header
                if(argv.header){
                    argv.header.forEach((h)=>{
                        if(!h.includes(":")){
                            throw new CliError({
                                isKnown:true,message:`Invalid header format: '${h}'. Must be "key:value"`,type:"warn"
                            })
                        }
                        const [key,value] = h.split(":").map(s=>s.trim());
                        if(!key||!value){
                            throw new CliError({
                                isKnown:true,message:`Invalid header: ${h}. key and value cannot be empty`,type:"warn"
                            })
                        }
                    })
                }
                return true;
            })
}

export default collection_args;