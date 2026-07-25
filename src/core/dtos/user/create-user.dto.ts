import { User } from "../../models/user.model";

export type CreateUserDto = Omit<User, "_id" | "updatedAt">;
