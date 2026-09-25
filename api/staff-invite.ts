import { nodeHandler } from "../server/http.ts";
import { staffInvite } from "../server/staff-invite.ts";
export default nodeHandler(staffInvite);
