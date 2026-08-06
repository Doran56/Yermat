import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { Colors } from '@/constants/colors';

const MIN_AGE = 18;

function computeAge(birth: Date, now: Date): number {
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

export default function AgeGateScreen() {
  const { updateProfile, signOut } = useAuth();
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [blocked, setBlocked] = useState(false);

  const handleSubmit = async () => {
    const d = parseInt(day, 10);
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    const now = new Date();

    if (!d || !m || !y || d < 1 || d > 31 || m < 1 || m > 12 || y < 1900 || y > now.getFullYear()) {
      setError('Date invalide. Vérifie le format jour / mois / année.');
      return;
    }

    const birth = new Date(y, m - 1, d);
    if (birth.getMonth() !== m - 1 || birth.getDate() !== d) {
      setError('Cette date n\'existe pas.');
      return;
    }

    const age = computeAge(birth, now);
    if (age < MIN_AGE) {
      setBlocked(true);
      return;
    }

    setError(null);
    setLoading(true);
    await updateProfile({
      birth_date: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      age_verified: true,
    });
    setLoading(false);
    // La redirection vers (tabs) est gérée par AuthGate (app/_layout.tsx)
    // dès que profile.age_verified passe à true.
  };

  if (blocked) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bg, justifyContent: 'center', paddingHorizontal: 24, gap: 16 }}>
        <Text style={{ fontSize: 40, textAlign: 'center' }}>🔞</Text>
        <Text style={{ color: Colors.text, fontSize: 20, fontWeight: '700', textAlign: 'center' }}>
          Application réservée aux 18 ans et plus
        </Text>
        <Text style={{ color: Colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20 }}>
          Yermat est centrée sur des contenus liés à la consommation d'alcool entre adultes.
          Tu ne peux pas continuer avec la date de naissance indiquée.
        </Text>
        <TouchableOpacity
          onPress={() => signOut()}
          style={{ backgroundColor: Colors.bgElevated2, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 }}
          activeOpacity={0.85}
        >
          <Text style={{ color: Colors.text, fontSize: 15, fontWeight: '700' }}>Se déconnecter</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24, gap: 20 }}>
        <Text style={{ fontSize: 36, textAlign: 'center' }}>🔞</Text>
        <Text style={{ color: Colors.text, fontSize: 20, fontWeight: '700', textAlign: 'center' }}>
          Quelle est ta date de naissance ?
        </Text>
        <Text style={{ color: Colors.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 19 }}>
          Yermat contient des contenus liés à l'alcool et est réservée aux personnes majeures.
        </Text>

        <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'center' }}>
          <TextInput
            value={day}
            onChangeText={(t) => { setDay(t.replace(/\D/g, '').slice(0, 2)); setError(null); }}
            placeholder="JJ"
            placeholderTextColor={Colors.textTertiary}
            keyboardType="number-pad"
            maxLength={2}
            style={{
              width: 64, height: 56, backgroundColor: Colors.bgElevated, borderWidth: 2,
              borderColor: Colors.border, borderRadius: 12, textAlign: 'center',
              color: Colors.text, fontSize: 18, fontWeight: '700',
            }}
          />
          <TextInput
            value={month}
            onChangeText={(t) => { setMonth(t.replace(/\D/g, '').slice(0, 2)); setError(null); }}
            placeholder="MM"
            placeholderTextColor={Colors.textTertiary}
            keyboardType="number-pad"
            maxLength={2}
            style={{
              width: 64, height: 56, backgroundColor: Colors.bgElevated, borderWidth: 2,
              borderColor: Colors.border, borderRadius: 12, textAlign: 'center',
              color: Colors.text, fontSize: 18, fontWeight: '700',
            }}
          />
          <TextInput
            value={year}
            onChangeText={(t) => { setYear(t.replace(/\D/g, '').slice(0, 4)); setError(null); }}
            placeholder="AAAA"
            placeholderTextColor={Colors.textTertiary}
            keyboardType="number-pad"
            maxLength={4}
            style={{
              width: 90, height: 56, backgroundColor: Colors.bgElevated, borderWidth: 2,
              borderColor: Colors.border, borderRadius: 12, textAlign: 'center',
              color: Colors.text, fontSize: 18, fontWeight: '700',
            }}
          />
        </View>

        {error && (
          <Text style={{ color: Colors.error, fontSize: 13, textAlign: 'center' }}>{error}</Text>
        )}

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading || !day || !month || !year}
          activeOpacity={0.85}
          style={{
            backgroundColor: Colors.amber[500], borderRadius: 12, paddingVertical: 15,
            alignItems: 'center',
            opacity: (loading || !day || !month || !year) ? 0.5 : 1,
          }}
        >
          {loading
            ? <ActivityIndicator color={Colors.white} />
            : <Text style={{ color: Colors.white, fontSize: 16, fontWeight: '700' }}>Continuer</Text>
          }
        </TouchableOpacity>

        <Text style={{ color: Colors.textTertiary, fontSize: 11, textAlign: 'center', lineHeight: 16 }}>
          L'abus d'alcool est dangereux pour la santé, à consommer avec modération.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}
