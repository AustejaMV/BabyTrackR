import { serverUrl } from "./supabase";

export interface VillageGroup {
  id: string;
  shortcode: string;
  name: string;
  createdBy?: string;
  createdAt: number;
}

export interface VillageGroupMessage {
  id: string;
  senderId: string;
  content: string;
  sentAt: number;
}

export interface VillageBoardItem {
  id: string;
  title: string;
  body: string;
  createdBy?: string;
  createdAt: number;
  pinned?: boolean;
}

export async function fetchMyGroups(token: string): Promise<VillageGroup[]> {
  const res = await fetch(`${serverUrl}/village/groups/mine`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("fetch_groups_failed");
  const data = (await res.json()) as { groups?: VillageGroup[] };
  return data.groups ?? [];
}

export async function createGroup(token: string, name: string): Promise<{ id: string; shortcode: string }> {
  const res = await fetch(`${serverUrl}/village/groups`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name: name.trim().slice(0, 60) }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? "create_group_failed");
  }
  const data = (await res.json()) as { id: string; shortcode: string };
  return data;
}

export async function joinGroupByShortcode(token: string, shortcode: string): Promise<{ id: string; shortcode: string }> {
  const res = await fetch(`${serverUrl}/village/groups/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ shortcode: shortcode.trim().toLowerCase().slice(0, 8) }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? "join_failed");
  }
  const data = (await res.json()) as { id: string; shortcode: string };
  return data;
}

export async function fetchGroupMessages(token: string, groupId: string): Promise<VillageGroupMessage[]> {
  const res = await fetch(`${serverUrl}/village/groups/${groupId}/messages`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("fetch_messages_failed");
  const data = (await res.json()) as { messages?: VillageGroupMessage[] };
  return (data.messages ?? []).sort((a, b) => a.sentAt - b.sentAt);
}

export async function sendGroupMessage(token: string, groupId: string, content: string): Promise<{ id: string }> {
  const res = await fetch(`${serverUrl}/village/groups/${groupId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ content: content.trim().slice(0, 2000) }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? "send_failed");
  }
  const data = (await res.json()) as { id: string };
  return data;
}

export async function fetchGroupBoard(token: string, groupId: string): Promise<VillageBoardItem[]> {
  const res = await fetch(`${serverUrl}/village/groups/${groupId}/board`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("fetch_board_failed");
  const data = (await res.json()) as { items?: VillageBoardItem[] };
  return data.items ?? [];
}

export async function addBoardItem(
  token: string,
  groupId: string,
  params: { title: string; body: string }
): Promise<{ id: string }> {
  const res = await fetch(`${serverUrl}/village/groups/${groupId}/board`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ title: params.title.trim().slice(0, 100), body: (params.body ?? "").trim().slice(0, 500) }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? "add_board_failed");
  }
  const data = (await res.json()) as { id: string };
  return data;
}
