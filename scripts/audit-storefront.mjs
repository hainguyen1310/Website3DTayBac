/** Read-only readiness snapshot. Never creates orders, sends mail, or writes a DB. */
import { loadEnv } from "vite";
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "node:fs";

const env = loadEnv(process.env.AUDIT_MODE || "development", process.cwd(), "");
const url = env.VITE_SUPABASE_URL;
const client = createClient(url, env.VITE_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15000) }) } });
const result = { checkedAt: new Date().toISOString(), databaseHost: new URL(url).host, checks: {} };
const checks = await Promise.allSettled([
  client.from("products").select("slug,name,price_vnd,weight_label,active,image_url").eq("active", true),
  client.from("articles").select("slug,title,published_at").eq("published",true).lte("published_at",new Date().toISOString()),
  client.from("site_settings").select("key,value").eq("is_public",true).in("key",["website_content","commerce"]),
  ...["orders","customers","contact_messages","profiles"].map(table => client.from(table).select("id").limit(1)),
]);
const names = ["catalog","articles","publicSettings","anonymousOrders","anonymousCustomers","anonymousContacts","anonymousProfiles"];
checks.forEach((entry,index) => {
  const name = names[index];
  if (entry.status === "rejected") { result.checks[name] = { reachable:false, error: entry.reason?.message }; return; }
  const {data,error,status} = entry.value;
  if (error) { result.checks[name] = { status, error:error.code, message:error.message }; return; }
  if (index === 0 || index === 1) result.checks[name] = {status,count:data.length,items:data};
  else if (index === 2) {
    const content = data.find(row => row.key === "website_content")?.value || {};
    result.checks[name] = {status, commerce:data.find(row=>row.key==="commerce")?.value || null, contactConfigured:Object.fromEntries(["phone","email","address","hours"].map(key=>[key,Boolean(content[`contact.${key}`])])), socialConfigured:Object.fromEntries(["facebook","instagram","youtube","tiktok"].map(key=>[key,Boolean(content[`social.${key}`])])), reviewsMode:content["reviews.mode"] || "sample (default)"};
  } else result.checks[name] = {status, visibleRows:data.length, note:"Zero rows does not prove RLS if the table is empty; authenticated role tests are separate."};
});
result.serverEnvironment = Object.fromEntries(["SUPABASE_SERVICE_ROLE_KEY","SMTP_HOST","SMTP_USER","SMTP_PASSWORD","IMAP_HOST","IMAP_USER","IMAP_PASSWORD","APP_ORIGIN"].map(key=>[key,Boolean(env[key] || process.env[key])]));
result.exposedSecretVariableNames = Object.keys(env).filter(key => /^VITE_/.test(key) && /SERVICE_ROLE|PASSWORD|SECRET|PRIVATE_KEY/.test(key));
result.remoteColumns = await Promise.all([
  ["products","model_url"], ["orders","request_id,stock_deducted,recipient_name"], ["profiles","staff_scope"], ["contact_messages","reply_token,customer_id,topic"],
].map(async ([table,columns]) => {
  const {error,status}=await client.from(table).select(columns).limit(0);
  return {table,columns,status,...(error ? {error:error.code,message:error.message} : {})};
}));
try {
  const response = await fetch(`${url}/rest/v1/`, { headers:{apikey:env.VITE_SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${env.VITE_SUPABASE_PUBLISHABLE_KEY}`}, signal:AbortSignal.timeout(15000) });
  const schema = await response.json();
  result.publicApiSchema = response.ok ? {
    status:response.status,
    checkoutParameters: Object.keys(schema.paths?.["/rpc/create_checkout_order"]?.post?.parameters?.find(item=>item.in==="body")?.schema?.properties || {}),
    contactParameters: Object.keys(schema.paths?.["/rpc/submit_contact_message"]?.post?.parameters?.find(item=>item.in==="body")?.schema?.properties || {}),
    productModelColumn: Boolean(schema.definitions?.products?.properties?.model_url),
    operationalTables: Object.fromEntries(["contact_entries","order_returns","admin_audit_log"].map(table=>[table, Boolean(schema.definitions?.[table])])),
  } : { status:response.status, note:"Schema could not be inspected; missing fields and migrations cannot be inferred." };
} catch (error) { result.publicApiSchema={error:error.message}; }
result.http = await Promise.all(["http://localhost:5173/api/contact-reply","http://localhost:5173/api/mail-sync","https://website3dtaybac.vercel.app/","https://website3dtaybac.vercel.app/tin-tuc","https://website3dtaybac.vercel.app/api/contact-reply"].map(async target=> {
  try {
    const response=await fetch(target,{signal:AbortSignal.timeout(15000)});
    const html = response.headers.get("content-type")?.includes("text/html") ? await response.text() : "";
    return {url:target,status:response.status,contentType:response.headers.get("content-type"),...(html ? {title:html.match(/<title>(.*?)<\/title>/s)?.[1]} : {})};
  } catch(error) { return {url:target,error:error.message}; }
}));
mkdirSync("test-results",{recursive:true});
writeFileSync("test-results/storefront-readiness.json",JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
