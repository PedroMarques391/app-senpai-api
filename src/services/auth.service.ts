import type { CreateUserDto } from "@/dtos/user/create-user.dto";
import type { User } from "@/models/user.model";
import type { UserRepository } from "@/models/user.repository.model";
import type {
  AuthResult,
  OtpSecret,
  SendOtpResult,
  ServiceResponse,
} from "@/types/auth.types";
import type { JWT } from "@/utils/JWT";
import { OTP } from "@/utils/OTP";
import { Password } from "@/utils/Password";

export class AuthService {
  constructor(
    private readonly userRepository: Pick<
      UserRepository,
      "findByWAId" | "create" | "update"
    >,
    private readonly jwtUtils: JWT,
  ) {}

  async generateOTP(): Promise<OtpSecret> {
    const code = OTP.generateOTP();
    const expires_at = OTP.generateExpiresAt();

    return {
      code,
      expires_at,
    };
  }

  async sendOTP(waId: string): Promise<ServiceResponse<SendOtpResult>> {
    const user = await this.userRepository.findByWAId(waId);

    if (!user || !user.premium) {
      return {
        success: false,
        userExists: !!user,
        message:
          "Ok, we have your whatsapp number. Now you must finish your account creation.",
      };
    }

    const otp = await this.generateOTP();
    user.otp_secret = { ...otp };
    await this.userRepository.update(waId, user);

    return {
      success: true,
      data: {
        otp: otp.code,
        wa_id: user.wa_id,
      },
    };
  }

  async verifyOtpAndLogin(waId: string, otpCode: string): Promise<AuthResult> {
    const user = await this.userRepository.findByWAId(waId);
    if (!user) {
      throw new Error("User not found");
    }

    if (
      !user.otp_secret ||
      user.otp_secret.code !== otpCode ||
      user.otp_secret.expires_at < new Date()
    ) {
      throw new Error("Invalid or expired OTP");
    }

    user.otp_secret = undefined;

    user.last_login = new Date();
    await this.userRepository.update(waId, user);

    const token = this.jwtUtils.generateJWT({
      wa_id: user.wa_id,
      name: user.name,
      userName: user.userName,
      premium: user.premium,
    });

    return { user, token };
  }

  async loginWithPassword(
    waId: string,
    passwordString: string,
  ): Promise<AuthResult> {
    const user = await this.userRepository.findByWAId(waId);
    if (!user) {
      throw new Error("User not found");
    }

    if (!user.email || !user.password) {
      throw new Error("This user does not have a email or password configured");
    }

    const isMatch = await Password.compare(passwordString, user.password);
    if (!isMatch) {
      throw new Error("Invalid credentials");
    }

    user.last_login = new Date();
    await this.userRepository.update(waId, user);

    const token = this.jwtUtils.generateJWT({
      wa_id: user.wa_id,
      name: user.name,
      userName: user.userName,
      premium: user.premium,
    });

    return { user, token };
  }

  async signup(waId: string, userData: CreateUserDto): Promise<User | null> {
    const user = await this.userRepository.findByWAId(waId);
    if (user) {
      throw new Error("User already exists");
    }

    if (userData.password) {
      userData.password = await Password.hash(userData.password);
    }

    return this.userRepository.create({
      ...userData,
    });
  }
}
