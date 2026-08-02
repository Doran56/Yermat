import { Modal, View, TouchableOpacity, StyleSheet } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';

export function VideoReviewModal({
  videoUrl,
  onClose,
}: {
  videoUrl: string | null;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const player = useVideoPlayer(videoUrl ? { uri: videoUrl } : null, (p) => {
    p.loop = true;
    p.play();
  });

  return (
    <Modal visible={!!videoUrl} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity
          onPress={onClose}
          style={[styles.closeBtn, { top: insets.top + 12 }]}
          activeOpacity={0.8}
        >
          <Ionicons name="close" size={26} color={Colors.white} />
        </TouchableOpacity>
        {videoUrl && (
          <VideoView
            player={player}
            style={styles.video}
            contentFit="contain"
            nativeControls
            allowsFullscreen
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  closeBtn: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
