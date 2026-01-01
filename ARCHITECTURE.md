# Architecture Overview

## App Overview

**LifeSync** is built with Expo Router (file-based navigation) and follows a modular, scalable architecture.

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                       LifeSync App                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              Navigation Layer (Expo Router)                 │ │
│  │  app/_layout.tsx (Stack Navigator)                         │ │
│  │  └─ app/(tabs)/_layout.tsx (Drawer Navigator)              │ │
│  │     ├─ index.tsx (Habits Screen)                           │ │
│  │     ├─ statistics.tsx (Statistics Screen)                  │ │
│  │     ├─ workout.tsx (Workout Screen)                        │ │
│  │     ├─ finance.tsx (Finance Screen)                        │ │
│  │     └─ profile.tsx (Profile Screen)                        │ │
│  └────────────────────────────────────────────────────────────┘ │
│                          ↓                                       │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │           UI Layer (Screens & Components)                   │ │
│  │  ├─ CustomDrawer (Profile + Navigation Menu)               │ │
│  │  ├─ CreateHabitModal (Gesture-enabled modal)               │ │
│  │  │  ├─ PanResponder (Slide to dismiss)                     │ │
│  │  │  ├─ TouchableWithoutFeedback (Tap outside to close)     │ │
│  │  │  ├─ Frequency Picker (7 types with visual UI)           │ │
│  │  │  ├─ Day Selector (Sun-Sat toggle buttons)               │ │
│  │  │  └─ Icon Picker (50+ categorized icons)                 │ │
│  │  ├─ EditHabitModal (Same features as Create)               │ │
│  │  └─ HabitCard (Completion toggle, stats display)           │ │
│  └────────────────────────────────────────────────────────────┘ │
│                          ↓                                       │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │          State Management (Zustand + Context)               │ │
│  │  ├─ useHabitStore() - Habits, logs, CRUD operations        │ │
│  │  └─ ThemeContext - Light/Dark theme management             │ │
│  └────────────────────────────────────────────────────────────┘ │
│                          ↓                                       │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │               Services Layer                                │ │
│  │  ├─ NotificationService                                    │ │
│  │  │  ├─ requestPermissions()                                │ │
│  │  │  ├─ scheduleNotification()                              │ │
│  │  │  └─ cancelNotification()                                │ │
│  │  └─ AudioService                                           │ │
│  │     ├─ playRingtone()                                      │ │
│  │     └─ stopRingtone()                                      │ │
│  └────────────────────────────────────────────────────────────┘ │
│                          ↓                                       │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              Device APIs (Expo Modules)                     │ │
│  │  ├─ expo-notifications (Push notifications)                │ │
│  │  ├─ expo-av (Audio playback)                               │ │
│  │  ├─ expo-device (Device info)                              │ │
│  │  └─ @react-native-async-storage (Persistence)              │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Hierarchy

```
App (AppEntry.tsx)
├─ ThemeProvider
│  └─ Stack Navigator (_layout.tsx)
│     └─ Drawer Navigator ((tabs)/_layout.tsx)
│        ├─ CustomDrawer
│        │  ├─ Profile Section (Avatar, Name, Email)
│        │  ├─ Menu Items (Habits, Statistics, etc.)
│        │  └─ Logout Button
│        │
│        ├─ Habits Screen (index.tsx)
│        │  ├─ Header (Menu button, Title, Add button)
│        │  ├─ Module Cards (Quick actions)
│        │  ├─ Habit List
│        │  │  └─ HabitCard (for each habit)
│        │  │     ├─ Icon & Color
│        │  │     ├─ Name & Frequency
│        │  │     └─ Completion Toggle
│        │  └─ CreateHabitModal
│        │     ├─ Drag Handle (PanResponder)
│        │     ├─ Header (Title, Close button)
│        │     ├─ Form Fields
│        │     │  ├─ Name Input
│        │     │  ├─ Description Input
│        │     │  ├─ Habit Type Selector
│        │     │  ├─ Frequency Picker
│        │     │  │  ├─ Frequency Options (7 types)
│        │     │  │  ├─ Day Selector (for specific_days)
│        │     │  │  └─ Value Controls (+/- buttons)
│        │     │  ├─ Color Picker (8 colors)
│        │     │  ├─ Icon Picker (50+ icons)
│        │     │  └─ Notification Settings
│        │     └─ Sticky Footer (Cancel, Create buttons)
│        │
│        ├─ Statistics Screen
│        │  ├─ Stats Overview
│        │  ├─ Habit Stats List
│        │  └─ EditHabitModal (same as Create)
│        │
│        ├─ Workout Screen
│        ├─ Finance Screen
│        └─ Profile Screen
```

---

## Type System

```typescript
// Habit Types
type FrequencyType = 
  | 'daily'           // Every day
  | 'times_per_day'   // N times each day
  | 'specific_days'   // Selected days of week
  | 'times_per_week'  // N times per week
  | 'times_per_month' // N times per month
  | 'every_n_days'    // Every N days
  | 'times_in_x_days' // N times in X days

type HabitType = 'yesno' | 'measurable'

interface Habit {
  id: string
  name: string
  description: string
  color: string
  icon?: string
  type: HabitType
  question: string
  unit?: string           // For measurable habits
  target?: number         // For measurable habits
  targetType?: 'at_least' | 'at_most' | 'exactly'
  frequency: {
    type: FrequencyType
    value: number
    secondValue?: number  // For times_in_x_days
    days?: number[]       // For specific_days (0-6)
  }
  notificationTime: string    // HH:mm format
  notificationEnabled: boolean
  alarmEnabled: boolean
  ringtoneEnabled: boolean
  isArchived: boolean
  createdAt: Date
  updatedAt: Date
}

interface HabitLog {
  id: string
  habitId: string
  completedAt: Date
  value?: number    // For measurable habits
  notes?: string
}

interface HabitStats {
  habitId: string
  totalCompleted: number
  currentStreak: number
  longestStreak: number
  completionRate: number  // Percentage
}

// Theme Types
interface Theme {
  primary: string
  primaryLight: string
  background: string
  surface: string
  surfaceLight: string
  text: string
  textSecondary: string
  textMuted: string
  border: string
  success: string
  error: string
  warning: string
}
```

---

## State Management

### Zustand Store (habitStore.ts)

```typescript
interface HabitStore {
  // State
  habits: Habit[]
  logs: HabitLog[]
  
  // Actions
  addHabit: (habit: Habit) => void
  updateHabit: (id: string, updates: Partial<Habit>) => void
  deleteHabit: (id: string) => void
  archiveHabit: (id: string) => void
  
  // Logging
  logCompletion: (habitId: string, value?: number) => void
  removeLog: (logId: string) => void
  
  // Queries
  getHabitById: (id: string) => Habit | undefined
  getLogsForHabit: (habitId: string) => HabitLog[]
  getStatsForHabit: (habitId: string) => HabitStats
}
```

### Theme Context

```typescript
interface ThemeContextValue {
  theme: Theme
  isDark: boolean
  toggleTheme: () => void
}
```

---

## Modal Gesture System

### Slide to Dismiss

```typescript
const panResponder = useRef(
  PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 10,
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dy > 0) {
        translateY.setValue(gestureState.dy)
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy > 100) {
        // Dismiss modal
        Animated.timing(translateY, {
          toValue: screenHeight,
          duration: 200,
          useNativeDriver: true,
        }).start(() => handleClose())
      } else {
        // Snap back
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
        }).start()
      }
    },
  })
).current
```

### Tap Outside to Close

```typescript
<Modal visible={visible} transparent animationType="slide">
  <TouchableWithoutFeedback onPress={handleClose}>
    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <TouchableWithoutFeedback>
        <Animated.View style={{ transform: [{ translateY }] }}>
          {/* Modal Content */}
        </Animated.View>
      </TouchableWithoutFeedback>
    </View>
  </TouchableWithoutFeedback>
</Modal>
```

---

## File Structure

```
HabitTrackerApp/
├── app/
│   ├── (tabs)/
│   │   ├── _layout.tsx      # Drawer Navigator setup
│   │   ├── index.tsx        # Habits screen + CreateHabitModal
│   │   ├── statistics.tsx   # Statistics + EditHabitModal
│   │   ├── workout.tsx      # Workout placeholder
│   │   ├── finance.tsx      # Finance placeholder
│   │   └── profile.tsx      # Profile screen
│   ├── _layout.tsx          # Root Stack Navigator
│   ├── modal.tsx            # Standalone modal screen
│   └── +not-found.tsx       # 404 screen
│
├── src/
│   ├── components/
│   │   └── CustomDrawer.tsx # Custom drawer component
│   │
│   ├── context/
│   │   ├── habitStore.ts    # Zustand store
│   │   └── ThemeContext.tsx # Theme provider
│   │
│   ├── services/
│   │   ├── notificationService.ts
│   │   └── audioService.ts
│   │
│   ├── types/
│   │   └── index.ts         # TypeScript definitions
│   │
│   ├── constants/
│   │   └── index.ts         # Colors, icons, etc.
│   │
│   └── utils/
│       └── helpers.ts       # Utility functions
│
├── assets/
│   └── images/              # App icons, splash screen
│
├── app.json                 # Expo config
├── eas.json                 # EAS Build config
├── tsconfig.json            # TypeScript config
└── package.json             # Dependencies
```

---

## Adding New Features

### Add a New Screen

1. Create file: `app/(tabs)/newscreen.tsx`
2. Add to drawer layout: `app/(tabs)/_layout.tsx`
3. Update CustomDrawer menu items

### Add New Frequency Type

1. Update `FrequencyType` in `src/types/index.ts`
2. Add to `frequencyOptions` array
3. Add UI controls in modal
4. Update `getFrequencyLabel()` function
5. Handle in habit creation logic

### Add New Service

1. Create: `src/services/newService.ts`
2. Export functions
3. Import in screens/components as needed

---

## Scaling Considerations

### Current Architecture Supports:
- ✅ Multiple habits with complex frequencies
- ✅ Per-habit notifications
- ✅ Local data persistence (AsyncStorage)
- ✅ Statistics calculation
- ✅ Feature modularity
- ✅ Theme switching
- ✅ Gesture-based interactions

### Future Additions:
- Backend API integration (Firebase, Supabase)
- Cloud sync across devices
- Social features
- Advanced analytics
- Widgets
- Wearable integration

Each addition fits naturally into existing architecture!

---

**Last Updated**: January 2, 2026
