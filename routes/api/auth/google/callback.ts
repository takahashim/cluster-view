import { define } from "@/utils.ts";
import { getGoogleUserInfo, handleCallback } from "@/lib/auth.ts";
import { getOrCreateUser } from "@/lib/repository.ts";
import { getStore } from "@/lib/store.ts";

export const handler = define.handlers({
  async GET(ctx) {
    const { response, tokens, sessionId } = await handleCallback(ctx.req);

    if (tokens?.accessToken && sessionId) {
      const googleProfile = await getGoogleUserInfo(tokens.accessToken);
      const user = await getOrCreateUser(googleProfile);
      const store = getStore();
      await store.saveSession(sessionId, user.id);
    }

    return response;
  },
});
