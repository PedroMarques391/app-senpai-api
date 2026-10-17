import {
  GROUP_ITEM_STATUSES,
  GROUP_REQUEST_TYPES,
  groupItemSchema,
  groupItemStatusSchema,
  groupRequestTypeSchema,
  groupSchema,
  type GroupItemStatus,
  type GroupRequestType,
} from "@/schemas";
import z from "zod";

export const insertGroupSchema = groupSchema.omit({ _id: true });
export type Group = z.infer<typeof groupSchema>;
export type GroupItem = z.infer<typeof groupItemSchema>;
export type CreateGroupPayload = z.input<typeof insertGroupSchema>;
export {
  GROUP_ITEM_STATUSES,
  GROUP_REQUEST_TYPES,
  groupItemStatusSchema,
  groupRequestTypeSchema,
  type GroupItemStatus,
  type GroupRequestType,
};

export interface GroupModerationItem {
  groupId: string;
  itemId: string;
  title: string;
  url: string;
  status: GroupItemStatus;
  requestType: GroupRequestType;
  requestedAt: Date;
  userId: string;
  userName: string;
}

export interface GroupModerationPageResult {
  items: GroupModerationItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}



