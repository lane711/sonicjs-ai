import { Context, Next } from "hono";
import { syncCollections } from "../services/collection-sync";
import { MigrationService } from "../services/migrations";
import { PluginBootstrapService } from "../services/plugin-bootstrap";

type Bindings = {
  DB: D1Database;
  KV: KVNamespace;
};

// Track if bootstrap has been run in this worker instance
let bootstrapComplete = false;

/**
 * Bootstrap middleware that ensures system initialization
 * Runs once per worker instance
 */
export function bootstrapMiddleware() {
  return async (c: Context<{ Bindings: Bindings }>, next: Next) => {
    // Skip if already bootstrapped in this worker instance
    if (bootstrapComplete) {
      return next();
    }

    // Skip bootstrap for static assets and health checks
    const path = c.req.path;
    if (
      path.startsWith("/images/") ||
      path.startsWith("/assets/") ||
      path === "/health" ||
      path.endsWith(".js") ||
      path.endsWith(".css") ||
      path.endsWith(".png") ||
      path.endsWith(".jpg") ||
      path.endsWith(".ico")
    ) {
      return next();
    }

    try {
      console.log("[Bootstrap] Starting system initialization...");

      // 1. Run database migrations first
      console.log("[Bootstrap] Running database migrations...");
      const migrationService = new MigrationService(c.env.DB);
      await migrationService.runPendingMigrations();

      // 2. Sync collection configurations
      console.log("[Bootstrap] Syncing collection configurations...");
      try {
        await syncCollections(c.env.DB);
      } catch (error) {
        console.error("[Bootstrap] Error syncing collections:", error);
        // Continue bootstrap even if collection sync fails
      }

      // 3. Bootstrap core plugins
      console.log("[Bootstrap] Bootstrapping core plugins...");
      const bootstrapService = new PluginBootstrapService(c.env.DB);

      // Check if bootstrap is needed
      const needsBootstrap = await bootstrapService.isBootstrapNeeded();
      if (needsBootstrap) {
        await bootstrapService.bootstrapCorePlugins();

        // Optionally install demo plugins
        // Note: process.env is not available in Cloudflare Workers
        // You can use a KV flag or environment binding to control this
        console.log("[Bootstrap] Installing demo plugins...");
        await bootstrapService.installDemoPlugins();
      }

      // Mark bootstrap as complete for this worker instance
      bootstrapComplete = true;
      console.log("[Bootstrap] System initialization completed");
    } catch (error) {
      console.error("[Bootstrap] Error during system initialization:", error);
      // Don't prevent the app from starting, but log the error
    }

    return next();
  };
}

/**
 * Reset bootstrap flag (useful for testing)
 */
export function resetBootstrap() {
  bootstrapComplete = false;
}
