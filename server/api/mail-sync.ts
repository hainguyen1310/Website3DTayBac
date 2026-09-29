import { nodeHandler } from "../http.ts";
import { mailSync } from "../email/sync.ts";

export default nodeHandler(mailSync);
