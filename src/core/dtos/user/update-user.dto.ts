import { CreateUserDto } from "@core/dtos/user/create-user.dto";

export type UpdateUserDto = Partial<Omit<CreateUserDto, "wa_id">>;
