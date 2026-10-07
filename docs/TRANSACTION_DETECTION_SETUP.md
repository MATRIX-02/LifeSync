# Auto-detect Payments (Android)

LifeSync spots payments from bank SMS, bank apps and UPI apps - **even when the
app is closed** - and asks the user to add them ("₹250 spent at Swiggy · Tap to
add"). Nothing is saved until the user confirms. Android only.

User-facing switch: **Settings → Finance → Auto-detect Payments**.

## How it works

```
Payment happens
  │
  ├─ UPI app notification (GPay, PhonePe, Paytm…)
  ├─ Bank app notification
  └─ Bank SMS ──▶ shown as a notification by the SMS app (Messages, Samsung…)
        │
        ▼
NotificationListenerService          (react-native-android-notification-listener,
  bound by Android, runs while the    native; declared by the library's manifest)
  app is closed
        │ starts headless JS for every notification
        ▼
index.js → headlessTask.ts           handleIncomingNotification
        │  parseNotification()        notificationListener.ts (+ bankSmsParser / upiParser)
        │  enqueue() + dedupe         detectionQueue.ts  (AsyncStorage)
        ▼
"₹250 spent at Swiggy · Tap to add"  NotificationService.showDetectedTransaction
        │ tap
        ▼
app/_layout.tsx → Money Hub          DetectedTransactions → TransactionPrompt
  pre-filled review sheet             account by card digits, suggested category
        │ Add
        ▼
financeStore.addTransaction          (normal RPC write, balances updated)
```

This is the same mechanism Truecaller-style apps use: **Notification access**
lets an app read notifications as they are posted. Every bank SMS also appears
as a notification from the SMS app, so live detection needs no SMS permission.

**SMS permission is the catch-up net**: when the app opens (at most every
15 min), the inbox from the last 48 h is scanned for anything the listener
missed - phone was off, notification swiped away, detection just turned on.

### Key files

| File | Role |
|---|---|
| `index.js` | App entry: `expo-router/entry` + registers the headless task |
| `src/services/transactionDetection/notificationListener.ts` | Permission helpers; `parseNotification` (UPI apps, bank apps, SMS apps) |
| `src/services/transactionDetection/headlessTask.ts` | Background handler: parse → queue → "Tap to add" notification |
| `src/services/transactionDetection/detectionQueue.ts` | AsyncStorage queue shared by headless task and UI; dedupe; settings |
| `src/services/transactionDetection/bankSmsParser.ts` / `upiParser.ts` | Text parsing (amount, direction, account digits, merchant) |
| `src/services/transactionDetection/accountLinks.ts` | Card/account digits → account; merchant → category suggestions |
| `src/services/transactionDetection/smsReader.ts` | SMS inbox catch-up scan |
| `src/context/transactionDetectionStore.ts` | UI mirror of the queue, permissions |
| `src/components/finance/DetectedTransactions.tsx` | Money Hub banner, review flow, first-run nudge |
| `src/components/finance/TransactionPrompt.tsx` | Review sheet |
| `src/components/finance/TransactionDetectionSettings.tsx` | Settings screen |

### Rules worth knowing

- **Direction** is decided by the *first* money verb: "Rs 250 debited from A/c XX1234 and credited to SWIGGY" is a debit. "Credit card" / "debit card" name the instrument, not the direction.
- **Not transactions:** OTPs, "will be debited", payment/collect requests, declined/failed, bills due, statements, autopay setup.
- **SMS from people** are ignored: an SMS needs a bank/business sender ID (`AX-HDFCBK`) or an account/card number.
- **Dedupe:** one payment usually triggers a UPI notification *and* a bank SMS. Same reference ID, or same amount + direction within 10 min, is one payment; the richer detection (account digits, merchant) wins. Added/ignored payments are remembered (last 300) so the inbox scan doesn't bring them back.
- **Accounts:** digits linked once in the review sheet ("Always use this account for ••1234") map automatically after that; otherwise the default account.
- **Categories:** learned per merchant on confirm; keyword rules (Swiggy → Food, Uber → Transport, …) otherwise. Hidden categories are never suggested.

## Requirements

- A **dev build** or release APK - not Expo Go (native modules).
- The user grants **Notification access** (system settings page; the app links there) and optionally **SMS** (runtime prompt).
- `READ_SMS`/`RECEIVE_SMS` come from `plugins/withSmsPermission.js`; the listener service, boot receiver and headless service come from the library's own manifest.

## Testing with adb

Debug builds also accept notifications posted by the shell, so a fake bank
alert can be sent with the app **closed**:

```bash
adb shell cmd notification post -S bigtext -t "AX-HDFCBK" test1 \
  "Rs.250.00 debited from a/c XX1234 on 07-10-26 to SWIGGY. UPI Ref 412345678901"
```

Expect "₹250 spent at SWIGGY · Tap to add" within a few seconds. On an
emulator, a real SMS (exercises the Messages path and the inbox scan):

```bash
adb emu sms send AXHDFCBK "Rs 500 credited to a/c XX1234 from rahul@okaxis. Ref 777"
```

Logs: `adb logcat | grep -i -E "ReactNativeJS|NotificationListener"`.

## Troubleshooting

| Symptom | Check |
|---|---|
| Nothing detected | Settings → Auto-detect: Notification access "Allowed" and *Detect payments* on. Rebuild if `index.js` was just added. |
| Stops after a while | Battery optimisation killed the listener - set LifeSync's battery usage to *Unrestricted*. Toggling Notification access off/on rebinds the service. |
| A bank isn't recognised | Add its sender ID to `BANK_SENDER_IDS` (`types.ts`) and app package to `BANK_APP_PACKAGES`; check its wording against `bankSmsParser.ts`. Optional: *AI Reading of Bank SMS* (Settings) parses messages the rules miss. |
| Wrong direction/amount | Add the message to a parser test and adjust `detectDirection` / `AMOUNT_PATTERNS`. |

## Play Store note

LifeSync is distributed as an APK. Publishing to Google Play would require
the SMS permissions declaration form and a prominent disclosure for
Notification access.
