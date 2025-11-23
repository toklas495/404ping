

const unSetArgs = (yargs)=>{
    return yargs
          .usage("Usage: 404ping unset <variable>")
          .positional("variables",{
            type:"array",
            describe:"unset variables from <variable.json>. Example host token",
            demandOption:true
          })
          .example(
            "404ping unset host token",
            "unset token and host"
          )
}

export default unSetArgs;