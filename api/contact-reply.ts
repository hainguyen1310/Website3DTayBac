import { nodeHandler } from "../server/http.ts";
import { contactReply } from "../server/email/reply.ts";
export default nodeHandler(contactReply);
