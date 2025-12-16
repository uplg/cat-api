import { Elysia, t } from "elysia";
import { jwt } from "@elysiajs/jwt";

// 👤 Hard-coded users (simple auth for now)
const USERS = [
  { id: "1", username: "admin", password: "catadmin123", role: "admin" },
  { id: "2", username: "user", password: "catuser123", role: "user" },
];

// JWT Secret (should be in .env in production)
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-cat-key-change-me";

export function createAuthRoutes() {
  return new Elysia({ prefix: "/auth" })
    .use(
      jwt({
        name: "jwt",
        secret: JWT_SECRET,
        exp: "7d",
      })
    )
    .post(
      "/login",
      async ({ body, jwt, set }) => {
        const { username, password } = body;

        const user = USERS.find(
          (u) => u.username === username && u.password === password
        );

        if (!user) {
          set.status = 401;
          return {
            success: false,
            error: "Invalid username or password",
          };
        }

        const token = await jwt.sign({
          userId: user.id,
          username: user.username,
          role: user.role,
        });

        return {
          success: true,
          token,
          user: {
            id: user.id,
            username: user.username,
            role: user.role,
          },
        };
      },
      {
        body: t.Object({
          username: t.String({ minLength: 1 }),
          password: t.String({ minLength: 1 }),
        }),
      }
    )
    .post("/verify", async ({ headers, jwt, set }) => {
      const authHeader = headers.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        set.status = 401;
        return {
          success: false,
          error: "No token provided",
        };
      }

      const token = authHeader.substring(7);

      try {
        const payload = await jwt.verify(token);

        if (!payload) {
          set.status = 401;
          return {
            success: false,
            error: "Invalid token",
          };
        }

        return {
          success: true,
          user: {
            id: payload.userId,
            username: payload.username,
            role: payload.role,
          },
        };
      } catch {
        set.status = 401;
        return {
          success: false,
          error: "Invalid token",
        };
      }
    })
    .post("/logout", () => {
      return {
        success: true,
        message: "Logged out successfully",
      };
    });
}

// Middleware to protect routes - REQUIRES authentication
export function createAuthMiddleware() {
  return new Elysia()
    .use(
      jwt({
        name: "jwt",
        secret: JWT_SECRET,
      })
    )
    .onBeforeHandle(async ({ headers, jwt, set }) => {
      const authHeader = headers.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        set.status = 401;
        return {
          success: false,
          error: "Authentication required",
        };
      }

      const token = authHeader.substring(7);

      try {
        const payload = await jwt.verify(token);
        if (!payload) {
          set.status = 401;
          return {
            success: false,
            error: "Invalid or expired token",
          };
        }
      } catch {
        set.status = 401;
        return {
          success: false,
          error: "Invalid or expired token",
        };
      }
    })
    .derive(async ({ headers, jwt }) => {
      const authHeader = headers.authorization;
      const token = authHeader?.substring(7) || "";

      try {
        const payload = await jwt.verify(token);
        if (payload) {
          return {
            user: {
              id: payload.userId as string,
              username: payload.username as string,
              role: payload.role as string,
            },
          };
        }
      } catch {
        // Already handled in onBeforeHandle
      }

      return { user: null };
    });
}
