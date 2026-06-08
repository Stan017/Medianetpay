/**
 * Hook de autenticación biométrica.
 * Verifica si el dispositivo tiene biometría disponible
 * y muestra el prompt. Retorna si fue exitoso.
 */
import * as LocalAuthentication from 'expo-local-authentication';

export async function authenticateWithBiometrics(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) return true; // Sin hardware → dejar pasar

  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  if (!isEnrolled) return true; // Sin huella registrada → dejar pasar

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Confirma tu identidad para entrar',
    fallbackLabel: 'Usar contraseña',
    cancelLabel: 'Cancelar',
    disableDeviceFallback: false,
  });

  return result.success;
}
