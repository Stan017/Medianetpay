import { Vibration } from 'react-native';
import { Audio } from 'expo-av';

export async function playResultSound(approved: boolean): Promise<void> {
  // Vibración diferenciada: aprobado = pulso largo, rechazado = doble golpe
  if (approved) {
    Vibration.vibrate(200);
  } else {
    Vibration.vibrate([0, 80, 60, 80]);
  }

  try {
    const { sound } = await Audio.Sound.createAsync(
      approved
        ? require('../../assets/beep_approved.wav')
        : require('../../assets/beep_rejected.wav'),
    );
    await sound.playAsync();
    // Liberar después de que termine (~500ms max)
    setTimeout(() => sound.unloadAsync(), 600);
  } catch {}
}
