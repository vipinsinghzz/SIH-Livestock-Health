/**
 * Livestock Saathi - Edit Animal Screen
 * File: mobile/app/(farmer)/animals/edit/[id].tsx
 * 
 * Pre-populates and updates animal profile data via PATCH /api/animals/:id.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, typography, spacing, radii, shadows } from '../../../../src/theme';
import animalService from '../../../../src/services/animalService';
import { Animal, AnimalGender, AnimalHealthStatus } from '../../../../src/types/animal';

const GENDERS: AnimalGender[] = ['Female', 'Male'];
const HEALTH_STATUSES: AnimalHealthStatus[] = ['Healthy', 'Needs Attention', 'Critical'];

export default function EditAnimalScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [animal, setAnimal] = useState<Animal | null>(null);
  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<AnimalGender>('Female');
  const [healthStatus, setHealthStatus] = useState<AnimalHealthStatus>('Healthy');
  const [milkYieldDaily, setMilkYieldDaily] = useState('');

  const loadAnimalData = useCallback(async () => {
    if (!id) return;
    try {
      setErrorMsg(null);
      const data = await animalService.getAnimalById(id);
      setAnimal(data);
      setName(data.name || '');
      setBreed(data.breed || '');
      setAge(data.age ? data.age.toString() : '');
      setGender(data.gender || 'Female');
      setHealthStatus(data.healthStatus || 'Healthy');
      setMilkYieldDaily(data.milkYieldDaily || '');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load existing animal profile.');
    } finally {
      setLoadingInitial(false);
    }
  }, [id]);

  useEffect(() => {
    loadAnimalData();
  }, [loadAnimalData]);

  const handleUpdate = async () => {
    if (!id) return;
    setErrorMsg(null);

    const parsedAge = parseInt(age, 10);
    if (isNaN(parsedAge) || parsedAge < 0 || parsedAge > 40) {
      setErrorMsg('Please specify a valid age between 0 and 40 years.');
      return;
    }

    setSaving(true);

    try {
      await animalService.updateAnimal(id, {
        name: name.trim() || undefined,
        breed: breed.trim() || undefined,
        age: parsedAge,
        gender,
        healthStatus,
        milkYieldDaily: milkYieldDaily.trim() || undefined,
      });

      Alert.alert('Profile Updated', 'Animal details were updated successfully.', [
        {
          text: 'OK',
          onPress: () => router.replace(`/(farmer)/animals/${id}` as any),
        },
      ]);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update animal record.');
    } finally {
      setSaving(false);
    }
  };

  if (loadingInitial) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.light.primary} />
        <Text style={styles.loadingText}>Loading current details...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Edit Animal Details</Text>
        <Text style={styles.subtitle}>
          Tag ID: <Text style={styles.tagHighlight}>{animal?.tagId}</Text> • {animal?.species}
        </Text>
      </View>

      {errorMsg && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
        </View>
      )}

      {/* Name */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Animal Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Enter animal name"
          placeholderTextColor={colors.light.textMuted}
        />
      </View>

      {/* Breed */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Breed</Text>
        <TextInput
          style={styles.input}
          value={breed}
          onChangeText={setBreed}
          placeholder="Enter breed"
          placeholderTextColor={colors.light.textMuted}
        />
      </View>

      {/* Age & Gender */}
      <View style={styles.row}>
        <View style={[styles.formGroup, styles.flex1]}>
          <Text style={styles.label}>Age (Years)</Text>
          <TextInput
            style={styles.input}
            value={age}
            onChangeText={setAge}
            keyboardType="numeric"
            placeholder="Age"
            placeholderTextColor={colors.light.textMuted}
          />
        </View>

        <View style={[styles.formGroup, styles.flex1]}>
          <Text style={styles.label}>Gender</Text>
          <View style={styles.genderRow}>
            {GENDERS.map((g) => {
              const isSelected = gender === g;
              return (
                <TouchableOpacity
                  key={g}
                  style={[styles.genderChip, isSelected && styles.chipSelected]}
                  onPress={() => setGender(g)}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                    {g}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      {/* Health Status */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Current Health Status</Text>
        <View style={styles.statusRow}>
          {HEALTH_STATUSES.map((status) => {
            const isSelected = healthStatus === status;
            let activeColor: string = colors.light.primary;
            if (status === 'Needs Attention') activeColor = colors.light.warning;
            if (status === 'Critical') activeColor = colors.light.danger;

            return (
              <TouchableOpacity
                key={status}
                style={[
                  styles.statusChip,
                  isSelected && { backgroundColor: activeColor, borderColor: activeColor },
                ]}
                onPress={() => setHealthStatus(status)}
              >
                <Text
                  style={[
                    styles.statusChipText,
                    isSelected && { color: colors.light.textInverse },
                  ]}
                >
                  {status}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Daily Milk Yield */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Daily Milk Yield</Text>
        <TextInput
          style={styles.input}
          value={milkYieldDaily}
          onChangeText={setMilkYieldDaily}
          placeholder="e.g. 12.0 L or N/A"
          placeholderTextColor={colors.light.textMuted}
        />
      </View>

      {/* Submit */}
      <TouchableOpacity
        style={[styles.submitBtn, saving && styles.submitBtnDisabled]}
        onPress={handleUpdate}
        disabled={saving}
        activeOpacity={0.8}
      >
        {saving ? (
          <ActivityIndicator color={colors.light.textInverse} />
        ) : (
          <Text style={styles.submitBtnText}>Save Changes</Text>
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.light.background,
  },
  loadingText: {
    fontSize: typography.sizes.sm,
    color: colors.light.textSecondary,
    marginTop: spacing.sm,
  },
  header: {
    marginBottom: spacing.base,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  subtitle: {
    fontSize: typography.sizes.xs,
    color: colors.light.textSecondary,
    marginTop: 2,
  },
  tagHighlight: {
    color: colors.light.primary,
    fontWeight: typography.weights.bold,
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
  formGroup: {
    marginBottom: spacing.base,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.light.textPrimary,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.light.surface,
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.sizes.sm,
    color: colors.light.textPrimary,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  flex1: {
    flex: 1,
  },
  genderRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  genderChip: {
    flex: 1,
    backgroundColor: colors.light.surface,
    borderWidth: 1,
    borderColor: colors.light.border,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radii.sm,
  },
  statusRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  statusChip: {
    flex: 1,
    backgroundColor: colors.light.surface,
    borderWidth: 1,
    borderColor: colors.light.border,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radii.sm,
  },
  statusChipText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.light.textSecondary,
  },
  chipSelected: {
    backgroundColor: colors.light.primary,
    borderColor: colors.light.primary,
  },
  chipText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    color: colors.light.textSecondary,
  },
  chipTextSelected: {
    color: colors.light.textInverse,
    fontWeight: typography.weights.bold,
  },
  submitBtn: {
    backgroundColor: colors.light.primary,
    borderRadius: radii.sm,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
    ...shadows.sm,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: colors.light.textInverse,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
  },
});
