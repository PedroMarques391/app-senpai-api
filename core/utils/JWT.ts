import type { JWT as FastifyJWT } from "@fastify/jwt";

export class JWT {
  constructor(private readonly jwtInstance: FastifyJWT) {}

  generateJWT(payload: object): string {
    return this.jwtInstance.sign(payload);
  }

  verifyJWT(token: string) {
    return this.jwtInstance.verify(token);
  }
}
