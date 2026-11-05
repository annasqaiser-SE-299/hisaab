import Constants from 'expo-constants';

// In Expo Go, hostUri is the laptop serving the app, for example "172.20.83.63:8081". The backend
// runs on that same laptop, so the app keeps working when the Wi-Fi or the laptop changes.
// Set EXPO_PUBLIC_API_URL only if the backend is on a different machine.
const devHost = Constants.expoConfig?.hostUri?.split(':')[0];

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || `http://${devHost ?? 'localhost'}:3000`;
