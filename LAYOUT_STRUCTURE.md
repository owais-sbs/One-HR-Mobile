# One HR Mobile - Layout Structure

This document outlines the professional layout architecture of the One HR mobile application. The app follows a modern, clean design system using a component-based structure.

## Core Design Principles
- **Container Strategy**: Every screen uses `SafeAreaView` from `react-native-safe-area-context` to handle notches and status bars consistently across iOS and Android.
- **Scrolling**: Primary screens use `ScrollView` to ensure accessibility on smaller devices and when the keyboard is active.
- **Color System**: Defined in `src/theme/colors.ts`, following a Zinc-based professional palette (Zinc-950 for primary text, Zinc-900 for primary actions).
- **Iconography**: Standardized use of `lucide-react-native` for clear, consistent visual cues.

---

## 1. Authentication Layer
### Login Screen (`src/screens/LoginScreen.tsx`)
- **Structure**: `KeyboardAvoidingView` > `Logo Section` + `Form Section`.
- **Key Components**:
  - `Shield` Logo: Brand identity.
  - `InputGroup`: Label + Styled `TextInput`.
  - `Primary Button`: Full-width action.

---

## 2. Main Navigation Layer (Bottom Tabs)
The app uses `@react-navigation/bottom-tabs` with a customized height (60px) and active tinting.

### Dashboard (`src/screens/DashboardScreen.tsx`)
- **Header**: Greeting + User Avatar (KL).
- **Attendance Card (Clock-in)**: High-contrast primary card showing time/date and a toggleable "Clock In/Out" action.
- **Statistics Grid**: Flex-row with summary boxes (Present vs Leave).
- **Upcoming Section**: List-based view for Holidays with "See All" navigation.

### Attendance Report (`src/screens/AttendanceReportScreen.tsx`)
- **Summary Row**: Horizontal distribution of Present/Absent/Leave counts.
- **Daily Logs**: Vertical list of entries with vertical date borders and status badges.
- **Badges**: Contextual coloring (Green for Present, Amber for Leave).

### Salary Details (`src/screens/SalaryDetailsScreen.tsx`)
- **Net Salary Card**: Primary focal point showing current month's payout and download action.
- **Breakdown Lists**: Segmented sections for Earnings and Deductions using a "List Card" pattern (rounded container with item separators).

### Notifications (`src/screens/NotificationScreen.tsx`)
- **Feed Pattern**: Chronological list of notifications.
- **Icon Boxes**: Uses alpha-transparency backgrounds (e.g., `item.color + '15'`) for a modern, soft aesthetic.

---

## 3. Profile & Settings Layer
### Profile Main (`src/screens/ProfileScreen.tsx`)
- **Hero Section**: Large avatar + Name + Designation.
- **Info Summary**: Contact details in a grouped list.
- **Menu Items**: Navigation links with icons and chevron indicators.

### Sub-Screens (`PersonalInfo`, `Security`, `HolidayList`)
- **Standardized Header**: Custom navigation header with a `ChevronLeft` back button and center-aligned title.
- **Content Cards**: White background, 1px border (`colors.border`), and 16px border radius.

---

## Tips for Professional Improvisation
1. **Consistency**: Always use the `edges={['top', 'left', 'right']}` prop on `SafeAreaView` for screens with bottom tabs to avoid double padding at the bottom.
2. **Spacing**: Use standard spacing increments (e.g., 4, 8, 12, 16, 20, 24). Most containers here use `padding: 20`.
3. **Interactive States**: Use `TouchableOpacity` for all interactive elements to provide visual feedback (Active Opacity).
4. **Typography**: Ensure labels are smaller and muted (`colors.text.secondary`), while values are bold and primary (`colors.text.primary`).
