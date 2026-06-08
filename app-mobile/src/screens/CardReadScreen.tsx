/**
 * CardReadScreen — "Acerque la tarjeta".
 *
 * Activa el lector NFC del celular.
 * Cuando detecta cualquier tag (tarjeta física, celular):
 *   → beep + vibración
 *   → llama al backend SoftPOS
 *   → navega al resultado
 *
 * NO lee datos del chip. El card_token viene del selector en SoftPOSScreen.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Easing, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import type { NativeStackNavigationProp, RouteProp } from '@react-navigation/native-stack';
import type { RootStackParams } from '../navigation/AppNavigator';
import { Colors, Fonts, shadow } from '../theme';
import { useNFC } from '../hooks/useNFC';
import { softposCharge } from '../api/softpos';
import type { SoftPOSChargeRequest } from '../api/softpos';

type Nav   = NativeStackNavigationProp<RootStackParams>;
type Route = RouteProp<RootStackParams, 'CardRead'>;

export default function CardReadScreen() {
  const nav   = useNavigation<Nav>();
  const route = useRoute<Route>();
  const {
    amount, description, cardToken,
    customerName, customerIdType, customerRucCedula,
    customerEmail, customerPhone, customerAddress,
  } = route.params;

  const [phase, setPhase]       = useState<'waiting' | 'processing' | 'done'>('waiting');
  const [nfcState, setNfcState] = useState<'ok' | 'disabled' | 'unsupported' | null>(null);
  const [secondsLeft, setSecondsLeft]   = useState(60);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Animación de pulso para el ícono NFC
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  // ── Procesar cobro tras detectar tarjeta ──────────────────────────────────
  const processCharge = useCallback(async () => {
    // Detener timers antes de procesar — evita que el timeout dispare sobre POSResult
    if (timeoutRef.current)  clearTimeout(timeoutRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setPhase('processing');

    const body: SoftPOSChargeRequest = {
      amount,
      description,
      idempotency_key: `softpos-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      card_token: cardToken,
      customer_name:       customerName,
      customer_id_type:    customerIdType,
      customer_ruc_cedula: customerRucCedula,
      customer_email:      customerEmail,
      customer_phone:      customerPhone,
      customer_address:    customerAddress,
    };

    try {
      const result = await softposCharge(body);
      setPhase('done');
      nav.replace('POSResult', {
        status:             result.status,
        amount:             parseFloat(result.amount),
        description:        result.description,
        card_brand:         result.card_brand,
        card_last4:         result.card_last4,
        authorization_code: result.authorization_code,
        medianet_ref:       result.medianet_ref,
        customerName:       customerName,
        customerIdType:     customerIdType,
        customerRucCedula:  customerRucCedula,
        customerPhone:      customerPhone,
      });
    } catch (err: any) {
      setPhase('waiting');
      Alert.alert(
        'Error de conexión',
        err.message ?? 'No se pudo conectar al servidor',
        [{ text: 'Volver', onPress: () => nav.goBack() }],
      );
    }
  }, [amount, description, cardToken, customerName, customerIdType, customerRucCedula, customerEmail, customerPhone, customerAddress, nav]);

  // ── NFC ───────────────────────────────────────────────────────────────────
  const { startListening, stopListening, openNFCSettings } = useNFC(processCharge);

  useEffect(() => {
    (async () => {
      const result = await startListening();
      setNfcState(result);
    })();

    // Timeout 60s — si no hay tarjeta, volver atrás
    intervalRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          clearInterval(intervalRef.current!);
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    timeoutRef.current = setTimeout(() => {
      stopListening();
      Alert.alert('Tiempo agotado', 'No se detectó ninguna tarjeta. Intenta de nuevo.', [
        { text: 'OK', onPress: () => nav.goBack() },
      ]);
    }, 60_000);

    return () => {
      stopListening();
      if (timeoutRef.current)  clearTimeout(timeoutRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // ── Simulación manual (botón visible cuando NFC no disponible) ────────────
  async function handleManualTap() {
    await processCharge();
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.content}>

        {/* Monto */}
        <View style={[styles.amountCard, shadow]}>
          <Text style={styles.amountLabel}>Monto a cobrar</Text>
          <Text style={styles.amountValue}>${amount.toFixed(2)} <Text style={styles.amountCurrency}>USD</Text></Text>
          <Text style={styles.amountDesc} numberOfLines={1}>{description}</Text>
        </View>

        {/* Ícono NFC animado */}
        <View style={styles.nfcSection}>
          {phase === 'waiting' && (
            <>
              <Animated.View style={[styles.nfcCircleOuter, { transform: [{ scale: pulseAnim }] }]}>
                <View style={styles.nfcCircleInner}>
                  <MaterialIcons name="contactless" size={64} color={Colors.navy} />
                </View>
              </Animated.View>
              <Text style={styles.nfcTitle}>Acerque la tarjeta</Text>
              <Text style={styles.nfcSub}>Coloque la tarjeta sobre la parte trasera del celular</Text>
              <Text style={styles.countdown}>{secondsLeft}s</Text>
            </>
          )}

          {phase === 'processing' && (
            <>
              <View style={[styles.nfcCircleInner, { backgroundColor: Colors.orange + '20' }]}>
                <ActivityIndicator size="large" color={Colors.orange} />
              </View>
              <Text style={styles.nfcTitle}>Procesando...</Text>
              <Text style={styles.nfcSub}>Conectando con MediaNet</Text>
            </>
          )}
        </View>

        {/* Info tarjeta seleccionada */}
        <View style={styles.cardInfo}>
          <MaterialIcons name="credit-card" size={18} color={Colors.grayLight} />
          <Text style={styles.cardInfoText}>
            {cardToken === '5500' ? 'Mastercard' : 'Visa'} ••••{cardToken}
            {cardToken === '0002' ? '  ·  Declinada (prueba)' : '  ·  Aprobada (prueba)'}
          </Text>
        </View>

        {/* Estado NFC */}
        {phase === 'waiting' && nfcState === 'disabled' && (
          <View style={styles.noNfcBox}>
            <MaterialIcons name="nfc" size={22} color={Colors.warning} />
            <Text style={styles.noNfcText}>NFC está desactivado en tu celular</Text>
            <TouchableOpacity style={styles.simulateBtn} onPress={openNFCSettings}>
              <Text style={styles.simulateBtnText}>Activar NFC en ajustes</Text>
            </TouchableOpacity>
          </View>
        )}

        {phase === 'waiting' && nfcState === 'unsupported' && (
          <View style={styles.noNfcBox}>
            <MaterialIcons name="wifi-off" size={20} color={Colors.warning} />
            <Text style={styles.noNfcText}>NFC no disponible en este dispositivo</Text>
            <TouchableOpacity style={styles.simulateBtn} onPress={handleManualTap}>
              <Text style={styles.simulateBtnText}>Simular lectura de tarjeta</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Botón cancelar */}
        <TouchableOpacity style={styles.cancelBtn} onPress={() => { stopListening(); nav.goBack(); }}>
          <Text style={styles.cancelBtnText}>Cancelar</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: Colors.bg },
  content: { flex: 1, padding: 20, gap: 20, justifyContent: 'center' },

  amountCard: {
    backgroundColor: Colors.navy, borderRadius: 20, padding: 24, alignItems: 'center',
  },
  amountLabel:    { fontFamily: Fonts.regular, color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 8 },
  amountValue:    { fontFamily: Fonts.black,   color: Colors.white, fontSize: 48, lineHeight: 52 },
  amountCurrency: { fontFamily: Fonts.semibold, fontSize: 20 },
  amountDesc:     { fontFamily: Fonts.regular, color: 'rgba(255,255,255,0.65)', fontSize: 13, marginTop: 8 },

  nfcSection:      { alignItems: 'center', gap: 16 },
  nfcCircleOuter:  { width: 160, height: 160, borderRadius: 80, backgroundColor: Colors.navy + '15', alignItems: 'center', justifyContent: 'center' },
  nfcCircleInner:  { width: 120, height: 120, borderRadius: 60, backgroundColor: Colors.navy + '25', alignItems: 'center', justifyContent: 'center' },
  nfcTitle:   { fontFamily: Fonts.extrabold, fontSize: 22, color: Colors.navy, textAlign: 'center' },
  nfcSub:     { fontFamily: Fonts.regular,   fontSize: 14, color: Colors.gray, textAlign: 'center', lineHeight: 20 },
  countdown:  { fontFamily: Fonts.semibold,  fontSize: 13, color: Colors.grayLight },

  cardInfo:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  cardInfoText: { fontFamily: Fonts.semibold, fontSize: 13, color: Colors.grayLight },

  noNfcBox: {
    backgroundColor: '#fffbeb', borderRadius: 14, borderWidth: 1, borderColor: '#fde68a',
    padding: 16, alignItems: 'center', gap: 10,
  },
  noNfcText:      { fontFamily: Fonts.regular, fontSize: 13, color: Colors.warning, textAlign: 'center' },
  simulateBtn:    { backgroundColor: Colors.navy, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24 },
  simulateBtnText:{ fontFamily: Fonts.bold, color: Colors.white, fontSize: 14 },

  cancelBtn:     { alignItems: 'center', paddingVertical: 12 },
  cancelBtnText: { fontFamily: Fonts.semibold, fontSize: 15, color: Colors.grayLight },
});
