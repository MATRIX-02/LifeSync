# Transaction Auto-Detection Setup

This document explains how to set up the automatic transaction detection feature that reads UPI app notifications and bank SMS to help users track their expenses.

## Features

1. **Notification Listener (Android Only)**
   - Reads notifications from UPI apps (PhonePe, Google Pay, Paytm, BharatPe, CRED, etc.)
   - Parses transaction details (amount, merchant, UPI ID)
   - Shows a prompt to add the transaction to the finance tracker

2. **SMS Reader (Android Only)**
   - Reads SMS from banks (SBI, HDFC, ICICI, Axis, Kotak, etc.)
   - Parses transaction details from bank alerts
   - Detects both debits and credits

## Required Packages

Install the following packages:

```bash
npx expo install react-native-android-notification-listener react-native-get-sms-android
```

**Note:** These packages require a development build (not Expo Go).

## Expo Configuration

### 1. Create Development Build

Since this feature uses native modules, you need to create a development build:

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Create development build
eas build --profile development --platform android
```

### 2. Update app.json

Add the following permissions to your `app.json`:

```json
{
  "expo": {
    "android": {
      "permissions": [
        "android.permission.READ_SMS",
        "android.permission.RECEIVE_SMS",
        "android.permission.BIND_NOTIFICATION_LISTENER_SERVICE"
      ]
    },
    "plugins": [
      [
        "react-native-android-notification-listener",
        {
          "notificationListenerName": "LifeSync Transaction Listener",
          "notificationListenerDescription": "Listens for UPI payment notifications to help track expenses"
        }
      ]
    ]
  }
}
```

### 3. Create Config Plugin for SMS Permission

Create a file `plugins/withSmsPermission.js`:

```javascript
const { withAndroidManifest } = require("@expo/config-plugins");

module.exports = function withSmsPermission(config) {
  return withAndroidManifest(config, async (config) => {
    const manifest = config.modResults.manifest;

    // Add SMS permissions
    if (!manifest["uses-permission"]) {
      manifest["uses-permission"] = [];
    }

    const permissions = [
      "android.permission.READ_SMS",
      "android.permission.RECEIVE_SMS",
    ];

    permissions.forEach((permission) => {
      if (
        !manifest["uses-permission"].some(
          (p) => p.$["android:name"] === permission
        )
      ) {
        manifest["uses-permission"].push({
          $: { "android:name": permission },
        });
      }
    });

    return config;
  });
};
```

Add to `app.json` plugins:

```json
{
  "plugins": [
    "./plugins/withSmsPermission"
  ]
}
```

## Usage

### 1. Initialize in App

In your main finance component or app entry:

```tsx
import { useEffect } from "react";
import { useTransactionDetectionStore } from "@/src/context/transactionDetectionStore";

function App() {
  const { checkPermissions, startListening } = useTransactionDetectionStore();

  useEffect(() => {
    // Check permissions on app start
    checkPermissions();
  }, []);

  // Start listening when permissions are granted
  // ...
}
```

### 2. Add Settings UI

Include the settings component in your profile or settings page:

```tsx
import TransactionDetectionSettings from "@/src/components/finance/TransactionDetectionSettings";

function SettingsScreen() {
  return (
    <View>
      <TransactionDetectionSettings />
    </View>
  );
}
```

### 3. Show Transaction Prompts

Add the prompt component to your finance screen:

```tsx
import { useState, useEffect } from "react";
import { TransactionPrompt, PendingTransactionsBadge } from "@/src/components/finance/TransactionPrompt";
import { useTransactionDetectionStore } from "@/src/context/transactionDetectionStore";

function FinanceScreen() {
  const { pendingTransactions, settings } = useTransactionDetectionStore();
  const [showPrompt, setShowPrompt] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState(null);

  // Auto-show prompt when new transaction detected
  useEffect(() => {
    if (settings.autoShowPrompt && pendingTransactions.length > 0) {
      setCurrentTransaction(pendingTransactions[0]);
      setShowPrompt(true);
    }
  }, [pendingTransactions, settings.autoShowPrompt]);

  return (
    <View>
      {/* Your finance content */}

      <PendingTransactionsBadge
        onPress={() => {
          if (pendingTransactions.length > 0) {
            setCurrentTransaction(pendingTransactions[0]);
            setShowPrompt(true);
          }
        }}
      />

      <TransactionPrompt
        visible={showPrompt}
        transaction={currentTransaction}
        onClose={() => setShowPrompt(false)}
        onAdd={() => {
          setShowPrompt(false);
          // Show next pending transaction if any
          if (pendingTransactions.length > 1) {
            setCurrentTransaction(pendingTransactions[1]);
            setShowPrompt(true);
          }
        }}
      />
    </View>
  );
}
```

## Supported UPI Apps

The notification listener supports these UPI apps:
- PhonePe
- Google Pay (GPay)
- Paytm
- BharatPe
- Amazon Pay
- CRED
- MobiKwik
- Freecharge
- WhatsApp Pay

## Supported Banks (SMS)

The SMS reader supports all major Indian banks including:
- State Bank of India (SBI)
- HDFC Bank
- ICICI Bank
- Axis Bank
- Kotak Mahindra Bank
- Yes Bank
- Punjab National Bank
- Bank of Baroda
- Canara Bank
- Union Bank of India
- IDFC First Bank
- IndusInd Bank
- Federal Bank
- RBL Bank
- AU Small Finance Bank
- Paytm Payments Bank

## Privacy & Security

- **All data stays on device**: Transaction data is never sent to any server
- **User control**: Users can enable/disable detection at any time
- **Selective parsing**: Only transaction-related notifications/SMS are processed
- **No sensitive data storage**: Raw notification/SMS content is only stored temporarily

## Google Play Compliance

If publishing to Google Play, note that:

1. **SMS Permission**: Google has strict policies on SMS access. You need to:
   - Submit a declaration form explaining the use case
   - Ensure SMS is only used for this specific feature
   - Provide clear user disclosure

2. **Notification Access**: This is generally allowed but:
   - Must be clearly disclosed to users
   - Should only read relevant notifications
   - User must manually enable in settings

## Troubleshooting

### Notification Listener Not Working

1. Check if "Notification Access" is enabled in phone Settings
2. Ensure the app has been added to the list of notification listeners
3. Try restarting the phone
4. Make sure you're using a development build, not Expo Go

### SMS Not Being Detected

1. Check if SMS permission is granted
2. Verify the bank SMS sender ID is in the supported list
3. Some phones have additional SMS permissions in battery/memory settings
4. Check if the SMS contains the expected transaction keywords

### Transactions Being Duplicated

The system has deduplication logic based on:
- Reference/transaction ID
- Same amount within 2 minutes
- Already processed transaction IDs

If duplicates still occur, they may be from different sources (notification + SMS).
