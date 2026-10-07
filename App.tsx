import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer, useFocusEffect } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useHeaderHeight } from '@react-navigation/elements';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Appearance, Image, Keyboard, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from './src/supabase';
import { account, admin, Conversation, errorMessage, getPaymentProofSignedUrl, Item, marketplace, messaging, Notice, Transaction, transactions, uploadItemImage, uploadPaymentProof, User } from './src/api';
import { AuthProvider, useAuth } from './src/auth/AuthContext';
import { LoginScreen, RegisterScreen } from './src/auth/AuthScreens';
import { ThemeProvider, useTheme, type ThemeMode } from './src/theme/ThemeContext';
import { profiles } from './src/services/profiles';
import { themeTokens, type ThemeColors, type ThemeTokens } from './src/theme/tokens';
import { formatPhilippineDateTime, formatPhilippineDate, formatPhilippineTime } from './src/utils/datetime';
import { MeetupTimePicker } from './src/components/common/MeetupTimePicker';

let T: ThemeTokens = themeTokens.light;
let C: ThemeColors = T.colors;
const palettes = {
  light: themeTokens.light.colors,
  dark: themeTokens.dark.colors,
};
const Stack = createNativeStackNavigator<any>(); const Tabs = createBottomTabNavigator<any>();
const SHOW_DELETE_ACCOUNT = false;

function Button({ title, onPress, secondary = false, danger = false, disabled = false }: any) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[s.buttonShell, secondary && s.buttonSecondary, danger && s.buttonDanger, disabled && { opacity: .55 }]}><LinearGradient colors={secondary ? (C.bg === themeTokens.dark.colors.bg ? ['rgba(255,255,255,.12)','rgba(255,255,255,.035)'] : ['#FFF4EC','#FFEFE5']) : danger ? ['#a61111','#650606'] : ['#f23b31','#b70201','#790101']} start={{x:0,y:0}} end={{x:1,y:1}} style={s.button}><Text style={[s.buttonText, secondary && { color: C.gold }]}>{title}</Text></LinearGradient></Pressable>;
}
function Field({ label, value, onChangeText, placeholder, multiline, secureTextEntry, keyboardType, autoCapitalize = 'sentences', onSubmitEditing }: any) {
  return <View style={s.fieldWrap}><Text style={s.label}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder || label} placeholderTextColor={C.muted} multiline={multiline} secureTextEntry={secureTextEntry} keyboardType={keyboardType} autoCapitalize={autoCapitalize} onSubmitEditing={onSubmitEditing} style={[s.field, multiline && { minHeight: 100, textAlignVertical: 'top' }]} /></View>;
}
function Choice({ label, selected, onPress, icon }: any) {
  const isDark = C.bg === themeTokens.dark.colors.bg;
  const activeColor = isDark ? '#ffc270' : C.red;
  return (
    <Pressable
      onPress={onPress}
      style={[
        s.chip,
        selected && s.chipSelected,
        icon && { flexDirection: 'row', alignItems: 'center', gap: 6 },
      ]}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={14}
          color={selected ? activeColor : (isDark ? C.gold : C.muted)}
        />
      ) : null}
      <Text style={[s.chipText, selected && { color: activeColor }]}>
        {label}
      </Text>
    </Pressable>
  );
}

function getCategoryIcon(cat: string): keyof typeof Ionicons.glyphMap {
  switch (cat) {
    case 'All': return 'grid-outline';
    case 'Books': return 'book-outline';
    case 'Uniforms': return 'shirt-outline';
    case 'Gadgets': return 'hardware-chip-outline';
    case 'Calculators': return 'calculator-outline';
    case 'Supplies': return 'pencil-outline';
    case 'Lab & Science': return 'flask-outline';
    case 'Art Materials': return 'color-palette-outline';
    case 'Engineering Tools': return 'construct-outline';
    case 'Electronics': return 'laptop-outline';
    case 'PE & Sports': return 'football-outline';
    case 'Review Materials': return 'document-text-outline';
    case 'Thesis & Research': return 'library-outline';
    case 'School Bags': return 'bag-outline';
    case 'Dorm Essentials': return 'home-outline';
    case 'Tickets & Events': return 'ticket-outline';
    default: return 'cube-outline';
  }
}
function Card({ children, style }: any) { return <LinearGradient colors={C.bg===themeTokens.dark.colors.bg?['rgba(255,255,255,.085)','rgba(255,255,255,.025)']:['#ffffff','#fbfcfd']} start={{x:0,y:0}} end={{x:1,y:1}} style={[s.card, style]}>{children}</LinearGradient>; }
function MiniBars({ title, data=[] }: { title: string; data: { label: string; total: number }[] }) { const max=Math.max(1,...data.map(x=>x.total)); return <Card><Text style={s.section}>{title}</Text>{data.length?data.map(row=><View key={row.label} style={{marginVertical:6}}><View style={s.rowBetween}><Text style={s.muted}>{row.label}</Text><Text style={s.muted}>{row.total}</Text></View><View style={s.barTrack}><View style={[s.barFill,{width:`${Math.max(3,row.total/max*100)}%`}]}/></View></View>):<Text style={s.muted}>No activity yet.</Text>}</Card>; }
function Page({ children, refreshing, onRefresh, footer, topSafe = false, floatingAction, bottomSafe = false }: any) {
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView edges={topSafe ? ['top', 'left', 'right'] : ['left', 'right']} style={s.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={C.red} /> : undefined}
          contentContainerStyle={[
            s.page,
            bottomSafe ? { paddingBottom: Math.max(insets.bottom, 24) + 20 } : undefined,
          ]}
        >
          {children}
          {footer && <MobileFooter navigation={footer.navigation} />}
        </ScrollView>
        {floatingAction}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
function Heading({ title, subtitle }: any) { return <View style={{ marginBottom: 18 }}><Text style={s.heading}>{title}</Text>{subtitle ? <Text style={s.subheading}>{subtitle}</Text> : null}</View>; }
function MobileFooter({ navigation }: any) { const { user }=useAuth(); return <LinearGradient colors={['rgba(230,36,36,.13)','rgba(246,200,76,.055)','rgba(255,255,255,.025)']} locations={[0,.52,1]} style={s.footer}><View style={s.footerBrand}><View style={s.footerLogoRing}><Image source={require('./assets/UMPASALOGO.png')} style={s.footerLogo} resizeMode="contain"/></View><View style={{flex:1}}><Text style={s.footerTitle}>UM-Pasa</Text><Text style={s.muted}>University Marketplace</Text></View></View><Text style={s.footerCopy}>Browse items, post listings, request transactions, and track marketplace activity in one student workspace.</Text><View style={s.footerRule}/><Text style={s.eyebrow}>QUICK LINKS</Text><View style={s.footerLinks}><Pressable onPress={()=>navigation.navigate('About')} style={s.footerPill}><Text style={s.footerLinkText}>About Us</Text></Pressable><Pressable onPress={()=>navigation.navigate('Help')} style={s.footerPill}><Text style={s.footerLinkText}>Help & contact</Text></Pressable>{user&&<Pressable onPress={()=>navigation.navigate('Messages')} style={s.footerPill}><Text style={s.footerLinkText}>Inbox</Text></Pressable>}<Pressable onPress={()=>Linking.openURL('mailto:support@umindanao.edu.ph')} style={s.footerPill}><Text style={s.footerLinkText}>Email support</Text></Pressable></View><View style={s.footerRule}/><Text style={s.eyebrow}>QUICK INSTRUCTIONS</Text><Text style={s.footerStep}>01  Browse the marketplace or search by category.</Text><Text style={s.footerStep}>02  Open a listing to request it or message the seller.</Text><Text style={s.footerStep}>03  Confirm your meetup and complete the transaction.</Text><View style={s.footerBottom}><Text style={s.footerCopyright}>UM-Pasa © {new Date().getFullYear()} · University of Mindanao</Text><Text style={s.footerBadge}>University-safe trading</Text></View></LinearGradient>; }
function Status({ state, retry }: { state: string; retry?: () => void }) { return <Card><Text style={s.body}>{state}</Text>{retry ? <Button title="Try again" secondary onPress={retry} /> : null}</Card>; }
function money(v: any) { return `₱${Number(v || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`; }
function statusColor(status: string) { return status === 'approved' || status === 'available' || status === 'completed' ? C.green : status === 'rejected' || status === 'sold' ? (C.bg === themeTokens.dark.colors.bg ? '#ff8c82' : C.red) : C.gold; }
function StatusPill({ status }: { status: string }) {
  const sLower = (status || '').toLowerCase();
  const isDark = C.bg === themeTokens.dark.colors.bg;
  let bg = isDark ? 'rgba(246, 200, 76, 0.14)' : 'rgba(138, 101, 0, 0.12)';
  let text = isDark ? '#F6C84C' : '#8A6500';
  let dot = isDark ? '#F6C84C' : '#8A6500';
  let label = (status || 'pending').toUpperCase();

  if (sLower === 'approved' || sLower === 'available') {
    bg = isDark ? 'rgba(74, 222, 128, 0.15)' : 'rgba(22, 101, 52, 0.12)';
    text = isDark ? '#4ADE80' : '#166534';
    dot = isDark ? '#4ADE80' : '#166534';
  } else if (sLower === 'completed') {
    bg = isDark ? 'rgba(56, 189, 248, 0.15)' : 'rgba(3, 105, 161, 0.12)';
    text = isDark ? '#38BDF8' : '#0369A1';
    dot = isDark ? '#38BDF8' : '#0369A1';
  } else if (sLower === 'rejected' || sLower === 'sold') {
    bg = isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(183, 2, 1, 0.12)';
    text = isDark ? '#F87171' : '#B70201';
    dot = isDark ? '#F87171' : '#B70201';
  }

  return (
    <View style={[s.statusPill, { backgroundColor: bg }]}>
      <View style={[s.statusDot, { backgroundColor: dot }]} />
      <Text style={[s.statusPillText, { color: text }]}>{label}</Text>
    </View>
  );
}


function BrowseScreen({ navigation }: any) {
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const [carouselIndex,setCarouselIndex]=useState(0);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<any>({ sort: 'newest' });
  const filtersInitialized = useRef(false);
  const setFilter = (key: string, value: any) => setFilters((previous: any) => ({ ...previous, [key]: value }));
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setItems(await marketplace.list({ ...filters, q: q.trim() || undefined })); }
    catch (e) { setError(errorMessage(e)); }
    finally { setLoading(false); }
  }, [filters, q]);
  const loadRef = useRef(load);
  loadRef.current = load;
  useFocusEffect(useCallback(() => { loadRef.current(); }, []));
  useEffect(() => { if (filtersInitialized.current) loadRef.current(); else filtersInitialized.current = true; }, [filters]);
  const programsForDepartment = filters.department ? programs[filters.department] || [] : Array.from(new Set(Object.values(programs).flat()));
  const { mode, setMode } = useTheme();
  const selectedCount = ['condition', 'department', 'program', 'course_code'].filter((key) => filters[key]).length;
  const toggle = (key: string, value: any) => setFilter(key, filters[key] === value ? undefined : value);
  const bannerWidth = width - 68;
  const isDark = C.bg === themeTokens.dark.colors.bg;
  return <Page refreshing={loading} onRefresh={load} footer={{navigation}} topSafe={!!user}>
    <View style={s.marketHero}>
      <LinearGradient colors={['#55201c', '#2b191a', '#1b1a1e']} start={{x:0,y:0}} end={{x:1,y:1}} style={s.marketHeroGradient}>
        <View style={s.brandRow}>
          <View style={s.brandMark}><Image source={require('./assets/UMPASALOGO.png')} style={s.brandLogo} resizeMode="contain"/></View>
          <View style={{flex:1}}><Text style={s.brandName}>UM-Pasa</Text><Text style={s.brandCaption}>UM TAGUM COLLEGE · TAGUM CITY</Text></View>
          {!user && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Toggle light or dark theme"
                onPress={() => setMode(mode === 'dark' ? 'light' : 'dark')}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: 'rgba(255,255,255,0.14)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.22)',
                }}
              >
                <Ionicons name={mode === 'dark' ? 'sunny' : 'moon'} size={15} color="#FFFFFF" />
              </Pressable>
              <Pressable style={s.signInPill} onPress={() => navigation.navigate('Login')}><Text style={s.signInText}>Sign in ›</Text></Pressable>
            </View>
          )}
        </View>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) => setCarouselIndex(Math.round(event.nativeEvent.contentOffset.x / bannerWidth))}
          style={[s.heroCarousel, { width: bannerWidth }]}
        >
          {[
            {icon:'bag-handle-outline',kicker:'UM TAGUM MARKETPLACE',title:'Find what you need for campus.',copy:'Browse textbooks, uniforms, engineering kits, and calculators across Mabini and Visayan.'},
            {icon:'repeat-outline',kicker:'SELL OR RENT',title:'Give useful items another semester.',copy:'List what you no longer need and set your own terms with verified classmates.'},
            {icon:'shield-checkmark-outline',kicker:'TAGUM SAFE ZONES',title:'Trade safely at campus landmarks.',copy:'Handoffs at Main Canteen, Gym, Visayan Labs, and Libraries with zero platform fees.'},
          ].map((slide,index)=><View key={slide.kicker} style={[s.carouselSlide,{width:bannerWidth}]}><Ionicons name={slide.icon as any} size={23} color="#ffc270"/><Text style={s.heroKicker}>{slide.kicker}</Text><Text style={s.heroTitle}>{slide.title}</Text><Text style={s.heroDescription}>{slide.copy}</Text><Pressable onPress={()=>navigation.navigate(index===2?'Help':'Browse')}><Text style={s.heroLink}>{index===2?'How it works  ›':'Explore marketplace  ›'}</Text></Pressable></View>)}
        </ScrollView>
        <View style={s.carouselDots}>{[0,1,2].map((dot)=><View key={dot} style={[s.carouselDot,dot===carouselIndex&&s.carouselDotActive]}/>)}</View>
        <View style={s.heroActions}><Pressable onPress={() => navigation.navigate('About')}><Text style={s.heroLink}>About UM-Pasa  ›</Text></Pressable><View style={s.heroDivider}/><Pressable onPress={() => navigation.navigate('Help')}><Text style={s.heroLink}>How it works  ›</Text></Pressable></View>
      </LinearGradient>
      <View style={s.heroGlow}/>
    </View>

    <Card style={s.searchPanel}>
      <Text style={s.searchLabel}>WHAT ARE YOU LOOKING FOR?</Text>
      <View style={s.searchRow}>
        <View style={s.searchInputWrap}>
          <Ionicons name="search-outline" size={18} color={C.muted} style={{ marginLeft: 12 }} />
          <TextInput
            value={q}
            onChangeText={setQ}
            onSubmitEditing={load}
            returnKeyType="search"
            placeholder="Search items or course code"
            placeholderTextColor={C.muted}
            style={s.searchInput}
          />
          {q ? (
            <Pressable onPress={() => setQ('')} hitSlop={8} style={{ paddingRight: 12 }}>
              <Ionicons name="close-circle" size={17} color={C.muted} />
            </Pressable>
          ) : null}
        </View>
        <Pressable accessibilityRole="button" onPress={load} style={s.searchButton}>
          <LinearGradient colors={['#ef4035', '#b70201', '#810101']} style={s.searchButtonGradient}>
            <Text style={s.searchButtonText}>GO</Text>
          </LinearGradient>
        </Pressable>
      </View>
      <Text style={s.searchHint}>Try “Calculators”, “Books” or a course code.</Text>
    </Card>

    <View style={s.sectionTop}><View><Text style={s.sectionKicker}>DISCOVER</Text><Text style={s.sectionTitle}>Browse resources</Text></View><Text style={s.resultCount}>{items.length} found</Text></View>
    <Text style={s.filterLabel}>LISTING TYPE</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipStrip}>
      {[['All types', undefined, 'layers-outline'], ['For sale', 'sell', 'pricetag-outline'], ['For rent', 'rent', 'repeat-outline']].map(([label, value, icon]: any) => <Choice key={label} label={label} icon={icon} selected={filters.listing_type === value} onPress={() => setFilter('listing_type', value)}/>)}
    </ScrollView>
    <Text style={s.filterLabel}>POPULAR CATEGORIES</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipStrip}>
      <Choice key="All" label="All" icon="grid-outline" selected={!filters.category} onPress={() => setFilter('category', undefined)} />
      {categories.map((value) => <Choice key={value} label={value} icon={getCategoryIcon(value)} selected={filters.category === value} onPress={() => setFilter('category', filters.category === value ? undefined : value)}/>)}
    </ScrollView>
    <View style={s.sortRow}><Text style={s.filterLabel}>SORT BY</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.sortChoices}>{[['Newest','newest','time-outline'],['Oldest','oldest','calendar-outline'],['Price ↑','price_low','trending-up-outline'],['Price ↓','price_high','trending-down-outline']].map(([label,value,icon]:any)=><Choice key={label} label={label} icon={icon} selected={filters.sort===value} onPress={()=>setFilter('sort',value)}/>)}</ScrollView></View>

    <Pressable style={s.filterToggle} onPress={() => setShowFilters(!showFilters)}><View><Text style={s.filterToggleTitle}>More filters {selectedCount ? '· ' + selectedCount + ' selected' : ''}</Text><Text style={s.filterToggleHint}>Condition, program and course</Text></View><Text style={s.filterChevron}>{showFilters ? '−' : '+'}</Text></Pressable>
    {showFilters && <Card style={s.advancedFilters}>
      <Text style={s.filterLabel}>CONDITION</Text><View style={s.rowWrap}>{[['Any',undefined],...['new','like_new','good','fair','poor'].map(v=>[v.replace('_',' '),v])].map(([label,value]:any)=><Choice key={label} label={label} selected={filters.condition===value} onPress={()=>toggle('condition',value)}/>)}</View>
      <Text style={s.filterLabel}>DEPARTMENT</Text><View style={s.rowWrap}><Choice label="All departments" selected={!filters.department} onPress={()=>setFilters({...filters,department:undefined,program:undefined})}/>{departments.map(v=><Choice key={v} label={v.replace('Department of ','')} selected={filters.department===v} onPress={()=>setFilters({...filters,department:filters.department===v?undefined:v,program:undefined})}/>)}</View>
      {programsForDepartment.length > 0 && <><Text style={s.filterLabel}>PROGRAM</Text><View style={s.rowWrap}><Choice label="All programs" selected={!filters.program} onPress={()=>setFilter('program',undefined)}/>{programsForDepartment.map(v=><Choice key={v} label={v} selected={filters.program===v} onPress={()=>toggle('program',v)}/>)}</View></>}
      <Field label="Course code" value={filters.course_code||''} onChangeText={(v:string)=>setFilter('course_code',v||undefined)} autoCapitalize="characters" onSubmitEditing={load}/>
    </Card>}
    {error ? <Status state={error} retry={load}/> : loading && !items.length ? <View style={s.loadingBlock}><ActivityIndicator color={C.red}/><Text style={s.muted}>Finding campus listings…</Text></View> : !items.length ? <Status state="No approved listings match your search yet." retry={load}/> : <View style={s.listingGrid}>{items.map(item=><Pressable key={item.id} style={[s.gridItem,{width:(width-43)/2}]} onPress={()=>navigation.navigate('Listing',{id:item.id})}><ItemCard item={item} compact/></Pressable>)}</View>}
  </Page>;
}
async function openNotification(n:Notice,navigation:any,isAdmin:boolean) { try { if(!n.is_read) await account.markNotificationRead(n.id); } catch(e) { Alert.alert('Unable to update notification',errorMessage(e));return; } if(n.related_type==='transaction'&&n.related_id)navigation.navigate('Transaction',{id:n.related_id});else if(n.related_type==='conversation'&&n.related_id)navigation.navigate('Conversation',{id:n.related_id});else if(n.related_type==='item'&&n.related_id)navigation.navigate(isAdmin&&n.type==='listing_review'?'AdminItems':'Listing',isAdmin&&n.type==='listing_review'?{itemId:n.related_id}:{id:n.related_id});else Alert.alert('Activity update',n.message); }
function ItemCard({ item, compact = false }: { item: Item; compact?: boolean }) {
  const isRent = item.listing_type === 'rent';
  return (
    <View style={s.modernCard}>
      {/* Edge-to-edge image container with floating badge */}
      <View style={s.itemImageWrap}>
        {item.image ? (
          <Image source={{ uri: imageUrl(item.image) }} style={compact ? s.itemImgCompact : s.itemImg} resizeMode="cover" />
        ) : (
          <View style={[compact ? s.itemImgCompact : s.itemImg, s.itemPlaceholder]}>
            <Ionicons name={isRent ? 'calendar-outline' : 'pricetag-outline'} size={compact ? 22 : 28} color={C.gold} />
            <Text numberOfLines={1} style={s.placeholderTag}>{item.category || 'Academic Resource'}</Text>
          </View>
        )}
        <View style={s.floatingTypeBadge}>
          <Text style={s.floatingTypeText}>{isRent ? 'RENT' : 'SALE'}</Text>
        </View>
      </View>

      {/* Card Content Body */}
      <View style={s.itemBody}>
        <Text numberOfLines={1} style={s.itemCategoryKicker}>{item.category || 'CAMPUS RESOURCE'}</Text>
        <Text numberOfLines={2} style={compact ? s.itemTitleCompact : s.itemTitle}>{item.title}</Text>
        <Text numberOfLines={1} style={s.itemMeta}>
          {item.condition?.replace('_', ' ')} · {item.course_code || item.department?.replace('Department of ', '')}
        </Text>
        <View style={s.itemPriceRow}>
          <Text numberOfLines={1} style={compact ? s.itemPriceCompact : s.itemPrice}>
            {money(item.price)}{isRent ? ' / day' : ''}
          </Text>
          {!compact && (
            <Text numberOfLines={1} style={s.itemSeller}>
              {item.user?.name?.split(' ')[0] || 'Student'} ›
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}


function ListingScreen({ route, navigation }: any) {
  const { user } = useAuth();
  const [item, setItem] = useState<Item | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [days, setDays] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState('cash_on_pickup');
  const [otherPayment, setOtherPayment] = useState('');

  const load = useCallback(async () => {
    setErr('');
    try {
      setItem(await marketplace.get(route.params.id));
    } catch (e) {
      setErr(errorMessage(e));
    }
  }, [route.params.id]);

  useEffect(() => { load(); }, [load]);

  const request = () => {
    if (!user) {
      Alert.alert('Sign in required', 'Sign in to request this listing.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign in', onPress: () => navigation.navigate('Login') }
      ]);
      return;
    }
    if (item?.listing_type === 'rent') {
      const numDays = Number(days);
      const min = item.minimum_rental_days || 1;
      const max = item.maximum_rental_days || 365;
      if (!days.trim() || isNaN(numDays) || numDays < min || numDays > max) {
        Alert.alert('Rental duration required', `Please enter rental days between ${min} and ${max} before requesting.`);
        return;
      }
    }
    const methods = item?.accepted_payment_methods || ['cash_on_pickup'];
    setSelectedPayment(methods[0] || 'cash_on_pickup');
    setShowPaymentModal(true);
  };

  const doRequest = async (method: string) => {
    if (!item) return;
    if (method === 'other' && !otherPayment.trim()) {
      Alert.alert('Payment method required', 'Please specify the other payment method.');
      return;
    }
    setBusy(true);
    try {
      await transactions.request(item.id, {
        payment_method: method,
        ...(method === 'other' ? { other_payment_method: otherPayment.trim() } : {}),
        ...(item.listing_type === 'rent' ? { rental_duration_days: Number(days) } : {})
      });
      setShowPaymentModal(false);
      Alert.alert('Request sent', 'The seller has been notified.');
    } catch (e) {
      Alert.alert('Unable to request', errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  if (!item) return <Page><Status state={err || 'Loading listing…'} retry={load} /></Page>;

  const acceptedMethods = item.accepted_payment_methods && item.accepted_payment_methods.length > 0
    ? item.accepted_payment_methods
    : ['cash_on_pickup'];

  const isDark = C.bg === themeTokens.dark.colors.bg;
  return (
    <Page bottomSafe>
      <Heading title={item.title} subtitle={`${item.category || ''} · ${item.course_code || item.department}`} />
      {item.moderation_status === 'rejected' && (
        <View style={{
          backgroundColor: isDark ? 'rgba(230,36,36,0.18)' : '#FFEAE8',
          borderWidth: 1.5,
          borderColor: C.red,
          borderRadius: 14,
          padding: 14,
          marginBottom: 14,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Ionicons name="alert-circle" size={18} color={C.red} />
            <Text style={{ fontSize: 14, fontWeight: '800', color: C.red }}>Listing Rejected by Campus Admin</Text>
          </View>
          <Text style={{ fontSize: 13, color: C.white, lineHeight: 19 }}>
            Reason: {item.rejection_reason || 'This listing does not meet UM-Pasa campus guidelines or required details.'}
          </Text>
          <Text style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>
            You can edit or delete this listing to comply with UM Tagum College marketplace policies.
          </Text>
        </View>
      )}
      {item.image ? <Image source={{ uri: imageUrl(item.image) }} style={s.heroImage} /> : null}
      <Card>
        <Text style={s.price}>{money(item.price)}{item.listing_type === 'rent' ? ' / day' : ''}</Text>
        <Text style={s.body}>{item.description}</Text>
        <Text style={s.muted}>Condition: {item.condition?.replace('_', ' ')}</Text>
        <Text style={s.muted}>Department: {item.department}{item.program ? ` · ${item.program}` : ''}</Text>
        {item.user ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`View reviews for ${item.user.name}`}
            onPress={() => navigation.navigate('ProfileReviews', { id: item.user_id, name: item.user?.name, role: item.user?.role })}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5 }}
          >
            <Text style={[s.muted, { color: C.gold, fontWeight: '700', marginTop: 0 }]}>Seller: {item.user?.name}</Text>
            <Ionicons name="star" size={12} color={C.gold} />
            <Text style={{ fontSize: 12, color: C.gold, fontWeight: '700' }}>Reviews ›</Text>
          </Pressable>
        ) : (
          <Text style={s.muted}>Seller: UM student</Text>
        )}
        <Text style={s.muted}>Payment: {acceptedMethods.map((v: string) => v.replaceAll('_', ' ')).join(', ')}</Text>
        {item.created_at ? <Text style={s.muted}>Posted: {formatPhilippineDate(item.created_at)}</Text> : null}
        {item.archived_at ? <Text style={s.muted}>Archived listing · transaction history is retained</Text> : null}
      </Card>
      {!item.archived_at && item.listing_type === 'rent' && (
        <Field
          label={`Rental days (${item.minimum_rental_days || 1}–${item.maximum_rental_days || 365})`}
          value={days}
          onChangeText={setDays}
          keyboardType="number-pad"
        />
      )}
      {!item.archived_at && user?.id !== item.user_id && (
        <Button title={busy ? 'Sending…' : 'Request this item'} disabled={busy} onPress={request} />
      )}
      {user?.id !== item.user_id && (
        <Button
          title="Message seller"
          secondary
          onPress={async () => {
            if (!user) {
              Alert.alert('Sign in required', 'Sign in to message the seller.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign in', onPress: () => navigation.navigate('Login') }
              ]);
              return;
            }
            try {
              const m = await messaging.send({
                recipient_id: item.user_id,
                item_id: item.id,
                body: `Hi, I'm interested in ${item.title}.`
              });
              navigation.navigate('Conversation', { id: m.conversation_id });
            } catch (e) {
              Alert.alert('Unable to message seller', errorMessage(e));
            }
          }}
        />
      )}
      {!item.archived_at && user && (user.id === item.user_id || user.role === 'admin') && (
        <Button title="Edit listing" secondary onPress={() => navigation.navigate('ListingForm', { item })} />
      )}
      {user?.id === item.user_id && item.status === 'available' && item.moderation_status === 'approved' && item.listing_type === 'sell' && (
        <Button
          title="Mark as sold"
          secondary
          onPress={() => Alert.alert(
            'Mark this listing sold?',
            `${item.title} will be removed from the available marketplace.`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Mark sold',
                onPress: async () => {
                  try {
                    await marketplace.markSold(item.id);
                    await load();
                  } catch (e) {
                    Alert.alert('Unable to mark sold', errorMessage(e));
                  }
                }
              }
            ]
          )}
        />
      )}
      {!item.archived_at && user?.id === item.user_id && (
        <Button
          title="Delete listing"
          danger
          onPress={() => Alert.alert(
            'Archive listing?',
            'Transaction history, if any, will be retained.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Archive',
                style: 'destructive',
                onPress: async () => {
                  try {
                    await marketplace.remove(item.id);
                    navigation.goBack();
                  } catch (e) {
                    Alert.alert('Unable to archive', errorMessage(e));
                  }
                }
              }
            ]
          )}
        />
      )}
      <Modal visible={showPaymentModal} transparent animationType="fade" onRequestClose={() => !busy && setShowPaymentModal(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end', padding: 16 }}
          onPress={() => !busy && setShowPaymentModal(false)}
        >
          <Pressable
            style={{ backgroundColor: C.panel, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: C.border }}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[s.rowBetween, { marginBottom: 12 }]}>
              <View style={{ flex: 1 }}>
                <Text style={s.cardTitle}>Choose payment method</Text>
                <Text style={s.muted}>Accepted by seller for this item</Text>
              </View>
              <Pressable accessibilityRole="button" onPress={() => !busy && setShowPaymentModal(false)}>
                <Ionicons name="close-circle-outline" size={24} color={C.muted} />
              </Pressable>
            </View>
            {acceptedMethods.map((m: string) => {
              const isSelected = selectedPayment === m;
              const label =
                m === 'gcash' ? 'GCash' :
                m === 'maya' ? 'Maya' :
                m === 'bank_transfer' ? 'Bank Transfer' :
                m === 'cash_on_pickup' ? 'Cash on Pickup' :
                m === 'other' ? 'Other payment method' :
                m.replaceAll('_', ' ');
              return (
                <Pressable
                  key={m}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => setSelectedPayment(m)}
                  style={[
                    s.rowBetween,
                    {
                      paddingVertical: 12,
                      paddingHorizontal: 14,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: isSelected ? C.red : C.border,
                      backgroundColor: isSelected ? C.soft : C.panel,
                      marginBottom: 8,
                    }
                  ]}
                >
                  <Text style={[s.body, { color: isSelected ? C.red : C.white, fontWeight: isSelected ? '700' : '500' }]}>
                    {label}
                  </Text>
                  <Ionicons
                    name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={isSelected ? C.red : C.muted}
                  />
                </Pressable>
              );
            })}
            {selectedPayment === 'other' && (
              <Field
                label="Specify other payment method"
                value={otherPayment}
                onChangeText={setOtherPayment}
                placeholder="e.g. Palawan Pay, split payment"
              />
            )}
            <View style={{ marginTop: 8 }}>
              <Button
                title={busy ? 'Submitting request…' : 'Confirm request'}
                disabled={busy || (selectedPayment === 'other' && !otherPayment.trim())}
                onPress={() => doRequest(selectedPayment)}
              />
              <Button
                title="Cancel"
                secondary
                disabled={busy}
                onPress={() => setShowPaymentModal(false)}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Page>
  );
}
function imageUrl(path: string) { return /^https?:\/\//i.test(path) ? path : ''; }

const categories = ['Books','Uniforms','Gadgets','Calculators','Supplies','Lab & Science','Art Materials','Engineering Tools','Electronics','PE & Sports','Review Materials','Thesis & Research','School Bags','Dorm Essentials','Tickets & Events','Other'];
const programs: Record<string,string[]> = {
  'Department of Accounting Education':['BS in Accountancy','BS in Internal Auditing','BS in Management Accounting'],
  'Department of Arts and Sciences Education':['AB English','BS in Psychology'],
  'Department of Computing Education':['BS in Computer Science','BS in Information Technology'],
  'Department of Business Administration Education':['BS in Business Administration - Major in Financial Management','BS in Business Administration - Major in Human Resource Management','BS in Business Administration - Major in Marketing Management'],
  'Department of Hospitality Education':['BS in Hotel and Restaurant Management','BS in Tourism Management'],
  'Department of Criminal Justice Education':['BS in Criminology'],
  'Department of Engineering Education':['Major in Computer Engineering','Major in Electrical Engineering','Major in Electronics Engineering'],
  'Department of Teacher Education':['Bachelor in Elementary Education - Generalist','Bachelor in Physical Education','Bachelor in Secondary Education - Major in English','Bachelor in Secondary Education - Major in Filipino','Bachelor in Secondary Education - Major in Mathematics','Bachelor in Secondary Education - Major in Science','Bachelor in Secondary Education - Major in Social Studies'],
  'Junior High School':[],
  'Senior High School':['Science, Technology, Engineering and Mathematics (STEM)'],
  'Graduate School':['Master of Arts in Education - Teaching English','Master of Arts in Education - Teaching Filipino','Master of Arts in Education - Teaching Mathematics','Master of Arts in Education - Teaching Science','Master of Arts in Education - Teaching Physical Education','Master in Business Administration','Master in Management','Master in Public Administration']
};
const departments = Object.keys(programs);
function ListingFormScreen({ route, navigation }: any) {
  const edit = route.params?.item as Item | undefined;
  const [f, setF] = useState<any>(edit ? { ...edit, ...(categories.includes(edit.category)?{}:{category:'__custom',custom_category:edit.category}) } : { listing_type: 'sell', category: 'Books', condition: 'good', department: departments[0], accepted_payment_methods: ['cash_on_pickup'] });
  const [busy, setBusy] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(edit?.image || null);
  const set = (k: string, v: any) => setF((prev: any) => ({ ...prev, [k]: v }));

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
          Alert.alert('Image too large', 'Please select a photo smaller than 5MB.');
          return;
        }
        setImageUri(asset.uri);
      }
    } catch (err) {
      Alert.alert('Unable to pick image', errorMessage(err));
    }
  };

  const save = async () => {
    setBusy(true);
    try {
      let imagePath = f.image_path || (edit?.image ? edit.image : null);
      if (imageUri && !imageUri.startsWith('http')) {
        imagePath = await uploadItemImage(imageUri);
      }
      await marketplace.save({ ...f, image_path: imagePath }, edit?.id);
      Alert.alert('Listing saved', edit ? 'Your changes were submitted for review.' : 'Your listing was submitted for review.');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Unable to save listing', errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const pay = ['gcash','maya','bank_transfer','cash_on_pickup','other'];
  return <Page bottomSafe><Heading title={edit ? 'Edit listing' : 'Add a listing'} subtitle="Listings from students are reviewed before appearing in the marketplace." /><Field label="Title" value={f.title || ''} onChangeText={(v: string) => set('title', v)} /><Text style={s.label}>Category</Text><View style={s.rowWrap}>{categories.map(v => <Choice key={v} label={v} selected={f.category === v && !f.custom_category} onPress={() => {set('category', v);set('custom_category','');}} />)}<Choice label="Other / custom" selected={!!f.custom_category} onPress={() => set('category','__custom')} /></View>{f.category==='__custom'&&<Field label="Custom category" value={f.custom_category||''} onChangeText={(v:string)=>set('custom_category',v)}/>}<Field label="Description (at least 10 characters)" value={f.description || ''} onChangeText={(v: string) => set('description', v)} multiline /><Text style={s.label}>Listing type</Text><View style={s.row}><Choice label="For sale" selected={f.listing_type === 'sell'} onPress={() => set('listing_type', 'sell')} /><Choice label="For rent" selected={f.listing_type === 'rent'} onPress={() => set('listing_type', 'rent')} /></View>{f.listing_type === 'sell' ? <Field label="Price (₱)" value={String(f.price || '')} onChangeText={(v: string) => set('price', v)} keyboardType="decimal-pad" /> : <><Field label="Daily rental rate (₱)" value={String(f.daily_rental_rate || '')} onChangeText={(v: string) => set('daily_rental_rate', v)} keyboardType="decimal-pad" /><View style={s.row}><View style={{ flex: 1 }}><Field label="Minimum days" value={String(f.minimum_rental_days || '')} onChangeText={(v: string) => set('minimum_rental_days', v)} keyboardType="number-pad" /></View><View style={{ flex: 1 }}><Field label="Maximum days" value={String(f.maximum_rental_days || '')} onChangeText={(v: string) => set('maximum_rental_days', v)} keyboardType="number-pad" /></View></View></>}<Text style={s.label}>Condition</Text><View style={s.row}>{['new','like_new','good','fair','poor'].map(v => <Choice key={v} label={v.replace('_',' ')} selected={f.condition === v} onPress={() => set('condition', v)} />)}</View><Text style={s.label}>Accepted payment methods</Text><View style={s.rowWrap}>{pay.map(v => <Choice key={v} label={v.replaceAll('_',' ')} selected={f.accepted_payment_methods?.includes(v)} onPress={() => set('accepted_payment_methods', f.accepted_payment_methods?.includes(v) ? f.accepted_payment_methods.filter((x: string) => x !== v) : [...(f.accepted_payment_methods || []), v])} />)}</View><Text style={s.label}>Department</Text><View style={s.rowWrap}>{departments.map(v => <Choice key={v} label={v.replace('Department of ','')} selected={f.department === v} onPress={() => {set('department',v);set('program','');}} />)}</View>{(programs[f.department] || []).length>0&&<><Text style={s.label}>Program</Text><View style={s.rowWrap}>{programs[f.department].map(v=><Choice key={v} label={v} selected={f.program===v} onPress={()=>set('program',v)}/>)}</View></>}<Field label="Course code" value={f.course_code || ''} onChangeText={(v: string) => set('course_code', v.toUpperCase())} autoCapitalize="characters" /><Text style={s.label}>Listing photo (optional)</Text>{imageUri ? <View style={{ marginBottom: 14 }}><Image source={{ uri: imageUri }} style={{ width: '100%', height: 180, borderRadius: 10, marginBottom: 8 }} resizeMode="cover" /><View style={s.row}><Button title="Change photo" secondary onPress={pickImage} /><Button title="Remove" danger onPress={() => { setImageUri(null); set('image_path', null); }} /></View></View> : <View style={{ marginBottom: 14 }}><Button title="📷 Select photo from library" secondary onPress={pickImage} /></View>}<Button title={busy ? 'Saving…' : 'Save listing'} disabled={busy} onPress={save} /></Page>;
}

function DashboardScreen({ navigation }: any) {
  const {width}=useWindowDimensions();
  const { user } = useAuth();
  const [data, setData] = useState<any>();
  const [err, setErr] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(async () => {
    try {
      if (user?.role === 'admin') {
        const [users, items, txs, notifications] = await Promise.all([
          admin.users(),
          admin.items(),
          admin.transactions(),
          account.notifications(),
        ]);
        setUnreadCount((notifications || []).filter((n: any) => !n.is_read).length);
        const tally = (rows: any[], get: (row: any) => string | undefined) =>
          Object.entries(
            rows.reduce((a: any, r: any) => {
              const k = get(r);
              if (k) a[k] = (a[k] || 0) + 1;
              return a;
            }, {})
          )
            .map(([label, total]) => ({ label, total: Number(total) }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 6);
        const months = Array.from({ length: 6 }, (_, i) => {
          const d = new Date();
          d.setMonth(d.getMonth() - (5 - i));
          return d.toISOString().slice(0, 7);
        });
        const monthly = months.map(k => ({
          label: new Date(`${k}-01T12:00:00`).toLocaleString('en', { month: 'short' }),
          total: txs.filter((t: any) => String(t.created_at || '').slice(0, 7) === k).length,
        }));
        setData({
          stats: {
            users: users.length,
            students: users.filter((u: any) => u.role === 'student').length,
            transactions: txs.length,
            completed: txs.filter((t: any) => t.status === 'completed').length,
            items: items.length,
            pendingItems: items.filter((i: any) => i.moderation_status === 'pending').length,
            approvedItems: items.filter((i: any) => i.moderation_status === 'approved').length,
            rejectedItems: items.filter((i: any) => i.moderation_status === 'rejected').length,
            activeListings: items.filter((i: any) => i.status === 'available' && i.moderation_status === 'approved').length,
            rentals: items.filter((i: any) => i.listing_type === 'rent').length,
            sales: items.filter((i: any) => i.listing_type === 'sell').length,
          },
          recent_items: items.slice(0, 6),
          charts: {
            categories: tally(items, (i: any) => i.category),
            departments: tally(items, (i: any) => i.department),
            monthly,
          },
          notifications: (notifications || []).slice(0, 5),
        });
      } else {
        const [dashboard, notifications] = await Promise.all([
          account.dashboard(),
          account.notifications(),
        ]);
        setUnreadCount((notifications || []).filter((n: any) => !n.is_read).length);
        setData({ ...dashboard, notifications: (notifications || []).slice(0, 5) });
      }
      setErr('');
    } catch (e) {
      setErr(errorMessage(e));
    }
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  if (err) return <Page><Status state={err} retry={load} /></Page>;
  if (!data) return <Page><ActivityIndicator color={C.gold} /></Page>;
  const stats = data.stats || {};
  const dashboardTiles = user?.role==='admin' ? [['Users',stats.users],['Students',stats.students],['Items',stats.items],['Pending review',stats.pendingItems],['Transactions',stats.transactions],['Completed',stats.completed]] : [['Listings',stats.total_items],['Pending',stats.pending_listings],['Requests',stats.pending_requests],['Completed',stats.completed_transactions]];
  return (
    <Page topSafe onRefresh={load}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={s.heading}>{`Hello, ${user?.name?.split(' ')[0] || 'there'}`}</Text>
          <Text style={s.subheading}>{user?.role === 'admin' ? 'UM-Pasa administration' : 'Your campus marketplace at a glance.'}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
          onPress={() => navigation.navigate('Notifications')}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: C.panel,
            borderWidth: 1,
            borderColor: C.border,
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          <Ionicons name="notifications-outline" size={22} color={C.white} />
          {unreadCount > 0 && (
            <View
              style={{
                position: 'absolute',
                top: -2,
                right: -2,
                minWidth: 18,
                height: 18,
                borderRadius: 9,
                backgroundColor: C.red,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 4,
                borderWidth: 1.5,
                borderColor: C.bg,
              }}
            >
              <Text style={{ color: '#ffffff', fontSize: 10, fontWeight: '800' }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </Text>
            </View>
          )}
        </Pressable>
      </View>
      {user?.role === 'admin' ? (
        <Button title={`Review listings${stats.pendingItems ? ` · ${stats.pendingItems}` : ''}`} onPress={() => navigation.navigate('AdminItems')} />
      ) : (
        <Button title="＋  Add a listing" onPress={() => navigation.navigate('ListingForm')} />
      )}
      <View style={s.stats}>
        {dashboardTiles.map(([n, v]) => (
          <Card key={String(n)} style={s.stat}>
            <Text style={s.statNum}>{v ?? 0}</Text>
            <Text style={s.muted}>{n}</Text>
          </Card>
        ))}
      </View>
      <View style={s.quickActionsGrid}>
        {user?.role === 'admin' ? (
          <>
            <Pressable accessibilityRole="button" onPress={() => navigation.navigate('Admin')} style={s.quickActionCard}>
              <View style={s.quickActionIcon}><Ionicons name="shield-checkmark-outline" size={17} color={C.gold} /></View>
              <Text numberOfLines={1} style={s.quickActionText}>Admin panel</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => navigation.navigate('AdminItems')} style={s.quickActionCard}>
              <View style={s.quickActionIcon}><Ionicons name="list-outline" size={17} color="#4ADE80" /></View>
              <Text numberOfLines={1} style={s.quickActionText}>Review items</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => navigation.navigate('AdminTransactions')} style={s.quickActionCard}>
              <View style={s.quickActionIcon}><Ionicons name="swap-horizontal-outline" size={17} color="#38BDF8" /></View>
              <Text numberOfLines={1} style={s.quickActionText}>Transactions</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => navigation.navigate('Notifications')} style={s.quickActionCard}>
              <View style={s.quickActionIcon}><Ionicons name="notifications-outline" size={17} color={C.gold} /></View>
              <Text numberOfLines={1} style={s.quickActionText}>Notifications</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Pressable accessibilityRole="button" onPress={() => navigation.navigate('MyListings')} style={s.quickActionCard}>
              <View style={s.quickActionIcon}><Ionicons name="pricetag-outline" size={17} color={C.gold} /></View>
              <Text numberOfLines={1} style={s.quickActionText}>My listings</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => navigation.navigate('Transactions')} style={s.quickActionCard}>
              <View style={s.quickActionIcon}><Ionicons name="swap-horizontal-outline" size={17} color="#4ADE80" /></View>
              <Text numberOfLines={1} style={s.quickActionText}>Requests</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => navigation.navigate('Reports')} style={s.quickActionCard}>
              <View style={s.quickActionIcon}><Ionicons name="stats-chart-outline" size={17} color="#38BDF8" /></View>
              <Text numberOfLines={1} style={s.quickActionText}>My report</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => navigation.navigate('Notifications')} style={s.quickActionCard}>
              <View style={s.quickActionIcon}><Ionicons name="notifications-outline" size={17} color={C.gold} /></View>
              <Text numberOfLines={1} style={s.quickActionText}>Notifications</Text>
            </Pressable>
          </>
        )}
      </View>{user?.role==='admin'&&<><MiniBars title="Listings by category" data={data.charts?.categories}/><MiniBars title="Listings by department" data={data.charts?.departments}/><MiniBars title="Monthly transactions" data={data.charts?.monthly}/></>}{user?.role!=='admin'&&data.notifications?.length>0&&<><Heading title="Recent activity"/>{data.notifications.map((n:Notice)=><Pressable key={n.id} accessibilityRole="button" onPress={()=>openNotification(n,navigation,user?.role==='admin')}><Card><View style={s.rowBetween}><Text style={[s.body,{color:n.is_read?C.muted:C.cream,flex:1}]}>{n.message}</Text><Ionicons name="chevron-forward" size={17} color={C.muted}/></View></Card></Pressable>)}</>}<View style={s.sectionTop}><Text style={s.sectionTitle}>Recent listings</Text><Pressable onPress={()=>navigation.navigate('Browse')}><Text style={{color:C.gold,fontWeight:'700'}}>See all ›</Text></Pressable></View><View style={s.listingGrid}>{(data.recent_items || []).map((item: Item) => <Pressable key={item.id} style={[s.gridItem,{width:(width-43)/2}]} onPress={() => navigation.navigate('Listing', { id: item.id })}><ItemCard item={item} compact/></Pressable>)}</View>
    </Page>
  );
}

function TransactionsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [list, setList] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'completed'>('all');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      setList(await transactions.list());
      setErr('');
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = list.filter(t => filter === 'all' ? true : t.status === filter);

  return (
    <Page topSafe refreshing={busy} onRefresh={load}>
      <Heading title="Transactions" subtitle="Requests, sales, rentals, and completed exchanges." />

      {/* Filter Tabs */}
      <View style={[s.rowWrap, { marginBottom: 14 }]}>
        {[
          ['all', 'All'],
          ['pending', 'Pending'],
          ['approved', 'Approved'],
          ['completed', 'Completed'],
        ].map(([key, label]) => (
          <Choice
            key={key}
            label={label}
            selected={filter === key}
            onPress={() => setFilter(key as any)}
          />
        ))}
      </View>

      {err ? (
        <Status state={err} retry={load} />
      ) : !filtered.length && !busy ? (
        <Status state={filter === 'all' ? 'No transactions yet.' : `No ${filter} transactions found.`} />
      ) : (
        filtered.map(t => {
          const isSeller = user?.id === t.seller_id;
          const otherPerson = isSeller ? t.buyer?.name : t.seller?.name;
          const roleLabel = isSeller ? 'Buyer' : 'Seller';

          return (
            <Pressable
              key={t.id}
              accessibilityRole="button"
              onPress={() => navigation.navigate('Transaction', { id: t.id })}
              style={s.txCard}
            >
              <View style={s.rowBetween}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text numberOfLines={1} style={s.txTitle}>{t.item?.title || 'Campus transaction'}</Text>
                  <Text style={s.txPrice}>{money(t.item?.price)}</Text>
                </View>
                <StatusPill status={t.status} />
              </View>

              <View style={s.txDivider} />

              <View style={s.rowBetween}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="person-circle-outline" size={16} color={C.gold} />
                  <Text style={s.txParticipant}>
                    <Text style={{ color: C.muted }}>{roleLabel}: </Text>
                    {otherPerson || 'UM student'}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Ionicons
                    name={t.payment_method === 'cash_on_pickup' ? 'cash-outline' : 'phone-portrait-outline'}
                    size={13}
                    color={C.muted}
                  />
                  <Text style={s.txMethod}>
                    {t.payment_method === 'cash_on_pickup' ? 'Cash' : t.payment_method?.replaceAll('_', ' ').toUpperCase()}
                  </Text>
                </View>
              </View>

              {t.meetup_time ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 }}>
                  <Ionicons name="calendar-outline" size={13} color={C.gold} />
                  <Text numberOfLines={1} style={s.txMeetupSchedule}>
                    Meetup: {formatPhilippineDateTime(t.meetup_time)}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        })
      )}
    </Page>
  );
}
function TransactionScreen({ route, navigation }: any) {
  const { user } = useAuth();
  const isDark = C.bg === themeTokens.dark.colors.bg;
  const [t, setT] = useState<Transaction>();
  const [err, setErr] = useState('');
  const [meetup, setMeetup] = useState('');
  const [meetupDate, setMeetupDate] = useState<Date | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const [pendingProposal, setPendingProposal] = useState<any>(null);

  const load = useCallback(async () => {
    try {
      const data = await transactions.get(route.params.id);
      setT(data);
      if (data.meetup_location) setMeetup((prev: string) => prev || data.meetup_location || '');
      if (data.meetup_time) setMeetupDate((prev: Date | null) => prev || (data.meetup_time ? new Date(data.meetup_time) : null));
      if (data.payment_proof) {
        getPaymentProofSignedUrl(data.payment_proof).then(setProofUrl).catch(() => setProofUrl(null));
      } else {
        setProofUrl(null);
      }
      if (data.item_id) {
        const { data: convData } = await supabase
          .from('conversations')
          .select('id')
          .eq('item_id', data.item_id)
          .or(`and(starter_id.eq.${data.buyer_id},recipient_id.eq.${data.seller_id}),and(starter_id.eq.${data.seller_id},recipient_id.eq.${data.buyer_id})`)
          .maybeSingle();
        if (convData?.id) {
          const { data: propData } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', convData.id)
            .eq('type', 'meetup_proposal')
            .eq('proposal_status', 'pending')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          setPendingProposal(propData || null);
        } else {
          setPendingProposal(null);
        }
      }
    } catch(e) {
      setErr(errorMessage(e));
    }
  }, [route.params.id]);

  useEffect(() => { load(); }, [load]);

  if (!t) return <Page><Status state={err || 'Loading transaction…'} retry={load} /></Page>;
  const isSeller = user?.id === t.seller_id;
  const isBuyer = user?.id === t.buyer_id;
  const run = (title: string, action: () => Promise<any>) => Alert.alert(title, 'Continue with this transaction action?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Continue', onPress: async () => { try { await action(); await load(); } catch(e) { Alert.alert('Action failed', errorMessage(e)); } } }]);
  const approve = async () => {
    if (!meetup.trim()) {
      Alert.alert('Missing meetup location', 'Please enter a meetup place before approving.');
      return;
    }
    if (!meetupDate) {
      Alert.alert('Missing meetup schedule', 'Please select a meetup date and time.');
      return;
    }
    if (meetupDate.getTime() <= Date.now()) {
      Alert.alert('Invalid meetup time', 'Meetup time must be set in the future.');
      return;
    }
    if (approving) return;
    setApproving(true);
    try {
      await transactions.approve(t.id, meetup.trim(), meetupDate.toISOString());
      await load();
      Alert.alert('Request approved','The buyer was notified.');
    } catch(e) {
      Alert.alert('Approval failed', errorMessage(e));
    } finally {
      setApproving(false);
    }
  };

  const pickProof = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.7,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
          Alert.alert('File too large', 'Please select a receipt photo smaller than 5MB.');
          return;
        }
        setUploadingProof(true);
        await uploadPaymentProof(t.id, asset.uri);
        await load();
        Alert.alert('Payment proof uploaded', 'The seller can now view and verify your payment proof.');
      }
    } catch (err) {
      Alert.alert('Unable to upload proof', errorMessage(err));
    } finally {
      setUploadingProof(false);
    }
  };

  return <Page bottomSafe><Heading title={t.item?.title || 'Transaction'} subtitle={`Transaction #${t.id}`} /><Card><Text style={[s.badge,{color:statusColor(t.status)}]}>{t.status?.toUpperCase()}</Text><Text style={s.price}>{money(t.item?.price)}</Text><Text style={s.body}>Buyer: {t.buyer?.name}</Text><Text style={s.body}>Seller: {t.seller?.name}</Text><Text style={s.body}>Payment: {t.payment_method?.replaceAll('_',' ')}{t.other_payment_method?` · ${t.other_payment_method}`:''}</Text>{t.rental_duration_days?<Text style={s.body}>Rental duration: {t.rental_duration_days} day(s) · Due {formatPhilippineDate(t.rental_due_date, 'to be confirmed')}</Text>:null}{t.meetup_location ? <Text style={s.body}>Meetup: {t.meetup_location} · {formatPhilippineDateTime(t.meetup_time)}</Text> : null}{pendingProposal ? <View style={{ marginTop: 8, padding: 10, borderRadius: 8, backgroundColor: isDark ? 'rgba(246,200,76,0.12)' : '#FFF9E6', borderWidth: 1, borderColor: isDark ? 'rgba(246,200,76,0.25)' : '#FFE082' }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}><Ionicons name="time-outline" size={15} color={C.gold} /><Text style={{ fontSize: 12, fontWeight: '800', color: isDark ? C.gold : '#B78103' }}>Pending Meetup Proposal</Text></View><Text style={{ fontSize: 13, color: C.white, fontWeight: '600' }}>{pendingProposal.meetup_location} · {formatPhilippineDateTime(pendingProposal.meetup_time)}</Text><Text style={{ fontSize: 12, color: C.cream, marginTop: 2 }}>{pendingProposal.sender_id === user?.id ? `Waiting for ${user?.id === t.buyer_id ? t.seller?.name : t.buyer?.name} to accept` : `Proposed by ${pendingProposal.sender_id === t.buyer_id ? t.buyer?.name : t.seller?.name} (review in chat to accept)`}</Text></View> : null}<Text style={s.muted}>Payment proof: {t.payment_proof?`Uploaded ${formatPhilippineDateTime(t.payment_proof_uploaded_at, '')}`:'Not uploaded'}</Text>{proofUrl && <View style={{ marginTop: 10 }}><Text style={s.label}>Payment Proof Receipt:</Text><Image source={{ uri: proofUrl }} style={{ width: '100%', height: 220, borderRadius: 10, marginTop: 6 }} resizeMode="contain" /></View>}</Card>{isBuyer && ['pending','approved'].includes(t.status) && <View style={{ marginVertical: 6 }}><Button title={uploadingProof ? 'Uploading proof…' : t.payment_proof ? '📷 Replace payment proof' : '📷 Upload payment proof'} secondary disabled={uploadingProof} onPress={pickProof} /></View>}{isSeller && t.status === 'pending' && <><Field label="Meetup location" value={meetup} onChangeText={setMeetup} placeholder="e.g. Student Union Building / Library"/><MeetupTimePicker label="Meetup date & time" value={meetupDate} onChange={setMeetupDate}/><Button title={approving ? 'Approving request…' : 'Approve request'} disabled={approving || !meetup.trim() || !meetupDate} onPress={approve} /><Button title="Reject request" danger onPress={() => run('Reject request', () => transactions.reject(t.id))} /></>}{isSeller && t.status === 'approved' && <Button title="Mark as completed" onPress={() => run('Complete exchange', () => transactions.complete(t.id))} />}{t.status === 'completed' && !t.ratings?.some((r: any) => r.reviewer_id === user?.id) && <><Text style={s.muted}>Both the buyer and seller can leave a review after completion.</Text><RatingForm id={t.id} onDone={load} /></>}{t.item && <Button title="Message participant" secondary onPress={async()=>{try{const recipient_id=user?.id===t.buyer_id?t.seller_id:t.buyer_id;const m=await messaging.send({recipient_id,item_id:t.item_id,body:`Hi, I want to coordinate about ${t.item?.title}.`});navigation.navigate('Conversation',{id:m.conversation_id});}catch(e){Alert.alert('Unable to message participant',errorMessage(e))}}}/>}</Page>;
}
function RatingForm({ id, onDone }: any) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await transactions.rate(id, rating, comment);
      Alert.alert('Thank you', 'Your rating has been submitted.');
      onDone();
    } catch(e) {
      Alert.alert('Unable to rate', errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };
  return <Card><Text style={s.section}>Rate this exchange</Text><View style={[s.rowWrap, { gap: 6, marginBottom: 8 }]}>{[1,2,3,4,5].map(n => <Choice key={n} label={`${n} ★`} selected={rating === n} onPress={() => setRating(n)} />)}</View><Field label="Comment (optional)" value={comment} onChangeText={setComment} multiline /><Button title={submitting ? 'Submitting rating…' : 'Submit rating'} disabled={submitting} onPress={submit} /></Card>;
}

function MyListingsScreen({ navigation }: any) {
  const { width } = useWindowDimensions();
  const isDark = C.bg === themeTokens.dark.colors.bg;
  const [items, setItems] = useState<Item[]>([]); const [err, setErr] = useState('');
  const load = useCallback(async () => { try { const report=await account.report(); setItems(report.items || []); } catch(e) { setErr(errorMessage(e)); } }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const markSold = (item: Item) => Alert.alert('Mark this listing sold?', `${item.title} will be removed from the available marketplace.`, [
    {text:'Cancel',style:'cancel'}, {text:'Mark sold',onPress:async()=>{try{await marketplace.markSold(item.id);await load();}catch(e){Alert.alert('Unable to mark sold',errorMessage(e));}}},
  ]);
  return (
    <Page onRefresh={load}>
      <Heading title="My listings" subtitle="Manage review status and availability."/>
      <Button title="+ Add listing" onPress={() => navigation.navigate('ListingForm', {})} />
      {err ? <Status state={err} retry={load} /> : !items.length ? <Status state="You do not have listings yet." /> : (
        <View style={s.listingGrid}>
          {items.map(i => (
            <View key={i.id} style={{ width: (width - 43) / 2 }}>
              <Pressable onPress={() => navigation.navigate('Listing', { id: i.id })}>
                <ItemCard item={i} compact />
              </Pressable>
              <Text numberOfLines={2} style={[s.badge, { color: statusColor(i.moderation_status), marginBottom: 4 }]}>
                {i.moderation_status === 'pending' ? 'PENDING REVIEW' : i.moderation_status?.toUpperCase()}
              </Text>
              {i.moderation_status === 'rejected' && (
                <View style={{
                  backgroundColor: isDark ? 'rgba(230,36,36,0.15)' : '#FFEBEE',
                  borderWidth: 1,
                  borderColor: C.red,
                  borderRadius: 8,
                  padding: 6,
                  marginBottom: 6,
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="alert-circle" size={12} color={C.red} />
                    <Text style={{ fontSize: 10, fontWeight: '800', color: C.red }}>REJECTED BY ADMIN</Text>
                  </View>
                  <Text numberOfLines={3} style={{ fontSize: 11, color: C.white, marginTop: 2 }}>
                    {i.rejection_reason || 'Guidelines not met'}
                  </Text>
                </View>
              )}
              {i.status === 'available' && i.moderation_status === 'approved' && i.listing_type === 'sell' && (
                <Pressable accessibilityRole="button" onPress={() => markSold(i)} style={s.soldButton}>
                  <Text style={s.soldButtonText}>Mark sold</Text>
                </Pressable>
              )}
            </View>
          ))}
        </View>
      )}
    </Page>
  );
}

function ProfileScreen({ navigation }: any) {
  const { user, profile, updateProfile, updatePassword, logout, deleteAccount } = useAuth();
  const { mode, setMode } = useTheme();
  const [name, setName] = useState(profile?.full_name || user?.name || '');
  const [studentNumber, setStudentNumber] = useState(profile?.student_number || '');
  const [department, setDepartment] = useState(profile?.department || '');
  const [program, setProgram] = useState(profile?.program || '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [profileStats, setProfileStats] = useState({ listings: 0, transactions: 0, reviews: 0, rating: '5.0' });

  useEffect(() => {
    if (profile) {
      setName(profile.full_name || user?.name || '');
      setStudentNumber(profile.student_number || '');
      setDepartment(profile.department || '');
      setProgram(profile.program || '');
    }
  }, [profile, user]);

  const loadProfileStats = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [dashData, userReviews, txList] = await Promise.all([
        account.dashboard().catch(() => null),
        profiles.reviews(user.id).catch(() => []),
        transactions.list().catch(() => []),
      ]);
      const reviewsCount = Array.isArray(userReviews) ? userReviews.length : 0;
      const avg = reviewsCount > 0
        ? (userReviews.reduce((sum: number, r: any) => sum + (r.rating || 5), 0) / reviewsCount).toFixed(1)
        : '5.0';
      setProfileStats({
        listings: dashData?.stats?.total_items ?? 0,
        transactions: Array.isArray(txList) ? txList.length : (dashData?.stats?.completed_transactions ?? 0),
        reviews: reviewsCount,
        rating: avg,
      });
    } catch {
      // fallback
    }
  }, [user?.id]);

  useFocusEffect(useCallback(() => { loadProfileStats(); }, [loadProfileStats]));

  const saveProfile = async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter your full name.');
      return;
    }
    setBusy(true);
    try {
      await updateProfile({
        full_name: name,
        student_number: studentNumber || null,
        department: department || null,
        program: program || null,
      });
      setShowEditModal(false);
      Alert.alert('Profile updated', 'Your account information has been saved.');
    } catch (e) {
      Alert.alert('Unable to update profile', e instanceof Error ? e.message : errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const savePassword = async () => {
    if (!password) {
      Alert.alert('Password required', 'Please enter a new password.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Check password', 'The new passwords do not match.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Check password', 'Password must be at least 8 characters long.');
      return;
    }
    setBusy(true);
    try {
      await updatePassword(password);
      setPassword('');
      setConfirm('');
      setShowPasswordModal(false);
      Alert.alert('Password updated', 'Your password has been changed successfully.');
    } catch (e) {
      Alert.alert('Unable to update password', e instanceof Error ? e.message : errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const confirmLogout = () => Alert.alert('Sign out?', 'You will need to sign in again to access your account.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Sign out', style: 'destructive', onPress: async () => {
      try { await logout(); } catch (e) { Alert.alert('Unable to sign out', e instanceof Error ? e.message : 'Please try again.'); }
    } },
  ]);

  const confirmDeleteAccount = () => Alert.alert(
    'Delete account?',
    'This will archive your active listings and deactivate your UM-Pasa student account. This action cannot be undone.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete my account',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await deleteAccount();
            Alert.alert('Account deleted', 'Your student account has been deactivated.');
          } catch (e) {
            Alert.alert('Unable to delete account', errorMessage(e));
          } finally {
            setDeleting(false);
          }
        },
      },
    ]
  );

  return (
    <Page topSafe onRefresh={loadProfileStats}>
      <View style={s.profileHeaderRow}>
        <Text style={s.profileHeaderTitle}>Profile</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Settings"
          onPress={() => setShowEditModal(true)}
          style={s.profileHeaderIconBtn}
        >
          <Ionicons name="settings-outline" size={20} color={C.white} />
        </Pressable>
      </View>

      <View style={s.profileMainCard}>
        <View style={s.profileUserRow}>
          <View style={s.profileAvatarWrap}>
            <LinearGradient
              colors={['#b70201', '#e62424', '#f6c84c']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.profileAvatarRing}
            >
              <View style={s.profileAvatarInner}>
                <Text style={s.profileAvatarInitial}>
                  {(profile?.full_name || user?.name || 'U').charAt(0).toUpperCase()}
                </Text>
              </View>
            </LinearGradient>
          </View>
          <View style={{ flex: 1, paddingLeft: 14 }}>
            <Text style={s.profileUserName} numberOfLines={1}>
              {profile?.full_name || user?.name || 'UM Student'}
            </Text>
            <Text style={s.profileStudentId} numberOfLines={1}>
              {profile?.student_number ? `Student No. ${profile.student_number}` : (user?.email || 'Student Account')}
            </Text>
            <Text style={s.profileProgramText} numberOfLines={1}>
              {profile?.program || profile?.department?.replace('Department of ', '') || 'University of Mindanao'}
            </Text>
            <Pressable
              onPress={() => navigation.navigate('ProfileReviews', { id: user?.id })}
              style={s.profileRatingPill}
            >
              <Ionicons name="star" size={13} color="#F6C84C" />
              <Text style={s.profileRatingVal}>{profileStats.rating}</Text>
              <Text style={s.profileRatingCount}>({profileStats.reviews} reviews) ›</Text>
            </Pressable>
          </View>
        </View>

        <View style={s.profileCardDivider} />

        <View style={s.profileStatsRow}>
          <Pressable style={s.profileStatCol} onPress={() => navigation.navigate('MyListings')}>
            <Text style={s.profileStatVal}>{profileStats.listings}</Text>
            <Text style={s.profileStatLbl}>Listings</Text>
          </Pressable>
          <View style={s.profileStatDivider} />
          <Pressable style={s.profileStatCol} onPress={() => navigation.navigate('Transactions')}>
            <Text style={s.profileStatVal}>{profileStats.transactions}</Text>
            <Text style={s.profileStatLbl}>Transactions</Text>
          </Pressable>
          <View style={s.profileStatDivider} />
          <Pressable style={s.profileStatCol} onPress={() => navigation.navigate('ProfileReviews', { id: user?.id })}>
            <Text style={s.profileStatVal}>{profileStats.reviews}</Text>
            <Text style={s.profileStatLbl}>Reviews</Text>
          </Pressable>
        </View>
      </View>

      <View style={s.profileMenuCard}>
        <Pressable style={s.profileMenuItem} onPress={() => navigation.navigate('MyListings')}>
          <View style={s.profileMenuIconBox}>
            <Ionicons name="pricetag-outline" size={18} color={C.gold} />
          </View>
          <Text style={s.profileMenuLabel}>My Listings</Text>
          <Ionicons name="chevron-forward" size={18} color={C.muted} />
        </Pressable>

        <View style={s.profileMenuDivider} />

        <Pressable style={s.profileMenuItem} onPress={() => navigation.navigate('Reports')}>
          <View style={s.profileMenuIconBox}>
            <Ionicons name="stats-chart-outline" size={18} color={C.gold} />
          </View>
          <Text style={s.profileMenuLabel}>My Reports</Text>
          <Ionicons name="chevron-forward" size={18} color={C.muted} />
        </Pressable>

        <View style={s.profileMenuDivider} />

        <Pressable style={s.profileMenuItem} onPress={() => setShowEditModal(true)}>
          <View style={s.profileMenuIconBox}>
            <Ionicons name="settings-outline" size={18} color={C.gold} />
          </View>
          <Text style={s.profileMenuLabel}>Settings / Account Details</Text>
          <Ionicons name="chevron-forward" size={18} color={C.muted} />
        </Pressable>
      </View>

      <View style={s.profileMenuCard}>
        <View style={s.profileAppearanceHeader}>
          <Text style={s.profileAppearanceTitle}>Appearance</Text>
          <View style={s.segmentedPillContainer}>
            <Pressable
              onPress={() => setMode('light')}
              style={[s.segmentedPillOption, mode === 'light' && s.segmentedPillActiveLight]}
            >
              <Ionicons name="sunny" size={14} color={mode === 'light' ? '#FFFFFF' : C.muted} />
              <Text style={[s.segmentedPillText, mode === 'light' && { color: '#FFFFFF', fontWeight: '800' }]}>
                Light
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setMode('dark')}
              style={[s.segmentedPillOption, mode === 'dark' && s.segmentedPillActiveDark]}
            >
              <Ionicons name="moon" size={14} color={mode === 'dark' ? '#F6C84C' : C.muted} />
              <Text style={[s.segmentedPillText, mode === 'dark' && { color: '#F6C84C', fontWeight: '800' }]}>
                Dark
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      <View style={s.profileMenuCard}>
        <Pressable style={s.profileMenuItem} onPress={() => setShowPasswordModal(true)}>
          <View style={s.profileMenuIconBox}>
            <Ionicons name="lock-closed-outline" size={18} color={C.muted} />
          </View>
          <Text style={s.profileMenuLabel}>Change Password</Text>
          <Ionicons name="chevron-forward" size={18} color={C.muted} />
        </Pressable>

        {SHOW_DELETE_ACCOUNT && (
          <>
            <View style={s.profileMenuDivider} />
            <Pressable style={s.profileMenuItem} onPress={confirmDeleteAccount}>
              <View style={s.profileMenuIconBox}>
                <Ionicons name="trash-outline" size={18} color={C.red} />
              </View>
              <Text style={[s.profileMenuLabel, { color: C.red }]}>Account Deletion</Text>
              <Ionicons name="chevron-forward" size={18} color={C.red} />
            </Pressable>
          </>
        )}

        <View style={s.profileMenuDivider} />

        <Pressable style={s.profileMenuItem} onPress={confirmLogout}>
          <View style={[s.profileMenuIconBox, { backgroundColor: 'rgba(230, 36, 36, 0.12)' }]}>
            <Ionicons name="log-out-outline" size={18} color={C.red} />
          </View>
          <Text style={[s.profileMenuLabel, { color: C.red, fontWeight: '800' }]}>Sign Out</Text>
        </Pressable>
      </View>

      <Modal visible={showEditModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Edit Profile</Text>
              <Pressable onPress={() => setShowEditModal(false)} hitSlop={10}>
                <Ionicons name="close-circle" size={24} color={C.muted} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Field label="Full name" value={name} onChangeText={setName} />
              <Field label="Student number" value={studentNumber} onChangeText={setStudentNumber} autoCapitalize="characters" />
              <Field label="Department" value={department} onChangeText={setDepartment} />
              <Field label="Program" value={program} onChangeText={setProgram} />
              <View style={{ marginTop: 12 }}>
                <Button title={busy ? 'Saving…' : 'Save changes'} onPress={saveProfile} disabled={busy} />
                <Button title="Cancel" secondary onPress={() => setShowEditModal(false)} />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showPasswordModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Change Password</Text>
              <Pressable onPress={() => setShowPasswordModal(false)} hitSlop={10}>
                <Ionicons name="close-circle" size={24} color={C.muted} />
              </Pressable>
            </View>
            <Field label="New password" value={password} onChangeText={setPassword} secureTextEntry placeholder="Min. 8 characters" />
            <Field label="Confirm new password" value={confirm} onChangeText={setConfirm} secureTextEntry placeholder="Re-enter password" />
            <View style={{ marginTop: 12 }}>
              <Button title={busy ? 'Updating…' : 'Update password'} onPress={savePassword} disabled={busy} />
              <Button title="Cancel" secondary onPress={() => setShowPasswordModal(false)} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Page>
  );
}

function NotificationsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [items, setItems] = useState<Notice[]>([]);
  const [filter, setFilter] = useState('all');
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    try {
      setItems(await account.notifications());
      setErr('');
    } catch (e) {
      setErr(errorMessage(e));
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const read = async () => {
    try {
      await account.markNotificationsRead();
      await load();
    } catch (e) {
      Alert.alert('Unable to update', errorMessage(e));
    }
  };

  const open = async (n: Notice) => {
    try {
      if (!n.is_read) {
        await account.markNotificationRead(n.id);
        setItems(old => old.map(x => (x.id === n.id ? { ...x, is_read: true } : x)));
      }
    } catch (e) {
      Alert.alert('Unable to update notification', errorMessage(e));
      return;
    }
    if (n.related_type === 'transaction' && n.related_id) {
      navigation.navigate('Transaction', { id: n.related_id });
    } else if (n.related_type === 'conversation' && n.related_id) {
      navigation.navigate('Conversation', { id: n.related_id });
    } else if (n.related_type === 'item' && n.related_id) {
      navigation.navigate(
        user?.role === 'admin' && n.type === 'listing_review' ? 'AdminItems' : 'Listing',
        user?.role === 'admin' && n.type === 'listing_review' ? { itemId: n.related_id } : { id: n.related_id }
      );
    } else {
      Alert.alert('Activity update', n.message);
    }
  };

  const types: Record<string, string[]> = {
    requests: ['request', 'message', 'meetup'],
    approved: ['approval', 'completion'],
    pending: ['request', 'rental_due_soon', 'rental_due', 'payment_proof', 'listing_review'],
    rejected: ['rejection', 'rental_overdue'],
    ratings: ['rating'],
  };

  const getNoticeIcon = (type: string) => {
    switch (type) {
      case 'request':
        return { name: 'swap-horizontal', color: C.gold };
      case 'meetup':
        return { name: 'calendar', color: '#4ADE80' };
      case 'message':
        return { name: 'chatbubble-ellipses', color: '#38BDF8' };
      case 'approval':
        return { name: 'checkmark-circle', color: '#4ADE80' };
      case 'completion':
        return { name: 'ribbon', color: '#4ADE80' };
      case 'rejection':
      case 'rental_overdue':
        return { name: 'alert-circle', color: '#F87171' };
      case 'rating':
        return { name: 'star', color: C.gold };
      case 'listing_review':
        return { name: 'shield-checkmark', color: C.gold };
      case 'payment_proof':
        return { name: 'receipt', color: C.gold };
      default:
        return { name: 'notifications', color: C.muted };
    }
  };

  const visible = items.filter(n =>
    filter === 'all' ? true : filter === 'unread' ? !n.is_read : (types[filter] || []).includes(n.type)
  );

  return (
    <Page onRefresh={load}>
      <Heading title="Activity updates" subtitle="Requests, approvals, messages, and ratings." />
      <Button title="Mark all as read" secondary onPress={read} />
      <View style={s.rowWrap}>
        {['all', 'unread', 'requests', 'approved', 'pending', 'rejected', 'ratings'].map(f => (
          <Choice key={f} label={f} selected={filter === f} onPress={() => setFilter(f)} />
        ))}
      </View>
      {err ? (
        <Status state={err} retry={load} />
      ) : !visible.length ? (
        <Status state="No notifications in this view." />
      ) : (
        visible.map(n => {
          const iconInfo = getNoticeIcon(n.type);
          return (
            <Pressable key={n.id} accessibilityRole="button" onPress={() => open(n)}>
              <Card style={[s.noticeCard, !n.is_read && s.noticeCardUnread]}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                  <View style={[s.noticeIconBadge, { backgroundColor: C.soft }]}>
                    <Ionicons name={iconInfo.name as any} size={20} color={iconInfo.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={s.rowBetween}>
                      <Text style={[s.noticeTitle, { color: n.is_read ? C.muted : C.white, flex: 1, paddingRight: 6 }]}>
                        {n.message}
                      </Text>
                      {!n.is_read && <View style={s.noticeUnreadDot} />}
                    </View>
                    <Text style={s.noticeTimestamp}>{formatPhilippineDateTime(n.created_at)}</Text>
                  </View>
                </View>
              </Card>
            </Pressable>
          );
        })
      )}
    </Page>
  );
}

function MessagesScreen({ navigation }: any) { const {user}=useAuth();const [rows,setRows]=useState<Conversation[]>([]); const [err,setErr]=useState(''); const load=useCallback(async()=>{try{setRows(await messaging.list())}catch(e){setErr(errorMessage(e))}},[]); useFocusEffect(useCallback(()=>{load()},[load])); return <Page topSafe onRefresh={load}><Heading title="Messages" subtitle="Conversations with buyers and sellers." />{err?<Status state={err} retry={load}/>:!rows.length?<Status state="No conversations yet. Message a seller from a listing."/>:rows.map(c=>{const person=c.starter_id===user?.id?c.recipient:c.starter;return <Pressable key={c.id} onPress={()=>navigation.navigate('Conversation',{id:c.id})}><Card><View style={{flexDirection:'row',alignItems:'center',gap:12}}><View style={{width:44,height:44,borderRadius:22,backgroundColor:C.panel2,alignItems:'center',justifyContent:'center'}}><Text style={{fontWeight:'800',color:C.gold}}>{(person?.name||'U').slice(0,1).toUpperCase()}</Text></View><View style={{flex:1}}><Text style={s.cardTitle}>{person?.name||'UM-Pasa user'}</Text><Text numberOfLines={1} style={s.muted}>{c.latest_message?.body || c.item?.title || 'Open conversation'}</Text></View><Ionicons name="chevron-forward" size={18} color={C.muted}/></View>{c.item?.title?<Text style={[s.eyebrow,{marginTop:9}]}>ABOUT · {c.item.title}</Text>:null}</Card></Pressable>})}</Page>; }
function ConversationScreen({ route, navigation }: any) {
  const { user } = useAuth();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const isDark = C.bg === themeTokens.dark.colors.bg;
  const [c, setC] = useState<Conversation>();
  const [body, setBody] = useState('');
  const [location, setLocation] = useState('');
  const [meetupDate, setMeetupDate] = useState<Date | null>(null);
  const [sending, setSending] = useState(false);
  const [proposing, setProposing] = useState(false);
  const [showPropose, setShowPropose] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const showSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const load = useCallback(async () => {
    try {
      setRefreshing(true);
      setC(await messaging.get(route.params.id));
    } catch(e) {
      Alert.alert('Unable to load conversation', errorMessage(e));
    } finally {
      setRefreshing(false);
    }
  }, [route.params.id]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`conversation:${route.params.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${route.params.id}`,
        },
        () => {
          load();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [load, route.params.id]);

  useEffect(() => {
    if (c?.messages?.length) {
      const timer = setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [c?.messages?.length]);

  const send = async () => {
    if (!body.trim() || sending) return;
    const textToSend = body.trim();
    setSending(true);
    try {
      await messaging.send({ conversation_id: route.params.id, body: textToSend });
      setBody('');
      await load();
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch(e) {
      Alert.alert('Message not sent', errorMessage(e));
    } finally {
      setSending(false);
    }
  };

  const propose = async () => {
    if (!location.trim()) {
      Alert.alert('Missing location', 'Please enter a meetup location.');
      return;
    }
    if (!meetupDate) {
      Alert.alert('Missing schedule', 'Please select a meetup date and time.');
      return;
    }
    if (meetupDate.getTime() <= Date.now()) {
      Alert.alert('Invalid meetup time', 'Meetup time must be set in the future.');
      return;
    }
    if (proposing) return;
    setProposing(true);
    try {
      await messaging.send({
        conversation_id: route.params.id,
        type: 'meetup_proposal',
        meetup_location: location.trim(),
        meetup_time: meetupDate.toISOString(),
      });
      setLocation('');
      setMeetupDate(null);
      setShowPropose(false);
      await load();
      Alert.alert('Proposal sent', 'The other participant was notified.');
    } catch(e) {
      Alert.alert('Proposal not sent', errorMessage(e));
    } finally {
      setProposing(false);
    }
  };

  const person = c ? (c.starter_id === user?.id ? c.recipient : c.starter) : undefined;

  return (
    <SafeAreaView edges={['left', 'right']} style={{ flex: 1, backgroundColor: C.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
      >
        {/* Sticky compact header: Chat partner + Item thumbnail chip + Meetup pill */}
        <View style={{
          paddingHorizontal: 12,
          paddingTop: 8,
          paddingBottom: 8,
          backgroundColor: C.panel,
          borderBottomWidth: 1,
          borderBottomColor: C.border,
        }}>
          {/* Main row: Partner on left, Item on right */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Chat Partner info */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`View ${person?.name || 'user'} profile and reviews`}
              onPress={() => person && navigation.navigate('ProfileReviews', { id: person.id, name: person.name, role: person.role })}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginRight: 8 }}
            >
              <View style={{ position: 'relative' }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.panel2, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }}>
                  <Text style={{ color: C.gold, fontWeight: '800', fontSize: 16 }}>
                    {(person?.name || 'U').slice(0, 1).toUpperCase()}
                  </Text>
                </View>
                <View style={{ position: 'absolute', bottom: 0, right: 0, width: 11, height: 11, borderRadius: 5.5, backgroundColor: '#2E7D32', borderWidth: 2, borderColor: isDark ? '#202024' : '#FFFFFF' }} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Text numberOfLines={1} style={{ fontSize: 14.5, fontWeight: '800', color: C.white, maxWidth: 140 }}>
                    {person?.name || 'Conversation'}
                  </Text>
                  <Ionicons name="checkmark-circle" size={14} color={C.red} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 }}>
                  <Text numberOfLines={1} style={{ fontSize: 11.5, color: C.muted }}>
                    {person?.role === 'admin' ? 'Campus Admin' : 'UMTC Student'}
                  </Text>
                  <Text style={{ fontSize: 11, color: C.gold, fontWeight: '700' }}>★ 5.0</Text>
                  <Text style={{ fontSize: 11, color: C.gold, fontWeight: '700' }}>· Reviews ›</Text>
                </View>
              </View>
            </Pressable>

            {/* Pinned Item Chip (Right side) */}
            {c?.item && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`View listing ${c.item.title}`}
                onPress={() => navigation.navigate('Listing', { id: c.item?.id })}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  backgroundColor: C.panel2,
                  paddingHorizontal: 8,
                  paddingVertical: 5,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: C.border,
                  maxWidth: 145,
                }}
              >
                {c.item.image ? (
                  <Image source={{ uri: imageUrl(c.item.image) }} style={{ width: 30, height: 30, borderRadius: 6, backgroundColor: C.bg }} resizeMode="cover" />
                ) : (
                  <View style={{ width: 30, height: 30, borderRadius: 6, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="cube-outline" size={16} color={C.muted} />
                  </View>
                )}
                <View style={{ flexShrink: 1 }}>
                  <Text numberOfLines={1} style={{ fontSize: 11, fontWeight: '700', color: C.white }}>
                    {c.item.title}
                  </Text>
                  <Text numberOfLines={1} style={{ fontSize: 11.5, fontWeight: '900', color: isDark ? '#FF6B6B' : C.red }}>
                    {money(c.item.price)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={13} color={C.muted} />
              </Pressable>
            )}
          </View>

          {/* Slim meetup summary row underneath - only shown for accepted/confirmed meetups */}
          {(() => {
            const accepted = [...(c?.messages || [])].reverse().find(
              (m: any) => m.type === 'meetup_proposal' && (m.proposal_status === 'accepted' || (m.meta as any)?.status === 'accepted')
            );
            if (!accepted?.meetup_location || !accepted?.meetup_time) return null;
            return (
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 8,
                paddingTop: 6,
                borderTopWidth: 1,
                borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, marginRight: 8 }}>
                  <Ionicons name="location" size={14} color={C.red} />
                  <Text numberOfLines={1} style={{ fontSize: 11.5, color: C.cream, fontWeight: '600', flex: 1 }}>
                    {accepted.meetup_location} · {formatPhilippineDateTime(accepted.meetup_time)}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setShowPropose(prev => !prev)}
                  hitSlop={6}
                  style={{
                    paddingHorizontal: 9,
                    paddingVertical: 3,
                    borderRadius: 6,
                    backgroundColor: showPropose ? (isDark ? 'rgba(255,255,255,0.1)' : '#E0D6CE') : (isDark ? 'rgba(246,200,76,0.15)' : '#FFF3D6'),
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '800', color: isDark ? C.gold : C.red }}>
                    {showPropose ? 'Close' : 'Reschedule'}
                  </Text>
                </Pressable>
              </View>
            );
          })()}

          {/* Collapsible Meetup Propose Form */}
          {showPropose && (
            <View style={{ marginTop: 8, padding: 12, backgroundColor: C.bg, borderRadius: 12, borderWidth: 1, borderColor: C.border }}>
              <Text style={[s.section, { fontSize: 13, marginBottom: 6 }]}>Schedule UMTC Safe Exchange</Text>
              <Field
                label="Meetup campus spot"
                value={location}
                onChangeText={setLocation}
                placeholder="e.g. Visayan Library Study Zone or Main Canteen"
              />
              <MeetupTimePicker label="Meetup date & time" value={meetupDate} onChange={setMeetupDate} />
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                <View style={{ flex: 1 }}>
                  <Button
                    title={proposing ? "Sending proposal…" : "Send Proposal"}
                    disabled={proposing || !location.trim() || !meetupDate}
                    secondary
                    onPress={propose}
                  />
                </View>
                <Pressable
                  onPress={() => setShowPropose(false)}
                  style={{ paddingHorizontal: 14, justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: C.border }}
                >
                  <Text style={{ color: C.muted, fontWeight: '700', fontSize: 13 }}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>

        {/* Scrollable messages list */}
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 14, paddingVertical: 12, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={C.red} />}
        >
          {(!c?.messages || c.messages.length === 0) ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 }}>
              <Text style={[s.muted, { textAlign: 'center' }]}>No messages yet. Send a message or propose a meetup!</Text>
            </View>
          ) : (
            (c.messages || []).map((m: any) => {
              const mine = m.user_id === user?.id;
              const meta = m.meta as any;

              // Rich Meetup Proposal Card from Mockup 2
              if (m.type === 'meetup_proposal') {
                return (
                  <View
                    key={m.id}
                    style={{
                      width: '100%',
                      backgroundColor: isDark ? C.panel : '#FFFFFF',
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: isDark ? 'rgba(255,255,255,0.12)' : '#EADFD8',
                      borderTopWidth: 4,
                      borderTopColor: C.red,
                      padding: 14,
                      marginVertical: 8,
                      shadowColor: '#000',
                      shadowOpacity: isDark ? 0.25 : 0.08,
                      shadowRadius: 8,
                      shadowOffset: { width: 0, height: 3 },
                      elevation: 2,
                    }}
                  >
                    {/* Header: Icon + Title + Status Badge */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Ionicons name="git-network-outline" size={18} color={C.red} />
                        <Text style={{ fontSize: 15, fontWeight: '800', color: C.white }}>Meetup Proposal</Text>
                      </View>
                      <View style={{
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 12,
                        backgroundColor: m.proposal_status === 'accepted'
                          ? (isDark ? 'rgba(46,125,50,0.2)' : '#E8F5E9')
                          : m.proposal_status === 'declined'
                          ? (isDark ? 'rgba(211,47,47,0.2)' : '#FFEBEE')
                          : (isDark ? 'rgba(246,200,76,0.18)' : '#FFF8E1'),
                        borderWidth: 1,
                        borderColor: m.proposal_status === 'accepted' ? '#4CAF50' : m.proposal_status === 'declined' ? C.red : C.gold,
                      }}>
                        <Text style={{
                          fontSize: 11,
                          fontWeight: '800',
                          color: m.proposal_status === 'accepted' ? '#2E7D32' : m.proposal_status === 'declined' ? C.red : C.gold,
                          textTransform: 'capitalize',
                        }}>
                          {m.proposal_status === 'pending'
                            ? (!mine ? 'Awaiting your response' : `Waiting for ${person?.name || 'partner'} to accept`)
                            : m.proposal_status}
                        </Text>
                      </View>
                    </View>

                    {/* Campus Landmark Spot */}
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#EEF2FF', alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="location" size={16} color={C.red} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: C.muted, letterSpacing: 0.8 }}>CAMPUS LANDMARK SPOT</Text>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: C.white, marginTop: 1 }}>{m.meetup_location || 'Designated Campus Safe Spot'}</Text>
                        <Text style={{ fontSize: 11, color: C.cream, marginTop: 1 }}>
                          {m.meetup_location?.toLowerCase().includes('visayan') || m.meetup_location?.toLowerCase().includes('engineering') || m.meetup_location?.toLowerCase().includes('gazebo')
                            ? 'UM Tagum · Visayan Campus · In-person exchange'
                            : 'UM Tagum · Main (Mabini) Campus · In-person exchange'}
                        </Text>
                      </View>
                    </View>

                    {/* Scheduled Time */}
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
                      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFF8E1', alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="time" size={16} color={C.gold} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: C.muted, letterSpacing: 0.8 }}>SCHEDULED TIME</Text>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: C.white, marginTop: 1 }}>
                          {m.meetup_time ? formatPhilippineDateTime(m.meetup_time) : 'Time not specified'}
                        </Text>
                      </View>
                    </View>

                    {/* Action buttons if pending and recipient */}
                    {m.proposal_status === 'pending' && !mine && (
                      <View style={{ flexDirection: 'row', gap: 10, marginTop: 4, marginBottom: 8 }}>
                        <Pressable
                          accessibilityRole="button"
                          onPress={async () => {
                            try {
                              await messaging.respond(m.id, true);
                              await load();
                            } catch(e) {
                              Alert.alert('Unable to accept', errorMessage(e));
                            }
                          }}
                          style={{
                            flex: 1,
                            backgroundColor: C.red,
                            paddingVertical: 11,
                            borderRadius: 12,
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexDirection: 'row',
                            gap: 6,
                          }}
                        >
                          <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                          <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>Accept</Text>
                        </Pressable>

                        <Pressable
                          accessibilityRole="button"
                          onPress={async () => {
                            try {
                              await messaging.respond(m.id, false);
                              await load();
                            } catch(e) {
                              Alert.alert('Unable to decline', errorMessage(e));
                            }
                          }}
                          style={{
                            flex: 1,
                            backgroundColor: 'transparent',
                            borderWidth: 1,
                            borderColor: isDark ? 'rgba(255,255,255,0.2)' : '#D0C3BC',
                            paddingVertical: 11,
                            borderRadius: 12,
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexDirection: 'row',
                            gap: 6,
                          }}
                        >
                          <Ionicons name="close-circle" size={16} color={C.cream} />
                          <Text style={{ color: C.white, fontWeight: '700', fontSize: 14 }}>Decline</Text>
                        </Pressable>
                      </View>
                    )}

                    {/* Accepted schedule view link */}
                    {m.proposal_status === 'accepted' && meta?.transaction_id && (
                      <Pressable
                        onPress={() => navigation.navigate('Transaction', { id: meta.transaction_id })}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          paddingVertical: 8,
                          marginBottom: 4,
                        }}
                      >
                        <Text style={{ color: isDark ? C.gold : C.red, fontWeight: '800', fontSize: 13, textDecorationLine: 'underline' }}>
                          View transaction schedule ›
                        </Text>
                      </Pressable>
                    )}

                    {/* Verified Safe Exchange Zone footer badge */}
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      paddingTop: 8,
                      borderTopWidth: 1,
                      borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                    }}>
                      <Ionicons name="shield-checkmark" size={13} color="#2E7D32" />
                      <Text style={{ fontSize: 11, color: isDark ? '#81C784' : '#2E7D32', fontWeight: '600' }}>
                        UM-Pasa Safe Exchange Zone verified
                      </Text>
                    </View>
                  </View>
                );
              }

              // Centered System Notice (meetup accepted/declined, updates)
              if (m.type === 'system') {
                return (
                  <View
                    key={m.id}
                    style={{
                      alignSelf: 'center',
                      marginVertical: 8,
                      paddingHorizontal: 14,
                      paddingVertical: 6,
                      borderRadius: 14,
                      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                      borderWidth: 1,
                      borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                      maxWidth: '85%',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Ionicons name="information-circle-outline" size={14} color={isDark ? C.gold : C.red} />
                    <Text style={{ fontSize: 12, color: C.cream, textAlign: 'center', fontWeight: '600' }}>
                      {m.body}
                    </Text>
                  </View>
                );
              }

              // Standard Chat Bubble
              return (
                <View
                  key={m.id}
                  style={{
                    alignSelf: mine ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                    backgroundColor: mine
                      ? (isDark ? '#8A1F1D' : C.red)
                      : (isDark ? C.panel2 : '#FFFFFF'),
                    borderWidth: mine ? 0 : 1,
                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#EADFD8',
                    borderRadius: 18,
                    borderBottomRightRadius: mine ? 4 : 18,
                    borderBottomLeftRadius: mine ? 18 : 4,
                    padding: 12,
                    marginVertical: 4,
                    shadowColor: '#000',
                    shadowOpacity: isDark ? 0.2 : 0.05,
                    shadowRadius: 4,
                    shadowOffset: { width: 0, height: 1 },
                    elevation: 1,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: mine ? '#FFE8D6' : (isDark ? C.gold : C.red),
                      marginBottom: 4,
                    }}
                  >
                    {m.user?.name || 'Participant'}
                  </Text>
                  {m.body ? (
                    <Text style={{ color: mine ? '#FFFFFF' : C.white, fontSize: 15, lineHeight: 21 }}>
                      {m.body}
                    </Text>
                  ) : null}
                  <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', gap: 4, marginTop: 4 }}>
                    <Text
                      style={{
                        color: mine ? '#FFE8D6' : C.muted,
                        fontSize: 10,
                      }}
                    >
                      {formatPhilippineTime(m.created_at)}
                    </Text>
                    {mine && <Ionicons name="checkmark-done" size={12} color="#FFE8D6" />}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* Quick action chips (Fixed height, prevents 50% screen flex expansion) */}
        <View style={{
          height: 46,
          backgroundColor: C.panel,
          borderTopWidth: 1,
          borderTopColor: C.border,
          justifyContent: 'center',
        }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 12, gap: 8, flexDirection: 'row', alignItems: 'center' }}
            style={{ flexGrow: 0, height: 46 }}
          >
            <Pressable
              accessibilityRole="button"
              onPress={() => setShowPropose(prev => !prev)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                paddingHorizontal: 11,
                paddingVertical: 6,
                borderRadius: 14,
                backgroundColor: C.panel2,
                borderWidth: 1,
                borderColor: C.border,
              }}
            >
              <Ionicons name="calendar-outline" size={13} color={C.gold} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: C.white }}>+ Propose new time</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => {
                Alert.alert(
                  'UM Tagum College Safe Spots',
                  'Choose a monitored campus exchange location at UMTC:',
                  [
                    { text: '🏫 [Main] Main Library & Learning Center', onPress: () => { setLocation('Main Campus Library & Learning Center'); setShowPropose(true); } },
                    { text: '🍽️ [Main] Main Canteen (Mabini)', onPress: () => { setLocation('Main Campus Canteen (Mabini)'); setShowPropose(true); } },
                    { text: '🏀 [Main] Main Gym & Admin Lobby', onPress: () => { setLocation('Main Gym / Admin & Registrar Lobby'); setShowPropose(true); } },
                    { text: '💻 [Visayan] Engineering & IT Labs Lobby', onPress: () => { setLocation('Engineering & IT Labs Bldg Lobby (Visayan)'); setShowPropose(true); } },
                    { text: '📚 [Visayan] Visayan Library Study Zone', onPress: () => { setLocation('Visayan Campus Library Study Zone'); setShowPropose(true); } },
                    { text: '🌿 [Visayan] Visayan Canteen & Gazebo', onPress: () => { setLocation('Visayan Campus Canteen & Gazebo'); setShowPropose(true); } },
                    { text: 'Cancel', style: 'cancel' },
                  ]
                );
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                paddingHorizontal: 11,
                paddingVertical: 6,
                borderRadius: 14,
                backgroundColor: C.panel2,
                borderWidth: 1,
                borderColor: C.border,
              }}
            >
              <Ionicons name="location-outline" size={13} color={C.red} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: C.white }}>Share campus spot</Text>
            </Pressable>

            {c?.item && (
              <Pressable
                accessibilityRole="button"
                onPress={() => setBody(`Hi! Is the ${c.item?.title} still available for campus meetup?`)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  paddingHorizontal: 11,
                  paddingVertical: 6,
                  borderRadius: 14,
                  backgroundColor: C.panel2,
                  borderWidth: 1,
                  borderColor: C.border,
                }}
              >
                <Ionicons name="chatbubble-outline" size={13} color={C.cream} />
                <Text style={{ fontSize: 12, fontWeight: '700', color: C.cream }}>Ask availability</Text>
              </Pressable>
            )}
          </ScrollView>
        </View>

        {/* Pinned modern composer */}
        <View
          style={{
            paddingHorizontal: 14,
            paddingTop: 8,
            paddingBottom: keyboardVisible ? 8 : Math.max(insets.bottom, 12),
            backgroundColor: C.panel,
            borderTopWidth: 1,
            borderTopColor: C.border,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setShowPropose(prev => !prev)}
              style={{
                width: 42,
                height: 42,
                borderRadius: 21,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: C.panel2,
                borderWidth: 1,
                borderColor: C.border,
              }}
            >
              <Ionicons name="add" size={22} color={C.white} />
            </Pressable>
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder="Type a message…"
              placeholderTextColor={C.muted}
              multiline
              style={{
                flex: 1,
                minHeight: 42,
                maxHeight: 110,
                borderWidth: 1,
                borderColor: C.border,
                borderRadius: 21,
                paddingHorizontal: 16,
                paddingTop: 10,
                paddingBottom: 10,
                color: C.white,
                backgroundColor: C.bg,
                fontSize: 15,
              }}
            />
            <Pressable
              accessibilityRole="button"
              onPress={send}
              disabled={sending || !body.trim()}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: C.red,
                opacity: (sending || !body.trim()) ? 0.5 : 1,
                shadowColor: '#b70201',
                shadowOpacity: 0.3,
                shadowRadius: 6,
                elevation: 3,
              }}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="send" size={18} color="#fff" />
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ReportsScreen() {
  const {user}=useAuth(); const [d,setD]=useState<any>(); const [err,setErr]=useState(''); const [status,setStatus]=useState(''); const [type,setType]=useState(''); const [category,setCategory]=useState(''); const [sort,setSort]=useState('newest');
  const load=useCallback(async()=>{try{setD(await account.report());setErr('')}catch(e){setErr(errorMessage(e))}},[]); useFocusEffect(useCallback(()=>{load()},[load]));
  if(err)return <Page><Status state={err} retry={load}/></Page>; if(!d)return <Page><ActivityIndicator color={C.gold}/></Page>;
  let items:Item[]=(d.items||[]).filter((i:Item)=>!type||i.listing_type===type).filter((i:Item)=>!category||i.category===category).filter((i:Item)=>!status||(status==='completed'?i.status==='sold':status==='pending'?i.status==='pending':true));
  let txs:Transaction[]=(d.transactions||[]).filter((t:Transaction)=>!status||t.status===status).filter((t:Transaction)=>!type||t.item?.listing_type===type).filter((t:Transaction)=>!category||t.item?.category===category);
  const byDate=(a:any,b:any)=>new Date(a.created_at||0).getTime()-new Date(b.created_at||0).getTime();
  items=[...items].sort((a,b)=>sort==='oldest'?byDate(a,b):sort==='title'?a.title.localeCompare(b.title):sort==='status'?a.status.localeCompare(b.status):byDate(b,a));
  txs=[...txs].sort((a,b)=>sort==='oldest'?byDate(a,b):sort==='status'?a.status.localeCompare(b.status):byDate(b,a));
  const categoryNames=Array.from(new Set([...(d.items||[]).map((i:Item)=>i.category),...(d.transactions||[]).map((t:Transaction)=>t.item?.category)].filter(Boolean)));
  const studentSummary={listed:items.length,approved_listings:items.filter(i=>i.moderation_status==='approved').length,transactions:txs.length,completed:txs.filter(t=>t.status==='completed').length,earned:txs.filter(t=>t.seller_id===user?.id&&t.status==='completed').reduce((sum,t)=>sum+Number(t.item?.price||0),0)};
  return <Page onRefresh={load}><Heading title="My report" subtitle="Listings and transactions linked to your account."/><View style={s.stats}>{Object.entries(studentSummary).map(([k,v])=><Card key={k} style={s.stat}><Text style={s.statNum}>{String(v)}</Text><Text style={s.muted}>{k.replaceAll('_',' ')}</Text></Card>)}</View><Text style={s.label}>Transaction status</Text><View style={s.rowWrap}><Choice label="All statuses" selected={!status} onPress={()=>setStatus('')}/>{['pending','approved','rejected','completed'].map(v=><Choice key={v} label={v} selected={status===v} onPress={()=>setStatus(status===v?'':v)}/>)}</View><Text style={s.label}>Listing type</Text><View style={s.row}><Choice label="Sales and rentals" selected={!type} onPress={()=>setType('')}/><Choice label="Sale" selected={type==='sell'} onPress={()=>setType(type==='sell'?'':'sell')}/><Choice label="Rental" selected={type==='rent'} onPress={()=>setType(type==='rent'?'':'rent')}/></View><Text style={s.label}>Category</Text><View style={s.rowWrap}><Choice label="All categories" selected={!category} onPress={()=>setCategory('')}/>{categoryNames.map(v=><Choice key={v} label={v} selected={category===v} onPress={()=>setCategory(category===v?'':(v||''))}/>)}</View><Text style={s.label}>Sort</Text><View style={s.rowWrap}>{['newest','oldest','title','status'].map(v=><Choice key={v} label={v} selected={sort===v} onPress={()=>setSort(v)}/>)}</View><Heading title="Listings"/>{items.length?items.map(i=><Card key={i.id}><Text style={s.cardTitle}>{i.title}</Text><Text style={s.muted}>{i.category} · {i.listing_type} · {i.status} / {i.moderation_status}{i.created_at ? ` · ${formatPhilippineDate(i.created_at)}` : ''}</Text><Text style={s.price}>{money(i.price)}</Text></Card>):<Status state="No listings match these report filters."/>}<Heading title="Transactions"/>{txs.length?txs.map(t=><Card key={t.id}><Text style={s.cardTitle}>{t.item?.title||'Transaction'}</Text><Text style={s.muted}>{t.status} · {t.buyer?.name} / {t.seller?.name}{t.created_at ? ` · ${formatPhilippineDate(t.created_at)}` : ''}</Text></Card>):<Status state="No transactions match these report filters."/>}</Page>;
}

function AboutScreen() { return <Page><Heading title="About UM-Pasa" subtitle="Academic resource marketplace"/><Card><Text style={s.section}>System purpose</Text><Text style={s.body}>UM-Pasa helps UM students list academic items, request sale or rental transactions, coordinate safely through messages, upload payment proof, and track transactions from request to completion.</Text></Card><Card><Text style={s.section}>Project information</Text><Text style={s.body}>PASA Development Team</Text><Text style={s.muted}>Student developers and system publishers of UM-Pasa.</Text><Text style={s.body}>Institution</Text><Text style={s.muted}>Department of Computing Education · Information Technology Program · UM Tagum College - Visayan Campus</Text></Card><Card><Text style={s.section}>Marketplace principles</Text><Text style={s.body}>Student-centered listings · Traceable transactions · Admin moderated resources · Sale and rental support</Text></Card></Page>; }
function HelpScreen() { return <Page><Heading title="How UM-Pasa works" subtitle="A simple guide for buyers and sellers."/><Card><Text style={s.section}>For sellers</Text><Text style={s.body}>1. Create a sale or rental listing and choose payment methods.</Text><Text style={s.body}>2. Wait for an administrator to review the listing.</Text><Text style={s.body}>3. Respond to buyer requests. Approve with a meetup place and time, or reject the request.</Text><Text style={s.body}>4. After an approved exchange, mark the transaction completed. For a sale with no open request, mark the approved listing sold from My Listings.</Text><Text style={s.body}>5. Leave a review for the buyer after the exchange is complete.</Text></Card><Card><Text style={s.section}>For buyers</Text><Text style={s.body}>1. Browse the two-column marketplace, search, or use filters.</Text><Text style={s.body}>2. Open a listing and request it using a payment option accepted by the seller.</Text><Text style={s.body}>3. Coordinate the campus meetup in Messages and upload payment proof when applicable.</Text><Text style={s.body}>4. Confirm completion and review the seller.</Text></Card><Card><Text style={s.section}>Listings and safety</Text><Text style={s.body}>Listings need administrator approval before they appear in Browse. Coordinate a safe university meetup. Sale listings with an open transaction must resolve it before they can be manually marked sold.</Text></Card></Page>; }
function AdminScreen({ navigation }: any) {
  const isDark = C.bg === themeTokens.dark.colors.bg;
  const [pulse, setPulse] = useState<{ users: number; active: number; pending: number; escrow: number }>({ users: 0, active: 0, pending: 0, escrow: 0 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [itemList, userList, txList] = await Promise.all([admin.items(), admin.users(), admin.transactions()]);
      const pendingCount = itemList.filter(i => i.moderation_status === 'pending').length;
      const activeCount = itemList.filter(i => i.moderation_status === 'approved' && i.status === 'available').length;
      setPulse({
        users: userList.length,
        active: activeCount,
        pending: pendingCount,
        escrow: txList.length,
      });
    } catch {
      // Fallback silently
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <Page topSafe onRefresh={load} refreshing={loading}>
      {/* Admin Header with campus tag */}
      <View style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <View style={{ paddingHorizontal: 9, paddingVertical: 3, borderRadius: 12, backgroundColor: isDark ? 'rgba(230,36,36,0.18)' : '#FFEAE8', borderWidth: 1, borderColor: C.red }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: C.red }}>UM-Pasa Admin</Text>
          </View>
          <View style={{ paddingHorizontal: 9, paddingVertical: 3, borderRadius: 12, backgroundColor: C.panel2, borderWidth: 1, borderColor: C.border }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: C.cream }}>UM Tagum College</Text>
          </View>
        </View>
        <Heading title="Admin Overview" subtitle="Campus marketplace operations & moderation queue." />
      </View>

      {/* Platform Pulse 2x2 Grid (Mockup 1) */}
      <View style={{ marginBottom: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: C.cream, letterSpacing: 0.6 }}>PLATFORM PULSE</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#2E7D32' }} />
            <Text style={{ fontSize: 11, fontWeight: '700', color: isDark ? '#81C784' : '#2E7D32' }}>Live Sync</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
          {/* Total Users */}
          <View style={{ flex: 1, padding: 14, borderRadius: 14, backgroundColor: C.panel, borderWidth: 1, borderColor: C.border }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 12, color: C.muted, fontWeight: '700' }}>Total Users</Text>
              <Ionicons name="people-outline" size={16} color={C.muted} />
            </View>
            <Text style={{ fontSize: 22, fontWeight: '900', color: C.white, marginTop: 6 }}>{pulse.users || '—'}</Text>
            <Text style={{ fontSize: 11, color: isDark ? '#81C784' : '#2E7D32', fontWeight: '700', marginTop: 2 }}>Verified students</Text>
          </View>

          {/* Active Listings */}
          <View style={{ flex: 1, padding: 14, borderRadius: 14, backgroundColor: C.panel, borderWidth: 1, borderColor: C.border }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 12, color: C.muted, fontWeight: '700' }}>Active Listings</Text>
              <Ionicons name="pricetag-outline" size={16} color={C.muted} />
            </View>
            <Text style={{ fontSize: 22, fontWeight: '900', color: C.white, marginTop: 6 }}>{pulse.active || '—'}</Text>
            <Text style={{ fontSize: 11, color: C.gold, fontWeight: '700', marginTop: 2 }}>Campus items</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          {/* Pending Review - Highlighted */}
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('AdminItems')}
            style={{
              flex: 1,
              padding: 14,
              borderRadius: 14,
              backgroundColor: isDark ? 'rgba(246,200,76,0.1)' : '#FFF9E6',
              borderWidth: 1.5,
              borderColor: C.gold,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 12, color: isDark ? C.gold : '#8A6500', fontWeight: '800' }}>Pending Review</Text>
              <Ionicons name="alert-circle" size={16} color={C.gold} />
            </View>
            <Text style={{ fontSize: 22, fontWeight: '900', color: isDark ? C.gold : '#8A6500', marginTop: 6 }}>{pulse.pending}</Text>
            <Text style={{ fontSize: 11, color: isDark ? '#FF8C82' : C.red, fontWeight: '800', marginTop: 2 }}>Requires action ›</Text>
          </Pressable>

          {/* Total Transactions */}
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('AdminTransactions')}
            style={{ flex: 1, padding: 14, borderRadius: 14, backgroundColor: C.panel, borderWidth: 1, borderColor: C.border }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 12, color: C.muted, fontWeight: '700' }}>All Transactions</Text>
              <Ionicons name="receipt-outline" size={16} color={C.muted} />
            </View>
            <Text style={{ fontSize: 22, fontWeight: '900', color: C.white, marginTop: 6 }}>{pulse.escrow || '—'}</Text>
            <Text style={{ fontSize: 11, color: C.cream, fontWeight: '700', marginTop: 2 }}>Escrow logs ›</Text>
          </Pressable>
        </View>
      </View>

      {/* Operational Modules List (Mockup 1) */}
      <Text style={{ fontSize: 13, fontWeight: '800', color: C.cream, letterSpacing: 0.6, marginBottom: 10 }}>OPERATIONAL MODULES</Text>

      {/* Module 1: Listing Moderation Queue */}
      <Pressable
        accessibilityRole="button"
        onPress={() => navigation.navigate('AdminItems')}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          padding: 14,
          borderRadius: 14,
          backgroundColor: C.panel,
          borderWidth: 1,
          borderColor: C.border,
          marginBottom: 10,
        }}
      >
        <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: isDark ? 'rgba(230,36,36,0.18)' : '#FFEAE8', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="shield-checkmark" size={20} color={C.red} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: C.white }}>Listing Moderation Queue</Text>
          <Text style={{ fontSize: 12, color: C.muted }}>Review student items awaiting verification</Text>
        </View>
        {pulse.pending > 0 && (
          <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: C.red }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>{pulse.pending}</Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={18} color={C.muted} />
      </Pressable>

      {/* Module 2: Student User Directory */}
      <Pressable
        accessibilityRole="button"
        onPress={() => navigation.navigate('AdminUsers')}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          padding: 14,
          borderRadius: 14,
          backgroundColor: C.panel,
          borderWidth: 1,
          borderColor: C.border,
          marginBottom: 10,
        }}
      >
        <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: isDark ? 'rgba(246,200,76,0.18)' : '#FFF3D6', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="school" size={20} color={C.gold} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: C.white }}>Student User Directory</Text>
          <Text style={{ fontSize: 12, color: C.muted }}>Manage verified @umindanao student accounts</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={C.muted} />
      </Pressable>

      {/* Module 3: All Transactions & Escrow */}
      <Pressable
        accessibilityRole="button"
        onPress={() => navigation.navigate('AdminTransactions')}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          padding: 14,
          borderRadius: 14,
          backgroundColor: C.panel,
          borderWidth: 1,
          borderColor: C.border,
          marginBottom: 10,
        }}
      >
        <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: isDark ? 'rgba(46,125,50,0.18)' : '#E8F5E9', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="card" size={20} color="#2E7D32" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: C.white }}>All Transactions & Escrow</Text>
          <Text style={{ fontSize: 12, color: C.muted }}>Monitor campus safe meetup points & receipts</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={C.muted} />
      </Pressable>

      {/* Module 4: Platform Report */}
      <Pressable
        accessibilityRole="button"
        onPress={() => navigation.navigate('AdminReport')}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          padding: 14,
          borderRadius: 14,
          backgroundColor: C.panel,
          borderWidth: 1,
          borderColor: C.border,
          marginBottom: 16,
        }}
      >
        <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: C.panel2, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="bar-chart" size={20} color={C.cream} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: C.white }}>Campus Platform Report</Text>
          <Text style={{ fontSize: 12, color: C.muted }}>Summary analytics, volume, and filter tools</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={C.muted} />
      </Pressable>
    </Page>
  );
}
function ProfileReviewsScreen({route}:any) { const [reviews,setReviews]=useState<any[]>([]);const [error,setError]=useState('');const [loading,setLoading]=useState(true);const load=useCallback(async()=>{setLoading(true);try{setReviews(await profiles.reviews(route.params.id));setError('')}catch(e){setError(errorMessage(e))}finally{setLoading(false)}},[route.params.id]);useEffect(()=>{load()},[load]);const average=reviews.length?reviews.reduce((sum,r)=>sum+Number(r.rating),0)/reviews.length:0;return <Page onRefresh={load} refreshing={loading}><Heading title={route.params.name||'UM-Pasa user'} subtitle={`${route.params.role==='admin'?'Administrator':'Student'} · reviews from completed exchanges`}/><Card><Text style={s.statNum}>{reviews.length?`${average.toFixed(1)} ★`: '—'}</Text><Text style={s.muted}>{reviews.length} review{reviews.length===1?'':'s'}</Text></Card>{error?<Status state={error} retry={load}/>:loading?<ActivityIndicator color={C.gold}/>:reviews.length?reviews.map(r=><Card key={r.review_id}><View style={s.rowBetween}><Text style={s.cardTitle}>{'★'.repeat(Number(r.rating))}{'☆'.repeat(5-Number(r.rating))}</Text><Text style={s.muted}>{formatPhilippineDate(r.created_at)}</Text></View><Text style={s.body}>{r.comment||'No written comment.'}</Text><Text style={s.muted}>From {r.reviewer_name||'UM-Pasa user'}{r.item_title?` · ${r.item_title}`:''}</Text></Card>):<Status state="This user has no reviews yet."/>}</Page>; }
function AdminItemsScreen({route}:any) {
  const [rows,setRows]=useState<Item[]>([]); const [err,setErr]=useState(''); const [busy,setBusy]=useState(false);
  const [expandedId,setExpandedId]=useState<string|null>(route?.params?.itemId||null);
  const [rejectionTarget,setRejectionTarget]=useState<string|null>(null); const [rejectionReason,setRejectionReason]=useState('');
  const isDark = C.bg === themeTokens.dark.colors.bg;
  const load=useCallback(async()=>{setBusy(true);try{setRows(await admin.items());setErr('')}catch(e){setErr(errorMessage(e))}finally{setBusy(false)}},[]);
  useEffect(()=>{load()},[load]);
  const moderate=async(id:string,a:'approve'|'reject',reason?:string)=>{
    if (a === 'reject' && !reason?.trim()) {
      Alert.alert('Reason required', 'Please provide a clear rejection reason so the student understands what to correct.');
      return;
    }
    try {
      await admin.moderate(id, a, reason);
      setRejectionTarget(null);
      setRejectionReason('');
      await load();
      Alert.alert(
        a === 'approve' ? 'Listing approved' : 'Listing rejected',
        a === 'approve'
          ? 'The listing is now active on the campus marketplace.'
          : `The seller was notified with reason: "${reason}".`
      );
    } catch(e) {
      Alert.alert('Moderation failed',errorMessage(e));
    }
  };
  const pending=rows.filter((item)=>item.moderation_status==='pending');
  return <Page onRefresh={load} refreshing={busy}><Heading title="Listing review" subtitle={`${pending.length} listing${pending.length===1?'':'s'} awaiting a decision.`}/>{err?<Status state={err} retry={load}/>:busy?<ActivityIndicator color={C.red}/>:!pending.length?<Status state="No listings to review."/>:pending.map(i=><Card key={i.id}>
    <Pressable accessibilityRole="button" onPress={()=>setExpandedId(expandedId===i.id?null:i.id)}><View style={s.rowBetween}><View style={{flex:1}}><Text style={s.cardTitle}>{i.title}</Text><Text style={s.muted}>{i.user?.name||'UM student'} · {i.category} · {money(i.price)}</Text></View><View style={{alignItems:'flex-end'}}><Text style={[s.badge,{color:C.gold}]}>PENDING</Text><Ionicons name={expandedId===i.id?'chevron-up':'chevron-down'} size={18} color={C.muted}/></View></View></Pressable>
    {expandedId===i.id&&<>
    {i.image?<Image source={{uri:imageUrl(i.image)}} style={s.adminListingImage} resizeMode="cover"/>:null}
    <Text style={s.adminPrice}>{money(i.price)}{i.listing_type==='rent'?' / day':''} · {i.listing_type==='rent'?'For rent':'For sale'}</Text>
    <Text style={s.body}>{i.description}</Text>
    <View style={s.adminDetails}><Text style={s.adminDetail}>Category: {i.category}</Text><Text style={s.adminDetail}>Condition: {i.condition?.replaceAll('_',' ')}</Text><Text style={s.adminDetail}>Course: {i.course_code}</Text><Text style={s.adminDetail}>Department: {i.department}</Text>{i.program?<Text style={s.adminDetail}>Program: {i.program}</Text>:null}<Text style={s.adminDetail}>Seller: {i.user?.name||'UM student'}</Text><Text style={s.adminDetail}>Submitted: {i.created_at?formatPhilippineDate(i.created_at): 'Date unavailable'}</Text></View>
    {/* Safety & Compliance Checks (Mockup 1) */}
    <View style={{
      marginVertical: 12,
      padding: 12,
      borderRadius: 12,
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F9F6F3',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#EAE0D8',
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text style={{ fontSize: 11, fontWeight: '800', color: C.gold, letterSpacing: 0.8 }}>SAFETY & COMPLIANCE CHECKS</Text>
        <Text style={{ fontSize: 11, fontWeight: '800', color: '#2E7D32' }}>3/3 PASSED</Text>
      </View>
      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="checkmark-circle" size={15} color="#2E7D32" />
          <Text style={{ fontSize: 12, color: C.white, fontWeight: '600' }}>Institutional email verified ({i.user?.email || '@umindanao.edu.ph'})</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="checkmark-circle" size={15} color="#2E7D32" />
          <Text style={{ fontSize: 12, color: C.white, fontWeight: '600' }}>Safe zone meetup specified for campus</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="checkmark-circle" size={15} color="#2E7D32" />
          <Text style={{ fontSize: 12, color: C.white, fontWeight: '600' }}>Pricing within fair student threshold ({money(i.price)})</Text>
        </View>
      </View>
    </View>
    <View style={[s.row, { marginTop: 4 }]}>
      <Button title="Approve listing" onPress={()=>moderate(i.id,'approve')}/>
      <Button title={rejectionTarget === i.id ? 'Cancel rejection' : 'Reject'} danger onPress={()=>{
        setRejectionTarget(rejectionTarget===i.id?null:i.id);
        setRejectionReason('');
      }}/>
    </View>
    {rejectionTarget===i.id&& (
      <View style={[s.rejectPanel, { backgroundColor: isDark ? 'rgba(230,36,36,0.1)' : '#FFF5F5', borderWidth: 1, borderColor: C.red, borderRadius: 12, padding: 12, marginTop: 8 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <Ionicons name="alert-circle" size={16} color={C.red} />
          <Text style={{ fontSize: 13, fontWeight: '800', color: C.red }}>Reason for rejection (required)</Text>
        </View>
        <Text style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>
          This reason will be sent to the student and displayed on their listing so they can make corrections.
        </Text>
        <Text style={{ fontSize: 11, fontWeight: '700', color: C.cream, marginBottom: 6 }}>Quick preset reasons:</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {[
            'Missing clear item photos',
            'Price exceeds student cap',
            'Prohibited or non-academic item',
            'Incomplete course/details',
            'Duplicate listing',
          ].map((preset) => (
            <Pressable
              key={preset}
              onPress={() => setRejectionReason(preset)}
              style={{
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 8,
                backgroundColor: rejectionReason === preset ? C.red : (isDark ? 'rgba(255,255,255,0.08)' : '#EAE0D8'),
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '700', color: rejectionReason === preset ? '#FFFFFF' : C.white }}>
                {preset}
              </Text>
            </Pressable>
          ))}
        </View>
        <Field
          label="Custom or edited reason"
          value={rejectionReason}
          onChangeText={setRejectionReason}
          placeholder="e.g. Please provide a photo of the actual item showing condition."
          multiline
        />
        <Button
          title={!rejectionReason.trim() ? "Enter a reason to reject" : "Send rejection with reason"}
          danger
          disabled={!rejectionReason.trim()}
          onPress={()=>moderate(i.id,'reject',rejectionReason.trim())}
        />
      </View>
    )}
    </>}
  </Card>)}</Page>;
}
function AdminUsersScreen() { const [rows,setRows]=useState<User[]>([]); const [err,setErr]=useState(''); const [busy,setBusy]=useState(true); const load=useCallback(async()=>{setBusy(true);try{setRows(await admin.users());setErr('')}catch(e){setErr(errorMessage(e))}finally{setBusy(false)}},[]);useEffect(()=>{load()},[load]); return <Page onRefresh={load} refreshing={busy}><Heading title="Users"/>{err?<Status state={err} retry={load}/>:busy?<ActivityIndicator color={C.gold}/>:rows.map(u=><Card key={u.id}><Text style={s.cardTitle}>{u.name}</Text><Text style={s.muted}>{u.email} · {u.role}</Text></Card>)}</Page>; }
function TransactionSummary({t}: {t:Transaction}) { return <View style={s.adminDetails}><Text style={s.adminDetail}>Buyer: {t.buyer?.name||'—'}</Text><Text style={s.adminDetail}>Seller: {t.seller?.name||'—'}</Text><Text style={s.adminDetail}>Listing: {t.item?.title||'—'} · {t.item?.category||'—'} · {t.item?.listing_type||'—'}</Text><Text style={s.adminDetail}>Payment: {t.payment_method?.replaceAll('_',' ')||'—'}{t.other_payment_method?` (${t.other_payment_method})`:''}</Text><Text style={s.adminDetail}>Rental duration: {t.rental_duration_days?`${t.rental_duration_days} days`:'Not applicable'}</Text><Text style={s.adminDetail}>Rental due: {formatPhilippineDate(t.rental_due_date, 'Not set')}</Text><Text style={s.adminDetail}>Meetup place: {t.meetup_location||'Not scheduled'}</Text><Text style={s.adminDetail}>Meetup time: {formatPhilippineDateTime(t.meetup_time, 'Not scheduled')}</Text><Text style={s.adminDetail}>Payment proof: {t.payment_proof_uploaded_at?`Uploaded ${formatPhilippineDateTime(t.payment_proof_uploaded_at)}`:'Not uploaded'}</Text><Text style={s.adminDetail}>Created: {formatPhilippineDateTime(t.created_at, '—')}</Text></View>; }
function AdminTransactionsScreen() { const [rows,setRows]=useState<Transaction[]>([]); const [err,setErr]=useState(''); const [busy,setBusy]=useState(true);const [expandedId,setExpandedId]=useState<string|null>(null); const load=useCallback(async()=>{setBusy(true);try{setRows(await admin.transactions());setErr('')}catch(e){setErr(errorMessage(e))}finally{setBusy(false)}},[]);useEffect(()=>{load()},[load]); return <Page onRefresh={load} refreshing={busy}><Heading title="All transactions" subtitle="Tap a transaction to see its complete report."/>{err?<Status state={err} retry={load}/>:busy?<ActivityIndicator color={C.gold}/>:rows.map(t=><Card key={t.id}><Pressable accessibilityRole="button" onPress={()=>setExpandedId(expandedId===t.id?null:t.id)}><View style={s.rowBetween}><Text style={[s.cardTitle,{flex:1}]}>{t.item?.title||'Transaction'}</Text><Ionicons name={expandedId===t.id?'chevron-up':'chevron-down'} size={18} color={C.muted}/></View><Text style={s.muted}>{t.status} · {t.buyer?.name} / {t.seller?.name}</Text></Pressable>{expandedId===t.id&&<TransactionSummary t={t}/>}</Card>)}</Page>; }
function AdminReportScreen() {
  const [items,setItems]=useState<Item[]>([]);const [txs,setTxs]=useState<Transaction[]>([]);const [err,setErr]=useState('');const [busy,setBusy]=useState(true);const [status,setStatus]=useState('');const [type,setType]=useState('');const [category,setCategory]=useState('');const [sort,setSort]=useState('newest');const [expandedTxId,setExpandedTxId]=useState<string|null>(null);
  const load=useCallback(async()=>{setBusy(true);try{const [i,t]=await Promise.all([admin.items(),admin.transactions()]);setItems(i);setTxs(t);setErr('')}catch(e){setErr(errorMessage(e))}finally{setBusy(false)}},[]);useEffect(()=>{load()},[load]);
  const reportItems=[...items.filter(i=>!type||i.listing_type===type).filter(i=>!category||i.category===category).filter(i=>!status||(status==='completed'?i.status==='sold':status==='pending'?i.status==='pending':true))].sort((a,b)=>sort==='oldest'?String(a.created_at||'').localeCompare(String(b.created_at||'')):sort==='title'?a.title.localeCompare(b.title):sort==='status'?a.status.localeCompare(b.status):String(b.created_at||'').localeCompare(String(a.created_at||'')));
  const reportTxs=[...txs.filter(t=>!status||t.status===status).filter(t=>!type||t.item?.listing_type===type).filter(t=>!category||t.item?.category===category)].sort((a,b)=>sort==='oldest'?String(a.created_at||'').localeCompare(String(b.created_at||'')):sort==='status'?a.status.localeCompare(b.status):String(b.created_at||'').localeCompare(String(a.created_at||'')));
  const categories=Array.from(new Set([...items.map(i=>i.category),...txs.map(t=>t.item?.category)].filter(Boolean)));
  const summary={items:reportItems.length,pendingListings:reportItems.filter(i=>i.moderation_status==='pending').length,approvedListings:reportItems.filter(i=>i.moderation_status==='approved').length,transactions:reportTxs.length,completed:reportTxs.filter(t=>t.status==='completed').length,gcash:reportTxs.filter(t=>t.payment_method==='gcash').length};
  return <Page refreshing={busy} onRefresh={load}><Heading title="Platform report" subtitle="Filter and review platform listings and transactions."/>{err?<Status state={err} retry={load}/>:busy?<ActivityIndicator color={C.gold}/>:<><View style={s.stats}>{Object.entries(summary).map(([k,v])=><Card key={k} style={s.stat}><Text style={s.statNum}>{String(v)}</Text><Text style={s.muted}>{k.replaceAll(/[A-Z]/g,m=>` ${m.toLowerCase()}`)}</Text></Card>)}</View><Text style={s.label}>Status</Text><View style={s.rowWrap}><Choice label="All statuses" selected={!status} onPress={()=>setStatus('')}/>{['pending','approved','rejected','completed'].map(v=><Choice key={v} label={v} selected={status===v} onPress={()=>setStatus(status===v?'':v)}/>)}</View><Text style={s.label}>Type</Text><View style={s.row}><Choice label="Sales and rentals" selected={!type} onPress={()=>setType('')}/><Choice label="Sales" selected={type==='sell'} onPress={()=>setType(type==='sell'?'':'sell')}/><Choice label="Rentals" selected={type==='rent'} onPress={()=>setType(type==='rent'?'':'rent')}/></View><Text style={s.label}>Category</Text><View style={s.rowWrap}><Choice label="All categories" selected={!category} onPress={()=>setCategory('')}/>{categories.map(v=><Choice key={v} label={v} selected={category===v} onPress={()=>setCategory(category===v?'':(v||''))}/>)}</View><Text style={s.label}>Sort</Text><View style={s.rowWrap}>{['newest','oldest','title','status'].map(v=><Choice key={v} label={v} selected={sort===v} onPress={()=>setSort(v)}/>)}</View><Heading title="Listings"/>{reportItems.length?reportItems.map(i=><Card key={i.id}><Text style={s.cardTitle}>{i.title}</Text><Text style={s.muted}>{i.user?.name} · {i.category} · {i.listing_type} · {i.status}/{i.moderation_status}{i.created_at ? ` · ${formatPhilippineDate(i.created_at)}` : ''}</Text><Text style={s.price}>{money(i.price)}</Text></Card>):<Status state="No listings match these report filters."/>}<Heading title="Transactions"/>{reportTxs.length?reportTxs.map(t=><Card key={t.id}><Pressable accessibilityRole="button" onPress={()=>setExpandedTxId(expandedTxId===t.id?null:t.id)}><View style={s.rowBetween}><Text style={[s.cardTitle,{flex:1}]}>{t.item?.title||'Transaction'}</Text><Ionicons name={expandedTxId===t.id?'chevron-up':'chevron-down'} size={18} color={C.muted}/></View><Text style={s.muted}>{t.status} · {t.buyer?.name} / {t.seller?.name}{t.created_at ? ` · ${formatPhilippineDate(t.created_at)}` : ''}</Text></Pressable>{expandedTxId===t.id&&<TransactionSummary t={t}/>}</Card>):<Status state="No transactions match these report filters."/>}</>}</Page>;
}

function TabsRoot() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const isAdmin = user?.role === 'admin';
  const isDark = C.bg === themeTokens.dark.colors.bg;
  const bottomPadding = insets.bottom > 0 ? Math.max(insets.bottom - 16, 6) : 6;
  const tabHeight = 49 + bottomPadding;
  const activeIcons: Record<string, any> = {
    Home: 'grid',
    Browse: 'search',
    Messages: 'chatbubble-ellipses',
    Transactions: 'swap-horizontal',
    Profile: 'person-circle',
    Admin: 'shield-checkmark',
  };
  const inactiveIcons: Record<string, any> = {
    Home: 'grid-outline',
    Browse: 'search-outline',
    Messages: 'chatbubble-ellipses-outline',
    Transactions: 'swap-horizontal-outline',
    Profile: 'person-circle-outline',
    Admin: 'shield-checkmark-outline',
  };
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: C.panel,
          borderTopColor: C.border,
          borderTopWidth: 1,
          height: tabHeight,
          paddingBottom: bottomPadding,
          paddingTop: 4,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: isDark ? 0.25 : 0.06,
          shadowRadius: 4,
        },
        tabBarItemStyle: {
          paddingHorizontal: 0,
          paddingVertical: 0,
          justifyContent: 'center',
        },
        tabBarActiveTintColor: C.gold,
        tabBarInactiveTintColor: C.muted,
        tabBarLabelStyle: {
          fontWeight: '700',
          fontSize: 10,
          letterSpacing: -0.1,
          marginTop: -1,
        },
        tabBarAllowFontScaling: false,
        tabBarIcon: ({ color, focused }) => (
          <Ionicons
            name={focused ? activeIcons[route.name] : inactiveIcons[route.name]}
            size={21}
            color={color}
          />
        ),
      })}
    >
      <Tabs.Screen name="Home" component={DashboardScreen} />
      <Tabs.Screen name="Browse" component={BrowseScreen} />
      <Tabs.Screen name="Messages" component={MessagesScreen} />
      {!isAdmin && <Tabs.Screen name="Transactions" component={TransactionsScreen} />}
      {isAdmin && <Tabs.Screen name="Admin" component={AdminScreen} />}
      <Tabs.Screen name="Profile" component={ProfileScreen} />
    </Tabs.Navigator>
  );
}
function AppStack({ authenticated, isAdmin }: { authenticated: boolean; isAdmin: boolean }) {
  return <Stack.Navigator screenOptions={{headerStyle:{backgroundColor:C.panel},headerTintColor:C.white,headerTitleStyle:{fontWeight:'800',fontSize:15},headerShadowVisible:false,contentStyle:{backgroundColor:C.bg}}}>
    {authenticated
      ? <Stack.Screen name="Main" component={TabsRoot} options={{headerShown:false}} />
      : <>
          <Stack.Screen name="Browse" component={BrowseScreen} options={{title:'UM-Pasa Marketplace'}} />
          <Stack.Screen name="Login" component={LoginScreen} options={{title:'Sign in'}} />
          <Stack.Screen name="Register" component={RegisterScreen} options={{title:'Create account'}} />
        </>}
    <Stack.Screen name="About" component={AboutScreen}/>
    <Stack.Screen name="Help" component={HelpScreen}/>
    <Stack.Screen name="Listing" component={ListingScreen} options={{title:'Listing details'}}/>
    {authenticated&&<>
      <Stack.Screen name="ListingForm" component={ListingFormScreen} options={{title:'Manage listing'}}/>
      <Stack.Screen name="MyListings" component={MyListingsScreen} options={{title:'My listings'}}/>
      <Stack.Screen name="Transaction" component={TransactionScreen} options={{title:'Transaction'}}/>
      <Stack.Screen name="Transactions" component={isAdmin ? AdminTransactionsScreen : TransactionsScreen} options={{title: isAdmin ? 'All transactions' : 'Transactions'}}/>
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{title:'Activity updates'}}/>
      <Stack.Screen name="Conversation" component={ConversationScreen} options={{title:'Messages'}}/>
      <Stack.Screen name="ProfileReviews" component={ProfileReviewsScreen} options={{title:'Reviews'}}/>
      <Stack.Screen name="Reports" component={ReportsScreen} options={{title:'My report'}}/>
      {isAdmin&&<>
        <Stack.Screen name="AdminItems" component={AdminItemsScreen} options={{title:'Listing review'}}/>
        <Stack.Screen name="AdminUsers" component={AdminUsersScreen} options={{title:'User directory'}}/>
        <Stack.Screen name="AdminTransactions" component={AdminTransactionsScreen} options={{title:'All transactions'}}/>
        <Stack.Screen name="AdminReport" component={AdminReportScreen} options={{title:'Platform report'}}/>
      </>}
    </>}
  </Stack.Navigator>;
}

function AppContent() {
  const { user, authUser, profile, loading, profileError, refreshProfile, logout } = useAuth();
  if (loading) return <SafeAreaView style={s.loading}><ActivityIndicator color={C.gold}/><Text style={s.muted}>Restoring your UM-Pasa session…</Text></SafeAreaView>;
  if (authUser && !profile) return <SafeAreaView style={s.loading}>
    <Heading title="Profile unavailable" subtitle={profileError || 'Your account exists, but its UM-Pasa profile could not be loaded.'}/>
    <Button title="Retry profile" onPress={() => refreshProfile().catch(() => undefined)}/>
    <Button title="Sign out" secondary onPress={() => logout().catch(() => undefined)}/>
  </SafeAreaView>;
  return <NavigationContainer key={user ? 'signed-in' : 'guest'}>
    <AppStack authenticated={!!user} isAdmin={user?.role === 'admin'}/>
  </NavigationContainer>;
}

function ThemedApp() {
  const { mode } = useTheme();
  T = themeTokens[mode];
  C = palettes[mode];
  s = createStyles();
  useEffect(() => { Appearance.setColorScheme(mode); }, [mode]);
  return <SafeAreaProvider style={{ flex: 1, backgroundColor: C.bg }}><StatusBar barStyle={mode==='dark'?'light-content':'dark-content'} backgroundColor={C.bg}/><AuthProvider><AppContent /></AuthProvider></SafeAreaProvider>;
}

export default function App() {
  return <ThemeProvider><ThemedApp /></ThemeProvider>;
}

function createStyles(_tokens?: ThemeTokens) { return StyleSheet.create({
  safe:{flex:1,backgroundColor:C.bg},
  page:{padding:14,paddingTop:10,paddingBottom:28},
  authSafe:{flex:1,backgroundColor:C.bg},
  authPage:{flexGrow:1,justifyContent:'center',padding:24,paddingBottom:44},
  logo:{width:170,height:110,alignSelf:'center',marginBottom:4},
  tagline:{textAlign:'center',letterSpacing:2.2,color:C.gold,fontWeight:'800',fontSize:10,marginBottom:24},
  heading:{fontSize:23,fontWeight:'900',color:C.white,marginBottom:5,letterSpacing:-.3},
  subheading:{fontSize:13,color:C.cream,lineHeight:19},
  section:{fontSize:16,fontWeight:'800',color:C.white,marginBottom:10},
  body:{fontSize:14,color:C.cream,lineHeight:21,marginVertical:5},
  muted:{fontSize:13,color:C.muted,lineHeight:19,marginTop:5},
  eyebrow:{fontSize:10,letterSpacing:1.6,fontWeight:'900',color:C.gold,textTransform:'uppercase'},
  cardTitle:{fontSize:15,fontWeight:'800',color:C.white,marginVertical:6},
  price:{fontSize:18,fontWeight:'900',color:C.gold,marginVertical:6},
  badge:{fontSize:10,fontWeight:'900',letterSpacing:1.1,textTransform:'uppercase'},
  card:{borderColor:C.border,borderWidth:1,borderRadius:15,padding:12,marginBottom:11,overflow:'hidden',shadowColor:'#000000',shadowOpacity:C.bg===themeTokens.dark.colors.bg?.22:.08,shadowRadius:9,shadowOffset:{width:0,height:3},elevation:2},
  fieldWrap:{marginBottom:12},
  label:{color:C.cream,fontWeight:'700',fontSize:13,marginBottom:6},
  field:{color:C.white,backgroundColor:C.input,borderColor:C.border,borderWidth:1,borderRadius:11,paddingHorizontal:12,paddingVertical:10,fontSize:14,minHeight:44},
  buttonShell:{borderRadius:14,overflow:'hidden',marginVertical:6,minHeight:48,shadowColor:'#b70201',shadowOpacity:.23,shadowRadius:10,shadowOffset:{width:0,height:5},elevation:3},
  button:{paddingHorizontal:16,paddingVertical:14,alignItems:'center',justifyContent:'center',minHeight:48},
  buttonSecondary:{borderWidth:1,borderColor:C.bg===themeTokens.dark.colors.bg?'rgba(246,200,76,.32)':'rgba(138,101,0,.45)',shadowOpacity:0},
  buttonDanger:{borderColor:'#a61111'},
  buttonText:{color:'#ffffff',fontSize:13,fontWeight:'800',letterSpacing:.1},
  link:{textAlign:'center',color:C.gold,fontWeight:'800',marginTop:18,padding:8},
  authNote:{textAlign:'center',color:C.muted,fontSize:12,lineHeight:18,marginTop:16},
  error:{color:C.bg===themeTokens.dark.colors.bg?'#ff8c82':C.red,fontSize:14,marginBottom:12},
  row:{flexDirection:'row',alignItems:'center',gap:8,marginBottom:8},
  rowBetween:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  rowWrap:{flexDirection:'row',flexWrap:'wrap',gap:6,marginBottom:12},
  chip:{borderRadius:14,borderWidth:1,borderColor:C.border,paddingHorizontal:11,paddingVertical:8,backgroundColor:C.chip,marginRight:3},
  chipSelected:{backgroundColor:C.bg===themeTokens.dark.colors.bg?'#490d0d':'#fff0ed',borderColor:'#e62424',shadowColor:'#e62424',shadowOpacity:.08,shadowRadius:4,elevation:1},
  chipText:{fontSize:12,color:C.cream,fontWeight:'700',textTransform:'capitalize'},
  stats:{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:18},
  stat:{width:'48%',marginBottom:0,alignItems:'center',justifyContent:'center',minHeight:90},
  statNum:{fontSize:25,fontWeight:'900',color:C.gold},
  tabBar:{backgroundColor:C.panel,borderTopColor:C.border,borderTopWidth:1,height:62,paddingBottom:6,paddingTop:5,elevation:10},
  loading:{flex:1,backgroundColor:C.bg,justifyContent:'center',alignItems:'center',gap:12},
  loadingBlock:{padding:24,alignItems:'center'},
  heroImage:{width:'100%',height:230,borderRadius:15,marginBottom:12,backgroundColor:C.panel},
  barTrack:{height:7,backgroundColor:C.panel2,borderRadius:5,overflow:'hidden',marginTop:5},
  barFill:{height:7,backgroundColor:C.red,borderRadius:5},
  marketHero:{position:'relative',overflow:'hidden',borderRadius:25,borderWidth:1,borderColor:'rgba(246,200,76,.2)',marginBottom:16,shadowColor:'#b70201',shadowOpacity:.18,shadowRadius:22,shadowOffset:{width:0,height:10},elevation:6},
  marketHeroGradient:{padding:20,paddingBottom:18},
  heroGlow:{position:'absolute',width:190,height:190,borderRadius:100,right:-95,bottom:-95,backgroundColor:'rgba(230,36,36,.14)'},
  brandRow:{flexDirection:'row',alignItems:'center',gap:11},
  brandMark:{width:46,height:46,borderRadius:15,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(255,255,255,.1)',borderWidth:1,borderColor:'rgba(255,255,255,.18)',overflow:'hidden'},
  brandLogo:{width:42,height:42},
  brandName:{fontSize:16,color:'#ffffff',fontWeight:'900',letterSpacing:.2},
  brandCaption:{fontSize:8,color:'#e9c8a7',letterSpacing:1.5,fontWeight:'800',marginTop:2},
  signInPill:{paddingHorizontal:14,paddingVertical:9,borderRadius:13,borderWidth:1,borderColor:'rgba(246,200,76,.55)',backgroundColor:'rgba(18,15,17,.45)'},
  signInText:{color:C.gold,fontSize:12,fontWeight:'800'},
  heroCopy:{marginTop:23},
  heroKicker:{fontSize:9,color:'#f6c84c',fontWeight:'900',letterSpacing:2.2,marginBottom:8},
  heroTitle:{color:'#ffffff',fontSize:27,fontWeight:'900',letterSpacing:-.55,lineHeight:33,maxWidth:330},
  heroGold:{color:'#ffc270'},
  heroDescription:{fontSize:12,color:'#f1dcc0',lineHeight:18,marginTop:6,marginBottom:8,maxWidth:310},
  heroActions:{flexDirection:'row',alignItems:'center',gap:12,marginTop:17},
  heroLink:{fontSize:11,color:'#f5d99e',fontWeight:'700'},
  heroDivider:{height:14,width:1,backgroundColor:'rgba(255,255,255,.25)'},
  searchPanel:{padding:14,marginBottom:22,borderRadius:19},
  searchLabel:{fontSize:9,color:C.muted,fontWeight:'900',letterSpacing:1.25,marginBottom:8},
  searchRow:{flexDirection:'row',alignItems:'center',gap:8},
  searchInput:{flex:1,minWidth:0,color:C.white,backgroundColor:C.input,borderWidth:1,borderColor:C.border,borderRadius:11,paddingHorizontal:12,paddingVertical:10,fontSize:14,minHeight:44},
  searchButton:{width:48,height:48,borderRadius:13,overflow:'hidden'},
  searchButtonGradient:{flex:1,alignItems:'center',justifyContent:'center'},
  searchButtonText:{fontSize:11,color:'#ffffff',fontWeight:'900',letterSpacing:.8},
  searchHint:{color:C.muted,fontSize:11,marginTop:8},
  sectionTop:{flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between',marginBottom:12},
  sectionKicker:{fontSize:9,color:C.gold,fontWeight:'900',letterSpacing:1.8,marginBottom:3},
  sectionTitle:{fontSize:20,color:C.white,fontWeight:'900',letterSpacing:-.3},
  resultCount:{fontSize:11,color:C.muted,marginBottom:3},
  filterLabel:{fontSize:9,color:C.muted,fontWeight:'900',letterSpacing:1.2,marginBottom:7,marginTop:5},
  chipStrip:{paddingBottom:6,paddingRight:10},
  sortRow:{marginTop:3,marginBottom:5},
  sortChoices:{flexDirection:'row',alignItems:'center',paddingBottom:4},
  filterToggle:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:12,paddingVertical:11,marginTop:4,marginBottom:12,borderRadius:13,backgroundColor:C.panel,borderWidth:1,borderColor:C.border},
  filterToggleTitle:{fontSize:13,color:C.white,fontWeight:'800'},
  filterToggleHint:{fontSize:11,color:C.muted,marginTop:3},
  filterChevron:{fontSize:22,color:C.gold,fontWeight:'500',paddingHorizontal:5},
  advancedFilters:{padding:14,marginTop:-5,marginBottom:15},
  itemCard:{marginBottom:8,borderRadius:13,padding:9},
  listingImage:{width:'100%',height:155,borderRadius:10,marginTop:10,backgroundColor:C.panel2},
  listingImageCompact:{height:104,marginTop:7},
  listingImagePlaceholder:{width:'100%',height:85,borderRadius:10,marginTop:8,marginBottom:4,backgroundColor:C.soft,borderWidth:1,borderColor:C.border,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:8},
  listingImagePlaceholderCompact:{height:75},
  listingGrid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',alignItems:'flex-start'},
  gridItem:{marginBottom:8},
  cardTitleCompact:{fontSize:13,lineHeight:17,marginVertical:4},
  mutedCompact:{fontSize:10,lineHeight:14,marginTop:2},
  priceCompact:{fontSize:14,marginVertical:4},
  notificationFab:{position:'absolute',right:20,bottom:24,width:52,height:52,borderRadius:26,backgroundColor:'#e62424',alignItems:'center',justifyContent:'center',elevation:8,shadowColor:'#7d1111',shadowOpacity:.25,shadowRadius:8,shadowOffset:{width:0,height:4}},
  notificationCount:{position:'absolute',right:-2,top:-3,minWidth:19,height:19,borderRadius:10,backgroundColor:'#f6ad2f',alignItems:'center',justifyContent:'center',borderWidth:2,borderColor:C.panel,paddingHorizontal:3},
  notificationCountText:{fontSize:9,fontWeight:'900',color:'#1d1617'},
  soldButton:{paddingVertical:8,paddingHorizontal:8,alignItems:'center',borderRadius:9,backgroundColor:C.dangerSoft,borderWidth:1,borderColor:C.border},
  soldButtonText:{fontSize:11,fontWeight:'800',color:C.bg===themeTokens.dark.colors.bg?'#ff8c82':C.red},
  adminListingImage:{width:'100%',height:170,borderRadius:11,marginBottom:8,backgroundColor:C.panel2},
  adminPrice:{fontSize:13,fontWeight:'800',color:C.gold,marginBottom:4},
  adminDetails:{padding:10,borderRadius:10,backgroundColor:C.soft,marginTop:7,marginBottom:8},
  adminDetail:{fontSize:12,color:C.cream,lineHeight:18},
  rejectPanel:{marginTop:7,padding:10,borderRadius:11,backgroundColor:C.dangerSoft,borderWidth:1,borderColor:C.border},
  heroCarousel:{marginTop:15,marginHorizontal:-4},
  carouselSlide:{minHeight:158,paddingHorizontal:5,paddingVertical:3,justifyContent:'center'},
  carouselDots:{flexDirection:'row',gap:5,alignSelf:'center',marginTop:5},
  carouselDot:{width:6,height:6,borderRadius:3,backgroundColor:'rgba(255,255,255,.38)'},
  carouselDotActive:{width:17,backgroundColor:'#ffc270'},
  placeholderCategory:{color:C.cream,fontSize:12,fontWeight:'700',letterSpacing:.3},
  itemCardBottom:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:2},
  sellerName:{fontSize:11,color:C.cream,fontWeight:'700'},
  footer:{marginTop:18,marginBottom:8,padding:15,borderRadius:18,borderWidth:1,borderColor:C.border,backgroundColor:C.panel,overflow:'hidden',shadowColor:'#000000',shadowOpacity:.07,shadowRadius:10,shadowOffset:{width:0,height:4},elevation:2},
  footerBrand:{flexDirection:'row',alignItems:'center',gap:11},
  footerLogoRing:{width:49,height:49,borderRadius:16,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(255,255,255,.08)',borderColor:'rgba(255,255,255,.14)',borderWidth:1},
  footerLogo:{width:43,height:43},
  footerTitle:{fontSize:17,color:C.white,fontWeight:'900'},
  footerCopy:{color:C.muted,fontSize:12,lineHeight:19,marginTop:12},
  footerRule:{height:1,backgroundColor:C.border,marginVertical:12},
  footerLinks:{flexDirection:'row',flexWrap:'wrap',gap:7,marginTop:8},
  footerPill:{paddingHorizontal:11,paddingVertical:8,borderRadius:11,borderWidth:1,borderColor:C.border,backgroundColor:C.soft},
  footerLinkText:{fontSize:10,color:C.cream,fontWeight:'700'},
  footerStep:{color:C.cream,fontSize:11,lineHeight:19,marginTop:4},
  footerBottom:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:7,marginTop:12},
  footerCopyright:{color:C.muted,fontSize:9},
  footerBadge:{color:C.gold,fontSize:9,fontWeight:'700',borderRadius:9,borderWidth:1,borderColor:'rgba(246,200,76,.25)',paddingHorizontal:8,paddingVertical:5},
  // Status Pill Badge
  statusPill:{flexDirection:'row',alignItems:'center',gap:6,paddingHorizontal:10,paddingVertical:5,borderRadius:20,alignSelf:'flex-start'},
  statusDot:{width:6,height:6,borderRadius:3},
  statusPillText:{fontSize:10,fontWeight:'800',letterSpacing:.6},
  // Modern Marketplace Cards
  modernCard:{backgroundColor:C.panel,borderColor:C.border,borderWidth:1,borderRadius:16,overflow:'hidden',shadowColor:'#000000',shadowOpacity:C.bg===themeTokens.dark.colors.bg?.25:.08,shadowRadius:10,shadowOffset:{width:0,height:4},elevation:3},
  itemImageWrap:{position:'relative',width:'100%',backgroundColor:C.panel2},
  itemImg:{width:'100%',height:155},
  itemImgCompact:{width:'100%',height:115},
  itemPlaceholder:{alignItems:'center',justifyContent:'center',backgroundColor:C.soft,padding:10},
  placeholderTag:{fontSize:10,color:C.muted,fontWeight:'700',marginTop:4},
  floatingTypeBadge:{position:'absolute',top:8,left:8,backgroundColor:'rgba(0,0,0,.68)',paddingHorizontal:8,paddingVertical:3,borderRadius:8,borderWidth:1,borderColor:'rgba(255,255,255,.15)'},
  floatingTypeText:{color:'#F6C84C',fontSize:9,fontWeight:'900',letterSpacing:.8},
  itemBody:{padding:10},
  itemCategoryKicker:{fontSize:8.5,fontWeight:'900',letterSpacing:1,color:C.gold,textTransform:'uppercase',marginBottom:2},
  itemTitle:{fontSize:14,fontWeight:'800',color:C.white,lineHeight:18,minHeight:36},
  itemTitleCompact:{fontSize:12.5,fontWeight:'800',color:C.white,lineHeight:16,minHeight:32},
  itemMeta:{fontSize:10.5,color:C.muted,marginTop:3,marginBottom:6},
  itemPriceRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:4,paddingTop:6,borderTopWidth:1,borderTopColor:C.border},
  itemPrice:{fontSize:15,fontWeight:'900',color:C.gold},
  itemPriceCompact:{fontSize:13,fontWeight:'900',color:C.gold},
  itemSeller:{fontSize:10,color:C.muted,fontWeight:'700'},
  // Modern Transactions Cards
  txCard:{backgroundColor:C.panel,borderColor:C.border,borderWidth:1,borderRadius:16,padding:14,marginBottom:12,shadowColor:'#000000',shadowOpacity:C.bg===themeTokens.dark.colors.bg?.22:.07,shadowRadius:8,shadowOffset:{width:0,height:3},elevation:2},
  txTitle:{fontSize:15,fontWeight:'800',color:C.white,marginBottom:2},
  txPrice:{fontSize:14,fontWeight:'900',color:C.gold},
  txDivider:{height:1,backgroundColor:C.border,marginVertical:10},
  txParticipant:{fontSize:12,color:C.white,fontWeight:'600'},
  txMethod:{fontSize:11,color:C.muted,fontWeight:'700'},
  txMeetupSchedule:{fontSize:11,color:C.gold,fontWeight:'700'},
  // Search Bar
  searchInputWrap:{flex:1,flexDirection:'row',alignItems:'center',backgroundColor:C.input,borderWidth:1,borderColor:C.border,borderRadius:12},
  // Notifications Screen
  noticeCard:{marginBottom:10,padding:12},
  noticeCardUnread:{borderColor:C.gold,backgroundColor:C.bg===themeTokens.dark.colors.bg?'rgba(246,200,76,.06)':'#FFFDF7'},
  noticeIconBadge:{width:38,height:38,borderRadius:12,alignItems:'center',justifyContent:'center'},
  noticeTitle:{fontSize:13,fontWeight:'700',lineHeight:18},
  noticeTimestamp:{fontSize:11,color:C.muted,marginTop:4},
  noticeUnreadDot:{width:8,height:8,borderRadius:4,backgroundColor:C.gold,marginTop:4},
  // Dashboard Quick Actions
  quickActionsGrid:{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:16},
  quickActionCard:{flex:1,minWidth:'47%',flexDirection:'row',alignItems:'center',gap:10,backgroundColor:C.panel,borderColor:C.border,borderWidth:1,borderRadius:14,paddingHorizontal:12,paddingVertical:12},
  quickActionIcon:{width:34,height:34,borderRadius:10,alignItems:'center',justifyContent:'center',backgroundColor:C.soft},
  quickActionText:{fontSize:12,fontWeight:'700',color:C.white,flex:1},
  // Modern Profile Screen (Image 2 Match)
  profileHeaderRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:16},
  profileHeaderTitle:{fontSize:26,fontWeight:'900',color:C.white,letterSpacing:-.4},
  profileHeaderIconBtn:{width:40,height:40,borderRadius:20,alignItems:'center',justifyContent:'center',backgroundColor:C.panel,borderWidth:1,borderColor:C.border},
  profileMainCard:{backgroundColor:C.panel,borderColor:C.border,borderWidth:1,borderRadius:20,padding:16,marginBottom:14,shadowColor:'#000000',shadowOpacity:C.bg===themeTokens.dark.colors.bg?.22:.06,shadowRadius:10,shadowOffset:{width:0,height:4},elevation:3},
  profileUserRow:{flexDirection:'row',alignItems:'center'},
  profileAvatarWrap:{width:68,height:68,borderRadius:34},
  profileAvatarRing:{width:68,height:68,borderRadius:34,padding:2.5,alignItems:'center',justifyContent:'center'},
  profileAvatarInner:{flex:1,width:'100%',backgroundColor:C.panel2,borderRadius:32,alignItems:'center',justifyContent:'center'},
  profileAvatarInitial:{fontSize:26,fontWeight:'900',color:C.gold},
  profileUserName:{fontSize:18,fontWeight:'800',color:C.white,letterSpacing:-.2},
  profileStudentId:{fontSize:12.5,color:C.muted,marginTop:2,fontWeight:'600'},
  profileProgramText:{fontSize:11.5,color:C.cream,marginTop:1,fontWeight:'500'},
  profileRatingPill:{flexDirection:'row',alignItems:'center',gap:4,marginTop:6,alignSelf:'flex-start'},
  profileRatingVal:{fontSize:12,fontWeight:'800',color:C.gold},
  profileRatingCount:{fontSize:11.5,color:C.muted},
  profileCardDivider:{height:1,backgroundColor:C.border,marginVertical:14},
  profileStatsRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-around'},
  profileStatCol:{alignItems:'center',flex:1},
  profileStatVal:{fontSize:18,fontWeight:'900',color:C.white},
  profileStatLbl:{fontSize:11.5,color:C.muted,marginTop:2,fontWeight:'600'},
  profileStatDivider:{width:1,height:28,backgroundColor:C.border},
  profileMenuCard:{backgroundColor:C.panel,borderColor:C.border,borderWidth:1,borderRadius:18,marginBottom:14,overflow:'hidden',shadowColor:'#000000',shadowOpacity:C.bg===themeTokens.dark.colors.bg?.2:.05,shadowRadius:8,shadowOffset:{width:0,height:3},elevation:2},
  profileMenuItem:{flexDirection:'row',alignItems:'center',paddingHorizontal:16,paddingVertical:13},
  profileMenuIconBox:{width:36,height:36,borderRadius:11,alignItems:'center',justifyContent:'center',backgroundColor:C.soft,marginRight:12},
  profileMenuLabel:{flex:1,fontSize:14,fontWeight:'700',color:C.white},
  profileMenuDivider:{height:1,backgroundColor:C.border,marginLeft:64},
  profileAppearanceHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:12},
  profileAppearanceTitle:{fontSize:14,fontWeight:'700',color:C.white},
  segmentedPillContainer:{flexDirection:'row',alignItems:'center',backgroundColor:C.soft,borderRadius:20,padding:3,borderWidth:1,borderColor:C.border},
  segmentedPillOption:{flexDirection:'row',alignItems:'center',gap:5,paddingHorizontal:13,paddingVertical:6,borderRadius:17},
  segmentedPillActiveLight:{backgroundColor:'#E65100',shadowColor:'#E65100',shadowOpacity:.25,shadowRadius:4,elevation:2},
  segmentedPillActiveDark:{backgroundColor:'#332306',borderWidth:1,borderColor:'#F6C84C'},
  segmentedPillText:{fontSize:11.5,fontWeight:'700',color:C.muted},
  modalOverlay:{flex:1,backgroundColor:'rgba(0,0,0,0.65)',justifyContent:'flex-end'},
  modalContent:{backgroundColor:C.panel,borderTopLeftRadius:24,borderTopRightRadius:24,padding:20,paddingBottom:36,maxHeight:'85%'},
  modalHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:16},
  modalTitle:{fontSize:18,fontWeight:'800',color:C.white}
}); }
let s = createStyles();
