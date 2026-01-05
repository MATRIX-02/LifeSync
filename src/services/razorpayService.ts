import axios from "axios";

/**
 * Razorpay Payment Service
 * Handles all payment operations through Razorpay API
 */

export interface RazorpayOrderParams {
	userId: string;
	planId: string;
	amount: number; // in paise (multiply by 100)
	planName: string;
	billingCycle: "monthly" | "yearly";
	couponId?: string;
	userEmail: string;
	userName: string;
}

export interface RazorpayOrder {
	id: string;
	entity: string;
	amount: number;
	amount_paid: number;
	amount_due: number;
	currency: string;
	receipt: string;
	offer_id: string | null;
	status: string;
	attempts: number;
	notes: Record<string, any>;
	created_at: number;
}

export interface RazorpayPayment {
	razorpay_payment_id: string;
	razorpay_order_id: string;
	razorpay_signature: string;
}

class RazorpayService {
	private apiKey: string;
	private apiSecret: string;

	constructor() {
		this.apiKey = process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || "";
		this.apiSecret = process.env.EXPO_PUBLIC_RAZORPAY_KEY_SECRET || "";

		if (!this.apiKey) {
			console.warn(
				"Razorpay Key ID not configured. Set EXPO_PUBLIC_RAZORPAY_KEY_ID"
			);
		}
	}

	/**
	 * Create a Razorpay order for subscription
	 * Note: Order creation should be done from your backend for security
	 */
	async createOrder(params: RazorpayOrderParams): Promise<RazorpayOrder> {
		try {
			// This endpoint should be in your Supabase Edge Function or backend
			const response = await axios.post(
				`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/razorpay-create-order`,
				{
					userId: params.userId,
					planId: params.planId,
					amount: params.amount,
					planName: params.planName,
					billingCycle: params.billingCycle,
					couponId: params.couponId,
					userEmail: params.userEmail,
					userName: params.userName,
				},
				{
					headers: {
						"Content-Type": "application/json",
					},
				}
			);

			return response.data;
		} catch (error) {
			console.error("Error creating Razorpay order:", error);
			throw error;
		}
	}

	/**
	 * Verify payment signature
	 * Should be called from your backend
	 */
	async verifyPayment(payment: RazorpayPayment): Promise<boolean> {
		try {
			const response = await axios.post(
				`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/razorpay-verify`,
				payment,
				{
					headers: {
						"Content-Type": "application/json",
					},
				}
			);

			return response.data.valid === true;
		} catch (error) {
			console.error("Error verifying payment:", error);
			return false;
		}
	}

	/**
	 * Get Razorpay Key ID for frontend integration
	 */
	getKeyId(): string {
		return this.apiKey;
	}

	/**
	 * Create a customer in Razorpay for recurring subscriptions
	 */
	async createCustomer(email: string, name: string, contact: string) {
		try {
			const response = await axios.post(
				"https://api.razorpay.com/v1/customers",
				{
					email,
					name,
					contact,
				},
				{
					auth: {
						username: this.apiKey,
						password: this.apiSecret,
					},
				}
			);

			return response.data;
		} catch (error) {
			console.error("Error creating Razorpay customer:", error);
			throw error;
		}
	}
}

export const razorpayService = new RazorpayService();
