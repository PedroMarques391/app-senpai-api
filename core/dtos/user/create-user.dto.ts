import { User } from "core/models/user.model";

export type CreateUserDto = Omit<User, "_id" | "updatedAt">;
