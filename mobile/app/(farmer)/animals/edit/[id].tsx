/**
 * PashuCare - Edit Animal Screen
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
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, typography, spacing, radii, shadows } from '../../../../src/theme';
import animalService from '../../../../src/services/animalService';
import { Animal, AnimalGender, AnimalHealthStatus } from '../../../../src/types/animal';

const GENDERS: AnimalGender[] = ['Female', 'Male'];
const HEALTH_STATUSES: AnimalHealthStatus[] = ['Healthy', 'Needs Attention', 'Critical'];

interface QuickSymptom {
  id: string;
  icon: string;
  name: string;
  tier: 'Critical' | 'Needs Attention' | 'Healthy';
}

const QUICK_SYMPTOMS: QuickSymptom[] = [
  // CRITICAL
  { id: 'fever', icon: '🌡️', name: 'High Fever', tier: 'Critical' },
  { id: 'skin_nodules', icon: '🪢', name: 'Skin Nodules / Lumps', tier: 'Critical' },
  { id: 'salivation', icon: '💧', name: 'Excessive Salivation', tier: 'Critical' },

  // NEEDS ATTENTION
  { id: 'swelling', icon: '🩹', name: 'Swelling', tier: 'Needs Attention' },
  { id: 'lethargy', icon: '🥱', name: 'Lethargy & Weakness', tier: 'Needs Attention' },
  { id: 'off_feed', icon: '🌾', name: 'Loss of Appetite', tier: 'Needs Attention' },
  { id: 'lameness', icon: '🦶', name: 'Limping / Lameness', tier: 'Needs Attention' },
  { id: 'cough', icon: '🤧', name: 'Cough / Discharge', tier: 'Needs Attention' },
  { id: 'milk_drop', icon: '📉', name: 'Sudden Milk Drop', tier: 'Needs Attention' },

  // HEALTHY
  { id: 'healthy_normal', icon: '✨', name: 'No Symptoms / Active', tier: 'Healthy' },
];

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
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [symptomNotes, setSymptomNotes] = useState('');

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

  const toggleSymptom = (sym: QuickSymptom) => {
    if (sym.id === 'healthy_normal') {
      setSelectedSymptoms(['healthy_normal']);
      setHealthStatus('Healthy');
      return;
    }

    let next = selectedSymptoms.filter((id) => id !== 'healthy_normal');
    if (next.includes(sym.id)) {
      next = next.filter((id) => id !== sym.id);
    } else {
      next = [...next, sym.id];
    }
    setSelectedSymptoms(next);

    if (next.length === 0) {
      setHealthStatus(animal?.healthStatus || 'Healthy');
      return;
    }

    const hasCritical = next.some((id) =>
      QUICK_SYMPTOMS.some((s) => s.id === id && s.tier === 'Critical')
    );
    const hasAttention = next.some((id) =>
      QUICK_SYMPTOMS.some((s) => s.id === id && s.tier === 'Needs Attention')
    );

    if (hasCritical) {
      setHealthStatus('Critical');
    } else if (hasAttention) {
      setHealthStatus('Needs Attention');
    } else {
      setHealthStatus('Healthy');
    }
  };

  const handleNotesChange = (text: string) => {
    setSymptomNotes(text);
    const lower = text.toLowerCase();
    const hasCritText = ['fever', 'nodule', 'lump', 'salivat', 'ताप', 'बुखार', 'गांठ', 'लाळ', 'लार'].some((k) =>
      lower.includes(k)
    );
    const hasAttnText = ['swell', 'सूजन', 'सूज', 'weak', 'appetite', 'limp', 'cough', 'milk'].some((k) =>
      lower.includes(k)
    );
    if (hasCritText) {
      setHealthStatus('Critical');
    } else if (hasAttnText && healthStatus !== 'Critical') {
      setHealthStatus('Needs Attention');
    }
  };

  const isCriticalEval =
    healthStatus === 'Critical' ||
    selectedSymptoms.some((id) => QUICK_SYMPTOMS.some((s) => s.id === id && s.tier === 'Critical'));

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
      const timelineEvent = (selectedSymptoms.length > 0 || symptomNotes.trim()) ? {
        type: 'Health Check',
        title: `Health Status: ${healthStatus}${isCriticalEval ? ' (Veterinary Evaluation Recommended)' : ''}`,
        date: new Date().toLocaleDateString('en-GB'),
        notes: symptomNotes.trim() || (isCriticalEval ? 'Recommendation of Veterinary Evaluation advised.' : `Observed: ${selectedSymptoms.join(', ')}`),
        status: healthStatus,
        symptoms: selectedSymptoms,
      } : undefined;

      await animalService.updateAnimal(id, {
        name: name.trim() || undefined,
        breed: breed.trim() || undefined,
        age: parsedAge,
        gender,
        healthStatus,
        milkYieldDaily: milkYieldDaily.trim() || undefined,
        newTimelineEvent: timelineEvent as any,
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
        <View style={styles.healthStatusHeader}>
          <Text style={styles.label}>Current Health Status</Text>
          <Text
            style={[
              styles.healthBadge,
              healthStatus === 'Critical'
                ? styles.badgeCritical
                : healthStatus === 'Needs Attention'
                ? styles.badgeAttention
                : styles.badgeHealthy,
            ]}
          >
            ● {healthStatus}
          </Text>
        </View>
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

      {/* Symptoms Categorizer (Healthy, Needs Attention, Critical) */}
      <View style={styles.formGroup}>
        <View style={styles.symptomsHeader}>
          <Text style={styles.label}>Observed Symptoms (Auto-Categorizes)</Text>
          {selectedSymptoms.length > 0 && (
            <TouchableOpacity onPress={() => setSelectedSymptoms([])}>
              <Text style={styles.clearBtnText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tier 1: CRITICAL Symptoms */}
        <View style={styles.tierBoxCritical}>
          <Text style={styles.tierLabelCritical}>🚨 CRITICAL SYMPTOMS (Requires Vet Evaluation)</Text>
          <View style={styles.chipsWrap}>
            {QUICK_SYMPTOMS.filter((s) => s.tier === 'Critical').map((sym) => {
              const active = selectedSymptoms.includes(sym.id);
              return (
                <TouchableOpacity
                  key={sym.id}
                  style={[styles.symChip, styles.symChipCritical, active && styles.symChipCriticalActive]}
                  onPress={() => toggleSymptom(sym)}
                >
                  <Text style={[styles.symChipText, active && styles.symChipTextActive]}>
                    {sym.icon} {sym.name} {active ? '✓' : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Tier 2: NEEDS ATTENTION Symptoms */}
        <View style={styles.tierBoxAttention}>
          <Text style={styles.tierLabelAttention}>⚠️ NEEDS ATTENTION SYMPTOMS</Text>
          <View style={styles.chipsWrap}>
            {QUICK_SYMPTOMS.filter((s) => s.tier === 'Needs Attention').map((sym) => {
              const active = selectedSymptoms.includes(sym.id);
              return (
                <TouchableOpacity
                  key={sym.id}
                  style={[styles.symChip, styles.symChipAttention, active && styles.symChipAttentionActive]}
                  onPress={() => toggleSymptom(sym)}
                >
                  <Text style={[styles.symChipText, active && styles.symChipTextActive]}>
                    {sym.icon} {sym.name} {active ? '✓' : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Tier 3: HEALTHY */}
        <View style={styles.tierBoxHealthy}>
          <Text style={styles.tierLabelHealthy}>✅ HEALTHY / ACTIVE</Text>
          <View style={styles.chipsWrap}>
            {QUICK_SYMPTOMS.filter((s) => s.tier === 'Healthy').map((sym) => {
              const active = selectedSymptoms.includes(sym.id);
              return (
                <TouchableOpacity
                  key={sym.id}
                  style={[styles.symChip, styles.symChipHealthy, active && styles.symChipHealthyActive]}
                  onPress={() => toggleSymptom(sym)}
                >
                  <Text style={[styles.symChipText, active && styles.symChipTextActive]}>
                    {sym.icon} {sym.name} {active ? '✓' : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      {/* Clinical Notes & Observations */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Clinical Observation Notes</Text>
        <TextInput
          style={styles.input}
          value={symptomNotes}
          onChangeText={handleNotesChange}
          placeholder="e.g. Swelling observed on leg, mild cough"
          placeholderTextColor={colors.light.textMuted}
        />
      </View>

      {/* Recommendation of Veterinary Evaluation Banner */}
      {isCriticalEval && (
        <View style={styles.vetRecCard}>
          <View style={styles.vetRecHeader}>
            <Text style={styles.vetRecBadge}>⚠️ CRITICAL ALERT</Text>
            <Text style={styles.vetRecTitle}>Recommendation of Veterinary Evaluation</Text>
            <Text style={styles.vetRecSubtitle}>पशुवैद्यकीय तपासणीची शिफारस • पशुचिकित्सक मूल्यांकन</Text>
          </View>
          <Text style={styles.vetRecDesc}>
            One or more critical signs (High Fever, Skin Nodules/Lumps, or Excessive Salivation) were reported. Even if combined with mild signs, immediate evaluation by a qualified veterinarian is strongly recommended to protect animal health.
          </Text>
          <View style={styles.vetRecActions}>
            <TouchableOpacity
              style={styles.vetRecCallBtn}
              onPress={() => Linking.openURL('tel:1962')}
            >
              <Text style={styles.vetRecCallBtnText}>📞 Call 1962 Helpline</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.vetRecFindBtn}
              onPress={() => router.push('/(farmer)/veterinary-help' as any)}
            >
              <Text style={styles.vetRecFindBtnText}>👨‍⚕️ Available Vets</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

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
    fontWeight: typography.weights.bold,
    color: colors.light.textPrimary,
  },
  healthStatusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  healthBadge: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  badgeCritical: {
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
  },
  badgeAttention: {
    backgroundColor: '#fef3c7',
    color: '#b45309',
  },
  badgeHealthy: {
    backgroundColor: '#dcfce7',
    color: '#15803d',
  },
  symptomsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  clearBtnText: {
    fontSize: typography.sizes.xs,
    color: colors.light.textMuted,
    textDecorationLine: 'underline',
  },
  tierBoxCritical: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: radii.sm,
    padding: spacing.xs,
    marginBottom: spacing.xs,
  },
  tierLabelCritical: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: '#991b1b',
    marginBottom: 4,
  },
  tierBoxAttention: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fcd34d',
    borderRadius: radii.sm,
    padding: spacing.xs,
    marginBottom: spacing.xs,
  },
  tierLabelAttention: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: '#92400e',
    marginBottom: 4,
  },
  tierBoxHealthy: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#86efac',
    borderRadius: radii.sm,
    padding: spacing.xs,
    marginBottom: spacing.xs,
  },
  tierLabelHealthy: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: '#166534',
    marginBottom: 4,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  symChip: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radii.sm,
    backgroundColor: '#ffffff',
    borderWidth: 1,
  },
  symChipCritical: {
    borderColor: '#fca5a5',
  },
  symChipCriticalActive: {
    backgroundColor: '#dc2626',
    borderColor: '#dc2626',
  },
  symChipAttention: {
    borderColor: '#fcd34d',
  },
  symChipAttentionActive: {
    backgroundColor: '#d97706',
    borderColor: '#d97706',
  },
  symChipHealthy: {
    borderColor: '#86efac',
  },
  symChipHealthyActive: {
    backgroundColor: '#16a34a',
    borderColor: '#16a34a',
  },
  symChipText: {
    fontSize: 11,
    color: colors.light.textPrimary,
    fontWeight: typography.weights.medium,
  },
  symChipTextActive: {
    color: '#ffffff',
    fontWeight: typography.weights.bold,
  },
  vetRecCard: {
    backgroundColor: '#fef2f2',
    borderWidth: 1.5,
    borderColor: '#ef4444',
    borderRadius: radii.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  vetRecHeader: {
    marginBottom: spacing.xs,
  },
  vetRecBadge: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: '#dc2626',
    marginBottom: 2,
  },
  vetRecTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: '#7f1d1d',
  },
  vetRecSubtitle: {
    fontSize: 11,
    color: '#991b1b',
    marginTop: 1,
  },
  vetRecDesc: {
    fontSize: 11,
    color: '#991b1b',
    lineHeight: 16,
    marginBottom: spacing.sm,
  },
  vetRecActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  vetRecCallBtn: {
    flex: 1,
    backgroundColor: '#dc2626',
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
    alignItems: 'center',
  },
  vetRecCallBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: typography.weights.bold,
  },
  vetRecFindBtn: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ef4444',
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
    alignItems: 'center',
  },
  vetRecFindBtnText: {
    color: '#7f1d1d',
    fontSize: 11,
    fontWeight: typography.weights.bold,
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
