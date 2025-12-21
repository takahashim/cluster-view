import { createDefine } from "fresh";

// 将来の認証機能で使用予定
export type State = Record<string, never>;

export const define = createDefine<State>();
