import { CreateUserDto } from "./create-user.dto";

export type UpdateUserDto = Partial<Omit<CreateUserDto, "wa_id">>;
