/**
 * Livestock Saathi - Farmer AI Livestock Health Screening
 * File: mobile/app/(farmer)/ai-scan/index.tsx
 * 
 * Production-ready AI screening screen integrating real animal profiles,
 * camera/gallery photo capture via expo-image-picker, 27 clinical symptoms,
 * and live inference via POST /api/reports/triage.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { colors, typography, spacing, radii, shadows } from '../../../src/theme';
import animalService from '../../../src/services/animalService';
import aiScreeningService from '../../../src/services/aiScreeningService';
import { Animal, AnimalSpecies } from '../../../src/types/animal';
import { SYMPTOMS_27, SymptomTag, AiScreeningResponse } from '../../../src/types/aiScreening';

export default function FarmerAiScanScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ animalId?: string }>();

  // State
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loadingAnimals, setLoadingAnimals] = useState(true);
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);

  // Image state
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);

  // Symptoms & clinical observations state
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [customNotes, setCustomNotes] = useState('');
  const [temperature, setTemperature] = useState('');
  const [duration, setDuration] = useState('');

  // Analysis progression & submission state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStage, setAnalysisStage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Fetch farmer's herd to populate selector
  const fetchAnimals = useCallback(async () => {
    try {
      setLoadingAnimals(true);
      const list = await animalService.getAnimals();
      setAnimals(list || []);

      // If animalId passed via route param, preselect it
      if (params.animalId) {
        const found = (list || []).find((a) => (a._id || a.id) === params.animalId);
        if (found) {
          setSelectedAnimal(found);
        }
      } else if (list && list.length === 1) {
        // Automatically select if the farmer has exactly one animal
        setSelectedAnimal(list[0]);
      }
    } catch (err: any) {
      console.warn('Failed to load farmer livestock herd:', err);
    } finally {
      setLoadingAnimals(false);
    }
  }, [params.animalId]);

  useEffect(() => {
    fetchAnimals();
  }, [fetchAnimals]);

  // 2. Camera photo capture
  const handleTakePhoto = async () => {
    try {
      setErrorMessage(null);
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          'Camera Permission Needed',
          'Please allow camera permissions in your device settings to take a photo of the affected animal.',
          [{ text: 'OK' }]
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        setImageUri(asset.uri);
        if (asset.base64) {
          setImageBase64(`data:image/jpeg;base64,${asset.base64}`);
        }
      }
    } catch (err: any) {
      setErrorMessage('Could not open camera. Please try selecting an image from your gallery.');
    }
  };

  // 3. Gallery image picker
  const handlePickFromGallery = async () => {
    try {
      setErrorMessage(null);
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          'Gallery Permission Needed',
          'Please grant photo library access to upload a picture of the affected animal.',
          [{ text: 'OK' }]
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        setImageUri(asset.uri);
        if (asset.base64) {
          setImageBase64(`data:image/jpeg;base64,${asset.base64}`);
        }
      }
    } catch (err: any) {
      setErrorMessage('Could not pick image from gallery.');
    }
  };

  const handleClearImage = () => {
    setImageUri(null);
    setImageBase64(null);
  };

  // 4. Toggle symptom tag
  const toggleSymptom = (id: string) => {
    if (selectedSymptoms.includes(id)) {
      setSelectedSymptoms(selectedSymptoms.filter((s) => s !== id));
    } else {
      setSelectedSymptoms([...selectedSymptoms, id]);
    }
  };

  // 6. Multi-stage analysis & submission
  const handleSubmitScreening = async () => {
    setErrorMessage(null);

    if (!selectedAnimal) {
      setErrorMessage('Please select the animal to be screened.');
      return;
    }

    if (!imageBase64 && selectedSymptoms.length === 0 && !customNotes.trim()) {
      setErrorMessage('Please capture a photo of the lesion or select at least one observed symptom.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisStage('Analyzing livestock image...');

    try {
      // Stage 1: Image analysis
      await new Promise((resolve) => setTimeout(resolve, 600));
      setAnalysisStage('Assessing symptoms...');

      // Stage 2: Symptom evaluation
      await new Promise((resolve) => setTimeout(resolve, 600));
      setAnalysisStage('Preparing screening result...');

      const payload = {
        species: selectedAnimal.species || 'Cattle',
        symptoms: selectedSymptoms,
        temperature: temperature.trim() ? parseFloat(temperature) : 0,
        duration: duration.trim() ? parseFloat(duration) : 0,
        image: imageBase64 || null,
        notes: customNotes.trim() || undefined,
        location: {
          village: selectedAnimal.village || undefined,
          block: selectedAnimal.block || undefined,
          district: selectedAnimal.district || undefined,
        },
      };

      const result: AiScreeningResponse = await aiScreeningService.runTriageScreening(payload);

      // If user uploaded an image and screening produced a result, upload to storage
      if (imageBase64 && result.success) {
        aiScreeningService
          .uploadScanImage(imageBase64, {
            animalId: selectedAnimal._id || selectedAnimal.id,
            disease: result.possibleCondition || undefined,
            riskLevel: result.riskLevel,
            confidence: result.confidenceScore || undefined,
            symptoms: selectedSymptoms,
            temperature: payload.temperature,
            duration: payload.duration,
          })
          .catch(() => {});
      }

      setIsAnalyzing(false);

      // Navigate to results screen with clean serialized state
      router.push({
        pathname: '/(farmer)/ai-scan/result',
        params: {
          resultData: JSON.stringify(result),
          animalData: JSON.stringify(selectedAnimal),
          imageUri: imageUri || '',
          symptomsList: JSON.stringify(selectedSymptoms),
          temperature: temperature || '',
          duration: duration || '',
          notes: customNotes || '',
        },
      });
    } catch (err: any) {
      setIsAnalyzing(false);
      setErrorMessage(err.message || 'AI screening failed. Please check your connectivity and retry.');
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      {/* Header Banner */}
      <View style={styles.header}>
        <View style={styles.badgePill}>
          <Text style={styles.badgePillText}>AI HEALTH ASSISTANT</Text>
        </View>
        <Text style={styles.title}>AI Livestock Health Screening</Text>
        <Text style={styles.subtitle}>
          Upload an animal image and describe its symptoms for an AI-assisted preliminary health screening.
        </Text>
      </View>

      {/* Error notice banner */}
      {errorMessage && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
        </View>
      )}

      {/* Section 1: Animal Selection */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>1. Select Animal</Text>
          <Text style={styles.requiredLabel}>* Required</Text>
        </View>

        {loadingAnimals ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={colors.light.primary} />
            <Text style={styles.loadingSub}>Loading your registered livestock...</Text>
          </View>
        ) : animals.length === 0 ? (
          <View style={styles.noAnimalsBox}>
            <Text style={styles.noAnimalsEmoji}>🐄</Text>
            <Text style={styles.noAnimalsTitle}>No animals registered yet.</Text>
            <Text style={styles.noAnimalsSub}>
              Register your animal first so this screening can be linked to its medical history.
            </Text>
            <TouchableOpacity
              style={styles.addAnimalBtn}
              onPress={() => router.push('/(farmer)/animals/add')}
            >
              <Text style={styles.addAnimalBtnText}>+ Register Animal</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <Text style={styles.pickerHint}>
              Tap to choose the animal being examined ({animals.length} available):
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.animalChipScroll}>
              {animals.map((a) => {
                const targetId = a._id || a.id;
                const isSelected = selectedAnimal && (selectedAnimal._id || selectedAnimal.id) === targetId;

                return (
                  <TouchableOpacity
                    key={targetId}
                    style={[styles.animalChip, isSelected && styles.animalChipSelected]}
                    onPress={() => setSelectedAnimal(a)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.animalChipEmoji}>
                      {a.species === 'Buffalo' ? '🐃' : a.species === 'Goat' ? '🐐' : a.species === 'Sheep' ? '🐑' : '🐄'}
                    </Text>
                    <View>
                      <Text style={[styles.animalChipName, isSelected && styles.chipTextSelected]}>
                        {a.name || a.tagId}
                      </Text>
                      <Text style={[styles.animalChipTag, isSelected && styles.chipSubSelected]}>
                        🏷️ {a.tagId} • {a.species}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {selectedAnimal && (
              <View style={styles.selectedAnimalBanner}>
                <Text style={styles.selectedAnimalText}>
                  Selected: <Text style={{ fontWeight: 'bold' }}>{selectedAnimal.name}</Text> (Tag: {selectedAnimal.tagId}, {selectedAnimal.species} {selectedAnimal.breed ? `• ${selectedAnimal.breed}` : ''})
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Section 2: Photo Capture */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>2. Capture Lesion / Skin Photo</Text>
          <Text style={styles.optionalLabel}>Recommended</Text>
        </View>
        <Text style={styles.cardDesc}>
          Take a clear photo of skin nodules, mouth blisters, or visible lesions for computer vision evaluation (lsd_model.keras).
        </Text>

        {imageUri ? (
          <View style={styles.previewContainer}>
            <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
            <TouchableOpacity style={styles.clearImageBtn} onPress={handleClearImage}>
              <Text style={styles.clearImageBtnText}>✕ Remove / Retake Photo</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.photoActionRow}>
            <TouchableOpacity style={styles.photoBtnPrimary} onPress={handleTakePhoto} activeOpacity={0.8}>
              <Text style={styles.photoBtnIcon}>📷</Text>
              <Text style={styles.photoBtnText}>Take Camera Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.photoBtnSecondary} onPress={handlePickFromGallery} activeOpacity={0.8}>
              <Text style={styles.photoBtnIcon}>🖼️</Text>
              <Text style={styles.photoBtnSecText}>Choose from Gallery</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Section 3: Observed Symptoms */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>3. Observed Symptoms</Text>
          <Text style={styles.optionalLabel}>Select all that apply</Text>
        </View>
        <Text style={styles.cardDesc}>
          Tap observed symptoms to correlate with epidemiological and clinical disease profiles:
        </Text>

        <View style={styles.symptomsGrid}>
          {SYMPTOMS_27.map((item: SymptomTag) => {
            const isSelected = selectedSymptoms.includes(item.id);
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.symptomChip, isSelected && styles.symptomChipSelected]}
                onPress={() => toggleSymptom(item.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.symptomText, isSelected && styles.symptomTextSelected]}>
                  {isSelected ? '✓ ' : '+ '}{item.labelEn}
                </Text>
                <Text style={[styles.symptomLocalText, isSelected && styles.symptomLocalSelected]}>
                  {item.labelHi}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Vital Signs (Temperature & Duration) */}
        <View style={styles.vitalsRow}>
          <View style={styles.vitalCol}>
            <Text style={styles.fieldLabel}>Body Temperature (°C)</Text>
            <TextInput
              style={styles.vitalInput}
              placeholder="e.g. 39.5"
              placeholderTextColor={colors.light.textMuted}
              value={temperature}
              onChangeText={setTemperature}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.vitalCol}>
            <Text style={styles.fieldLabel}>Duration (Hours)</Text>
            <TextInput
              style={styles.vitalInput}
              placeholder="e.g. 48"
              placeholderTextColor={colors.light.textMuted}
              value={duration}
              onChangeText={setDuration}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Free-text Observation Field */}
        <View style={styles.notesSection}>
          <View style={styles.notesHeader}>
            <Text style={styles.fieldLabel}>Additional Observations / Symptoms</Text>
            <View style={styles.voiceUnavailableBadge}>
              <Text style={styles.voiceUnavailableText}>🎤 Voice: Unavailable</Text>
            </View>
          </View>

          <TextInput
            style={styles.notesInput}
            multiline
            numberOfLines={4}
            placeholder="Describe symptoms such as fever, coughing, nasal discharge, loss of appetite, swelling, reduced milk production..."
            placeholderTextColor={colors.light.textMuted}
            value={customNotes}
            onChangeText={setCustomNotes}
            textAlignVertical="top"
          />
        </View>
      </View>

      {/* Mandatory Medical Disclaimer Banner */}
      <View style={styles.disclaimerBanner}>
        <Text style={styles.disclaimerTitle}>⚖️ Important Clinical Notice</Text>
        <Text style={styles.disclaimerBody}>
          AI-assisted preliminary screening only. This does not constitute a final veterinary diagnosis. If symptoms are severe or deteriorating, contact your nearest veterinary dispensary immediately.
        </Text>
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitButton, isAnalyzing && styles.submitButtonDisabled]}
        onPress={handleSubmitScreening}
        disabled={isAnalyzing}
        activeOpacity={0.8}
      >
        {isAnalyzing ? (
          <View style={styles.analyzingRow}>
            <ActivityIndicator color={colors.light.textInverse} size="small" />
            <Text style={styles.analyzingText}>{analysisStage || 'Analyzing livestock data...'}</Text>
          </View>
        ) : (
          <Text style={styles.submitButtonText}>Submit for AI Screening</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  container: {
    padding: spacing.base,
    paddingBottom: spacing.hero,
  },
  header: {
    marginBottom: spacing.base,
  },
  badgePill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.light.primarySubtle,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.round,
    marginBottom: spacing.xs,
  },
  badgePillText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: colors.light.primary,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  subtitle: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  errorBox: {
    backgroundColor: colors.light.dangerBg,
    padding: spacing.md,
    borderRadius: radii.sm,
    marginBottom: spacing.base,
  },
  errorText: {
    color: colors.light.danger,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },
  card: {
    backgroundColor: colors.light.surface,
    borderRadius: radii.md,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.light.border,
    marginBottom: spacing.base,
    ...shadows.sm,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  cardTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  requiredLabel: {
    fontSize: 11,
    color: colors.light.danger,
    fontWeight: typography.weights.semibold,
  },
  optionalLabel: {
    fontSize: 11,
    color: colors.light.textMuted,
  },
  cardDesc: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
    marginBottom: spacing.sm,
    lineHeight: 16,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  loadingSub: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
  },
  noAnimalsBox: {
    padding: spacing.base,
    alignItems: 'center',
    backgroundColor: colors.light.surfaceAlt,
    borderRadius: radii.sm,
  },
  noAnimalsEmoji: {
    fontSize: 32,
    marginBottom: spacing.xs,
  },
  noAnimalsTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  noAnimalsSub: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
    textAlign: 'center',
    marginVertical: spacing.xs,
  },
  addAnimalBtn: {
    backgroundColor: colors.light.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.xs,
    marginTop: spacing.xs,
  },
  addAnimalBtnText: {
    color: colors.light.textInverse,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.xs,
  },
  pickerHint: {
    fontSize: 11,
    color: colors.light.textMuted,
    marginBottom: spacing.xs,
  },
  animalChipScroll: {
    flexDirection: 'row',
    marginVertical: spacing.xs,
  },
  animalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.light.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    marginRight: spacing.sm,
    gap: spacing.sm,
  },
  animalChipSelected: {
    backgroundColor: colors.light.primarySubtle,
    borderColor: colors.light.primary,
  },
  animalChipEmoji: {
    fontSize: 22,
  },
  animalChipName: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  chipTextSelected: {
    color: colors.light.primary,
  },
  animalChipTag: {
    fontSize: 10,
    color: colors.light.textMuted,
    marginTop: 2,
  },
  chipSubSelected: {
    color: colors.light.primaryDark,
  },
  selectedAnimalBanner: {
    backgroundColor: colors.light.primaryHighlight,
    padding: spacing.sm,
    borderRadius: radii.xs,
    marginTop: spacing.sm,
  },
  selectedAnimalText: {
    fontSize: typography.sizes.xs,
    color: colors.light.primaryDark,
  },
  photoActionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  photoBtnPrimary: {
    flex: 1,
    backgroundColor: colors.light.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radii.sm,
    gap: spacing.xs,
    ...shadows.sm,
  },
  photoBtnIcon: {
    fontSize: 18,
  },
  photoBtnText: {
    color: colors.light.textInverse,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.xs,
  },
  photoBtnSecondary: {
    flex: 1,
    backgroundColor: colors.light.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.light.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radii.sm,
    gap: spacing.xs,
  },
  photoBtnSecText: {
    color: colors.light.textPrimary,
    fontWeight: typography.weights.semibold,
    fontSize: typography.sizes.xs,
  },
  previewContainer: {
    borderRadius: radii.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.light.border,
    marginTop: spacing.xs,
  },
  previewImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#000',
  },
  clearImageBtn: {
    backgroundColor: colors.light.dangerBg,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  clearImageBtnText: {
    color: colors.light.danger,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.xs,
  },
  symptomsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  symptomChip: {
    backgroundColor: colors.light.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.light.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.sm,
    marginBottom: 4,
  },
  symptomChipSelected: {
    backgroundColor: colors.light.primary,
    borderColor: colors.light.primary,
  },
  symptomText: {
    fontSize: 11,
    fontWeight: typography.weights.medium,
    color: colors.light.textPrimary,
  },
  symptomTextSelected: {
    color: colors.light.textInverse,
    fontWeight: typography.weights.bold,
  },
  symptomLocalText: {
    fontSize: 9,
    color: colors.light.textMuted,
    marginTop: 1,
  },
  symptomLocalSelected: {
    color: 'rgba(255,255,255,0.8)',
  },
  vitalsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  vitalCol: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.light.textPrimary,
    marginBottom: 4,
  },
  vitalInput: {
    backgroundColor: colors.light.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    fontSize: typography.sizes.xs,
    color: colors.light.textPrimary,
  },
  notesSection: {
    marginTop: spacing.xs,
  },
  notesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  voiceUnavailableBadge: {
    backgroundColor: colors.light.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.light.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.round,
  },
  voiceUnavailableText: {
    fontSize: 10,
    color: colors.light.textMuted,
    fontWeight: typography.weights.medium,
  },
  notesInput: {
    backgroundColor: colors.light.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: radii.sm,
    padding: spacing.sm,
    fontSize: typography.sizes.xs,
    color: colors.light.textPrimary,
    minHeight: 70,
  },
  disclaimerBanner: {
    backgroundColor: '#FFFBEB',
    borderLeftWidth: 4,
    borderLeftColor: colors.light.warning,
    padding: spacing.md,
    borderRadius: radii.sm,
    marginBottom: spacing.base,
  },
  disclaimerTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: '#92400E',
    marginBottom: 2,
  },
  disclaimerBody: {
    fontSize: 11,
    color: '#78350F',
    lineHeight: 16,
  },
  submitButton: {
    backgroundColor: colors.light.primary,
    paddingVertical: spacing.md,
    borderRadius: radii.sm,
    alignItems: 'center',
    ...shadows.sm,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: colors.light.textInverse,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  analyzingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  analyzingText: {
    color: colors.light.textInverse,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
});
