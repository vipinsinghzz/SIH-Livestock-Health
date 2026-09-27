/**
 * Livestock Saathi - Register Animal Screen
 * File: mobile/app/(farmer)/animals/add.tsx
 * 
 * Production form to register a new animal into the farmer's herd,
 * integrated with backend POST /api/animals.
 */

import React, { useState } from 'react';
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
import { useRouter } from 'expo-router';
import { useAuth } from '../../../src/context/AuthContext';
import { useAppLanguage } from '../../../src/services/i18n';
import { colors, typography, spacing, radii, shadows } from '../../../src/theme';
import animalService from '../../../src/services/animalService';
import { AnimalSpecies, AnimalGender, AnimalHealthStatus } from '../../../src/types/animal';

const SPECIES_LIST: AnimalSpecies[] = [
  'Cattle',
  'Buffalo',
  'Goat',
  'Sheep',
  'Pig',
  'Poultry',
  'Other',
];

const GENDERS: AnimalGender[] = ['Female', 'Male'];

const HEALTH_STATUSES: AnimalHealthStatus[] = ['Healthy', 'Needs Attention', 'Critical'];

export default function AddAnimalScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useAppLanguage();

  const [species, setSpecies] = useState<AnimalSpecies>('Cattle');
  const [tagId, setTagId] = useState('');
  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<AnimalGender>('Female');
  const [healthStatus, setHealthStatus] = useState<AnimalHealthStatus>('Healthy');
  const [milkYieldDaily, setMilkYieldDaily] = useState('');
  const [village, setVillage] = useState(user?.village || '');
  const [block, setBlock] = useState(user?.block || '');
  const [district, setDistrict] = useState(user?.district || '');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async () => {
    setErrorMsg(null);

    if (!species) {
      setErrorMsg('Please select an animal species.');
      return;
    }

    const parsedAge = age.trim() ? parseInt(age, 10) : undefined;
    if (parsedAge !== undefined && (isNaN(parsedAge) || parsedAge < 0 || parsedAge > 40)) {
      setErrorMsg('Please provide a valid age in years (0 - 40).');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        species,
        tagId: tagId.trim() ? tagId.trim().toUpperCase() : undefined,
        name: name.trim() || undefined,
        breed: breed.trim() || undefined,
        age: parsedAge,
        gender,
        healthStatus,
        milkYieldDaily: milkYieldDaily.trim() || undefined,
        village: village.trim() || undefined,
        block: block.trim() || undefined,
        district: district.trim() || undefined,
      };

      const created = await animalService.createAnimal(payload);

      Alert.alert(
        'Registration Complete',
        `${created.name || created.tagId} has been successfully added to your herd registry.`,
        [
          {
            text: 'View Profile',
            onPress: () => {
              const id = created._id || created.id;
              router.replace(`/(farmer)/animals/${id}` as any);
            },
          },
          {
            text: 'Herd List',
            onPress: () => router.replace('/(farmer)/animals'),
            style: 'cancel',
          },
        ]
      );
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to register animal. Please check inputs and retry.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('nav.registerAnimal', 'Register Livestock')}</Text>
        <Text style={styles.subtitle}>
          {t('farmer.registerLivestock', 'Add animal credentials, RFID tag, breed, and health baseline to your digital herd.')}
        </Text>
      </View>

      {errorMsg && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
        </View>
      )}

      {/* Species Selector */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>
          {t('farmer.species', 'Animal Species')} <Text style={styles.requiredStar}>*</Text>
        </Text>
        <View style={styles.chipRow}>
          {SPECIES_LIST.map((item) => {
            const isSelected = species === item;
            return (
              <TouchableOpacity
                key={item}
                style={[styles.chip, isSelected && styles.chipSelected]}
                onPress={() => {
                  setSpecies(item);
                }}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                  {t(`farmer.${item.toLowerCase()}`, item)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Tag ID (RFID / Govt Tag) */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>{t('farmer.tagId', 'Tag ID / RFID (Optional)')}</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. MH-12-P-4821"
          placeholderTextColor={colors.light.textMuted}
          value={tagId}
          onChangeText={setTagId}
          autoCapitalize="characters"
        />
        <Text style={styles.helperText}>
          {t('farmer.tagId', 'If you have a 12-digit INAPH ear tag or RFID chip, enter it here.')}
        </Text>
      </View>

      {/* Animal Name */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>{t('farmer.animalName', 'Animal Name')}</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Lakshmi, Gauri, Raja"
          placeholderTextColor={colors.light.textMuted}
          value={name}
          onChangeText={setName}
        />
      </View>

      {/* Breed */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>{t('farmer.breed', 'Breed')}</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Gir, Murrah, Sahiwal"
          placeholderTextColor={colors.light.textMuted}
          value={breed}
          onChangeText={setBreed}
        />
      </View>

      {/* Two column: Age & Gender */}
      <View style={styles.row}>
        <View style={[styles.formGroup, styles.flex1]}>
          <Text style={styles.label}>{t('farmer.age', 'Age (Years)')}</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 3"
            placeholderTextColor={colors.light.textMuted}
            value={age}
            onChangeText={setAge}
            keyboardType="numeric"
          />
        </View>

        <View style={[styles.formGroup, styles.flex1]}>
          <Text style={styles.label}>{t('farmer.gender', 'Gender')}</Text>
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
                    {g === 'Female' ? t('farmer.female', 'Female') : t('farmer.male', 'Male')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      {/* Health Status */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>{t('common.status', 'Initial Health Status')}</Text>
        <View style={styles.statusRow}>
          {HEALTH_STATUSES.map((status) => {
            const isSelected = healthStatus === status;
            let activeColor: string = colors.light.primary;
            if (status === 'Needs Attention') activeColor = colors.light.warning;
            if (status === 'Critical') activeColor = colors.light.danger;

            const statusLabel =
              status === 'Healthy'
                ? t('farmer.healthy', 'Healthy')
                : status === 'Needs Attention'
                ? t('farmer.attention', 'Attention')
                : t('farmer.critical', 'Critical');

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
                  {statusLabel}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Daily Milk Yield */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>{t('farmer.milkYield', 'Daily Milk Yield (Optional)')}</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 12.0 L"
          placeholderTextColor={colors.light.textMuted}
          value={milkYieldDaily}
          onChangeText={setMilkYieldDaily}
        />
      </View>

      {/* Location (Village, Block, District) */}
      <View style={styles.sectionDivider}>
        <Text style={styles.sectionDividerTitle}>{t('cases.location', 'Location Details')}</Text>
      </View>

      <View style={styles.row}>
        <View style={[styles.formGroup, styles.flex1]}>
          <Text style={styles.label}>{t('farmer.village', 'Village')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('farmer.village', 'Village name')}
            placeholderTextColor={colors.light.textMuted}
            value={village}
            onChangeText={setVillage}
          />
        </View>

        <View style={[styles.formGroup, styles.flex1]}>
          <Text style={styles.label}>{t('farmer.block', 'Block / Taluka')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('farmer.block', 'Block name')}
            placeholderTextColor={colors.light.textMuted}
            value={block}
            onChangeText={setBlock}
          />
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>{t('farmer.district', 'District')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('farmer.district', 'District name')}
          placeholderTextColor={colors.light.textMuted}
          value={district}
          onChangeText={setDistrict}
        />
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color={colors.light.textInverse} />
        ) : (
          <Text style={styles.submitButtonText}>{t('common.save', 'Register Animal to Herd')}</Text>
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
  formGroup: {
    marginBottom: spacing.base,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.light.textPrimary,
    marginBottom: spacing.xs,
  },
  requiredStar: {
    color: colors.light.danger,
  },
  helperText: {
    fontSize: 11,
    color: colors.light.textMuted,
    marginTop: 4,
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
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    backgroundColor: colors.light.surface,
    borderWidth: 1,
    borderColor: colors.light.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
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
  sectionDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
    paddingTop: spacing.base,
    marginBottom: spacing.sm,
  },
  sectionDividerTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  submitButton: {
    backgroundColor: colors.light.primary,
    borderRadius: radii.sm,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
    ...shadows.sm,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: colors.light.textInverse,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
  },
});
