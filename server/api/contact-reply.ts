import { nodeHandler } from "../http.ts";
import { contactReply } from "../email/reply.ts";

export default nodeHandler(contactReply);
