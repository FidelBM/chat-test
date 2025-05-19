export interface GroupMember {
  userId: string;
  role: "admin" | "writer" | string; // puedes agregar más roles según tu lógica
  _id: string;
}

export interface ChatGroup {
  _id: string;
  isGroup: boolean;
  name: string;
  image: string;
  members: GroupMember[];
  lastMessageId: string | null;
  createdAt: string; // o Date, si lo parseas
  updatedAt: string; // o Date
  __v: number;
  description?: string; // opcional por si no siempre viene
}
