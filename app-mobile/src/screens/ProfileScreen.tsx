import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { Colors, Fonts, shadow } from '../theme';

function InfoRow({ icon, label, value, copyable }: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  value: string;
  copyable?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await Clipboard.setStringAsync(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <View style={rowStyles.row}>
      <View style={rowStyles.iconBox}>
        <MaterialIcons name={icon} size={18} color={Colors.navy} />
      </View>
      <View style={rowStyles.content}>
        <Text style={rowStyles.label}>{label}</Text>
        <Text style={rowStyles.value} numberOfLines={1}>{value}</Text>
      </View>
      {copyable && (
        <TouchableOpacity onPress={handleCopy} style={rowStyles.copyBtn}>
          <MaterialIcons
            name={copied ? 'check' : 'content-copy'}
            size={18}
            color={copied ? Colors.success : Colors.grayLight}
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  iconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1 },
  label: { fontFamily: Fonts.regular, fontSize: 11, color: Colors.grayLight, marginBottom: 2 },
  value: { fontFamily: Fonts.semibold, fontSize: 14, color: '#111827' },
  copyBtn: { padding: 4 },
});

export default function ProfileScreen() {
  const { merchant, logout } = useAuthStore();

  function handleLogout() {
    Alert.alert('Cerrar sesión', '¿Seguro que deseas salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: logout },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mi perfil</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>
              {merchant?.business_name?.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase()).join('') ?? '?'}
            </Text>
          </View>
          <Text style={styles.businessName}>{merchant?.business_name}</Text>
          <View style={[styles.modeBadge, { backgroundColor: merchant?.test_mode ? '#fef3c7' : '#dcfce7' }]}>
            <Text style={[styles.modeText, { color: merchant?.test_mode ? '#92400e' : '#166534' }]}>
              {merchant?.test_mode ? '🧪 Modo prueba' : '✅ Producción'}
            </Text>
          </View>
        </View>

        {/* Info del comercio */}
        <View style={[styles.card, shadow]}>
          <Text style={styles.cardTitle}>Información</Text>
          <InfoRow icon="store" label="Comercio" value={merchant?.business_name ?? '-'} />
          <InfoRow icon="email" label="Email" value={merchant?.email ?? '-'} />
          <InfoRow icon="badge" label="RUC" value={merchant?.ruc ?? '-'} />
        </View>

        {/* API Keys */}
        <View style={[styles.card, shadow]}>
          <Text style={styles.cardTitle}>Claves de API</Text>
          <InfoRow
            icon="vpn-key"
            label="Public Key (pk_test)"
            value={merchant?.api_key_public ?? '-'}
            copyable
          />
          <View style={styles.apiNote}>
            <MaterialIcons name="info-outline" size={14} color={Colors.grayLight} />
            <Text style={styles.apiNoteText}>
              La Secret Key solo se muestra al registrarse. Para regenerarla usa el portal web.
            </Text>
          </View>
        </View>

        {/* Cerrar sesión */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
          <MaterialIcons name="logout" size={20} color={Colors.error} />
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },

  header: { backgroundColor: Colors.navy, paddingHorizontal: 20, paddingVertical: 16 },
  headerTitle: { fontFamily: Fonts.extrabold, color: Colors.white, fontSize: 20 },

  content: { padding: 16, gap: 14, paddingBottom: 32 },

  avatarSection: { alignItems: 'center', paddingVertical: 24, gap: 10 },
  avatarCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.navy, alignItems: 'center', justifyContent: 'center',
  },
  avatarInitials: { fontFamily: Fonts.extrabold, color: Colors.white, fontSize: 28 },
  businessName: { fontFamily: Fonts.extrabold, fontSize: 20, color: Colors.navy },
  modeBadge: { borderRadius: 99, paddingHorizontal: 14, paddingVertical: 5 },
  modeText: { fontFamily: Fonts.semibold, fontSize: 13 },

  card: { backgroundColor: Colors.white, borderRadius: 16, padding: 16 },
  cardTitle: { fontFamily: Fonts.bold, fontSize: 13, color: Colors.grayLight, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },

  apiNote: { flexDirection: 'row', gap: 6, alignItems: 'flex-start', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.border },
  apiNoteText: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.grayLight, flex: 1, lineHeight: 17 },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: Colors.white, borderRadius: 14,
    paddingVertical: 15, borderWidth: 1.5, borderColor: '#fecaca',
  },
  logoutText: { fontFamily: Fonts.bold, fontSize: 15, color: Colors.error },
});
