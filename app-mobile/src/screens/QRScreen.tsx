import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import * as Brightness from 'expo-brightness';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, RouteProp } from '@react-navigation/native-stack';

import { getLinkById } from '../api/links';
import { listTransactions } from '../api/transactions';
import { Colors, Fonts, shadowMd } from '../theme';
import type { RootStackParams } from '../navigation/AppNavigator';

const { width: SCREEN_W } = Dimensions.get('window');
const QR_SIZE = Math.min(SCREEN_W - 80, 260);

type Nav   = NativeStackNavigationProp<RootStackParams>;
type Route = RouteProp<RootStackParams, 'QR'>;

export default function QRScreen() {
  const nav   = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { linkId, checkoutUrl, amount, description } = route.params;

  const [secondsLeft, setSecondsLeft] = useState(300);
  const [phase, setPhase] = useState<'waiting' | 'confirming'>('waiting');
  const origBrightnessRef = useRef<number | null>(null);

  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const confirmRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const confirmN    = useRef(0);
  const navigated   = useRef(false); // guard: evita doble nav.replace

  useEffect(() => {
    (async () => {
      const { status } = await Brightness.requestPermissionsAsync();
      if (status === 'granted') {
        origBrightnessRef.current = await Brightness.getBrightnessAsync();
        await Brightness.setBrightnessAsync(1.0);
      }
    })();
    return () => {
      if (origBrightnessRef.current !== null) {
        Brightness.setBrightnessAsync(origBrightnessRef.current).catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSecondsLeft(p => (p <= 1 ? 0 : p - 1));
    }, 1000);
    return clearAll;
  }, []);

  // Timeout: cuando el contador llega a 0, navegar
  useEffect(() => {
    if (secondsLeft === 0) safeNavigate('timeout');
  }, [secondsLeft]);

  useEffect(() => {
    pollRef.current = setInterval(async () => {
      try {
        const link = await getLinkById(linkId);
        if (link.uses_count > 0) {
          clearInterval(pollRef.current!); pollRef.current = null;
          setPhase('confirming');
          startConfirm();
        }
      } catch {}
    }, 2000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [linkId]);

  function clearAll() {
    if (timerRef.current)   clearInterval(timerRef.current);
    if (pollRef.current)    clearInterval(pollRef.current);
    if (confirmRef.current) clearInterval(confirmRef.current);
  }

  function safeNavigate(status: 'success' | 'failed' | 'timeout') {
    if (navigated.current) return; // guard contra doble navegación
    navigated.current = true;
    clearAll();
    nav.replace('Result', { status, amount, description });
  }

  function startConfirm() {
    confirmN.current = 0;
    confirmRef.current = setInterval(async () => {
      confirmN.current++;
      if (confirmN.current > 15) { safeNavigate('timeout'); return; }
      try {
        const page = await listTransactions({ link_id: linkId, page_size: 1 });
        const txn = page.data[0];
        if (!txn) return;
        if (txn.status === 'completed') safeNavigate('success');
        else if (txn.status === 'failed' || txn.status === 'reversed') safeNavigate('failed');
      } catch {}
    }, 2000);
  }

  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const secs = String(secondsLeft % 60).padStart(2, '0');
  const urgent = secondsLeft <= 60;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Monto */}
      <View style={styles.amountBanner}>
        <Text style={styles.amountLabel}>Monto a cobrar</Text>
        <Text style={styles.amountValue}>${amount.toFixed(2)} <Text style={styles.amountCurrency}>USD</Text></Text>
        <Text style={styles.amountDesc} numberOfLines={1}>{description}</Text>
      </View>

      {/* QR o confirmando */}
      <View style={styles.qrArea}>
        {phase === 'waiting' ? (
          <>
            <View style={[styles.qrCard, shadowMd]}>
              <QRCode value={checkoutUrl} size={QR_SIZE} color={Colors.navy} backgroundColor={Colors.white} />
            </View>
            <View style={styles.hint}>
              <MaterialIcons name="phone-android" size={16} color={Colors.gray} />
              <Text style={styles.hintText}>El cliente escanea con la cámara de su celular</Text>
            </View>
          </>
        ) : (
          <View style={styles.confirmingBox}>
            <ActivityIndicator size="large" color={Colors.orange} />
            <Text style={styles.confirmingTitle}>Pago recibido</Text>
            <Text style={styles.confirmingSub}>Verificando con MediaNet...</Text>
          </View>
        )}
      </View>

      {/* Countdown + cancelar */}
      {phase === 'waiting' && (
        <View style={styles.footer}>
          <View style={[styles.countdownPill, urgent && styles.countdownUrgent]}>
            <MaterialIcons name="timer" size={16} color={urgent ? Colors.error : Colors.navy} />
            <Text style={[styles.countdownText, urgent && { color: Colors.error }]}>{mins}:{secs}</Text>
            <Text style={[styles.countdownLabel, urgent && { color: Colors.error }]}>
              {urgent ? 'Vence pronto' : 'restantes'}
            </Text>
          </View>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => { navigated.current = true; clearAll(); nav.goBack(); }}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg, alignItems: 'center' },

  amountBanner: { backgroundColor: Colors.navy, width: '100%', alignItems: 'center', paddingVertical: 22, paddingHorizontal: 20 },
  amountLabel:  { fontFamily: Fonts.regular, color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 4 },
  amountValue:  { fontFamily: Fonts.extrabold, color: Colors.orange, fontSize: 40 },
  amountCurrency: { fontFamily: Fonts.semibold, fontSize: 18, color: 'rgba(255,255,255,0.7)' },
  amountDesc:   { fontFamily: Fonts.regular, color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 4 },

  qrArea: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, width: '100%' },

  qrCard: { backgroundColor: Colors.white, borderRadius: 20, padding: 20 },

  hint: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 20 },
  hintText: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.gray },

  confirmingBox: { alignItems: 'center', gap: 14 },
  confirmingTitle: { fontFamily: Fonts.extrabold, fontSize: 22, color: Colors.navy },
  confirmingSub:   { fontFamily: Fonts.regular, fontSize: 14, color: Colors.gray },

  footer: { alignItems: 'center', paddingBottom: 28, gap: 14, width: '100%' },

  countdownPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.white, borderRadius: 99,
    paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1.5, borderColor: Colors.border,
  },
  countdownUrgent: { borderColor: Colors.error, backgroundColor: '#fef2f2' },
  countdownText:  { fontFamily: Fonts.extrabold, fontSize: 18, color: Colors.navy, fontVariant: ['tabular-nums'] },
  countdownLabel: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.gray },

  cancelBtn: { paddingVertical: 10, paddingHorizontal: 24 },
  cancelText: { fontFamily: Fonts.semibold, fontSize: 14, color: Colors.grayLight },
});
