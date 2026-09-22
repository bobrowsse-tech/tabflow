export type Category =
  | "Work"
  | "Development"
  | "AI"
  | "Research"
  | "Shopping"
  | "Travel"
  | "Finance"
  | "Communication"
  | "Entertainment"
  | "Reading"
  | "Social";

export type Confidence = "high" | "medium" | "low";

export interface TabRecord {
  id: number;
  index: number;
  url: string;
  title: string;
  pinned: boolean;
  groupId: number;
}

export interface Classification {
  category: Category | null;
  confidence: Confidence;
  reason: string;
}

export interface PlannedGroup {
  /** Chrome tab-group title: soft hint label, discovered token, or hostname. */
  category: string;
  tabIds: number[];
  confidence: Confidence;
  reason: string;
}

export interface OrganizationPlan {
  keepTabIds: number[];
  closeTabIds: number[];
  groups: PlannedGroup[];
  ungroupedTabIds: number[];
}

export interface OrganizationSettings {
  preserveGroups: boolean;
  removeDuplicates: boolean;
  groupUngrouped: boolean;
}

export interface UndoGroupSnapshot {
  id: number;
  title?: string;
  color: string;
  tabIds: number[];
}

export interface OrganizationResult {
  totalTabs: number;
  keptTabs: number;
  duplicatesRemoved: number;
  groupsCreated: number;
  leftUngrouped: number;
  partial: boolean;
  error?: string;
}

export interface PopupSummary {
  totalTabs: number;
  duplicates: number;
  /** True when a latest-operation undo snapshot is stored locally. */
  canUndo: boolean;
}
