import { useState, useRef } from 'react';
import {
  View, Text, TextInput, KeyboardAvoidingView,
  Platform, TouchableOpacity, ActivityIndicator, Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/integrations/supabase/client';
import { Colors } from '@/constants/colors';

export default function VerifyScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const handleChange = (val: string, idx: number) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const next = [...code];
    next[idx] = digit;
    setCode(next);
    setError(null);
    if (digit && idx < 5) inputRefs.current[idx + 1]?.focus();
    if (!digit && idx > 0) inputRefs.current[idx - 1]?.focus();
    // Auto-verify when all 6 digits are filled
    if (digit && idx === 5) {
      const full = [...next.slice(0, 5), digit].join('');
      if (full.length === 6) verify(full);
    }
  };

  const verify = async (token?: string) => {
    const otp = token ?? code.join('');
    if (otp.length !== 6) return;
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.auth.verifyOtp({
      email: email!,
      token: otp,
      type: 'email',
    });
    setLoading(false);
    if (err) {
      setError('Code incorrect ou expiré. Réessaie.');
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      return;
    }
    router.replace('/(tabs)');
  };

  const resend = async () => {
    setResending(true);
    await supabase.auth.signInWithOtp({ email: email!, options: { shouldCreateUser: true, emailRedirectTo: 'yermat://' } });
    setResending(false);
    setCode(['', '', '', '', '', '']);
    setError(null);
    inputRefs.current[0]?.focus();
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 32 }}>
          <Text style={{ color: Colors.textSecondary, fontSize: 14 }}>← Retour</Text>
        </TouchableOpacity>

        <Image
          source={require('../../assets/logo.png')}
          style={{ width: 80, height: 80, resizeMode: 'contain', marginBottom: 8 }}
        />

        <Text style={{ color: Colors.text, fontSize: 20, fontWeight: '700', marginBottom: 8 }}>
          Vérifie ta boîte mail
        </Text>
        <Text style={{ color: Colors.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 32 }}>
          Code envoyé à {email}. Il expire dans 10 minutes.
        </Text>

        {/* 6-digit OTP inputs */}
        <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'center', marginBottom: 24 }}>
          {code.map((digit, idx) => (
            <TextInput
              key={idx}
              ref={(r) => { inputRefs.current[idx] = r; }}
              value={digit}
              onChangeText={(val) => handleChange(val, idx)}
              keyboardType="number-pad"
              maxLength={1}
              style={{
                width: 46, height: 56,
                backgroundColor: Colors.bgElevated,
                borderWidth: 2,
                borderColor: digit ? Colors.brand : Colors.border,
                borderRadius: 12,
                textAlign: 'center',
                color: Colors.text,
                fontSize: 22,
                fontWeight: '700',
              }}
              autoFocus={idx === 0}
            />
          ))}
        </View>

        {error && (
          <Text style={{ color: Colors.error, fontSize: 13, textAlign: 'center', marginBottom: 16 }}>
            {error}
          </Text>
        )}

        <TouchableOpacity
          onPress={() => verify()}
          disabled={loading || code.join('').length !== 6}
          activeOpacity={0.85}
          style={{
            backgroundColor: Colors.amber[500],
            borderRadius: 12,
            paddingVertical: 15,
            alignItems: 'center',
            opacity: (loading || code.join('').length !== 6) ? 0.5 : 1,
          }}
        >
          {loading
            ? <ActivityIndicator color={Colors.black} />
            : <Text style={{ color: Colors.black, fontSize: 16, fontWeight: '700' }}>Vérifier</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity onPress={resend} disabled={resending} style={{ marginTop: 20, alignItems: 'center' }}>
          {resending
            ? <ActivityIndicator size="small" color={Colors.textSecondary} />
            : <Text style={{ color: Colors.textSecondary, fontSize: 14 }}>Renvoyer le code</Text>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
