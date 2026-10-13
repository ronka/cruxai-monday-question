export interface Member {
  id: string;
  name: string;
  initials: string;
  color: string;
  role: string;
}
export interface Channel {
  id: string;
  name: string;
  description: string;
  members: number;
}
export interface Message {
  id: string;
  channelId: string;
  authorId: string;
  body: string;
  createdAt: string;
  parentId: string | null;
}
export interface SendMessageInput {
  channelId: string;
  body: string;
  parentId?: string;
  clientId: string;
}
