import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

/**
 * Saved Accounts Service
 * Securely stores login credentials for quick access
 */

export interface SavedAccount {
	id: string;
	email: string;
	name?: string;
	avatarUrl?: string;
	savedAt: number;
}

interface StoredCredentials {
	email: string;
	password: string;
}

const SAVED_ACCOUNTS_KEY = "lifesync_saved_accounts";
const CREDENTIALS_KEY_PREFIX = "lifesync_cred_";

class SavedAccountsService {
	/**
	 * Get all saved accounts (without passwords)
	 */
	async getSavedAccounts(): Promise<SavedAccount[]> {
		try {
			const accountsJson = await AsyncStorage.getItem(SAVED_ACCOUNTS_KEY);
			if (!accountsJson) return [];

			const accounts: SavedAccount[] = JSON.parse(accountsJson);
			// Sort by most recently saved
			return accounts.sort((a, b) => b.savedAt - a.savedAt);
		} catch (error) {
			console.error("Error getting saved accounts:", error);
			return [];
		}
	}

	/**
	 * Save account credentials
	 */
	async saveAccount(
		email: string,
		password: string,
		name?: string,
		avatarUrl?: string
	): Promise<void> {
		try {
			const id = this.generateAccountId(email);

			// Save password securely
			await SecureStore.setItemAsync(
				`${CREDENTIALS_KEY_PREFIX}${id}`,
				JSON.stringify({ email, password })
			);

			// Update accounts list
			const accounts = await this.getSavedAccounts();
			const existingIndex = accounts.findIndex((a) => a.email === email);

			const newAccount: SavedAccount = {
				id,
				email,
				name,
				avatarUrl,
				savedAt: Date.now(),
			};

			if (existingIndex >= 0) {
				accounts[existingIndex] = newAccount;
			} else {
				accounts.push(newAccount);
			}

			// Keep only last 5 accounts
			const limitedAccounts = accounts.slice(0, 5);
			await AsyncStorage.setItem(
				SAVED_ACCOUNTS_KEY,
				JSON.stringify(limitedAccounts)
			);

			console.log("✅ Account saved:", email);
		} catch (error) {
			console.error("Error saving account:", error);
			throw error;
		}
	}

	/**
	 * Get stored credentials for an account
	 */
	async getCredentials(accountId: string): Promise<StoredCredentials | null> {
		try {
			const credentialsJson = await SecureStore.getItemAsync(
				`${CREDENTIALS_KEY_PREFIX}${accountId}`
			);

			if (!credentialsJson) return null;
			return JSON.parse(credentialsJson);
		} catch (error) {
			console.error("Error getting credentials:", error);
			return null;
		}
	}

	/**
	 * Remove a saved account
	 */
	async removeAccount(accountId: string): Promise<void> {
		try {
			// Remove credentials
			await SecureStore.deleteItemAsync(
				`${CREDENTIALS_KEY_PREFIX}${accountId}`
			);

			// Update accounts list
			const accounts = await this.getSavedAccounts();
			const filteredAccounts = accounts.filter((a) => a.id !== accountId);
			await AsyncStorage.setItem(
				SAVED_ACCOUNTS_KEY,
				JSON.stringify(filteredAccounts)
			);

			console.log("🗑️ Account removed:", accountId);
		} catch (error) {
			console.error("Error removing account:", error);
			throw error;
		}
	}

	/**
	 * Clear all saved accounts
	 */
	async clearAllAccounts(): Promise<void> {
		try {
			const accounts = await this.getSavedAccounts();

			// Remove all credentials
			for (const account of accounts) {
				await SecureStore.deleteItemAsync(
					`${CREDENTIALS_KEY_PREFIX}${account.id}`
				);
			}

			// Clear accounts list
			await AsyncStorage.removeItem(SAVED_ACCOUNTS_KEY);
			console.log("🗑️ All saved accounts cleared");
		} catch (error) {
			console.error("Error clearing accounts:", error);
			throw error;
		}
	}

	/**
	 * Generate a unique ID for an account based on email
	 */
	private generateAccountId(email: string): string {
		// Simple hash-like ID from email
		return email
			.toLowerCase()
			.replace(/[^a-z0-9]/g, "_")
			.substring(0, 32);
	}
}

export const savedAccountsService = new SavedAccountsService();
