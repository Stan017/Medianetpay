import { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { useAuthStore } from '../store/authStore';
import { getProfile } from '../api/auth';
import { authenticateWithBiometrics } from '../hooks/useBiometric';
import { Colors, Fonts } from '../theme';
import { CatalogService } from '../api/catalog';

import LoginScreen         from '../screens/LoginScreen';
import HomeScreen          from '../screens/HomeScreen';
import HistoryScreen       from '../screens/HistoryScreen';
import ProfileScreen       from '../screens/ProfileScreen';
import ChargeScreen        from '../screens/ChargeScreen';
import QRScreen            from '../screens/QRScreen';
import ResultScreen        from '../screens/ResultScreen';
import SoftPOSScreen       from '../screens/SoftPOSScreen';
import CardReadScreen      from '../screens/CardReadScreen';
import POSResultScreen     from '../screens/POSResultScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import VitrinaScreen       from '../screens/VitrinaScreen';
import ServiceFormScreen   from '../screens/ServiceFormScreen';

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type RootStackParams = {
  Auth:          undefined;
  Main:          undefined;
  Notifications: undefined;
  Charge:        undefined;
  ServiceForm:   { mode: 'create' | 'edit' | 'profile'; service?: CatalogService };
  QR:        { linkId: string; checkoutUrl: string; amount: number; description: string };
  Result:    { status: 'success' | 'failed' | 'timeout'; amount: number; description: string };
  SoftPOS:   undefined;
  CardRead:  {
    amount: number;
    description: string;
    cardToken: '4242' | '0002' | '5500';
    customerName?: string;
    customerIdType?: 'ruc' | 'cedula' | 'pasaporte' | 'consumidor_final';
    customerRucCedula?: string;
    customerEmail?: string;
    customerPhone?: string;
    customerAddress?: string;
  };
  POSResult: {
    status:             'completed' | 'failed';
    amount:             number;
    description:        string;
    card_brand:         string;
    card_last4:         string;
    authorization_code: string | null;
    medianet_ref:       string | null;
    customerName?:      string;
    customerIdType?:    'ruc' | 'cedula' | 'pasaporte' | 'consumidor_final';
    customerRucCedula?: string;
    customerPhone?:     string;
  };
};

export type TabParams = {
  Inicio:    undefined;
  Historial: undefined;
  Vitrina:   undefined;
  Perfil:    undefined;
};

const Stack = createNativeStackNavigator<RootStackParams>();
const Tab   = createBottomTabNavigator<TabParams>();

// ── Bottom Tabs ───────────────────────────────────────────────────────────────

const TAB_ICONS: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  Inicio:    'home',
  Historial: 'receipt-long',
  Vitrina:   'storefront',
  Perfil:    'person',
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor:   Colors.orange,
        tabBarInactiveTintColor: Colors.grayLight,
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopColor:  Colors.border,
          height: 64,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontFamily: Fonts.semibold, fontSize: 11 },
        tabBarIcon: ({ color, size }) => (
          <MaterialIcons name={TAB_ICONS[route.name]} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Inicio"    component={HomeScreen} />
      <Tab.Screen name="Historial" component={HistoryScreen} />
      <Tab.Screen name="Vitrina"   component={VitrinaScreen} />
      <Tab.Screen name="Perfil"    component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// ── Navigator raíz ────────────────────────────────────────────────────────────

const HEADER_OPTS = {
  headerShown:      true,
  headerTintColor:  Colors.white,
  headerStyle:      { backgroundColor: Colors.navy },
  headerTitleStyle: { fontFamily: Fonts.bold },
};

export default function AppNavigator() {
  const { token, merchant, isLoading, loadStoredToken, setAuth, logout } = useAuthStore();
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    (async () => {
      const stored = await loadStoredToken();
      if (!stored) { setAppReady(true); return; }
      try {
        const profile = await getProfile();
        const ok = await authenticateWithBiometrics();
        if (!ok) { await logout(); } else { await setAuth(stored, profile); }
      } catch {
        await logout();
      } finally {
        setAppReady(true);
      }
    })();
  }, []);

  if (!appReady || isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg }}>
        <ActivityIndicator size="large" color={Colors.orange} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!token || !merchant ? (
        <Stack.Screen name="Auth" component={LoginScreen} />
      ) : (
        <>
          <Stack.Screen name="Main" component={MainTabs} />

          {/* Cobro QR / WhatsApp */}
          <Stack.Screen name="Charge" component={ChargeScreen}    options={{ ...HEADER_OPTS, title: 'Cobrar' }} />
          <Stack.Screen name="QR"     component={QRScreen}        options={{ ...HEADER_OPTS, title: 'QR de cobro' }} />
          <Stack.Screen name="Result" component={ResultScreen}    options={{ headerShown: false, gestureEnabled: false }} />

          {/* Notificaciones */}
          <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: false }} />

          {/* Vitrina — formulario de servicio */}
          <Stack.Screen name="ServiceForm" component={ServiceFormScreen} options={{ headerShown: false }} />

          {/* SoftPOS — datáfono móvil */}
          <Stack.Screen name="SoftPOS"   component={SoftPOSScreen}   options={{ ...HEADER_OPTS, title: 'Datáfono' }} />
          <Stack.Screen name="CardRead"  component={CardReadScreen}  options={{ ...HEADER_OPTS, title: 'Leer tarjeta' }} />
          <Stack.Screen name="POSResult" component={POSResultScreen} options={{ headerShown: false, gestureEnabled: false }} />
        </>
      )}
    </Stack.Navigator>
  );
}
