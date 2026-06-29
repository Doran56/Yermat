import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, Pressable,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import * as Brightness from 'expo-brightness';
import { useVideoPlayer, VideoView } from 'expo-video';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system/legacy';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useReveal } from '@/context/RevealContext';
import { useBar } from '@/hooks/useBars';
import { useChallengeTypes } from '@/hooks/useChallengeTypes';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { supabase } from '@/integrations/supabase/client';

type Step = 'select-challenge' | 'tutorial' | 'record' | 'confirm';
type RecordingPhase = 'idle' | 'recording' | 'stopping';

const VOLUME_OPTIONS = [
  { ml: 250, label: '25 cl' },
  { ml: 500, label: '50 cl' },
  { ml: 750, label: '75 cl' },
  { ml: 1000, label: '1 L' },
];

export default function PerformScreen() {
  const { barId } = useLocalSearchParams<{ barId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { data: bar } = useBar(barId);
  const { data: challengeTypes } = useChallengeTypes();

  const [step, setStep] = useState<Step>('select-challenge');
  const [selectedChallenge, setSelectedChallenge] = useState<any>(null);
  const [volumeMl, setVolumeMl] = useState<number | null>(null);
  const [phase, setPhase] = useState<RecordingPhase>('idle');
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [recordingMs, setRecordingMs] = useState(0);
  const [isPublishing, setIsPublishing] = useState(false);
  const { showReveal } = useReveal();

  const cameraRef = useRef<CameraView>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);
  const recordingMsRef = useRef(0);
  const videoUriRef = useRef<string | null>(null);
  const savedBrightnessRef = useRef<number>(1);
  const flashOpacity = useSharedValue(0);
  const flashStyle = useAnimatedStyle(() => ({ opacity: flashOpacity.value }));

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();

  const previewPlayer = useVideoPlayer(
    videoUri ? { uri: videoUri } : null,
    (p) => { p.loop = true; p.muted = true; }
  );

  useEffect(() => {
    if (step === 'confirm' && videoUri) {
      previewPlayer?.play();
    }
  }, [step, videoUri, previewPlayer]);

  useEffect(() => {
    return () => { Brightness.setBrightnessAsync(savedBrightnessRef.current); };
  }, []);

  const startRecording = async () => {
    if (!cameraPermission?.granted) { await requestCameraPermission(); return; }
    if (!micPermission?.granted) { await requestMicPermission(); return; }
    if (!cameraRef.current) return;

    setRecordingMs(0);
    savedBrightnessRef.current = await Brightness.getBrightnessAsync();
    await Brightness.setBrightnessAsync(1);
    setPhase('recording');
    flashOpacity.value = withTiming(1, { duration: 150 });
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setRecordingMs(Date.now() - startTimeRef.current);
    }, 50);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      const result = await cameraRef.current.recordAsync({ maxDuration: 60 });
      if (result?.uri) {
        videoUriRef.current = result.uri;
        setVideoUri(result.uri);
      }
    } catch {
      setPhase('idle');
    }
  };

  const stopRecording = () => {
    if (phase !== 'recording' || !cameraRef.current) return;
    const finalMs = Date.now() - startTimeRef.current;
    clearInterval(timerRef.current!);
    recordingMsRef.current = finalMs;
    setRecordingMs(finalMs);
    setPhase('stopping');
    flashOpacity.value = 0;
    Brightness.setBrightnessAsync(savedBrightnessRef.current);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    cameraRef.current.stopRecording();
    setTimeout(() => {
      setPhase('idle');
      setStep('confirm');
    }, 300);
  };

  const handlePublish = async (visibility: 'public' | 'followers' | 'private') => {
    if (!user || !selectedChallenge || !volumeMl) return;

    const finalMs = recordingMsRef.current;
    const finalUri = videoUriRef.current;

    if (finalMs < 500) {
      Alert.alert('Trop rapide', "L'enregistrement doit durer au moins 0,5 seconde.");
      return;
    }

    setIsPublishing(true);

    try {
      const { data, error } = await supabase.functions.invoke('submit-performance', {
        body: {
          barId: barId !== 'no-bar' ? barId : null,
          challengeTypeId: selectedChallenge.id,
          visibility,
          isManual: !finalUri,
          chugStartMs: 0,
          chugEndMs: finalMs,
          videoStartMs: 0,
          videoEndMs: finalMs,
        },
      });

      if (error) {
        let serverMsg: string | undefined;
        try { serverMsg = (await (error as any).context?.json?.())?.error; } catch {}
        console.error('[handlePublish] Edge Function error:', error, serverMsg);
        throw new Error(serverMsg ?? error.message ?? 'Erreur serveur');
      }

      // Store the volume consumed for this performance (hydration tracking)
      if (data?.performance?.id) {
        await supabase
          .from('performances')
          .update({ volume_ml: volumeMl })
          .eq('id', data.performance.id);
      }

      // Upload video if present
      if (finalUri && data?.performance?.id) {
        const ext = finalUri.split('.').pop() ?? 'mp4';
        const path = `videos/${user.id}/${data.performance.id}.${ext}`;
        const base64 = await FileSystem.readAsStringAsync(finalUri, {
          encoding: 'base64' as const,
        });
        const { error: uploadError } = await supabase.storage
          .from('videos')
          .upload(path, decode(base64), { contentType: `video/${ext}`, upsert: true });

        if (uploadError) {
          console.error('[handlePublish] Video upload error:', uploadError);
        } else {
          const { data: urlData } = supabase.storage.from('videos').getPublicUrl(path);
          await supabase
            .from('performances')
            .update({ video_url: urlData.publicUrl, video_status: 'uploaded' })
            .eq('id', data.performance.id);
        }
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      showReveal({
        rankGlobal: data?.rankGlobal ?? null,
        totalGlobal: data?.totalGlobal ?? null,
        rankBar: data?.rankBar ?? null,
        totalBar: data?.totalBar ?? null,
        timeMs: finalMs,
        barName: bar?.name ?? null,
      });
      router.dismissAll();
    } catch (err) {
      console.error('[handlePublish] Publish failed:', err);
      const msg = err instanceof Error ? err.message : 'Impossible de publier. Réessaie.';
      Alert.alert('Erreur', msg);
    } finally {
      setIsPublishing(false);
    }
  };

  // ─── Step: select challenge ───────────────────────────────────────────────

  if (step === 'select-challenge') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScreenHeader
          title={bar?.name ?? 'Nouvelle performance'}
          onBack={() => router.back()}
          backIcon="close"
        />

        <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
          <Text style={styles.stepTitle}>Quel défi ?</Text>

          {/* Message de modération */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: Colors.bgElevated,
            borderRadius: 10,
            paddingVertical: 10,
            paddingHorizontal: 12,
          }}>
            <Text style={{ fontSize: 16 }}>💧</Text>
            <Text style={{ flex: 1, color: Colors.textSecondary, fontSize: 12, lineHeight: 16 }}>
              Reste hydraté et bois à ton rythme. Écoute ton corps : l'objectif est le plaisir, pas l'excès.
            </Text>
          </View>

          {challengeTypes?.map((c: any) => (
            <TouchableOpacity
              key={c.id}
              onPress={() => setSelectedChallenge(c)}
              style={[styles.challengeCard, selectedChallenge?.id === c.id && styles.challengeCardActive]}
              activeOpacity={0.8}
            >
              <Text style={styles.challengeName}>{c.name}</Text>
              {c.description && <Text style={styles.challengeDesc}>{c.description}</Text>}
            </TouchableOpacity>
          ))}

          {/* Sélection du volume bu */}
          <Text style={styles.volumeTitle}>Quel volume ?</Text>
          <View style={styles.volumeRow}>
            {VOLUME_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.ml}
                onPress={() => setVolumeMl(opt.ml)}
                style={[styles.volumeChip, volumeMl === opt.ml && styles.volumeChipActive]}
                activeOpacity={0.8}
              >
                <Text style={[styles.volumeChipText, volumeMl === opt.ml && styles.volumeChipTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            onPress={() => selectedChallenge && volumeMl && setStep('tutorial')}
            disabled={!selectedChallenge || !volumeMl}
            style={[styles.primaryBtn, (!selectedChallenge || !volumeMl) && { opacity: 0.4 }]}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>Continuer →</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── Step: tutorial ───────────────────────────────────────────────────────

  if (step === 'tutorial') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScreenHeader
          title={selectedChallenge?.name ?? ''}
          onBack={() => setStep('select-challenge')}
        />

        <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
          <Text style={styles.stepTitle}>Comment ça marche ?</Text>

          <View style={styles.tutorialCard}>
            <Text style={styles.tutorialStep}>1. 📱 Prépare ton téléphone face à toi</Text>
          </View>
          <View style={styles.tutorialCard}>
            <Text style={styles.tutorialStep}>2. 💧 Tiens ta bouteille ou ta gourde bien visible</Text>
          </View>
          <View style={styles.tutorialCard}>
            <Text style={styles.tutorialStep}>3. ▶️ Appuie sur le gros bouton pour lancer</Text>
          </View>
          <View style={styles.tutorialCard}>
            <Text style={styles.tutorialStep}>4. 🤳 L'écran s'illumine — hydrate-toi !</Text>
          </View>
          <View style={styles.tutorialCard}>
            <Text style={styles.tutorialStep}>5. ✋ Tape n'importe où pour arrêter le chrono</Text>
          </View>

          {selectedChallenge?.description && (
            <Text style={{ color: Colors.textSecondary, fontSize: 13, lineHeight: 20 }}>
              {selectedChallenge.description}
            </Text>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            onPress={() => setStep('record')}
            style={styles.primaryBtn}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>Je suis prêt 💧</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── Step: record ─────────────────────────────────────────────────────────

  if (step === 'record') {
    if (!cameraPermission?.granted) {
      return (
        <View style={[styles.container, styles.center]}>
          <Text style={styles.permText}>Accès à la caméra requis</Text>
          <TouchableOpacity onPress={requestCameraPermission} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>Autoriser</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={StyleSheet.absoluteFillObject}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="front"
          mode="video"
        />

        {/* Retour — visible uniquement en phase idle */}
        {phase === 'idle' && (
          <TouchableOpacity
            onPress={() => setStep('tutorial')}
            style={[styles.backBtn, { position: 'absolute', top: insets.top + 12, left: 16 }]}
          >
            <Text style={styles.backText}>✕</Text>
          </TouchableOpacity>
        )}

        {/* Phase idle : gros bouton central */}
        {phase === 'idle' && (
          <View style={[styles.bigBtnWrapper, { paddingBottom: insets.bottom + 60 }]}>
            <TouchableOpacity onPress={startRecording} style={styles.bigRecordBtn} activeOpacity={0.85}>
              <View style={styles.bigRecordBtnInner} />
            </TouchableOpacity>
            <Text style={styles.bigBtnLabel}>Appuie pour commencer</Text>
          </View>
        )}

        {/* Phase recording : flash blanc plein écran, luminosité max, tap partout pour stopper */}
        {phase === 'recording' && (
          <Animated.View style={[styles.flashOverlay, flashStyle]}>
            <Pressable style={[StyleSheet.absoluteFill, styles.flashOverlayInner]} onPress={stopRecording}>
              <Text style={styles.chronoText} pointerEvents="none">
                {(recordingMs / 1000).toFixed(2)}s
              </Text>
              <View style={styles.fakeStopBtn} pointerEvents="none">
                <View style={styles.fakeStopBtnSquare} />
              </View>
            </Pressable>
          </Animated.View>
        )}
      </View>
    );
  }

  // ─── Step: confirm ────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScreenHeader title="Publier" onBack={() => setStep('tutorial')} />

      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        {videoUri && (
          <View style={{ width: '100%', aspectRatio: 9 / 16, backgroundColor: Colors.bgElevated, borderRadius: 12, overflow: 'hidden' }}>
            <VideoView
              player={previewPlayer}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              nativeControls={false}
            />
          </View>
        )}
        <Text style={styles.stepTitle}>Résumé</Text>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryRow}>💧 Défi : <Text style={styles.summaryValue}>{selectedChallenge?.name}</Text></Text>
          <Text style={styles.summaryRow}>🥤 Volume : <Text style={styles.summaryValue}>{VOLUME_OPTIONS.find(o => o.ml === volumeMl)?.label ?? '—'}</Text></Text>
          <Text style={styles.summaryRow}>📍 Point d'eau : <Text style={styles.summaryValue}>{bar?.name ?? '—'}</Text></Text>
          <Text style={styles.summaryRow}>🎥 Vidéo : <Text style={styles.summaryValue}>{videoUri ? 'Enregistrée ✓' : 'Sans vidéo'}</Text></Text>
        </View>

        <Text style={styles.visibilityTitle}>Visibilité</Text>
        {[
          { key: 'public', label: '🌍 Public', desc: 'Visible dans le feed global' },
          { key: 'followers', label: '👥 Abonnés', desc: 'Visible par tes abonnés seulement' },
          { key: 'private', label: '🔒 Privé', desc: 'Visible par toi seulement' },
        ].map(v => (
          <TouchableOpacity
            key={v.key}
            onPress={() => handlePublish(v.key as any)}
            disabled={isPublishing}
            style={styles.visibilityBtn}
            activeOpacity={0.85}
          >
            <Text style={styles.visibilityBtnLabel}>{v.label}</Text>
            <Text style={styles.visibilityBtnDesc}>{v.desc}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isPublishing && (
        <View style={styles.publishingOverlay}>
          <ActivityIndicator size="large" color={Colors.amber[500]} />
          <Text style={{ color: Colors.white, marginTop: 12 }}>Publication en cours…</Text>
        </View>
      )}

    </View>
  );
}

function decode(base64: string): Uint8Array {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup = new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) lookup[chars.charCodeAt(i)] = i;
  const len = base64.length;
  const output = new Uint8Array(Math.floor((len * 3) / 4));
  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const a = lookup[base64.charCodeAt(i)];
    const b = lookup[base64.charCodeAt(i + 1)];
    const c = lookup[base64.charCodeAt(i + 2)];
    const d = lookup[base64.charCodeAt(i + 3)];
    output[p++] = (a << 2) | (b >> 4);
    output[p++] = ((b & 15) << 4) | (c >> 2);
    output[p++] = ((c & 3) << 6) | (d & 63);
  }
  return output;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { alignItems: 'center', justifyContent: 'center', gap: 16 },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.bgElevated2, alignItems: 'center', justifyContent: 'center',
  },
  backText: { color: Colors.text, fontSize: 16, fontWeight: '600' },
  stepTitle: { color: Colors.text, fontSize: 20, fontWeight: '800', marginBottom: 4 },
  footer: { padding: 20, paddingBottom: 32 },
  primaryBtn: {
    backgroundColor: Colors.amber[500], borderRadius: 12,
    paddingVertical: 15, alignItems: 'center',
  },
  primaryBtnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  priceBanner: {
    backgroundColor: Colors.bgElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.brand + '44',
    padding: 12,
    gap: 8,
  },
  priceBannerLabel: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  priceBannerRow: { flexDirection: 'row', gap: 8 },
  priceBannerItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.bgElevated2,
    borderRadius: 8,
    paddingVertical: 8,
    gap: 2,
  },
  priceBannerItemLabel: { color: Colors.textSecondary, fontSize: 10, fontWeight: '600' },
  priceBannerItemValue: { color: Colors.amber[500], fontSize: 15, fontWeight: '800' },
  challengeCard: {
    backgroundColor: Colors.bgElevated, borderRadius: 12, padding: 16,
    borderWidth: 2, borderColor: Colors.border,
  },
  challengeCardActive: { borderColor: Colors.brand },
  volumeTitle: { color: Colors.text, fontSize: 16, fontWeight: '800', marginTop: 12 },
  volumeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  volumeChip: {
    paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12,
    borderWidth: 2, borderColor: Colors.border, backgroundColor: Colors.bgElevated,
  },
  volumeChipActive: { borderColor: Colors.brand, backgroundColor: Colors.brand + '18' },
  volumeChipText: { color: Colors.textSecondary, fontSize: 15, fontWeight: '700' },
  volumeChipTextActive: { color: Colors.brand },
  challengeName: { color: Colors.text, fontSize: 15, fontWeight: '700' },
  challengeDesc: { color: Colors.textSecondary, fontSize: 12, marginTop: 4 },
  tutorialCard: {
    backgroundColor: Colors.bgElevated, borderRadius: 12, padding: 14,
  },
  tutorialStep: { color: Colors.text, fontSize: 14, lineHeight: 20 },
  // Record step — idle phase
  bigBtnWrapper: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    alignItems: 'center',
  },
  bigRecordBtn: {
    width: 120, height: 120, borderRadius: 60,
    borderWidth: 5, borderColor: Colors.white,
    alignItems: 'center', justifyContent: 'center',
  },
  bigRecordBtnInner: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: Colors.amber[500],
  },
  bigBtnLabel: {
    color: Colors.white, fontSize: 13, fontWeight: '600',
    marginTop: 14, opacity: 0.8,
  },
  // Record step — recording phase
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ffffff',
    alignItems: 'center', justifyContent: 'center',
  },
  chronoText: {
    fontSize: 72, fontFamily: Typography.fontFamily.display, color: Colors.zinc[950],
    textAlign: 'center', marginBottom: 28,
    fontVariant: ['tabular-nums'],
    textShadowColor: 'rgba(0,0,0,0.08)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  flashOverlayInner: {
    alignItems: 'center', justifyContent: 'center',
  },
  fakeStopBtn: {
    width: 100, height: 100, borderRadius: 50,
    borderWidth: 4, borderColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  fakeStopBtnSquare: {
    width: 36, height: 36, borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  // Confirm step
  summaryCard: {
    backgroundColor: Colors.bgElevated, borderRadius: 12, padding: 16, gap: 10,
  },
  summaryRow: { color: Colors.textSecondary, fontSize: 14 },
  summaryValue: { color: Colors.text, fontWeight: '600' },
  visibilityTitle: { color: Colors.text, fontSize: 16, fontWeight: '700' },
  visibilityBtn: {
    backgroundColor: Colors.bgElevated, borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  visibilityBtnLabel: { color: Colors.text, fontSize: 15, fontWeight: '700' },
  visibilityBtnDesc: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
  permText: { color: Colors.text, fontSize: 15 },
  publishingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center', justifyContent: 'center',
  },
});
