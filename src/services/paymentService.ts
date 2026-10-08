// Starts a paid-plan checkout. The app never holds a payment secret, never
// decides the price and never activates a plan:
//
//   1. The app asks the `create-checkout` Edge Function for a checkout URL,
//      sending only WHAT is being bought (plan, cycle, coupon, provider).
//   2. The function prices it from the database, creates the Razorpay payment
//      link / PhonePe order with server-side keys, and returns the hosted URL.
//   3. The user pays in the browser. The provider calls the server's webhook,
//      which verifies the signature and writes user_subscriptions.
//   4. The app re-reads the subscription when the browser closes.
//
// Until that function is deployed, step 1 fails and checkout reports
// "unavailable" - paid plans are then granted by an admin.
import * as WebBrowser from "expo-web-browser";
import { supabaseDirect } from "../config/supabase";

export type PaymentProvider = "razorpay" | "phonepe";

export interface CheckoutRequest {
	planId: string;
	billingCycle: "monthly" | "yearly";
	provider: PaymentProvider;
	couponCode?: string;
}

export type CheckoutResult =
	| { status: "completed" } // browser closed; the caller re-reads the subscription
	| { status: "unavailable" } // payments are not set up on the server
	| { status: "error"; message: string };

export async function startCheckout(
	request: CheckoutRequest,
): Promise<CheckoutResult> {
	const { data, error } = await supabaseDirect.functions.invoke<{
		url?: string;
	}>("create-checkout", { body: request });

	if (error) {
		// FunctionsHttpError carries the response; a missing function is a 404,
		// an unreachable one a FunctionsFetchError (no response at all).
		const status = (error as any)?.context?.status as number | undefined;
		if (status === undefined || status === 404 || status === 503) {
			return { status: "unavailable" };
		}
		return {
			status: "error",
			message: "Could not start the payment. Please try again.",
		};
	}

	if (!data?.url || !data.url.startsWith("https://")) {
		return { status: "error", message: "The payment page could not be opened." };
	}

	await WebBrowser.openBrowserAsync(data.url);
	return { status: "completed" };
}
