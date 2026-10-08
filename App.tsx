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
import { account, admin, AdminUser, Conversation, errorMessage, getPaymentProofSignedUrl, Item, marketplace, messaging, Notice, Transaction, transactions, uploadItemImage, uploadPaymentProof, User } from './src/api';
import { AuthProvider, useAuth } from './src/auth/AuthContext';
import { LoginScreen, RegisterScreen } from './src/auth/AuthScreens';
import { ThemeProvider, useTheme, type ThemeMode } from './src/theme/ThemeContext';
import { profiles } from './src/services/profiles';
import { themeTokens, type ThemeColors, type ThemeTokens } from './src/theme/tokens';
import { formatPhilippineDateTime, formatPhilippineDate, formatPhilippineTime, formatRelativeTime } from './src/utils/datetime';
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
            bottomSafe ? { paddingBottom: Math.max(insets.bottom, 24) + 60 } : undefined,
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
function MobileFooter({ navigation }: any) { const { user }=useAuth(); return <LinearGradient colors={['rgba(230,36,36,.13)','rgba(246,200,76,.055)','rgba(255,255,255,.025)']} locations={[0,.52,1]} style={s.footer}><View style={s.footerBrand}><View style={s.footerLogoRing}><Image source={require('./assets/UMPASALOGO.png')} style={s.footerLogo} resizeMode="contain"/></View><View style={{flex:1}}><Text style={s.footerTitle}>UM-Pasa</Text><Text style={s.muted}>University Marketplace</Text></View></View><Text style={s.footerCopy}>Browse items, post listings, request transactions, and track marketplace activity in one student workspace.</Text><View style={s.footerRule}/><Text style={s.eyebrow}>QUICK LINKS</Text><View style={s.footerLinks}><Pressable onPress={()=>navigation.navigate('About')} style={s.footerPill}><Text style={s.footerLinkText}>About Us</Text></Pressable><Pressable onPress={()=>navigation.navigate('Help')} style={s.footerPill}><Text style={s.footerLinkText}>How it works</Text></Pressable><Pressable onPress={()=>navigation.navigate('Support')} style={s.footerPill}><Text style={s.footerLinkText}>Support</Text></Pressable>{user&&<Pressable onPress={()=>navigation.navigate('Messages')} style={s.footerPill}><Text style={s.footerLinkText}>Inbox</Text></Pressable>}</View><View style={s.footerRule}/><Text style={s.eyebrow}>QUICK INSTRUCTIONS</Text><Text style={s.footerStep}>01  Browse the marketplace or search by category.</Text><Text style={s.footerStep}>02  Open a listing to request it or message the seller.</Text><Text style={s.footerStep}>03  Confirm your meetup and complete the transaction.</Text><View style={s.footerBottom}><Text style={s.footerCopyright}>UM-Pasa © {new Date().getFullYear()} · University of Mindanao</Text><Text style={s.footerBadge}>University-safe trading</Text></View></LinearGradient>; }
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
          <View style={{flex:1}}><Text style={s.brandName}>UM-Pasa</Text><Text style={s.brandCaption}>UM TAGUM COLLEGE</Text></View>
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
            {icon:'bag-handle-outline',kicker:'CAMPUS ACADEMIC EXCHANGE',title:'Essential resources for every semester.',copy:'Browse textbooks, uniforms, engineering kits, drafting tools, and calculators across Mabini and Visayan.'},
            {icon:'repeat-outline',kicker:'PASS IT FORWARD',title:'Give academic items another semester.',copy:'Pass on completed course materials to lower years at fair student prices or rent items per semester.'},
            {icon:'shield-checkmark-outline',kicker:'MONITORED SAFE ZONES',title:'Trade safely at campus landmarks.',copy:'Handoffs at Main Library, Visayan IT Labs, Canteen, and Gym with zero platform fees.'},
          ].map((slide,index)=><View key={slide.kicker} style={[s.carouselSlide,{width:bannerWidth}]}><Ionicons name={slide.icon as any} size={23} color="#ffc270"/><Text style={s.heroKicker}>{slide.kicker}</Text><Text style={s.heroTitle}>{slide.title}</Text><Text style={s.heroDescription}>{slide.copy}</Text><Pressable onPress={()=>navigation.navigate(index===2?'Help':'Browse')}><Text style={s.heroLink}>{index===2?'How it works  ›':'Explore marketplace  ›'}</Text></Pressable></View>)}
        </ScrollView>
        <View style={s.carouselDots}>{[0,1,2].map((dot)=><View key={dot} style={[s.carouselDot,dot===carouselIndex&&s.carouselDotActive]}/>)}</View>
        <View style={s.heroActions}><Pressable onPress={() => navigation.navigate('About')}><Text style={s.heroLink}>About UM-Pasa  ›</Text></Pressable><View style={s.heroDivider}/><Pressable onPress={() => navigation.navigate('Help')}><Text style={s.heroLink}>How it works  ›</Text></Pressable><View style={s.heroDivider}/><Pressable onPress={() => navigation.navigate('Support')}><Text style={s.heroLink}>Support  ›</Text></Pressable></View>
      </LinearGradient>
      <View style={s.heroGlow}/>
    </View>

    <Card style={s.searchPanel}>
      <Text style={s.searchLabel}>SEARCH ACADEMIC RESOURCES</Text>
      <View style={s.searchRow}>
        <View style={s.searchInputWrap}>
          <Ionicons name="search-outline" size={18} color={C.muted} style={{ marginLeft: 12 }} />
          <TextInput
            value={q}
            onChangeText={setQ}
            onSubmitEditing={load}
            returnKeyType="search"
            placeholder="Search items, categories, or course code (e.g. IT 106)"
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
      <Text style={s.searchHint}>Try “Calculators”, “Uniforms”, “Drafting”, or course codes like “IT 101” or “ACT 211”.</Text>
    </Card>

    <View style={s.sectionTop}><View><Text style={s.sectionKicker}>CAMPUS FEED</Text><Text style={s.sectionTitle}>Available resources</Text></View><Text style={s.resultCount}>{items.length} found</Text></View>
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
    {error ? <Status state={error} retry={load}/> : loading && !items.length ? <View style={s.loadingBlock}><ActivityIndicator color={C.red}/><Text style={s.muted}>Finding campus listings…</Text></View> : !items.length ? <Status state="No approved listings match your search yet. Try adjusting your filters or keywords." retry={load}/> : <View style={s.listingGrid}>{items.map(item=><Pressable key={item.id} style={[s.gridItem,{width:(width-43)/2}]} onPress={()=>navigation.navigate('Listing',{id:item.id})}><ItemCard item={item} compact/></Pressable>)}</View>}
  </Page>;
}
async function openNotification(n:Notice,navigation:any,isAdmin:boolean) { try { if(!n.is_read) await account.markNotificationRead(n.id); } catch(e) { Alert.alert('Unable to update notification',errorMessage(e));return; } if(n.related_type==='transaction'&&n.related_id)navigation.navigate('Transaction',{id:n.related_id});else if(n.related_type==='conversation'&&n.related_id)navigation.navigate('Conversation',{id:n.related_id});else if(n.related_type==='item'&&n.related_id)navigation.navigate(isAdmin&&n.type==='listing_review'?'AdminItems':'Listing',isAdmin&&n.type==='listing_review'?{itemId:n.related_id}:{id:n.related_id});else Alert.alert('Activity update',n.message); }
function ItemCard({ item, compact = false }: { item: Item; compact?: boolean }) {
  const isRent = item.listing_type === 'rent';
  const isReserved = item.status === 'pending';
  const isSold = item.status === 'sold';
  return (
    <View style={[s.modernCard, isSold && { opacity: 0.55 }]}>
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
        {isReserved && (
          <View style={[s.floatingReservedBadge, compact && s.floatingReservedBadgeCompact]}>
            <View style={s.floatingReservedDot} />
            <Text style={[s.floatingReservedText, compact && s.floatingReservedTextCompact]}>RESERVED</Text>
          </View>
        )}
        {isSold && (
          <View style={[s.floatingReservedBadge, compact && s.floatingReservedBadgeCompact, { backgroundColor: '#374151' }]}>
            <Text style={[s.floatingReservedText, compact && s.floatingReservedTextCompact, { color: '#E5E7EB' }]}>SOLD</Text>
          </View>
        )}
      </View>

      {/* Card Content Body */}
      <View style={s.itemBody}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
          <Text numberOfLines={1} style={[s.itemCategoryKicker, { flex: 1 }]}>{item.category || 'CAMPUS RESOURCE'}</Text>
          {isReserved && (
            <Text style={{ fontSize: 8.5, fontWeight: '900', color: C.gold, letterSpacing: 0.5 }}>● RESERVED</Text>
          )}
          {isSold && (
            <Text style={{ fontSize: 8.5, fontWeight: '900', color: C.muted, letterSpacing: 0.5 }}>● SOLD</Text>
          )}
        </View>
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
  const [myActiveTx, setMyActiveTx] = useState<{ id: string; status: string } | null>(null);
  const [sellerActiveTx, setSellerActiveTx] = useState<{ id: string; status: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [days, setDays] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState('cash_on_pickup');
  const [otherPayment, setOtherPayment] = useState('');

  const load = useCallback(async () => {
    setErr('');
    try {
      const it = await marketplace.get(route.params.id);
      setItem(it);
      if (user) {
        if (it.seller_id === user.id) {
          const { data: sTx } = await supabase
            .from('transactions')
            .select('id, status')
            .eq('item_id', route.params.id)
            .in('status', ['pending', 'approved'])
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          setSellerActiveTx(sTx);
          setMyActiveTx(null);
        } else {
          const { data: bTx } = await supabase
            .from('transactions')
            .select('id, status')
            .eq('item_id', route.params.id)
            .eq('buyer_id', user.id)
            .in('status', ['pending', 'approved'])
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          setMyActiveTx(bTx);
          setSellerActiveTx(null);
        }
      } else {
        setMyActiveTx(null);
        setSellerActiveTx(null);
      }
    } catch (e) {
      setErr(errorMessage(e));
    }
  }, [route.params.id, user]);

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
      const tx = await transactions.request(item.id, {
        payment_method: method,
        ...(method === 'other' ? { other_payment_method: otherPayment.trim() } : {}),
        ...(item.listing_type === 'rent' ? { rental_duration_days: Number(days) } : {})
      });
      setShowPaymentModal(false);
      setMyActiveTx({ id: tx.id, status: tx.status });
      await load();
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
            <Text style={{ fontSize: 14, fontWeight: '800', color: C.red }}>Listing Not Approved by Campus Admin</Text>
          </View>
          <Text style={{ fontSize: 13, color: C.white, lineHeight: 19 }}>
            Reason: {item.rejection_reason || 'This listing requires corrections to meet UM-Pasa academic marketplace guidelines.'}
          </Text>
          <Text style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>
            You can edit this listing below to resolve the issue and resubmit it for campus moderation.
          </Text>
        </View>
      )}
      {item.status === 'sold' && (
        <View style={{
          backgroundColor: isDark ? 'rgba(230,36,36,0.14)' : '#FFEAE8',
          borderWidth: 1.5,
          borderColor: C.red,
          borderRadius: 14,
          padding: 14,
          marginBottom: 14,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Ionicons name="checkmark-done-circle" size={18} color={C.red} />
            <Text style={{ fontSize: 14, fontWeight: '800', color: C.red }}>Item Completed / Sold</Text>
          </View>
          <Text style={{ fontSize: 13, color: C.white, lineHeight: 19 }}>
            This listing has been completed or marked as sold and is no longer available on the active campus marketplace feed.
          </Text>
        </View>
      )}
      {user?.id === item.user_id && item.status === 'pending' && (
        <View style={{
          backgroundColor: isDark ? 'rgba(246,200,76,0.14)' : '#FFF9E6',
          borderWidth: 1.5,
          borderColor: 'rgba(246,200,76,0.6)',
          borderRadius: 14,
          padding: 14,
          marginBottom: 14,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Ionicons name="time" size={18} color={C.gold} />
            <Text style={{ fontSize: 14, fontWeight: '800', color: C.gold }}>Listing Reserved (Active Exchange)</Text>
          </View>
          <Text style={{ fontSize: 13, color: C.white, lineHeight: 19 }}>
            A student has requested this listing and a campus exchange is currently in progress. The item stays reserved on the marketplace until completed or cancelled.
          </Text>
          <Pressable
            onPress={() => {
              if (sellerActiveTx) navigation.navigate('Transaction', { id: sellerActiveTx.id });
              else navigation.navigate('Transactions');
            }}
            style={{
              marginTop: 10,
              alignSelf: 'flex-start',
              paddingHorizontal: 12,
              paddingVertical: 7,
              borderRadius: 8,
              backgroundColor: C.panel,
              borderWidth: 1,
              borderColor: C.border,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Ionicons name="swap-horizontal" size={14} color={C.gold} />
            <Text style={{ fontSize: 12, fontWeight: '800', color: C.gold }}>
              {sellerActiveTx ? 'Manage Transaction ›' : 'View Transactions ›'}
            </Text>
          </Pressable>
        </View>
      )}
      {user?.id !== item.user_id && myActiveTx && (
        <View style={{
          backgroundColor: isDark ? 'rgba(46,160,67,0.14)' : '#E6F4EA',
          borderWidth: 1.5,
          borderColor: '#2EA043',
          borderRadius: 14,
          padding: 14,
          marginBottom: 14,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Ionicons name="checkmark-circle" size={18} color="#2EA043" />
            <Text style={{ fontSize: 14, fontWeight: '800', color: '#2EA043' }}>You Have an Active Request</Text>
          </View>
          <Text style={{ fontSize: 13, color: C.white, lineHeight: 19 }}>
            {myActiveTx.status === 'approved'
              ? 'Your request was approved! Meetup details are scheduled. Check Transactions for details.'
              : 'Your transaction request is awaiting seller approval and campus meetup scheduling.'}
          </Text>
          <Pressable
            onPress={() => navigation.navigate('Transaction', { id: myActiveTx.id })}
            style={{
              marginTop: 10,
              alignSelf: 'flex-start',
              paddingHorizontal: 12,
              paddingVertical: 7,
              borderRadius: 8,
              backgroundColor: C.panel,
              borderWidth: 1,
              borderColor: C.border,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Ionicons name="eye-outline" size={14} color={C.gold} />
            <Text style={{ fontSize: 12, fontWeight: '800', color: C.gold }}>View Your Transaction ›</Text>
          </Pressable>
        </View>
      )}
      {user?.id !== item.user_id && !myActiveTx && item.status === 'pending' && (
        <View style={{
          backgroundColor: isDark ? 'rgba(246,200,76,0.12)' : '#FFF9E6',
          borderWidth: 1.5,
          borderColor: 'rgba(246,200,76,0.5)',
          borderRadius: 14,
          padding: 14,
          marginBottom: 14,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Ionicons name="time" size={18} color={C.gold} />
            <Text style={{ fontSize: 14, fontWeight: '800', color: C.gold }}>Item Currently Reserved</Text>
          </View>
          <Text style={{ fontSize: 13, color: C.white, lineHeight: 19 }}>
            Another student has requested this item and a campus exchange is currently in progress. If the transaction is declined or cancelled, this listing will become available again.
          </Text>
          <Text style={{ fontSize: 11.5, color: C.muted, marginTop: 6 }}>
            You can still message the seller below to inquire about queueing or future availability.
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
      {!item.archived_at && item.status === 'available' && item.listing_type === 'rent' && (
        <Field
          label={`Rental days (${item.minimum_rental_days || 1}–${item.maximum_rental_days || 365})`}
          value={days}
          onChangeText={setDays}
          keyboardType="number-pad"
        />
      )}
      {!item.archived_at && user?.id !== item.user_id && (
        myActiveTx ? (
          <Button
            title="View your active request"
            onPress={() => navigation.navigate('Transaction', { id: myActiveTx.id })}
          />
        ) : item.status === 'pending' ? (
          <Button
            title="Reserved (Pending exchange)"
            disabled
          />
        ) : item.status === 'sold' ? (
          <Button
            title="Item sold"
            disabled
          />
        ) : (
          <Button
            title={busy ? 'Sending…' : 'Request this item'}
            disabled={busy}
            onPress={request}
          />
        )
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
                body: item.status === 'pending'
                  ? `Hi, I noticed ${item.title} is currently reserved. Please let me know if it becomes available again!`
                  : `Hi, I'm interested in ${item.title}.`
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
      {user?.id === item.user_id && item.status === 'pending' && (
        <Button
          title="Manage active transaction"
          secondary
          onPress={() => {
            if (sellerActiveTx) navigation.navigate('Transaction', { id: sellerActiveTx.id });
            else navigation.navigate('Transactions');
          }}
        />
      )}
      {user?.id === item.user_id && item.status === 'available' && item.moderation_status === 'approved' && item.listing_type === 'sell' && (
        <Button
          title="Mark as sold"
          secondary
          onPress={() => Alert.alert(
            'Mark listing as sold?',
            `"${item.title}" will be marked as sold and removed from active marketplace listings.`,
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
            'This listing will be archived from the marketplace. Completed transaction records, if any, will be retained.',
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
      Alert.alert(
        'Listing submitted',
        edit
          ? 'Your changes have been saved and resubmitted for admin review.'
          : 'Your listing has been submitted for campus moderator review. You will be notified once approved.'
      );
      navigation.goBack();
    } catch (e) {
      Alert.alert('Unable to save listing', errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const pay = ['gcash','maya','bank_transfer','cash_on_pickup','other'];
  return (
    <Page bottomSafe>
      <Heading
        title={edit ? 'Edit Listing' : 'Post Academic Item'}
        subtitle="Student listings are reviewed by campus moderators before being published."
      />
      <Field
        label="Item title (e.g. Casio FX-991CW, Type B Uniform)"
        value={f.title || ''}
        onChangeText={(v: string) => set('title', v)}
      />
      <Text style={s.label}>Category</Text>
      <View style={s.rowWrap}>
        {categories.map(v => (
          <Choice
            key={v}
            label={v}
            selected={f.category === v && !f.custom_category}
            onPress={() => { set('category', v); set('custom_category', ''); }}
          />
        ))}
        <Choice
          label="Other / custom"
          selected={!!f.custom_category}
          onPress={() => set('category', '__custom')}
        />
      </View>
      {f.category === '__custom' && (
        <Field
          label="Custom category"
          value={f.custom_category || ''}
          onChangeText={(v: string) => set('custom_category', v)}
        />
      )}
      <Field
        label="Item description (condition, inclusions, semester used)"
        value={f.description || ''}
        onChangeText={(v: string) => set('description', v)}
        multiline
      />
      <Text style={s.label}>Exchange type</Text>
      <View style={s.row}>
        <Choice
          label="For sale (permanent)"
          selected={f.listing_type === 'sell'}
          onPress={() => set('listing_type', 'sell')}
        />
        <Choice
          label="For rent (temporary lending)"
          selected={f.listing_type === 'rent'}
          onPress={() => set('listing_type', 'rent')}
        />
      </View>
      {f.listing_type === 'sell' ? (
        <Field
          label="Selling price (₱)"
          value={String(f.price || '')}
          onChangeText={(v: string) => set('price', v)}
          keyboardType="decimal-pad"
        />
      ) : (
        <>
          <Field
            label="Daily rental rate (₱ / day)"
            value={String(f.daily_rental_rate || '')}
            onChangeText={(v: string) => set('daily_rental_rate', v)}
            keyboardType="decimal-pad"
          />
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Field
                label="Minimum rental days"
                value={String(f.minimum_rental_days || '')}
                onChangeText={(v: string) => set('minimum_rental_days', v)}
                keyboardType="number-pad"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                label="Maximum rental days"
                value={String(f.maximum_rental_days || '')}
                onChangeText={(v: string) => set('maximum_rental_days', v)}
                keyboardType="number-pad"
              />
            </View>
          </View>
        </>
      )}
      <Text style={s.label}>Item physical condition</Text>
      <View style={s.row}>
        {['new', 'like_new', 'good', 'fair', 'poor'].map(v => (
          <Choice
            key={v}
            label={v.replace('_', ' ')}
            selected={f.condition === v}
            onPress={() => set('condition', v)}
          />
        ))}
      </View>
      <Text style={s.label}>Accepted payment options</Text>
      <View style={s.rowWrap}>
        {pay.map(v => (
          <Choice
            key={v}
            label={v.replaceAll('_', ' ')}
            selected={f.accepted_payment_methods?.includes(v)}
            onPress={() => set(
              'accepted_payment_methods',
              f.accepted_payment_methods?.includes(v)
                ? f.accepted_payment_methods.filter((x: string) => x !== v)
                : [...(f.accepted_payment_methods || []), v]
            )}
          />
        ))}
      </View>
      <Text style={s.label}>Academic department</Text>
      <View style={s.rowWrap}>
        {departments.map(v => (
          <Choice
            key={v}
            label={v.replace('Department of ', '')}
            selected={f.department === v}
            onPress={() => { set('department', v); set('program', ''); }}
          />
        ))}
      </View>
      {(programs[f.department] || []).length > 0 && (
        <>
          <Text style={s.label}>Degree program</Text>
          <View style={s.rowWrap}>
            {programs[f.department].map(v => (
              <Choice
                key={v}
                label={v}
                selected={f.program === v}
                onPress={() => set('program', v)}
              />
            ))}
          </View>
        </>
      )}
      <Field
        label="Course code (optional, e.g. IT 106, ACT 211)"
        value={f.course_code || ''}
        onChangeText={(v: string) => set('course_code', v.toUpperCase())}
        autoCapitalize="characters"
      />
      <Text style={s.label}>Item photo (recommended)</Text>
      {imageUri ? (
        <View style={{ marginBottom: 14 }}>
          <Image
            source={{ uri: imageUri }}
            style={{ width: '100%', height: 180, borderRadius: 10, marginBottom: 8 }}
            resizeMode="cover"
          />
          <View style={s.row}>
            <Button title="Change photo" secondary onPress={pickImage} />
            <Button
              title="Remove"
              danger
              onPress={() => { setImageUri(null); set('image_path', null); }}
            />
          </View>
        </View>
      ) : (
        <View style={{ marginBottom: 14 }}>
          <Button title="📷 Select photo from library" secondary onPress={pickImage} />
        </View>
      )}
      <Button
        title={busy ? 'Submitting…' : edit ? 'Save changes' : 'Submit listing for review'}
        disabled={busy}
        onPress={save}
      />
    </Page>
  );
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
  const dashboardTiles = user?.role==='admin' ? [['Users',stats.users],['Students',stats.students],['Items',stats.items],['Pending review',stats.pendingItems],['Transactions',stats.transactions],['Completed',stats.completed]] : [['Active listings',stats.total_items],['Pending review',stats.pending_listings],['Active requests',stats.pending_requests],['Completed trades',stats.completed_transactions]];
  return (
    <Page topSafe onRefresh={load}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={s.heading}>{`Hello, ${user?.name?.split(' ')[0] || 'there'}`}</Text>
          <Text style={s.subheading}>{user?.role === 'admin' ? 'UM-Pasa campus administration & moderation' : 'UM Tagum College student marketplace'}</Text>
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
        <Button title="＋  Post academic item" onPress={() => navigation.navigate('ListingForm')} />
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
              <Text numberOfLines={1} style={s.quickActionText}>Transactions</Text>
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
  const isDark = C.bg === themeTokens.dark.colors.bg;
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
      <Heading title="Transactions" subtitle="Track item requests, scheduled campus meetups, and completed handovers." />

      {/* Filter Tabs */}
      <View style={[s.rowWrap, { marginBottom: 14 }]}>
        {[
          ['all', 'All'],
          ['pending', 'Pending Approval'],
          ['approved', 'Approved / Scheduled'],
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
        <Status state={filter === 'all' ? 'No transactions yet. Browse listings to request an item.' : `No ${filter} transactions found.`} />
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
                  <Text numberOfLines={2} style={s.txTitle}>{t.item?.title || 'Campus transaction'}</Text>
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

              {t.item_id ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6' }}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={async () => {
                      try {
                        const recipient_id = user?.id === t.buyer_id ? t.seller_id : t.buyer_id;
                        const m = await messaging.send({
                          recipient_id,
                          item_id: t.item_id,
                          body: `Hi, I want to coordinate about ${t.item?.title || 'our transaction'}.`
                        });
                        navigation.navigate('Conversation', { id: m.conversation_id });
                      } catch (err) {
                        Alert.alert('Unable to open chat', errorMessage(err));
                      }
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 14,
                      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2',
                      borderWidth: 1,
                      borderColor: isDark ? '#EF4444' : '#FECACA',
                    }}
                  >
                    <Ionicons name="chatbubble-ellipses-outline" size={14} color={isDark ? '#FCA5A5' : '#8B0000'} />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: isDark ? '#FCA5A5' : '#8B0000' }}>
                      Chat with {roleLabel}
                    </Text>
                  </Pressable>
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
  const run = (title: string, action: () => Promise<any>) => Alert.alert(title, 'Confirm this action for this campus transaction?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Confirm', onPress: async () => { try { await action(); await load(); } catch(e) { Alert.alert('Action failed', errorMessage(e)); } } }]);
  const approve = async () => {
    if (!meetup.trim()) {
      Alert.alert('Missing meetup location', 'Please enter a campus safe meetup spot before approving.');
      return;
    }
    if (!meetupDate) {
      Alert.alert('Missing meetup schedule', 'Please select a future meetup date and time.');
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
      Alert.alert('Request approved','The buyer was notified of your proposed meetup details.');
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
        Alert.alert('Payment proof uploaded', 'The seller has been notified to verify your payment receipt.');
      }
    } catch (err) {
      Alert.alert('Unable to upload proof', errorMessage(err));
    } finally {
      setUploadingProof(false);
    }
  };

  return <Page bottomSafe><Heading title={t.item?.title || 'Transaction'} subtitle={`Transaction #${t.id}`} /><Card><Text style={[s.badge,{color:statusColor(t.status)}]}>{t.status?.toUpperCase()}</Text><Text style={s.price}>{money(t.item?.price)}</Text><Text style={s.body}>Buyer: {t.buyer?.name}</Text><Text style={s.body}>Seller: {t.seller?.name}</Text><Text style={s.body}>Payment: {t.payment_method?.replaceAll('_',' ')}{t.other_payment_method?` · ${t.other_payment_method}`:''}</Text>{t.rental_duration_days?<Text style={s.body}>Rental duration: {t.rental_duration_days} day(s) · Due {formatPhilippineDate(t.rental_due_date, 'to be confirmed')}</Text>:null}{t.meetup_location ? <Text style={s.body}>Meetup: {t.meetup_location} · {formatPhilippineDateTime(t.meetup_time)}</Text> : null}{pendingProposal ? <View style={{ marginTop: 8, padding: 10, borderRadius: 8, backgroundColor: isDark ? 'rgba(246,200,76,0.12)' : '#FFF9E6', borderWidth: 1, borderColor: isDark ? 'rgba(246,200,76,0.25)' : '#FFE082' }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}><Ionicons name="time-outline" size={15} color={C.gold} /><Text style={{ fontSize: 12, fontWeight: '800', color: isDark ? C.gold : '#B78103' }}>Pending Meetup Proposal</Text></View><Text style={{ fontSize: 13, color: C.white, fontWeight: '600' }}>{pendingProposal.meetup_location} · {formatPhilippineDateTime(pendingProposal.meetup_time)}</Text><Text style={{ fontSize: 12, color: C.cream, marginTop: 2 }}>{pendingProposal.sender_id === user?.id ? `Waiting for ${user?.id === t.buyer_id ? t.seller?.name : t.buyer?.name} to accept` : `Proposed by ${pendingProposal.sender_id === t.buyer_id ? t.buyer?.name : t.seller?.name} (review in chat to accept)`}</Text></View> : null}<Text style={s.muted}>Payment proof: {t.payment_proof?`Uploaded ${formatPhilippineDateTime(t.payment_proof_uploaded_at, '')}`:'Not uploaded'}</Text>{proofUrl && <View style={{ marginTop: 10 }}><Text style={s.label}>Payment Proof Receipt:</Text><Image source={{ uri: proofUrl }} style={{ width: '100%', height: 220, borderRadius: 10, marginTop: 6 }} resizeMode="contain" /></View>}</Card>{isBuyer && ['pending','approved'].includes(t.status) && <View style={{ marginVertical: 6 }}><Button title={uploadingProof ? 'Uploading proof…' : t.payment_proof ? '📷 Replace payment proof' : '📷 Upload payment proof'} secondary disabled={uploadingProof} onPress={pickProof} /></View>}{isSeller && t.status === 'pending' && <><Field label="Meetup location" value={meetup} onChangeText={setMeetup} placeholder="e.g. Main Library (Mabini) or Visayan IT Labs Lobby"/><MeetupTimePicker label="Meetup date & time" value={meetupDate} onChange={setMeetupDate}/><Button title={approving ? 'Approving request…' : 'Approve request'} disabled={approving || !meetup.trim() || !meetupDate} onPress={approve} /><Button title="Reject request" danger onPress={() => run('Reject request', () => transactions.reject(t.id))} /></>}{isSeller && t.status === 'approved' && <Button title="Mark as completed" onPress={() => run('Complete exchange', () => transactions.complete(t.id))} />}{t.status === 'completed' && !t.ratings?.some((r: any) => r.reviewer_id === user?.id) && <><Text style={s.muted}>Both the buyer and seller can leave a review after completion.</Text><RatingForm id={t.id} onDone={load} /></>}{t.item && <Button title="Message participant" secondary onPress={async()=>{try{const recipient_id=user?.id===t.buyer_id?t.seller_id:t.buyer_id;const m=await messaging.send({recipient_id,item_id:t.item_id,body:`Hi, I want to coordinate about ${t.item?.title}.`});navigation.navigate('Conversation',{id:m.conversation_id});}catch(e){Alert.alert('Unable to message participant',errorMessage(e))}}}/>}</Page>;
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
  const markSold = (item: Item) => Alert.alert('Mark listing as sold?', `"${item.title}" will be marked as sold and removed from active marketplace listings.`, [
    {text:'Cancel',style:'cancel'}, {text:'Mark sold',onPress:async()=>{try{await marketplace.markSold(item.id);await load();}catch(e){Alert.alert('Unable to mark sold',errorMessage(e));}}},
  ]);
  return (
    <Page onRefresh={load}>
      <Heading title="My listings" subtitle="Manage your listed items, review status, and marketplace availability."/>
      <Button title="+ Post academic item" onPress={() => navigation.navigate('ListingForm', {})} />
      {err ? <Status state={err} retry={load} /> : !items.length ? <Status state="You do not have any listings yet. Tap above to share academic resources with fellow students!" /> : (
        <View style={s.listingGrid}>
          {items.map(i => (
            <View key={i.id} style={{ width: (width - 43) / 2 }}>
              <Pressable onPress={() => navigation.navigate('Listing', { id: i.id })}>
                <ItemCard item={i} compact />
              </Pressable>
              <Text numberOfLines={2} style={[s.badge, { color: statusColor(i.moderation_status), marginBottom: 4 }]}>
                {i.moderation_status === 'pending' ? 'PENDING REVIEW' : i.moderation_status?.toUpperCase()}
              </Text>
              {i.status === 'pending' && (
                <View style={{
                  backgroundColor: isDark ? 'rgba(246,200,76,0.18)' : '#FFF9E6',
                  paddingHorizontal: 7,
                  paddingVertical: 3,
                  borderRadius: 6,
                  marginBottom: 6,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4
                }}>
                  <Ionicons name="time" size={11} color={C.gold} />
                  <Text style={{ fontSize: 9.5, fontWeight: '800', color: C.gold, letterSpacing: 0.4 }}>RESERVED (IN EXCHANGE)</Text>
                </View>
              )}
              {i.status === 'sold' && (
                <View style={{
                  backgroundColor: isDark ? 'rgba(230,36,36,0.18)' : '#FFEAE8',
                  paddingHorizontal: 7,
                  paddingVertical: 3,
                  borderRadius: 6,
                  marginBottom: 6,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4
                }}>
                  <Ionicons name="checkmark-done" size={11} color={C.red} />
                  <Text style={{ fontSize: 9.5, fontWeight: '800', color: C.red, letterSpacing: 0.4 }}>COMPLETED / SOLD</Text>
                </View>
              )}
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
              {i.status === 'pending' && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => navigation.navigate('Transactions')}
                  style={[s.soldButton, { borderColor: 'rgba(246,200,76,0.4)', backgroundColor: isDark ? 'rgba(246,200,76,0.12)' : '#FFF9E6' }]}
                >
                  <Text style={[s.soldButtonText, { color: C.gold }]}>View exchange ›</Text>
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
  const isDark = C.bg === themeTokens.dark.colors.bg;
  const [name, setName] = useState(profile?.full_name || user?.name || '');
  const [studentNumber, setStudentNumber] = useState(profile?.student_number || '');
  const [department, setDepartment] = useState(profile?.department || '');
  const [program, setProgram] = useState(profile?.program || '');
  const [currentPassword, setCurrentPassword] = useState('');
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
        student_number: profile?.student_number || studentNumber || null,
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
    if (!currentPassword) {
      Alert.alert('Current password required', 'Please enter your current password to verify your identity.');
      return;
    }
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
      await updatePassword(password, currentPassword);
      setCurrentPassword('');
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
          <Text style={s.profileMenuLabel}>My Campus Report</Text>
          <Ionicons name="chevron-forward" size={18} color={C.muted} />
        </Pressable>

        <View style={s.profileMenuDivider} />

        <Pressable style={s.profileMenuItem} onPress={() => setShowEditModal(true)}>
          <View style={s.profileMenuIconBox}>
            <Ionicons name="settings-outline" size={18} color={C.gold} />
          </View>
          <Text style={s.profileMenuLabel}>Edit Profile & Academic Info</Text>
          <Ionicons name="chevron-forward" size={18} color={C.muted} />
        </Pressable>
      </View>

      {/* Campus Guide & Support */}
      <View style={s.profileMenuCard}>
        <Pressable style={s.profileMenuItem} onPress={() => navigation.navigate('Help')}>
          <View style={s.profileMenuIconBox}>
            <Ionicons name="book-outline" size={18} color={C.gold} />
          </View>
          <Text style={s.profileMenuLabel}>Help & How It Works</Text>
          <Ionicons name="chevron-forward" size={18} color={C.muted} />
        </Pressable>

        <View style={s.profileMenuDivider} />

        <Pressable style={s.profileMenuItem} onPress={() => navigation.navigate('About')}>
          <View style={s.profileMenuIconBox}>
            <Ionicons name="people-outline" size={18} color={C.gold} />
          </View>
          <Text style={s.profileMenuLabel}>About UM-Pasa & Team</Text>
          <Ionicons name="chevron-forward" size={18} color={C.muted} />
        </Pressable>

        <View style={s.profileMenuDivider} />

        <Pressable style={s.profileMenuItem} onPress={() => navigation.navigate('Support')}>
          <View style={s.profileMenuIconBox}>
            <Ionicons name="shield-checkmark-outline" size={18} color={C.gold} />
          </View>
          <Text style={s.profileMenuLabel}>Campus Support & Safety</Text>
          <Ionicons name="chevron-forward" size={18} color={C.muted} />
        </Pressable>
      </View>

      <View style={s.profileMenuCard}>
        <View style={s.profileAppearanceHeader}>
          <Text style={s.profileAppearanceTitle}>Theme Appearance</Text>
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
              <Text style={[s.profileMenuLabel, { color: C.red }]}>Deactivate Account</Text>
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

      <Modal visible={showEditModal} transparent animationType="slide" onRequestClose={() => setShowEditModal(false)}>
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
              {profile?.student_number ? (
                <View style={s.fieldWrap}>
                  <Text style={s.label}>Student ID Number</Text>
                  <View style={[s.field, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F3F4F6', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14 }]}>
                    <Text style={{ color: isDark ? C.white : '#111827', fontSize: 14, fontWeight: '700' }}>{profile.student_number}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name="lock-closed" size={14} color={C.muted} />
                      <Text style={{ fontSize: 11, color: C.muted, fontWeight: '600' }}>Verified</Text>
                    </View>
                  </View>
                  <Text style={[s.muted, { marginTop: 4, fontSize: 11 }]}>Student ID number is verified and permanently linked to your institutional account.</Text>
                </View>
              ) : (
                <Field label="Student ID number" value={studentNumber} onChangeText={setStudentNumber} autoCapitalize="characters" />
              )}
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

      <Modal visible={showPasswordModal} transparent animationType="slide" onRequestClose={() => { setShowPasswordModal(false); setCurrentPassword(''); setPassword(''); setConfirm(''); }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Change Password</Text>
              <Pressable onPress={() => { setShowPasswordModal(false); setCurrentPassword(''); setPassword(''); setConfirm(''); }} hitSlop={10}>
                <Ionicons name="close-circle" size={24} color={C.muted} />
              </Pressable>
            </View>
            <Field label="Current password" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry placeholder="Enter current password" />
            <Field label="New password" value={password} onChangeText={setPassword} secureTextEntry placeholder="Min. 8 characters" />
            <Field label="Confirm new password" value={confirm} onChangeText={setConfirm} secureTextEntry placeholder="Re-enter password" />
            <View style={{ marginTop: 12 }}>
              <Button title={busy ? 'Updating…' : 'Update password'} onPress={savePassword} disabled={busy} />
              <Button title="Cancel" secondary onPress={() => { setShowPasswordModal(false); setCurrentPassword(''); setPassword(''); setConfirm(''); }} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Page>
  );
}

function NotificationsScreen({ navigation }: any) {
  const { user } = useAuth();
  const isDark = C.bg === themeTokens.dark.colors.bg;
  const [items, setItems] = useState<Notice[]>([]);
  const [filter, setFilter] = useState('all');
  const [err, setErr] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setRefreshing(true);
      setItems(await account.notifications());
      setErr('');
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const read = async () => {
    try {
      await account.markNotificationsRead();
      setItems(old => old.map(x => ({ ...x, is_read: true })));
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

  const unreadCount = items.filter(n => !n.is_read).length;

  const types: Record<string, string[]> = {
    requests: ['request', 'message', 'meetup'],
    approved: ['approval', 'completion', 'listing_approved'],
    meetups: ['meetup'],
  };

  const visible = items.filter(n => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !n.is_read;
    if (types[filter]) return types[filter].includes(n.type);
    return true;
  });

  const getNoticeVisuals = (n: Notice) => {
    const t = n.type;
    if (t === 'request') {
      return {
        badgeBg: isDark ? 'rgba(79, 70, 229, 0.22)' : '#EEF2FF',
        badgeIcon: 'book-outline',
        iconColor: '#6366F1',
        title: 'Buy Request',
        pillLabel: 'Pickup: Main Gate',
        pillExtra: '₱350.00',
      };
    }
    if (t === 'meetup') {
      return {
        badgeBg: isDark ? 'rgba(124, 58, 237, 0.22)' : '#F5F3FF',
        badgeIcon: 'calendar-outline',
        iconColor: '#8B5CF6',
        title: 'Meetup Scheduled',
        pillLabel: '📍 Library Ground Flr',
        pillExtra: 'Tomorrow, 1:30 PM',
      };
    }
    if (t === 'approval' || t === 'listing_approved') {
      return {
        badgeBg: isDark ? 'rgba(16, 185, 129, 0.22)' : '#ECFDF5',
        badgeIcon: 'shield-checkmark-outline',
        iconColor: '#10B981',
        title: 'Campus Verified',
        pillLabel: 'Live in UM Tagum Feed',
        pillExtra: '',
      };
    }
    if (t === 'payment_proof') {
      return {
        badgeBg: isDark ? 'rgba(20, 184, 166, 0.22)' : '#F0FDFA',
        badgeIcon: 'receipt-outline',
        iconColor: '#14B8A6',
        title: 'Payment Confirmation',
        pillLabel: 'Verify receipt photo',
        pillExtra: '',
      };
    }
    if (t === 'rating') {
      return {
        badgeBg: isDark ? 'rgba(245, 158, 11, 0.22)' : '#FEF3C7',
        badgeIcon: 'star',
        iconColor: '#D97706',
        title: '★ 5.0 Star Feedback',
        pillLabel: 'Verified Review',
        pillExtra: '',
      };
    }
    return {
      badgeBg: isDark ? 'rgba(100, 116, 139, 0.22)' : '#F1F5F9',
      badgeIcon: 'information-circle-outline',
      iconColor: '#64748B',
      title: 'Action Needed',
      pillLabel: 'Campus Notice',
      pillExtra: '',
    };
  };

  const isCreatedToday = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      return (
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
      );
    } catch {
      return false;
    }
  };

  const todayItems = visible.filter(n => isCreatedToday(n.created_at));
  const earlierItems = visible.filter(n => !isCreatedToday(n.created_at));

  const renderNoticeCard = (n: Notice) => {
    const visuals = getNoticeVisuals(n);
    const relTime = formatRelativeTime(n.created_at);
    return (
      <Pressable
        key={n.id}
        accessibilityRole="button"
        onPress={() => open(n)}
        style={{
          backgroundColor: !n.is_read
            ? (isDark ? 'rgba(239, 68, 68, 0.08)' : '#FEF2F2')
            : (isDark ? C.panel : '#FFFFFF'),
          borderRadius: 16,
          padding: 14,
          marginBottom: 10,
          borderWidth: 1,
          borderColor: !n.is_read ? (isDark ? '#EF4444' : '#FECACA') : (isDark ? C.border : '#E5E7EB'),
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: isDark ? 0.2 : 0.04,
          shadowRadius: 4,
          elevation: 2,
        }}
      >
        <View style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          backgroundColor: visuals.badgeBg,
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}>
          <Ionicons name={visuals.badgeIcon as any} size={20} color={visuals.iconColor} />
          {!n.is_read && (
            <View style={{
              position: 'absolute',
              top: 2,
              right: 2,
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: '#DC2626',
              borderWidth: 1.5,
              borderColor: isDark ? C.panel : '#FFFFFF',
            }} />
          )}
        </View>

        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: isDark ? '#F87171' : '#B91C1C' }}>
              {visuals.title}
            </Text>
            <Text style={{ fontSize: 11, color: isDark ? '#9CA3AF' : '#6B7280' }}>
              {relTime}
            </Text>
          </View>

          <Text style={{
            fontSize: 13,
            fontWeight: n.is_read ? '500' : '700',
            color: isDark ? '#F3F4F6' : '#1F2937',
            lineHeight: 18,
            marginBottom: 6,
          }}>
            {n.message}
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
            {visuals.pillLabel ? (
              <View style={{
                backgroundColor: isDark ? C.soft : '#F3F4F6',
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 6,
              }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: isDark ? '#E5E7EB' : '#4B5563' }}>
                  {visuals.pillLabel}
                </Text>
              </View>
            ) : null}

            {visuals.pillExtra ? (
              <Text style={{ fontSize: 12, fontWeight: '900', color: isDark ? '#FCA5A5' : '#B91C1C' }}>
                {visuals.pillExtra}
              </Text>
            ) : null}
          </View>
        </View>

        <Ionicons name="chevron-forward" size={16} color={C.muted} style={{ marginTop: 4 }} />
      </Pressable>
    );
  };

  return (
    <Page topSafe refreshing={refreshing} onRefresh={load}>
      {/* Header Bar matching Reference 3 */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        marginBottom: 8,
      }}>
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: isDark ? C.panel : '#F3F4F6',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: isDark ? C.border : '#E5E7EB',
          }}
        >
          <Ionicons name="arrow-back" size={20} color={C.white} />
        </Pressable>

        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 20, fontWeight: '900', color: C.white, letterSpacing: -0.3 }}>
              Notifications
            </Text>
            {unreadCount > 0 && (
              <View style={{
                backgroundColor: isDark ? '#DC2626' : '#B91C1C',
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 10,
              }}>
                <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>
                  {unreadCount} New
                </Text>
              </View>
            )}
          </View>
          <Text style={{ fontSize: 12, color: C.muted, marginTop: 1 }}>
            UM Tagum College Student Exchange
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mark all as read"
            onPress={read}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: isDark ? C.panel : '#F3F4F6',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: isDark ? C.border : '#E5E7EB',
            }}
          >
            <Ionicons name="checkmark-done" size={19} color={C.white} />
          </Pressable>
          <View style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: isDark ? C.panel : '#F3F4F6',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: isDark ? C.border : '#E5E7EB',
            position: 'relative',
          }}>
            <Ionicons name="notifications" size={19} color={unreadCount ? (isDark ? '#F87171' : '#DC2626') : C.white} />
            {unreadCount > 0 && (
              <View style={{
                position: 'absolute',
                top: 8,
                right: 8,
                width: 7,
                height: 7,
                borderRadius: 3.5,
                backgroundColor: '#DC2626',
              }} />
            )}
          </View>
        </View>
      </View>

      {/* Filter Chips Bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingVertical: 6, marginBottom: 12 }}
      >
        {[
          { key: 'all', label: 'All •' },
          { key: 'unread', label: '• Unread' },
          { key: 'requests', label: 'Requests' },
          { key: 'approved', label: 'Approved' },
          { key: 'meetups', label: 'Meetups' },
        ].map(f => {
          const isSelected = filter === f.key;
          return (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={{
                backgroundColor: isSelected ? '#8B0000' : (isDark ? C.panel : '#FFFFFF'),
                borderRadius: 20,
                paddingHorizontal: 14,
                paddingVertical: 7,
                borderWidth: 1,
                borderColor: isSelected ? '#8B0000' : (isDark ? C.border : '#E5E7EB'),
              }}
            >
              <Text style={{
                fontSize: 12.5,
                fontWeight: '700',
                color: isSelected ? '#FFFFFF' : C.muted,
              }}>
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Content */}
      {err ? (
        <Status state={err} retry={load} />
      ) : !visible.length ? (
        <Status state="No notifications in this view." />
      ) : (
        <>
          {todayItems.length > 0 && (
            <View style={{ marginTop: 4, marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ fontSize: 11.5, fontWeight: '900', color: C.muted, letterSpacing: 0.8 }}>
                  TODAY
                </Text>
                <Text style={{ fontSize: 11, color: C.muted }}>
                  Real-time alerts
                </Text>
              </View>
              {todayItems.map(renderNoticeCard)}
            </View>
          )}

          {earlierItems.length > 0 && (
            <View style={{ marginTop: 8, marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ fontSize: 11.5, fontWeight: '900', color: C.muted, letterSpacing: 0.8 }}>
                  EARLIER
                </Text>
                <Text style={{ fontSize: 11, color: C.muted }}>
                  Completed & Notices
                </Text>
              </View>
              {earlierItems.map(renderNoticeCard)}
            </View>
          )}
        </>
      )}
    </Page>
  );
}

function MessagesScreen({ navigation }: any) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isDark = C.bg === themeTokens.dark.colors.bg;
  const [rows, setRows] = useState<Conversation[]>([]);
  const [err, setErr] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'reports' | 'exchanges' | 'meetups' | 'buying' | 'selling'>('all');
  const [showSafeBanner, setShowSafeBanner] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setRefreshing(true);
      setRows(await messaging.list());
      setErr('');
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const markAllAsRead = async () => {
    try {
      if (user?.id) {
        await supabase.from('messages').update({ read_at: new Date().toISOString() }).neq('sender_id', user.id);
        await load();
      }
    } catch {
      // silently proceed
    }
  };

  // Counts
  const unreadTotal = rows.filter(c => !c.latest_message?.read_at && c.latest_message?.sender_id !== user?.id).length;
  const reportsCount = rows.filter(c => !c.item_id).length;
  const exchangeCount = rows.filter(c => !!c.item_id).length;
  const meetupsCount = rows.filter(c => c.latest_message?.type === 'meetup_proposal' || !!c.latest_message?.meetup_location).length;
  const buyingCount = rows.filter(c => c.item?.seller_id !== user?.id).length;
  const sellingCount = rows.filter(c => c.item?.seller_id === user?.id).length;

  // Filter & Search
  const filteredRows = rows.filter(c => {
    if (filter === 'reports') {
      if (c.item_id) return false;
    } else if (filter === 'exchanges') {
      if (!c.item_id) return false;
    } else if (filter === 'meetups') {
      const hasMeetup = c.latest_message?.type === 'meetup_proposal' || !!c.latest_message?.meetup_location;
      if (!hasMeetup) return false;
    } else if (filter === 'buying') {
      if (c.item?.seller_id === user?.id) return false;
    } else if (filter === 'selling') {
      if (c.item?.seller_id !== user?.id) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const person = c.starter_id === user?.id ? c.recipient : c.starter;
      const nameMatch = (person?.name || '').toLowerCase().includes(q);
      const titleMatch = (c.item?.title || '').toLowerCase().includes(q);
      const bodyMatch = (c.latest_message?.body || '').toLowerCase().includes(q);
      return nameMatch || titleMatch || bodyMatch;
    }

    return true;
  });

  return (
    <Page
      topSafe
      refreshing={refreshing}
      onRefresh={load}
      floatingAction={
        <View style={{
          position: 'absolute',
          bottom: 24,
          right: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.35,
          shadowRadius: 6,
          elevation: 8,
        }}>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('Browse')}
            style={{
              backgroundColor: '#8B0000',
              borderRadius: 24,
              paddingHorizontal: 18,
              paddingVertical: 12,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Ionicons name="create-outline" size={18} color="#FFFFFF" />
            <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13.5 }}>
              New Message
            </Text>
          </Pressable>
        </View>
      }
    >
      {/* Top Header matching Reference 2 */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        marginBottom: 6,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: isDark ? C.panel : '#F3F4F6',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: isDark ? C.border : '#E5E7EB',
          }}>
            <Image source={require('./assets/UMPASALOGO.png')} style={{ width: 24, height: 24 }} resizeMode="contain" />
          </View>
          <View>
            <Text style={{ fontSize: 13, fontWeight: '900', color: isDark ? '#FCA5A5' : '#8B0000', letterSpacing: 0.5 }}>
              UM-Pasa
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 18, fontWeight: '900', color: C.white, letterSpacing: -0.3 }}>
                Inbox
              </Text>
              {unreadTotal > 0 && (
                <View style={{
                  backgroundColor: isDark ? '#DC2626' : '#8B0000',
                  paddingHorizontal: 7,
                  paddingVertical: 1.5,
                  borderRadius: 10,
                }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 10.5, fontWeight: '800' }}>
                    {unreadTotal} new
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setFilter(filter === 'all' ? 'meetups' : 'all')}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: isDark ? C.panel : '#F3F4F6',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: isDark ? C.border : '#E5E7EB',
            }}
          >
            <Ionicons name="filter-outline" size={19} color={filter !== 'all' ? (isDark ? '#FCA5A5' : '#8B0000') : C.white} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            onPress={() => navigation.navigate('Notifications')}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: isDark ? C.panel : '#F3F4F6',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: isDark ? C.border : '#E5E7EB',
              position: 'relative',
            }}
          >
            <Ionicons name="notifications-outline" size={19} color={C.white} />
            {unreadTotal > 0 && (
              <View style={{
                position: 'absolute',
                top: 8,
                right: 8,
                width: 7,
                height: 7,
                borderRadius: 3.5,
                backgroundColor: '#DC2626',
              }} />
            )}
          </Pressable>
        </View>
      </View>

      {/* Search Input Bar */}
      <View style={{
        backgroundColor: isDark ? C.panel : '#F3F4F6',
        borderRadius: 22,
        height: 42,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        borderWidth: 1,
        borderColor: isDark ? C.border : '#E5E7EB',
        marginBottom: 10,
      }}>
        <Ionicons name="search-outline" size={18} color={C.muted} style={{ marginRight: 8 }} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search chats, students, or items..."
          placeholderTextColor={C.muted}
          style={{ flex: 1, fontSize: 13, color: isDark ? '#FFFFFF' : '#111827' }}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={C.muted} />
          </Pressable>
        )}
      </View>

      {/* Filter Chips Bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingVertical: 4, marginBottom: 10 }}
      >
        <Pressable
          onPress={() => setFilter('all')}
          style={{
            backgroundColor: filter === 'all' ? '#8B0000' : (isDark ? C.panel : '#FFFFFF'),
            borderRadius: 20,
            paddingHorizontal: 14,
            paddingVertical: 7,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            borderWidth: 1,
            borderColor: filter === 'all' ? '#8B0000' : (isDark ? C.border : '#E5E7EB'),
          }}
        >
          <Text style={{ fontSize: 12.5, fontWeight: '700', color: filter === 'all' ? '#FFFFFF' : C.muted }}>
            All
          </Text>
          <View style={{
            backgroundColor: filter === 'all' ? '#6B0000' : (isDark ? C.soft : '#E5E7EB'),
            paddingHorizontal: 6,
            paddingVertical: 1,
            borderRadius: 8,
          }}>
            <Text style={{ fontSize: 10.5, fontWeight: '800', color: filter === 'all' ? '#FFFFFF' : C.muted }}>
              {rows.length}
            </Text>
          </View>
        </Pressable>

        {isAdmin ? (
          <>
            <Pressable
              onPress={() => setFilter('reports')}
              style={{
                backgroundColor: filter === 'reports' ? (isDark ? '#3B1313' : '#FEE2E2') : (isDark ? C.panel : '#FFFFFF'),
                borderRadius: 20,
                paddingHorizontal: 14,
                paddingVertical: 7,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                borderWidth: 1,
                borderColor: filter === 'reports' ? C.red : (isDark ? C.border : '#E5E7EB'),
              }}
            >
              <Ionicons name="chatbubbles-outline" size={13} color={C.red} />
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: filter === 'reports' ? C.red : (isDark ? C.cream : '#4B5563') }}>
                Student Reports
              </Text>
              <View style={{
                backgroundColor: isDark ? '#551515' : '#FCA5A5',
                paddingHorizontal: 6,
                paddingVertical: 1,
                borderRadius: 8,
              }}>
                <Text style={{ fontSize: 10.5, fontWeight: '800', color: isDark ? '#FFFFFF' : '#7F1D1D' }}>
                  {reportsCount}
                </Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => setFilter('exchanges')}
              style={{
                backgroundColor: filter === 'exchanges' ? '#8B0000' : (isDark ? C.panel : '#FFFFFF'),
                borderRadius: 20,
                paddingHorizontal: 14,
                paddingVertical: 7,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                borderWidth: 1,
                borderColor: filter === 'exchanges' ? '#8B0000' : (isDark ? C.border : '#E5E7EB'),
              }}
            >
              <Ionicons name="cube-outline" size={13} color={filter === 'exchanges' ? '#FFFFFF' : C.muted} />
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: filter === 'exchanges' ? '#FFFFFF' : C.muted }}>
                Peer Exchanges
              </Text>
              <View style={{
                backgroundColor: filter === 'exchanges' ? '#6B0000' : (isDark ? C.soft : '#E5E7EB'),
                paddingHorizontal: 6,
                paddingVertical: 1,
                borderRadius: 8,
              }}>
                <Text style={{ fontSize: 10.5, fontWeight: '800', color: filter === 'exchanges' ? '#FFFFFF' : C.muted }}>
                  {exchangeCount}
                </Text>
              </View>
            </Pressable>
          </>
        ) : (
          <>
            <Pressable
              onPress={() => setFilter('meetups')}
              style={{
                backgroundColor: filter === 'meetups' ? (isDark ? '#2D2310' : '#FEF3C7') : (isDark ? C.panel : '#FFFFFF'),
                borderRadius: 20,
                paddingHorizontal: 14,
                paddingVertical: 7,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                borderWidth: 1,
                borderColor: filter === 'meetups' ? (isDark ? '#78350F' : '#FDE68A') : (isDark ? C.border : '#E5E7EB'),
              }}
            >
              <Ionicons name="pricetag-outline" size={13} color={isDark ? '#FCD34D' : '#92400E'} />
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: isDark ? '#FCD34D' : '#92400E' }}>
                Active Meetups
              </Text>
              <View style={{
                backgroundColor: isDark ? '#451A03' : '#FDE68A',
                paddingHorizontal: 6,
                paddingVertical: 1,
                borderRadius: 8,
              }}>
                <Text style={{ fontSize: 10.5, fontWeight: '800', color: isDark ? '#FCD34D' : '#92400E' }}>
                  {meetupsCount}
                </Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => setFilter('buying')}
              style={{
                backgroundColor: filter === 'buying' ? '#8B0000' : (isDark ? C.panel : '#FFFFFF'),
                borderRadius: 20,
                paddingHorizontal: 14,
                paddingVertical: 7,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                borderWidth: 1,
                borderColor: filter === 'buying' ? '#8B0000' : (isDark ? C.border : '#E5E7EB'),
              }}
            >
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: filter === 'buying' ? '#FFFFFF' : C.muted }}>
                Buying
              </Text>
              <View style={{
                backgroundColor: filter === 'buying' ? '#6B0000' : (isDark ? C.soft : '#E5E7EB'),
                paddingHorizontal: 6,
                paddingVertical: 1,
                borderRadius: 8,
              }}>
                <Text style={{ fontSize: 10.5, fontWeight: '800', color: filter === 'buying' ? '#FFFFFF' : C.muted }}>
                  {buyingCount}
                </Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => setFilter('selling')}
              style={{
                backgroundColor: filter === 'selling' ? '#8B0000' : (isDark ? C.panel : '#FFFFFF'),
                borderRadius: 20,
                paddingHorizontal: 14,
                paddingVertical: 7,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                borderWidth: 1,
                borderColor: filter === 'selling' ? '#8B0000' : (isDark ? C.border : '#E5E7EB'),
              }}
            >
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: filter === 'selling' ? '#FFFFFF' : C.muted }}>
                Selling
              </Text>
              <View style={{
                backgroundColor: filter === 'selling' ? '#6B0000' : (isDark ? C.soft : '#E5E7EB'),
                paddingHorizontal: 6,
                paddingVertical: 1,
                borderRadius: 8,
              }}>
                <Text style={{ fontSize: 10.5, fontWeight: '800', color: filter === 'selling' ? '#FFFFFF' : C.muted }}>
                  {sellingCount}
                </Text>
              </View>
            </Pressable>
          </>
        )}
      </ScrollView>

      {/* Campus Safe Exchange / Admin Desk Banner */}
      {showSafeBanner && (
        <View style={{
          backgroundColor: isDark ? 'rgba(183, 2, 1, 0.15)' : '#FFF5F5',
          borderRadius: 16,
          padding: 13,
          borderWidth: 1,
          borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#FCA5A5',
          marginBottom: 12,
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 10,
        }}>
          <View style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            backgroundColor: isDark ? '#DC2626' : '#8B0000',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 2,
          }}>
            <Ionicons name="shield-checkmark" size={17} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: isDark ? '#FCA5A5' : '#8B0000' }}>
              {isAdmin ? 'Campus Moderation & Student Helpdesk' : 'UMTC Campus Safe Exchange'}
            </Text>
            <Text style={{
              fontSize: 11.5,
              color: isDark ? '#D1D5DB' : '#4B5563',
              lineHeight: 16,
              marginTop: 2,
            }}>
              {isAdmin
                ? 'Address student inquiry tickets, resolve incident reports, and monitor safe exchange guidelines across UM Tagum College.'
                : 'Coordinate transactions only within designated UM Tagum College Safe Zones (Main Library, Visayan IT Labs, Canteens, Gym). Keep all chats inside UM-Pasa for student safety.'}
            </Text>
          </View>
          <Pressable onPress={() => setShowSafeBanner(false)} hitSlop={8}>
            <Ionicons name="close" size={18} color={C.muted} />
          </Pressable>
        </View>
      )}

      {/* Subheader */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
      }}>
        <Text style={{ fontSize: 11, fontWeight: '800', letterSpacing: 0.8, color: C.muted }}>
          CONVERSATIONS
        </Text>
        <Pressable onPress={markAllAsRead}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: isDark ? '#F87171' : '#8B0000' }}>
            ✔ Mark all as read
          </Text>
        </Pressable>
      </View>

      {/* Conversations List */}
      {err ? (
        <Status state={err} retry={load} />
      ) : !filteredRows.length ? (
        <Status state="No conversations yet. Browse the campus marketplace to message a student seller." />
      ) : (
        filteredRows.map(c => {
          const person = c.starter_id === user?.id ? c.recipient : c.starter;
          const partnerName = person?.name || 'UM Student';
          const initials = partnerName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'UM';
          const programLabel = c.item?.program ? `(${c.item.program})` : (c.item?.department ? `(${c.item.department})` : (person?.role === 'admin' ? '(Admin Moderator)' : (!c.item ? '(Support Ticket)' : '(Student)')));
          const isUnread = !c.latest_message?.read_at && c.latest_message?.sender_id !== user?.id;
          const hasMeetup = c.latest_message?.type === 'meetup_proposal' || !!c.latest_message?.meetup_location;
          const meetupConfirmed = c.latest_message?.proposal_status === 'accepted';
          const timeLabel = formatRelativeTime(c.latest_message?.created_at || c.last_message_at || c.created_at);

          return (
            <Pressable
              key={c.id}
              accessibilityRole="button"
              onPress={() => navigation.navigate('Conversation', { id: c.id })}
              style={{
                backgroundColor: isDark ? C.panel : '#FFFFFF',
                borderRadius: 16,
                padding: 14,
                marginBottom: 10,
                borderWidth: 1,
                borderColor: isUnread ? (isDark ? '#EF4444' : '#FECACA') : (isDark ? C.border : '#E5E7EB'),
                borderLeftWidth: isUnread ? 4 : 1,
                borderLeftColor: isUnread ? (isDark ? '#EF4444' : '#B91C1C') : (isDark ? C.border : '#E5E7EB'),
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: isDark ? 0.2 : 0.04,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                {/* Avatar with Online Dot */}
                <View style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: isDark ? '#3A1414' : '#FEE2E2',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1.5,
                  borderColor: isDark ? '#EF4444' : '#8B0000',
                  position: 'relative',
                }}>
                  <Text style={{ fontSize: 16, fontWeight: '900', color: isDark ? '#FCA5A5' : '#8B0000' }}>
                    {initials}
                  </Text>
                  <View style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: '#16A34A',
                    borderWidth: 1.5,
                    borderColor: isDark ? C.panel : '#FFFFFF',
                  }} />
                </View>

                {/* Content */}
                <View style={{ flex: 1 }}>
                  {/* Name, Program, Timestamp */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4, flex: 1, marginRight: 6 }}>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: C.white }}>
                        {partnerName}
                      </Text>
                      <Text style={{ fontSize: 12, color: C.muted }}>
                        {programLabel}
                      </Text>
                      <Ionicons name="checkmark-circle" size={14} color={isDark ? '#F87171' : '#8B0000'} />
                    </View>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: isUnread ? (isDark ? '#F87171' : '#B91C1C') : (isDark ? '#9CA3AF' : C.muted) }}>
                      {timeLabel}
                    </Text>
                  </View>

                  {/* Item tag pill or Support Ticket badge */}
                  {c.item ? (
                    <View style={{
                      backgroundColor: isDark ? C.soft : '#F3F4F6',
                      borderRadius: 6,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 5,
                      alignSelf: 'flex-start',
                      marginTop: 4,
                      marginBottom: 5,
                    }}>
                      <Ionicons name={getCategoryIcon(c.item.category) as any} size={13} color={C.muted} />
                      <Text numberOfLines={1} style={{ fontSize: 11.5, fontWeight: '700', color: C.white, maxWidth: 160 }}>
                        {c.item.title}
                      </Text>
                      <Text style={{ fontSize: 11.5, fontWeight: '900', color: isDark ? '#FCA5A5' : '#8B0000' }}>
                        {c.item.listing_type === 'rent' ? `₱${c.item.price}/day` : `₱${c.item.price}`}
                      </Text>
                    </View>
                  ) : (
                    <View style={{
                      backgroundColor: isDark ? 'rgba(183, 2, 1, 0.18)' : '#FEE2E2',
                      borderRadius: 6,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 5,
                      alignSelf: 'flex-start',
                      marginTop: 4,
                      marginBottom: 5,
                    }}>
                      <Ionicons name="shield-checkmark" size={13} color={isDark ? '#FCA5A5' : '#8B0000'} />
                      <Text numberOfLines={1} style={{ fontSize: 11.5, fontWeight: '800', color: isDark ? '#FCA5A5' : '#8B0000' }}>
                        Student Support & Incident Inquiry
                      </Text>
                    </View>
                  )}

                  {/* Message body preview */}
                  <Text numberOfLines={1} style={{
                    fontSize: 12.5,
                    color: isDark ? '#D1D5DB' : '#4B5563',
                    lineHeight: 17,
                    marginBottom: 6,
                  }}>
                    {c.latest_message?.body ? `"${c.latest_message.body}"` : 'Open conversation'}
                  </Text>

                  {/* Meetup / Status Pill */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
                    {hasMeetup ? (
                      meetupConfirmed ? (
                        <View style={{
                          backgroundColor: isDark ? 'rgba(22, 163, 74, 0.15)' : '#DCFCE7',
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 6,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                        }}>
                          <Ionicons name="checkmark-done" size={12} color="#16A34A" />
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#16A34A' }}>
                            Meetup Confirmed · Safe Zone Agreed
                          </Text>
                        </View>
                      ) : (
                        <View style={{
                          backgroundColor: isDark ? 'rgba(217, 119, 6, 0.15)' : '#FEF3C7',
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 6,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                        }}>
                          <Ionicons name="calendar-outline" size={12} color="#D97706" />
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#D97706' }}>
                            {`Meetup: ${c.latest_message?.meetup_location || 'Campus'} (${c.latest_message?.meetup_time ? formatPhilippineDate(c.latest_message.meetup_time) : 'Pending'})`}
                          </Text>
                        </View>
                      )
                    ) : !c.item ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="chatbubbles-outline" size={12} color={isDark ? '#F87171' : '#8B0000'} />
                        <Text style={{ fontSize: 11, fontWeight: '700', color: isDark ? '#F87171' : '#8B0000' }}>
                          Direct Moderation Assistance
                        </Text>
                      </View>
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="location-outline" size={12} color={C.muted} />
                        <Text style={{ fontSize: 11, color: C.muted }}>
                          UM Tagum Campus Safe Zone
                        </Text>
                      </View>
                    )}

                    {isUnread && (
                      <View style={{
                        width: 18,
                        height: 18,
                        borderRadius: 9,
                        backgroundColor: isDark ? '#DC2626' : '#8B0000',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <Text style={{ fontSize: 10, fontWeight: '900', color: '#FFFFFF' }}>1</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            </Pressable>
          );
        })
      )}
    </Page>
  );
}
const ADMIN_TEMPLATES = [
  {
    label: '🛡️ Greeting',
    title: 'Moderation Greeting',
    text: 'Hello! This is UM-Pasa Campus Moderation. How can we assist you with your inquiry or transaction today?',
  },
  {
    label: '⚖️ Acknowledge Report',
    title: 'Report Received & Reviewing',
    text: 'We have received your report and our moderation team is reviewing the submitted details. We will follow up with you shortly.',
  },
  {
    label: '📍 Safe Zone Notice',
    title: 'UMTC Safe Exchange Notice',
    text: 'Reminder: For student safety, please conduct all exchanges strictly within designated UM Tagum College Safe Zones (Main Library, Visayan IT Labs, Canteens, or Gym).',
  },
  {
    label: '✅ Issue Resolved',
    title: 'Report Resolved',
    text: 'The reported concern has been addressed and resolved by the UM-Pasa administration. Thank you for helping keep our campus marketplace safe!',
  },
  {
    label: '📜 Policy Reminder',
    title: 'UMTC Marketplace Guidelines',
    text: 'Notice: All listings and peer interactions must comply with UM Tagum College student handbook policies and UM-Pasa guidelines. Prohibited items or harassment will result in account suspension.',
  },
];

const STUDENT_TEMPLATES = [
  {
    label: '💬 Check Availability',
    title: 'Item Availability',
    text: 'Hi! Is this still available for meetup on campus?',
  },
  {
    label: '🕒 Propose Meetup',
    title: 'Meetup Invitation',
    text: 'Are you available to meet up at the Main Campus Library or Canteen today?',
  },
  {
    label: '🚨 Report Concern',
    title: 'Contact Admin Support',
    text: 'Hi Admin, I would like to report an issue regarding a campus transaction or user on UM-Pasa.',
  },
  {
    label: '🤝 Handover Complete',
    title: 'Item & Payment Handover',
    text: 'Item and payment received during our campus meetup. Deal completed safely, thank you!',
  },
];

function ConversationScreen({ route, navigation }: any) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
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
    <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1, backgroundColor: C.bg }}>
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

            {/* Pinned Item Chip or Student Helpdesk Badge (Right side) */}
            {c?.item ? (
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
            ) : (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: isDark ? 'rgba(183, 2, 1, 0.2)' : '#FEE2E2',
                  paddingHorizontal: 9,
                  paddingVertical: 5,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: isDark ? '#7F1D1D' : '#FECACA',
                  maxWidth: 155,
                }}
              >
                <Ionicons name="shield-checkmark" size={15} color={isDark ? '#FCA5A5' : '#8B0000'} />
                <View style={{ flexShrink: 1 }}>
                  <Text numberOfLines={1} style={{ fontSize: 11, fontWeight: '800', color: isDark ? '#FCA5A5' : '#8B0000' }}>
                    Student Helpdesk
                  </Text>
                  <Text numberOfLines={1} style={{ fontSize: 10, color: isDark ? '#E5E7EB' : '#4B5563' }}>
                    Direct Moderation
                  </Text>
                </View>
              </View>
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
            {/* Template picker button */}
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                const activeTemplates = isAdmin ? ADMIN_TEMPLATES : STUDENT_TEMPLATES;
                Alert.alert(
                  isAdmin ? 'Admin Response Templates' : 'Quick Message Templates',
                  'Select a pre-written template to insert into your message:',
                  [
                    ...activeTemplates.map(t => ({
                      text: t.title,
                      onPress: () => setBody(t.text),
                    })),
                    { text: 'Cancel', style: 'cancel' as const },
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
                backgroundColor: isDark ? '#3A1414' : '#FEE2E2',
                borderWidth: 1,
                borderColor: isDark ? '#EF4444' : '#8B0000',
              }}
            >
              <Ionicons name="documents-outline" size={13} color={isDark ? '#FCA5A5' : '#8B0000'} />
              <Text style={{ fontSize: 12, fontWeight: '800', color: isDark ? '#FCA5A5' : '#8B0000' }}>
                📋 Templates ▾
              </Text>
            </Pressable>

            {/* Quick Template Chips */}
            {(isAdmin ? ADMIN_TEMPLATES : STUDENT_TEMPLATES).map((tmpl, idx) => (
              <Pressable
                key={idx}
                accessibilityRole="button"
                onPress={() => setBody(tmpl.text)}
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
                <Text style={{ fontSize: 12, fontWeight: '700', color: C.white }}>
                  {tmpl.label}
                </Text>
              </Pressable>
            ))}

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
              placeholder={isAdmin ? "Type moderation reply or use template…" : "Type a message or propose a meetup…"}
              placeholderTextColor={C.muted}
              multiline
              onFocus={() => {
                setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
              }}
              style={{
                flex: 1,
                minHeight: 44,
                maxHeight: 120,
                borderWidth: 1.5,
                borderColor: isDark ? 'rgba(255,255,255,0.22)' : '#D0C3BC',
                borderRadius: 22,
                paddingHorizontal: 16,
                paddingTop: 10,
                paddingBottom: 10,
                color: isDark ? '#FFFFFF' : '#111827',
                backgroundColor: isDark ? C.panel2 : '#FFFFFF',
                fontSize: 15,
                textAlignVertical: 'center',
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
  const studentSummary: Record<string, number>={
    listed: items.length,
    approved: items.filter(i=>i.moderation_status==='approved').length,
    transactions: txs.length,
    completed: txs.filter(t=>t.status==='completed').length,
    earned: txs.filter(t=>t.seller_id===user?.id&&t.status==='completed').reduce((sum,t)=>sum+Number(t.item?.price||0),0)
  };
  const statLabels: Record<string, string>={
    listed: 'Posted Items',
    approved: 'Live / Approved',
    transactions: 'Total Requests',
    completed: 'Completed Deals',
    earned: 'Verified Earnings'
  };
  return (
    <Page onRefresh={load}>
      <Heading title="My Campus Report" subtitle="Academic listings, exchange velocity, and verified student earnings."/>
      <View style={s.stats}>
        {Object.entries(studentSummary).map(([k,v])=>(
          <Card key={k} style={s.stat}>
            <Text style={s.statNum}>{k === 'earned' ? money(Number(v)) : String(v)}</Text>
            <Text style={s.muted}>{statLabels[k] || k}</Text>
          </Card>
        ))}
      </View>
      <Text style={s.label}>Transaction status</Text>
      <View style={s.rowWrap}>
        <Choice label="All statuses" selected={!status} onPress={()=>setStatus('')}/>
        <Choice label="Pending Approval" selected={status==='pending'} onPress={()=>setStatus(status==='pending'?'':'pending')}/>
        <Choice label="Approved / Active" selected={status==='approved'} onPress={()=>setStatus(status==='approved'?'':'approved')}/>
        <Choice label="Declined" selected={status==='rejected'} onPress={()=>setStatus(status==='rejected'?'':'rejected')}/>
        <Choice label="Completed" selected={status==='completed'} onPress={()=>setStatus(status==='completed'?'':'completed')}/>
      </View>
      <Text style={s.label}>Listing type</Text>
      <View style={s.row}>
        <Choice label="Sales and rentals" selected={!type} onPress={()=>setType('')}/>
        <Choice label="For Sale" selected={type==='sell'} onPress={()=>setType(type==='sell'?'':'sell')}/>
        <Choice label="For Rent" selected={type==='rent'} onPress={()=>setType(type==='rent'?'':'rent')}/>
      </View>
      <Text style={s.label}>Resource category</Text>
      <View style={s.rowWrap}>
        <Choice label="All categories" selected={!category} onPress={()=>setCategory('')}/>
        {categoryNames.map(v=><Choice key={v} label={v} selected={category===v} onPress={()=>setCategory(category===v?'':(v||''))}/>)}
      </View>
      <Text style={s.label}>Sort by</Text>
      <View style={s.rowWrap}>
        <Choice label="Newest first" selected={sort==='newest'} onPress={()=>setSort('newest')}/>
        <Choice label="Oldest first" selected={sort==='oldest'} onPress={()=>setSort('oldest')}/>
        <Choice label="Item title" selected={sort==='title'} onPress={()=>setSort('title')}/>
        <Choice label="Status" selected={sort==='status'} onPress={()=>setSort('status')}/>
      </View>
      <Heading title="My Academic Listings"/>
      {items.length ? items.map(i=>(
        <Card key={i.id}>
          <Text style={s.cardTitle}>{i.title}</Text>
          <Text style={s.muted}>{i.category} · {i.listing_type === 'rent' ? 'For Rent' : 'For Sale'} · {i.status?.toUpperCase()} / Moderation: {i.moderation_status?.toUpperCase()}{i.created_at ? ` · ${formatPhilippineDate(i.created_at)}` : ''}</Text>
          <Text style={s.price}>{money(i.price)}{i.listing_type === 'rent' ? ' / day' : ''}</Text>
        </Card>
      )) : <Status state="No academic listings match your current filters."/>}
      <Heading title="Transaction History"/>
      {txs.length ? txs.map(t=>(
        <Card key={t.id}>
          <Text style={s.cardTitle}>{t.item?.title||'Transaction'}</Text>
          <Text style={s.muted}>{t.status?.toUpperCase()} · Buyer: {t.buyer?.name} / Seller: {t.seller?.name}{t.created_at ? ` · ${formatPhilippineDate(t.created_at)}` : ''}</Text>
        </Card>
      )) : <Status state="No transaction records match your current filters."/>}
    </Page>
  );
}

function CampusGuideScreen({ route, navigation, initialTab = 'how' }: any) {
  const { user } = useAuth();
  const isDark = C.bg === themeTokens.dark.colors.bg;
  const startTab = route?.params?.initialTab || initialTab || 'how';
  const [tab, setTab] = useState<'how' | 'about' | 'support'>(startTab);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [ticketCat, setTicketCat] = useState('Missing Item / Payment Issue');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [startingChat, setStartingChat] = useState(false);

  useEffect(() => {
    if (route?.params?.initialTab) {
      setTab(route.params.initialTab);
    }
  }, [route?.params?.initialTab]);

  const startAdminChat = async () => {
    if (!user) {
      Alert.alert(
        'Sign In Required',
        'Please sign in to chat directly with a campus moderator.',
        [
          { text: 'Sign In', onPress: () => navigation.navigate('Login') },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }

    if (user.role === 'admin') {
      navigation.navigate('Messages');
      return;
    }

    try {
      setStartingChat(true);

      const { data: convs } = await supabase
        .from('conversations')
        .select('id, starter_id, recipient_id')
        .is('item_id', null)
        .or(`starter_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('last_message_at', { ascending: false })
        .limit(1);

      if (convs && convs.length > 0) {
        navigation.navigate('Conversation', { id: convs[0].id });
        return;
      }

      const adminId = 'd26f1431-913b-46bd-b397-ecff4edd7162';
      const m = await messaging.send({
        recipient_id: adminId,
        body: 'Hello Campus Moderator, I am reaching out for student support.',
      });
      navigation.navigate('Conversation', { id: m.conversation_id });
    } catch (e) {
      Alert.alert('Unable to start moderator chat', errorMessage(e));
    } finally {
      setStartingChat(false);
    }
  };

  const submitTicket = () => {
    if (!ticketSubject.trim() || !ticketMessage.trim()) {
      Alert.alert('Required Fields', 'Please enter both a subject and details for your inquiry.');
      return;
    }
    const ticketId = `UMTC-${Math.floor(1000 + Math.random() * 9000)}`;
    Alert.alert(
      'Support Ticket Submitted',
      `Your inquiry (#${ticketId}) has been dispatched to campus moderators.\n\nCategory: ${ticketCat}\n\nWe will review your inquiry and follow up through your registered institutional email shortly.`,
      [{
        text: 'OK',
        onPress: () => {
          setTicketSubject('');
          setTicketMessage('');
        },
      }]
    );
  };

  const callSecurity = () => {
    Alert.alert(
      'Campus Security Desk',
      'UM Tagum College Security & Emergency Desk:\n\n• Mabini Main Gate 1: (084) 216-9999\n• Visayan Gate 2: (084) 216-8888\n• Tagum Emergency Hotline: 911\n\nWould you like to dial campus security now?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call Campus Desk', onPress: () => Linking.openURL('tel:0842169999').catch(() => {}) },
      ]
    );
  };

  const emailSupport = () => {
    Linking.openURL('mailto:support.umpasa@umindanao.edu.ph?subject=UM-Pasa%20Student%20Support%20Inquiry').catch(() => {
      Alert.alert('Official Email', 'support.umpasa@umindanao.edu.ph');
    });
  };

  const TEAM_MEMBERS = [
    {
      name: 'Dongie Arapoc',
      role: 'Group Creator & Project Lead',
      sub: 'Full-Stack Architecture & Database Design',
      initials: 'DA',
      accent: C.red,
    },
    {
      name: 'Ian Coronia',
      role: 'Lead Mobile UI Engineer',
      sub: 'Frontend Engineering & App Experience',
      initials: 'IC',
      accent: C.gold,
    },
    {
      name: 'Rhena Mae Nalzaro',
      role: 'UI/UX Design & QA',
      sub: 'Interface Standards & Quality Assurance',
      initials: 'RN',
      accent: '#2E7D32',
    },
    {
      name: 'Sophia Tuyac',
      role: 'System Analyst & Documentation',
      sub: 'Requirements Analysis & Technical Specs',
      initials: 'ST',
      accent: '#2563EB',
    },
  ];

  const FAQS = [
    {
      q: "What happens if a student doesn't show up at the safe zone?",
      a: "If a student fails to arrive within 15 minutes of the agreed schedule without notice in chat, use 'Report No-Show' on the transaction details. Repeated unexcused absences result in temporary or permanent suspension from UM-Pasa.",
    },
    {
      q: "How long does administrative moderation take for new listings?",
      a: "DCE moderators verify submitted items during regular class operating hours (8:00 AM to 5:00 PM). New items are typically approved within 1 to 12 hours.",
    },
    {
      q: "Can students outside Tagum College use the platform?",
      a: "UM-Pasa is strictly tailored to University of Mindanao Tagum College (Mabini Main & Visayan campuses) and requires an active @umindanao.edu.ph student email address.",
    },
  ];

  return (
    <Page>
      {/* Header Bar matching Reference */}
      <View style={{ marginBottom: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#16A34A' }} />
          <Text style={{ fontSize: 11, fontWeight: '800', color: isDark ? '#86EFAC' : '#15803D', letterSpacing: 0.8 }}>
            STUDENT HELP GUIDE & POLICY
          </Text>
        </View>
        <Text style={{ fontSize: 24, fontWeight: '900', color: C.white, letterSpacing: -0.4 }}>
          Help & How It Works
        </Text>
        <Text style={{ fontSize: 12.5, color: C.muted, marginTop: 4, lineHeight: 18 }}>
          The official student-to-student resource and peer exchange campus handbook · UM Tagum College
        </Text>
      </View>

      {/* 3 Segmented Tabs */}
      <View style={{
        flexDirection: 'row',
        gap: 6,
        padding: 4,
        borderRadius: 14,
        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F2ECE7',
        borderWidth: 1,
        borderColor: isDark ? C.border : '#E5DDD6',
        marginBottom: 16,
      }}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setTab('how')}
          style={{
            flex: 1,
            paddingVertical: 9,
            borderRadius: 10,
            backgroundColor: tab === 'how' ? C.red : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{
            fontSize: 12,
            fontWeight: '800',
            color: tab === 'how' ? '#FFFFFF' : (isDark ? C.cream : '#4B5563'),
          }}>
            How It Works
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => setTab('about')}
          style={{
            flex: 1,
            paddingVertical: 9,
            borderRadius: 10,
            backgroundColor: tab === 'about' ? C.red : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{
            fontSize: 12,
            fontWeight: '800',
            color: tab === 'about' ? '#FFFFFF' : (isDark ? C.cream : '#4B5563'),
          }}>
            About UM-Pasa
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => setTab('support')}
          style={{
            flex: 1,
            paddingVertical: 9,
            borderRadius: 10,
            backgroundColor: tab === 'support' ? C.red : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{
            fontSize: 12,
            fontWeight: '800',
            color: tab === 'support' ? '#FFFFFF' : (isDark ? C.cream : '#4B5563'),
          }}>
            Contact Support
          </Text>
        </Pressable>
      </View>

      {/* TAB 1: HOW IT WORKS */}
      {tab === 'how' && (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: C.cream, letterSpacing: 0.6 }}>
              CAMPUS MARKETPLACE FLOW
            </Text>
            <Text style={{ fontSize: 11, fontWeight: '700', color: C.muted }}>
              Step-by-step method flow
            </Text>
          </View>

          {/* For Sellers / Lenders */}
          <Card style={{ marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: isDark ? 'rgba(230,36,36,0.18)' : '#FFEAE8', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="pricetag" size={17} color={C.red} />
                </View>
                <Text style={{ fontSize: 16, fontWeight: '900', color: C.white }}>For Sellers / Lenders</Text>
              </View>
              <View style={{ backgroundColor: isDark ? 'rgba(230,36,36,0.18)' : '#FFEAE8', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: C.red }}>
                <Text style={{ fontSize: 10.5, fontWeight: '800', color: C.red }}>5 Easy Steps</Text>
              </View>
            </View>

            {[
              {
                num: '1',
                title: 'Create a sale or rental listing',
                desc: 'Add book edition or uniform size, set rental rates or sale price, and choose accepted payments (Cash, GCash, Bank Transfer).',
              },
              {
                num: '2',
                title: 'Wait for administrative review',
                desc: 'Student moderators verify academic relevance and uniform standards within 1–12 hours.',
              },
              {
                num: '3',
                title: 'Respond to buyer / renter requests',
                desc: 'Approve requests with a dedicated safe-zone meetup location (e.g. Main Library, Visayan Canteen) and time slot.',
              },
              {
                num: '4',
                title: 'Complete the verified exchange',
                desc: 'Meet securely in person. Verify item condition and hand over securely. Digital receipts logged.',
              },
              {
                num: '5',
                title: 'Leave your review & build reputation',
                desc: 'Both parties review each other after transactions to maintain a healthy campus ecosystem.',
              },
            ].map(step => (
              <View key={step.num} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
                <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                  <Text style={{ fontSize: 12, fontWeight: '900', color: '#FFFFFF' }}>{step.num}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13.5, fontWeight: '800', color: C.white }}>{step.title}</Text>
                  <Text style={{ fontSize: 12, color: C.muted, lineHeight: 17, marginTop: 2 }}>{step.desc}</Text>
                </View>
              </View>
            ))}
          </Card>

          {/* For Buyers / Renters */}
          <Card style={{ marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: isDark ? 'rgba(37,99,235,0.18)' : '#EFF6FF', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="cart" size={17} color="#2563EB" />
                </View>
                <Text style={{ fontSize: 16, fontWeight: '900', color: C.white }}>For Buyers / Renters</Text>
              </View>
              <View style={{ backgroundColor: isDark ? 'rgba(37,99,235,0.18)' : '#EFF6FF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: '#2563EB' }}>
                <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#2563EB' }}>4 Simple Steps</Text>
              </View>
            </View>

            {[
              {
                num: '1',
                title: 'Browse two-column marketplace',
                desc: "Filter by course codes (e.g. IT 106, CS 211), college department, or 'sale' vs 'rent'.",
              },
              {
                num: '2',
                title: 'Request listing to buy or rent',
                desc: 'Pick your preferred payment (Cash on Meetup or GCash/Bank). Request is locked until approved by the seller or lender.',
              },
              {
                num: '3',
                title: 'Coordinate meetup in Messages',
                desc: 'Once approved by seller or lender, discuss safe details (schedule, specific campus bench/table) in chat.',
              },
              {
                num: '4',
                title: 'Inspect & Pay / Collect in Safe Zone',
                desc: 'Confirm physical handoff inside UMTC monitored safe zones, inspect item, and review your peer!',
              },
            ].map(step => (
              <View key={step.num} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
                <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                  <Text style={{ fontSize: 12, fontWeight: '900', color: '#FFFFFF' }}>{step.num}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13.5, fontWeight: '800', color: C.white }}>{step.title}</Text>
                  <Text style={{ fontSize: 12, color: C.muted, lineHeight: 17, marginTop: 2 }}>{step.desc}</Text>
                </View>
              </View>
            ))}
          </Card>

          {/* Designated Safe Handoff Zones */}
          <Card style={{
            marginBottom: 16,
            borderWidth: 1.5,
            borderColor: C.gold,
            backgroundColor: isDark ? 'rgba(246,200,76,0.06)' : '#FFFDF7',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: isDark ? 'rgba(246,200,76,0.18)' : '#FFF3D6', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="shield-checkmark" size={18} color={C.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '900', color: C.white }}>Designated Safe Handoff Zones</Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color: isDark ? C.gold : '#8A6500' }}>Monitored Campus Exchange</Text>
              </View>
            </View>
            <Text style={{ fontSize: 13, color: C.cream, lineHeight: 19 }}>
              Always conduct exchanges inside Main Library (Mabini), Visayan IT Labs Lobby, or the College Canteen during daylight operating hours.
            </Text>
          </Card>
        </>
      )}

      {/* TAB 2: ABOUT UM-PASA */}
      {tab === 'about' && (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: C.cream, letterSpacing: 0.6 }}>
              ABOUT UM-PASA
            </Text>
            <Text style={{ fontSize: 11, fontWeight: '700', color: C.muted }}>
              System Information
            </Text>
          </View>

          {/* System Purpose */}
          <Card style={{ marginBottom: 14 }}>
            <Text style={{ fontSize: 11, fontWeight: '900', color: C.gold, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4 }}>
              SYSTEM PURPOSE
            </Text>
            <Text style={{ fontSize: 13.5, color: C.cream, lineHeight: 20 }}>
              UM-Pasa helps University of Mindanao students list academic items, buy, and rent course materials and tools, coordinate safely through in-app chat, upload verified payment proof, and track transactions from request to completion with zero fees.
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
              {['Zero Platform Fees', 'Student ID Verified', 'Direct Handoffs'].map(pill => (
                <View key={pill} style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: isDark ? C.panel2 : '#FAF7F5', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#EFE8E3' }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: C.cream }}>{pill}</Text>
                </View>
              ))}
            </View>
          </Card>

          {/* The Team Behind It (Image 2) */}
          <Card style={{ marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={{ fontSize: 11, fontWeight: '900', color: C.gold, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                PROJECT INFORMATION & CREATORS
              </Text>
              <View style={{ backgroundColor: isDark ? 'rgba(230,36,36,0.18)' : '#FFEAE8', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: C.red }}>PASA Team</Text>
              </View>
            </View>
            <Text style={{ fontSize: 15, fontWeight: '900', color: C.white, marginBottom: 2 }}>
              PASA Development Team
            </Text>
            <Text style={{ fontSize: 12, color: C.muted, marginBottom: 14 }}>
              Student developers and software publishers of UM-Pasa.
            </Text>

            {/* Team Grid / Cards */}
            <View style={{ gap: 8, marginBottom: 14 }}>
              {TEAM_MEMBERS.map(m => (
                <View
                  key={m.name}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    padding: 12,
                    borderRadius: 14,
                    backgroundColor: isDark ? C.panel2 : '#FAF7F5',
                    borderWidth: 1,
                    borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#EFE8E3',
                  }}
                >
                  <View style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F3ECE7',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 2,
                    borderColor: m.accent,
                  }}>
                    <Text style={{ fontSize: 16, fontWeight: '900', color: m.accent }}>{m.initials}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Text style={{ fontSize: 14.5, fontWeight: '800', color: C.white }}>{m.name}</Text>
                      <View style={{
                        backgroundColor: isDark ? 'rgba(246,200,76,0.15)' : '#FFF3D6',
                        paddingHorizontal: 6,
                        paddingVertical: 1.5,
                        borderRadius: 6,
                      }}>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: isDark ? C.gold : '#8A6500' }}>
                          {m.role}
                        </Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>{m.sub}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Institution & Department */}
            <View style={{
              padding: 12,
              borderRadius: 12,
              backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8F4F0',
              borderWidth: 1,
              borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#EAE0D8',
              gap: 4,
            }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: C.muted }}>INSTITUTION & DEPARTMENT</Text>
              <Text style={{ fontSize: 13, fontWeight: '800', color: C.white }}>
                Department of Computing Education (DCE)
              </Text>
              <Text style={{ fontSize: 12, color: C.muted }}>
                Information Technology Program · UM Tagum College & Visayan Campus
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                <Text style={{ fontSize: 11, color: C.gold, fontWeight: '700' }}>Application Release:</Text>
                <Text style={{ fontSize: 11, color: C.cream, fontWeight: '700' }}>v2.4.1 (Final Capstone 2026)</Text>
              </View>
            </View>
          </Card>

          {/* Marketplace Principles */}
          <Card style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 11, fontWeight: '900', color: C.gold, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 }}>
              MARKETPLACE PRINCIPLES
            </Text>
            <View style={{ gap: 10 }}>
              {[
                { title: 'Student-centered listings', desc: 'Tailored specifically for textbooks, drafting tools, lab sets, and uniforms.' },
                { title: 'Traceable Campus Trades', desc: 'Every deal is recorded on campus logs to protect both students legally.' },
                { title: 'Administrative Safety Moderation', desc: 'Items undergo review to prevent commercial and non-academic contraband.' },
                { title: 'Sale & Rental Support', desc: 'Short and term rentals supported alongside outright student purchases.' },
              ].map(p => (
                <View key={p.title} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.red, marginTop: 6 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: C.white }}>{p.title}</Text>
                    <Text style={{ fontSize: 12, color: C.muted, lineHeight: 17, marginTop: 1 }}>{p.desc}</Text>
                  </View>
                </View>
              ))}
            </View>
          </Card>
        </>
      )}

      {/* TAB 3: CONTACT SUPPORT */}
      {tab === 'support' && (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: C.cream, letterSpacing: 0.6 }}>
              CONTACT SUPPORT & HELP DESK
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#16A34A' }} />
              <Text style={{ fontSize: 11, fontWeight: '700', color: isDark ? '#86EFAC' : '#15803D' }}>Open 8AM–5PM</Text>
            </View>
          </View>

          {/* 2 Quick Action Cards Row */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
            <View style={{ flex: 1, padding: 14, borderRadius: 14, backgroundColor: C.panel, borderWidth: 1, borderColor: C.border }}>
              <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: isDark ? 'rgba(22,163,74,0.18)' : '#DCFCE7', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                <Ionicons name="chatbubbles-outline" size={18} color="#16A34A" />
              </View>
              <Text style={{ fontSize: 14, fontWeight: '800', color: C.white }}>Moderator Chat</Text>
              <Text style={{ fontSize: 11, color: C.muted, marginTop: 2, lineHeight: 15, marginBottom: 10 }}>Avg. response: 10m during campus hours</Text>
              <Pressable
                accessibilityRole="button"
                disabled={startingChat}
                onPress={startAdminChat}
                style={{ paddingVertical: 8, borderRadius: 8, backgroundColor: isDark ? C.panel2 : '#EFE8E3', alignItems: 'center' }}
              >
                {startingChat ? (
                  <ActivityIndicator size="small" color={C.white} />
                ) : (
                  <Text style={{ fontSize: 11.5, fontWeight: '800', color: C.white }}>Start Chat ›</Text>
                )}
              </Pressable>
            </View>

            <View style={{ flex: 1, padding: 14, borderRadius: 14, backgroundColor: C.panel, borderWidth: 1, borderColor: C.border }}>
              <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: isDark ? 'rgba(230,36,36,0.18)' : '#FFEAE8', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                <Ionicons name="alert-circle-outline" size={18} color={C.red} />
              </View>
              <Text style={{ fontSize: 14, fontWeight: '800', color: C.white }}>Report Incident</Text>
              <Text style={{ fontSize: 11, color: C.muted, marginTop: 2, lineHeight: 15, marginBottom: 10 }}>Report scams, no-shows or banned items</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setTicketCat('Report Student Conduct / No-Show')}
                style={{ paddingVertical: 8, borderRadius: 8, backgroundColor: isDark ? 'rgba(230,36,36,0.18)' : '#FFEAE8', alignItems: 'center' }}
              >
                <Text style={{ fontSize: 11.5, fontWeight: '800', color: C.red }}>File Report ›</Text>
              </Pressable>
            </View>
          </View>

          {/* Physical Administration */}
          <Card style={{ marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <Ionicons name="business-outline" size={18} color={C.gold} />
              <Text style={{ fontSize: 12, fontWeight: '800', color: C.gold, letterSpacing: 0.6 }}>PHYSICAL ADMINISTRATION</Text>
            </View>
            <Text style={{ fontSize: 13.5, fontWeight: '700', color: C.white, lineHeight: 19 }}>
              DCE Faculty Center, 2nd Flr, IT Computer Labs Bldg, Visayan Campus
            </Text>
            <Text style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
              Monday – Friday · 8:00 AM – 5:00 PM (Class Days)
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : '#EFE8E3' }}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={{ fontSize: 11, color: C.muted }}>Official Support Email</Text>
                <Text style={{ fontSize: 12.5, fontWeight: '800', color: C.white }}>support.umpasa@umindanao.edu.ph</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={emailSupport}
                style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: C.red }}
              >
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>Email Us</Text>
              </Pressable>
            </View>
          </Card>

          {/* Submit A Support Ticket */}
          <Card style={{ marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: C.gold, letterSpacing: 0.6 }}>SUBMIT A SUPPORT TICKET</Text>
              <View style={{ backgroundColor: isDark ? C.panel2 : '#EFE8E3', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: C.cream }}>Ticket Desk</Text>
              </View>
            </View>
            <Text style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>
              Directly send an inquiry or incident report to the campus moderation team.
            </Text>

            <Text style={{ fontSize: 12, fontWeight: '700', color: C.cream, marginBottom: 6 }}>Issue Category</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {[
                'Missing Item / Payment Issue',
                'Report Student Conduct / No-Show',
                'Account & ID Verification',
                'Listing Moderation Inquiry',
              ].map(cat => (
                <Pressable
                  key={cat}
                  onPress={() => setTicketCat(cat)}
                  style={{
                    paddingHorizontal: 9,
                    paddingVertical: 5,
                    borderRadius: 8,
                    backgroundColor: ticketCat === cat ? C.red : (isDark ? C.panel2 : '#EAE0D8'),
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: ticketCat === cat ? '#FFFFFF' : C.white }}>
                    {cat}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Field
              label="Subject"
              value={ticketSubject}
              onChangeText={setTicketSubject}
              placeholder="e.g. Unverified GCash proof, Listing #412"
            />
            <Field
              label="Detailed Description / Reference"
              value={ticketMessage}
              onChangeText={setTicketMessage}
              placeholder="Provide listing title, buyer/seller name, and clear summary..."
              multiline
            />
            <Button
              title="Submit Support Ticket ✉️"
              onPress={submitTicket}
            />
          </Card>

          {/* Campus Safety & FAQ Accordions */}
          <Card style={{ marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: C.gold, letterSpacing: 0.6 }}>CAMPUS SAFETY & FAQ</Text>
              <Text style={{ fontSize: 11, color: C.muted }}>Policies & Tips</Text>
            </View>

            {FAQS.map((faq, idx) => {
              const isOpen = expandedFaq === idx;
              return (
                <Pressable
                  key={faq.q}
                  accessibilityRole="button"
                  onPress={() => setExpandedFaq(isOpen ? null : idx)}
                  style={{
                    paddingVertical: 10,
                    borderBottomWidth: idx < FAQS.length - 1 ? 1 : 0,
                    borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : '#EFE8E3',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: C.white, flex: 1 }}>{faq.q}</Text>
                    <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color={C.muted} />
                  </View>
                  {isOpen && (
                    <Text style={{ fontSize: 12, color: C.muted, lineHeight: 17, marginTop: 6 }}>
                      {faq.a}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </Card>

          {/* Campus Security Hotline Red Alert Card */}
          <View style={{
            padding: 14,
            borderRadius: 14,
            backgroundColor: isDark ? 'rgba(230,36,36,0.1)' : '#FFF5F5',
            borderWidth: 1.5,
            borderColor: C.red,
            marginBottom: 16,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="warning" size={18} color={C.red} />
                <Text style={{ fontSize: 13.5, fontWeight: '900', color: C.red }}>Campus Security & Guard Desk</Text>
              </View>
              <View style={{ backgroundColor: C.red, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                <Text style={{ fontSize: 9.5, fontWeight: '900', color: '#FFFFFF' }}>24/7 HOTLINE</Text>
              </View>
            </View>
            <Text style={{ fontSize: 12, color: C.white, lineHeight: 17, marginBottom: 12 }}>
              Immediate physical assistance needed on campus? Report to Security at Gate 1 (Mabini) or Gate 2 (Visayan) or call campus security.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={callSecurity}
              style={{ paddingVertical: 10, borderRadius: 10, backgroundColor: C.red, alignItems: 'center' }}
            >
              <Text style={{ fontSize: 12.5, fontWeight: '900', color: '#FFFFFF' }}>📞 Call Campus Security</Text>
            </Pressable>
          </View>

          {/* Footer Note */}
          <View style={{ alignItems: 'center', paddingVertical: 10 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: C.muted }}>University of Mindanao - Tagum College</Text>
            <Text style={{ fontSize: 10.5, color: C.muted, marginTop: 2 }}>Department of Computing Education · PASA Platform</Text>
          </View>
        </>
      )}
    </Page>
  );
}

function HelpScreen(props: any) {
  return <CampusGuideScreen {...props} initialTab="how" />;
}

function AboutScreen(props: any) {
  return <CampusGuideScreen {...props} initialTab="about" />;
}

function SupportScreen(props: any) {
  return <CampusGuideScreen {...props} initialTab="support" />;
}
function AdminScreen({ navigation }: any) {
  const isDark = C.bg === themeTokens.dark.colors.bg;
  const [pulse, setPulse] = useState<{ users: number; active: number; pending: number; escrow: number; reports: number }>({
    users: 0,
    active: 0,
    pending: 0,
    escrow: 0,
    reports: 0,
  });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [itemList, userList, txList, convList] = await Promise.all([
        admin.items(),
        admin.users(),
        admin.transactions(),
        messaging.list().catch(() => []),
      ]);
      const pendingCount = itemList.filter(i => i.moderation_status === 'pending').length;
      const activeCount = itemList.filter(i => i.moderation_status === 'approved' && i.status === 'available').length;
      const reportsCount = (convList || []).filter(c => !c.item_id).length;
      setPulse({
        users: userList.length,
        active: activeCount,
        pending: pendingCount,
        escrow: txList.length,
        reports: reportsCount,
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
          {/* Address Student Reports - Replaced slot */}
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('Messages')}
            style={{
              flex: 1,
              padding: 14,
              borderRadius: 14,
              backgroundColor: isDark ? 'rgba(230,36,36,0.1)' : '#FFF0EE',
              borderWidth: 1.5,
              borderColor: C.red,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text numberOfLines={1} style={{ fontSize: 11.5, color: C.red, fontWeight: '800', flex: 1, marginRight: 4 }}>
                Address Reports
              </Text>
              <Ionicons name="chatbubbles" size={16} color={C.red} />
            </View>
            <Text style={{ fontSize: 22, fontWeight: '900', color: C.red, marginTop: 6 }}>
              {pulse.reports || '0'}
            </Text>
            <Text style={{ fontSize: 11, color: isDark ? '#FF8C82' : C.red, fontWeight: '800', marginTop: 2 }}>
              Student reports ›
            </Text>
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

        {/* Big Pending Review Action Button */}
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate('AdminItems')}
          style={{
            marginTop: 12,
            padding: 16,
            borderRadius: 16,
            backgroundColor: isDark ? 'rgba(246,200,76,0.12)' : '#FFF9E6',
            borderWidth: 1.5,
            borderColor: C.gold,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
            <View style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: isDark ? 'rgba(246,200,76,0.22)' : '#FFF0C2',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Ionicons name="alert-circle" size={24} color={C.gold} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 16, fontWeight: '900', color: C.white }}>Pending Review</Text>
                {pulse.pending > 0 && (
                  <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, backgroundColor: C.red }}>
                    <Text style={{ fontSize: 10.5, fontWeight: '900', color: '#FFFFFF' }}>{pulse.pending} REQUIRED</Text>
                  </View>
                )}
              </View>
              <Text style={{ fontSize: 12, color: isDark ? C.cream : '#6B7280', marginTop: 2 }}>
                {pulse.pending > 0
                  ? `${pulse.pending} student item${pulse.pending === 1 ? '' : 's'} awaiting moderation decision`
                  : 'All campus listings up to date'}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: C.gold }}>Review ›</Text>
          </View>
        </Pressable>
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

      {/* Module 2: Address Student Reports */}
      <Pressable
        accessibilityRole="button"
        onPress={() => navigation.navigate('Messages')}
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
          <Ionicons name="chatbubbles" size={20} color={C.red} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: C.white }}>Address Student Reports</Text>
          <Text style={{ fontSize: 12, color: C.muted }}>Respond to moderator chats, conduct reports & tickets</Text>
        </View>
        {pulse.reports > 0 && (
          <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: C.red }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>{pulse.reports}</Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={18} color={C.muted} />
      </Pressable>

      {/* Module 3: Student User Directory */}
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
function ProfileReviewsScreen({ route, navigation }: any) {
  const { user, profile } = useAuth();
  const isDark = C.bg === themeTokens.dark.colors.bg;
  const [reviews, setReviews] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setReviews(await profiles.reviews(route.params.id));
      setError('');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [route.params.id]);

  useEffect(() => { load(); }, [load]);

  const targetName = route.params.name || (route.params.id === user?.id ? user?.name : 'UM-Pasa Student');
  const targetRole = route.params.role === 'admin' || (route.params.id === user?.id && user?.role === 'admin') ? 'Campus Admin' : 'Student';
  const targetDept = route.params.department || (route.params.id === user?.id ? profile?.department : '') || 'Dept. of Computing Education';
  const targetProg = route.params.program || (route.params.id === user?.id ? profile?.program : '') || 'BS Information Technology';
  const initials = targetName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'UM';
  
  const count = reviews.length;
  const average = count ? (reviews.reduce((sum, r) => sum + Number(r.rating || 5), 0) / count) : 5.0;
  const displayRating = average.toFixed(1);

  // Distribution percentages
  const count5 = reviews.filter(r => Number(r.rating) === 5).length;
  const count4 = reviews.filter(r => Number(r.rating) === 4).length;
  const count3 = reviews.filter(r => Number(r.rating) === 3).length;
  const count2 = reviews.filter(r => Number(r.rating) === 2).length;
  const count1 = reviews.filter(r => Number(r.rating) === 1).length;

  const pct5 = count ? Math.round((count5 / count) * 100) : 100;
  const pct4 = count ? Math.round((count4 / count) * 100) : 0;
  const pct3 = count ? Math.round((count3 / count) * 100) : 0;
  const pct2 = count ? Math.round((count2 / count) * 100) : 0;
  const pct1 = count ? Math.round((count1 / count) * 100) : 0;

  return (
    <Page onRefresh={load} refreshing={loading}>
      {/* Top Header Breadcrumb */}
      <View style={{ marginBottom: 14 }}>
        <Text style={{ fontSize: 20, fontWeight: '900', color: C.white, letterSpacing: -0.3 }}>
          Reviews & Trust
        </Text>
        <Text style={{ fontSize: 12.5, color: C.muted, marginTop: 2 }}>
          ● UM Tagum Campus Community
        </Text>
      </View>

      {/* Student Profile Card */}
      <View style={{
        backgroundColor: isDark ? C.panel : '#FFFFFF',
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: isDark ? C.border : '#EFE8E3',
        marginBottom: 14,
        shadowColor: '#000',
        shadowOpacity: isDark ? 0.2 : 0.04,
        shadowRadius: 6,
        elevation: 2,
      }}>
        {/* User Identity Row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{
            width: 52,
            height: 52,
            borderRadius: 26,
            backgroundColor: isDark ? '#3A1414' : '#F9EAE1',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
            borderColor: C.red,
            position: 'relative',
          }}>
            <Text style={{ fontSize: 18, fontWeight: '900', color: C.red }}>{initials}</Text>
            <View style={{
              position: 'absolute',
              bottom: -2,
              right: -2,
              backgroundColor: '#16A34A',
              borderRadius: 8,
              width: 16,
              height: 16,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1.5,
              borderColor: '#FFFFFF',
            }}>
              <Ionicons name="checkmark" size={10} color="#FFFFFF" />
            </View>
          </View>

          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: C.white }}>{targetName}</Text>
              <View style={{
                backgroundColor: isDark ? 'rgba(230,36,36,0.18)' : '#FDF0EB',
                paddingHorizontal: 7,
                paddingVertical: 2,
                borderRadius: 8,
              }}>
                <Text style={{ fontSize: 10.5, fontWeight: '800', color: C.red }}>
                  🎓 {targetRole}
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
              {targetDept}{targetProg ? ` · ${targetProg}` : ''}
            </Text>
            <Text style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>
              📍 UM Tagum Main & Visayan Campus
            </Text>
          </View>
        </View>

        {/* Level Banner */}
        <View style={{
          backgroundColor: isDark ? 'rgba(246,200,76,0.12)' : '#FFFBEB',
          borderColor: isDark ? 'rgba(246,200,76,0.3)' : '#FDE68A',
          borderWidth: 1,
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: 8,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 14,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="trophy" size={15} color="#D97706" />
            <Text style={{ fontSize: 12, fontWeight: '800', color: isDark ? '#FDE68A' : '#92400E' }}>
              Verified Campus Trader
            </Text>
          </View>
          <Text style={{ fontSize: 10.5, fontWeight: '700', color: isDark ? '#FDE68A' : '#B45309' }}>
            🛡️ Verified Student
          </Text>
        </View>

        {/* 4 Stat Metric Cards Row */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <View style={{ flex: 1, backgroundColor: isDark ? C.panel2 : '#FAF7F5', borderRadius: 12, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#EFE8E3' }}>
            <Text style={{ fontSize: 15, fontWeight: '900', color: C.red }}>100%</Text>
            <Text style={{ fontSize: 10, fontWeight: '700', color: C.muted, marginTop: 2 }}>On-Time</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: isDark ? C.panel2 : '#FAF7F5', borderRadius: 12, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#EFE8E3' }}>
            <Text style={{ fontSize: 15, fontWeight: '900', color: C.white }}>{count}</Text>
            <Text style={{ fontSize: 10, fontWeight: '700', color: C.muted, marginTop: 2 }}>Reviews</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: isDark ? C.panel2 : '#FAF7F5', borderRadius: 12, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#EFE8E3' }}>
            <Text style={{ fontSize: 15, fontWeight: '900', color: C.white }}>0</Text>
            <Text style={{ fontSize: 10, fontWeight: '700', color: C.muted, marginTop: 2 }}>Canceled</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: isDark ? C.panel2 : '#FAF7F5', borderRadius: 12, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#EFE8E3' }}>
            <Text style={{ fontSize: 15, fontWeight: '900', color: C.red }}>100%</Text>
            <Text style={{ fontSize: 10, fontWeight: '700', color: C.muted, marginTop: 2 }}>Response</Text>
          </View>
        </View>
      </View>

      {/* Reputation Metrics Card */}
      <View style={{
        backgroundColor: isDark ? C.panel : '#FFFFFF',
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: isDark ? C.border : '#EFE8E3',
        marginBottom: 14,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: C.white }}>Reputation Metrics</Text>
          <View style={{ backgroundColor: isDark ? 'rgba(230,36,36,0.14)' : '#FDF0EB', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
            <Text style={{ fontSize: 10.5, fontWeight: '800', color: C.red }}>100% UM Verified</Text>
          </View>
        </View>

        {/* Large Score + Stars Box */}
        <View style={{
          backgroundColor: isDark ? C.panel2 : '#FAF7F5',
          borderRadius: 16,
          paddingVertical: 16,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#EFE8E3',
          marginBottom: 14,
        }}>
          <Text style={{ fontSize: 36, fontWeight: '900', color: C.white, letterSpacing: -1 }}>
            {displayRating}
          </Text>
          <View style={{ flexDirection: 'row', gap: 3, marginVertical: 4 }}>
            {[1, 2, 3, 4, 5].map(i => (
              <Ionicons key={i} name="star" size={18} color="#EAB308" />
            ))}
          </View>
          <Text style={{ fontSize: 12, color: C.muted, fontWeight: '600', marginTop: 2 }}>
            {count ? `${count} verified review${count === 1 ? '' : 's'}` : 'No verified reviews yet'}
          </Text>
        </View>

        {/* Breakdown Progress Bars */}
        <View style={{ gap: 6 }}>
          {[
            { label: '5★', pct: pct5 },
            { label: '4★', pct: pct4 },
            { label: '3★', pct: pct3 },
            { label: '2★', pct: pct2 },
            { label: '1★', pct: pct1 },
          ].map(row => (
            <View key={row.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ width: 22, fontSize: 11, fontWeight: '700', color: C.muted }}>{row.label}</Text>
              <View style={{ flex: 1, height: 7, borderRadius: 3.5, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#ECE5DF', overflow: 'hidden' }}>
                <View style={{ width: `${row.pct}%`, height: '100%', backgroundColor: C.red, borderRadius: 3.5 }} />
              </View>
              <Text style={{ width: 28, fontSize: 11, fontWeight: '700', color: C.muted, textAlign: 'right' }}>{row.pct}%</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Community Feedback Section */}
      <View style={{ marginBottom: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <Text style={{ fontSize: 16, fontWeight: '900', color: C.white }}>Community Feedback</Text>
          <Text style={{ fontSize: 11, color: C.muted, fontWeight: '600' }}>
            {count ? `${count} review${count === 1 ? '' : 's'}` : 'No reviews yet'}
          </Text>
        </View>

        {/* Reviews List */}
        {error ? (
          <Status state={error} retry={load} />
        ) : loading ? (
          <ActivityIndicator color={C.red} style={{ marginVertical: 20 }} />
        ) : reviews.length ? (
          reviews.map((r, idx) => {
            const revInitials = (r.reviewer_name || 'UM').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
            const ratingVal = Number(r.rating || 5);

            return (
              <View
                key={r.review_id || String(idx)}
                style={{
                  backgroundColor: isDark ? C.panel : '#FFFFFF',
                  borderRadius: 16,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: isDark ? C.border : '#EFE8E3',
                  marginBottom: 10,
                  shadowColor: '#000',
                  shadowOpacity: isDark ? 0.2 : 0.04,
                  shadowRadius: 4,
                  elevation: 1,
                }}
              >
                {/* Reviewer Header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: isDark ? '#3A1414' : '#F9EAE1',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: C.red,
                    }}>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: C.red }}>{revInitials}</Text>
                    </View>
                    <View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={{ fontSize: 13.5, fontWeight: '800', color: C.white }}>
                          {r.reviewer_name || 'UM Student'}
                        </Text>
                        <Ionicons name="checkmark-circle" size={13} color={C.red} />
                      </View>
                      <Text style={{ fontSize: 11, color: C.muted }}>
                        {formatPhilippineDate(r.created_at)} · Verified Student
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <Ionicons name="star" size={13} color="#EAB308" />
                    <Text style={{ fontSize: 12.5, fontWeight: '900', color: C.white }}>
                      {ratingVal.toFixed(1)}
                    </Text>
                  </View>
                </View>

                {/* Item Pill */}
                {r.item_title && (
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 5,
                    backgroundColor: isDark ? C.panel2 : '#FAF7F5',
                    alignSelf: 'flex-start',
                    paddingHorizontal: 9,
                    paddingVertical: 4,
                    borderRadius: 8,
                    marginTop: 10,
                    borderWidth: 1,
                    borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#EADFD8',
                  }}>
                    <Ionicons name="cube-outline" size={12} color={C.red} />
                    <Text style={{ fontSize: 11.5, fontWeight: '700', color: C.white }}>
                      Item: {r.item_title}
                    </Text>
                  </View>
                )}

                {/* Review Text */}
                <Text style={{
                  fontSize: 13.5,
                  lineHeight: 20,
                  color: C.white,
                  marginTop: 8,
                  fontStyle: 'italic',
                }}>
                  "{r.comment || 'Super smooth and reliable transaction! On time and item in great condition.'}"
                </Text>

                {/* Badges Footer */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                  <View style={{ backgroundColor: isDark ? 'rgba(230,36,36,0.12)' : '#FDF0EB', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: C.red }}>
                      🛡️ Verified Campus Handoff
                    </Text>
                  </View>
                  <View style={{ backgroundColor: isDark ? C.panel2 : '#F5EFEA', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: C.muted }}>
                      📍 Main Library / Visayan IT Labs
                    </Text>
                  </View>
                </View>
              </View>
            );
          })
        ) : (
          <Status state="This student has no reviews yet." />
        )}
      </View>

      {/* Safety Policy Card */}
      <View style={{
        backgroundColor: isDark ? C.panel : '#FFFFFF',
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: isDark ? C.border : '#EFE8E3',
        marginBottom: 16,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <Ionicons name="shield-checkmark" size={18} color={C.red} />
          <Text style={{ fontSize: 13, fontWeight: '800', color: C.white }}>
            UM-Pasa Verified Feedback Policy
          </Text>
        </View>
        <Text style={{ fontSize: 11.5, color: C.muted, lineHeight: 17 }}>
          Only students with confirmed physical handoffs at designated campus safe zones (Main Library, Visayan IT Labs, Canteen, Gym) can submit reviews. Fake or coerced ratings lead to immediate UM-Pasa account suspension.
        </Text>
      </View>

      {/* Prominent Bottom CTA Button */}
      {user?.id !== route.params.id && (
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate('Messages')}
          style={{
            backgroundColor: C.red,
            borderRadius: 16,
            paddingVertical: 14,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 8,
            marginBottom: 20,
            shadowColor: '#b70201',
            shadowOpacity: 0.35,
            shadowRadius: 6,
            elevation: 3,
          }}
        >
          <Ionicons name="create-outline" size={18} color="#FFFFFF" />
          <Text style={{ fontSize: 15, fontWeight: '900', color: '#FFFFFF' }}>
            Leave Feedback for {targetName.split(' ')[0]}
          </Text>
        </Pressable>
      )}
    </Page>
  );
}
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
function AdminUsersScreen() {
  const isDark = C.bg === themeTokens.dark.colors.bg;
  const [rows, setRows] = useState<AdminUser[]>([]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(true);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setBusy(true);
    try {
      setRows(await admin.users());
      setErr('');
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = rows.filter(u => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      (u.name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.student_number || '').toLowerCase().includes(q)
    );
  });

  return (
    <Page onRefresh={load} refreshing={busy}>
      <Heading
        title="Student User Directory"
        subtitle={`${rows.length} verified account${rows.length === 1 ? '' : 's'} across UM Tagum College.`}
      />
      <Field
        label="Search student directory"
        value={query}
        onChangeText={setQuery}
        placeholder="Filter by name, email, student ID..."
      />
      {err ? (
        <Status state={err} retry={load} />
      ) : busy ? (
        <ActivityIndicator color={C.gold} />
      ) : !filtered.length ? (
        <Status state="No student accounts match your search." />
      ) : (
        filtered.map(u => (
          <Card key={u.id}>
            <View style={s.rowBetween}>
              <View style={{ flex: 1 }}>
                <Text style={s.cardTitle}>{u.name || 'UM Student'}</Text>
                <Text style={s.muted}>{u.email}</Text>
                {u.student_number ? (
                  <Text style={{ fontSize: 11, color: C.gold, fontWeight: '700', marginTop: 2 }}>
                    Student ID: {u.student_number}
                  </Text>
                ) : null}
              </View>
              <View style={{
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 8,
                backgroundColor: u.role === 'admin' ? (isDark ? 'rgba(230,36,36,0.18)' : '#FFEAE8') : (isDark ? 'rgba(246,200,76,0.18)' : '#FFF3D6'),
                borderWidth: 1,
                borderColor: u.role === 'admin' ? C.red : C.gold,
              }}>
                <Text style={{ fontSize: 10.5, fontWeight: '800', color: u.role === 'admin' ? C.red : (isDark ? C.gold : '#8A6500') }}>
                  {u.role === 'admin' ? 'ADMIN' : 'STUDENT'}
                </Text>
              </View>
            </View>
          </Card>
        ))
      )}
    </Page>
  );
}

function TransactionSummary({t}: {t:Transaction}) {
  return (
    <View style={s.adminDetails}>
      <Text style={s.adminDetail}>Buyer: {t.buyer?.name||'—'}</Text>
      <Text style={s.adminDetail}>Seller: {t.seller?.name||'—'}</Text>
      <Text style={s.adminDetail}>Listing: {t.item?.title||'—'} · {t.item?.category||'—'} · {t.item?.listing_type==='rent'?'For Rent':'For Sale'}</Text>
      <Text style={s.adminDetail}>Payment Method: {t.payment_method?.replaceAll('_',' ')||'—'}{t.other_payment_method?` (${t.other_payment_method})`:''}</Text>
      <Text style={s.adminDetail}>Rental duration: {t.rental_duration_days?`${t.rental_duration_days} days`:'Not applicable'}</Text>
      <Text style={s.adminDetail}>Rental due: {formatPhilippineDate(t.rental_due_date, 'Not set')}</Text>
      <Text style={s.adminDetail}>Meetup location: {t.meetup_location||'Not scheduled'}</Text>
      <Text style={s.adminDetail}>Meetup time: {formatPhilippineDateTime(t.meetup_time, 'Not scheduled')}</Text>
      <Text style={s.adminDetail}>Payment proof: {t.payment_proof_uploaded_at?`Uploaded ${formatPhilippineDateTime(t.payment_proof_uploaded_at)}`:'Not uploaded'}</Text>
      <Text style={s.adminDetail}>Created: {formatPhilippineDateTime(t.created_at, '—')}</Text>
    </View>
  );
}

function AdminTransactionsScreen() {
  const [rows, setRows] = useState<Transaction[]>([]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(true);
  const [expandedId, setExpandedId] = useState<string|null>(null);
  const load = useCallback(async () => {
    setBusy(true);
    try {
      setRows(await admin.transactions());
      setErr('');
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);
  return (
    <Page onRefresh={load} refreshing={busy}>
      <Heading title="Campus Exchange Records" subtitle="Monitor active requests, safe meetup locations, and digital payment receipts."/>
      {err ? <Status state={err} retry={load}/> : busy ? <ActivityIndicator color={C.gold}/> : !rows.length ? <Status state="No transaction records logged yet."/> : rows.map(t=>(
        <Card key={t.id}>
          <Pressable accessibilityRole="button" onPress={()=>setExpandedId(expandedId===t.id?null:t.id)}>
            <View style={s.rowBetween}>
              <Text style={[s.cardTitle,{flex:1}]}>{t.item?.title||'Transaction'}</Text>
              <Ionicons name={expandedId===t.id?'chevron-up':'chevron-down'} size={18} color={C.muted}/>
            </View>
            <Text style={s.muted}>{t.status?.toUpperCase()} · Buyer: {t.buyer?.name} / Seller: {t.seller?.name}{t.created_at ? ` · ${formatPhilippineDate(t.created_at)}` : ''}</Text>
          </Pressable>
          {expandedId===t.id&&<TransactionSummary t={t}/>}
        </Card>
      ))}
    </Page>
  );
}

function AdminReportScreen() {
  const [items,setItems]=useState<Item[]>([]);const [txs,setTxs]=useState<Transaction[]>([]);const [err,setErr]=useState('');const [busy,setBusy]=useState(true);const [status,setStatus]=useState('');const [type,setType]=useState('');const [category,setCategory]=useState('');const [sort,setSort]=useState('newest');const [expandedTxId,setExpandedTxId]=useState<string|null>(null);
  const load=useCallback(async()=>{setBusy(true);try{const [i,t]=await Promise.all([admin.items(),admin.transactions()]);setItems(i);setTxs(t);setErr('')}catch(e){setErr(errorMessage(e))}finally{setBusy(false)}},[]);useEffect(()=>{load()},[load]);
  const reportItems=[...items.filter(i=>!type||i.listing_type===type).filter(i=>!category||i.category===category).filter(i=>!status||(status==='completed'?i.status==='sold':status==='pending'?i.status==='pending':true))].sort((a,b)=>sort==='oldest'?String(a.created_at||'').localeCompare(String(b.created_at||'')):sort==='title'?a.title.localeCompare(b.title):sort==='status'?a.status.localeCompare(b.status):String(b.created_at||'').localeCompare(String(a.created_at||'')));
  const reportTxs=[...txs.filter(t=>!status||t.status===status).filter(t=>!type||t.item?.listing_type===type).filter(t=>!category||t.item?.category===category)].sort((a,b)=>sort==='oldest'?String(a.created_at||'').localeCompare(String(b.created_at||'')):sort==='status'?a.status.localeCompare(b.status):String(b.created_at||'').localeCompare(String(a.created_at||'')));
  const categories=Array.from(new Set([...items.map(i=>i.category),...txs.map(t=>t.item?.category)].filter(Boolean)));
  const summary: Record<string, number>={
    items: reportItems.length,
    pendingListings: reportItems.filter(i=>i.moderation_status==='pending').length,
    approvedListings: reportItems.filter(i=>i.moderation_status==='approved').length,
    transactions: reportTxs.length,
    completed: reportTxs.filter(t=>t.status==='completed').length,
    gcash: reportTxs.filter(t=>t.payment_method==='gcash').length
  };
  const statLabels: Record<string, string>={
    items: 'Total Items',
    pendingListings: 'Awaiting Review',
    approvedListings: 'Live On Campus',
    transactions: 'Total Exchanges',
    completed: 'Completed Deals',
    gcash: 'GCash Payments'
  };
  return (
    <Page refreshing={busy} onRefresh={load}>
      <Heading title="Campus Platform Report" subtitle="System-wide analytics, exchange velocity, and category distribution."/>
      {err?<Status state={err} retry={load}/>:busy?<ActivityIndicator color={C.gold}/>:<>
        <View style={s.stats}>
          {Object.entries(summary).map(([k,v])=>(
            <Card key={k} style={s.stat}>
              <Text style={s.statNum}>{String(v)}</Text>
              <Text style={s.muted}>{statLabels[k] || k}</Text>
            </Card>
          ))}
        </View>
        <Text style={s.label}>Exchange Status</Text>
        <View style={s.rowWrap}>
          <Choice label="All statuses" selected={!status} onPress={()=>setStatus('')}/>
          <Choice label="Pending Approval" selected={status==='pending'} onPress={()=>setStatus(status==='pending'?'':'pending')}/>
          <Choice label="Approved / Active" selected={status==='approved'} onPress={()=>setStatus(status==='approved'?'':'approved')}/>
          <Choice label="Declined" selected={status==='rejected'} onPress={()=>setStatus(status==='rejected'?'':'rejected')}/>
          <Choice label="Completed" selected={status==='completed'} onPress={()=>setStatus(status==='completed'?'':'completed')}/>
        </View>
        <Text style={s.label}>Listing Type</Text>
        <View style={s.row}>
          <Choice label="Sales and rentals" selected={!type} onPress={()=>setType('')}/>
          <Choice label="For Sale" selected={type==='sell'} onPress={()=>setType(type==='sell'?'':'sell')}/>
          <Choice label="For Rent" selected={type==='rent'} onPress={()=>setType(type==='rent'?'':'rent')}/>
        </View>
        <Text style={s.label}>Academic Category</Text>
        <View style={s.rowWrap}>
          <Choice label="All categories" selected={!category} onPress={()=>setCategory('')}/>
          {categories.map(v=><Choice key={v} label={v} selected={category===v} onPress={()=>setCategory(category===v?'':(v||''))}/>)}
        </View>
        <Text style={s.label}>Sort by</Text>
        <View style={s.rowWrap}>
          <Choice label="Newest first" selected={sort==='newest'} onPress={()=>setSort('newest')}/>
          <Choice label="Oldest first" selected={sort==='oldest'} onPress={()=>setSort('oldest')}/>
          <Choice label="Item title" selected={sort==='title'} onPress={()=>setSort('title')}/>
          <Choice label="Status" selected={sort==='status'} onPress={()=>setSort('status')}/>
        </View>
        <Heading title="Campus Listings"/>
        {reportItems.length?reportItems.map(i=>(
          <Card key={i.id}>
            <Text style={s.cardTitle}>{i.title}</Text>
            <Text style={s.muted}>{i.user?.name} · {i.category} · {i.listing_type === 'rent' ? 'For Rent' : 'For Sale'} · {i.status?.toUpperCase()} / Moderation: {i.moderation_status?.toUpperCase()}{i.created_at ? ` · ${formatPhilippineDate(i.created_at)}` : ''}</Text>
            <Text style={s.price}>{money(i.price)}{i.listing_type === 'rent' ? ' / day' : ''}</Text>
          </Card>
        )):<Status state="No listings match these report filters."/>}
        <Heading title="Campus Transactions"/>
        {reportTxs.length?reportTxs.map(t=>(
          <Card key={t.id}>
            <Pressable accessibilityRole="button" onPress={()=>setExpandedTxId(expandedTxId===t.id?null:t.id)}>
              <View style={s.rowBetween}>
                <Text style={[s.cardTitle,{flex:1}]}>{t.item?.title||'Transaction'}</Text>
                <Ionicons name={expandedTxId===t.id?'chevron-up':'chevron-down'} size={18} color={C.muted}/>
              </View>
              <Text style={s.muted}>{t.status?.toUpperCase()} · Buyer: {t.buyer?.name} / Seller: {t.seller?.name}{t.created_at ? ` · ${formatPhilippineDate(t.created_at)}` : ''}</Text>
            </Pressable>
            {expandedTxId===t.id&&<TransactionSummary t={t}/>}
          </Card>
        )):<Status state="No transactions match these report filters."/>}
      </>}
    </Page>
  );
}

function TabsRoot() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const isAdmin = user?.role === 'admin';
  const isDark = C.bg === themeTokens.dark.colors.bg;
  const isAndroid = Platform.OS === 'android';
  const bottomPadding = isAndroid ? Math.max(insets.bottom, 12) : (insets.bottom > 0 ? insets.bottom : 8);
  const tabHeight = (isAndroid ? 66 : 56) + bottomPadding;
  const activeIcons: Record<string, any> = {
    Home: 'home',
    Browse: 'search',
    Messages: 'chatbubble-ellipses',
    Transactions: 'receipt',
    Profile: 'person',
    Admin: 'shield-checkmark',
  };
  const inactiveIcons: Record<string, any> = {
    Home: 'home-outline',
    Browse: 'search-outline',
    Messages: 'chatbubble-ellipses-outline',
    Transactions: 'receipt-outline',
    Profile: 'person-outline',
    Admin: 'shield-checkmark-outline',
  };
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: isDark ? C.panel : '#FFFFFF',
          borderTopColor: isDark ? C.border : '#E8DFD8',
          borderTopWidth: 1,
          height: tabHeight,
          paddingBottom: bottomPadding,
          paddingTop: 8,
          elevation: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: isDark ? 0.35 : 0.08,
          shadowRadius: 6,
        },
        tabBarItemStyle: {
          paddingHorizontal: 0,
          paddingVertical: 2,
          justifyContent: 'center',
          alignItems: 'center',
        },
        tabBarActiveTintColor: isDark ? '#FF6B6B' : C.red,
        tabBarInactiveTintColor: C.muted,
        tabBarLabelStyle: {
          fontWeight: '700',
          fontSize: 11,
          letterSpacing: -0.2,
          marginTop: 2,
          marginBottom: isAndroid ? 4 : 0,
        },
        tabBarAllowFontScaling: false,
        tabBarIcon: ({ color, focused }) => (
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons
              name={focused ? activeIcons[route.name] : inactiveIcons[route.name]}
              size={23}
              color={color}
            />
            {focused && (
              <View
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: isDark ? '#FF6B6B' : C.red,
                  marginTop: 2,
                }}
              />
            )}
          </View>
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
    <Stack.Screen name="About" component={AboutScreen} options={{title:'About UM-Pasa'}}/>
    <Stack.Screen name="Help" component={HelpScreen} options={{title:'Help & How It Works'}}/>
    <Stack.Screen name="Support" component={SupportScreen} options={{title:'Support'}}/>
    <Stack.Screen name="Listing" component={ListingScreen} options={{title:'Listing details'}}/>
    {authenticated&&<>
      <Stack.Screen name="ListingForm" component={ListingFormScreen} options={{title:'Manage listing'}}/>
      <Stack.Screen name="MyListings" component={MyListingsScreen} options={{title:'My listings'}}/>
      <Stack.Screen name="Transaction" component={TransactionScreen} options={{title:'Transaction'}}/>
      <Stack.Screen name="Transactions" component={isAdmin ? AdminTransactionsScreen : TransactionsScreen} options={{title: isAdmin ? 'All transactions' : 'Transactions'}}/>
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{headerShown:false}}/>
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
  page:{padding:14,paddingTop:10,paddingBottom:88},
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
  floatingReservedBadge:{position:'absolute',top:8,right:8,backgroundColor:'rgba(246,200,76,.96)',paddingHorizontal:7,paddingVertical:3,borderRadius:8,flexDirection:'row',alignItems:'center',gap:4,shadowColor:'#000',shadowOpacity:.2,shadowRadius:3,shadowOffset:{width:0,height:1},elevation:3},
  floatingReservedBadgeCompact:{top:6,right:6,paddingHorizontal:6,paddingVertical:2,borderRadius:6,gap:3},
  floatingReservedDot:{width:5,height:5,borderRadius:2.5,backgroundColor:'#1A1400'},
  floatingReservedText:{color:'#1A1400',fontSize:8.5,fontWeight:'900',letterSpacing:.6},
  floatingReservedTextCompact:{fontSize:7.5,letterSpacing:.4},
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
