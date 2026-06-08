/**
 * Hook NFC para SoftPOS.
 *
 * Detecta la presencia de cualquier tag NFC (tarjeta de crédito/débito,
 * sticker NFC, celular con NFC activo).
 *
 * IMPORTANTE: NO lee datos del tag — solo detecta que algo se acercó.
 * El PAN nunca es accedido. El card_token de prueba viene del selector
 * en la UI, NO del chip.
 */

import { useEffect, useRef, useCallback } from 'react';
import { Vibration, Platform } from 'react-native';
import NfcManager, { NfcEvents } from 'react-native-nfc-manager';
import { Audio } from 'expo-av';

export type NFCStartResult = 'ok' | 'disabled' | 'unsupported';

let _nfcInitialized = false;

async function initNFC(): Promise<NFCStartResult> {
  if (Platform.OS !== 'android') return 'unsupported';
  try {
    // Verificar si el hardware soporta NFC
    const supported = await NfcManager.isSupported();
    if (!supported) return 'unsupported';

    // Verificar si NFC está habilitado en ajustes
    const enabled = await NfcManager.isEnabled();
    if (!enabled) return 'disabled';

    if (!_nfcInitialized) {
      await NfcManager.start();
      _nfcInitialized = true;
    }
    return 'ok';
  } catch {
    return 'unsupported';
  }
}

export function useNFC(onDetected: () => void) {
  const soundRef     = useRef<Audio.Sound | null>(null);
  const listeningRef = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(
          require('../../assets/beep.wav'),
        );
        soundRef.current = sound;
      } catch {}
    })();
    return () => { soundRef.current?.unloadAsync(); };
  }, []);

  const playBeep = useCallback(async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.setPositionAsync(0);
        await soundRef.current.playAsync();
      }
    } catch {}
    Vibration.vibrate(120);
  }, []);

  const startListening = useCallback(async (): Promise<NFCStartResult> => {
    const result = await initNFC();
    if (result !== 'ok' || listeningRef.current) return result;

    listeningRef.current = true;

    NfcManager.setEventListener(NfcEvents.DiscoverTag, async () => {
      await NfcManager.unregisterTagEvent().catch(() => {});
      NfcManager.setEventListener(NfcEvents.DiscoverTag, null);
      listeningRef.current = false;
      await playBeep();
      onDetected();
    });

    try {
      await NfcManager.registerTagEvent();
      return 'ok';
    } catch {
      listeningRef.current = false;
      return 'unsupported';
    }
  }, [onDetected, playBeep]);

  const stopListening = useCallback(async () => {
    if (!listeningRef.current) return;
    try {
      await NfcManager.unregisterTagEvent();
      NfcManager.setEventListener(NfcEvents.DiscoverTag, null);
    } catch {}
    listeningRef.current = false;
  }, []);

  const openNFCSettings = useCallback(() => {
    NfcManager.goToNfcSetting();
  }, []);

  return { startListening, stopListening, openNFCSettings };
}
