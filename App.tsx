import { StatusBar } from "expo-status-bar";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import { captureRef } from "react-native-view-shot";
import { useMemo, useRef, useState } from "react";
import {
  Alert,
  Image,
  ImageSourcePropType,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

type Hairstyle = {
  id: string;
  name: string;
  description: string;
  image: ImageSourcePropType;
  top: number;
  left: number;
  width: number;
  swatch: string;
};

type FitAdjustments = {
  x: number;
  y: number;
  scale: number;
};

const HAIRSTYLES: Hairstyle[] = [
  {
    id: "bob",
    name: "Soft Bob",
    description: "Rounded chin-length cut",
    image: require("./assets/hairstyles/bob.png"),
    top: -1,
    left: 16,
    width: 68,
    swatch: "#2d211d",
  },
  {
    id: "curtain-bangs",
    name: "Curtain Bangs",
    description: "Long layers with face framing",
    image: require("./assets/hairstyles/curtain-bangs.png"),
    top: -2,
    left: 13,
    width: 74,
    swatch: "#7a3d21",
  },
  {
    id: "pixie",
    name: "Textured Pixie",
    description: "Short layered crop",
    image: require("./assets/hairstyles/pixie.png"),
    top: 5,
    left: 18,
    width: 64,
    swatch: "#963f37",
  },
  {
    id: "curls",
    name: "Coily Curls",
    description: "Voluminous rounded curls",
    image: require("./assets/hairstyles/curls.png"),
    top: 0,
    left: 15,
    width: 70,
    swatch: "#211c1c",
  },
  {
    id: "high-bun",
    name: "High Bun",
    description: "Pulled-back bun style",
    image: require("./assets/hairstyles/high-bun.png"),
    top: -9,
    left: 15,
    width: 70,
    swatch: "#c78c3e",
  },
];

const DEFAULT_FIT: FitAdjustments = {
  x: 0,
  y: 0,
  scale: 1,
};

export default function App() {
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [selectedStyleId, setSelectedStyleId] = useState(HAIRSTYLES[0].id);
  const [fit, setFit] = useState<FitAdjustments>(DEFAULT_FIT);
  const [isSaving, setIsSaving] = useState(false);
  const previewRef = useRef<View>(null);
  const { width: windowWidth } = useWindowDimensions();

  const selectedStyle = useMemo(
    () => HAIRSTYLES.find((style) => style.id === selectedStyleId) ?? HAIRSTYLES[0],
    [selectedStyleId],
  );

  const previewWidth = Math.min(windowWidth - 32, 430);
  const previewHeight = previewWidth * 1.32;

  const choosePortrait = async () => {
    if (Platform.OS !== "web") {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showMessage("Photo access needed", "Allow photo library access to upload a portrait.");
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [3, 4],
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
      setFit(DEFAULT_FIT);
    }
  };

  const selectHairstyle = (styleId: string) => {
    setSelectedStyleId(styleId);
    setFit(DEFAULT_FIT);
  };

  const adjustFit = (updates: Partial<FitAdjustments>) => {
    setFit((current) => ({
      x: clamp(updates.x ?? current.x, -12, 12),
      y: clamp(updates.y ?? current.y, -16, 16),
      scale: clamp(updates.scale ?? current.scale, 0.76, 1.32),
    }));
  };

  const capturePreview = async () => {
    if (!photoUri || !previewRef.current) {
      showMessage("Add a portrait first", "Upload a front-facing photo before saving the preview.");
      return null;
    }

    return captureRef(previewRef.current, {
      format: "jpg",
      quality: 0.95,
      result: Platform.OS === "web" ? "data-uri" : "tmpfile",
    });
  };

  const saveResult = async () => {
    try {
      setIsSaving(true);
      const uri = await capturePreview();
      if (!uri) {
        return;
      }

      if (Platform.OS === "web") {
        downloadInBrowser(uri);
        showMessage("Downloaded", "Your hairstyle preview has been downloaded.");
        return;
      }

      const permission = await MediaLibrary.requestPermissionsAsync();
      if (!permission.granted) {
        showMessage("Permission needed", "Allow photo library access to save your hairstyle preview.");
        return;
      }

      await MediaLibrary.saveToLibraryAsync(uri);
      showMessage("Saved", "Your hairstyle preview was saved to your photo library.");
    } catch (error) {
      showMessage("Save failed", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const shareResult = async () => {
    try {
      const uri = await capturePreview();
      if (!uri) {
        return;
      }

      if (Platform.OS === "web") {
        downloadInBrowser(uri);
        return;
      }

      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        showMessage("Sharing unavailable", "Use Save result to store this preview on your device.");
        return;
      }

      await Sharing.shareAsync(uri, {
        dialogTitle: "Share your hairstyle preview",
        mimeType: "image/jpeg",
        UTI: "public.jpeg",
      });
    } catch (error) {
      showMessage("Share failed", error instanceof Error ? error.message : "Please try again.");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Virtual hairstyle studio</Text>
          <Text style={styles.title}>Try a new hairstyle on a front-facing portrait.</Text>
          <Text style={styles.subtitle}>
            Upload a photo, choose a hairstyle, nudge the fit, then save or share the result.
          </Text>
        </View>

        <View style={styles.previewSection}>
          <View
            ref={previewRef}
            collapsable={false}
            style={[styles.previewFrame, { width: previewWidth, height: previewHeight }]}
          >
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.portraitImage} resizeMode="cover" />
            ) : (
              <View style={styles.placeholder}>
                <View style={styles.placeholderFace}>
                  <View style={styles.placeholderHair} />
                  <View style={styles.placeholderSmile} />
                </View>
                <Text style={styles.placeholderTitle}>Upload a front-facing portrait</Text>
                <Text style={styles.placeholderCopy}>The selected hairstyle will appear here.</Text>
              </View>
            )}

            {photoUri ? (
              <Image
                pointerEvents="none"
                source={selectedStyle.image}
                style={[
                  styles.hairstyleOverlay,
                  {
                    left: `${selectedStyle.left + fit.x}%`,
                    top: `${selectedStyle.top + fit.y}%`,
                    width: `${selectedStyle.width * fit.scale}%`,
                  },
                ]}
                resizeMode="contain"
              />
            ) : null}
          </View>

          <View style={styles.primaryActions}>
            <Pressable style={styles.primaryButton} onPress={choosePortrait}>
              <Text style={styles.primaryButtonText}>{photoUri ? "Change photo" : "Upload portrait"}</Text>
            </Pressable>
            <Pressable
              style={[styles.secondaryButton, !photoUri ? styles.disabledButton : null]}
              onPress={saveResult}
              disabled={!photoUri || isSaving}
            >
              <Text style={[styles.secondaryButtonText, !photoUri ? styles.disabledText : null]}>
                {Platform.OS === "web" ? "Download result" : isSaving ? "Saving..." : "Save result"}
              </Text>
            </Pressable>
          </View>

          <Pressable
            style={[styles.linkButton, !photoUri ? styles.disabledButton : null]}
            onPress={shareResult}
            disabled={!photoUri}
          >
            <Text style={[styles.linkButtonText, !photoUri ? styles.disabledText : null]}>Share preview</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>1. Choose a hairstyle</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hairstyleList}>
            {HAIRSTYLES.map((style) => {
              const isSelected = selectedStyleId === style.id;
              return (
                <Pressable
                  key={style.id}
                  onPress={() => selectHairstyle(style.id)}
                  style={[styles.hairstyleCard, isSelected ? styles.hairstyleCardSelected : null]}
                >
                  <View style={[styles.thumbnail, { backgroundColor: style.swatch }]}>
                    <Image source={style.image} style={styles.thumbnailImage} resizeMode="contain" />
                  </View>
                  <Text style={styles.hairstyleName}>{style.name}</Text>
                  <Text style={styles.hairstyleDescription}>{style.description}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>2. Fit the overlay</Text>
          <Text style={styles.helperText}>
            Small adjustments help line the hairstyle up with different portrait crops.
          </Text>
          <View style={styles.controlGrid}>
            <ControlButton label="Left" onPress={() => adjustFit({ x: fit.x - 2 })} />
            <ControlButton label="Right" onPress={() => adjustFit({ x: fit.x + 2 })} />
            <ControlButton label="Up" onPress={() => adjustFit({ y: fit.y - 2 })} />
            <ControlButton label="Down" onPress={() => adjustFit({ y: fit.y + 2 })} />
            <ControlButton label="Smaller" onPress={() => adjustFit({ scale: fit.scale - 0.06 })} />
            <ControlButton label="Larger" onPress={() => adjustFit({ scale: fit.scale + 0.06 })} />
          </View>
          <Pressable style={styles.resetButton} onPress={() => setFit(DEFAULT_FIT)}>
            <Text style={styles.resetButtonText}>Reset fit</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ControlButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.controlButton} onPress={onPress}>
      <Text style={styles.controlButtonText}>{label}</Text>
    </Pressable>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function showMessage(title: string, message: string) {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.alert(`${title}\n\n${message}`);
    return;
  }

  Alert.alert(title, message);
}

function downloadInBrowser(uri: string) {
  if (typeof document === "undefined") {
    return;
  }

  const link = document.createElement("a");
  link.href = uri;
  link.download = `hairstyle-preview-${Date.now()}.jpg`;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff7f1",
  },
  content: {
    alignItems: "center",
    gap: 18,
    padding: 16,
    paddingBottom: 36,
  },
  hero: {
    maxWidth: 520,
    width: "100%",
    paddingTop: 10,
  },
  eyebrow: {
    color: "#b66352",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.6,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  title: {
    color: "#2d211d",
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 36,
  },
  subtitle: {
    color: "#6f5b52",
    fontSize: 16,
    lineHeight: 23,
    marginTop: 10,
  },
  previewSection: {
    alignItems: "center",
    width: "100%",
  },
  previewFrame: {
    backgroundColor: "#f2ded2",
    borderColor: "#ffffff",
    borderRadius: 28,
    borderWidth: 6,
    elevation: 8,
    overflow: "hidden",
    shadowColor: "#4f271f",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.16,
    shadowRadius: 26,
  },
  portraitImage: {
    height: "100%",
    width: "100%",
  },
  hairstyleOverlay: {
    aspectRatio: 1,
    position: "absolute",
  },
  placeholder: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: 22,
  },
  placeholderFace: {
    alignItems: "center",
    backgroundColor: "#f5c29f",
    borderRadius: 90,
    height: 150,
    justifyContent: "flex-end",
    marginBottom: 18,
    overflow: "hidden",
    width: 126,
  },
  placeholderHair: {
    backgroundColor: "#3e2a25",
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
    borderTopLeftRadius: 90,
    borderTopRightRadius: 90,
    height: 66,
    left: -10,
    position: "absolute",
    top: -2,
    width: 146,
  },
  placeholderSmile: {
    borderBottomColor: "#bf5c52",
    borderBottomWidth: 4,
    borderRadius: 18,
    height: 24,
    marginBottom: 34,
    width: 44,
  },
  placeholderTitle: {
    color: "#3b2b25",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  placeholderCopy: {
    color: "#7b665c",
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
  primaryActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
    width: "100%",
    maxWidth: 430,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#2d211d",
    borderRadius: 999,
    flex: 1,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#ead2c5",
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 18,
  },
  secondaryButtonText: {
    color: "#2d211d",
    fontSize: 16,
    fontWeight: "800",
  },
  linkButton: {
    marginTop: 14,
    padding: 8,
  },
  linkButtonText: {
    color: "#b66352",
    fontSize: 15,
    fontWeight: "800",
  },
  disabledButton: {
    opacity: 0.48,
  },
  disabledText: {
    color: "#8f7a70",
  },
  card: {
    backgroundColor: "#ffffff",
    borderColor: "#f0ded5",
    borderRadius: 26,
    borderWidth: 1,
    maxWidth: 520,
    padding: 16,
    width: "100%",
  },
  sectionLabel: {
    color: "#2d211d",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 12,
  },
  hairstyleList: {
    gap: 12,
    paddingRight: 8,
  },
  hairstyleCard: {
    backgroundColor: "#fff7f1",
    borderColor: "transparent",
    borderRadius: 20,
    borderWidth: 2,
    padding: 10,
    width: 148,
  },
  hairstyleCardSelected: {
    borderColor: "#b66352",
  },
  thumbnail: {
    alignItems: "center",
    borderRadius: 16,
    height: 112,
    justifyContent: "center",
    overflow: "hidden",
  },
  thumbnailImage: {
    height: 112,
    width: 112,
  },
  hairstyleName: {
    color: "#2d211d",
    fontSize: 15,
    fontWeight: "800",
    marginTop: 10,
  },
  hairstyleDescription: {
    color: "#75645c",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  helperText: {
    color: "#746158",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  controlGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  controlButton: {
    alignItems: "center",
    backgroundColor: "#fff7f1",
    borderColor: "#ead2c5",
    borderRadius: 16,
    borderWidth: 1,
    minWidth: 96,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  controlButtonText: {
    color: "#3b2b25",
    fontSize: 14,
    fontWeight: "800",
  },
  resetButton: {
    alignSelf: "flex-start",
    marginTop: 12,
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  resetButtonText: {
    color: "#b66352",
    fontSize: 14,
    fontWeight: "800",
  },
});
