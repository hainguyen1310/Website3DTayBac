import { supabase } from "../utils/supabase";
import { invalidateCache } from "./cache";
import type {
  CONTACT_TOPICS,
  PRIORITIES,
  CUSTOMER_STAGES,
  CUSTOMER_SOURCES,
  DELIVERY_LABELS,
} from "../operations";
import type { ContactStatus } from "./adminApi";
export type Customer = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  default_address: string | null;
  company: string;
  source: keyof typeof CUSTOMER_SOURCES;
  stage: keyof typeof CUSTOMER_STAGES;
  tags: string[];
  internal_note: string;
  marketing_consent: boolean;
  consent_at: string | null;
  created_at: string;
  last_seen_at: string;
  orders: {
    id: string;
    order_number: string;
    total_vnd: number;
    status: string;
    payment_status: string;
    created_at: string;
  }[];
  contact_messages: {
    id: string;
    subject: string;
    status: ContactStatus;
    last_message_at: string;
  }[];
};
export type CustomerForm = Pick<
  Customer,
  | "full_name"
  | "email"
  | "phone"
  | "default_address"
  | "company"
  | "stage"
  | "tags"
  | "internal_note"
>;
export type Ticket = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  topic: keyof typeof CONTACT_TOPICS;
  status: ContactStatus;
  priority: keyof typeof PRIORITIES;
  source: string;
  customer_id: string | null;
  assigned_to: string | null;
  order_reference: string | null;
  created_at: string;
  last_message_at: string;
};
export type Entry = {
  id: string;
  contact_id: string;
  direction: "inbound" | "outbound" | "note";
  body: string;
  sender_name: string;
  sender_email: string | null;
  recipient_email: string | null;
  status: keyof typeof DELIVERY_LABELS;
  error: string | null;
  created_at: string;
  sent_at: string | null;
};
const check = (error: { message: string } | null) => {
  if (error) throw new Error(error.message);
};
async function allRows<T>(
  table: string,
  select: string,
  order: string,
): Promise<T[]> {
  const rows: T[] = [];
  for (let start = 0; ; start += 500) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .order(order, { ascending: false })
      .order("id")
      .range(start, start + 499);
    check(error);
    rows.push(...((data ?? []) as T[]));
    if ((data?.length ?? 0) < 500) return rows;
  }
}
export function listCustomers() {
  return allRows<Customer>(
    "customers",
    "id,full_name,email,phone,default_address,company,source,stage,tags,internal_note,marketing_consent,consent_at,created_at,last_seen_at,orders(id,order_number,total_vnd,status,payment_status,created_at),contact_messages(id,subject,status,last_message_at)",
    "last_seen_at",
  );
}
export async function saveCustomer(id: string | null, input: CustomerForm) {
  const payload = {
    company: input.company.trim(),
    stage: input.stage,
    tags: [...new Set(input.tags.map(tag=>tag.trim()).filter(Boolean))],
    internal_note: input.internal_note.trim(),
    full_name: input.full_name.trim(),
    email: input.email?.trim().toLowerCase() || null,
    phone: input.phone?.trim() || null,
    default_address: input.default_address?.trim() || null,
  };
  const query = id
    ? supabase.from("customers").update(payload).eq("id", id)
    : supabase.from("customers").insert({ ...payload, source: "manual" });
  const { data, error } = await query.select("id").single();
  check(error);
  invalidateCache();
  return data!.id as string;
}
export const listTickets = () =>
  allRows<Ticket>(
    "contact_messages",
    "id,name,email,phone,subject,message,topic,status,priority,source,customer_id,assigned_to,order_reference,created_at,last_message_at",
    "last_message_at",
  );
export const customerOptions = () =>
  allRows<Pick<Customer, "id" | "full_name" | "email" | "phone">>(
    "customers",
    "id,full_name,email,phone",
    "created_at",
  );
export async function linkCustomer(contactId: string, customerId: string) {
  const { error } = await supabase.rpc("link_contact_customer", {
    p_contact_id: contactId,
    p_customer_id: customerId,
  });
  check(error);
  invalidateCache();
}
export async function withdrawConsent(customerId: string) {
  const { error } = await supabase.rpc("withdraw_marketing_consent", {
    p_customer_id: customerId,
  });
  check(error);
  invalidateCache();
}
export async function getTicket(id: string) {
  const { data, error } = await supabase
    .from("contact_messages")
    .select("*")
    .eq("id", id)
    .single();
  check(error);
  return data as Ticket;
}
export async function listEntries(id: string) {
  const { data, error } = await supabase
    .from("contact_entries")
    .select(
      "id,contact_id,direction,body,sender_name,sender_email,recipient_email,status,error,created_at,sent_at",
    )
    .eq("contact_id", id)
    .order("created_at");
  check(error);
  return (data ?? []) as Entry[];
}
export async function listStaff() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,full_name,role,staff_scope")
    .in("role", ["admin", "staff"])
    .order("full_name");
  check(error);
  return (data ?? []) as {
    id: string;
    full_name: string;
    role: string;
    staff_scope: string;
  }[];
}
export async function updateTicket(
  id: string,
  value: Pick<Ticket, "status" | "priority" | "assigned_to" | "topic">,
) {
  const { error } = await supabase
    .from("contact_messages")
    .update(value)
    .eq("id", id)
    .select("id")
    .single();
  check(error);
  invalidateCache();
}
export async function addNote(id: string, body: string) {
  const { error } = await supabase.rpc("add_contact_note", {
    p_contact_id: id,
    p_body: body,
  });
  check(error);
}
async function invoke<T>(name: string, body: unknown): Promise<T> {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) throw new Error("Phiên đăng nhập hết hạn.");
  const response = await fetch(`/api/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.session.access_token}`,
    },
    body: JSON.stringify(body),
  });
  let data: Record<string, unknown>;
  try {
    data = await response.json();
  } catch {
    throw new Error("API email chưa được triển khai trên máy chủ này.");
  }
  if (!response.ok || data.error)
    throw new Error(
      typeof data.error === "string"
        ? data.error
        : "Không kết nối được dịch vụ email.",
    );
  return data as T;
}
export type MailStatus = {
  configured: boolean;
  from: string | null;
  inbound: boolean;
  transport: string;
};
export const getMailStatus = () =>
  invoke<MailStatus>("contact-reply", { action: "status" });
export const sendReply = (contactId: string, id: string, body?: string) =>
  invoke<{ id: string; status: string }>("contact-reply", {
    contactId,
    id,
    body,
  });
export const syncMailbox = () =>
  invoke<{ count: number; remaining: number }>("mail-sync", {});
export const inviteStaff = (value: {
  name: string;
  email: string;
  role: string;
}) => invoke<{ message: string }>("staff-invite", value);
