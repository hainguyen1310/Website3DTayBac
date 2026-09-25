import { nodeHandler } from "../server/http.ts";
import { mailSync } from "../server/email/sync.ts";
export default nodeHandler(mailSync);
