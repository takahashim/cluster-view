import { define } from "@/utils.ts";
import { getGoogleUserInfo, handleCallback } from "@/lib/auth.ts";
import { getOrCreateUser } from "@/lib/repository.ts";
import { getStore } from "@/lib/store.ts";

export const handler = define.handlers({
  async GET(ctx) {
    const { response, tokens, sessionId } = await handleCallback(ctx.req);

    if (tokens?.accessToken && sessionId) {
      // Fetch Google user profile
      const googleProfile = await getGoogleUserInfo(tokens.accessToken);

      // Get or create user in our database
      const user = await getOrCreateUser(googleProfile);

      // Map session to user ID for later lookup
      const store = getStore();
      await store.saveSessionUserId(sessionId, user.id);
    }

    return response;
  },
});
