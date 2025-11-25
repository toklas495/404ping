#!/usr/bin/env node
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import builder from './src/build.mjs' 
import {collectionArgs, requestArgs,setArgs,unSetArgs,runFromCollectionYargs} from './src/yarg_args/indexArgs.mjs';
import CliError from "./src/utils/Error.mjs";
import errorHandler from "./src/utils/errorHandler.mjs";

// initialize 
await builder.init();

yargs(hideBin(process.argv))
  .scriptName("404ping")
  .usage("$0 <cmd> [args]")
  .command(
    "$0",
    "Show Ascii Banner",
    ()=>{},
    ()=>{
      import("./src/utils/banner.mjs").then(m=>m.default());
    }
  )// send request with request command
  .command(
    "request <url>",
    "Send HTTP Request",
    requestArgs,
    async (argv) => {
      await builder.requestHandler(argv);
    }
  ) // set variable
  .command("vars","List all variables",()=>{},async(argv)=>{await builder.listVariableHandler(argv)}) 
  .command(
    "set <variables..>", // note the ".." to make it an array
    "Set Variables",
    setArgs,
    async (argv) => {
      await builder.setVariableHandler(argv);
    }
  )//  unset command
  .command(
    "unset <variables..>",
    "unset variables",
    unSetArgs,
    async(argv)=>{
      await builder.unSetVariableHandler(argv);
    }
  )// collection command
  .command(
    "collection <action> [name] [request]",
    "manage request collections",
    collectionArgs,
    async(argv)=>{
      // await builder
      await builder.collectionHandler(argv);
    }
  ) 
  .command(
    "run <collection_request>",
    "Run a saved request from collection {format- collection:request}",
    runFromCollectionYargs,
    async(argv)=>{
      await builder.runRequestFromCollection(argv);
    }
  )
  .command(
    "raw "
  )
  .fail((msg, err, yargsInstance) => {
    // Print only the error message (curl-style)
    try{
      if(err instanceof CliError) throw err;
      throw new CliError({isKnown:true,message:msg||err?.message,type:"warn"}); 
    }catch(error){
      errorHandler(error);
    }
  })
  .help()
  .parse();
