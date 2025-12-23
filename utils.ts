import { createDefine } from "fresh";
import type { I18nState } from "@/lib/i18n/index.ts";

/** Fresh context state with i18n support */
export type State = I18nState;

export const define = createDefine<State>();
