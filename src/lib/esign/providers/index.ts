import { nativeEsignProvider } from "./native";
import type { EsignProvider } from "../types";

/** v1 always uses the native CAALM provider. DocuSign can plug in later. */
export function getEsignProvider(): EsignProvider {
	return nativeEsignProvider;
}

export { nativeEsignProvider };
