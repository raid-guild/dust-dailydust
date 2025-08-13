export interface OnchainNote {
  id: string; // bytes32 hex
  title: string;
  content: string;
  tags: string[];
  owner: string;
  tipJar: string | null;
  createdAt: number;
  updatedAt: number;
  boostUntil: number;
  totalTips: number;
  headerImageUrl: string;
}

export type Coordinates = { x: number; y: number; z: number };

export type NotesListFilters = {
  owner?: string;
  tags?: string[];
  dateFrom?: number; // ms epoch
  dateTo?: number;   // ms epoch
  boostedOnly?: boolean;
  search?: string; // simple ILIKE '%...%'
};

export type Pagination = { limit?: number; offset?: number };

export type WaypointGroup = {
  noteId: string; // bytes32
  groupId: number; // uint16
  color: number; // uint24
  isPublic: boolean;
  name: string;
  description: string;
};

export type WaypointStep = {
  noteId: string;
  groupId: number;
  index: number;
  x: number;
  y: number;
  z: number;
  label: string;
};

export type Route = {
  group: WaypointGroup;
  steps: WaypointStep[];
};
