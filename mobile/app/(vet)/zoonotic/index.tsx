/**
 * PashuCare Mobile - Veterinarian Zoonotic Disease Surveillance (One Health)
 * File: mobile/app/(vet)/zoonotic/index.tsx
 *
 * Dedicated Zoonotic Biorisk Surveillance Screen for field veterinarians.
 * Showcases:
 * - Active Anthrax (Bacillus anthracis) Biohazard Demo Showcase Case (Saoner, Nagpur)
 * - Coordinated District CMO Notification & Liaison Action
 * - Standard Operating Procedure (SOP) for Carcass Biosafety & Lime Burial
 * - Contact Tracing Register (4 human handlers under prophylaxis)
 * - Multi-disease database reference catalog (Anthrax, Brucellosis, Rabies, Bovine TB)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../../src/context/AuthContext';
import { useAppLanguage } from '../../../src/services/i18n';
import { colors, typography, spacing, radii, shadows } from '../../../src/theme';

export default function VetZoonoticScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { isEnglish } = useAppLanguage();
  const userDistrict = user?.district || 'Nagpur';

  const [selectedDiseaseTab, setSelectedDiseaseTab] = useState<'anthrax' | 'brucellosis' | 'rabies' | 'bovinetb'>('anthrax');
  const [cmoAlertSent, setCmoAlertSent] = useState<boolean>(false);
  const [cmoDispatchId, setCmoDispatchId] = useState<string>('');
  const [showSopModal, setShowSopModal] = useState<boolean>(false);
  const [showContactsModal, setShowContactsModal] = useState<boolean>(false);

  // Featured Demo Showcase: Anthrax Case in Saoner Rural, Nagpur
  const featuredCase = {
    caseId: 'CASE-2026-NAG-ZOON-01',
    dbRefId: 'CASE-20260829-5022',
    diseaseName: isEnglish ? 'Anthrax (Bacillus anthracis)' : 'अँथ्रॅक्स (बैसिलस एंथ्रेक्स)',
    scientificName: 'Bacillus anthracis',
    riskLevel: 'Critical / Class A Biohazard',
    animalTag: 'NG-SP-104',
    animalName: isEnglish ? 'Nandi Bull (Gaolao Breed)' : 'नंदी वळू (गावळाव जात)',
    species: isEnglish ? 'Cattle' : 'गोवंश',
    farmerName: 'Suresh Rao Patil',
    farmerPhone: '+91 98230 45671',
    village: 'Saoner Rural',
    block: user?.block || 'Saoner',
    district: userDistrict,
    date: '29 Sep 2026, 06:15 AM',
    status: isEnglish ? 'Containment & Ring Quarantine Active' : 'नियंत्रण व रिंग क्वारंटाइन सक्रिय',
    contactsCount: 4,
    prophylaxis: 'Doxycycline 100mg BID (PHC Saoner)',
  };

  const humanContacts = [
    { id: 'HC-01', name: 'Suresh Rao Patil', relation: isEnglish ? 'Owner / Farmer' : 'शेतकरी / मालक', age: 48, status: 'Asymptomatic', day: 'Day 3/60' },
    { id: 'HC-02', name: 'Anita Suresh Patil', relation: isEnglish ? 'Spouse / Barn Hand' : 'पत्नी / मदतनीस', age: 44, status: 'Asymptomatic', day: 'Day 3/60' },
    { id: 'HC-03', name: 'Ganesh Suresh Patil', relation: isEnglish ? 'Son / Milker' : 'मुलगा', age: 21, status: 'Asymptomatic', day: 'Day 3/60' },
    { id: 'HC-04', name: 'Mahadev Uike', relation: isEnglish ? 'Farm Hand' : 'मदतनीस', age: 35, status: 'Asymptomatic', day: 'Day 3/60' },
  ];

  const handleTransmitCmo = () => {
    const dispatchId = `CMO-${Date.now().toString().slice(-6)}`;
    setCmoDispatchId(dispatchId);
    setCmoAlertSent(true);
    Alert.alert(
      isEnglish ? 'One Health Alert Dispatched' : 'वन हेल्थ अलर्ट प्रेषित',
      isEnglish
        ? `Direct priority notification sent to District CMO (${userDistrict}) & Medical Officer Saoner PHC.\nDispatch Ref: ${dispatchId}`
        : `जिल्हा मुख्य वैद्यकीय अधिकारी (${userDistrict}) व सावनेर आरोग्य केंद्रास अलर्ट पाठवला.\nसंदर्भ: ${dispatchId}`
    );
  };

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor="#7F1D1D" />

      {/* Screen Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Image
            source={require('../../../assets/icons/arrow-back.png')}
            style={styles.backIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>
        <View style={styles.headerTitles}>
          <Text style={styles.headerTitle}>
            {isEnglish ? 'Zoonotic Disease Surveillance' : 'झुनोटिक आजार देखरेख'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {isEnglish ? 'One Health Biosecurity Protocol' : 'वन हेल्थ जैवसुरक्षा नियंत्रण'}
          </Text>
        </View>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>BIO-4</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Warning Banner */}
        <View style={styles.alertBanner}>
          <View style={styles.alertBannerRow}>
            <Image
              source={require('../../../assets/icons/alert.png')}
              style={[styles.bannerAlertIcon, { tintColor: '#FEF2F2' }]}
              resizeMode="contain"
            />
            <View style={styles.alertBannerTextCol}>
              <View style={styles.bannerTagRow}>
                <Text style={styles.bannerTagText}>ONE HEALTH PROTOCOL</Text>
                <Text style={styles.bannerSubTagText}>WHO/WOAH CLASS A</Text>
              </View>
              <Text style={styles.alertBannerTitle}>
                {isEnglish
                  ? 'Cross-Species Pathogen Defense'
                  : 'प्राणी-मानव संसर्गजन्य रोग नियंत्रण'}
              </Text>
              <Text style={styles.alertBannerDesc}>
                {isEnglish
                  ? `Active biosecurity liaison with District CMO (${userDistrict}) for Anthrax, Brucellosis, Rabies & Bovine TB.`
                  : `अँथ्रॅक्स, ब्रुसेलोसिस, रेबीज व टीबी नियंत्रणासाठी जिल्हा आरोग्य अधिकारी (${userDistrict}) व प्राथमिक आरोग्य केंद्रांशी थेट समन्वय.`}
              </Text>
            </View>
          </View>
        </View>

        {/* Operational Metrics Strip */}
        <View style={styles.kpiRow}>
          <View style={[styles.kpiCard, { borderColor: '#FECACA', backgroundColor: '#FEF2F2' }]}>
            <Text style={[styles.kpiVal, { color: '#B91C1C' }]}>1</Text>
            <Text style={styles.kpiLabel}>{isEnglish ? 'Active Biohazard' : 'सक्रिय केस'}</Text>
            <Text style={styles.kpiSub}>Anthrax ({userDistrict})</Text>
          </View>

          <View style={[styles.kpiCard, { borderColor: '#FDE68A', backgroundColor: '#FFFBEB' }]}>
            <Text style={[styles.kpiVal, { color: '#D97706' }]}>4</Text>
            <Text style={styles.kpiLabel}>{isEnglish ? 'Contacts Monitored' : 'संपर्क देखरेख'}</Text>
            <Text style={styles.kpiSub}>100% Prophylaxis</Text>
          </View>

          <View style={[styles.kpiCard, { borderColor: '#A7F3D0', backgroundColor: '#ECFDF5' }]}>
            <Text style={[styles.kpiVal, { color: '#047857' }]}>5.0 km</Text>
            <Text style={styles.kpiLabel}>{isEnglish ? 'Ring Buffer' : 'रिंग परिमिती'}</Text>
            <Text style={styles.kpiSub}>Sterne 34F2 Live</Text>
          </View>
        </View>

        {/* Featured Showcase Case: Anthrax (Bacillus anthracis) */}
        <View style={styles.caseCard}>
          <View style={styles.caseCardHeader}>
            <View style={styles.caseCardTitleCol}>
              <View style={styles.caseCardPillsRow}>
                <View style={styles.demoBadge}>
                  <Text style={styles.demoBadgeText}>DEMO SHOWCASE</Text>
                </View>
                <Text style={styles.caseIdText}>{featuredCase.caseId}</Text>
              </View>
              <Text style={styles.caseDiseaseTitle}>{featuredCase.diseaseName}</Text>
              <Text style={styles.caseSciName}>{featuredCase.scientificName}</Text>
            </View>
            <View style={styles.riskTierBadge}>
              <Text style={styles.riskTierText}>CRITICAL</Text>
            </View>
          </View>

          {/* Details Grid */}
          <View style={styles.caseDetailsBox}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{isEnglish ? 'Animal:' : 'पशु:'}</Text>
              <Text style={styles.detailVal}>{featuredCase.animalName} ({featuredCase.animalTag})</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{isEnglish ? 'Owner:' : 'मालक:'}</Text>
              <Text style={styles.detailVal}>{featuredCase.farmerName} • {featuredCase.village}, {featuredCase.block}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{isEnglish ? 'Status:' : 'स्थिती:'}</Text>
              <Text style={[styles.detailVal, { color: '#B91C1C', fontWeight: 'bold' }]}>{featuredCase.status}</Text>
            </View>
          </View>

          {/* Pathognomonic Clinical Presentation */}
          <View style={styles.clinicalBox}>
            <Text style={styles.clinicalBoxTitle}>
              {isEnglish ? 'Pathognomonic Evidence (Database Fed):' : 'क्लिनिकल लक्षणे (डेटाबेस नोंद):'}
            </Text>
            <Text style={styles.clinicalBullet}>• Peracute sudden unexplained death within 2-4 hours</Text>
            <Text style={styles.clinicalBullet}>• Dark, tarry, unclotted blood oozing from mouth, nose & rectum</Text>
            <Text style={styles.clinicalBullet}>• Marked absence of rigor mortis with accelerated bloat</Text>
            <Text style={styles.clinicalBullet}>• Microscopy: Non-motile capsulated rods (M\'Fadyean positive)</Text>
          </View>

          {/* 4 Mandatory Biosecurity Directives */}
          <View style={styles.directivesBox}>
            <Text style={styles.directivesTitle}>
              {isEnglish ? 'Mandatory Biosafety Directives:' : 'सक्तीच्या जैवसुरक्षा मार्गदर्शक सूचना:'}
            </Text>
            <View style={styles.directiveItem}>
              <Text style={styles.directiveNum}>1. 🚫 NO NECROPSY:</Text>
              <Text style={styles.directiveDesc}>Do not open carcass. Atmospheric oxygen triggers 50-year soil spores.</Text>
            </View>
            <View style={styles.directiveItem}>
              <Text style={styles.directiveNum}>2. ⚰️ DEEP BURIAL + LIME:</Text>
              <Text style={styles.directiveDesc}>2.5m pit covered with 50 kg Calcium Oxide (Quicklime) & barbed fence.</Text>
            </View>
            <View style={styles.directiveItem}>
              <Text style={styles.directiveNum}>3. 💉 STERNE VACCINATION:</Text>
              <Text style={styles.directiveDesc}>Emergency ring vaccination within 5 km radial perimeter.</Text>
            </View>
            <View style={styles.directiveItem}>
              <Text style={styles.directiveNum}>4. 🥛 DAIRY & MOVEMENT BAN:</Text>
              <Text style={styles.directiveDesc}>Prohibit raw milk sales & livestock transport from Saoner for 21 days.</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionBtnsCol}>
            <TouchableOpacity
              style={[styles.primaryActionBtn, cmoAlertSent && styles.actionBtnDone]}
              onPress={handleTransmitCmo}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryActionBtnText}>
                {cmoAlertSent
                  ? isEnglish ? '✓ CMO Alert Transmitted' : '✓ CMO अलर्ट पाठवला'
                  : isEnglish ? 'Notify District CMO (Chief Medical Officer)' : 'जिल्हा CMO ला तातडीचा अलर्ट पाठवा'}
              </Text>
            </TouchableOpacity>

            <View style={styles.actionBtnsRow}>
              <TouchableOpacity
                style={styles.secondaryActionBtn}
                onPress={() => setShowSopModal(true)}
                activeOpacity={0.75}
              >
                <Text style={styles.secondaryActionBtnText}>
                  {isEnglish ? 'Carcass SOP' : 'शव विल्हेवाट SOP'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryActionBtn}
                onPress={() => setShowContactsModal(true)}
                activeOpacity={0.75}
              >
                <Text style={styles.secondaryActionBtnText}>
                  {isEnglish ? 'Contacts (4)' : 'संपर्क नोंद (४)'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Multi-Disease Database Reference Tabs */}
        <View style={styles.catalogCard}>
          <Text style={styles.catalogTitle}>
            {isEnglish ? 'Other Zoonotic Pathogens in Database' : 'डेटाबेसमधील इतर झुनोटिक आजार'}
          </Text>
          <Text style={styles.catalogSubtitle}>
            {isEnglish
              ? 'Select any registered pathogen below to inspect transmission vectors & SOPs.'
              : 'माहिती व मार्गदर्शक सूचना पाहण्यासाठी खालील रोगावर टॅप करा.'}
          </Text>

          <View style={styles.tabsRow}>
            {(['anthrax', 'brucellosis', 'rabies', 'bovinetb'] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tabBtn, selectedDiseaseTab === tab && styles.tabBtnActive]}
                onPress={() => setSelectedDiseaseTab(tab)}
                activeOpacity={0.75}
              >
                <Text style={[styles.tabBtnText, selectedDiseaseTab === tab && styles.tabBtnTextActive]}>
                  {tab === 'anthrax' ? 'Anthrax' : tab === 'brucellosis' ? 'Brucella' : tab === 'rabies' ? 'Rabies' : 'Bovine TB'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tab Information */}
          <View style={styles.tabContentBox}>
            {selectedDiseaseTab === 'anthrax' && (
              <View>
                <Text style={styles.tabDiseaseHead}>Anthrax (Bacillus anthracis)</Text>
                <Text style={styles.tabMeta}>Species: Cattle, Buffalo, Sheep, Goat, Humans</Text>
                <Text style={styles.tabDesc}>
                  Peracute septicemia. DO NOT OPEN CARCASS. Deep burial with quicklime. Sterne strain ring vaccination within 5km.
                </Text>
              </View>
            )}
            {selectedDiseaseTab === 'brucellosis' && (
              <View>
                <Text style={styles.tabDiseaseHead}>Brucellosis (Brucella abortus)</Text>
                <Text style={styles.tabMeta}>Species: Cattle, Buffalo, Goat, Humans (Undulant Fever)</Text>
                <Text style={styles.tabDesc}>
                  Abortion storm in late pregnancy. Raw milk transmission to humans. Wear gloves when handling placenta. S19 calfhood vaccination.
                </Text>
              </View>
            )}
            {selectedDiseaseTab === 'rabies' && (
              <View>
                <Text style={styles.tabDiseaseHead}>Rabies (Rabies Lyssavirus)</Text>
                <Text style={styles.tabMeta}>Species: Dogs, Cattle, Cats, All Mammals</Text>
                <Text style={styles.tabDesc}>
                  100% fatal viral encephalomyelitis. Animal bite/saliva transmission. Never place bare hands in choking cattle mouth. Immediate PEP (ARV+RIG).
                </Text>
              </View>
            )}
            {selectedDiseaseTab === 'bovinetb' && (
              <View>
                <Text style={styles.tabDiseaseHead}>Bovine Tuberculosis (M. bovis)</Text>
                <Text style={styles.tabMeta}>Species: Cattle, Buffalo, Humans</Text>
                <Text style={styles.tabDesc}>
                  Chronic pulmonary & lymph node wasting. Aerosol and raw unpasteurized milk transmission. Tuberculin testing & mandatory milk pasteurization.
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* SOP Modal */}
      <Modal visible={showSopModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Anthrax Biosafety SOP</Text>
            <ScrollView style={styles.modalScroll}>
              <Text style={styles.modalSectionTitle}>1. Strict Necropsy Prohibition</Text>
              <Text style={styles.modalBody}>
                Vegetative cells of Bacillus anthracis form highly resistant spores upon air exposure, contaminating soil for 50+ years. Post-mortem is strictly banned.
              </Text>

              <Text style={styles.modalSectionTitle}>2. Deep Burial Pit Specifications</Text>
              <Text style={styles.modalBody}>
                Excavate pit minimum 2.5 meters deep away from water courses. Spread 10cm quicklime base, lower intact carcass, cover with 50 kg quicklime powder and seal.
              </Text>

              <Text style={styles.modalSectionTitle}>3. Field Disinfection</Text>
              <Text style={styles.modalBody}>
                Disinfect contaminated stalls, ropes, and boots using 5% Formalin or 10% Sodium Hypochlorite (Bleach) with 30-minute contact time.
              </Text>
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setShowSopModal(false)}
            >
              <Text style={styles.modalCloseBtnText}>Close SOP</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Contacts Modal */}
      <Modal visible={showContactsModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>One Health Contact Tracing Register</Text>
            <Text style={styles.modalSub}>Case: {featuredCase.caseId} • Saoner Rural</Text>
            <ScrollView style={styles.modalScroll}>
              {humanContacts.map((c) => (
                <View key={c.id} style={styles.contactItem}>
                  <View style={styles.contactItemTop}>
                    <Text style={styles.contactName}>{c.name}</Text>
                    <Text style={styles.contactStatus}>{c.status}</Text>
                  </View>
                  <Text style={styles.contactMeta}>{c.age} yrs • {c.relation} • {c.day}</Text>
                  <Text style={styles.contactSub}>Supervised by Dr. V. K. Sharma (PHC Saoner)</Text>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setShowContactsModal(false)}
            >
              <Text style={styles.modalCloseBtnText}>Close Register</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#7F1D1D',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  backIcon: {
    width: 20,
    height: 20,
    tintColor: '#FFFFFF',
  },
  headerTitles: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#FECACA',
    marginTop: 1,
  },
  headerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#991B1B',
    borderWidth: 1,
    borderColor: '#F87171',
  },
  headerBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  alertBanner: {
    backgroundColor: '#991B1B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  alertBannerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bannerAlertIcon: {
    width: 24,
    height: 24,
    marginRight: 12,
    marginTop: 2,
  },
  alertBannerTextCol: {
    flex: 1,
  },
  bannerTagRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  bannerTagText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#FEE2E2',
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  bannerSubTagText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#FEF3C7',
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  alertBannerTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  alertBannerDesc: {
    fontSize: 12,
    color: '#FEE2E2',
    lineHeight: 16,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  kpiVal: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 2,
  },
  kpiSub: {
    fontSize: 9,
    color: '#64748B',
    marginTop: 2,
  },
  caseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#F87171',
    padding: 16,
    marginBottom: 16,
    ...shadows.sm,
  },
  caseCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#FEE2E2',
    paddingBottom: 12,
    marginBottom: 12,
  },
  caseCardTitleCol: {
    flex: 1,
  },
  caseCardPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  demoBadge: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  demoBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  caseIdText: {
    fontSize: 11,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontWeight: 'bold',
    color: '#64748B',
  },
  caseDiseaseTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#991B1B',
  },
  caseSciName: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#64748B',
    marginTop: 1,
  },
  riskTierBadge: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#F87171',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  riskTierText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#B91C1C',
  },
  caseDetailsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    gap: 6,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#64748B',
  },
  detailVal: {
    fontSize: 12,
    color: '#0F172A',
    flexShrink: 1,
    textAlign: 'right',
  },
  clinicalBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 12,
    marginBottom: 12,
  },
  clinicalBoxTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#7F1D1D',
    marginBottom: 6,
  },
  clinicalBullet: {
    fontSize: 11,
    color: '#1E293B',
    lineHeight: 16,
    marginBottom: 3,
  },
  directivesBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 12,
    marginBottom: 14,
  },
  directivesTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#92400E',
    marginBottom: 6,
  },
  directiveItem: {
    marginBottom: 6,
  },
  directiveNum: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#78350F',
  },
  directiveDesc: {
    fontSize: 11,
    color: '#451A03',
    lineHeight: 15,
  },
  actionBtnsCol: {
    gap: 8,
  },
  primaryActionBtn: {
    backgroundColor: '#DC2626',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionBtnDone: {
    backgroundColor: '#059669',
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  actionBtnsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryActionBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  secondaryActionBtnText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: 'bold',
  },
  catalogCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
  },
  catalogTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  catalogSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 12,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  tabBtnActive: {
    backgroundColor: '#B91C1C',
  },
  tabBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#475569',
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
  },
  tabContentBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
  },
  tabDiseaseHead: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  tabMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 4,
  },
  tabDesc: {
    fontSize: 11,
    color: '#334155',
    lineHeight: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 2,
  },
  modalSub: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
  },
  modalScroll: {
    marginBottom: 16,
  },
  modalSectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#991B1B',
    marginTop: 10,
    marginBottom: 4,
  },
  modalBody: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
  },
  contactItem: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  contactItemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  contactName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  contactStatus: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#047857',
  },
  contactMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  contactSub: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  modalCloseBtn: {
    backgroundColor: '#0F172A',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCloseBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
});
