import theme from "./theme.mjs";

export default function banner() {
  console.log(`
    ${theme.default(`
    ██  ██ ███████ ██   ██ 
    ██  ██ ██   ██ ██   ██      
    ██████ ██   ██ ███████
        ██ ██   ██      ██   
        ██ ███████      ██  
`)}
    ${theme.warning("⚡ 404ping — Fast API & Curl-style tester")}
    ${theme.warning("Like an ant, 404ping never gets tired — it just keeps working.")}
    ${theme.error("by @toklas495")}`);
}