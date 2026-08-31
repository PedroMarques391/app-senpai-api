import type { FastifyPluginAsync } from "fastify";
import { adminContentRoutes } from "./admin-content.router";
import { adminUserRoutes } from "./admin-user.router";

export const adminRouter: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", app.authenticate);
  app.addHook("preHandler", app.requireAdmin("admin", "moderator"));

  app.register(adminUserRoutes, { prefix: "/users" });
  app.register(adminContentRoutes, { prefix: "/contents" });
};
