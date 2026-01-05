import axios from "axios";
import CryptoJS from "crypto-js";

/**
 * PhonePe Payment Service
 * Handles UPI payments and PhonePe app payments
 * Available in India with free integration
 */

export interface PhonePePaymentParams {
	userId: string;
	planId: string;
	amount: number; // in paise (multiply by 100)
	planName: string;
	billingCycle: "monthly" | "yearly";
	couponId?: string;
	userEmail: string;
	userName: string;
	userPhone: string; // Required for PhonePe
}

export interface PhonePeOrder {
	success: boolean;
	code: string;
	message: string;
	data: {
		merchantId: string;
		merchantTransactionId: string;
		instrumentResponse: {
			redirectMode: string;
			redirectUrl: string;
		};
	};
}

export interface PhonePeCallback {
	success: boolean;
	code: string;
	message: string;
	data: {
		merchantId: string;
		merchantTransactionId: string;
		transactionId: string;
		amount: number;
		state: string;
		responseCode: string;
		paymentInstrument: {
			type: string;
			utr?: string;
		};
	};
}

class PhonePeService {
	private merchantId: string;
	private apiKey: string;
	private environment: "SANDBOX" | "PRODUCTION";
	private apiEndpoint: string;

	constructor() {
		this.merchantId = process.env.EXPO_PUBLIC_PHONEPE_MERCHANT_ID || "";
		this.apiKey = process.env.EXPO_PUBLIC_PHONEPE_API_KEY || "";
		this.environment = (process.env.EXPO_PUBLIC_PHONEPE_ENV || "SANDBOX") as
			| "SANDBOX"
			| "PRODUCTION";

		// PhonePe API endpoints
		if (this.environment === "SANDBOX") {
			this.apiEndpoint = "https://api-sandbox.phonepe.com/apis/hermes";
		} else {
			this.apiEndpoint = "https://api.phonepe.com/apis/hermes";
		}

		if (!this.merchantId || !this.apiKey) {
			console.warn(
				"PhonePe credentials not configured. Set EXPO_PUBLIC_PHONEPE_MERCHANT_ID and EXPO_PUBLIC_PHONEPE_API_KEY"
			);
		}
	}

	/**
	 * Create a PhonePe payment request
	 * Returns URL for user to complete payment
	 */
	async createPayment(params: PhonePePaymentParams): Promise<PhonePeOrder> {
		try {
			const merchantTransactionId = `TXN_${params.userId}_${Date.now()}`;

			const payload = {
				merchantId: this.merchantId,
				merchantTransactionId,
				merchantUserId: params.userId,
				amount: params.amount, // in paise
				redirectUrl: `${process.env.EXPO_PUBLIC_SUPABASE_URL}/auth/v1/callback?provider=phonepe&txn=${merchantTransactionId}`,
				redirectMode: "REDIRECT",
				callbackUrl: `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/phonepe-callback`,
				mobileNumber: params.userPhone,
				paymentInstrument: {
					type: "UPI_INTENT",
				},
				deviceContext: {
					deviceOS: "ANDROID",
				},
			};

			const payloadString = JSON.stringify(payload);
			const checksum = this.generateChecksum(payloadString);

			const response = await axios.post(
				`${this.apiEndpoint}/pg/v1/pay`,
				{
					request: Buffer.from(payloadString).toString("base64"),
				},
				{
					headers: {
						"Content-Type": "application/json",
						"X-VERIFY": checksum,
					},
				}
			);

			if (response.data.success) {
				// Store transaction metadata
				await this.storeTransactionMetadata(
					merchantTransactionId,
					params.userId,
					params.planId,
					params.amount,
					params.couponId
				);
			}

			return response.data;
		} catch (error) {
			console.error("Error creating PhonePe payment:", error);
			throw error;
		}
	}

	/**
	 * Check payment status
	 */
	async checkPaymentStatus(merchantTransactionId: string): Promise<boolean> {
		try {
			const checksum = this.generateChecksum(
				`/pg/v1/status/${this.merchantId}/${merchantTransactionId}`
			);

			const response = await axios.get(
				`${this.apiEndpoint}/pg/v1/status/${this.merchantId}/${merchantTransactionId}`,
				{
					headers: {
						"Content-Type": "application/json",
						"X-VERIFY": checksum,
					},
				}
			);

			return response.data.success && response.data.code === "PAYMENT_SUCCESS";
		} catch (error) {
			console.error("Error checking PhonePe payment status:", error);
			return false;
		}
	}

	/**
	 * Verify callback from PhonePe
	 */
	verifyCallback(
		responseBody: string,
		checksum: string
	): { valid: boolean; data: PhonePeCallback | null } {
		try {
			const calculatedChecksum = this.generateChecksum(responseBody, true);

			if (checksum !== calculatedChecksum) {
				return { valid: false, data: null };
			}

			const decodedData = JSON.parse(
				Buffer.from(responseBody, "base64").toString("utf-8")
			);
			return { valid: true, data: decodedData };
		} catch (error) {
			console.error("Error verifying PhonePe callback:", error);
			return { valid: false, data: null };
		}
	}

	/**
	 * Generate checksum for PhonePe requests
	 */
	private generateChecksum(
		payload: string,
		isCallback: boolean = false
	): string {
		let checksumInput: string;

		if (isCallback) {
			// For callback verification: payload###key
			checksumInput = `${payload}###${this.apiKey}`;
		} else {
			// For request: payload###key
			checksumInput = `${payload}###${this.apiKey}`;
		}

		return CryptoJS.SHA256(checksumInput).toString();
	}

	/**
	 * Store transaction metadata for webhook processing
	 */
	private async storeTransactionMetadata(
		merchantTransactionId: string,
		userId: string,
		planId: string,
		amount: number,
		couponId?: string
	) {
		try {
			// This would store in a temporary table for webhook processing
			// The actual implementation would be in Supabase
			console.log("Transaction stored:", {
				merchantTransactionId,
				userId,
				planId,
				amount,
				couponId,
			});
		} catch (error) {
			console.error("Error storing transaction metadata:", error);
		}
	}

	/**
	 * Get PhonePe Merchant ID (for UI display)
	 */
	getMerchantId(): string {
		return this.merchantId;
	}

	/**
	 * Check if PhonePe is configured
	 */
	isConfigured(): boolean {
		return !!this.merchantId && !!this.apiKey;
	}

	/**
	 * Get environment (SANDBOX or PRODUCTION)
	 */
	getEnvironment(): string {
		return this.environment;
	}
}

export const phonepeService = new PhonePeService();
