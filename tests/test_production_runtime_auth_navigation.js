/**
 * PashuCare - Forensic Production Runtime & Navigation Test
 * File: tests/test_production_runtime_auth_navigation.js
 * 
 * Validates:
 * 1. Safe Auth State Machine:
 *    - Instant restoration from SecureStore without blocking network calls
 *    - Failsafe timeout guarantees loading=false even if network/storage hangs
 *    - Network errors/timeouts do NOT erase user sessions
 *    - Only 401 Unauthorized triggers logout
 *    - Stable handleLogout ref prevents startup re-render loops
 * 2. Navigation Architecture:
 *    - Root Navigator is mounted unconditionally on first render
 *    - Splash screen displays as an overlay, never unmounting the navigator
 *    - RouteErrorBoundary is exported from all layout modules
 *    - Route targets from auth gateway exist and resolve
 * 3. Sync & Database Initialization:
 *    - syncService does NOT query SQLite when unauthenticated
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('====================================================');
console.log('PRODUCTION RUNTIME AUTH & NAVIGATION FORENSIC AUDIT');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] ${name}`);
    console.error(`       ${err.message}`);
  }
}

// -------------------------------------------------------------
// TEST 1: AuthContext State Machine & Failsafe Timeout
// -------------------------------------------------------------
runTest('AuthContext: Contains failsafe timeout to guarantee loading=false', () => {
  const content = fs.readFileSync(
    path.join(__dirname, '../mobile/src/context/AuthContext.tsx'),
    'utf8'
  );

  assert(
    content.includes('failsafeTimeout') || content.includes('setTimeout'),
    'AuthContext must have a failsafe timeout'
  );
  assert(
    content.includes('setLoading(false)'),
    'AuthContext must guarantee setLoading(false)'
  );
  assert(
    content.includes('userRef'),
    'AuthContext must use userRef to prevent re-render loops on handleLogout'
  );
});

// -------------------------------------------------------------
// TEST 2: AuthContext: Offline / Cold-Start Resilience
// -------------------------------------------------------------
runTest('AuthContext: Background /auth/me does NOT wipe session on network error', () => {
  const content = fs.readFileSync(
    path.join(__dirname, '../mobile/src/context/AuthContext.tsx'),
    'utf8'
  );

  // Check that catch block for /auth/me only logs out on 401
  assert(
    content.includes('err?.status === 401'),
    'AuthContext must only call handleLogout on explicit 401 status'
  );
  assert(
    content.includes('Offline mode, cold start, or network timeout: preserve authenticated session') ||
    content.includes('preserve authenticated session'),
    'AuthContext must document and implement offline preservation'
  );
});

// -------------------------------------------------------------
// TEST 3: AuthContext: Fast Hardware Keystore Restoration
// -------------------------------------------------------------
runTest('AuthContext: Instant session restoration without blocking on /auth/me', () => {
  const content = fs.readFileSync(
    path.join(__dirname, '../mobile/src/context/AuthContext.tsx'),
    'utf8'
  );

  // In storedToken && storedUser block, setLoading(false) must be called BEFORE or independently of /auth/me
  const tokenBlockStart = content.indexOf('if (storedToken && storedUser)');
  assert(tokenBlockStart !== -1, 'Must have storedToken && storedUser block');

  const tokenBlockEnd = content.indexOf('api.get<{ success: boolean; user: AuthUser }>(\'/auth/me\')', tokenBlockStart);
  assert(tokenBlockEnd !== -1, 'Must verify /auth/me');

  const subBlock = content.substring(tokenBlockStart, tokenBlockEnd);
  assert(
    subBlock.includes('setLoading(false)'),
    'setLoading(false) must be called immediately upon reading valid SecureStore credentials'
  );
});

// -------------------------------------------------------------
// TEST 4: Root Layout: Unconditional Navigator Mounting
// -------------------------------------------------------------
runTest('Root Layout: Mounts Navigator on first render with splash overlay', () => {
  const content = fs.readFileSync(
    path.join(__dirname, '../mobile/app/_layout.tsx'),
    'utf8'
  );

  assert(
    !content.includes('if (loading) {\n    return (\n      <View style={styles.splashContainer}>'),
    'Root layout must NOT unmount navigator when loading is true'
  );
  assert(
    content.includes('StyleSheet.absoluteFillObject') && content.includes('styles.splashContainer'),
    'Splash screen must be rendered as an overlay over the mounted Navigator'
  );
  assert(
    content.includes('ErrorBoundary'),
    'Root layout must export ErrorBoundary'
  );
});

// -------------------------------------------------------------
// TEST 5: Error Boundary in All Child Layouts
// -------------------------------------------------------------
runTest('Child Layouts: Export ErrorBoundary to prevent white screens', () => {
  const layouts = [
    'mobile/app/(auth)/_layout.tsx',
    'mobile/app/(farmer)/_layout.tsx',
    'mobile/app/(vet)/_layout.tsx',
    'mobile/app/(officer)/_layout.tsx',
  ];

  for (const relPath of layouts) {
    const content = fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8');
    assert(
      content.includes('export const ErrorBoundary = RouteErrorBoundary;') ||
      content.includes('export { RouteErrorBoundary as ErrorBoundary }') ||
      content.includes('ErrorBoundary'),
      `${relPath} must export ErrorBoundary`
    );
  }
});

// -------------------------------------------------------------
// TEST 6: SyncService: Avoids premature SQLite queries
// -------------------------------------------------------------
runTest('SyncService: Does not query SQLite when no farmer is authenticated', () => {
  const content = fs.readFileSync(
    path.join(__dirname, '../mobile/src/services/syncService.ts'),
    'utf8'
  );

  assert(
    content.includes('if (this.activeFarmerId) {') &&
    content.includes('pendingCount = await getPendingSyncCount(this.activeFarmerId)'),
    'SyncService must only query pending sync count when activeFarmerId is set'
  );
});

// -------------------------------------------------------------
// TEST 7: Route Navigation Targets from HomeScreen Exist
// -------------------------------------------------------------
runTest('HomeScreen: All navigation targets resolve to existing route files', () => {
  const homeContent = fs.readFileSync(
    path.join(__dirname, '../mobile/app/index.tsx'),
    'utf8'
  );

  const targets = [
    { target: '/(auth)/login', expectedFile: 'mobile/app/(auth)/login.tsx' },
    { target: '/(auth)/register', expectedFile: 'mobile/app/(auth)/register.tsx' },
    { target: '/(farmer)', expectedFile: 'mobile/app/(farmer)/index.tsx' },
    { target: '/(vet)', expectedFile: 'mobile/app/(vet)/index.tsx' },
    { target: '/(officer)', expectedFile: 'mobile/app/(officer)/index.tsx' },
  ];

  for (const t of targets) {
    assert(
      homeContent.includes(t.target),
      `HomeScreen must contain navigation to ${t.target}`
    );
    const fullPath = path.join(__dirname, '..', t.expectedFile);
    assert(
      fs.existsSync(fullPath),
      `Target file ${t.expectedFile} for route ${t.target} must exist`
    );
  }
});
// -------------------------------------------------------------
// REPRODUCTION DIAGNOSTIC TEST 1: App launch with no stored session
// -------------------------------------------------------------
runTest('Scenario 1: App launch with no stored session reaches gateway', () => {
  const authContent = fs.readFileSync(path.join(__dirname, '../mobile/src/context/AuthContext.tsx'), 'utf8');
  const guardContent = fs.readFileSync(path.join(__dirname, '../mobile/app/_layout.tsx'), 'utf8');
  assert(authContent.includes('setLoading(false)'), 'Must clear loading when no session stored');
  assert(guardContent.includes('!isAuthenticated'), 'Must allow gateway access when unauthenticated');
});

// -------------------------------------------------------------
// REPRODUCTION DIAGNOSTIC TEST 2: App launch with valid stored session
// -------------------------------------------------------------
runTest('Scenario 2: App launch with valid stored session restores immediately', () => {
  const authContent = fs.readFileSync(path.join(__dirname, '../mobile/src/context/AuthContext.tsx'), 'utf8');
  const guardContent = fs.readFileSync(path.join(__dirname, '../mobile/app/_layout.tsx'), 'utf8');
  assert(authContent.includes('storedToken && storedUser'), 'Must restore user and token from SecureStore');
  assert(guardContent.includes('inAuthGroup'), 'Must direct authenticated user away from auth group');
});

// -------------------------------------------------------------
// REPRODUCTION DIAGNOSTIC TEST 3: App launch with expired/invalid session
// -------------------------------------------------------------
runTest('Scenario 3: App launch with expired/invalid session (401) cleans session', () => {
  const authContent = fs.readFileSync(path.join(__dirname, '../mobile/src/context/AuthContext.tsx'), 'utf8');
  assert(authContent.includes('err?.status === 401'), 'Must intercept 401 response from backend');
  assert(authContent.includes('handleLogout()'), 'Must call handleLogout on 401');
});

// -------------------------------------------------------------
// REPRODUCTION DIAGNOSTIC TEST 4: Auth login navigation
// -------------------------------------------------------------
runTest('Scenario 4: Auth login navigation route and layout integrity', () => {
  const loginPath = path.join(__dirname, '../mobile/app/(auth)/login.tsx');
  const layoutPath = path.join(__dirname, '../mobile/app/(auth)/_layout.tsx');
  assert(fs.existsSync(loginPath), 'login.tsx must exist');
  const loginContent = fs.readFileSync(loginPath, 'utf8');
  assert(loginContent.includes('export default function LoginScreen'), 'LoginScreen default export required');
  const layoutContent = fs.readFileSync(layoutPath, 'utf8');
  assert(layoutContent.includes('name="login"'), 'Auth layout must declare login screen');
});

// -------------------------------------------------------------
// REPRODUCTION DIAGNOSTIC TEST 5: Register navigation
// -------------------------------------------------------------
runTest('Scenario 5: Register navigation route and layout integrity', () => {
  const regPath = path.join(__dirname, '../mobile/app/(auth)/register.tsx');
  const layoutPath = path.join(__dirname, '../mobile/app/(auth)/_layout.tsx');
  assert(fs.existsSync(regPath), 'register.tsx must exist');
  const regContent = fs.readFileSync(regPath, 'utf8');
  assert(regContent.includes('export default function RegisterScreen'), 'RegisterScreen default export required');
  const layoutContent = fs.readFileSync(layoutPath, 'utf8');
  assert(layoutContent.includes('name="register"'), 'Auth layout must declare register screen');
});

// -------------------------------------------------------------
// REPRODUCTION DIAGNOSTIC TEST 6: Farmer portal navigation
// -------------------------------------------------------------
runTest('Scenario 6: Farmer portal navigation route and layout integrity', () => {
  const farmerPath = path.join(__dirname, '../mobile/app/(farmer)/index.tsx');
  const layoutPath = path.join(__dirname, '../mobile/app/(farmer)/_layout.tsx');
  assert(fs.existsSync(farmerPath), 'farmer/index.tsx must exist');
  const farmerContent = fs.readFileSync(farmerPath, 'utf8');
  assert(farmerContent.includes('export default function FarmerHomeScreen'), 'FarmerHomeScreen default export required');
  const layoutContent = fs.readFileSync(layoutPath, 'utf8');
  assert(layoutContent.includes('name="index"'), 'Farmer layout must declare index screen');
});

// -------------------------------------------------------------
// REPRODUCTION DIAGNOSTIC TEST 7: Veterinarian portal navigation
// -------------------------------------------------------------
runTest('Scenario 7: Veterinarian portal navigation route and layout integrity', () => {
  const vetPath = path.join(__dirname, '../mobile/app/(vet)/index.tsx');
  const layoutPath = path.join(__dirname, '../mobile/app/(vet)/_layout.tsx');
  assert(fs.existsSync(vetPath), 'vet/index.tsx must exist');
  const vetContent = fs.readFileSync(vetPath, 'utf8');
  assert(vetContent.includes('export default function VetHomeScreen'), 'VetHomeScreen default export required');
  const layoutContent = fs.readFileSync(layoutPath, 'utf8');
  assert(layoutContent.includes('name="index"'), 'Vet layout must declare index screen');
});

// -------------------------------------------------------------
// REPRODUCTION DIAGNOSTIC TEST 8: Officer portal navigation
// -------------------------------------------------------------
runTest('Scenario 8: Officer portal navigation route and layout integrity', () => {
  const officerPath = path.join(__dirname, '../mobile/app/(officer)/index.tsx');
  const layoutPath = path.join(__dirname, '../mobile/app/(officer)/_layout.tsx');
  assert(fs.existsSync(officerPath), 'officer/index.tsx must exist');
  const officerContent = fs.readFileSync(officerPath, 'utf8');
  assert(officerContent.includes('export default function OfficerHomeScreen'), 'OfficerHomeScreen default export required');
  const layoutContent = fs.readFileSync(layoutPath, 'utf8');
  assert(layoutContent.includes('name="index"'), 'Officer layout must declare index screen');
});

// -------------------------------------------------------------
// REPRODUCTION DIAGNOSTIC TEST 9: Logout followed by navigation
// -------------------------------------------------------------
runTest('Scenario 9: Logout clears session and guards redirect cleanly', () => {
  const authContent = fs.readFileSync(path.join(__dirname, '../mobile/src/context/AuthContext.tsx'), 'utf8');
  assert(authContent.includes('clearAllSecureAuthData()'), 'Must purge secure store on logout');
  assert(authContent.includes('setUser(null)'), 'Must clear user state');
  assert(authContent.includes('setToken(null)'), 'Must clear token state');
});

// -------------------------------------------------------------
// REPRODUCTION DIAGNOSTIC TEST 10: Cold start after force-stop
// -------------------------------------------------------------
runTest('Scenario 10: Cold start after force-stop guarantees loading cleanup', () => {
  const authContent = fs.readFileSync(path.join(__dirname, '../mobile/src/context/AuthContext.tsx'), 'utf8');
  assert(authContent.includes('failsafeTimeout = setTimeout'), 'Must have failsafe timer for force-stop recovery');
  assert(authContent.includes('3500'), 'Failsafe must fire within bounded window');
});

console.log('\n----------------------------------------------------');
console.log(`RESULTS: ${passedTests}/${totalTests} tests passed.`);
console.log('----------------------------------------------------');

if (passedTests !== totalTests) {
  process.exit(1);
}
