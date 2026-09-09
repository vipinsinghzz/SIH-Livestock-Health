import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ScreenNowScreen() {
  const [step, setStep] = useState(1);
  const [symptoms, setSymptoms] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = () => {
    setIsLoading(true);
    // Simulate backend ML call
    setTimeout(() => {
      setIsLoading(false);
      setStep(3); // Result Screen
    }, 2000);
  };

  return (
    <SafeAreaView style={styles.container}>
      {step === 1 && (
        <View style={styles.stepContainer}>
          <Text style={styles.title}>What's wrong?</Text>
          <Text style={styles.subtitle}>Describe the symptoms or take a picture.</Text>
          
          <View style={styles.inputContainer}>
            <TextInput 
              style={styles.textInput} 
              multiline 
              placeholder="E.g. Not eating, drooling, limp..."
              value={symptoms}
              onChangeText={setSymptoms}
            />
            <TouchableOpacity style={styles.micBtn}>
              <Ionicons name="mic" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.cameraBtn}>
            <Ionicons name="camera" size={32} color="#4B5563" />
            <Text style={styles.cameraBtnText}>Take a Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.primaryBtn} onPress={() => setStep(2)}>
            <Text style={styles.primaryBtnText}>Next</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === 2 && (
        <View style={styles.stepContainer}>
          <Text style={styles.title}>Review & Submit</Text>
          <View style={styles.reviewCard}>
            <Text style={styles.reviewLabel}>Symptoms:</Text>
            <Text style={styles.reviewText}>{symptoms || "None provided"}</Text>
            <Text style={styles.reviewLabel}>Photo:</Text>
            <Text style={styles.reviewText}>1 image attached</Text>
          </View>
          
          <TouchableOpacity style={styles.primaryBtn} onPress={handleSubmit} disabled={isLoading}>
            {isLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>Submit for Screening</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => setStep(1)} disabled={isLoading}>
            <Text style={styles.secondaryBtnText}>Back</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === 3 && (
        <ScrollView style={styles.stepContainer}>
          <Text style={styles.title}>Screening Result</Text>
          
          <View style={[styles.resultCard, { borderColor: '#F87171', backgroundColor: '#FEF2F2' }]}>
            <Text style={[styles.riskBadge, { color: '#DC2626' }]}>HIGH RISK</Text>
            <Text style={styles.conditionTitle}>Possible condition: Foot and Mouth Disease</Text>
            <Text style={styles.reasonText}>• Lesions detected on the hooves.</Text>
            <Text style={styles.reasonText}>• High temperature reported.</Text>
          </View>

          <View style={styles.actionCard}>
            <Text style={styles.actionTitle}>What to do next</Text>
            <Text style={styles.actionText}>A veterinary case has been automatically created. Please isolate the animal.</Text>
            <TouchableOpacity style={styles.primaryBtn}>
              <Text style={styles.primaryBtnText}>Contact Vet Now</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.secondaryBtn} onPress={() => setStep(1)}>
            <Text style={styles.secondaryBtnText}>Screen Another Animal</Text>
          </TouchableOpacity>

          <Text style={styles.disclaimer}>
            This is a screening result, not a confirmed diagnosis. Always consult a veterinarian for serious or worsening symptoms.
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  stepContainer: { padding: 20, flex: 1 },
  title: { fontSize: 32, fontWeight: '800', color: '#1F2937', marginBottom: 8, marginTop: 20 },
  subtitle: { fontSize: 16, color: '#4B5563', marginBottom: 24 },
  inputContainer: { position: 'relative', marginBottom: 16 },
  textInput: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, paddingTop: 20, minHeight: 120, fontSize: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  micBtn: { position: 'absolute', bottom: 16, right: 16, backgroundColor: '#EF4444', width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', elevation: 4 },
  cameraBtn: { backgroundColor: '#E5E7EB', borderRadius: 16, padding: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 32, borderStyle: 'dashed', borderWidth: 2, borderColor: '#D1D5DB' },
  cameraBtnText: { marginTop: 8, fontSize: 16, fontWeight: 'bold', color: '#4B5563' },
  primaryBtn: { backgroundColor: '#3B82F6', borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 16, elevation: 4 },
  primaryBtnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  secondaryBtn: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#D1D5DB' },
  secondaryBtnText: { color: '#374151', fontSize: 18, fontWeight: 'bold' },
  reviewCard: { backgroundColor: '#FFF', padding: 20, borderRadius: 16, marginBottom: 32, elevation: 2 },
  reviewLabel: { fontSize: 14, color: '#6B7280', marginBottom: 4 },
  reviewText: { fontSize: 18, color: '#1F2937', fontWeight: 'bold', marginBottom: 16 },
  resultCard: { padding: 24, borderRadius: 16, borderWidth: 2, marginBottom: 24 },
  riskBadge: { fontSize: 24, fontWeight: '900', marginBottom: 8 },
  conditionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 12 },
  reasonText: { fontSize: 16, color: '#4B5563', marginBottom: 4 },
  actionCard: { backgroundColor: '#FFF', padding: 24, borderRadius: 16, marginBottom: 24, elevation: 2 },
  actionTitle: { fontSize: 20, fontWeight: 'bold', color: '#1F2937', marginBottom: 8 },
  actionText: { fontSize: 16, color: '#4B5563', marginBottom: 16, lineHeight: 24 },
  disclaimer: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginTop: 24, paddingBottom: 40 }
});
